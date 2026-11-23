import { describe, expect, it } from 'vitest';
import { formatIndiaDate, formatIndiaTime } from '../src/lib/dateTime.js';

describe('India event date and time formatting', () => {
  it('keeps database date-only values on their calendar date', () => {
    expect(formatIndiaDate('2026-11-20')).toBe('20 Nov 2026');
  });

  it('formats database wall-clock event times without applying an extra timezone shift', () => {
    expect(formatIndiaTime('14:30:00')).toMatch(/2:30\s?pm/i);
  });

  it('converts timestamps to India Standard Time', () => {
    expect(formatIndiaTime('2026-11-20T14:30:00Z')).toMatch(/8:00\s?pm/i);
  });
});
