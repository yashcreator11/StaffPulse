import crypto from 'crypto';

export type PlanId = 'starter' | 'pro' | 'enterprise';
export type Cadence = 'monthly' | 'quarterly' | 'annual';

export interface PlanPricingFormula {
  name: string;
  baseEmployees: number;
  monthlyBasePrice: number;
  monthlyExtraPerEmp: number;
  annualBasePrice: number;
  annualExtraPerEmp: number;
  features: string[];
}

export const SAAS_PLANS: Record<PlanId, PlanPricingFormula> = {
  starter: {
    name: 'Starter Plan',
    baseEmployees: 50,
    monthlyBasePrice: 1499,
    monthlyExtraPerEmp: 25,
    annualBasePrice: 1199,
    annualExtraPerEmp: 20,
    features: [
      'Up to 50 Enrolled Employees included',
      'Universal Biometric CSV Parser (ZKTeco, eSSL, Matrix)',
      'Statutory Leave Ledgers (SL, PL, CL, LWP)',
      'Automated In/Out Punch Calculation',
      'Payable Days Deduction Sheet (Tally & Excel)',
      'Single Office Branch',
    ],
  },
  pro: {
    name: 'Pro Growth Plan',
    baseEmployees: 50,
    monthlyBasePrice: 2999,
    monthlyExtraPerEmp: 45,
    annualBasePrice: 2399,
    annualExtraPerEmp: 36,
    features: [
      'Up to 50 Enrolled Employees included',
      'Automated Sandwich Rule Compliance Engine',
      'Direct Biometric Hardware Push Webhook API',
      'Multi-Office & Multi-Department Hierarchies',
      'Manager Multi-Tier Leave Approval Workflows',
      'Late Mark & Early Departure Deduction Rules',
      'Dedicated Email & Slack Priority Support',
    ],
  },
  enterprise: {
    name: 'Enterprise Scale',
    baseEmployees: 50,
    monthlyBasePrice: 4999,
    monthlyExtraPerEmp: 65,
    annualBasePrice: 3999,
    annualExtraPerEmp: 50,
    features: [
      'Up to 50 Enrolled Employees included',
      'Unlimited Office Branches & Shift Rosters',
      'Single Sign-On (Google Workspace, M365, SAML)',
      '1-Click Complete Org Backup & DPDP Purge Tools',
      'Append-Only Audit Ledger & Legal Compliance Pack',
      'Custom API Webhooks & ERP Connectors (SAP / GreytHR)',
      '99.9% Uptime SLA & Dedicated Success Manager',
    ],
  },
};

export interface QuoteBreakdown {
  planId: PlanId;
  planName: string;
  cadence: Cadence;
  enrolledStaff: number;
  baseStaffIncluded: number;
  extraStaff: number;
  baseRatePerMonth: number;
  extraRatePerMonth: number;
  extraStaffTotalPerMonth: number;
  effectiveMonthlyTotal: number;
  billingCycleTotal: number;
  discountPct: number;
  currency: string;
}

export function computeQuote(planId: PlanId, cadence: Cadence, totalStaff: number): QuoteBreakdown {
  const plan = SAAS_PLANS[planId] || SAAS_PLANS.starter;
  const staff = Math.max(1, totalStaff);
  const extraCount = Math.max(0, staff - plan.baseEmployees);

  let baseRate = plan.monthlyBasePrice;
  let extraRate = plan.monthlyExtraPerEmp;
  let discountPct = 0;

  if (cadence === 'annual') {
    baseRate = plan.annualBasePrice;
    extraRate = plan.annualExtraPerEmp;
    discountPct = 20;
  } else if (cadence === 'quarterly') {
    // 10% discount on monthly rate
    baseRate = Math.round(plan.monthlyBasePrice * 0.9);
    extraRate = Math.round(plan.monthlyExtraPerEmp * 0.9);
    discountPct = 10;
  }

  const extraTotal = extraCount * extraRate;
  const effectiveMonthly = baseRate + extraTotal;

  let multiplier = 1;
  if (cadence === 'quarterly') multiplier = 3;
  if (cadence === 'annual') multiplier = 12;

  const cycleTotal = effectiveMonthly * multiplier;

  return {
    planId,
    planName: plan.name,
    cadence,
    enrolledStaff: staff,
    baseStaffIncluded: plan.baseEmployees,
    extraStaff: extraCount,
    baseRatePerMonth: baseRate,
    extraRatePerMonth: extraRate,
    extraStaffTotalPerMonth: extraTotal,
    effectiveMonthlyTotal: effectiveMonthly,
    billingCycleTotal: cycleTotal,
    discountPct,
    currency: 'INR',
  };
}

/**
 * Creates a Razorpay order or returns a test mode order if keys are not configured.
 */
export async function createRazorpayOrder(params: {
  orgId: string;
  quote: QuoteBreakdown;
  customerEmail: string;
  notes?: Record<string, string>;
}) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  // Amount in paise (1 INR = 100 paise)
  const amountPaise = Math.round(params.quote.billingCycleTotal * 100);
  const receipt = `rcpt_${params.orgId.slice(0, 8)}_${Date.now()}`;

  if (!keyId || !keySecret || keyId.startsWith('mock_')) {
    // Deterministic mock test order
    return {
      orderId: `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      amount: amountPaise,
      currency: 'INR',
      receipt,
      keyId: keyId || 'rzp_test_placeholder',
      isLive: false,
    };
  }

  const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes: {
        orgId: params.orgId,
        planId: params.quote.planId,
        cadence: params.quote.cadence,
        staffCount: String(params.quote.enrolledStaff),
        ...(params.notes || {}),
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Razorpay order creation failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return {
    orderId: data.id as string,
    amount: data.amount as number,
    currency: data.currency as string,
    receipt: data.receipt as string,
    keyId,
    isLive: true,
  };
}

/**
 * Validates HMAC SHA-256 signature returned by Razorpay checkout
 */
export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret || keySecret.startsWith('mock_')) {
    // In test/demo environment, allow test payments
    return paymentId.startsWith('pay_');
  }

  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', keySecret).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
