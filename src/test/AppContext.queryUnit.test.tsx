import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AppProvider, useApp, ImportStatus } from '@/context/AppContext';
import { Unit } from '@/types/app';

const STORAGE_KEY = 'torah-trainer-offline-state-v1';
const UNIT_URL = 'https://example.com/unit.json';

const MOCK_UNITS: Unit[] = [
  {
    id: 10,
    name: 'וישב',
    book: 'Genesis',
    chapter: 37,
    startVerse: 1,
    endVerse: 2,
    verses: [
      { text: 'וַיֵּשֶׁב יַעֲקֹב', sections: [], audioUrl: null },
      { text: 'וְאֵלֶּה תֹּלְדוֹת יַעֲקֹב', sections: [], audioUrl: null },
    ],
  },
];

function makeOkFetch(data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function makeFailFetch(status = 500) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve(null),
  });
}

function makeNetworkErrorFetch() {
  return vi.fn().mockRejectedValue(new Error('network error'));
}

function QueryUnitHarness() {
  const { state, importStatus } = useApp();
  const activeUnit = state.units[state.activeStudentUnitIndex];

  return (
    <div>
      <div data-testid="units-count">{state.units.length}</div>
      <div data-testid="active-unit-source">{activeUnit?.sourceUrl ?? ''}</div>
      <div data-testid="active-unit-name">{activeUnit?.name ?? ''}</div>
      <div data-testid="import-status">{importStatus}</div>
    </div>
  );
}

