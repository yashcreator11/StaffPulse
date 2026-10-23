import { describe, it, expect } from 'vitest';
import {
  evaluateLeaveRequest,
  getRequiredNoticeDays,
  calendarDaysBetween,
  addMonthsToDate,
  type EmployeePolicyContext,
} from '../../lib/leaveEngine';

describe('Leave Policy Engine & WonderBiz Regression Suite (Section D)', () => {
  const standardEmployee: EmployeePolicyContext = {
    dateOfJoining: '2025-01-01',
    employmentStatus: 'active',
  };

  // ── 1. WonderBiz Planned Leave (PL) Notice Tiers ───────────────────────
  describe('WonderBiz PL Notice Tier Rules', () => {
    it('enforces 3 calendar days notice for 1 to 2 days of PL', () => {
      expect(getRequiredNoticeDays(1)).toBe(3);
      expect(getRequiredNoticeDays(2)).toBe(3);
    });

    it('enforces 7 calendar days notice for 3 to 5 days of PL', () => {
      expect(getRequiredNoticeDays(3)).toBe(7);
      expect(getRequiredNoticeDays(4)).toBe(7);
      expect(getRequiredNoticeDays(5)).toBe(7);
    });

    it('enforces 14 calendar days notice for 6 or more days of PL', () => {
      expect(getRequiredNoticeDays(6)).toBe(14);
      expect(getRequiredNoticeDays(10)).toBe(14);
    });

    it('flags notice shortfall when notice provided is less than required', () => {
      // Submitting on 2026-10-20 for leave starting on 2026-10-22 (2 days notice for a 4-day leave requiring 7 days)
      const res = evaluateLeaveRequest({
        leaveTypeCode: 'PL',
        startDate: '2026-10-22',
        totalDays: 4,
        submissionDate: '2026-10-20',
        employee: standardEmployee,
        currentBalance: 10,
      });

      expect(res.noticeShortfall).toBe(true);
      expect(res.noticeDaysGiven).toBe(2);
      expect(res.minNoticeDaysRequired).toBe(7);
      expect(res.warnings.some((w) => w.includes('Short notice'))).toBe(true);
    });

    it('passes when notice provided satisfies the required tier', () => {
      // Submitting on 2026-10-10 for leave starting on 2026-10-22 (12 days notice for a 4-day leave requiring 7 days)
      const res = evaluateLeaveRequest({
        leaveTypeCode: 'PL',
        startDate: '2026-10-22',
        totalDays: 4,
        submissionDate: '2026-10-10',
        employee: standardEmployee,
        currentBalance: 10,
      });

      expect(res.noticeShortfall).toBe(false);
      expect(res.noticeDaysGiven).toBe(12);
      expect(res.minNoticeDaysRequired).toBe(7);
      expect(res.warnings).toHaveLength(0);
    });
  });

  // ── 2. WonderBiz Sick Leave (SL) Medical Certificate ──────────────────
  describe('WonderBiz SL Medical Certificate Rules', () => {
    it('does not require medical certificate for SL up to 2 days', () => {
      const res = evaluateLeaveRequest({
        leaveTypeCode: 'SL',
        startDate: '2026-10-22',
        totalDays: 2,
        employee: standardEmployee,
        currentBalance: 5,
      });

      expect(res.certificateRequired).toBe(false);
      expect(res.warnings).toHaveLength(0);
    });

    it('requires medical certificate for SL exceeding 2 days', () => {
      const res = evaluateLeaveRequest({
        leaveTypeCode: 'SL',
        startDate: '2026-10-22',
        totalDays: 3,
        employee: standardEmployee,
        currentBalance: 5,
      });

      expect(res.certificateRequired).toBe(true);
      expect(res.warnings.some((w) => w.includes('Medical certificate required'))).toBe(true);
    });
  });

  // ── 3. WonderBiz Casual Leave (CL) Consecutive Limit ──────────────────
  describe('WonderBiz CL Consecutive Limit Rules', () => {
    it('allows CL within 3 consecutive days', () => {
      const res = evaluateLeaveRequest({
        leaveTypeCode: 'CL',
        startDate: '2026-10-22',
        totalDays: 3,
        employee: standardEmployee,
        currentBalance: 5,
      });

      expect(res.action).toBe('allow');
      expect(res.warnings).toHaveLength(0);
    });

    it('warns when CL exceeds 3 consecutive days', () => {
      const res = evaluateLeaveRequest({
        leaveTypeCode: 'CL',
        startDate: '2026-10-22',
        totalDays: 4,
        employee: standardEmployee,
        currentBalance: 5,
      });

      expect(res.warnings.some((w) => w.includes('maximum consecutive limit'))).toBe(true);
    });
  });

  // ── 4. WonderBiz Probation Auto-LWP ───────────────────────────────────
  describe('WonderBiz Probation Rule (Month-4 Unlock)', () => {
    it('auto-converts leave to LWP when taken before the 4-month unlock', () => {
      const probationEmployee: EmployeePolicyContext = {
        dateOfJoining: '2026-08-01', // Only 2 months ago
        employmentStatus: 'probation',
      };

      const res = evaluateLeaveRequest({
        leaveTypeCode: 'PL',
        startDate: '2026-10-22',
        totalDays: 2,
        employee: probationEmployee,
        currentBalance: 5,
      });

      expect(res.convertedToLwp).toBe(true);
      expect(res.effectiveLeaveTypeCode).toBe('LWP');
      expect(res.lwpReason).toContain('probation period');
    });

    it('allows normal leave when taken after the 4-month unlock date', () => {
      const postProbationEmployee: EmployeePolicyContext = {
        dateOfJoining: '2026-01-01', // 9 months ago
        employmentStatus: 'active',
      };

      const res = evaluateLeaveRequest({
        leaveTypeCode: 'PL',
        startDate: '2026-10-22',
        totalDays: 2,
        submissionDate: '2026-10-15', // 7 days notice (> 3 required)
        employee: postProbationEmployee,
        currentBalance: 5,
      });

      expect(res.convertedToLwp).toBe(false);
      expect(res.effectiveLeaveTypeCode).toBe('PL');
    });
  });

  // ── 5. WonderBiz Notice Period Auto-LWP ────────────────────────────────
  describe('WonderBiz Notice Period Rule', () => {
    it('auto-converts leave to LWP during notice period', () => {
      const noticePeriodEmployee: EmployeePolicyContext = {
        dateOfJoining: '2024-01-01',
        employmentStatus: 'notice_period',
        dateOfExit: '2026-11-15',
        noticePeriodDays: 30,
      };

      const res = evaluateLeaveRequest({
        leaveTypeCode: 'CL',
        startDate: '2026-10-25', // Inside notice period window
        totalDays: 1,
        employee: noticePeriodEmployee,
        currentBalance: 5,
      });

      expect(res.convertedToLwp).toBe(true);
      expect(res.effectiveLeaveTypeCode).toBe('LWP');
      expect(res.lwpReason).toContain('notice period');
    });
  });

  // ── 6. Balance Sufficiency Fallback ───────────────────────────────────
  describe('Balance Sufficiency Check', () => {
    it('auto-converts to LWP when current balance is less than requested days', () => {
      const res = evaluateLeaveRequest({
        leaveTypeCode: 'PL',
        startDate: '2026-10-25',
        totalDays: 4,
        submissionDate: '2026-10-10',
        employee: standardEmployee,
        currentBalance: 2, // Only 2 days available for 4-day request
      });

      expect(res.convertedToLwp).toBe(true);
      expect(res.effectiveLeaveTypeCode).toBe('LWP');
      expect(res.lwpReason).toContain('Insufficient PL balance');
    });
  });

  // ── 7. Custom Multi-Tenant Leave Types ────────────────────────────────
  describe('Custom Leave Types Support', () => {
    it('evaluates custom leave types like Maternity Leave (ML) and Comp-Off (CO)', () => {
      const resML = evaluateLeaveRequest({
        leaveTypeCode: 'ML',
        startDate: '2026-11-01',
        totalDays: 90,
        employee: standardEmployee,
        currentBalance: 90,
      });

      expect(resML.action).toBe('allow');
      expect(resML.effectiveLeaveTypeCode).toBe('ML');

      const resCO = evaluateLeaveRequest({
        leaveTypeCode: 'CO',
        startDate: '2026-10-25',
        totalDays: 1,
        employee: standardEmployee,
        currentBalance: 1,
      });

      expect(resCO.action).toBe('allow');
      expect(resCO.effectiveLeaveTypeCode).toBe('CO');
    });
  });
});
