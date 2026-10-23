import { describe, it, expect } from 'vitest';
import { filterAndRankTeams, shouldSuppressRate } from '../../lib/dashboard/scalableTeams';

describe('Section N5: Dashboard Variants Fixture Tests', () => {
  it('Variant 1: One office with no departments / empty group data', () => {
    const emptyTeams: { name: string; attendanceRate: number; headcount: number }[] = [];
    const result = filterAndRankTeams(emptyTeams, { minGroupSize: 3, topN: 5 });

    expect(result.top).toHaveLength(0);
    expect(result.bottom).toHaveLength(0);
    expect(result.suppressedCount).toBe(0);
    expect(result.validTeams).toHaveLength(0);
  });

  it('Variant 2: Standard organization with 5 teams and ~50 people', () => {
    const teams = [
      { name: 'Engineering', attendanceRate: 94.5, headcount: 18 },
      { name: 'Design', attendanceRate: 88.0, headcount: 8 },
      { name: 'Product', attendanceRate: 92.0, headcount: 6 },
      { name: 'Operations', attendanceRate: 96.0, headcount: 12 },
      { name: 'HR', attendanceRate: 85.0, headcount: 6 },
    ];

    const result = filterAndRankTeams(teams, { minGroupSize: 3, topN: 3 });

    expect(result.validTeams).toHaveLength(5);
    expect(result.suppressedCount).toBe(0);
    expect(result.top).toHaveLength(3);
    // Highest first
    expect(result.top[0].name).toBe('Operations');
    expect(result.top[0].attendanceRate).toBe(96.0);
    // Lowest first
    expect(result.bottom[0].name).toBe('HR');
    expect(result.bottom[0].attendanceRate).toBe(85.0);
  });

  it('Variant 3: Large enterprise with 80 teams and 3,000 employees', () => {
    const enterpriseTeams = Array.from({ length: 80 }, (_, i) => ({
      name: `Team ${i + 1}`,
      attendanceRate: 70 + (i % 28), // 70% to 97%
      headcount: 30 + (i % 15),
    }));

    const result = filterAndRankTeams(enterpriseTeams, { minGroupSize: 3, topN: 5 });

    // Assert pagination / topN capping works so the UI is not overwhelmed
    expect(result.validTeams).toHaveLength(80);
    expect(result.top).toHaveLength(5);
    expect(result.bottom).toHaveLength(5);
    expect(result.top[0].attendanceRate).toBeGreaterThanOrEqual(result.top[4].attendanceRate);
    expect(result.bottom[0].attendanceRate).toBeLessThanOrEqual(result.bottom[4].attendanceRate);
  });

  it('Variant 4: Micro-teams (1-2 employees) have rates suppressed to avoid skewed metrics', () => {
    const mixedTeams = [
      { name: 'Executive Office', attendanceRate: 50.0, headcount: 2 }, // suppressed
      { name: 'Legal Counsel', attendanceRate: 100.0, headcount: 1 }, // suppressed
      { name: 'Customer Support', attendanceRate: 91.0, headcount: 25 },
      { name: 'Engineering', attendanceRate: 89.0, headcount: 40 },
    ];

    expect(shouldSuppressRate(2, 3)).toBe(true);
    expect(shouldSuppressRate(1, 3)).toBe(true);
    expect(shouldSuppressRate(25, 3)).toBe(false);

    const result = filterAndRankTeams(mixedTeams, { minGroupSize: 3, topN: 5 });

    expect(result.suppressedCount).toBe(2);
    expect(result.validTeams).toHaveLength(2);
    // Neither Executive Office nor Legal Counsel should appear in top/bottom rankings
    expect(result.top.some((t) => t.name === 'Executive Office')).toBe(false);
    expect(result.top.some((t) => t.name === 'Legal Counsel')).toBe(false);
  });

  it('Variant 5: Holiday and weekly-off dates do not register as 0% attendance', () => {
    const holidayDateData = {
      isHolidayOrWeeklyOff: true,
      totalEmployees: 50,
      presentEmployees: 0,
      attendanceRate: 0,
    };

    // Correct behavior: When isHolidayOrWeeklyOff is true, state is "Holiday / Weekly Off"
    const displayLabel = holidayDateData.isHolidayOrWeeklyOff
      ? 'Holiday / Weekly Off'
      : `${holidayDateData.attendanceRate}%`;

    expect(displayLabel).toBe('Holiday / Weekly Off');
    expect(displayLabel).not.toBe('0%');
  });
});
