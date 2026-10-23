import React from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import {
  Shield,
  Building2,
  PhoneCall,
  FileText,
  Activity,
  ArrowLeft,
  Lock,
  Cpu,
} from 'lucide-react';

export default function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-surface)] text-[var(--text-primary)] flex flex-col font-sans transition-colors duration-200">
      {/* ── Platform Master Control Plane Header ───────────────────────── */}
      <header className="sticky top-0 z-40 bg-[var(--bg-card)]/90 backdrop-blur-md border-b border-[var(--border)] px-4 sm:px-6 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand + Nav */}
          <div className="flex items-center gap-5">
            <Link
              href="/master"
              className="flex items-center gap-2.5 font-extrabold tracking-tight text-base sm:text-lg hover:opacity-90 transition-opacity"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/25">
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 leading-tight">
                  <span className="font-extrabold text-[var(--text-primary)]">StaffPulse</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    Master
                  </span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] font-medium">Control Plane</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 ml-4 pl-4 border-l border-[var(--border)] text-xs font-semibold">
              <Link
                href="/master"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Organizations</span>
              </Link>
              <Link
                href="/master?tab=leads"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 text-emerald-500" />
                <span>Inbound Leads</span>
              </Link>
              <Link
                href="/master?tab=audit"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span>Audit Ledger</span>
              </Link>
              <Link
                href="/master?tab=system"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <Activity className="w-3.5 h-3.5 text-amber-500" />
                <span>System Health</span>
              </Link>
            </nav>
          </div>

          {/* Right Admin Controls */}
          <div className="flex items-center gap-3">
            {/* Admin Identity Pill */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border)] text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[var(--text-muted)]">Signed in:</span>
              <span className="font-semibold text-[var(--text-primary)]">master@staffpulse.io</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 ml-1">Owner</span>
            </div>

            {/* Link back to Showcase / App */}
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Customer App</span>
            </Link>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── Main Content Container ────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border)] py-4 px-4 sm:px-8 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-card)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--text-primary)]">StaffPulse Master Console v2.4</span>
            <span>· Multi-Tenant Control Plane</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              All Systems Operational
            </span>
            <span>·</span>
            <span>Append-Only Tamper-Proof Audit Logging</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
