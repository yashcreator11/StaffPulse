export interface ValidationResult {
  valid: boolean;
  error?: string;
  officeCode?: string | null; // null = not in filename, UI will prompt
  month?: string;
  year?: string;
  needsOfficeCode?: boolean;  // true when filename has no embedded office code
}

/** Old strict pattern: 2026_07_MUM.csv — still recognized for backward compat */
const FILENAME_REGEX = /^(\d{4})_(\d{2})_([A-Z]{2,6})\.csv$/i;

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateFile(file: File): ValidationResult {
  // Step 1: file size (always checked)
  if (file.size > MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed: 5 MB.`,
    };
  }

  // Step 2: must be a CSV (by extension — the MIME type is unreliable across OSes)
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return {
      valid: false,
      error: `Only .csv files are supported. Got: "${file.name}"`,
    };
  }

  // Step 3: try to extract year / month / office code from the old-style filename.
  // If it matches → great, no prompt needed.
  // If it doesn't match → still valid, just flag that the office code is unknown.
  const match = file.name.match(FILENAME_REGEX);
  if (match) {
    const [, year, month, officeCode] = match;
    return { valid: true, officeCode: officeCode.toUpperCase(), month, year, needsOfficeCode: false };
  }

  // Any other CSV filename is fine — office code will be asked via prompt
  return { valid: true, officeCode: null, needsOfficeCode: true };
}

export const REQUIRED_STANDARD_FIELDS = [
  'employeeCode',
  'employeeName',
  'date',
  'inTime',
  'outTime',
  'status',
  'lateBy',
  'earlyBy',
  'duration',
] as const;

export const OPTIONAL_STANDARD_FIELDS = [
  'department',
] as const;

export const ALL_STANDARD_FIELDS = [
  ...REQUIRED_STANDARD_FIELDS,
  ...OPTIONAL_STANDARD_FIELDS,
] as const;

export const FIELD_LABELS: Record<string, string> = {
  employeeCode: 'Employee Code / ID',
  employeeName: 'Employee Name',
  date: 'Date',
  inTime: 'In Time',
  outTime: 'Out Time',
  status: 'Status',
  lateBy: 'Late By',
  earlyBy: 'Early By',
  duration: 'Duration',
  department: 'Department (Optional)',
};

/**
 * Sanitizes cell values to prevent CSV / Spreadsheet formula injection attacks (CSV Injection / DDE).
 * Strips or prefixes leading '=', '+', '-', '@', '\t', '\r' when exported or parsed.
 */
export function sanitizeSpreadsheetCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    // Prefix with apostrophe to force Excel/Sheets to treat as literal string
    return `'${str}`;
  }
  return str;
}

export function isSuspiciousSpreadsheetCell(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^[=+\-@\t\r]/.test(value.trim());
}
