import { NextRequest, NextResponse } from 'next/server';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';
import { computeQuote, createRazorpayOrder, PlanId, Cadence } from '@/lib/billing/razorpayService';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:34321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: NextRequest) {
  const requester = await getCurrentEmployee();
  if (!requester || (requester.role !== 'hr' && requester.role !== 'hr_super_admin')) {
    return NextResponse.json({ error: 'Unauthorized: Only HR Admins may generate billing orders' }, { status: 403 });
  }

  const orgId = requester.org_id || '00000000-0000-0000-0000-000000000001';
  const body = await req.json().catch(() => ({}));

  const planId = (body.planId || 'pro') as PlanId;
  const cadence = (body.cadence || 'annual') as Cadence;

  // Determine active staff count
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
  const { count } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .neq('status', 'inactive');

  const totalStaff = Math.max(count || 1, Number(body.staffCount) || 1);
  const quote = computeQuote(planId, cadence, totalStaff);

  try {
    const order = await createRazorpayOrder({
      orgId,
      quote,
      customerEmail: requester.email,
    });

    return NextResponse.json({
      success: true,
      order,
      quote,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create order';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
