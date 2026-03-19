import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AppProvider, useApp } from '@/context/AppContext';

const STORAGE_KEY = 'torah-trainer-offline-state-v1';
const UNIT_URL = 'https://example.com/unit.json';

function QueryUnitHarness() {
  const { state } = useApp();
  const activeUnit = state.units[state.activeStudentUnitIndex];

  return (
    <div>
      <div data-testid="units-count">{state.units.length}</div>
      <div data-testid="active-unit-source">{activeUnit?.sourceUrl ?? ''}</div>
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
  });

  it('adds and persists unit from ?unit query string on app entry', async () => {
    window.history.pushState({}, '', `/?unit=${encodeURIComponent(UNIT_URL)}`);

    render(
      <AppProvider>
        <QueryUnitHarness />
      </AppProvider>
    );

    expect(screen.getByTestId('units-count')).toHaveTextContent('2');
    expect(screen.getByTestId('active-unit-source')).toHaveTextContent(UNIT_URL);

    await waitFor(() => {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
      expect(parsed.units).toHaveLength(2);
      expect(parsed.units[1].sourceUrl).toBe(UNIT_URL);
    });
  });

  it('does not duplicate a query unit that already exists in local storage', () => {
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
          name: 'יחידה מקישור',
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
    window.history.pushState({}, '', `/?unit=${encodeURIComponent(UNIT_URL)}`);

    render(
      <AppProvider>
        <QueryUnitHarness />
      </AppProvider>
    );

    expect(screen.getByTestId('units-count')).toHaveTextContent('2');
    expect(screen.getByTestId('active-unit-source')).toHaveTextContent(UNIT_URL);
  });
});
