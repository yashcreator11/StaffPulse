import { ColumnMapping } from './types';
import { normalizeDate } from './parseCSV';

export interface ImportValidationIssue {
  type: 'duplicate_punch' | 'bad_date' | 'unknown_employee' | 'missing_required' | 'shift_anomaly';
  severity: 'error' | 'warning';
  message: string;
  rowNumber: number;
  employeeCode?: string;
  date?: string;
}

export interface ImportValidationReport {
  isValid: boolean; // false only if there are fatal blocking errors
  canProceed: boolean; // warnings like unknown employees can proceed via auto-onboard
  totalRows: number;
  validRows: number;
  duplicatePunchesCount: number;
  badDatesCount: number;
  missingRequiredCount: number;
  unknownEmployeesCount: number;
  unknownEmployeeList: { employeeCode: string; employeeName: string; count: number }[];
  issues: ImportValidationIssue[];
}

/**
 * Validates raw CSV rows against column mappings and known employee directory
 * before persistence, generating a detailed report of duplicates, unknown employees, and bad dates.
 */
export function validateAttendanceImport(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  knownEmployees: Set<string>,
  dateFormat?: 'DMY' | 'MDY' | 'YMD'
): ImportValidationReport {
  const issues: ImportValidationIssue[] = [];
  const seenPunches = new Set<string>();
  const unknownEmpMap = new Map<string, { employeeName: string; count: number }>();

  let duplicatePunchesCount = 0;
  let badDatesCount = 0;
  let missingRequiredCount = 0;
  let validRows = 0;

  const effectiveDateFormat = mapping.dateFormat || dateFormat || 'DMY';

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-based index accounting for header row
    const empCode = String(row[mapping.employeeCode] || '').trim();
    const rawDate = String(row[mapping.date] || '').trim();
    const empName = String(row[mapping.employeeName] || '').trim();

    // 1. Missing required identifiers
    if (!empCode || !rawDate) {
      missingRequiredCount++;
      issues.push({
        type: 'missing_required',
        severity: 'error',
        message: `Row ${rowNum}: Missing ${!empCode ? 'employee code' : 'date'}`,
        rowNumber: rowNum,
        employeeCode: empCode,
      });
      continue;
    }

    // 2. Date validation
    const normalizedDate = normalizeDate(rawDate, effectiveDateFormat);
    if (!normalizedDate || !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      badDatesCount++;
      issues.push({
        type: 'bad_date',
        severity: 'error',
        message: `Row ${rowNum}: Unrecognized date format "${rawDate}"`,
        rowNumber: rowNum,
        employeeCode: empCode,
        date: rawDate,
      });
      continue;
    }

    // 3. Duplicate punch detection (same employee, same date)
    const punchKey = `${empCode}__${normalizedDate}`;
    if (seenPunches.has(punchKey)) {
      duplicatePunchesCount++;
      issues.push({
        type: 'duplicate_punch',
        severity: 'warning',
        message: `Row ${rowNum}: Duplicate punch record for employee ${empCode} on ${normalizedDate}`,
        rowNumber: rowNum,
        employeeCode: empCode,
        date: normalizedDate,
      });
    } else {
      seenPunches.add(punchKey);
    }

    // 4. Unknown employee check (warning, auto-onboardable)
    if (knownEmployees.size > 0 && !knownEmployees.has(empCode)) {
      const existing = unknownEmpMap.get(empCode);
      if (existing) {
        existing.count++;
      } else {
        unknownEmpMap.set(empCode, { employeeName: empName, count: 1 });
      }
    }

    validRows++;
  }

  const unknownEmployeeList = Array.from(unknownEmpMap.entries()).map(([code, val]) => ({
    employeeCode: code,
    employeeName: val.employeeName,
    count: val.count,
  }));

  const hasFatalErrors = missingRequiredCount > 0 && validRows === 0;
  const canProceed = validRows > 0;

  return {
    isValid: !hasFatalErrors,
    canProceed,
    totalRows: rows.length,
    validRows,
    duplicatePunchesCount,
    badDatesCount,
    missingRequiredCount,
    unknownEmployeesCount: unknownEmployeeList.length,
    unknownEmployeeList,
    issues: issues.slice(0, 100), // cap preview issues to 100 items
  };
}
