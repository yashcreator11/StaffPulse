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

// GET /api/master/coupons
// Returns all coupons ordered by creation date
export async function GET() {
  const admin = await verifyPlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden: Platform Master access required' }, { status: 403 });
  }

  const service = createServiceClient();
  const { data: coupons, error } = await service
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ coupons });
}

// POST /api/master/coupons
// Create a new coupon or toggle active status
export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden: Platform Master access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const service = createServiceClient();

  // If toggling existing coupon status
  if (body.action === 'toggle' && body.id) {
    const { data: updated, error } = await service
      .from('coupons')
      .update({ is_active: Boolean(body.isActive), updated_at: new Date().toISOString() })
      .eq('id', body.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, coupon: updated });
  }

  // Create new coupon
  const code = String(body.code || '').trim().toUpperCase();
  const discountType = body.discountType || 'percentage';
  const discountValue = Number(body.discountValue) || 0;
  const description = body.description ? String(body.description).trim() : null;
  const minOrderAmount = Number(body.minOrderAmount) || 0;
  const maxDiscountCap = body.maxDiscountCap ? Number(body.maxDiscountCap) : null;
  const applicablePlans = Array.isArray(body.applicablePlans) && body.applicablePlans.length > 0
    ? body.applicablePlans
    : ['starter', 'pro', 'enterprise'];
  const maxRedemptions = body.maxRedemptions ? Number(body.maxRedemptions) : null;
  const validUntil = body.validUntil ? new Date(body.validUntil).toISOString() : null;

  if (!code) {
    return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
  }

  if (discountValue <= 0) {
    return NextResponse.json({ error: 'Discount value must be greater than 0' }, { status: 400 });
  }

  const { data: newCoupon, error } = await service
    .from('coupons')
    .insert({
      code,
      description,
      discount_type: discountType,
      discount_value: discountValue,
      min_order_amount: minOrderAmount,
      max_discount_cap: maxDiscountCap,
      applicable_plans: applicablePlans,
      max_redemptions: maxRedemptions,
      valid_until: validUntil,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: `Coupon code "${code}" already exists.` }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  await service.from('platform_audit_logs').insert({
    actor_id: admin.id,
    actor_email: admin.email,
    action: 'master.coupon_created',
    entity_type: 'coupons',
    entity_id: newCoupon.id,
    details: { code, discountType, discountValue },
  });

  return NextResponse.json({ success: true, coupon: newCoupon }, { status: 201 });
}

// DELETE /api/master/coupons?id=...
// Deletes a coupon
export async function DELETE(req: NextRequest) {
  const admin = await verifyPlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden: Platform Master access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 });
  }

  const service = createServiceClient();
  const { error } = await service.from('coupons').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await service.from('platform_audit_logs').insert({
    actor_id: admin.id,
    actor_email: admin.email,
    action: 'master.coupon_deleted',
    entity_type: 'coupons',
    entity_id: id,
    details: { id },
  });

  return NextResponse.json({ success: true });
}
