export interface EmployeeImportRow {
  employee_code: string;
  full_name: string;
  email: string;
  department?: string;
  office: string;
  role?: string;
  date_of_joining?: string;
  phone?: string;
  job_title?: string;
}

export interface OpeningBalanceRow {
  employee_code: string;
  leave_type_code: string;
  balance: number;
  year: number;
}

export const VALID_ROLES = new Set(['employee', 'lead', 'manager', 'hr', 'hr_super_admin']);

/**
 * Normalizes an organization display name into a clean, safe URL slug.
 */
export function slugifyOrgName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Splits CSV string handling simple commas and quoted commas.
 */
export function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

/**
 * Parses raw CSV text into EmployeeImportRow objects based on column headers.
 */
export function parseEmployeeCSV(csvText: string): EmployeeImportRow[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/^["']|["']$/g, ''));
  const rows: EmployeeImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] !== undefined ? cols[idx] : '';
    });

    if (obj.employee_code || obj.full_name || obj.email) {
      rows.push({
        employee_code: obj.employee_code || '',
        full_name: obj.full_name || '',
        email: obj.email || '',
        department: obj.department || 'General',
        office: obj.office || 'HQ',
        role: obj.role || 'employee',
        date_of_joining: obj.date_of_joining,
        phone: obj.phone,
        job_title: obj.job_title,
      });
    }
  }

  return rows;
}

/**
 * Validates a single employee import row.
 */
export function validateEmployeeRow(
  row: Partial<EmployeeImportRow>,
  seenCodes: Set<string>
): { valid: boolean; error?: string } {
  const empCode = String(row.employee_code || '').trim();
  const fullName = String(row.full_name || '').trim();
  const email = String(row.email || '').trim().toLowerCase();
  const role = String(row.role || 'employee').trim().toLowerCase();

  if (!empCode) {
    return { valid: false, error: 'Missing employee_code.' };
  }
  if (seenCodes.has(empCode)) {
    return { valid: false, error: `Duplicate employee_code "${empCode}" within import file.` };
  }
  seenCodes.add(empCode);

  if (!fullName) {
    return { valid: false, error: 'Missing full_name.' };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, error: `Invalid email address "${email}".` };
  }
  if (!VALID_ROLES.has(role)) {
    return {
      valid: false,
      error: `Invalid role "${role}". Allowed: employee, lead, manager, hr, hr_super_admin.`,
    };
  }

  return { valid: true };
}

/**
 * Parses raw CSV text into OpeningBalanceRow objects based on column headers.
 */
export function parseOpeningBalanceCSV(csvText: string): OpeningBalanceRow[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/^["']|["']$/g, ''));
  const rows: OpeningBalanceRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] !== undefined ? cols[idx] : '';
    });

    if (obj.employee_code && obj.leave_type_code) {
      rows.push({
        employee_code: obj.employee_code,
        leave_type_code: obj.leave_type_code,
        balance: parseFloat(obj.balance || '0'),
        year: parseInt(obj.year || String(new Date().getFullYear()), 10),
      });
    }
  }

  return rows;
}

/**
 * Validates a single opening balance import row.
 */
export function validateOpeningBalanceRow(
  row: Partial<OpeningBalanceRow>,
  knownEmpCodes: Set<string>,
  knownLeaveTypes: Set<string>
): { valid: boolean; error?: string } {
  const empCode = String(row.employee_code || '').trim();
  const typeCode = String(row.leave_type_code || '').trim().toUpperCase();
  const balance = typeof row.balance === 'number' ? row.balance : parseFloat(String(row.balance));
  const year = typeof row.year === 'number' ? row.year : parseInt(String(row.year), 10);

  if (!empCode) {
    return { valid: false, error: 'Missing employee_code.' };
  }
  if (!knownEmpCodes.has(empCode.toLowerCase())) {
    return { valid: false, error: `Employee code "${empCode}" not found in this organization.` };
  }

  if (!typeCode) {
    return { valid: false, error: 'Missing leave_type_code.' };
  }
  if (!knownLeaveTypes.has(typeCode)) {
    return { valid: false, error: `Leave type code "${typeCode}" not recognized in this organization.` };
  }

  if (isNaN(balance) || balance < 0) {
    return { valid: false, error: `Invalid balance "${row.balance}". Must be a non-negative number.` };
  }

  if (isNaN(year) || year < 2000 || year > 2100) {
    return { valid: false, error: `Invalid year "${row.year}".` };
  }

  return { valid: true };
}
