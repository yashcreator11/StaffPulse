import { NextRequest, NextResponse } from 'next/server';
import { createLeaveServiceClient } from '@/lib/leaveSupabase/server';
import { mapTrackerLeaveType } from '@/lib/leaveSupabase/leaveTypeMap';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';

interface Item {
  employeeCode: string;
  date: string; // YYYY-MM-DD
  officeCode: string;
}

const MAX_BATCH_SIZE = 100;

export async function POST(req: NextRequest) {
  // 1. Authorization check: must have a valid authenticated employee session
  const currentEmployee = await getCurrentEmployee();
  if (!currentEmployee) {
    return NextResponse.json({ error: 'Unauthorized: login required' }, { status: 401 });
  }

  const isHr = currentEmployee.role === 'hr' || currentEmployee.role === 'hr_super_admin';

  let body: { items?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? (body.items as Item[]) : [];
  if (items.length === 0) return NextResponse.json({ records: [] });

  // 2. Batch limit enforcement
  if (items.length > MAX_BATCH_SIZE) {
    return NextResponse.json(
      { error: `Batch size exceeds limit of ${MAX_BATCH_SIZE} items per request` },
      { status: 400 }
    );
  }

  let leaveService;
  try {
    leaveService = createLeaveServiceClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Leave Tracker is not reachable (config error): ${message}`, records: [] },
      { status: 502 }
    );
  }

  const results: Array<{
    employeeCode: string;
    officeCode: string;
    date: string;
    leaveType: string;
    halfDayLeaveType?: string;
    markedAt: string;
    note?: string;
  }> = [];

  // Query leave records for requested items
  for (const it of items) {
    if (!it.employeeCode || !it.date) continue;

    try {
      const date = it.date;
      const { data, error } = await leaveService
        .from('leave_requests')
        .select('id, start_date, end_date, is_half_day, reason, applied_on, leave_types(code), employees!leave_requests_employee_id_fkey!inner(employee_code, office)')
        .eq('employees.employee_code', it.employeeCode)
        .lte('start_date', date)
        .gte('end_date', date)
        .in('status', ['approved', 'auto_lwp']);

      if (error || !data) {
        continue;
      }

      for (const row of data as any[]) {
        const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
        const leaveType = Array.isArray(row.leave_types) ? row.leave_types[0] : row.leave_types;
        if (!employee || !leaveType) continue;

        const { leaveType: mainType, halfDayLeaveType } = mapTrackerLeaveType(leaveType.code, !!row.is_half_day);

        // Security / Privacy: only return leave reason note if caller is HR or the employee themselves
        const canViewReason = isHr || it.employeeCode === currentEmployee.employee_code;

        results.push({
          employeeCode: employee.employee_code,
          officeCode: employee.office,
          date,
          leaveType: mainType,
          halfDayLeaveType,
          markedAt: row.applied_on,
          note: canViewReason ? (row.reason ?? undefined) : undefined,
        });
      }
    } catch {
      // swallow single-item failures and continue
      continue;
    }
  }

  return NextResponse.json({ records: results });
}
