/**
 * StaffPulse Core API Validation Schemas & Sanitizers
 */

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

export function validateEmployeeInput(input: any): ValidationResult<{
  employeeCode: string;
  name: string;
  email: string;
  department: string;
  role: 'employee' | 'lead' | 'manager' | 'hr';
}> {
  const errors: string[] = [];

  const employeeCode = String(input?.employeeCode || input?.employee_code || '').trim();
  const name = String(input?.name || '').trim();
  const email = String(input?.email || '').trim().toLowerCase();
  const department = String(input?.department || 'General').trim();
  const role = input?.role || 'employee';

  if (!employeeCode) errors.push('Employee Code is required.');
  if (!name || name.length < 2) errors.push('Full name must be at least 2 characters.');
  if (!email || !email.includes('@') || !email.includes('.')) errors.push('Valid corporate email address is required.');
  if (!['employee', 'lead', 'manager', 'hr'].includes(role)) errors.push('Invalid employee role specified.');

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: { employeeCode, name, email, department, role },
  };
}

export function validateLeaveRequestInput(input: any): ValidationResult<{
  leaveType: string;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  reason?: string;
}> {
  const errors: string[] = [];

  const leaveType = String(input?.leaveType || input?.leave_type || '').toUpperCase().trim();
  const startDate = String(input?.startDate || input?.start_date || '').trim();
  const endDate = String(input?.endDate || input?.end_date || startDate).trim();
  const isHalfDay = Boolean(input?.isHalfDay || input?.is_half_day);
  const reason = input?.reason ? String(input.reason).trim() : undefined;

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!leaveType) errors.push('Leave type code (e.g. SL, PL, CL) is required.');
  if (!startDate || !dateRegex.test(startDate)) errors.push('Start date must be in YYYY-MM-DD format.');
  if (!endDate || !dateRegex.test(endDate)) errors.push('End date must be in YYYY-MM-DD format.');
  if (startDate > endDate) errors.push('Start date cannot be after end date.');

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: { leaveType, startDate, endDate, isHalfDay, reason },
  };
}
