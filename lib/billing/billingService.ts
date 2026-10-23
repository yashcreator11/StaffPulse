import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:34321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

export type PlanTier = 'starter' | 'pro' | 'enterprise';
export type BillingCycle = 'monthly' | 'annual';

export interface PlanDetails {
  name: string;
  tier: PlanTier;
  monthlyPricePerSeat: number;
  annualPricePerSeat: number;
  seatLimit: number;
  features: string[];
}

export const PLAN_TIERS: Record<PlanTier, PlanDetails> = {
  starter: {
    name: 'Starter Plan',
    tier: 'starter',
    monthlyPricePerSeat: 3.0,
    annualPricePerSeat: 2.4, // 20% discount
    seatLimit: 25,
    features: [
      'Up to 25 Active Employees',
      'Basic Biometric Ingestion & CSV Import',
      'Standard Leave Types (SL, CL, PL, LWP)',
      'Single Office Location',
      'Community & Email Support',
    ],
  },
  pro: {
    name: 'Growth / Pro Plan',
    tier: 'pro',
    monthlyPricePerSeat: 2.5,
    annualPricePerSeat: 2.0,
    seatLimit: 100,
    features: [
      'Up to 100 Active Employees',
      'Flexible Leave Policy Engine & Approvals',
      'Multi-Office & Department Hierarchies',
      'Advanced Biometric Ingestion (ZKTeco, eSSL, Matrix)',
      'Overtime, Late Mark & WFH Tracking',
      'Priority Email & Slack Support',
    ],
  },
  enterprise: {
    name: 'Enterprise Scale',
    tier: 'enterprise',
    monthlyPricePerSeat: 2.0,
    annualPricePerSeat: 1.6,
    seatLimit: 1000,
    features: [
      'Unlimited / Custom Employee Seats',
      'Single Sign-On (Google Workspace, M365, SAML SSO)',
      'Immutable Audit Logs & DPDP Compliance Tools',
      'Dedicated Customer Success Manager',
      'Full API Access & Custom Webhooks',
      '99.9% Uptime SLA & Custom Data Residency',
    ],
  },
};

export interface SubscriptionInfo {
  id: string;
  orgId: string;
  planTier: PlanTier;
  billingCycle: BillingCycle;
  seatLimit: number;
  activeEmployeesCount: number;
  pricePerSeat: number;
  currency: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  paymentProvider: string;
  taxId?: string;
}

export async function getSubscriptionInfo(orgId: string): Promise<SubscriptionInfo> {
  const supabase = getAdminClient();

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle();

  // Count active employees in organization
  const { count: activeCount } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .neq('status', 'inactive');

  const activeEmployeesCount = activeCount || 0;

  if (!sub) {
    // Default fallback to starter trial
    return {
      id: 'sub_default',
      orgId,
      planTier: 'starter',
      billingCycle: 'monthly',
      seatLimit: 25,
      activeEmployeesCount,
      pricePerSeat: 3.0,
      currency: 'USD',
      status: 'trial',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      paymentProvider: 'manual',
    };
  }

  return {
    id: sub.id,
    orgId: sub.org_id,
    planTier: sub.plan_tier as PlanTier,
    billingCycle: sub.billing_cycle as BillingCycle,
    seatLimit: sub.seat_limit,
    activeEmployeesCount,
    pricePerSeat: Number(sub.price_per_seat),
    currency: sub.currency,
    status: sub.status,
    currentPeriodStart: sub.current_period_start,
    currentPeriodEnd: sub.current_period_end,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    paymentProvider: sub.payment_provider,
    taxId: sub.tax_id || undefined,
  };
}

export async function checkCanAddEmployees(
  orgId: string,
  additionalEmployeesCount = 1
): Promise<{ allowed: boolean; currentCount: number; limit: number; message?: string }> {
  const sub = await getSubscriptionInfo(orgId);
  const newTotal = sub.activeEmployeesCount + additionalEmployeesCount;

  if (newTotal > sub.seatLimit) {
    return {
      allowed: false,
      currentCount: sub.activeEmployeesCount,
      limit: sub.seatLimit,
      message: `Plan seat limit exceeded (${newTotal}/${sub.seatLimit}). Please upgrade your plan in Settings > Billing.`,
    };
  }

  return {
    allowed: true,
    currentCount: sub.activeEmployeesCount,
    limit: sub.seatLimit,
  };
}

export async function isFeatureAllowedForOrg(orgId: string, featureKey: string): Promise<boolean> {
  const sub = await getSubscriptionInfo(orgId);
  if (sub.planTier === 'enterprise') return true;

  if (sub.planTier === 'pro') {
    const proFeatures = ['flexible_policy', 'multi_office', 'advanced_biometric', 'wfh_tracking'];
    return proFeatures.includes(featureKey);
  }

  // starter tier features
  const starterFeatures = ['basic_biometric', 'standard_leave', 'single_office'];
  return starterFeatures.includes(featureKey);
}

export async function updateSubscriptionPlan(
  orgId: string,
  newPlan: PlanTier,
  cycle: BillingCycle = 'monthly',
  taxId?: string
): Promise<SubscriptionInfo> {
  const supabase = getAdminClient();
  const planConfig = PLAN_TIERS[newPlan];
  const price = cycle === 'annual' ? planConfig.annualPricePerSeat : planConfig.monthlyPricePerSeat;

  const { data: updated, error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        org_id: orgId,
        plan_tier: newPlan,
        billing_cycle: cycle,
        seat_limit: planConfig.seatLimit,
        price_per_seat: price,
        tax_id: taxId || null,
        status: 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id' }
    )
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to update subscription: ${error.message}`);
  }

  // Also sync seat_limit and plan on the organizations row
  const planCode = newPlan === 'enterprise' ? 'plan3' : newPlan === 'pro' ? 'plan2' : 'plan1';
  await supabase
    .from('organizations')
    .update({ plan: planCode, seat_limit: planConfig.seatLimit })
    .eq('id', orgId);

  return getSubscriptionInfo(orgId);
}

export async function getInvoicesForOrg(orgId: string) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}