describe('AppContext query unit loading', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
    vi.restoreAllMocks();
  });

  it('placeholder unit is added synchronously before async fetch completes', async () => {
    let resolveFetch!: (value: unknown) => void;
    const pendingFetch = new Promise(resolve => { resolveFetch = resolve; });
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendingFetch));
    window.history.pushState({}, '', `/?unit=${encodeURIComponent(UNIT_URL)}`);

    const { unmount } = render(
      <AppProvider>
        <QueryUnitHarness />
      </AppProvider>
    );

    // Placeholder unit is created synchronously by applyUnitFromQuery
    expect(screen.getByTestId('units-count')).toHaveTextContent('1');
    expect(screen.getByTestId('active-unit-source')).toHaveTextContent(UNIT_URL);
    expect(screen.getByTestId('import-status')).toHaveTextContent('in-progress');

    // Clean up: resolve (fail) the pending fetch before unmounting
    resolveFetch({ ok: false, status: 999, json: () => Promise.resolve(null) });
    await waitFor(() => expect(screen.getByTestId('import-status')).toHaveTextContent('failure'));
    unmount();
  });

  it('replaces placeholder with imported Unit[] on fetch success', async () => {
    vi.stubGlobal('fetch', makeOkFetch(MOCK_UNITS));
    window.history.pushState({}, '', `/?unit=${encodeURIComponent(UNIT_URL)}`);

    render(
      <AppProvider>
        <QueryUnitHarness />
      </AppProvider>
    );

    // Wait for async import to complete
    await waitFor(() => {
      expect(screen.getByTestId('import-status')).toHaveTextContent('success');
    });

    // Imported units replace placeholder
    expect(screen.getByTestId('units-count')).toHaveTextContent(String(MOCK_UNITS.length));
    expect(screen.getByTestId('active-unit-source')).toHaveTextContent(UNIT_URL);
    expect(screen.getByTestId('active-unit-name')).toHaveTextContent(MOCK_UNITS[0].name);

    // Imported units are persisted with sourceUrl
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
    expect(parsed.units).toHaveLength(MOCK_UNITS.length);
    expect(parsed.units[0].sourceUrl).toBe(UNIT_URL);
  });

  it('sets activeStudentUnitIndex and activeAdminUnitIndex to first imported unit after success', async () => {
    const existingUnit: Unit = {
      id: 1,
      name: 'פרשת בראשית',
      book: 'Genesis',
      chapter: 1,
      startVerse: 1,
      endVerse: 1,
      verses: [{ text: 'א', sections: [], audioUrl: null }],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      units: [existingUnit],
      activeStudentUnitIndex: 0,
      activeAdminUnitIndex: 0,
      currentVerseIndex: 0,
      currentSession: { minutes: 0, practiceSeconds: 0, exc: 0, med: 0, imp: 0 },
      verseFeedback: [],
      history: {},
    }));
    vi.stubGlobal('fetch', makeOkFetch(MOCK_UNITS));
    window.history.pushState({}, '', `/?unit=${encodeURIComponent(UNIT_URL)}`);

    function IndexHarness() {
      const { state, importStatus } = useApp();
      return (
        <div>
          <div data-testid="units-count">{state.units.length}</div>
          <div data-testid="student-index">{state.activeStudentUnitIndex}</div>
          <div data-testid="admin-index">{state.activeAdminUnitIndex}</div>
          <div data-testid="import-status">{importStatus}</div>
        </div>
      );
    }

    render(<AppProvider><IndexHarness /></AppProvider>);

    await waitFor(() => {
      expect(screen.getByTestId('import-status')).toHaveTextContent('success');
    });

    // After import: existing (1) + imported units
    expect(screen.getByTestId('units-count')).toHaveTextContent(String(1 + MOCK_UNITS.length));
    // Active indices point to first imported unit (index 1)
    expect(screen.getByTestId('student-index')).toHaveTextContent('1');
    expect(screen.getByTestId('admin-index')).toHaveTextContent('1');
  });

  it('status transitions: idle -> in-progress -> failure on HTTP error', async () => {
    vi.stubGlobal('fetch', makeFailFetch(404));
    window.history.pushState({}, '', `/?unit=${encodeURIComponent(UNIT_URL)}`);

    render(
      <AppProvider>
        <QueryUnitHarness />
      </AppProvider>
    );

    expect(screen.getByTestId('import-status')).toHaveTextContent('in-progress');

    await waitFor(() => {
      expect(screen.getByTestId('import-status')).toHaveTextContent('failure');
    });
  });

  it('removes placeholder unit and sets failure status on HTTP error', async () => {
    vi.stubGlobal('fetch', makeFailFetch(404));
    window.history.pushState({}, '', `/?unit=${encodeURIComponent(UNIT_URL)}`);

    render(
      <AppProvider>
        <QueryUnitHarness />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('import-status')).toHaveTextContent('failure');
    });

    // Placeholder removed, no units remain
    expect(screen.getByTestId('units-count')).toHaveTextContent('0');
  });

  it('removes placeholder and sets failure on network error', async () => {
    vi.stubGlobal('fetch', makeNetworkErrorFetch());
    window.history.pushState({}, '', `/?unit=${encodeURIComponent(UNIT_URL)}`);

    render(
      <AppProvider>
        <QueryUnitHarness />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('import-status')).toHaveTextContent('failure');
    });

    expect(screen.getByTestId('units-count')).toHaveTextContent('0');
  });

  it('sets failure status when response is non-array JSON', async () => {
    vi.stubGlobal('fetch', makeOkFetch({ foo: 'bar' })); // not an array
    window.history.pushState({}, '', `/?unit=${encodeURIComponent(UNIT_URL)}`);

    render(
      <AppProvider>
        <QueryUnitHarness />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('import-status')).toHaveTextContent('failure');
    });

    expect(screen.getByTestId('units-count')).toHaveTextContent('0');
  });

  it('sets failure status when response is empty array', async () => {
    vi.stubGlobal('fetch', makeOkFetch([]));
    window.history.pushState({}, '', `/?unit=${encodeURIComponent(UNIT_URL)}`);

    render(
      <AppProvider>
        <QueryUnitHarness />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('import-status')).toHaveTextContent('failure');
    });
  });

  it('does not import again when URL already has real (non-placeholder) units', async () => {
    const alreadyImportedUnit: Unit = {
      id: 2,
      name: 'יחידה מקישור 1',
      book: 'Genesis',
      chapter: 1,
      startVerse: 1,
      endVerse: 1,
      verses: [{ text: 'תוכן אמיתי', sections: [], audioUrl: null }],
      sourceUrl: UNIT_URL,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      units: [alreadyImportedUnit],
      activeStudentUnitIndex: 0,
      activeAdminUnitIndex: 0,
      currentVerseIndex: 0,
      currentSession: { minutes: 0, practiceSeconds: 0, exc: 0, med: 0, imp: 0 },
      verseFeedback: [],
      history: {},
    }));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', `/?unit=${encodeURIComponent(UNIT_URL)}`);

    render(
      <AppProvider>
        <QueryUnitHarness />
      </AppProvider>
    );

    // fetch should not be called since units already exist with real content
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('units-count')).toHaveTextContent('1');
    expect(screen.getByTestId('import-status')).toHaveTextContent('idle');
  });

  it('does not duplicate units from same URL (legacy test: existing with real content)', () => {
    const persistedState = {
      units: [
        {
          id: 1,
          name: 'פרשת בראשית',
          book: 'Genesis',
          chapter: 1,
          startVerse: 1,
          endVerse: 3,
          verses: [{ text: 'א', sections: [], audioUrl: null }],
        },
        {
          id: 2,
          name: 'יחידה מקישור 1',
          book: 'Genesis',
          chapter: 1,
          startVerse: 1,
          endVerse: 1,
          verses: [{ text: 'ב', sections: [], audioUrl: null }],
          sourceUrl: UNIT_URL,
        },
      ],
      activeStudentUnitIndex: 0,
      activeAdminUnitIndex: 0,
      currentVerseIndex: 0,
      currentSession: { minutes: 0, practiceSeconds: 0, exc: 0, med: 0, imp: 0 },
      verseFeedback: [],
      history: {},
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
    vi.stubGlobal('fetch', vi.fn()); // should not be called
    window.history.pushState({}, '', `/?unit=${encodeURIComponent(UNIT_URL)}`);

    render(
      <AppProvider>
        <QueryUnitHarness />
      </AppProvider>
    );

    expect(screen.getByTestId('units-count')).toHaveTextContent('2');
    expect(screen.getByTestId('active-unit-source')).toHaveTextContent(UNIT_URL);
    expect(screen.getByTestId('import-status')).toHaveTextContent('idle');
  });
});

