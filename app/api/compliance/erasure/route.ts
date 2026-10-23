import { NextRequest, NextResponse } from 'next/server';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';
import { executeEmployeeDataErasure } from '@/lib/compliance/auditService';

// POST /api/compliance/erasure
// Executes GDPR Article 17 / DPDP Right to Erasure with typed confirmation
export async function POST(req: NextRequest) {
  const requester = await getCurrentEmployee();
  if (!requester || (requester.role !== 'hr' && requester.role !== 'hr_super_admin')) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const orgId = requester.org_id || '00000000-0000-0000-0000-000000000001';
  const body = await req.json().catch(() => null);

  const employeeId = body?.employeeId;
  const typedConfirmation = body?.confirmation;

  if (!employeeId || typedConfirmation !== 'PERMANENTLY_ERASE') {
    return NextResponse.json(
      { error: "Must provide valid employeeId and exact confirmation text 'PERMANENTLY_ERASE'" },
      { status: 400 }
    );
  }

  try {
    const result = await executeEmployeeDataErasure(orgId, employeeId, requester.email);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erasure execution failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
