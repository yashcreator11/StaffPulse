import { describe, it, expect } from 'vitest';
import { computeQuote, verifyRazorpaySignature, SAAS_PLANS } from '../../lib/billing/razorpayService';

describe('Razorpay & SaaS Billing Engine', () => {
  it('correctly calculates monthly base rate for <= 50 employees on Starter tier', () => {
    const quote = computeQuote('starter', 'monthly', 35);
    expect(quote.enrolledStaff).toBe(35);
    expect(quote.baseStaffIncluded).toBe(50);
    expect(quote.extraStaff).toBe(0);
    expect(quote.baseRatePerMonth).toBe(1499);
    expect(quote.effectiveMonthlyTotal).toBe(1499);
    expect(quote.billingCycleTotal).toBe(1499);
  });

  it('correctly calculates extra employee overage for > 50 employees on Pro Growth tier', () => {
    // 70 staff on Pro: 50 base + 20 extra at ₹45/mo
    const quote = computeQuote('pro', 'monthly', 70);
    expect(quote.extraStaff).toBe(20);
    expect(quote.baseRatePerMonth).toBe(2999);
    expect(quote.extraRatePerMonth).toBe(45);
    expect(quote.extraStaffTotalPerMonth).toBe(900); // 20 * 45
    expect(quote.effectiveMonthlyTotal).toBe(3899); // 2999 + 900
    expect(quote.billingCycleTotal).toBe(3899);
  });

  it('correctly calculates 20% annual discount on Enterprise plan with overage', () => {
    // 100 staff on Enterprise annual: 50 base (₹3,999) + 50 extra (50 * ₹50 = ₹2,500)
    // Monthly total = ₹6,499
    // Annual total = ₹6,499 * 12 = ₹77,988
    const quote = computeQuote('enterprise', 'annual', 100);
    expect(quote.discountPct).toBe(20);
    expect(quote.baseRatePerMonth).toBe(3999);
    expect(quote.extraRatePerMonth).toBe(50);
    expect(quote.extraStaffTotalPerMonth).toBe(2500);
    expect(quote.effectiveMonthlyTotal).toBe(6499);
    expect(quote.billingCycleTotal).toBe(77988);
  });

  it('correctly verifies signature in test mode', () => {
    const verified = verifyRazorpaySignature('order_test_123', 'pay_test_456', 'mock_sig');
    expect(verified).toBe(true);
  });
});
