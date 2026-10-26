import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:34321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount_cap: number | null;
  applicable_plans: string[];
  max_redemptions: number | null;
  times_redeemed: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
}

export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  coupon?: {
    code: string;
    description: string | null;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    discountAmount: number;
    originalSubtotal: number;
    finalSubtotal: number;
  };
}

/**
 * Pure calculation function for coupon discounts
 */
export function calculateCouponDiscount(
  subtotal: number,
  coupon: Pick<Coupon, 'discount_type' | 'discount_value' | 'max_discount_cap' | 'min_order_amount'>
): { discountAmount: number; finalSubtotal: number } {
  if (subtotal < (coupon.min_order_amount || 0)) {
    return { discountAmount: 0, finalSubtotal: subtotal };
  }

  let discount = 0;
  if (coupon.discount_type === 'percentage') {
    discount = Math.round((subtotal * coupon.discount_value) / 100);
    if (coupon.max_discount_cap && discount > coupon.max_discount_cap) {
      discount = coupon.max_discount_cap;
    }
  } else {
    // Fixed amount discount
    discount = Math.min(subtotal, coupon.discount_value);
  }

  discount = Math.max(0, discount);
  const finalSubtotal = Math.max(0, subtotal - discount);

  return {
    discountAmount: discount,
    finalSubtotal,
  };
}

/**
 * Validates a coupon code against business rules
 */
export function validateCouponRules(
  coupon: Coupon,
  planId: string,
  subtotal: number,
  now: Date = new Date()
): { valid: boolean; error?: string } {
  if (!coupon.is_active) {
    return { valid: false, error: 'This coupon code has been deactivated.' };
  }

  const validFrom = new Date(coupon.valid_from);
  if (now < validFrom) {
    return { valid: false, error: 'This coupon code is not active yet.' };
  }

  if (coupon.valid_until) {
    const validUntil = new Date(coupon.valid_until);
    if (now > validUntil) {
      return { valid: false, error: 'This coupon code has expired.' };
    }
  }

  if (coupon.max_redemptions !== null && coupon.times_redeemed >= coupon.max_redemptions) {
    return { valid: false, error: 'This coupon code has reached its maximum redemption limit.' };
  }

  if (coupon.applicable_plans && coupon.applicable_plans.length > 0) {
    if (!coupon.applicable_plans.includes(planId)) {
      return { valid: false, error: `This coupon is only valid for: ${coupon.applicable_plans.join(', ').toUpperCase()}.` };
    }
  }

  if (subtotal < coupon.min_order_amount) {
    return {
      valid: false,
      error: `Minimum order amount of ₹${coupon.min_order_amount.toLocaleString('en-IN')} required to use this coupon.`,
    };
  }

  return { valid: true };
}

/**
 * Full database-backed coupon validator
 */
export async function validateCoupon(
  code: string,
  planId: string,
  subtotal: number
): Promise<CouponValidationResult> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) {
    return { valid: false, error: 'Please enter a coupon code.' };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .ilike('code', cleanCode)
    .maybeSingle();

  if (error || !coupon) {
    return { valid: false, error: `Coupon code "${cleanCode}" is invalid.` };
  }

  const ruleCheck = validateCouponRules(coupon, planId, subtotal);
  if (!ruleCheck.valid) {
    return { valid: false, error: ruleCheck.error };
  }

  const { discountAmount, finalSubtotal } = calculateCouponDiscount(subtotal, coupon);

  return {
    valid: true,
    coupon: {
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
      discountAmount,
      originalSubtotal: subtotal,
      finalSubtotal,
    },
  };
}

/**
 * Increment coupon times_redeemed on successful checkout
 */
export async function incrementCouponUsage(code: string): Promise<void> {
  if (!code) return;
  const cleanCode = code.trim().toUpperCase();
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  const { data: coupon } = await supabase
    .from('coupons')
    .select('id, times_redeemed')
    .ilike('code', cleanCode)
    .maybeSingle();

  if (coupon) {
    await supabase
      .from('coupons')
      .update({
        times_redeemed: (coupon.times_redeemed || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', coupon.id);
  }
}
