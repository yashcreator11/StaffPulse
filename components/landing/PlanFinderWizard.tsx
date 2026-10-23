'use client';

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Building2,
  Users,
  Calendar,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  ChevronRight,
  TrendingDown,
  Calculator,
  RotateCcw,
} from 'lucide-react';

interface PlanFinderWizardProps {
  onRequestDemo: (prefillData?: any) => void;
  onSelectPlan: (planKey: string) => void;
}

export default function PlanFinderWizard({ onRequestDemo, onSelectPlan }: PlanFinderWizardProps) {
  // Wizard state
  const [step, setStep] = useState<number>(1);
  const [teamSize, setTeamSize] = useState<number>(65);
  const [officeType, setOfficeType] = useState<'single' | 'multi'>('single');
  const [leaveManagement, setLeaveManagement] = useState<'excel' | 'disputes' | 'none'>('excel');
  const [sandwichRule, setSandwichRule] = useState<'manual' | 'ignored' | 'none'>('manual');
  const [payrollTime, setPayrollTime] = useState<'days' | 'tally_sync' | 'fast'>('days');
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');

  const sym = currency === 'INR' ? '₹' : '$';

  // Recommendation Engine
  const recommendation = useMemo(() => {
    let recommendedTier: 'starter' | 'pro' | 'enterprise' = 'starter';
    let rationale = '';
    const painPoints: Array<{ problem: string; solution: string }> = [];

    // Analyze Leave Management
    if (leaveManagement === 'excel' || leaveManagement === 'disputes') {
      recommendedTier = 'pro';
      painPoints.push({
        problem: 'Managing SL, PL, CL balances via Excel spreadsheets & WhatsApp threads',
        solution:
          'StaffPulse gives every employee a self-service portal to see live leave quotas, auto-checks probation unlock rules, and routes approvals to managers.',
      });
    }

    // Analyze Sandwich Rules
    if (sandwichRule === 'manual' || sandwichRule === 'ignored') {
      recommendedTier = 'pro';
      painPoints.push({
        problem:
          sandwichRule === 'manual'
            ? 'HR spending hours cross-referencing biometric logs with weekend/holiday calendars'
            : 'Unenforced sandwich rules causing unearned salary payroll leaks (~1.5% to 2% of payroll)',
        solution:
          'Automated Indian Labor Law Sandwich Engine detects leaves flanking Friday/Monday or public holidays and auto-deducts weekly offs with 0 manual effort.',
      });
    }

    // Analyze Payroll & Multi-Branch
    if (payrollTime === 'tally_sync' || officeType === 'multi' || teamSize > 150) {
      recommendedTier = 'enterprise';
      painPoints.push({
        problem: 'Multi-branch punch federation & manual entry of Payable Days into payroll software',
        solution:
          'Generates a 1-click audit-ready Payable Days summary sheet directly compatible with Tally, GreytHR, Keka, and SAP across all branch locations.',
      });
    } else if (payrollTime === 'days') {
      painPoints.push({
        problem: 'Taking 2–4 full days at month end reconciling attendance for payroll payout',
        solution:
          'Reconciles punches, approved leaves, and sandwich deductions in real-time, cutting payroll prep to under 15 minutes.',
      });
    }

    // Default basic starter fallback
    if (painPoints.length === 0) {
      recommendedTier = 'starter';
      painPoints.push({
        problem: 'Manual calculation of biometric First-In, Last-Out, and late arrival marks',
        solution:
          'Universal CSV Auto-Mapper reads raw punches from any machine and builds automated attendance heatmaps.',
      });
      rationale = 'Ideal for single-facility offices seeking clean biometric attendance and late-mark tracking.';
    } else if (recommendedTier === 'enterprise') {
      rationale =
        'Best suited for multi-branch operations, multi-shift plants, and teams requiring 1-click Payable Days exports for Tally / GreytHR.';
    } else {
      rationale =
        'Tailor-made for scaling Indian businesses needing automated statutory leaves (SL, PL, CL) and sandwich rule leakage prevention.';
    }

    // Pricing calculation based on Base 50 + extra employee overage
    // Base 50 rates in INR: Starter ₹1,499, Pro ₹2,999, Enterprise ₹4,999
    // Extra rates in INR: Starter ₹25, Pro ₹45, Enterprise ₹65
    let baseInr = 2999;
    let extraInr = 45;
    let planName = 'Pro Growth (Plan 2)';
    let planKey = 'pro';

    if (recommendedTier === 'starter') {
      baseInr = 1499;
      extraInr = 25;
      planName = 'Starter (Plan 1)';
      planKey = 'starter';
    } else if (recommendedTier === 'enterprise') {
      baseInr = 4999;
      extraInr = 65;
      planName = 'Enterprise Suite (Plan 3)';
      planKey = 'enterprise';
    }

    // Exchange rate approx 1 USD = ₹80 for foreign quotes
    const baseFee = currency === 'INR' ? baseInr : Math.round(baseInr / 80);
    const extraRate = currency === 'INR' ? extraInr : Math.round((extraInr / 80) * 100) / 100;

    const extraStaffCount = Math.max(0, teamSize - 50);
    const extraTotal = extraStaffCount * extraRate;

    // Monthly Rolling
    const monthlyTotal = Math.round(baseFee + extraTotal);

    // Quarterly (10% discount)
    const quarterlyMonthlyEquivalent = Math.round(monthlyTotal * 0.9);
    const quarterlyBilledTotal = Math.round(monthlyTotal * 3 * 0.9);
    const quarterlySavings = Math.round(monthlyTotal * 3 * 0.1);

    // Annual (20% discount)
    const annualMonthlyEquivalent = Math.round(monthlyTotal * 0.8);
    const annualBilledTotal = Math.round(monthlyTotal * 12 * 0.8);
    const annualSavings = Math.round(monthlyTotal * 12 * 0.2);

    return {
      tier: recommendedTier,
      planName,
      planKey,
      rationale,
      painPoints,
      extraStaffCount,
      extraRate,
      baseFee,
      monthlyTotal,
      quarterlyMonthlyEquivalent,
      quarterlyBilledTotal,
      quarterlySavings,
      annualMonthlyEquivalent,
      annualBilledTotal,
      annualSavings,
    };
  }, [teamSize, officeType, leaveManagement, sandwichRule, payrollTime, currency]);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 sm:p-10 shadow-xl space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Assessment &amp; Instant Quote</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Calculate Your Best-Fit Plan &amp; Solution
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Answer 3 quick questions about your team to diagnose your exact payroll leakage and get an instant quote.
          </p>
        </div>

        {/* Currency Switcher */}
        <div className="inline-flex items-center bg-[var(--bg-surface)] border border-[var(--border)] p-1 rounded-xl text-xs font-bold shrink-0 self-start sm:self-center">
          <button
            onClick={() => setCurrency('INR')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              currency === 'INR'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            INR (₹)
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              currency === 'USD'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            USD ($)
          </button>
        </div>
      </div>

      {/* ── QUESTION STEPS ────────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* Question 1: Team Size & Office Structure */}
        <div className="space-y-3 bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                1
              </span>
              <span>How many total employees are in your organization?</span>
            </label>
            <div className="text-right">
              <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {teamSize}
              </span>
              <span className="text-xs text-[var(--text-muted)] ml-1">staff enrolled</span>
            </div>
          </div>

          <input
            type="range"
            min={10}
            max={350}
            step={5}
            value={teamSize}
            onChange={(e) => setTeamSize(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-[var(--bg-elevated)] rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />

          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1">
            <span>10 staff (Small Office)</span>
            <span>50 staff (Base Package Limit)</span>
            <span>200+ staff (Mid-Enterprise)</span>
          </div>

          <div className="pt-3 border-t border-[var(--border)] flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-[var(--text-secondary)]">Location Structure:</span>
            <button
              onClick={() => setOfficeType('single')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                officeType === 'single'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)]'
              }`}
            >
              Single Office Location
            </button>
            <button
              onClick={() => setOfficeType('multi')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                officeType === 'multi'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)]'
              }`}
            >
              Multi-Branch / Factory Plants
            </button>
          </div>
        </div>

        {/* Question 2: Annual Leaves (SL, PL, CL) Tracking */}
        <div className="space-y-3 bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border)]">
          <label className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
              2
            </span>
            <span>Do you offer annual statutory leaves (SL, PL, CL), and how are they tracked?</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setLeaveManagement('excel')}
              className={`p-3.5 rounded-2xl border text-left transition-all space-y-1.5 ${
                leaveManagement === 'excel'
                  ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-500 shadow-sm'
                  : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-indigo-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[var(--text-primary)]">In Excel &amp; WhatsApp</span>
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    leaveManagement === 'excel' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-zinc-400'
                  }`}
                >
                  {leaveManagement === 'excel' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Employees email or message managers; HR manually tallies balances in spreadsheets.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setLeaveManagement('disputes')}
              className={`p-3.5 rounded-2xl border text-left transition-all space-y-1.5 ${
                leaveManagement === 'disputes'
                  ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-500 shadow-sm'
                  : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-indigo-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[var(--text-primary)]">Frequent Balance Disputes</span>
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    leaveManagement === 'disputes' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-zinc-400'
                  }`}
                >
                  {leaveManagement === 'disputes' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Staff don&apos;t know remaining quotas; probation &amp; notice period LWP rules are hard to track.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setLeaveManagement('none')}
              className={`p-3.5 rounded-2xl border text-left transition-all space-y-1.5 ${
                leaveManagement === 'none'
                  ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-500 shadow-sm'
                  : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-indigo-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[var(--text-primary)]">Punch Tracking Only</span>
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    leaveManagement === 'none' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-zinc-400'
                  }`}
                >
                  {leaveManagement === 'none' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                No formal statutory leave ledger needed; just raw biometric In/Out time and late marks.
              </p>
            </button>
          </div>
        </div>

        {/* Question 3: Sandwich Rules & Holiday Deductions */}
        <div className="space-y-3 bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border)]">
          <label className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
              3
            </span>
            <span>How do you enforce weekend &amp; holiday sandwich rules?</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setSandwichRule('manual')}
              className={`p-3.5 rounded-2xl border text-left transition-all space-y-1.5 ${
                sandwichRule === 'manual'
                  ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-500 shadow-sm'
                  : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-indigo-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[var(--text-primary)]">Manual Calendar Cross-Check</span>
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    sandwichRule === 'manual' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-zinc-400'
                  }`}
                >
                  {sandwichRule === 'manual' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                HR manually checks Friday &amp; Monday absences against public holidays on a paper/Excel calendar.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSandwichRule('ignored')}
              className={`p-3.5 rounded-2xl border text-left transition-all space-y-1.5 ${
                sandwichRule === 'ignored'
                  ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-500 shadow-sm'
                  : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-indigo-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[var(--text-primary)]">Too Painful to Enforce</span>
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    sandwichRule === 'ignored' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-zinc-400'
                  }`}
                >
                  {sandwichRule === 'ignored' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                We don&apos;t enforce it because checking is too exhausting, but we suspect significant salary leakage.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSandwichRule('none')}
              className={`p-3.5 rounded-2xl border text-left transition-all space-y-1.5 ${
                sandwichRule === 'none'
                  ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-500 shadow-sm'
                  : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-indigo-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[var(--text-primary)]">No Sandwich Policy</span>
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    sandwichRule === 'none' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-zinc-400'
                  }`}
                >
                  {sandwichRule === 'none' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Our organization policy does not require sandwich deductions for weekends/holidays.
              </p>
            </button>
          </div>
        </div>

        {/* Question 4: Month-End Payroll Sheet Calculation */}
        <div className="space-y-3 bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border)]">
          <label className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
              4
            </span>
            <span>How does your team prepare final &quot;Payable Days&quot; for monthly payroll?</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setPayrollTime('days')}
              className={`p-3.5 rounded-2xl border text-left transition-all space-y-1.5 ${
                payrollTime === 'days'
                  ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-500 shadow-sm'
                  : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-indigo-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[var(--text-primary)]">Takes 2–4 Days in Excel</span>
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    payrollTime === 'days' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-zinc-400'
                  }`}
                >
                  {payrollTime === 'days' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                HR loses multiple days cross-checking biometric logs, leaves, and overtime before paying salaries.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setPayrollTime('tally_sync')}
              className={`p-3.5 rounded-2xl border text-left transition-all space-y-1.5 ${
                payrollTime === 'tally_sync'
                  ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-500 shadow-sm'
                  : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-indigo-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[var(--text-primary)]">Need Direct Payroll Export</span>
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    payrollTime === 'tally_sync' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-zinc-400'
                  }`}
                >
                  {payrollTime === 'tally_sync' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Need a ready-to-run Payable Days deduction sheet to import directly into Tally, GreytHR, Keka, or SAP.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setPayrollTime('fast')}
              className={`p-3.5 rounded-2xl border text-left transition-all space-y-1.5 ${
                payrollTime === 'fast'
                  ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-500 shadow-sm'
                  : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-indigo-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[var(--text-primary)]">Quick / Under 2 Hours</span>
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    payrollTime === 'fast' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-zinc-400'
                  }`}
                >
                  {payrollTime === 'fast' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Our payroll calculation is simple and already automated without major friction.
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* ── DIAGNOSTIC RESULTS & CUSTOMIZED QUOTE ─────────────────────── */}
      <div className="mt-8 pt-8 border-t-2 border-indigo-500/30 space-y-8 animate-in fade-in duration-300">
        {/* Recommendation Header */}
        <div className="bg-gradient-to-r from-indigo-900/10 via-purple-900/10 to-transparent p-6 rounded-3xl border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Diagnostic Assessment Result
            </span>
            <div className="flex items-center gap-3">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
                {recommendation.planName}
              </h3>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-sm">
                Best Fit for {teamSize} Staff
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-xl leading-relaxed">
              {recommendation.rationale}
            </p>
          </div>

          <button
            onClick={() => {
              onRequestDemo({
                teamSize,
                recommendedPlan: recommendation.planKey,
                leaveManagement,
                sandwichRule,
              });
            }}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all shrink-0 flex items-center justify-center gap-2"
          >
            <span>Book 1-on-1 Walkthrough</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Problem vs Solution Mapping */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <h4 className="font-extrabold text-base text-[var(--text-primary)]">
              How StaffPulse Specifically Resolves Your Pain Points:
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendation.painPoints.map((pt, idx) => (
              <div
                key={idx}
                className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4.5 space-y-2.5 shadow-sm"
              >
                <div className="flex items-start gap-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-[10px] uppercase tracking-wider font-extrabold">
                    Your Headache
                  </span>
                  <span className="leading-snug">{pt.problem}</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-[var(--text-secondary)] pl-2 border-l-2 border-emerald-500">
                  <span className="leading-relaxed">{pt.solution}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3-CADENCE PRICING BREAKDOWN ───────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-extrabold text-base text-[var(--text-primary)] flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-500" />
                <span>Customized Quote Breakdown for {teamSize} Enrolled Employees</span>
              </h4>
              <p className="text-xs text-[var(--text-muted)]">
                Base pack covers your first 50 staff ({sym}{recommendation.baseFee}/mo) + {recommendation.extraStaffCount} extra staff at {sym}{recommendation.extraRate}/emp.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Monthly Rolling */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  Monthly Rolling
                </span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[var(--text-primary)]">
                    {sym}{recommendation.monthlyTotal.toLocaleString()}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">/ month</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  Month-to-month flexibility. Cancel anytime.
                </p>

                <div className="mt-4 pt-3 border-t border-[var(--border)] text-xs space-y-1.5 text-[var(--text-secondary)]">
                  <div className="flex justify-between">
                    <span>Base Pack (Up to 50):</span>
                    <strong className="text-[var(--text-primary)]">{sym}{recommendation.baseFee}/mo</strong>
                  </div>
                  {recommendation.extraStaffCount > 0 && (
                    <div className="flex justify-between">
                      <span>Extra {recommendation.extraStaffCount} staff:</span>
                      <strong className="text-[var(--text-primary)]">
                        +{sym}{(recommendation.extraStaffCount * recommendation.extraRate).toFixed(0)}/mo
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => onSelectPlan(recommendation.planKey)}
                className="w-full py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] hover:bg-[var(--border)] text-[var(--text-primary)] text-xs font-bold transition-all text-center"
              >
                Choose Monthly Rolling
              </button>
            </div>

            {/* Card 2: Quarterly (Save 10%) */}
            <div className="bg-[var(--bg-surface)] border border-indigo-500/40 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                Save 10%
              </div>

              <div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                  Quarterly Billing
                </span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[var(--text-primary)]">
                    {sym}{recommendation.quarterlyMonthlyEquivalent.toLocaleString()}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">/ mo effective</span>
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                  Billed {sym}{recommendation.quarterlyBilledTotal.toLocaleString()} every 3 months (Save {sym}{recommendation.quarterlySavings.toLocaleString()})
                </p>

                <div className="mt-4 pt-3 border-t border-[var(--border)] text-xs space-y-1.5 text-[var(--text-secondary)]">
                  <div className="flex justify-between">
                    <span>3-Month Package:</span>
                    <strong className="text-[var(--text-primary)]">{sym}{recommendation.quarterlyBilledTotal.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Your Savings:</span>
                    <span>{sym}{recommendation.quarterlySavings.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSelectPlan(recommendation.planKey)}
                className="w-full py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-all text-center"
              >
                Choose Quarterly
              </button>
            </div>

            {/* Card 3: Annual (Save 20% Best Value) */}
            <div className="bg-[var(--bg-card)] border-2 border-emerald-500 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between relative overflow-hidden transform md:-translate-y-2">
              <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black px-3.5 py-1 rounded-bl-xl uppercase tracking-wider shadow-sm">
                Save 20% · Best Value
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                  Annual Commitment
                </span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[var(--text-primary)]">
                    {sym}{recommendation.annualMonthlyEquivalent.toLocaleString()}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">/ mo effective</span>
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                  Billed {sym}{recommendation.annualBilledTotal.toLocaleString()} / year · Save {sym}{recommendation.annualSavings.toLocaleString()}!
                </p>

                <div className="mt-4 pt-3 border-t border-[var(--border)] text-xs space-y-1.5 text-[var(--text-secondary)]">
                  <div className="flex justify-between">
                    <span>Annual Rate:</span>
                    <strong className="text-[var(--text-primary)]">{sym}{recommendation.annualBilledTotal.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-extrabold">
                    <span>Total Cash Kept:</span>
                    <span>{sym}{recommendation.annualSavings.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSelectPlan(recommendation.planKey)}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/30 transition-all text-center flex items-center justify-center gap-1.5"
              >
                <span>Start 14-Day Free Trial</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
