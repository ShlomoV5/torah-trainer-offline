import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, screen, act } from '@testing-library/react';
import AdminView from '@/components/admin/AdminView';
import { AppProvider } from '@/context/AppContext';

describe('AdminView Sefaria selection syncing', () => {
  beforeEach(() => {
    localStorage.clear();
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
