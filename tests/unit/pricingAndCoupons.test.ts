import { describe, it, expect } from 'vitest';
import {
  calculateCouponDiscount,
  validateCouponRules,
  Coupon,
} from '../../lib/billing/couponService';

describe('Pricing & Coupons Engine Unit Tests', () => {
  const baseMockCoupon: Coupon = {
    id: 'coupon-1',
    code: 'TEST50',
    description: '50% off test promo',
    discount_type: 'percentage',
    discount_value: 50,
    min_order_amount: 1000,
    max_discount_cap: 3000,
    applicable_plans: [],
    max_redemptions: 100,
    times_redeemed: 5,
    valid_from: '2025-01-01T00:00:00Z',
    valid_until: '2028-12-31T23:59:59Z',
    is_active: true,
  };

  describe('calculateCouponDiscount', () => {
    it('calculates percentage discount accurately without exceeding cap', () => {
      const res = calculateCouponDiscount(4000, baseMockCoupon);
      // 50% of 4000 = 2000 (which is <= max cap 3000)
      expect(res.discountAmount).toBe(2000);
      expect(res.finalSubtotal).toBe(2000);
    });

    it('clamps percentage discount to max_discount_cap when exceeded', () => {
      const res = calculateCouponDiscount(10000, baseMockCoupon);
      // 50% of 10000 = 5000, but cap is 3000
      expect(res.discountAmount).toBe(3000);
      expect(res.finalSubtotal).toBe(7000);
    });

    it('calculates fixed discount accurately', () => {
      const fixedCoupon: Coupon = {
        ...baseMockCoupon,
        code: 'FLAT500',
        discount_type: 'fixed',
        discount_value: 500,
        max_discount_cap: null,
      };
      const res = calculateCouponDiscount(3000, fixedCoupon);
      expect(res.discountAmount).toBe(500);
      expect(res.finalSubtotal).toBe(2500);
    });

    it('does not allow fixed discount to exceed subtotal', () => {
      const largeFixedCoupon: Coupon = {
        ...baseMockCoupon,
        code: 'MEGA5000',
        discount_type: 'fixed',
        discount_value: 5000,
        min_order_amount: 1000,
        max_discount_cap: null,
      };
      const res = calculateCouponDiscount(2000, largeFixedCoupon);
      expect(res.discountAmount).toBe(2000);
      expect(res.finalSubtotal).toBe(0);
    });

    it('returns 0 discount if subtotal is below minimum order amount', () => {
      const res = calculateCouponDiscount(800, baseMockCoupon);
      expect(res.discountAmount).toBe(0);
      expect(res.finalSubtotal).toBe(800);
    });
  });

  describe('validateCouponRules', () => {
    const fixedNow = new Date('2026-06-01T12:00:00Z');

    it('passes validation for active, unexpired coupon with valid subtotal', () => {
      const result = validateCouponRules(baseMockCoupon, 'starter', 5000, fixedNow);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects coupon if is_active is false', () => {
      const inactive = { ...baseMockCoupon, is_active: false };
      const result = validateCouponRules(inactive, 'starter', 5000, fixedNow);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('deactivated');
    });

    it('rejects coupon if expired', () => {
      const expired = { ...baseMockCoupon, valid_until: '2025-01-01T00:00:00Z' };
      const result = validateCouponRules(expired, 'starter', 5000, fixedNow);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('rejects coupon if not active yet', () => {
      const future = { ...baseMockCoupon, valid_from: '2027-01-01T00:00:00Z' };
      const result = validateCouponRules(future, 'starter', 5000, fixedNow);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not active yet');
    });

    it('rejects coupon if max redemptions limit is reached', () => {
      const maxedOut = { ...baseMockCoupon, max_redemptions: 50, times_redeemed: 50 };
      const result = validateCouponRules(maxedOut, 'starter', 5000, fixedNow);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('maximum redemption limit');
    });

    it('rejects coupon if subtotal is below minimum order amount', () => {
      const result = validateCouponRules(baseMockCoupon, 'starter', 500, fixedNow);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Minimum order amount');
    });

    it('enforces plan restrictions if specified', () => {
      const planRestricted = { ...baseMockCoupon, applicable_plans: ['pro', 'enterprise'] };
      const failResult = validateCouponRules(planRestricted, 'starter', 5000, fixedNow);
      expect(failResult.valid).toBe(false);
      expect(failResult.error).toContain('only valid for');

      const passResult = validateCouponRules(planRestricted, 'pro', 5000, fixedNow);
      expect(passResult.valid).toBe(true);
    });
  });

  describe('SaaS Pricing Calculations & GST Recalculation', () => {
    it('calculates 18% GST correctly on discounted taxable subtotal', () => {
      const originalSubtotal = 10000;
      const { discountAmount, finalSubtotal } = calculateCouponDiscount(originalSubtotal, baseMockCoupon);
      // With baseMockCoupon cap 3000, discount is 3000, finalSubtotal is 7000
      expect(discountAmount).toBe(3000);
      expect(finalSubtotal).toBe(7000);

      const gst = Math.round(finalSubtotal * 0.18);
      const grandTotal = finalSubtotal + gst;

      expect(gst).toBe(1260); // 18% of 7000
      expect(grandTotal).toBe(8260);
    });
  });
});
