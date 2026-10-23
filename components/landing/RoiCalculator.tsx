'use client';

import React, { useState, useMemo } from 'react';
import { Calculator, TrendingUp, Clock, ShieldAlert, Award } from 'lucide-react';

export default function RoiCalculator() {
  const [teamSize, setTeamSize] = useState<number>(120);
  const [avgSalary, setAvgSalary] = useState<number>(45000); // INR
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');

  // Currency multiplier/symbols
  const sym = currency === 'INR' ? '₹' : '$';
  const effectiveSalary = currency === 'INR' ? avgSalary : Math.round(avgSalary / 85);

  const metrics = useMemo(() => {
    // 1. Hours spent manually reconciling raw punches, missed punches & discrepancies:
    // Approx 15 mins per employee per month for HR/payroll team
    const hoursSavedMonthly = Math.max(12, Math.round(teamSize * 0.28));

    // 2. Financial leakage prevented per month:
    // Industry benchmark: unapplied sandwich leaves + unflagged late grace exceedances = ~1.5% to 2.2% of payroll
    const monthlyLeakagePrevented = Math.round(teamSize * effectiveSalary * 0.016);

    // 3. HR time value saved:
    // Avg hourly rate of HR payroll specialist (based on salary)
    const hourlyHrCost = Math.round(effectiveSalary / 160);
    const monthlyTimeValue = hoursSavedMonthly * hourlyHrCost;

    // Total Monthly Value
    const totalMonthlyBenefit = monthlyLeakagePrevented + monthlyTimeValue;
    const totalAnnualBenefit = totalMonthlyBenefit * 12;

    // Estimated StaffPulse Cost (Pro Growth Plan: Base ₹2,399/mo up to 50 + ₹36/mo per extra staff billed annually)
    const baseMonthlyCost = currency === 'INR' ? 2399 : 30;
    const extraStaffRate = currency === 'INR' ? 36 : 0.45;
    const monthlySoftwareCost = baseMonthlyCost + Math.max(0, teamSize - 50) * extraStaffRate;
    const annualSoftwareCost = Math.round(monthlySoftwareCost * 12);

    // Net Annual Savings & ROI
    const netAnnualSavings = Math.max(0, totalAnnualBenefit - annualSoftwareCost);
    const roiMultiplier = annualSoftwareCost > 0 
      ? ((totalAnnualBenefit / annualSoftwareCost)).toFixed(1)
      : '10.0';

    return {
      hoursSavedMonthly,
      monthlyLeakagePrevented,
      totalAnnualBenefit,
      annualSoftwareCost,
      netAnnualSavings,
      roiMultiplier,
    };
  }, [teamSize, effectiveSalary, currency]);

  function formatMoney(num: number): string {
    if (currency === 'INR') {
      return num >= 100000 
        ? `${(num / 100000).toFixed(2)} Lakh`
        : num.toLocaleString('en-IN');
    }
    return num.toLocaleString('en-US');
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 mb-2">
              <Calculator className="w-3.5 h-3.5" />
              <span>Interactive ROI &amp; Payroll Calculator</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Quantify Your Monthly Compliance Savings
            </h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Adjust team size and average compensation to calculate hours saved and payroll leakage prevented.
            </p>
          </div>

          {/* Currency Toggle */}
          <div className="flex items-center self-start md:self-auto bg-[var(--bg-elevated)] p-1 rounded-xl border border-[var(--border)] text-xs font-semibold">
            <button
              onClick={() => setCurrency('INR')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                currency === 'INR'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              INR (₹)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                currency === 'USD'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>

        {/* Sliders and Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Sliders */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Slider 1: Team Size */}
            <div className="bg-[var(--bg-elevated)] p-5 rounded-2xl border border-[var(--border)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Total Employees / Staff
                </span>
                <span className="text-lg font-bold text-[var(--text-primary)] px-3 py-0.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
                  {teamSize.toLocaleString()} staff
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={1500}
                step={10}
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value))}
                className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
              />
              <div className="flex justify-between text-[11px] text-[var(--text-dim)] font-medium">
                <span>20 staff (Pilot)</span>
                <span>500 (Mid-Market)</span>
                <span>1,500+ (Enterprise)</span>
              </div>
            </div>

            {/* Slider 2: Average Salary */}
            <div className="bg-[var(--bg-elevated)] p-5 rounded-2xl border border-[var(--border)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Average Monthly Salary
                </span>
                <span className="text-lg font-bold text-[var(--text-primary)] px-3 py-0.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
                  {sym}{formatMoney(effectiveSalary)}
                </span>
              </div>
              <input
                type="range"
                min={currency === 'INR' ? 20000 : 300}
                max={currency === 'INR' ? 150000 : 2500}
                step={currency === 'INR' ? 5000 : 50}
                value={currency === 'INR' ? avgSalary : effectiveSalary}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (currency === 'INR') setAvgSalary(val);
                  else setAvgSalary(val * 85);
                }}
                className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
              />
              <div className="flex justify-between text-[11px] text-[var(--text-dim)] font-medium">
                <span>{sym}{currency === 'INR' ? '20,000' : '300'}</span>
                <span>{sym}{currency === 'INR' ? '75,000' : '1,200'}</span>
                <span>{sym}{currency === 'INR' ? '1,50,000+' : '2,500+'}</span>
              </div>
            </div>

            {/* Methodology Note */}
            <p className="text-[11px] text-[var(--text-dim)] leading-relaxed italic">
              *Calculated against industry averages for Indian labor law non-compliance, manual biometric reconciliation time, and sandwich rule deductions.
            </p>
          </div>

          {/* Right Column: Live Computed ROI Board */}
          <div className="lg:col-span-6 bg-gradient-to-br from-orange-500/10 via-[var(--bg-elevated)] to-blue-500/10 border border-[var(--border)] rounded-2xl p-6 sm:p-7 space-y-6">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border)]">
                <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] mb-1">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span>Time Saved</span>
                </div>
                <div className="text-2xl font-extrabold text-[var(--text-primary)]">
                  ~{metrics.hoursSavedMonthly} hrs<span className="text-xs font-normal text-[var(--text-muted)]">/mo</span>
                </div>
                <p className="text-[11px] text-[var(--text-dim)] mt-0.5">
                  Eliminates punch dispute emails
                </p>
              </div>

              <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border)]">
                <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] mb-1">
                  <ShieldAlert className="w-4 h-4 text-emerald-500" />
                  <span>Leakage Prevented</span>
                </div>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {sym}{formatMoney(metrics.monthlyLeakagePrevented)}<span className="text-xs font-normal text-[var(--text-muted)]">/mo</span>
                </div>
                <p className="text-[11px] text-[var(--text-dim)] mt-0.5">
                  Automated sandwich &amp; late mark rules
                </p>
              </div>
            </div>

            {/* Highlight Hero ROI Box */}
            <div className="bg-[var(--bg-card)] p-5 rounded-2xl border-2 border-[var(--accent)]/40 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div>
                  <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
                    Total Estimated Annual Savings
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] mt-1">
                    {sym}{formatMoney(metrics.netAnnualSavings)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm border border-emerald-500/30">
                    <TrendingUp className="w-4 h-4" />
                    <span>{metrics.roiMultiplier}× ROI</span>
                  </div>
                  <div className="text-[10px] text-[var(--text-dim)] mt-1">
                    Return on Investment
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 text-xs text-[var(--text-muted)]">
                <span>Estimated StaffPulse Cost:</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  ~{sym}{formatMoney(metrics.annualSoftwareCost)} / year
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <Award className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Full compliance with Indian Factories Act and Shops &amp; Establishment Regulations</span>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
