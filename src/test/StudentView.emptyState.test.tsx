import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StudentView from '@/components/student/StudentView';
import { AppProvider } from '@/context/AppContext';

describe('StudentView empty unit state', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows empty-state message and opens settings import modal from כאן button', () => {
    render(
      <AppProvider>
        <StudentView />
      </AppProvider>
    );

    expect(screen.getByText(/לא נטענה יחידת לימוד, לחץ/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'כאן' }));

    expect(screen.getByText('טעינת קורס מכתובת (URL)')).toBeInTheDocument();
    expect(screen.getByText('ייבוא מקובץ')).toBeInTheDocument();
  });
});
