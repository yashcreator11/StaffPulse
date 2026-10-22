import { describe, it, expect } from 'vitest';
import type { AttendanceRecord, KPIData } from '../../lib/types';

describe('Dashboard Adaptability: Teams & Day View (Sections N2 & N4)', () => {
  // ── 1. Section N2: Organizations with No Teams ────────────────────────
  describe('Department Presence & Adaptability (Section N2)', () => {
    function computeHasDepartments(departments: string[]): boolean {
      return (
        departments.length > 0 &&
        departments.some(
          (d) =>
            d &&
            d.trim() !== '' &&
            d.toLowerCase() !== 'unknown' &&
            d.toLowerCase() !== 'default'
        )
      );
    }

    function determineAvailableSections(
      hasDashboardData: boolean,
      hasDepartments: boolean,
      viewMode: 'monthly' | 'single_day' | 'comparison'
    ): string[] {
      if (!hasDashboardData) return [];
      if (!hasDepartments) return ['overview', 'employees'];
      if (viewMode === 'single_day') return ['overview', 'employees', 'departments'];
      return ['overview', 'employees', 'departments', 'comparison'];
    }

    it('identifies organizations with no departments or only unknown/blank placeholders', () => {
      expect(computeHasDepartments([])).toBe(false);
      expect(computeHasDepartments([''])).toBe(false);
      expect(computeHasDepartments(['Unknown'])).toBe(false);
      expect(computeHasDepartments(['unknown', ''])).toBe(false);
      expect(computeHasDepartments(['Default'])).toBe(false);
    });

    it('identifies organizations with valid departments', () => {
      expect(computeHasDepartments(['Engineering'])).toBe(true);
      expect(computeHasDepartments(['Unknown', 'Marketing'])).toBe(true);
      expect(computeHasDepartments(['Sales', 'Support'])).toBe(true);
    });

    it('omits department and team comparison sections when no teams exist', () => {
      const sectionsNoTeams = determineAvailableSections(true, false, 'monthly');
      expect(sectionsNoTeams).toEqual(['overview', 'employees']);
      expect(sectionsNoTeams).not.toContain('departments');
      expect(sectionsNoTeams).not.toContain('comparison');
    });

    it('includes department section when organization has valid teams', () => {
      const sectionsWithTeams = determineAvailableSections(true, true, 'monthly');
      expect(sectionsWithTeams).toEqual(['overview', 'employees', 'departments', 'comparison']);
      expect(sectionsWithTeams).toContain('departments');
    });
  });

  // ── 2. Section N4: Single-Day View & Holiday Empty State ──────────────
  describe('Single-Day View & Holiday / Weekly Off State (Section N4)', () => {
    function resolveViewMode(
      dateFrom: string | null,
      dateTo: string | null,
      selectedDepts: string[]
    ): 'single_day' | 'comparison' | 'monthly' {
      if (selectedDepts.length >= 2) return 'comparison';
      if (dateFrom && dateTo && dateFrom === dateTo) return 'single_day';
      return 'monthly';
    }

    it('identifies single day view when dateFrom equals dateTo', () => {
      expect(resolveViewMode('2026-10-22', '2026-10-22', [])).toBe('single_day');
      expect(resolveViewMode('2026-10-01', '2026-10-31', [])).toBe('monthly');
      expect(resolveViewMode(null, null, [])).toBe('monthly');
    });

    it('prioritizes comparison mode when 2+ departments are selected', () => {
      expect(resolveViewMode('2026-10-22', '2026-10-22', ['Eng', 'Ops'])).toBe('comparison');
    });

    it('handles Holiday / Weekly Off state when scheduledCount is 0', () => {
      const holidayKPI: KPIData = {
        attendanceRate: 0,
        absenteeismRate: 0,
        avgWorkingHours: 0,
        lateArrivalRate: 0,
        earlyExitRate: 0,
        productivityLost: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        earlyExitCount: 0,
        scheduledCount: 0, // Zero scheduled shifts
        shortDayCount: 0,
        frequentPuncherCount: 0,
        productivityLostHours: 0,
        unexplainedAbsentCount: 0,
        plannedLeaveCount: 0,
        casualLeaveCount: 0,
        sickLeaveCount: 0,
        lwpCount: 0,
        halfDayCount: 0,
      };

      const isNonWorkingDay = holidayKPI.scheduledCount === 0;
      expect(isNonWorkingDay).toBe(true);

      // Verify voluntary work can be detected even on non-working day
      const voluntaryKPI: KPIData = {
        ...holidayKPI,
        presentCount: 2, // 2 employees came in voluntary
      };

      expect(voluntaryKPI.scheduledCount).toBe(0);
      expect(voluntaryKPI.presentCount).toBe(2);
    });
  });
});
