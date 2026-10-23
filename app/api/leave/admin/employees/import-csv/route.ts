import { NextRequest, NextResponse } from 'next/server';
import { createLeaveServiceClient } from '@/lib/leaveSupabase/server';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';
import {
  EmployeeImportRow,
  parseEmployeeCSV,
  validateEmployeeRow,
} from '@/lib/onboardingImportHelpers';

// GET /api/leave/admin/employees/import-csv
// Returns a downloadable CSV template for employee onboarding
export async function GET() {
  const csvHeaders = 'employee_code,full_name,email,department,office,role,date_of_joining,phone,job_title\n';
  const sampleRow1 = 'EMP001,John Doe,john.doe@company.com,Engineering,HQ,employee,2025-01-15,+919876543210,Software Engineer\n';
  const sampleRow2 = 'EMP002,Jane Smith,jane.smith@company.com,Product,HQ,lead,2024-06-01,+919876543211,Product Manager\n';
  const csvContent = csvHeaders + sampleRow1 + sampleRow2;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="employee_import_template.csv"',
    },
  });
}

// POST /api/leave/admin/employees/import-csv
// Bulk imports employee records with validation, duplicate protection, and tenant scoping
export async function POST(req: NextRequest) {
  const requester = await getCurrentEmployee();
  if (!requester || (requester.role !== 'hr' && requester.role !== 'hr_super_admin')) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  let rows: EmployeeImportRow[] = [];
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const file = formData.get('file');
    if (file && typeof file === 'object' && 'text' in file) {
      const csvText = await (file as Blob).text();
      rows = parseEmployeeCSV(csvText);
    }
  } else if (contentType.includes('text/csv')) {
    const csvText = await req.text();
    rows = parseEmployeeCSV(csvText);
  } else {
    const body = await req.json().catch(() => null);
    rows = Array.isArray(body?.rows) ? body.rows : [];
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No employee rows provided for import.' }, { status: 400 });
  }
  if (rows.length > 1000) {
    return NextResponse.json({ error: 'Maximum 1000 employee rows per import.' }, { status: 400 });
  }

  const service = createLeaveServiceClient();
  const errors: { row: number; employeeCode?: string; error: string }[] = [];
  const validRecords: any[] = [];
  const seenCodes = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    const validation = validateEmployeeRow(row, seenCodes);
    if (!validation.valid) {
      errors.push({
        row: rowNum,
        employeeCode: row.employee_code,
        error: validation.error || 'Validation error',
      });
      continue;
    }

    const empCode = String(row.employee_code || '').trim();
    const fullName = String(row.full_name || '').trim();
    const email = String(row.email || '').trim().toLowerCase();
    const office = String(row.office || 'HQ').trim().toUpperCase();
    const dept = String(row.department || 'General').trim() || 'General';
    const role = String(row.role || 'employee').trim().toLowerCase();
    const phone = row.phone ? String(row.phone).trim() : null;
    const jobTitle = row.job_title ? String(row.job_title).trim() : null;
    const dateOfJoining = row.date_of_joining ? String(row.date_of_joining).trim() : new Date().toISOString().split('T')[0];

    validRecords.push({
      org_id: requester.org_id,
      employee_code: empCode,
      full_name: fullName,
      email,
      office,
      department: dept,
      role,
      phone,
      job_title: jobTitle,
      date_of_joining: dateOfJoining,
      employment_status: 'active',
      is_deleted: false,
      updated_at: new Date().toISOString(),
    });
  }

  if (validRecords.length === 0) {
    return NextResponse.json(
      {
        success: false,
        importedCount: 0,
        skippedCount: rows.length,
        errors,
        message: 'No valid rows to import.',
      },
      { status: 400 }
    );
  }

  // Upsert valid records on (org_id, employee_code)
  const { data: upserted, error: upsertError } = await service
    .from('employees')
    .upsert(validRecords, { onConflict: 'org_id,employee_code' })
    .select('id, employee_code');

  if (upsertError) {
    return NextResponse.json({ error: `Import failed: ${upsertError.message}` }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    totalSubmitted: rows.length,
    importedCount: upserted?.length || validRecords.length,
    skippedCount: errors.length,
    errors,
  });
}
