/**
 * CSV / Spreadsheet Formula Injection Sanitizer
 * Mitigates Excel/Sheets formula injection (CWE-1236) by neutralizing
 * cells that begin with formula indicators: =, +, -, @, \t, \r
 */

const FORMULA_START_CHARS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Sanitizes a single cell value.
 */
export function sanitizeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.length === 0) return '';

  const firstChar = str.charAt(0);
  if (FORMULA_START_CHARS.includes(firstChar)) {
    // Prefix with a single quote to force spreadsheet programs to treat it as raw text
    return `'${str}`;
  }

  return str;
}

/**
 * Sanitizes an array of row objects or cell values.
 */
export function sanitizeCsvRows<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map((row) => {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeCsvValue(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized as T;
  });
}
