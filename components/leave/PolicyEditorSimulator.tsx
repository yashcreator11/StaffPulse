'use client';

import React, { useState } from 'react';
import {
  Sliders,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Shield,
  FileText,
  Sparkles,
} from 'lucide-react';

interface SimulatedResult {
  decision: 'APPROVED' | 'REJECTED';
  daysRequested: number;
  remainingBalance: number;
  checks: Array<{ label: string; passed: boolean; message: string }>;
  explanation: string;
}

export default function PolicyEditorSimulator() {
  // Policy rule form state
  const [leaveType, setLeaveType] = useState('PL');
  const [annualQuota, setAnnualQuota] = useState(18);
  const [accrualTiming, setAccrualTiming] = useState<'annual' | 'monthly' | 'quarterly'>('annual');
  const [carryForwardCap, setCarryForwardCap] = useState(10);
  const [probationMonths, setProbationMonths] = useState(3);
  const [noticeDays, setNoticeDays] = useState(2);
  const [docThresholdDays, setDocThresholdDays] = useState(3);

  // Simulator scenario state
  const [empJoinDate, setEmpJoinDate] = useState('2026-01-15');
  const [currentBalance, setCurrentBalance] = useState(12);
  const [requestFrom, setRequestFrom] = useState('2026-11-05');
  const [requestTo, setRequestTo] = useState('2026-11-07');
  const [simulation, setSimulation] = useState<SimulatedResult | null>(null);

  function runSimulation() {
    const from = new Date(requestFrom);
    const to = new Date(requestTo);
    const join = new Date(empJoinDate);
    const now = new Date();

    const diffDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);

    // 1. Probation check
    const monthsSinceJoin = (now.getFullYear() - join.getFullYear()) * 12 + (now.getMonth() - join.getMonth());
    const passedProbation = monthsSinceJoin >= probationMonths;

    // 2. Balance check
    const hasEnoughBalance = currentBalance >= diffDays;

    // 3. Notice check
    const daysNoticeGiven = Math.round((from.getTime() - now.getTime()) / 86400000);
    const passedNotice = daysNoticeGiven >= noticeDays;

    const allPassed = passedProbation && hasEnoughBalance && passedNotice;

    const checks = [
      {
        label: 'Probation Requirement',
        passed: passedProbation,
        message: passedProbation
          ? `Tenure of ${monthsSinceJoin} months meets ${probationMonths}m probation unlock.`
          : `Employee is within ${probationMonths}-month probation window.`,
      },
      {
        label: 'Balance Availability',
        passed: hasEnoughBalance,
        message: hasEnoughBalance
          ? `${diffDays} days requested ≤ ${currentBalance} days current balance.`
          : `Insufficient balance (${currentBalance} available, ${diffDays} requested).`,
      },
      {
        label: 'Advance Notice Period',
        passed: passedNotice,
        message: passedNotice
          ? `${daysNoticeGiven} days notice meets the ${noticeDays}-day requirement.`
          : `Requires ${noticeDays} days advance notice; requested ${daysNoticeGiven} days in advance.`,
      },
      {
        label: 'Medical Documentation Threshold',
        passed: true,
        message:
          diffDays >= docThresholdDays
            ? `Requires attachment verification (leave length ≥ ${docThresholdDays} days).`
            : `No mandatory documentation needed (< ${docThresholdDays} days).`,
      },
    ];

    setSimulation({
      decision: allPassed ? 'APPROVED' : 'REJECTED',
      daysRequested: diffDays,
      remainingBalance: allPassed ? currentBalance - diffDays : currentBalance,
      checks,
      explanation: allPassed
        ? `Request complies with all ${leaveType} policy criteria and balance will be deducted immediately.`
        : `Request cannot be auto-approved due to breached policy constraints.`,
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visual Policy Rule Controls */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Sliders className="h-5 w-5 text-indigo-500" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Leave Policy Rule Editor</h3>
              <p className="text-xs text-slate-500">Configure parameters and entitlement formulas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Target Leave Type</label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
              >
                <option value="PL">Privilege Leave (PL)</option>
                <option value="CL">Casual Leave (CL)</option>
                <option value="SL">Sick Leave (SL)</option>
                <option value="ML">Maternity Leave (ML)</option>
                <option value="COMP">Compensatory Off (Comp-Off)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Annual Quota (Days)</label>
              <input
                type="number"
                min={1}
                value={annualQuota}
                onChange={(e) => setAnnualQuota(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Accrual Timing</label>
              <select
                value={accrualTiming}
                onChange={(e) => setAccrualTiming(e.target.value as any)}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
              >
                <option value="annual">Annual Upfront (1st of leave year)</option>
                <option value="monthly">Monthly Pro-Rata (1st of month)</option>
                <option value="quarterly">Quarterly Tranches</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Carry Forward Limit</label>
              <input
                type="number"
                min={0}
                value={carryForwardCap}
                onChange={(e) => setCarryForwardCap(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Probation Unlock (Months)</label>
              <input
                type="number"
                min={0}
                value={probationMonths}
                onChange={(e) => setProbationMonths(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Minimum Advance Notice (Days)</label>
              <input
                type="number"
                min={0}
                value={noticeDays}
                onChange={(e) => setNoticeDays(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Real-Time Policy Simulator */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Real-Time Policy Simulator</h3>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                Sandbox
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Test how these policy parameters behave on hypothetical employee scenarios without modifying live database records.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-500 font-medium">Join Date</label>
                <input
                  type="date"
                  value={empJoinDate}
                  onChange={(e) => setEmpJoinDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="text-slate-500 font-medium">Starting Balance</label>
                <input
                  type="number"
                  value={currentBalance}
                  onChange={(e) => setCurrentBalance(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="text-slate-500 font-medium">Request From</label>
                <input
                  type="date"
                  value={requestFrom}
                  onChange={(e) => setRequestFrom(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="text-slate-500 font-medium">Request To</label>
                <input
                  type="date"
                  value={requestTo}
                  onChange={(e) => setRequestTo(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={runSimulation}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 text-xs font-semibold shadow-sm transition"
            >
              <Play className="h-4 w-4" />
              Simulate Policy Application
            </button>
          </div>
        </div>
      </div>

      {/* Simulation Result Presentation */}
      {simulation && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                  simulation.decision === 'APPROVED'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                }`}
              >
                {simulation.decision === 'APPROVED' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {simulation.decision}
              </span>
              <span className="text-xs text-slate-500">
                {simulation.daysRequested} Days Requested · Remaining Balance:{' '}
                <strong className="text-slate-900 dark:text-white">{simulation.remainingBalance}</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {simulation.checks.map((chk, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl border ${
                  chk.passed
                    ? 'border-emerald-500/20 bg-emerald-500/5 text-slate-700 dark:text-slate-300'
                    : 'border-rose-500/20 bg-rose-500/5 text-rose-700 dark:text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {chk.passed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                  )}
                  {chk.label}
                </div>
                <p className="mt-1 text-[11px] opacity-90">{chk.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
