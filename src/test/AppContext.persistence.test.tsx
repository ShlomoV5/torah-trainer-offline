import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppProvider, useApp } from '@/context/AppContext';

const STORAGE_KEY = 'torah-trainer-offline-state-v1';

function PersistenceHarness() {
  const { state, setState } = useApp();

  return (
    <div>
      <button
        onClick={() =>
          setState(prev => ({
            ...prev,
            units: [
              {
                id: 100,
                name: 'יחידה א',
                book: 'Genesis',
                chapter: 1,
                startVerse: 1,
                endVerse: 1,
                verses: [{ text: 'פסוק א', sections: [], audioUrl: null }],
              },
              {
                id: 200,
                name: 'יחידה ב',
                book: 'Exodus',
                chapter: 2,
                startVerse: 2,
                endVerse: 2,
                verses: [{ text: 'פסוק ב', sections: [], audioUrl: null }],
              },
            ],
            activeStudentUnitIndex: 1,
            activeAdminUnitIndex: 1,
            currentSession: { minutes: 3, practiceSeconds: 180, exc: 2, med: 1, imp: 0 },
            history: { '2026-03-19': { minutes: 3, exc: 2, med: 1, imp: 0 } },
          }))
        }
      >
        save-state
      </button>
      <div data-testid="units-count">{state.units.length}</div>
      <div data-testid="active-student">{state.activeStudentUnitIndex}</div>
      <div data-testid="session-exc">{state.currentSession.exc}</div>
    </div>
  );
}

describe('AppContext persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists units and stats and restores them after remount', async () => {
    const { unmount } = render(
      <AppProvider>
        <PersistenceHarness />
      </AppProvider>
    );

    fireEvent.click(screen.getByText('save-state'));

    await waitFor(() => {
      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw as string);
      expect(parsed.units).toHaveLength(2);
      expect(parsed.currentSession.exc).toBe(2);
      expect(parsed.activeStudentUnitIndex).toBe(1);
    });

    unmount();

    render(
      <AppProvider>
        <PersistenceHarness />
      </AppProvider>
    );

    expect(screen.getByTestId('units-count')).toHaveTextContent('2');
    expect(screen.getByTestId('active-student')).toHaveTextContent('1');
    expect(screen.getByTestId('session-exc')).toHaveTextContent('2');
  });
});
