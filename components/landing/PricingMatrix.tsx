'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Sparkles, ArrowRight, ShieldCheck, HelpCircle, Calculator, CheckCircle2 } from 'lucide-react';
import PlanFinderWizard from './PlanFinderWizard';

interface PricingMatrixProps {
  onRequestDemo: (prefillData?: any) => void;
}

export default function PricingMatrix({ onRequestDemo }: PricingMatrixProps) {
  const [viewMode, setViewMode] = useState<'wizard' | 'cards'>('wizard');
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');

  const isAnnual = billingCycle === 'annual';
  const sym = currency === 'INR' ? '₹' : '$';

  // Base 50 rates in INR
  const starterBase = currency === 'INR' ? (isAnnual ? '1,199' : '1,499') : (isAnnual ? '15' : '19');
  const starterExtra = currency === 'INR' ? (isAnnual ? '20' : '25') : (isAnnual ? '0.25' : '0.35');

  const proBase = currency === 'INR' ? (isAnnual ? '2,399' : '2,999') : (isAnnual ? '30' : '39');
  const proExtra = currency === 'INR' ? (isAnnual ? '36' : '45') : (isAnnual ? '0.45' : '0.60');

  const enterpriseBase = currency === 'INR' ? (isAnnual ? '3,999' : '4,999') : (isAnnual ? '50' : '65');
  const enterpriseExtra = currency === 'INR' ? (isAnnual ? '50' : '65') : (isAnnual ? '0.65' : '0.90');

  return (
    <div className="space-y-10">
      {/* ── Mode Switcher: Assessment Wizard vs. All Plan Cards ────────── */}
      <div className="flex flex-col items-center justify-center text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Simple Base 50 + Transparent Overage Pricing</span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
          One Flat Price for Up to 50 Staff. Scale As You Grow.
        </h2>
        <p className="text-sm sm:text-base text-[var(--text-muted)]">
          Every plan covers your first 50 employees in a predictable base package. Scale past 50 with a nominal per-staff rate.
        </p>

        {/* View Mode Toggle: Interactive Wizard vs All Plans */}
        <div className="inline-flex items-center bg-[var(--bg-elevated)] border border-[var(--border)] p-1 rounded-2xl shadow-sm text-xs font-bold pt-1">
          <button
            onClick={() => setViewMode('wizard')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              viewMode === 'wizard'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>🎯 Diagnostic Plan Finder &amp; Custom Quote</span>
          </button>

          <button
            onClick={() => setViewMode('cards')}
            className={`px-4 py-2 rounded-xl transition-all ${
              viewMode === 'cards'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Compare All 3 Standard Plans
          </button>
        </div>
      </div>

      {/* ── MODE 1: INTERACTIVE PLAN FINDER WIZARD ──────────────────────── */}
      {viewMode === 'wizard' ? (
        <PlanFinderWizard
          onRequestDemo={onRequestDemo}
          onSelectPlan={(planKey) => {
            window.location.href = `/signup?plan=${planKey}`;
          }}
        />
      ) : (
        /* ── MODE 2: STANDARD 3-TIER COMPARISON CARDS ─────────────────── */
        <div className="space-y-8">
          {/* Billing Cycle & Currency Switcher */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {/* Annual vs Monthly */}
            <div className="inline-flex items-center bg-[var(--bg-card)] border border-[var(--border)] p-1 rounded-2xl shadow-sm">
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isAnnual
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>Annual Billing</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-extrabold">
                  SAVE 20%
                </span>
              </button>
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  !isAnnual
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Monthly Rolling
              </button>
            </div>

            {/* Currency Selector */}
            <div className="inline-flex items-center bg-[var(--bg-card)] border border-[var(--border)] p-1 rounded-2xl shadow-sm text-xs font-semibold">
              <button
                onClick={() => setCurrency('INR')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  currency === 'INR'
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                INR (₹)
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  currency === 'USD'
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                USD ($)
              </button>
            </div>
          </div>

          {/* 3-Tier Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch max-w-7xl mx-auto">
            {/* Tier 1: Starter */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-md hover:border-indigo-500/40 transition-all">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">Starter</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    For single-facility offices seeking clean biometric attendance and late-mark insights.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-[var(--text-primary)]">{sym}{starterBase}</span>
                    <span className="text-xs text-[var(--text-muted)]">/ month</span>
                  </div>
                  <div className="inline-block px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                    Includes up to 50 employees
                  </div>
                </div>

                <p className="text-[11px] text-[var(--text-muted)] border-t border-[var(--border)] pt-2 font-medium">
                  +{sym}{starterExtra} / month for each additional employee beyond 50
                </p>

                <div className="space-y-3 pt-2 border-t border-[var(--border)] text-xs text-[var(--text-secondary)]">
                  <div className="font-semibold text-[var(--text-primary)]">Core Capabilities:</div>
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Universal Biometric CSV Parser (Matrix, eSSL, ZKTeco)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Automated First-In &amp; Last-Out Calculation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Executive Attendance KPIs &amp; Monthly Heatmaps</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Late Arrivals &amp; Early Exits Anomaly Highlighting</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Single-Click CSV Attendance Summary Export</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-8 space-y-2">
                <Link
                  href="/signup?plan=starter"
                  className="w-full py-2.5 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] hover:bg-[var(--border)] text-[var(--text-primary)] font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <span>Select Starter</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/login?demo=starter"
                  className="w-full py-2 px-3 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Try Live Starter Sandbox</span>
                </Link>
              </div>
            </div>

            {/* Tier 2: Pro Growth (Featured) */}
            <div className="bg-[var(--bg-card)] border-2 border-[var(--accent)] rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden transform lg:-translate-y-2">
              <div className="absolute top-0 right-0 bg-gradient-to-l from-orange-600 to-amber-600 text-white text-[10px] font-black uppercase tracking-wider py-1.5 px-4 rounded-bl-2xl shadow-sm">
                Most Popular
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">Pro Growth</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400">
                      Full Compliance
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    For scaling companies automating statutory leaves (SL, PL, CL) and sandwich rules.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-[var(--text-primary)]">{sym}{proBase}</span>
                    <span className="text-xs text-[var(--text-muted)]">/ month</span>
                  </div>
                  <div className="inline-block px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-[11px]">
                    Includes up to 50 employees
                  </div>
                </div>

                <p className="text-[11px] text-[var(--text-muted)] border-t border-[var(--border)] pt-2 font-medium">
                  +{sym}{proExtra} / month for each additional employee beyond 50
                </p>

                <div className="space-y-3 pt-2 border-t border-[var(--border)] text-xs text-[var(--text-secondary)]">
                  <div className="font-semibold text-[var(--text-primary)]">Everything in Starter, plus:</div>
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                      <span><strong>Statutory Leave Portal</strong> (PL, CL, SL, WFH &amp; Live Balances)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                      <span><strong>Automated Sandwich Rule Engine</strong> (Weekend / Holiday deduction)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                      <span>Multi-Tier Lead &amp; Manager Approval Workflows</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                      <span>Biometric Regularization &amp; Missed Punch Requests</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                      <span>Team Capacity &amp; Shift Coverage Calendar</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                      <span>In-App Notification Hub &amp; Email Alerts</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-8 space-y-2">
                <Link
                  href="/signup?plan=pro"
                  className="w-full py-3 px-4 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <span>Select Pro Growth</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login?demo=pro"
                  className="w-full py-2 px-3 rounded-xl border border-dashed border-orange-500/40 bg-orange-500/5 hover:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-[11px] transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Try Live Pro Sandbox</span>
                </Link>
              </div>
            </div>

            {/* Tier 3: Enterprise Suite */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-md hover:border-indigo-500/40 transition-all">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">Enterprise Suite</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    For multi-location corporations, manufacturing plants &amp; BFSI institutions.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-[var(--text-primary)]">{sym}{enterpriseBase}</span>
                    <span className="text-xs text-[var(--text-muted)]">/ month</span>
                  </div>
                  <div className="inline-block px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[11px]">
                    Includes up to 50 employees
                  </div>
                </div>

                <p className="text-[11px] text-[var(--text-muted)] border-t border-[var(--border)] pt-2 font-medium">
                  +{sym}{enterpriseExtra} / month for each additional employee beyond 50
                </p>

                <div className="space-y-3 pt-2 border-t border-[var(--border)] text-xs text-[var(--text-secondary)]">
                  <div className="font-semibold text-[var(--text-primary)]">Everything in Pro, plus:</div>
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <span><strong>Payable Days Deduction Sheet</strong> (Tally, GreytHR, Keka)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <span><strong>DPDP Act 2023</strong> Right to Erasure &amp; Audit Logs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <span>Multi-Branch Federation (Mumbai, Bangalore, etc.)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <span>Custom Rotational &amp; Night Shift Overlap Rules</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <span>Dedicated Solutions Architect &amp; 99.9% Uptime SLA</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-8 space-y-2">
                <button
                  onClick={() => onRequestDemo()}
                  className="w-full py-2.5 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] hover:bg-[var(--border)] text-[var(--text-primary)] font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <span>Contact Enterprise Sales</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <Link
                  href="/login?demo=enterprise"
                  className="w-full py-2 px-3 rounded-xl border border-dashed border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[11px] transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Try Live Enterprise Sandbox</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trust & Guarantees Strip */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>All plans come with a 14-day no-risk trial. Cancel anytime with 1-click customer data export.</span>
        </div>
        <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Need custom hardware firmware?</span>
          <button onClick={() => onRequestDemo()} className="text-[var(--accent)] underline font-medium">
            Talk to engineering
          </button>
        </div>
      </div>
    </div>
  );
}
