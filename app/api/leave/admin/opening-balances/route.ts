import { NextRequest, NextResponse } from 'next/server';
import { createLeaveServiceClient } from '@/lib/leaveSupabase/server';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';
import {
  OpeningBalanceRow,
  parseOpeningBalanceCSV,
  validateOpeningBalanceRow,
} from '@/lib/onboardingImportHelpers';

// GET /api/leave/admin/opening-balances
// Returns a downloadable CSV template for importing opening leave balances
export async function GET() {
  const currentYear = new Date().getFullYear();
  const csvHeaders = 'employee_code,leave_type_code,balance,year\n';
  const sampleRow1 = `EMP001,PL,14.5,${currentYear}\n`;
  const sampleRow2 = `EMP001,CL,8.0,${currentYear}\n`;
  const sampleRow3 = `EMP002,PL,10.0,${currentYear}\n`;
  const csvContent = csvHeaders + sampleRow1 + sampleRow2 + sampleRow3;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="opening_balances_template.csv"',
    },
  });
}

// POST /api/leave/admin/opening-balances
// Bulk imports opening leave balances, validating employee existence and leave types
export async function POST(req: NextRequest) {
  const requester = await getCurrentEmployee();
  if (!requester || (requester.role !== 'hr' && requester.role !== 'hr_super_admin')) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  let rows: OpeningBalanceRow[] = [];
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const file = formData.get('file');
    if (file && typeof file === 'object' && 'text' in file) {
      const csvText = await (file as Blob).text();
      rows = parseOpeningBalanceCSV(csvText);
    }
  } else if (contentType.includes('text/csv')) {
    const csvText = await req.text();
    rows = parseOpeningBalanceCSV(csvText);
  } else {
    const body = await req.json().catch(() => null);
    rows = Array.isArray(body?.rows) ? body.rows : [];
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No opening balance rows provided.' }, { status: 400 });
  }

  const service = createLeaveServiceClient();

  // Pre-fetch all known employee codes and leave types for this tenant
  const [empRes, typeRes] = await Promise.all([
    service.from('employees').select('id, employee_code').eq('org_id', requester.org_id),
    service.from('leave_types').select('id, code').eq('org_id', requester.org_id),
  ]);

  const empMap = new Map((empRes.data || []).map((e) => [e.employee_code.toLowerCase(), e.id]));
  const typeMap = new Map((typeRes.data || []).map((t) => [t.code.toUpperCase(), t.id]));

  const knownEmpCodes = new Set((empRes.data || []).map((e) => e.employee_code.toLowerCase()));
  const knownLeaveTypes = new Set((typeRes.data || []).map((t) => t.code.toUpperCase()));

  const errors: { row: number; error: string }[] = [];
  const openingRecords: any[] = [];
  const balanceRecords: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    const validation = validateOpeningBalanceRow(row, knownEmpCodes, knownLeaveTypes);
    if (!validation.valid) {
      errors.push({ row: rowNum, error: validation.error || 'Validation error' });
      continue;
    }

    const empCode = String(row.employee_code || '').trim();
    const typeCode = String(row.leave_type_code || '').trim().toUpperCase();
    const balance = typeof row.balance === 'number' ? row.balance : parseFloat(String(row.balance));
    const year = typeof row.year === 'number' ? row.year : parseInt(String(row.year), 10);

    const empId = empMap.get(empCode.toLowerCase());
    const typeId = typeMap.get(typeCode);

    openingRecords.push({
      org_id: requester.org_id,
      employee_code: empCode,
      leave_type_code: typeCode,
      balance,
      year,
      imported_by: requester.id,
      imported_at: new Date().toISOString(),
    });

    if (empId && typeId) {
      balanceRecords.push({
        org_id: requester.org_id,
        employee_id: empId,
        leave_type_id: typeId,
        balance,
        year,
        updated_at: new Date().toISOString(),
      });
    }
  }

  if (openingRecords.length === 0) {
    return NextResponse.json(
      {
        success: false,
        importedCount: 0,
        skippedCount: rows.length,
        errors,
        message: 'No valid balance rows to import.',
      },
      { status: 400 }
    );
  }

  // Record in opening_balances audit log
  const { error: openingErr } = await service
    .from('opening_balances')
    .upsert(openingRecords, { onConflict: 'org_id,employee_code,leave_type_code,year' });

  if (openingErr) {
    return NextResponse.json({ error: `Opening balances log failed: ${openingErr.message}` }, { status: 500 });
  }

  // Update live balances table
  if (balanceRecords.length > 0) {
    const { error: balErr } = await service
      .from('balances')
      .upsert(balanceRecords, { onConflict: 'employee_id,leave_type_id,year' });

    if (balErr) {
      return NextResponse.json({
        warning: `Saved to opening_balances audit log, but balance table update failed: ${balErr.message}`,
        importedCount: openingRecords.length,
        skippedCount: errors.length,
        year: rows[0]?.year || new Date().getFullYear(),
      });
    }
  }

  return NextResponse.json({
    success: true,
    totalSubmitted: rows.length,
    importedCount: openingRecords.length,
    skippedCount: errors.length,
    year: rows[0]?.year || new Date().getFullYear(),
    errors,
  });
}
