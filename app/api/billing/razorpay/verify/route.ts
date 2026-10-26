import { NextRequest, NextResponse } from 'next/server';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';
import { verifyRazorpaySignature, computeQuote, PlanId, Cadence } from '@/lib/billing/razorpayService';
import { logAuditEvent } from '@/lib/compliance/auditService';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:34321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: NextRequest) {
  const requester = await getCurrentEmployee();
  if (!requester || (requester.role !== 'hr' && requester.role !== 'hr_super_admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const orgId = requester.org_id || '00000000-0000-0000-0000-000000000001';
  const body = await req.json().catch(() => ({}));

  const {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    planId,
    cadence,
    staffCount,
    gstin,
  } = body;

  if (!razorpayOrderId || !razorpayPaymentId) {
    return NextResponse.json({ error: 'Missing payment identifiers' }, { status: 400 });
  }

  const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature || '');
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid payment signature. Transaction rejected.' }, { status: 400 });
  }

  const quote = computeQuote((planId || 'pro') as PlanId, (cadence || 'annual') as Cadence, Number(staffCount) || 50);
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  // Map to plan code
  const planCode = quote.planId === 'enterprise' ? 'plan3' : quote.planId === 'pro' ? 'plan2' : 'plan1';

  // 1. Update organization plan & subscription status to active
  await supabase
    .from('organizations')
    .update({
      plan: planCode,
      status: 'active',
      subscription_status: 'active',
      seat_limit: quote.enrolledStaff,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId);

  // Update subscriptions record to active
  await supabase
    .from('subscriptions')
    .upsert({
      org_id: orgId,
      plan_tier: quote.planId,
      billing_cycle: quote.cadence,
      seat_limit: quote.enrolledStaff,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + (quote.cadence === 'annual' ? 365 : 30) * 86400000).toISOString(),
      tax_id: gstin || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'org_id' });

  // 2. Compute Subtotal & Check for Coupons
  let subtotal = quote.billingCycleTotal;
  let couponDiscount = 0;
  let appliedCouponCode: string | null = null;

  if (body.couponCode) {
    const { validateCoupon, incrementCouponUsage } = await import('@/lib/billing/couponService');
    const couponRes = await validateCoupon(String(body.couponCode), quote.planId, subtotal);
    if (couponRes.valid && couponRes.coupon) {
      couponDiscount = couponRes.coupon.discountAmount;
      subtotal = couponRes.coupon.finalSubtotal;
      appliedCouponCode = couponRes.coupon.code;
      await incrementCouponUsage(appliedCouponCode);
    }
  }

  // 3. Generate Invoice record
  const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const gstAmount = Math.round(subtotal * 0.18);
  const totalAmount = subtotal + gstAmount;

  const { data: invoice } = await supabase
    .from('invoices')
    .insert({
      org_id: orgId,
      invoice_number: invoiceNumber,
      amount: totalAmount,
      currency: 'INR',
      status: 'paid',
      plan_name: quote.planName,
      billing_period: quote.cadence,
      paid_at: new Date().toISOString(),
      metadata: {
        payment_id: razorpayPaymentId,
        order_id: razorpayOrderId,
        original_subtotal: quote.billingCycleTotal,
        coupon_code: appliedCouponCode,
        coupon_discount: couponDiscount,
        taxable_subtotal: subtotal,
        gst_rate: '18%',
        gst_amount: gstAmount,
        sac_code: '998313',
        customer_gstin: gstin || null,
        staff_enrolled: quote.enrolledStaff,
      },
    })
    .select('*')
    .single();

  // 3. Log Immutable Audit Record
  await logAuditEvent({
    orgId,
    actorId: requester.id,
    actorEmail: requester.email,
    actorRole: requester.role,
    action: 'billing.subscription_activated',
    entityType: 'subscription',
    entityId: invoice?.id || razorpayPaymentId,
    details: {
      planId: quote.planId,
      cadence: quote.cadence,
      amount: totalAmount,
      paymentId: razorpayPaymentId,
      invoiceNumber,
    },
  });

  // 4. Fetch org details to return dedicated slug
  const { data: orgRecord } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('id', orgId)
    .maybeSingle();

  return NextResponse.json({
    success: true,
    message: 'Subscription payment verified and workspace upgraded successfully.',
    orgSlug: orgRecord?.slug,
    orgName: orgRecord?.name,
    invoice: {
      invoiceNumber,
      amount: totalAmount,
      currency: 'INR',
      planName: quote.planName,
      cadence: quote.cadence,
      paidAt: new Date().toISOString(),
    },
  });
}
