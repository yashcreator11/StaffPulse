'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, ArrowLeft, ArrowRight, Sparkles, ShieldAlert, Home } from 'lucide-react';
import { GatedFeature, PLAN_FEATURE_INFO } from '@/lib/billing/planGating';

interface LockedFeatureGateProps {
  feature: GatedFeature;
  currentPlan?: string | null;
  backHref?: string;
  backLabel?: string;
}

export default function LockedFeatureGate({
  feature,
  currentPlan = 'starter',
  backHref = '/',
  backLabel = 'Return to Attendance Dashboard',
}: LockedFeatureGateProps) {
  const info = PLAN_FEATURE_INFO[feature] || {
    title: 'Advanced SaaS Capability',
    description: 'This module is restricted under your current workspace subscription plan.',
    requiredTier: 'pro',
    tierLabel: 'Pro Growth',
    upgradeUrl: '/checkout?plan=pro',
  };

  const isEnterprise = info.requiredTier === 'enterprise';

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 shadow-2xl text-center space-y-6 relative overflow-hidden">
        {/* Glow accent */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none ${
            isEnterprise ? 'bg-indigo-500' : 'bg-orange-500'
          }`}
        />

        {/* Lock Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-orange-500/10 to-transparent border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-lg shadow-orange-500/5">
          <Lock className="w-8 h-8" />
        </div>

        {/* Plan Pill */}
        <div className="space-y-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              isEnterprise
                ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                : 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {info.tierLabel} Required
          </span>

          <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
            {info.title}
          </h2>

          <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
            {info.description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-3">
          <Link
            href={info.upgradeUrl}
            className={`w-full py-3 px-4 rounded-xl text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all ${
              isEnterprise
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:opacity-95 shadow-orange-500/20'
            }`}
          >
            <span>Upgrade to {info.tierLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href={backHref}
            className="w-full py-2.5 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] hover:bg-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold text-xs transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{backLabel}</span>
          </Link>

          <a
            href="/api/auth/signout"
            className="inline-flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline transition-colors pt-1"
          >
            <Home className="w-3 h-3" />
            <span>Exit Demo &amp; Return to Homepage</span>
          </a>
        </div>
      </div>
    </div>
  );
}
