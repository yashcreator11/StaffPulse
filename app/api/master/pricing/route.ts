import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

async function verifyPlatformAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data: admin } = await service
    .from('platform_admins')
    .select('id, user_id, email, role')
    .eq('user_id', user.id)
    .maybeSingle();

  return admin;
}

// GET /api/master/pricing
// Returns all platform subscription plans with configurable base rates & discounts
export async function GET() {
  const admin = await verifyPlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden: Platform Master access required' }, { status: 403 });
  }

  const service = createServiceClient();
  const { data: plans, error } = await service
    .from('platform_pricing')
    .select('*')
    .order('monthly_base_price', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ plans });
}

// POST /api/master/pricing
// Update prices and discount settings for a plan
export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden: Platform Master access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    planId,
    monthlyBasePrice,
    annualBasePrice,
    monthlyExtraPerEmp,
    annualExtraPerEmp,
    annualDiscountPercent,
    baseEmployees,
  } = body;

  if (!planId) {
    return NextResponse.json({ error: 'planId is required' }, { status: 400 });
  }

  const service = createServiceClient();

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (monthlyBasePrice !== undefined) updates.monthly_base_price = Number(monthlyBasePrice);
  if (annualBasePrice !== undefined) updates.annual_base_price = Number(annualBasePrice);
  if (monthlyExtraPerEmp !== undefined) updates.monthly_extra_per_emp = Number(monthlyExtraPerEmp);
  if (annualExtraPerEmp !== undefined) updates.annual_extra_per_emp = Number(annualExtraPerEmp);
  if (annualDiscountPercent !== undefined) updates.annual_discount_percent = Number(annualDiscountPercent);
  if (baseEmployees !== undefined) updates.base_employees = Number(baseEmployees);

  const { data: updated, error } = await service
    .from('platform_pricing')
    .update(updates)
    .eq('plan_id', planId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  await service.from('platform_audit_logs').insert({
    actor_id: admin.id,
    actor_email: admin.email,
    action: 'master.pricing_updated',
    entity_type: 'platform_pricing',
    entity_id: updated.id,
    details: { planId, updates },
  });

  return NextResponse.json({ success: true, plan: updated });
}
