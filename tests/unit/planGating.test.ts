import { describe, it, expect } from 'vitest';
import {
  normalizePlanTier,
  canAccessFeature,
  PLAN_FEATURE_INFO,
} from '../../lib/billing/planGating';

describe('Plan-Based Feature Gating Unit Tests', () => {
  describe('normalizePlanTier', () => {
    it('normalizes Starter plan variants', () => {
      expect(normalizePlanTier('plan1')).toBe('starter');
      expect(normalizePlanTier('starter')).toBe('starter');
      expect(normalizePlanTier('STARTER')).toBe('starter');
      expect(normalizePlanTier(null)).toBe('starter');
      expect(normalizePlanTier(undefined)).toBe('starter');
    });

    it('normalizes Pro Growth plan variants', () => {
      expect(normalizePlanTier('plan2')).toBe('pro');
      expect(normalizePlanTier('pro')).toBe('pro');
      expect(normalizePlanTier('PRO')).toBe('pro');
      expect(normalizePlanTier('pro_growth')).toBe('pro');
    });

    it('normalizes Enterprise plan variants', () => {
      expect(normalizePlanTier('plan3')).toBe('enterprise');
      expect(normalizePlanTier('enterprise')).toBe('enterprise');
      expect(normalizePlanTier('ENTERPRISE')).toBe('enterprise');
    });
  });

  describe('canAccessFeature entitlements', () => {
    it('allows Attendance dashboard across all tiers', () => {
      expect(canAccessFeature('starter', 'attendance')).toBe(true);
      expect(canAccessFeature('pro', 'attendance')).toBe(true);
      expect(canAccessFeature('enterprise', 'attendance')).toBe(true);
    });

    it('gates Statutory Leave Portal and Approvals to Pro and Enterprise only', () => {
      // Starter is strictly Attendance/Biometric CSV only
      expect(canAccessFeature('starter', 'leave_portal')).toBe(false);
      expect(canAccessFeature('starter', 'manager_approvals')).toBe(false);

      // Pro has Leave Portal and Approvals
      expect(canAccessFeature('pro', 'leave_portal')).toBe(true);
      expect(canAccessFeature('pro', 'manager_approvals')).toBe(true);

      // Enterprise has everything
      expect(canAccessFeature('enterprise', 'leave_portal')).toBe(true);
      expect(canAccessFeature('enterprise', 'manager_approvals')).toBe(true);
    });

    it('gates Payable Days and DPDP Compliance to Enterprise only', () => {
      // Denied for Starter
      expect(canAccessFeature('starter', 'payable_days')).toBe(false);
      expect(canAccessFeature('starter', 'compliance_dpdp')).toBe(false);
      expect(canAccessFeature('starter', 'multi_branch')).toBe(false);

      // Denied for Pro Growth
      expect(canAccessFeature('pro', 'payable_days')).toBe(false);
      expect(canAccessFeature('pro', 'compliance_dpdp')).toBe(false);
      expect(canAccessFeature('pro', 'multi_branch')).toBe(false);

      // Allowed for Enterprise
      expect(canAccessFeature('enterprise', 'payable_days')).toBe(true);
      expect(canAccessFeature('enterprise', 'compliance_dpdp')).toBe(true);
      expect(canAccessFeature('enterprise', 'multi_branch')).toBe(true);
    });
  });

  describe('PLAN_FEATURE_INFO metadata', () => {
    it('provides correct upgrade URLs and labels for gated capabilities', () => {
      expect(PLAN_FEATURE_INFO.leave_portal.tierLabel).toBe('Pro Growth');
      expect(PLAN_FEATURE_INFO.leave_portal.upgradeUrl).toBe('/checkout?plan=pro');

      expect(PLAN_FEATURE_INFO.payable_days.tierLabel).toBe('Enterprise Suite');
      expect(PLAN_FEATURE_INFO.payable_days.upgradeUrl).toBe('/checkout?plan=enterprise');

      expect(PLAN_FEATURE_INFO.compliance_dpdp.tierLabel).toBe('Enterprise Suite');
      expect(PLAN_FEATURE_INFO.compliance_dpdp.upgradeUrl).toBe('/checkout?plan=enterprise');
    });
  });
});
