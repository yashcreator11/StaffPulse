'use client';

import React, { useState } from 'react';
import { Sparkles, UploadCloud, CheckCircle2, ArrowRight, Loader2, PlayCircle, ShieldCheck, Users } from 'lucide-react';
import { generateSampleDataset } from '@/lib/sampleData';
import { addUploadedMonth, saveRecords } from '@/lib/storage';

interface FirstRunOnboardingCardProps {
  onUploadCsvClick: () => void;
  onSampleDataLoaded: () => void;
}

export default function FirstRunOnboardingCard({
  onUploadCsvClick,
  onSampleDataLoaded,
}: FirstRunOnboardingCardProps) {
  const [loadingSample, setLoadingSample] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLoadSampleData() {
    setLoadingSample(true);
    setError(null);
    try {
      const { month, records } = generateSampleDataset();
      await addUploadedMonth(month);
      await saveRecords(month.key, records);
      onSampleDataLoaded();
    } catch (err: unknown) {
      console.error('Failed to seed sample data:', err);
      setError(err instanceof Error ? err.message : 'Failed to seed sample data.');
      setLoadingSample(false);
    }
  }

  return (
    <div className="bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-3xl p-6 sm:p-10 shadow-xl space-y-8 max-w-4xl mx-auto my-6 relative overflow-hidden">
      {/* Decorative top border glow */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-blue-600" />

      {/* Header */}
      <div className="space-y-2 text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Quickstart Workspace Setup</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
          Welcome to Your StaffPulse Workspace
        </h2>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-2xl">
          Get your workspace live in under 2 minutes. Upload an attendance export from your biometric machine, or explore the dashboard with pre-loaded sample data.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium">
          {error}
        </div>
      )}

      {/* 3-Step Setup Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1 */}
        <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Step 1</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <h4 className="font-bold text-xs text-[var(--text-primary)]">Organization Initialized</h4>
          <p className="text-[11px] text-[var(--text-muted)]">
            Workspace defaults, access gates, and tenant database isolation active.
          </p>
        </div>

        {/* Step 2 (Active) */}
        <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border-2 border-[var(--accent)]/50 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-wider">Step 2 (Current)</span>
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
          </div>
          <h4 className="font-bold text-xs text-[var(--text-primary)]">Connect Attendance Data</h4>
          <p className="text-[11px] text-[var(--text-muted)]">
            Upload your machine export CSV or load interactive sample records below.
          </p>
        </div>

        {/* Step 3 */}
        <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] opacity-60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-dim)] uppercase tracking-wider">Step 3</span>
            <Users className="w-4 h-4 text-[var(--text-dim)]" />
          </div>
          <h4 className="font-bold text-xs text-[var(--text-primary)]">Invite Team &amp; Leads</h4>
          <p className="text-[11px] text-[var(--text-muted)]">
            Employees log into /leave/me to view balances and submit requests.
          </p>
        </div>
      </div>

      {/* Dual Action Launchpad */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        {/* Action 1: Upload Your Real Biometric CSV */}
        <button
          onClick={onUploadCsvClick}
          className="p-6 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 hover:from-orange-500/20 hover:to-amber-500/20 border border-[var(--border)] hover:border-[var(--accent)] text-left transition-all group flex flex-col justify-between space-y-4"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shadow-md">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm sm:text-base text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
              Upload Your Biometric CSV
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Export attendance from eSSL, Matrix, ZKTeco, or Realtime and drop it here. Our smart mapper automatically parses your headers.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] pt-2">
            <span>Launch File Uploader</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Action 2: Explore Sample Data Sandbox */}
        <button
          disabled={loadingSample}
          onClick={handleLoadSampleData}
          className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 hover:from-blue-500/20 hover:to-indigo-500/20 border border-[var(--border)] hover:border-blue-500 text-left transition-all group flex flex-col justify-between space-y-4 disabled:opacity-50"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              {loadingSample ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <PlayCircle className="w-5 h-5" />
              )}
            </div>
            <h3 className="font-extrabold text-sm sm:text-base text-[var(--text-primary)] group-hover:text-blue-500 transition-colors">
              Explore with Sample Data
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Instant test drive with 15 realistic employees across Engineering, Operations, and Sales including late marks and sandwich rules.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-500 pt-2">
            <span>{loadingSample ? 'Seeding Sandbox Data...' : 'Load Sample Sandbox (Instant)'}</span>
            {!loadingSample && <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />}
          </div>
        </button>
      </div>

      <div className="pt-2 flex items-center justify-center gap-2 text-xs text-[var(--text-dim)]">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>Sample records can be cleared or replaced with real CSV uploads anytime from Workspace Settings.</span>
      </div>
    </div>
  );
}
