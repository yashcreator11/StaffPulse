import { NextRequest, NextResponse } from 'next/server';
import { createLeaveServiceClient } from '@/lib/leaveSupabase/server';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';
import { isEmployeeDeactivated } from '@/lib/authPolicy';

// POST /api/leave/admin/employees/:id/offboard
//   - HR or HR Super Admin only.
//   - Marks employee as deactivated and employment_status as resigned/terminated.
//   - Revokes any active Supabase Auth sessions immediately via auth.admin.signOut.
//   - Retains 100% of historical attendance, leave records, and audits for compliance.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const requester = await getCurrentEmployee();
  if (!requester || (requester.role !== 'hr' && requester.role !== 'hr_super_admin')) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const service = createLeaveServiceClient();

  // Scope query strictly to caller's organization
  const { data: employee, error: fetchError } = await service
    .from('employees')
    .select('id, org_id, full_name, email, auth_user_id, employment_status, is_deleted, deactivated_at')
    .eq('id', id)
    .eq('org_id', requester.org_id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }
  if (!employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  if (isEmployeeDeactivated(employee)) {
    return NextResponse.json(
      { message: `${employee.full_name} is already offboarded/deactivated.` },
      { status: 200 }
    );
  }

  let body: { reason?: string; status?: 'resigned' | 'terminated' } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine
  }

  const nowIso = new Date().toISOString();
  const employmentStatus = body.status === 'terminated' ? 'terminated' : 'resigned';
  const reason = body.reason?.trim() || `Offboarded by ${requester.full_name || 'HR'}`;

  // 1. Update employee record
  const { error: updateError } = await service
    .from('employees')
    .update({
      employment_status: employmentStatus,
      is_deleted: true,
      deactivated_at: nowIso,
      deactivated_by: requester.id,
      offboarding_reason: reason,
      updated_at: nowIso,
    })
    .eq('id', employee.id)
    .eq('org_id', requester.org_id);

  if (updateError) {
    return NextResponse.json({ error: `Offboarding failed: ${updateError.message}` }, { status: 500 });
  }

  // 2. Immediately revoke any active Supabase Auth sessions
  let sessionRevoked = false;
  if (employee.auth_user_id) {
    try {
      const { error: signOutError } = await service.auth.admin.signOut(employee.auth_user_id);
      if (!signOutError) {
        sessionRevoked = true;
      }
    } catch (err) {
      console.warn('[Offboard] Failed to revoke session for user:', employee.auth_user_id, err);
    }
  }

  return NextResponse.json({
    success: true,
    message: `Successfully offboarded ${employee.full_name}.`,
    sessionRevoked,
    deactivatedAt: nowIso,
  });
}
