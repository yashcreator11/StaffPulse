'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Shield,
  Clock,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Users,
  ChevronDown,
  Layers,
  Calendar,
  Lock,
  Cpu,
  Fingerprint,
  FileCheck2,
  TrendingUp,
  Building2,
  ChevronRight,
} from 'lucide-react';
import RequestDemoModal from './RequestDemoModal';
import RoiCalculator from './RoiCalculator';
import PricingMatrix from './PricingMatrix';

export default function LandingPage() {
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'mapper' | 'capacity' | 'sandwich' | 'payable'>('sandwich');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState(null, '', `#${id}`);
      }
    }
  };

  const faqs = [
    {
      q: 'Do we need to replace our existing biometric hardware time-clocks?',
      a: 'Not at all. StaffPulse works out-of-the-box with all leading biometric brands including eSSL, Matrix COSEC, ZKTeco, Realtime Timewatch, Mantra, and BioMax. If your device exports raw punches to CSV, Excel, or SQL, our smart column mapper reads and normalizes it automatically in seconds.',
    },
    {
      q: 'How does StaffPulse automate Indian labor law sandwich rules?',
      a: 'If an employee takes leave on Friday and Monday (or before and after a public holiday), StaffPulse automatically calculates the intervening weekly offs/holidays as leave days based on your configured organization policy. No more manual calendar cross-checking in Excel.',
    },
    {
      q: 'Is our company data compliant with the Indian DPDP Act 2023?',
      a: 'Yes. Every organization is isolated with PostgreSQL Row Level Security (RLS) policies. All biometric records are encrypted with AES-256 at rest and TLS 1.3 in transit. We support data residency, role-gated access, and compliant Right-to-Erasure workflows.',
    },
    {
      q: 'Can we integrate attendance and leave records into our payroll software?',
      a: 'Absolutely. StaffPulse generates a clean, audit-ready "Payable Days" summary compatible with all major payroll systems including Tally, GreytHR, Keka, Zoho Payroll, Darwinbox, and SAP.',
    },
    {
      q: 'How fast can our HR team get up and running?',
      a: 'Under 5 minutes. You can invite employees, configure your weekly off rules, and drop your first raw biometric CSV export to immediately see attendance heatmaps, late mark rankings, and leave metrics.',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans antialiased selection:bg-[var(--accent)] selection:text-white pt-16">
      {/* ── Top Navigation Bar (Fixed / Sticky Header) ─────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-surface)]/90 backdrop-blur-md border-b border-[var(--border)] shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Tagline Pill */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-[var(--text-primary)]">
                  StaffPulse
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="System Live" />
              </div>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[var(--text-secondary)]">
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-[var(--text-primary)] transition-colors">Features</a>
            <a href="#hardware" onClick={(e) => scrollToSection(e, 'hardware')} className="hover:text-[var(--text-primary)] transition-colors">Hardware</a>
            <a href="#calculator" onClick={(e) => scrollToSection(e, 'calculator')} className="hover:text-[var(--text-primary)] transition-colors">ROI Calculator</a>
            <a href="#comparison" onClick={(e) => scrollToSection(e, 'comparison')} className="hover:text-[var(--text-primary)] transition-colors">Comparison</a>
            <a href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')} className="hover:text-[var(--text-primary)] transition-colors">Pricing</a>
            <a href="#security" onClick={(e) => scrollToSection(e, 'security')} className="hover:text-[var(--text-primary)] transition-colors">Trust &amp; DPDP</a>
            <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} className="hover:text-[var(--text-primary)] transition-colors">FAQ</a>
          </nav>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-transparent hover:border-[var(--border)] transition-all"
            >
              Sign In
            </Link>
            <button
              onClick={() => setDemoModalOpen(true)}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5"
            >
              <span>Request Demo</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section (Above The Fold) ─────────────────────────────────── */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 overflow-hidden">
        {/* Subtle background ambient gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-orange-500/15 via-amber-500/10 to-blue-500/15 blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          
          {/* Brand Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
            <Sparkles className="w-3.5 h-3.5" />
            <span>From Biometric Punch to Payroll Compliance — Effortlessly</span>
          </div>

          {/* High-Converting Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[var(--text-primary)] tracking-tight max-w-4xl mx-auto leading-[1.12]">
            Stop wrestling with raw biometric CSVs and manual leave spreadsheets.
          </h1>

          {/* Subtitle / Value Proposition */}
          <p className="text-base sm:text-lg text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
            StaffPulse connects your biometric time clocks, automates Indian statutory sandwich rules, resolves punch discrepancies, and exports audit-ready payroll payable days in minutes.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-sm shadow-xl shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
            >
              <span>Start 14-Day Free Trial</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={() => setDemoModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4 text-orange-500" />
              <span>Book a Live Demo</span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-[var(--text-dim)] pt-1">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Universal hardware compatibility
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              DPDP Act 2023 ready
            </span>
          </div>

          {/* ── Interactive Hero Product Preview (Glassmorphic Mockup) ─────── */}
          <div className="pt-8 sm:pt-12 max-w-5xl mx-auto">
            <div className="bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
              
              {/* Fake Window Controls */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-[11px] font-mono text-[var(--text-dim)] ml-2">
                    staffpulse.app/dashboard • Enterprise Live View
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Biometrics Connected
                  </span>
                </div>
              </div>

              {/* Mock Dashboard Top KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 text-left">
                <div className="p-3.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)]">
                  <div className="text-[11px] font-medium text-[var(--text-muted)]">Attendance Rate</div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">98.2%</div>
                  <div className="text-[10px] text-emerald-500 font-medium">↑ 1.4% vs last month</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)]">
                  <div className="text-[11px] font-medium text-[var(--text-muted)]">Present Today</div>
                  <div className="text-xl sm:text-2xl font-black text-[var(--text-primary)] mt-0.5">142 <span className="text-xs font-normal text-[var(--text-muted)]">/ 148</span></div>
                  <div className="text-[10px] text-[var(--text-dim)]">Biometric Verified</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)]">
                  <div className="text-[11px] font-medium text-[var(--text-muted)]">Approved Leave</div>
                  <div className="text-xl sm:text-2xl font-black text-blue-500 mt-0.5">4 Staff</div>
                  <div className="text-[10px] text-blue-400">2 PL · 1 CL · 1 WFH</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)]">
                  <div className="text-[11px] font-medium text-[var(--text-muted)]">Late Exceedances</div>
                  <div className="text-xl sm:text-2xl font-black text-amber-500 mt-0.5">2 Late</div>
                  <div className="text-[10px] text-amber-400 font-medium">Auto-Flagged (15m grace)</div>
                </div>
              </div>

              {/* Mock Live Biometric Punch Ticker & Heatmap Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-left">
                {/* Left: Punch Ticker */}
                <div className="md:col-span-5 bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--border)] space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)] pb-2 border-b border-[var(--border)]">
                    <span className="flex items-center gap-1.5">
                      <Fingerprint className="w-3.5 h-3.5 text-orange-500" />
                      Live Hardware Stream
                    </span>
                    <span className="text-[10px] text-[var(--text-dim)] font-mono">eSSL i9C Pro</span>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">Rahul Deshmukh</div>
                        <div className="text-[10px] text-[var(--text-dim)]">Operations · Biometric Face</div>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-500">09:14 AM In</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">Sneha Nair</div>
                        <div className="text-[10px] text-[var(--text-dim)]">Engineering · Fingerprint</div>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-500">09:28 AM In</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">Amit Patel</div>
                        <div className="text-[10px] text-[var(--text-dim)]">Finance · Card Punch</div>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-500">09:47 AM Late</span>
                    </div>
                  </div>
                </div>

                {/* Right: Automated Sandwich Rule & Payroll Badge */}
                <div className="md:col-span-7 bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--border)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)] pb-2 border-b border-[var(--border)]">
                      <span className="flex items-center gap-1.5">
                        <FileCheck2 className="w-3.5 h-3.5 text-blue-500" />
                        Statutory Compliance Engine
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        Sandwich Rule Enforced
                      </span>
                    </div>

                    <div className="mt-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-[var(--text-secondary)]">Case: Friday + Monday Leave</span>
                        <span className="text-orange-500 font-bold">2 Days Requested</span>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                        Under Indian statutory sandwich rule, intervening Saturday &amp; Sunday are automatically accounted as <strong>4 Payable Deductions</strong>.
                      </div>
                      <div className="pt-1 flex items-center gap-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Saved ₹4,200 in manual unapplied payroll deductions</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>Payable Days Sheet:</span>
                    <span className="font-mono text-emerald-500 font-bold">148 Employees Synced</span>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ── Hardware Compatibility Strip ─────────────────────────────────── */}
      <section id="hardware" className="scroll-mt-20 py-10 border-y border-[var(--border)] bg-[var(--bg-card)]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Universal Biometric Hardware &amp; Format Compatibility
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-[var(--text-secondary)] font-bold text-sm sm:text-base">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
              <Cpu className="w-4 h-4 text-orange-500" />
              <span>eSSL Security</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
              <Cpu className="w-4 h-4 text-blue-500" />
              <span>Matrix COSEC</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
              <Cpu className="w-4 h-4 text-emerald-500" />
              <span>ZKTeco Biometrics</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
              <Cpu className="w-4 h-4 text-purple-500" />
              <span>Realtime Timewatch</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
              <Cpu className="w-4 h-4 text-amber-500" />
              <span>Mantra Softech</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
              <Cpu className="w-4 h-4 text-rose-500" />
              <span>BioMax</span>
            </div>
          </div>
          <p className="text-center text-xs text-[var(--text-dim)] mt-4">
            Plus universal smart CSV / Excel auto-mapping for any custom device or SQL attendance database.
          </p>
        </div>
      </section>

      {/* ── Feature Simulators (4 Interactive Tabs) ───────────────────────── */}
      <section id="features" className="scroll-mt-20 py-20 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
            <Layers className="w-3.5 h-3.5" />
            <span>Interactive Platform Engines</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Engineered for Real-World Factory &amp; Corporate Workflows
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-muted)]">
            Explore how StaffPulse automates the four biggest operational headaches of attendance management.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('sandwich')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'sandwich'
                ? 'bg-[var(--accent)] text-white shadow-md'
                : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Sandwich Rule Engine</span>
          </button>

          <button
            onClick={() => setActiveTab('mapper')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'mapper'
                ? 'bg-[var(--accent)] text-white shadow-md'
                : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>CSV Auto-Mapper</span>
          </button>

          <button
            onClick={() => setActiveTab('capacity')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'capacity'
                ? 'bg-[var(--accent)] text-white shadow-md'
                : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Team Capacity Calendar</span>
          </button>

          <button
            onClick={() => setActiveTab('payable')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'payable'
                ? 'bg-[var(--accent)] text-white shadow-md'
                : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Payable Days Sheet</span>
          </button>
        </div>

        {/* Active Tab Content Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 sm:p-10 shadow-xl max-w-5xl mx-auto">
          {activeTab === 'sandwich' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">
                    Automated Indian Labor Law Sandwich Rule Calculation
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
                    When employees bracket a weekend or gazetted holiday with leave, StaffPulse automatically counts the intervening days without human oversight.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 shrink-0">
                  Zero Excel Reconciliation
                </span>
              </div>

              {/* Visual Timeline of Sandwich Rule */}
              <div className="grid grid-cols-5 gap-2 sm:gap-3 text-center pt-4">
                <div className="p-3 sm:p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30">
                  <div className="text-[11px] font-bold text-orange-500 uppercase">Friday</div>
                  <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] mt-1">Paid Leave (PL)</div>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-white">1 Day Deducted</span>
                </div>

                <div className="p-3 sm:p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/40 relative">
                  <div className="text-[11px] font-bold text-red-500 uppercase">Saturday</div>
                  <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] mt-1">Weekly Off</div>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white animate-pulse">Sandwich Leave!</span>
                </div>

                <div className="p-3 sm:p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/40 relative">
                  <div className="text-[11px] font-bold text-red-500 uppercase">Sunday</div>
                  <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] mt-1">Weekly Off</div>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white animate-pulse">Sandwich Leave!</span>
                </div>

                <div className="p-3 sm:p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30">
                  <div className="text-[11px] font-bold text-orange-500 uppercase">Monday</div>
                  <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] mt-1">Paid Leave (PL)</div>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-white">1 Day Deducted</span>
                </div>

                <div className="p-3 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="text-[11px] font-bold text-emerald-500 uppercase">Tuesday</div>
                  <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] mt-1">Biometric Punch</div>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-white">Present (09:15)</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>Result: Employee requested 2 days of PL. System compliant deduction: <strong>4 Total Days</strong>.</span>
                <span className="text-emerald-500 font-bold">100% Audit-Proof</span>
              </div>
            </div>
          )}

          {activeTab === 'mapper' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                  Smart Biometric Column Auto-Mapping
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
                  Upload raw attendance CSVs exported directly from machines. StaffPulse recognizes headers regardless of format or column order.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--border)] space-y-2">
                  <div className="font-bold text-red-500 flex items-center gap-1.5 font-sans">
                    <XCircle className="w-4 h-4" />
                    <span>Raw Unformatted Machine Export</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] overflow-x-auto text-[var(--text-dim)]">
                    USERID, LOGDATE, PUNCHTIME, DEVICEID<br />
                    1042, 2026-10-12, 09:14:22, ESSL_01<br />
                    1042, 2026-10-12, 13:02:11, ESSL_01<br />
                    1042, 2026-10-12, 18:32:05, ESSL_02
                  </div>
                </div>

                <div className="bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--border)] space-y-2">
                  <div className="font-bold text-emerald-500 flex items-center gap-1.5 font-sans">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>StaffPulse Auto-Calculated Pair</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-emerald-500/30 overflow-x-auto text-emerald-600 dark:text-emerald-400">
                    Emp: Rahul Deshmukh (EMP042)<br />
                    First In: 09:14 AM · Last Out: 06:32 PM<br />
                    Total Work Hours: 9 hrs 18 mins (COMPLIANT)<br />
                    Late Grace: Within 15-min tolerance
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'capacity' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                  Real-Time Team Capacity &amp; Shift Coverage
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
                  Managers see team availability and overlapping requests before hitting approve, preventing critical team understaffing.
                </p>
              </div>

              <div className="bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)]">
                  <span>Engineering Team • Diwali Week Coverage</span>
                  <span className="text-emerald-500">80% Minimum Threshold Met</span>
                </div>
                <div className="w-full bg-[var(--bg-card)] h-4 rounded-full overflow-hidden flex border border-[var(--border)]">
                  <div className="bg-emerald-500 h-full w-[82%]" title="Present Staff (82%)" />
                  <div className="bg-blue-500 h-full w-[12%]" title="Approved Leave (12%)" />
                  <div className="bg-amber-500 h-full w-[6%]" title="Pending Approval (6%)" />
                </div>
                <div className="flex justify-between text-[11px] text-[var(--text-dim)]">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> 28 Present
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> 4 Approved Leave
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> 2 Pending Review
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payable' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                  One-Click Payroll Payable Days Deduction File
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
                  No more merging attendance sheets with leave emails. Export ready-to-disburse salary days directly into your payroll software.
                </p>
              </div>

              <div className="overflow-x-auto border border-[var(--border)] rounded-2xl bg-[var(--bg-elevated)] text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[var(--bg-card)] text-[var(--text-muted)] font-semibold border-b border-[var(--border)]">
                    <tr>
                      <th className="p-3">Employee</th>
                      <th className="p-3">Total Month Days</th>
                      <th className="p-3">Present Days</th>
                      <th className="p-3">Paid Leaves</th>
                      <th className="p-3">Sandwich / Unpaid</th>
                      <th className="p-3 text-emerald-500">Payable Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-[var(--text-secondary)]">
                    <tr>
                      <td className="p-3 font-semibold text-[var(--text-primary)]">EMP001 · Vikram Roy</td>
                      <td className="p-3">31</td>
                      <td className="p-3">22</td>
                      <td className="p-3">2 (PL)</td>
                      <td className="p-3 text-red-500">0</td>
                      <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">31.0</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-[var(--text-primary)]">EMP014 · Deepa Menon</td>
                      <td className="p-3">31</td>
                      <td className="p-3">19</td>
                      <td className="p-3">1 (CL)</td>
                      <td className="p-3 text-red-500">3.0 (Sandwich LWP)</td>
                      <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">28.0</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Legacy Biometrics vs. StaffPulse Comparison ───────────────────── */}
      <section id="comparison" className="scroll-mt-20 py-20 bg-[var(--bg-card)]/50 border-y border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-500">
              Why Companies Upgrade
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
              The Old Way vs. StaffPulse
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Traditional desktop biometric tools weren&apos;t built for remote leads, sandwich rules, or Indian DPDP privacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* The Old Way */}
            <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 space-y-5">
              <div className="flex items-center gap-2 pb-4 border-b border-[var(--border)] text-red-500 font-bold text-lg">
                <XCircle className="w-5 h-5 shrink-0" />
                <span>Legacy Desktop Software &amp; Spreadsheets</span>
              </div>
              <ul className="space-y-4 text-xs sm:text-sm text-[var(--text-secondary)]">
                <li className="flex items-start gap-2.5">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>Installed on a single office PC; inaccessible to employees or remote managers.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>Manual VLOOKUP in Excel to check if a Friday absence was bracketed by Monday leave.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>Endless WhatsApp messages and emails requesting attendance regularization.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>Takes 3 to 5 full working days at month-end to reconcile payable days before payroll run.</span>
                </li>
              </ul>
            </div>

            {/* StaffPulse Way */}
            <div className="bg-[var(--bg-card)] border-2 border-[var(--accent)] rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-2 pb-4 border-b border-[var(--border)] text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>The StaffPulse Automated Cloud Standard</span>
              </div>
              <ul className="space-y-4 text-xs sm:text-sm text-[var(--text-secondary)]">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Cloud portal accessible by HR, Department Leads, and Staff on any smartphone or browser.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Sandwich rules automatically evaluated per Indian labor regulations in real-time.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>1-click self-service missed punch and regularization requests with audit logs.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Payroll Payable Days summary generated in 15 minutes, with zero formula errors.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive ROI & Savings Calculator ──────────────────── */}
      <section id="calculator" className="scroll-mt-20 py-20 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RoiCalculator />
      </section>

      {/* ── Pricing Matrix Section ───────────────────────────────────────── */}
      <section id="pricing" className="scroll-mt-20 py-20 sm:py-28 bg-[var(--bg-card)]/50 border-y border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <PricingMatrix onRequestDemo={() => setDemoModalOpen(true)} />
        </div>
      </section>

      {/* ── Enterprise Trust, Security & DPDP Compliance ──────────────────── */}
      <section id="security" className="scroll-mt-20 py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Lock className="w-3.5 h-3.5" />
            <span>Enterprise Grade Security</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Compliant with Indian DPDP Act 2023
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            Built from day one with multi-tenant database isolation, encryption at rest, and audit logs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-[var(--text-primary)] text-base">PostgreSQL Row-Level Security</h4>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Every organization operates within an isolated cryptographic boundary. No cross-tenant data leaks are mathematically possible at the database engine level.
            </p>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-[var(--text-primary)] text-base">AES-256 &amp; TLS 1.3 Encryption</h4>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              All biometric timestamp hashes, employee IDs, and personal records are encrypted in transit and at rest with regular automated backups.
            </p>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-[var(--text-primary)] text-base">Immutable Audit Trails</h4>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Every leave approval, attendance override, and biometric file upload is logged with an immutable actor and timestamp for labor court compliance.
            </p>
          </div>
        </div>

        <div className="text-center pt-2">
          <Link
            href="/privacy"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] hover:underline"
          >
            <span>Read Complete Zero-Raw-Biometric Privacy Policy &amp; DPDP Statement</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* ── Testimonials / Case Studies ──────────────────────────────────── */}
      <section className="py-20 bg-[var(--bg-card)]/50 border-y border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-500">Trusted By Leaders</span>
            <h2 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
              What Operations &amp; HR Directors Say
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[var(--bg-elevated)] p-6 rounded-3xl border border-[var(--border)] flex flex-col justify-between space-y-4">
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] italic leading-relaxed">
                &ldquo;StaffPulse reduced our monthly payroll preparation from 4 full days to just 45 minutes. Our biometric CSVs from 3 branch offices are mapped in seconds.&rdquo;
              </p>
              <div className="border-t border-[var(--border)] pt-3">
                <div className="font-bold text-xs text-[var(--text-primary)]">Kavita Iyer</div>
                <div className="text-[11px] text-[var(--text-muted)]">Head of People, TechMatrix Solutions (420 staff)</div>
              </div>
            </div>

            <div className="bg-[var(--bg-elevated)] p-6 rounded-3xl border border-[var(--border)] flex flex-col justify-between space-y-4">
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] italic leading-relaxed">
                &ldquo;The sandwich rule engine alone saved us over ₹3.4 Lakhs in unbilled leaves in our first quarter. The plant floor disputes about late arrivals completely disappeared.&rdquo;
              </p>
              <div className="border-t border-[var(--border)] pt-3">
                <div className="font-bold text-xs text-[var(--text-primary)]">Rajesh Verma</div>
                <div className="text-[11px] text-[var(--text-muted)]">Plant Operations Director, Precision Castings (780 staff)</div>
              </div>
            </div>

            <div className="bg-[var(--bg-elevated)] p-6 rounded-3xl border border-[var(--border)] flex flex-col justify-between space-y-4">
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] italic leading-relaxed">
                &ldquo;Having DPDP Act compliance and immutable audit logs gives our board complete peace of mind during internal statutory audits.&rdquo;
              </p>
              <div className="border-t border-[var(--border)] pt-3">
                <div className="font-bold text-xs text-[var(--text-primary)]">Ananya Sen</div>
                <div className="text-[11px] text-[var(--text-muted)]">Chief Compliance Officer, FinEdge Capital (1,100 staff)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive FAQ Accordion ─────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-20 py-20 sm:py-28 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    openFaq === idx ? 'rotate-180 text-[var(--accent)]' : 'text-[var(--text-dim)]'
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-4 pb-5 sm:px-5 text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed border-t border-[var(--border)] pt-3 animate-in fade-in duration-200">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom Pre-Footer CTA Banner ─────────────────────────────────── */}
      <section className="py-16 bg-gradient-to-br from-orange-600 to-amber-600 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Ready to automate biometric reconciliation and payroll compliance?
          </h2>
          <p className="text-base text-white/90 max-w-xl mx-auto">
            Join hundreds of HR and operations leaders saving dozens of hours every month with StaffPulse.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-white text-orange-600 font-extrabold text-sm shadow-xl hover:bg-neutral-100 transition-all"
            >
              Start 14-Day Free Trial
            </Link>
            <button
              onClick={() => setDemoModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-sm transition-all"
            >
              Schedule a 15-Min Live Demo
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="py-12 border-t border-[var(--border)] bg-[var(--bg-surface)] text-xs text-[var(--text-muted)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-orange-600 flex items-center justify-center text-white">
              <Fingerprint className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-[var(--text-primary)]">StaffPulse</span>
            <span>· From Biometric Punch to Payroll Compliance — Effortlessly.</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-[var(--text-primary)] transition-colors">Features</a>
            <a href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')} className="hover:text-[var(--text-primary)] transition-colors">Pricing</a>
            <a href="#security" onClick={(e) => scrollToSection(e, 'security')} className="hover:text-[var(--text-primary)] transition-colors">DPDP Compliance</a>
            <Link href="/terms" className="hover:text-[var(--text-primary)] transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-[var(--text-primary)] transition-colors">Privacy &amp; DPDP</Link>
            <Link href="/login" className="hover:text-[var(--text-primary)] font-semibold text-[var(--accent)]">
              Sign In →
            </Link>
          </div>
        </div>
      </footer>

      {/* ── Floating Sticky Demo Tour Pill ──────────────────────────────── */}
      <div className="fixed bottom-4 right-4 z-30 animate-in slide-in-from-bottom-4 duration-300">
        <button
          onClick={() => setDemoModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--bg-card)] border-2 border-[var(--accent)] text-[var(--text-primary)] shadow-2xl hover:bg-[var(--accent)] hover:text-white transition-all text-xs font-bold group"
        >
          <Sparkles className="w-4 h-4 text-orange-500 group-hover:text-white transition-colors" />
          <span>Book a 15-Min Demo</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Request Demo Modal ───────────────────────────────────────────── */}
      <RequestDemoModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
      />
    </div>
  );
}
