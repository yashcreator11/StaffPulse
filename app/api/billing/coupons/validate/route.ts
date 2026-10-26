import { NextRequest, NextResponse } from 'next/server';
import { validateCoupon } from '@/lib/billing/couponService';

// POST /api/billing/coupons/validate
// Validates a coupon code during checkout and computes discount
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { code, planId, subtotal } = body;

    if (!code) {
      return NextResponse.json({ error: 'Please enter a coupon code' }, { status: 400 });
    }

    const result = await validateCoupon(
      String(code).trim().toUpperCase(),
      planId || 'pro',
      Number(subtotal) || 0
    );

    if (!result.valid) {
      return NextResponse.json({ error: result.error || 'Invalid coupon code' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      coupon: result.coupon,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Coupon validation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
