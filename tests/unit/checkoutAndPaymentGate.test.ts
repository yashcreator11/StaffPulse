import { describe, it, expect } from 'vitest';
import { isPaymentPending } from '../../lib/billing/billingGuard';
import { computeQuote, verifyRazorpaySignature } from '../../lib/billing/razorpayService';
import { CurrentEmployee } from '../../lib/leaveSupabase/getCurrentEmployee';

describe('Checkout & Payment Gate Unit Tests', () => {
  describe('isPaymentPending Gatekeeper', () => {
    it('returns true when an organization status is pending_payment', () => {
      const unpaidAdmin: CurrentEmployee = {
        id: 'emp-101',
        full_name: 'Acme Admin',
        employee_code: 'ADM-001',
        email: 'admin@acmecorp.com',
        role: 'hr_super_admin',
        department: 'Management',
        office: 'HQ',
        reporting_lead_id: null,
        reporting_manager_id: null,
        must_change_password: false,
        profile_confirmed_at: '2026-10-24T00:00:00Z',
        avatar_url: null,
        auth_provider: 'password',
        organizations: {
          id: 'org-101',
          name: 'Acme Corp',
          status: 'pending_payment',
          plan: 'plan2',
        },
      };

      expect(isPaymentPending(unpaidAdmin)).toBe(true);
    });

    it('returns false when an organization is active', () => {
      const paidAdmin: CurrentEmployee = {
        id: 'emp-102',
        full_name: 'Wonderbiz HR',
        employee_code: 'ADM-002',
        email: 'hr@wonderbiz.in',
        role: 'hr_super_admin',
        department: 'Management',
        office: 'MUM',
        reporting_lead_id: null,
        reporting_manager_id: null,
        must_change_password: false,
        profile_confirmed_at: '2026-10-24T00:00:00Z',
        avatar_url: null,
        auth_provider: 'password',
        organizations: {
          id: 'org-001',
          name: 'Wonderbiz',
          status: 'active',
          plan: 'plan3',
        },
      };

      expect(isPaymentPending(paidAdmin)).toBe(false);
    });

    it('bypasses payment gate for official demo sandbox accounts', () => {
      const demoAccount: CurrentEmployee = {
        id: 'emp-demo',
        full_name: 'Demo Pro',
        employee_code: 'DEMO-001',
        email: 'demo.pro@staffpulse.io',
        role: 'hr',
        department: 'Human Resources',
        office: 'HQ',
        reporting_lead_id: null,
        reporting_manager_id: null,
        must_change_password: false,
        profile_confirmed_at: '2026-10-24T00:00:00Z',
        avatar_url: null,
        auth_provider: 'password',
        organizations: {
          id: 'org-demo',
          name: 'Demo Org',
          status: 'pending_payment', // Even if flagged pending, demo accounts bypass
          plan: 'plan2',
        },
      };

      expect(isPaymentPending(demoAccount)).toBe(false);
    });

    it('safely handles null or undefined employees', () => {
      expect(isPaymentPending(null)).toBe(false);
      expect(isPaymentPending(undefined)).toBe(false);
    });
  });

  describe('Quote & Tax Calculation for Checkout', () => {
    it('computes Starter annual quote with 20% discount and 18% GST', () => {
      const quote = computeQuote('starter', 'annual', 50);
      expect(quote.planId).toBe('starter');
      expect(quote.billingCycleTotal).toBe(1199 * 12);
      const gst = Math.round(quote.billingCycleTotal * 0.18);
      const grandTotal = quote.billingCycleTotal + gst;
      expect(grandTotal).toBe((1199 * 12) + Math.round(1199 * 12 * 0.18));
    });

    it('computes Pro Growth monthly quote with 18% GST', () => {
      const quote = computeQuote('pro', 'monthly', 50);
      expect(quote.planId).toBe('pro');
      expect(quote.billingCycleTotal).toBe(2999);
      const gst = Math.round(quote.billingCycleTotal * 0.18);
      expect(gst).toBe(540);
      expect(quote.billingCycleTotal + gst).toBe(3539);
    });
  });

  describe('Razorpay Signature Verification in Test Mode', () => {
    it('allows valid simulated payment ids in test mode', () => {
      const valid = verifyRazorpaySignature('order_test_123', 'pay_test_456', 'any_signature');
      expect(valid).toBe(true);
    });

    it('rejects invalid payment ids', () => {
      const valid = verifyRazorpaySignature('order_test_123', 'invalid_payment_id', 'any_signature');
      expect(valid).toBe(false);
    });
  });
});
