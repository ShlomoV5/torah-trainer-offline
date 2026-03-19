import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppProvider, useApp } from '@/context/AppContext';

function InitialStateHarness() {
  const { state } = useApp();

  return (
    <div>
      <div data-testid="units-count">{state.units.length}</div>
      <div data-testid="history-keys">{Object.keys(state.history).length}</div>
    </div>
  );
}

describe('AppContext initial state', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with no default units and no mock history data', () => {
    render(
      <AppProvider>
        <InitialStateHarness />
      </AppProvider>
    );

    expect(screen.getByTestId('units-count')).toHaveTextContent('0');
    expect(screen.getByTestId('history-keys')).toHaveTextContent('0');
  });
});
