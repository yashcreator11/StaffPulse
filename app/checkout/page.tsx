'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Lock,
  Tag,
  X,
  Zap,
  Copy,
  Check,
  Globe,
} from 'lucide-react';
import Link from 'next/link';
import { computeQuote, SAAS_PLANS, PlanId, Cadence } from '@/lib/billing/razorpayService';
import { createClient } from '@/lib/supabase/client';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPlan = (searchParams.get('plan') as PlanId) || 'pro';
  const initialCycle = (searchParams.get('cycle') as Cadence) || 'annual';

  const [planId, setPlanId] = useState<PlanId>(initialPlan);
  const [cadence, setCadence] = useState<Cadence>(initialCycle);
  const [gstin, setGstin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [successData, setSuccessData] = useState<{
    invoiceNumber: string;
    planName: string;
    totalAmount: number;
    orgSlug?: string;
    orgName?: string;
  } | null>(null);

  const [currentOrg, setCurrentOrg] = useState<{
    id: string;
    name: string;
    status: string;
    slug?: string;
  } | null>(null);

  useEffect(() => {
    async function checkAuthAndOrg() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data: employee } = await supabase
        .from('employees')
        .select('org_id, organizations(id, name, status, slug)')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (employee?.organizations) {
        const org = employee.organizations as unknown as { id: string; name: string; status: string; slug?: string };
        setCurrentOrg(org);
      }
    }

    checkAuthAndOrg();
  }, []);

  const quote = computeQuote(planId, cadence, 50);
  const planInfo = SAAS_PLANS[planId];

  // Re-verify coupon if plan or cadence changes
  useEffect(() => {
    if (appliedCoupon) {
      handleValidateCoupon(appliedCoupon.code, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, cadence]);

  async function handleValidateCoupon(codeToValidate?: string, showFeedback = true) {
    const code = (codeToValidate || couponInput).trim().toUpperCase();
    if (!code) return;

    setCouponLoading(true);
    setCouponError(null);

    try {
      const res = await fetch('/api/billing/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          planId,
          subtotal: quote.billingCycleTotal,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (showFeedback) setCouponError(data.error || 'Invalid coupon code');
        setAppliedCoupon(null);
        return;
      }

      setAppliedCoupon({
        code: data.coupon.code,
        discountAmount: data.coupon.discountAmount,
        discountType: data.coupon.discountType,
        discountValue: data.coupon.discountValue,
      });
      setCouponError(null);
    } catch {
      if (showFeedback) setCouponError('Could not validate coupon. Please try again.');
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  }

  // Price calculations with discount
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const taxableSubtotal = Math.max(0, quote.billingCycleTotal - discountAmount);
  const gstAmount = Math.round(taxableSubtotal * 0.18);
  const grandTotal = taxableSubtotal + gstAmount;

  async function handlePayment(isMockSimulation: boolean = false) {
    setLoading(true);
    setError(null);

    try {
      // 1. Generate Order
      const orderRes = await fetch('/api/billing/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          cadence,
          staffCount: 50,
          couponCode: appliedCoupon?.code || undefined,
        }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.json();
        throw new Error(err.error || 'Failed to initialize payment order');
      }

      const { order } = await orderRes.json();

      // 2. Verify Payment (Simulation or Razorpay Modal)
      const paymentId = isMockSimulation || !order.isLive ? `pay_test_${Date.now()}` : '';

      const verifyRes = await fetch('/api/billing/razorpay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpayOrderId: order.orderId,
          razorpayPaymentId: paymentId || `pay_mock_${Date.now()}`,
          razorpaySignature: 'simulated_dev_signature',
          planId,
          cadence,
          staffCount: 50,
          couponCode: appliedCoupon?.code || undefined,
          gstin: gstin.trim() || undefined,
        }),
      });

      if (!verifyRes.ok) {
        const verifyErr = await verifyRes.json();
        throw new Error(verifyErr.error || 'Payment verification failed');
      }

      const result = await verifyRes.json();

      setSuccessData({
        invoiceNumber: result.invoice?.invoiceNumber || `INV-${new Date().getFullYear()}-001`,
        planName: planInfo.name,
        totalAmount: grandTotal,
        orgSlug: result.orgSlug || currentOrg?.slug,
        orgName: result.orgName || currentOrg?.name,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during checkout');
    } finally {
      setLoading(false);
    }
  }

  // If payment succeeded, show confirmation screen
  if (successData) {
    const portalSlug = successData.orgSlug || currentOrg?.slug || '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const portalUrl = portalSlug ? `${origin}/${portalSlug}` : '';

    const handleCopyPortalLink = () => {
      if (!portalUrl) return;
      navigator.clipboard.writeText(portalUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    };

    return (
      <div className="min-h-screen bg-[var(--bg-surface)] flex items-center justify-center p-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl space-y-6">
          <div className="w-16 h-16 bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
              Payment Verified &amp; Active
            </span>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Workspace Activated!</h2>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Your subscription to <strong className="text-[var(--text-primary)]">{successData.planName}</strong> is active. 
              An official GST invoice has been generated for your accounts department.
            </p>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 text-left text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Invoice Number</span>
              <span className="font-mono font-bold text-[var(--text-primary)]">{successData.invoiceNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Amount Paid</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                ₹{successData.totalAmount.toLocaleString('en-IN')} (incl. GST)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Active Enrolled Staff</span>
              <span className="font-semibold text-[var(--text-primary)]">Up to 50 Staff</span>
            </div>
          </div>

          {/* Dedicated Company URL Box */}
          {portalUrl && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 text-left space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="text-xs font-bold text-[var(--text-primary)]">Your Dedicated Staff Portal URL</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Share this dedicated link with your staff. They can bookmark it directly to punch in and submit leave requests without having to browse the main website.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={portalUrl}
                  className="flex-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-primary)] select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyPortalLink}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    copiedLink
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                  }`}
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              router.push(portalSlug ? `/${portalSlug}` : '/');
              router.refresh();
            }}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
          >
            <span>Launch Your Workspace Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-surface)] text-[var(--text-primary)] py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Top Back Navigation Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-sm group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
            <Lock className="w-3.5 h-3.5" /> Secure Checkout &amp; Activation
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Complete Subscription to Unlock Workspace
          </h1>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            {currentOrg?.name ? (
              <span>Activating workspace for <strong className="text-[var(--text-primary)]">{currentOrg.name}</strong>. </span>
            ) : null}
            Official B2B GST tax invoice generated instantly with full DPDP tenant isolation.
          </p>
        </div>

        {error && (
          <div className="max-w-xl mx-auto p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Plan Customization (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Cadence Switcher */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Billing Cadence</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">Choose your subscription frequency</p>
                </div>
                <div className="flex items-center gap-1 bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setCadence('annual')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      cadence === 'annual'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Annual (Save 20%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCadence('monthly')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      cadence === 'monthly'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Tier Selection */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Select Subscription Tier</h3>
              
              <div className="grid grid-cols-1 gap-3">
                {/* Starter */}
                <div
                  onClick={() => setPlanId('starter')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    planId === 'starter'
                      ? 'border-blue-500 bg-blue-500/5 shadow-md ring-2 ring-blue-500/20'
                      : 'border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--text-primary)]">Starter Plan</span>
                        {planId === 'starter' && <span className="text-blue-500 font-bold text-xs">✓ Selected</span>}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Universal Biometric CSV Parser &amp; Statutory Leave Ledgers
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-sm text-[var(--text-primary)]">
                        {cadence === 'annual' ? '₹1,199' : '₹1,499'}
                        <span className="text-[10px] text-[var(--text-muted)] font-normal">/mo</span>
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">50 staff included</div>
                    </div>
                  </div>
                </div>

                {/* Pro Growth */}
                <div
                  onClick={() => setPlanId('pro')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all relative ${
                    planId === 'pro'
                      ? 'border-orange-500 bg-orange-500/5 shadow-md ring-2 ring-orange-500/20'
                      : 'border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  <span className="absolute -top-2.5 right-4 text-[9px] font-black uppercase tracking-wider bg-orange-500 text-white px-2 py-0.5 rounded-full shadow">
                    Most Popular
                  </span>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--text-primary)]">Pro Growth Plan</span>
                        {planId === 'pro' && <span className="text-orange-500 font-bold text-xs">✓ Selected</span>}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Direct Biometric Hardware Push &amp; Sandwich Rule Automation
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-sm text-orange-600 dark:text-orange-400">
                        {cadence === 'annual' ? '₹2,399' : '₹2,999'}
                        <span className="text-[10px] text-[var(--text-muted)] font-normal">/mo</span>
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">50 staff included</div>
                    </div>
                  </div>
                </div>

                {/* Enterprise */}
                <div
                  onClick={() => setPlanId('enterprise')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    planId === 'enterprise'
                      ? 'border-purple-500 bg-purple-500/5 shadow-md ring-2 ring-purple-500/20'
                      : 'border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--text-primary)]">Enterprise Scale</span>
                        {planId === 'enterprise' && <span className="text-purple-500 font-bold text-xs">✓ Selected</span>}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Unlimited Branches, Google/M365 SSO &amp; Legal Audit Logs
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-sm text-purple-600 dark:text-purple-400">
                        {cadence === 'annual' ? '₹3,999' : '₹4,999'}
                        <span className="text-[10px] text-[var(--text-muted)] font-normal">/mo</span>
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">50 staff included</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. GSTIN Input */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-2">
              <label className="block text-xs font-bold text-[var(--text-primary)]">
                Company GSTIN (Optional for Tax Credit)
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="27AABCU9603R1ZM"
                className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-xs font-mono uppercase text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-[var(--text-muted)]">
                Enter your 15-character GST number to receive a formal GST tax invoice for 18% input credit.
              </p>
            </div>
          </div>

          {/* Right Column: Order Summary & Pay (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-3xl p-6 shadow-xl space-y-5 sticky top-8">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <h3 className="font-bold text-base text-[var(--text-primary)]">Order Summary</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500">
                  {cadence === 'annual' ? '12 Months' : '1 Month'}
                </span>
              </div>

              {/* Items */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-[var(--text-muted)]">
                  <span>{planInfo.name} ({cadence})</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    ₹{quote.billingCycleTotal.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Promo Code Discount Row */}
                {appliedCoupon && (
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" /> Promo ({appliedCoupon.code})
                    </span>
                    <span>-₹{appliedCoupon.discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[var(--text-muted)]">
                  <span>Included Staff Capacity</span>
                  <span className="font-semibold text-[var(--text-primary)]">50 Active Staff</span>
                </div>

                <div className="flex items-center justify-between text-[var(--text-muted)]">
                  <span>Goods &amp; Services Tax (18% GST)</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    ₹{gstAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
                  <span className="font-extrabold text-sm text-[var(--text-primary)]">Total Amount</span>
                  <div className="text-right">
                    <div className="font-extrabold text-xl text-blue-600 dark:text-blue-400">
                      ₹{grandTotal.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">All statutory taxes included</div>
                  </div>
                </div>
              </div>

              {/* Promo Code Input Box */}
              <div className="pt-2 border-t border-[var(--border)]">
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-500" /> Have a Promo Code?
                </label>

                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <div>
                        <span className="font-mono font-bold">{appliedCoupon.code}</span>
                        <span className="text-[11px] ml-1.5 opacity-80">
                          ({appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}% OFF` : `₹${appliedCoupon.discountValue} OFF`})
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="p-1 hover:bg-emerald-500/20 rounded-md transition-colors text-emerald-600 dark:text-emerald-400"
                      title="Remove coupon"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="e.g. LAUNCH50"
                        className="flex-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono uppercase text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        disabled={couponLoading || !couponInput.trim()}
                        onClick={() => handleValidateCoupon()}
                        className="px-4 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--border)] border border-[var(--border)] disabled:opacity-50 text-[var(--text-primary)] font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-[11px] text-destructive font-medium">{couponError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Features Pill */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-3 text-[11px] space-y-1.5 text-[var(--text-muted)]">
                <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Plan Inclusions:
                </div>
                {planInfo.features.slice(0, 4).map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px]">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handlePayment(true)}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying Transaction…
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Pay ₹{grandTotal.toLocaleString('en-IN')} &amp; Activate
                    </>
                  )}
                </button>

                <p className="text-[10px] text-center text-[var(--text-muted)]">
                  Instant activation via Razorpay UPI / Cards / Net Banking.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[var(--bg-surface)] text-sm">Loading checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
