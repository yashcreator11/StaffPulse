/**
 * StaffPulse Plan-Based Feature Gating
 * Determines feature accessibility based on tenant subscription tier.
 * 
 * Tiers:
 *  - 'starter'    (plan1) : Attendance & Biometrics Dashboard, Anomaly Highlighting, CSV Export.
 *  - 'pro'        (plan2) : All Starter + Statutory Leave Portal (PL, CL, SL), Sandwich Rules, Approvals.
 *  - 'enterprise' (plan3) : All Pro + Payable Days Payroll Sheets, DPDP Compliance, Multi-Branch Federation.
 */

export type NormalizedPlan = 'starter' | 'pro' | 'enterprise';

export function normalizePlanTier(rawPlan?: string | null): NormalizedPlan {
  if (!rawPlan) return 'starter';
  const p = rawPlan.toLowerCase().trim();
  if (p === 'plan3' || p === 'enterprise') return 'enterprise';
  if (p === 'plan2' || p === 'pro' || p === 'pro_growth') return 'pro';
  return 'starter';
}

export type GatedFeature =
  | 'attendance'
  | 'leave_portal'
  | 'manager_approvals'
  | 'payable_days'
  | 'compliance_dpdp'
  | 'multi_branch';

export function canAccessFeature(
  plan: NormalizedPlan,
  feature: GatedFeature
): boolean {
  switch (feature) {
    case 'attendance':
      return true; // All tiers get attendance dashboard
    case 'leave_portal':
    case 'manager_approvals':
      return plan === 'pro' || plan === 'enterprise';
    case 'payable_days':
    case 'compliance_dpdp':
    case 'multi_branch':
      return plan === 'enterprise';
    default:
      return true;
  }
}

export const PLAN_FEATURE_INFO: Record<
  GatedFeature,
  {
    title: string;
    description: string;
    requiredTier: 'pro' | 'enterprise';
    tierLabel: string;
    upgradeUrl: string;
  }
> = {
  attendance: {
    title: 'Attendance Dashboard',
    description: 'Biometric logs and attendance calculation.',
    requiredTier: 'pro',
    tierLabel: 'Starter',
    upgradeUrl: '/checkout?plan=starter',
  },
  leave_portal: {
    title: 'Statutory Leave Management',
    description: 'Track PL, CL, SL balances, apply for leaves, and automate sandwich rule deductions.',
    requiredTier: 'pro',
    tierLabel: 'Pro Growth',
    upgradeUrl: '/checkout?plan=pro',
  },
  manager_approvals: {
    title: 'Multi-Tier Approvals & Team Shifts',
    description: 'Lead & Manager leave approval queues, missed punches, and shift coverage calendar.',
    requiredTier: 'pro',
    tierLabel: 'Pro Growth',
    upgradeUrl: '/checkout?plan=pro',
  },
  payable_days: {
    title: 'Payable Days Payroll Deduction Sheets',
    description: 'Automated 1-click salary deduction and payable days calculation export for GreytHR, Tally, and Keka.',
    requiredTier: 'enterprise',
    tierLabel: 'Enterprise Suite',
    upgradeUrl: '/checkout?plan=enterprise',
  },
  compliance_dpdp: {
    title: 'DPDP Act 2023 Compliance & Data Erasure',
    description: 'Statutory data retention schedules, immutable audit trail, and Right to Erasure worker request tracking.',
    requiredTier: 'enterprise',
    tierLabel: 'Enterprise Suite',
    upgradeUrl: '/checkout?plan=enterprise',
  },
  multi_branch: {
    title: 'Multi-Branch Location Federation',
    description: 'Federated management of regional headquarters, manufacturing units, and branch locations.',
    requiredTier: 'enterprise',
    tierLabel: 'Enterprise Suite',
    upgradeUrl: '/checkout?plan=enterprise',
  },
};
