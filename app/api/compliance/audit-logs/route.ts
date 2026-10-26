import { NextRequest, NextResponse } from 'next/server';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';
import { getAuditLogs } from '@/lib/compliance/auditService';
import { canAccessFeature, normalizePlanTier } from '@/lib/billing/planGating';

// GET /api/compliance/audit-logs
// Returns immutable audit trail for the organization
export async function GET(req: NextRequest) {
  const requester = await getCurrentEmployee();
  if (!requester || (requester.role !== 'hr' && requester.role !== 'hr_super_admin')) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const userPlan = normalizePlanTier(requester.organizations?.plan);
  if (!canAccessFeature(userPlan, 'compliance_dpdp')) {
    return NextResponse.json(
      {
        error: 'DPDP Act Compliance and Audit Ledger is an Enterprise-tier capability.',
        planLocked: true,
        requiredTier: 'enterprise',
      },
      { status: 403 }
    );
  }

  const orgId = requester.org_id || '00000000-0000-0000-0000-000000000001';
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || undefined;
  const entityType = searchParams.get('entityType') || undefined;
  const limit = Number(searchParams.get('limit')) || 50;

  try {
    const logs = await getAuditLogs(orgId, { action, entityType, limit });
    return NextResponse.json({ logs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch audit logs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
