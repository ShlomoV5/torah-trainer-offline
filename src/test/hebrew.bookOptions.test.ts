import { describe, it, expect } from 'vitest';
import { BOOK_OPTIONS } from '@/utils/hebrew';

describe('BOOK_OPTIONS', () => {
  it('includes prophets needed for Sefaria imports', () => {
    expect(BOOK_OPTIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'Joshua', label: 'יהושע' }),
        expect.objectContaining({ value: 'Judges', label: 'שופטים' }),
      ])
    );
  });
});
