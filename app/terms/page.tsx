'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, FileText, CheckCircle2, Building2, Fingerprint } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans antialiased selection:bg-[var(--accent)] selection:text-white">
      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[var(--bg-card)]/90 backdrop-blur-md border-b border-[var(--border)] px-4 sm:px-8 py-3.5 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md">
              <Fingerprint className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-[var(--text-primary)]">StaffPulse</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                Legal
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Showcase</span>
          </Link>
        </div>
      </header>

      {/* ── Content Container ─────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
        {/* Document Title Banner */}
        <div className="space-y-3 border-b border-[var(--border)] pb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Standard Master Subscription Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            Effective Date: October 2026 · Version 2.4 · Applicable to all StaffPulse Workspaces and Subscriptions.
          </p>
        </div>

        {/* Quick Executive Summary Callout */}
        <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/40 space-y-2 text-xs leading-relaxed text-[var(--text-secondary)]">
          <strong className="text-indigo-600 dark:text-indigo-400 font-bold block text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Executive Summary</span>
          </strong>
          <p>
            You (the Customer) retain 100% intellectual property and ownership over your company attendance, employee records, and biometric logs.
            StaffPulse acts strictly as a Software-as-a-Service processor. We provide automated In/Out calculation, statutory leave management, and sandwich rule deductions with a 99.9% platform availability SLA. You may export your entire dataset or cancel anytime with 1 click.
          </p>
        </div>

        {/* Clauses */}
        <div className="space-y-10 text-sm leading-relaxed text-[var(--text-secondary)]">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs flex items-center justify-center font-bold">1</span>
              <span>SaaS License &amp; Authorized Use</span>
            </h2>
            <p>
              Under these Terms, StaffPulse grants the Customer a non-exclusive, non-transferable, revocable subscription license to access the attendance calculation engine, biometric log mapper, and leave tracking portals solely for the Customer&apos;s internal workforce management.
            </p>
            <p>
              Subscription access is measured by active enrolled employee headcount. Every plan includes a base quota (up to 50 employees) with transparent incremental billing for additional staff enrolled beyond 50.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs flex items-center justify-center font-bold">2</span>
              <span>100% Customer Data Ownership</span>
            </h2>
            <p>
              The Customer retains exclusive rights, title, and ownership of all uploaded biometric punch CSVs, employee records, leave history, and configuration files (&ldquo;Customer Data&rdquo;). StaffPulse acquires zero intellectual property rights over Customer Data.
            </p>
            <p>
              StaffPulse will not view, disclose, or distribute Customer Data except as required to deliver the service, prevent technical failures, or comply with mandatory statutory court orders.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs flex items-center justify-center font-bold">3</span>
              <span>Subscription Fees, Billing &amp; Taxes</span>
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Billing Frequency:</strong> Customers may elect Monthly Rolling, Quarterly (10% discount), or Annual upfront (20% discount) billing.</li>
              <li><strong>Indian Tax Compliance:</strong> Invoices issued to Indian entities include valid GST numbers and SAC code 998313 (Information Technology Software Services).</li>
              <li><strong>14-Day Free Trial:</strong> Trial accounts receive unrestricted access for 14 calendar days. No payment details are required to test, and cancellation during trial incurs zero liability.</li>
              <li><strong>Headcount Adjustments:</strong> Extra headcount above 50 is calculated automatically at month-end based on active enrolled employee rows in the database.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs flex items-center justify-center font-bold">4</span>
              <span>Service Level Agreement (SLA) &amp; Platform Availability</span>
            </h2>
            <p>
              StaffPulse guarantees a <strong>99.9% Monthly Uptime Commitment</strong> for application access and API endpoints, excluding scheduled maintenance windows. Scheduled maintenance is conducted during off-peak windows (Sundays between 02:00 AM and 04:00 AM IST) and announced at least 48 hours in advance.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs flex items-center justify-center font-bold">5</span>
              <span>Statutory Compliance &amp; Payroll Disclaimers</span>
            </h2>
            <p>
              StaffPulse provides automated rule calculation engines (including sandwich rule evaluations, late arrival thresholds, and payable days spreadsheets). While designed to strictly mirror statutory guidelines, the Customer&apos;s HR and finance departments remain the ultimate authority for reviewing and authorizing actual salary disbursements, TDS tax deductions, and EPF/ESI contributions.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs flex items-center justify-center font-bold">6</span>
              <span>Termination &amp; Data Retrieval</span>
            </h2>
            <p>
              The Customer may cancel their subscription at any time via the Customer Billing Portal. Upon cancellation, access remains active until the end of the current billing cycle.
            </p>
            <p>
              Following cancellation, Customer Data is archived for 30 days to facilitate complete export. After 30 days, Customer Data is cryptographically purged from production databases in accordance with our DPDP Data Retention Policy.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs flex items-center justify-center font-bold">7</span>
              <span>Governing Law &amp; Jurisdiction</span>
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the Republic of India. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the competent courts in Mumbai, Maharashtra.
            </p>
          </section>
        </div>

        {/* Footer Support Navigation */}
        <div className="pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-[var(--text-primary)] underline">
              Privacy Policy &amp; DPDP Act Compliance
            </Link>
            <span>·</span>
            <Link href="/" className="hover:text-[var(--text-primary)] underline">
              StaffPulse Home
            </Link>
          </div>
          <p>© {new Date().getFullYear()} StaffPulse. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}
