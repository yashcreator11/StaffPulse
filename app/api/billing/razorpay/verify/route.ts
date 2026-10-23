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

  // 1. Update organization plan & subscription status
  await supabase
    .from('organizations')
    .update({
      plan: planCode,
      subscription_status: 'active',
      seat_limit: quote.enrolledStaff,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId);

  // 2. Generate Invoice record
  const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const subtotal = quote.billingCycleTotal;
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
        subtotal,
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

  return NextResponse.json({
    success: true,
    message: 'Subscription payment verified and workspace upgraded successfully.',
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
