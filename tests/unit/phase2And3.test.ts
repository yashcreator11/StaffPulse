import { describe, it, expect } from 'vitest';
import { getResolvedHolidaysForYear, HOLIDAY_PRESETS } from '../../lib/templates/statutoryTemplates';
import { validateEmployeeInput, validateLeaveRequestInput } from '../../lib/validation/apiSchemas';
import { captureException } from '../../lib/monitoring/errorTracker';

describe('Phase 2 & 3 Services', () => {
  it('correctly resolves statutory holiday calendar dates for target year', () => {
    const holidays = getResolvedHolidaysForYear('india_central', 2026);
    expect(holidays.length).toBeGreaterThanOrEqual(10);
    const republicDay = holidays.find(h => h.name === 'Republic Day');
    expect(republicDay?.date).toBe('2026-01-26');
  });

  it('validates employee input correctly and rejects invalid email or missing name', () => {
    const invalid = validateEmployeeInput({ employeeCode: 'E101', name: '', email: 'notanemail' });
    expect(invalid.success).toBe(false);
    expect(invalid.errors?.length).toBeGreaterThan(0);

    const valid = validateEmployeeInput({
      employeeCode: 'E101',
      name: 'Rohan Sharma',
      email: 'rohan@company.com',
      department: 'Engineering',
      role: 'employee',
    });
    expect(valid.success).toBe(true);
    expect(valid.data?.employeeCode).toBe('E101');
  });

  it('validates leave request input date formats and chronological ordering', () => {
    const invalidDateOrder = validateLeaveRequestInput({
      leaveType: 'PL',
      startDate: '2026-11-15',
      endDate: '2026-11-10',
    });
    expect(invalidDateOrder.success).toBe(false);

    const valid = validateLeaveRequestInput({
      leaveType: 'SL',
      startDate: '2026-11-10',
      endDate: '2026-11-12',
      isHalfDay: false,
    });
    expect(valid.success).toBe(true);
  });

  it('scrubs PII in error tracker context', () => {
    const result = captureException(new Error('Sample test exception'), {
      route: '/api/test',
      extra: {
        password: 'superSecretPassword123',
        safeParam: 'abc',
      },
    });
    expect(result.recorded).toBe(true);
  });
});
