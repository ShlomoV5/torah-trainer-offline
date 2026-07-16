import { describe, it, expect } from 'vitest';
import { BOOK_OPTIONS } from '@/utils/hebrew';

describe('BOOK_OPTIONS', () => {
  it('includes prophets needed for Sefaria imports', () => {
    expect(BOOK_OPTIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'Joshua', label: 'יהושע' }),
        expect.objectContaining({ value: 'Judges', label: 'שופטים' }),
        expect.objectContaining({ value: 'Isaiah', label: 'ישעיהו' }),
        expect.objectContaining({ value: 'Hosea', label: 'הושע' }),
        expect.objectContaining({ value: 'I Samuel', label: 'שמואל א׳' }),
        expect.objectContaining({ value: 'Nahum', label: 'נחום' }),
        expect.objectContaining({ value: 'Malachi', label: 'מלאכי' }),
      ])
    );
  });
});
