import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, screen, act } from '@testing-library/react';
import AdminView from '@/components/admin/AdminView';
import { AppProvider } from '@/context/AppContext';

describe('AdminView Sefaria selection syncing', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('torah-trainer-offline-state-v1', JSON.stringify({
      units: [
        {
          id: 1,
          name: 'יחידה א',
          book: 'Genesis',
          chapter: 1,
          startVerse: 1,
          endVerse: 3,
          verses: [{ text: 'א', sections: [], audioUrl: null }],
        },
      ],
      activeStudentUnitIndex: 0,
      activeAdminUnitIndex: 0,
      currentVerseIndex: 0,
      currentSession: { minutes: 0, practiceSeconds: 0, exc: 0, med: 0, imp: 0 },
      verseFeedback: [],
      history: {},
    }));
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('uses the latest selected psukim range for fetch and avoids stale previous choice', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        he: ['א', 'ב', 'ג', 'ד', 'ה'],
      }),
    } as Response);

    render(
      <AppProvider>
        <AdminView onExit={() => {}} />
      </AppProvider>
    );

    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    const fromSelect = selects[3];
    const toSelect = selects[4];

    fireEvent.change(fromSelect, { target: { value: '2' } });
    fireEvent.change(toSelect, { target: { value: '4' } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(650);
    });
    await Promise.resolve();

    expect(fetchSpy).toHaveBeenCalled();
    const fetchUrl = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1][0] as string;
    expect(fetchUrl).toContain('Genesis_1');
  });
});
