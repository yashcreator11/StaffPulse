import { describe, it, expect, vi } from 'vitest';
import {
  PLAN_TIERS,
  checkCanAddEmployees,
  isFeatureAllowedForOrg,
} from '../../lib/billing/billingService';

// Mock Supabase admin client
vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: () => ({
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: 'sub_test_1',
                org_id: 'org_test_123',
                plan_tier: 'starter',
                billing_cycle: 'monthly',
                seat_limit: 25,
                price_per_seat: 3.0,
                currency: 'USD',
                status: 'active',
                current_period_start: new Date().toISOString(),
                current_period_end: new Date().toISOString(),
                cancel_at_period_end: false,
                payment_provider: 'manual',
              },
            }),
            neq: async () => ({
              count: 24, // 24 active employees out of 25 limit
            }),
          }),
        }),
      }),
    }),
  };
});

describe('Section H: Billing & Subscription Tiers', () => {
  it('defines correct tier limits and pricing models', () => {
    expect(PLAN_TIERS.starter.seatLimit).toBe(25);
    expect(PLAN_TIERS.pro.seatLimit).toBe(100);
    expect(PLAN_TIERS.enterprise.seatLimit).toBe(1000);

    // Annual discount check (should be 20% cheaper)
    expect(PLAN_TIERS.starter.annualPricePerSeat).toBeLessThan(PLAN_TIERS.starter.monthlyPricePerSeat);
    expect(PLAN_TIERS.pro.annualPricePerSeat).toBeLessThan(PLAN_TIERS.pro.monthlyPricePerSeat);
    expect(PLAN_TIERS.enterprise.annualPricePerSeat).toBeLessThan(PLAN_TIERS.enterprise.monthlyPricePerSeat);
  });

  it('allows adding 1 employee when under seat limit (24 + 1 <= 25)', async () => {
    const result = await checkCanAddEmployees('org_test_123', 1);
    expect(result.allowed).toBe(true);
    expect(result.currentCount).toBe(24);
    expect(result.limit).toBe(25);
  });

  it('rejects adding employees when exceeding plan capacity (24 + 2 > 25)', async () => {
    const result = await checkCanAddEmployees('org_test_123', 2);
    expect(result.allowed).toBe(false);
    expect(result.message).toContain('seat limit exceeded');
  });

  it('enforces feature gating based on plan tier', async () => {
    // Starter tier features
    const hasBasic = await isFeatureAllowedForOrg('org_test_123', 'basic_biometric');
    expect(hasBasic).toBe(true);

    // Pro/Enterprise features should be blocked on starter tier
    const hasSso = await isFeatureAllowedForOrg('org_test_123', 'sso_saml');
    expect(hasSso).toBe(false);

    const hasFlexiblePolicy = await isFeatureAllowedForOrg('org_test_123', 'flexible_policy');
    expect(hasFlexiblePolicy).toBe(false);
  });
});
