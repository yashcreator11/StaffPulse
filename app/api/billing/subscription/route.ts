import { NextRequest, NextResponse } from 'next/server';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';
import {
  getSubscriptionInfo,
  updateSubscriptionPlan,
  PLAN_TIERS,
  PlanTier,
  BillingCycle,
} from '@/lib/billing/billingService';
import { logAuditEvent } from '@/lib/compliance/auditService';

// GET /api/billing/subscription
// Returns current subscription status, seat usage, and available tiers
export async function GET() {
  const requester = await getCurrentEmployee();
  if (!requester || (requester.role !== 'hr' && requester.role !== 'hr_super_admin')) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const orgId = requester.org_id || '00000000-0000-0000-0000-000000000001';
  try {
    const subInfo = await getSubscriptionInfo(orgId);
    return NextResponse.json({
      subscription: subInfo,
      plans: PLAN_TIERS,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/billing/subscription
// Changes plan tier or billing cycle for the organization
export async function POST(req: NextRequest) {
  const requester = await getCurrentEmployee();
  if (!requester || (requester.role !== 'hr' && requester.role !== 'hr_super_admin')) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const orgId = requester.org_id || '00000000-0000-0000-0000-000000000001';
  const body = await req.json().catch(() => null);

  const planTier = body?.planTier as PlanTier;
  const billingCycle = (body?.billingCycle || 'monthly') as BillingCycle;
  const taxId = body?.taxId ? String(body.taxId).trim() : undefined;

  if (!planTier || !PLAN_TIERS[planTier]) {
    return NextResponse.json({ error: 'Invalid plan tier specified' }, { status: 400 });
  }

  try {
    const updated = await updateSubscriptionPlan(orgId, planTier, billingCycle, taxId);

    await logAuditEvent({
      orgId,
      actorId: requester.id,
      actorEmail: requester.email,
      actorRole: requester.role,
      action: 'billing.plan_change',
      entityType: 'subscription',
      entityId: updated.id,
      details: { newPlan: planTier, billingCycle, seatLimit: updated.seatLimit },
    });

    return NextResponse.json({
      success: true,
      subscription: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
