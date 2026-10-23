import { NextRequest, NextResponse } from 'next/server';
import { createLeaveServiceClient } from '@/lib/leaveSupabase/server';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';
import { DEMO_EMPLOYEES, generateDemoAttendance } from '@/lib/demoDataGenerator';

export async function POST(req: NextRequest) {
  const requester = await getCurrentEmployee();
  if (!requester || (requester.role !== 'hr' && requester.role !== 'hr_super_admin')) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const service = createLeaveServiceClient();
  const orgId = requester.org_id || '00000000-0000-0000-0000-000000000001';
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthStr = String(currentMonth).padStart(2, '0');

  // 1. Ensure Demo Offices exist
  await service.from('offices').upsert([
    { org_id: orgId, code: 'MUM', name: 'Mumbai HQ' },
    { org_id: orgId, code: 'PUN', name: 'Pune Tech Park' },
  ], { onConflict: 'org_id,code' });

  // 2. Insert Demo Employees
  const empPayload = DEMO_EMPLOYEES.map(e => ({
    org_id: orgId,
    employee_code: e.employee_code,
    full_name: e.full_name,
    email: e.email,
    department: e.department,
    office: e.office,
    role: e.role,
    job_title: e.job_title,
    employment_status: 'active',
    date_of_joining: '2024-01-01',
    is_deleted: false,
    updated_at: new Date().toISOString(),
  }));

  await service.from('employees').upsert(empPayload, { onConflict: 'org_id,employee_code' });

  // 3. Ensure uploaded_months exist for both offices
  const monthKeyMum = `${currentYear}_${monthStr}_MUM`;
  const monthKeyPun = `${currentYear}_${monthStr}_PUN`;

  await service.from('uploaded_months').upsert([
    { key: monthKeyMum, org_id: orgId, office_code: 'MUM', label: `MUM — ${currentMonth}/${currentYear}`, month: monthStr, year: String(currentYear) },
    { key: monthKeyPun, org_id: orgId, office_code: 'PUN', label: `PUN — ${currentMonth}/${currentYear}`, month: monthStr, year: String(currentYear) },
  ], { onConflict: 'key' });

  // 4. Generate & Upsert Demo Attendance records
  const attendanceRecords = generateDemoAttendance(orgId, DEMO_EMPLOYEES, currentYear, currentMonth);

  for (let i = 0; i < attendanceRecords.length; i += 200) {
    const batch = attendanceRecords.slice(i, i + 200);
    await service.from('attendance_records').upsert(batch, { onConflict: 'employee_code,date,office_code' });
  }

  return NextResponse.json({
    success: true,
    message: `Sample demo data successfully seeded (${DEMO_EMPLOYEES.length} employees, ${attendanceRecords.length} attendance records).`,
    seeded: {
      offices: 2,
      departments: 4,
      employees: DEMO_EMPLOYEES.length,
      attendanceRecords: attendanceRecords.length,
    },
  });
}
