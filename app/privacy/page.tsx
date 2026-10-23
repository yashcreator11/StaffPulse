'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, CheckCircle2, Fingerprint, Database, UserCheck, EyeOff } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                DPDP Act 2023 Compliant
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
            <Lock className="w-3.5 h-3.5" />
            <span>Statutory Privacy &amp; Data Protection Statement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Privacy Policy &amp; DPDP Compliance
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            Effective Date: October 2026 · Compliant with the Digital Personal Data Protection Act (DPDP), 2023 (India) and Global Data Processing Standards.
          </p>
        </div>

        {/* The Reassurance Box: No Raw Biometrics */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-2 border-emerald-500/30 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm sm:text-base">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span>The StaffPulse Zero-Raw-Biometric Guarantee</span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            StaffPulse <strong>DOES NOT store or process raw biometric images, fingerprint minutiae files, or facial contour scans</strong>. 
            Our platform operates exclusively on the <em>numeric time-stamp logs</em> (e.g., &ldquo;Employee #1042 checked in at 09:14:22 on Device #2&rdquo;) exported by your hardware time clocks. Your employees&apos; physical biometric identities remain strictly confined to your on-premises hardware.
          </p>
        </div>

        {/* Clauses */}
        <div className="space-y-10 text-sm leading-relaxed text-[var(--text-secondary)]">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-center font-bold">1</span>
              <span>Legal Roles Under the DPDP Act 2023</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">The Customer</span>
                <h4 className="font-bold text-sm text-[var(--text-primary)]">Data Fiduciary</h4>
                <p className="text-xs text-[var(--text-muted)]">
                  Your organization determines the purpose and lawful basis for collecting employee punch times and attendance records.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">StaffPulse</span>
                <h4 className="font-bold text-sm text-[var(--text-primary)]">Data Processor</h4>
                <p className="text-xs text-[var(--text-muted)]">
                  StaffPulse processes attendance and leave records strictly on documented instructions from the Customer to calculate payable days.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-center font-bold">2</span>
              <span>Categories of Data Processed</span>
            </h2>
            <p>
              We process only the minimum information necessary to execute payroll attendance compliance:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs">
              <li><strong>Workforce Identifiers:</strong> Employee code, full name, work email address, department, designation, and assigned office branch.</li>
              <li><strong>Time-Stamp Logs:</strong> In/Out clock times, terminal machine ID, date, and calculated total daily working hours.</li>
              <li><strong>Statutory Leave Records:</strong> Leave applications (Planned Leave, Casual Leave, Sick Leave, Work From Home), dates, manager approval states, and leave quota balances.</li>
              <li><strong>Audit Records:</strong> Immutable actor timestamp records of who edited, approved, or regularized an attendance record.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-center font-bold">3</span>
              <span>Cryptographic Security &amp; Tenant Segregation</span>
            </h2>
            <div className="space-y-2">
              <p>
                StaffPulse enforces defense-in-depth architectural security to guarantee data privacy:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs">
                <li><strong>PostgreSQL Row Level Security (RLS):</strong> Every database table enforces cryptographic tenant isolation (`auth_org_id()`). Cross-tenant data leakage is structurally impossible at the SQL engine layer.</li>
                <li><strong>Encryption in Transit:</strong> All HTTP traffic is protected by TLS 1.3 with strict HTTPS redirection and HSTS headers.</li>
                <li><strong>Encryption at Rest:</strong> All database storage volumes, backups, and punch logs are encrypted with AES-256 keys.</li>
                <li><strong>Append-Only Audit Logs:</strong> System audit logs use immutable database triggers that prohibit unauthorized update or deletion.</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-center font-bold">4</span>
              <span>Employee Data Subject Rights (DPDP Section 12)</span>
            </h2>
            <p>
              StaffPulse enables organizations to honor statutory employee privacy rights out of the box:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs">
              <li><strong>Right to Access:</strong> Every employee has continuous access to inspect their personal attendance logs, regularization requests, and leave balance history via `/leave/me`.</li>
              <li><strong>Right to Correction:</strong> Employees may submit missed-punch regularizations, and HR admins may correct mistaken entries with mandatory justification notes.</li>
              <li><strong>Right to Erasure (Offboarding):</strong> Upon employee separation, HR administrators can trigger automated data erasure pipelines (`/api/compliance/erasure`) to purge personal data while preserving aggregated payroll audit summaries required by tax authorities.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-center font-bold">5</span>
              <span>Cloud Infrastructure &amp; Security Standards</span>
            </h2>
            <p>
              Workforce data is hosted exclusively within Tier-IV enterprise cloud facilities meeting global compliance, SOC 2 Type II, and ISO 27001 certifications:
            </p>
            <div className="border border-[var(--border)] rounded-2xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-surface)] border-b border-[var(--border)] font-bold text-[var(--text-muted)] text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Infrastructure Tier</th>
                    <th className="p-3">Operational Scope &amp; Encryption</th>
                    <th className="p-3">Data Sovereignty &amp; Residency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  <tr>
                    <td className="p-3 font-bold text-[var(--text-primary)]">Primary Enterprise Cloud Database</td>
                    <td className="p-3">Multi-tenant RLS isolation, automated daily snapshots, AES-256 storage encryption</td>
                    <td className="p-3">Sovereign Data Center (Mumbai, India)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[var(--text-primary)]">High-Availability Application &amp; Edge Network</td>
                    <td className="p-3">DDoS mitigation, automatic failover, TLS 1.3 encrypted HTTP routing</td>
                    <td className="p-3">Regional Low-Latency Edge Nodes</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              StaffPulse does <strong>not sell, monetize, or share</strong> employee personal information with any data brokers, advertising networks, or unauthorized third parties.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-center font-bold">6</span>
              <span>Data Protection Officer (DPO) Contact</span>
            </h2>
            <p>
              For statutory compliance inquiries, Data Processing Agreement (DPA) execution, or Right-to-Erasure requests, organizations may contact our compliance team:
            </p>
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs space-y-1">
              <p className="font-bold text-[var(--text-primary)]">StaffPulse Data Protection &amp; Compliance Office</p>
              <p className="text-[var(--text-muted)]">Email: compliance@staffpulse.io</p>
              <p className="text-[var(--text-muted)]">Response Time: Within 24 business hours for statutory compliance notices</p>
            </div>
          </section>
        </div>

        {/* Footer Support Navigation */}
        <div className="pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-[var(--text-primary)] underline">
              Terms of Service
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
