import { describe, it, expect } from 'vitest';
import { getFYStartYear, formatFYLabel } from '../../lib/leaveSupabase/fyHelpers';

describe('fyHelpers - Leave year cycle calculation (25-Mar to 24-Mar)', () => {
  it('identifies FY start year accurately based on 25 March boundary', () => {
    // Before 25 March: e.g. 24 March 2026 -> FY 2025
    expect(getFYStartYear(new Date(2026, 2, 24))).toBe(2025); // month 2 is March (0-indexed)

    // On or after 25 March: e.g. 25 March 2026 -> FY 2026
    expect(getFYStartYear(new Date(2026, 2, 25))).toBe(2026);

    // Later in the year: e.g. 15 October 2026 -> FY 2026
    expect(getFYStartYear(new Date(2026, 9, 15))).toBe(2026);

    // Early next year: e.g. 10 January 2027 -> FY 2026
    expect(getFYStartYear(new Date(2027, 0, 10))).toBe(2026);
  });

  it('formats FY label properly', () => {
    expect(formatFYLabel(2025)).toBe('FY 2025-26');
    expect(formatFYLabel(2026)).toBe('FY 2026-27');
  });
});
