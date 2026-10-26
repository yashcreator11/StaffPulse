'use client';

import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Download,
  ShieldCheck,
  Zap,
  Users,
  Calendar,
  Building,
  ArrowRight,
  Receipt,
  FileText,
  Clock,
} from 'lucide-react';
import LeavePageHeader from '@/components/leave/LeavePageHeader';

interface SubscriptionData {
  id: string;
  orgId: string;
  planTier: 'starter' | 'pro' | 'enterprise';
  billingCycle: 'monthly' | 'annual';
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

interface InvoiceItem {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  billing_period_start: string;
  billing_period_end: string;
  paid_at: string | null;
  receipt_number: string | null;
  created_at: string;
}

export default function BillingManagementPage() {
  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [taxId, setTaxId] = useState('');
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadBillingData();
  }, []);

  async function loadBillingData() {
    setLoading(true);
    try {
      const [subRes, invRes] = await Promise.all([
        fetch('/api/billing/subscription'),
        fetch('/api/billing/invoices'),
      ]);

      if (subRes.ok) {
        const subData = await subRes.json();
        setSub(subData.subscription);
        setBillingCycle(subData.subscription.billingCycle || 'monthly');
        if (subData.subscription.taxId) setTaxId(subData.subscription.taxId);
      }
      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData.invoices || []);
      }
    } catch (err: unknown) {
      console.error(err);
      setMessage({ kind: 'error', text: 'Failed to load billing details.' });
    } finally {
      setLoading(false);
    }
  }

  async function handlePlanChange(targetTier: 'starter' | 'pro' | 'enterprise') {
    setUpdating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/billing/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planTier: targetTier,
          billingCycle,
          taxId: taxId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Plan change failed');

      setSub(data.subscription);
      setMessage({
        kind: 'success',
        text: `Successfully updated subscription to ${targetTier.toUpperCase()} plan!`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      setMessage({ kind: 'error', text: msg });
    } finally {
      setUpdating(false);
    }
  }

  const seatsUsed = sub?.activeEmployeesCount || 0;
  const seatLimit = sub?.seatLimit || 25;
  const usagePercent = Math.min(100, Math.round((seatsUsed / seatLimit) * 100));
  const isNearLimit = usagePercent >= 85;

  return (
    <div className="space-y-6 sm:space-y-8">
      <LeavePageHeader
        title="Billing & Subscription Plans"
        description="Monitor active seat capacity, upgrade your SaaS tier, and manage invoices and tax receipts."
        backHref="/leave/admin"
        backLabel="Back to Leave Balances"
      />

      {message && (
        <div
          className={`flex items-center gap-3 rounded-xl p-4 text-sm font-medium border ${
            message.kind === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
          }`}
        >
          {message.kind === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          {/* Active Subscription Hero Card */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    <Zap className="h-3.5 w-3.5" />
                    {sub?.planTier} Tier
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      sub?.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {sub?.status}
                  </span>
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Active Subscription Overview
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Renews on{' '}
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '—'}
                  </span>{' '}
                  via{' '}
                  <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                    {sub?.paymentProvider}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    ${sub?.pricePerSeat.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-500">per seat / {sub?.billingCycle}</div>
                </div>
              </div>
            </div>

            {/* Seat Capacity Usage Meter */}
            <div className="pt-6">
              <div className="flex justify-between items-center text-sm font-medium mb-2">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  Active Employee Seats: <strong className="text-slate-900 dark:text-white">{seatsUsed}</strong> of{' '}
                  <strong className="text-slate-900 dark:text-white">{seatLimit}</strong> allocated
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    isNearLimit
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {usagePercent}% utilized
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    isNearLimit ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              {isNearLimit && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  You are approaching your plan seat limit. Additional employee additions will be paused once limit is reached.
                </p>
              )}
            </div>
          </div>

          {/* Plan Selector & Billing Cycle Toggle */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Available Plans</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Select the tier tailored to your team scale and compliance requirements.
                </p>
              </div>

              {/* Billing Cycle Toggle */}
              <div className="inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                    billingCycle === 'monthly'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition flex items-center gap-1.5 ${
                    billingCycle === 'annual'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <span>Annual</span>
                  <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    20% OFF
                  </span>
                </button>
              </div>
            </div>

            {/* Pricing Tiers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Starter Tier */}
              <div
                className={`relative rounded-2xl border p-6 flex flex-col justify-between transition ${
                  sub?.planTier === 'starter'
                    ? 'border-blue-500 bg-blue-500/[0.02] ring-2 ring-blue-500/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">Starter</h4>
                  <p className="mt-1 text-xs text-slate-500">For early-stage startups up to 25 staff.</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                      ${billingCycle === 'annual' ? '2.40' : '3.00'}
                    </span>
                    <span className="text-xs text-slate-500">/ seat / mo</span>
                  </div>

                  <ul className="mt-6 space-y-3 text-xs text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      Up to 25 active employees
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      Standard Leave Policies (SL, CL, PL)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      Single Office Biometric Ingestion
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      CSV Bulk Employee Upload
                    </li>
                  </ul>
                </div>

                <div className="mt-8">
                  {sub?.planTier === 'starter' ? (
                    <button
                      disabled
                      className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 py-2.5 text-xs font-semibold text-slate-400 cursor-not-allowed text-center"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handlePlanChange('starter')}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                      Downgrade to Starter
                    </button>
                  )}
                </div>
              </div>

              {/* Pro Tier (Popular) */}
              <div
                className={`relative rounded-2xl border p-6 flex flex-col justify-between transition ${
                  sub?.planTier === 'pro'
                    ? 'border-blue-500 bg-blue-500/[0.02] ring-2 ring-blue-500/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="absolute -top-3 right-6">
                  <span className="rounded-full bg-blue-600 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">
                    Most Popular
                  </span>
                </div>

                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">Pro Growth</h4>
                  <p className="mt-1 text-xs text-slate-500">For mid-size companies scaling departments.</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                      ${billingCycle === 'annual' ? '2.00' : '2.50'}
                    </span>
                    <span className="text-xs text-slate-500">/ seat / mo</span>
                  </div>

                  <ul className="mt-6 space-y-3 text-xs text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      Up to 100 active employees
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      Flexible Leave Policy Engine & Rules
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      Multi-Office & Shift Timings
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      Overtime & Late Mark Reconciliation
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      Priority Support Response
                    </li>
                  </ul>
                </div>

                <div className="mt-8">
                  {sub?.planTier === 'pro' ? (
                    <button
                      disabled
                      className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 py-2.5 text-xs font-semibold text-slate-400 cursor-not-allowed text-center"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handlePlanChange('pro')}
                      className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-2.5 text-xs font-semibold shadow-sm transition"
                    >
                      {sub?.planTier === 'enterprise' ? 'Switch to Pro' : 'Upgrade to Pro'}
                    </button>
                  )}
                </div>
              </div>

              {/* Enterprise Tier */}
              <div
                className={`relative rounded-2xl border p-6 flex flex-col justify-between transition ${
                  sub?.planTier === 'enterprise'
                    ? 'border-blue-500 bg-blue-500/[0.02] ring-2 ring-blue-500/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">Enterprise</h4>
                  <p className="mt-1 text-xs text-slate-500">For large organizations with strict compliance.</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                      ${billingCycle === 'annual' ? '1.60' : '2.00'}
                    </span>
                    <span className="text-xs text-slate-500">/ seat / mo</span>
                  </div>

                  <ul className="mt-6 space-y-3 text-xs text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      500+ Active Employee Seats
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      SSO: Google Workspace, M365 & SAML
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      Immutable Audit Logs & DPDP Tools
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      Dedicated Customer Success Manager
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      99.9% Uptime SLA Guarantee
                    </li>
                  </ul>
                </div>

                <div className="mt-8">
                  {sub?.planTier === 'enterprise' ? (
                    <button
                      disabled
                      className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 py-2.5 text-xs font-semibold text-slate-400 cursor-not-allowed text-center"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handlePlanChange('enterprise')}
                      className="w-full rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 py-2.5 text-xs font-semibold shadow-sm transition"
                    >
                      Upgrade to Enterprise
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tax Information & Billing Address */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Tax ID & GST Invoicing</h3>
            <p className="mt-1 text-xs text-slate-500">
              Provide your GSTIN, VAT, or Corporate Tax ID for automatic tax invoice generation.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-3 max-w-md">
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="e.g. 27AAAAA0000A1Z5"
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                disabled={updating}
                onClick={() => handlePlanChange(sub?.planTier || 'starter')}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-semibold transition"
              >
                Save Tax ID
              </button>
            </div>
          </div>

          {/* Invoice History Table */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Billing History & Invoices</h3>
                <p className="text-xs text-slate-500">Download past tax invoices and payment receipts.</p>
              </div>
              <Receipt className="h-5 w-5 text-slate-400" />
            </div>

            {invoices.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                No invoices have been billed for this organization yet.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Billing Period</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Receipt</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                          {inv.invoice_number}
                        </td>
                        <td className="py-3.5 px-4">
                          {new Date(inv.billing_period_start).toLocaleDateString()} –{' '}
                          {new Date(inv.billing_period_end).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 font-semibold">
                          ${Number(inv.amount).toFixed(2)} {inv.currency}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              inv.status === 'paid'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">{inv.receipt_number || '—'}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              alert(`Downloading invoice ${inv.invoice_number} (${inv.status.toUpperCase()})`)
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <Download className="h-3.5 w-3.5" />
                            PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
