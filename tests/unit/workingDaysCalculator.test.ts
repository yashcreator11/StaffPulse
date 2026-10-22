import { describe, it, expect } from 'vitest';
import { isWeekend, calculateWorkingDays } from '../../lib/workingDaysCalculator';

describe('workingDaysCalculator - Working days and weekends', () => {
  it('identifies Saturdays and Sundays as weekends', () => {
    // 2026-10-24 is Saturday, 2026-10-25 is Sunday
    expect(isWeekend('2026-10-24')).toBe(true);
    expect(isWeekend('2026-10-25')).toBe(true);

    // 2026-10-22 is Thursday, 2026-10-23 is Friday
    expect(isWeekend('2026-10-22')).toBe(false);
    expect(isWeekend('2026-10-23')).toBe(false);
  });

  it('calculates working days across date intervals', () => {
    // Monday to Friday in same week: 5 working days (assuming no holiday)
    // 2026-10-19 (Mon) to 2026-10-23 (Fri)
    const days = calculateWorkingDays('2026-10-19', '2026-10-23', 'MUM');
    expect(days).toBeGreaterThanOrEqual(4); // 4 or 5 depending on festival holidays

    // Zero if start > end
    expect(calculateWorkingDays('2026-10-25', '2026-10-20', 'MUM')).toBe(0);
  });
});
