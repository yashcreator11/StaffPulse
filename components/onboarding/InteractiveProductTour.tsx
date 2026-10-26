'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  X,
  Cpu,
  BarChart3,
  Users,
  CalendarCheck,
  FileSpreadsheet,
  ShieldCheck,
  ExternalLink,
  RotateCcw
} from 'lucide-react';

export interface TourStep {
  title: string;
  badge: string;
  description: string;
  highlights: string[];
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  actionLabel?: string;
  actionHref?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Executive Command Center',
    badge: 'Step 1: Real-time Attendance',
    description:
      'Monitor expected vs. actual present staff, late arrivals, half-days, and department heatmaps in a single unified cockpit.',
    highlights: [
      'Live daily attendance rate updated from biometric clocks',
      'Instant breakdown of absent, on-leave, and WFH personnel',
      'Filterable by office branch, department, and custom date range',
    ],
    icon: BarChart3,
    accentColor: 'from-orange-500 to-amber-500',
    actionLabel: 'View Dashboard',
    actionHref: '/',
  },
  {
    title: 'Biometric Hardware & Push Sync',
    badge: 'Step 2: Zero Manual CSVs',
    description:
      'Connect eSSL, ZKTeco, Matrix, Realtime, or Hikvision machines directly over Wi-Fi/LAN, or run the 1-click Windows Sync Agent for legacy software.',
    highlights: [
      'Direct machine push: Enter Server URL into machine keypad',
      'Universal 5MB Windows Agent for eSSL eTimeTrackLite',
      'Real-time heartbeat indicators showing which machines are online',
    ],
    icon: Cpu,
    accentColor: 'from-blue-500 to-cyan-500',
    actionLabel: 'Configure Machines',
    actionHref: '/leave/admin/devices',
  },
  {
    title: 'Workforce & Multi-Branch Setup',
    badge: 'Step 3: Employee Master',
    description:
      'Organize your team across branches (Mumbai, Hyderabad, etc.), assign shifts, and manage employee profiles with automatic code mapping.',
    highlights: [
      'Bulk CSV employee import with automatic field mapping',
      'Department and team grouping for localized analytics',
      'Self-service employee portal for leave applications',
    ],
    icon: Users,
    accentColor: 'from-emerald-500 to-teal-500',
    actionLabel: 'Manage Employees',
    actionHref: '/leave/admin',
  },
  {
    title: 'Statutory Leave & Rule Engine',
    badge: 'Step 4: Automated Policy',
    description:
      'Configure company-specific leave types, automatic probation unlocks (e.g. 4 months), carry-forward rules, and Indian sandwich rule deductions.',
    highlights: [
      'Automatic weekend penalty for Sandwich leave (Friday + Monday absent)',
      'Probation period accrual locks parameter-driven per policy',
      'One-click manager review and authorization dashboard',
    ],
    icon: CalendarCheck,
    accentColor: 'from-purple-500 to-indigo-500',
    actionLabel: 'View Leave Engine',
    actionHref: '/leave/admin/config',
  },
  {
    title: '1-Click Payroll "Payable Days" Export',
    badge: 'Step 5: Month-End Payroll',
    description:
      'Eliminate 3 to 5 days of manual month-end Excel calculations with an audit-ready Payable Days summary sheet.',
    highlights: [
      'Calculates: Present + Paid Leave + Holidays - Unpaid Absences - Late Deductions',
      'Export directly formatted for Tally, GreytHR, Keka, Zoho Payroll, or Excel',
      'Clamps new joiners & prorated final settlement (FnF) values',
    ],
    icon: FileSpreadsheet,
    accentColor: 'from-amber-500 to-orange-600',
    actionLabel: 'Open Payroll Report',
    actionHref: '/leave/admin/reports/payable-days',
  },
  {
    title: 'Enterprise Compliance & Security',
    badge: 'Step 6: DPDP Act 2023',
    description:
      'Your workspace is protected by strict PostgreSQL Row-Level Security (RLS) tenant isolation and tamper-evident audit trails.',
    highlights: [
      'Zero raw biometric minutiae or fingerprint images stored',
      'Append-only compliance audit log tracking all edits and exports',
      'Full data export and data-subject deletion rights supported',
    ],
    icon: ShieldCheck,
    accentColor: 'from-rose-500 to-pink-500',
    actionLabel: 'Review Security',
    actionHref: '/leave/admin/compliance',
  },
];

interface InteractiveProductTourProps {
  orgId?: string;
  forceOpen?: boolean;
  onClose?: () => void;
}

export default function InteractiveProductTour({
  orgId = 'default_org',
  forceOpen = false,
  onClose,
}: InteractiveProductTourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const storageKey = `staffpulse_tour_completed_${orgId}`;

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      setCurrentStepIndex(0);
      return;
    }

    // Check if tour was already completed or dismissed
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      // Small delay on first load so user sees workspace layout before modal pops
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [forceOpen, storageKey]);

  function markCompleted() {
    localStorage.setItem(storageKey, 'true');
    setIsOpen(false);
    if (onClose) onClose();
  }

  function handleNext() {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      markCompleted();
    }
  }

  function handleBack() {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];
  const StepIcon = currentStep.icon;
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111827] border border-border rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden relative flex flex-col">
        {/* Top Accent Gradient Line */}
        <div className={`h-2 bg-gradient-to-r ${currentStep.accentColor} transition-all duration-300`} />

        {/* Header Strip */}
        <div className="p-6 pb-2 flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-accent/10 text-accent border border-accent/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Workspace Quickstart Tour</span>
          </div>

          <button
            onClick={markCompleted}
            title="Dismiss Tour"
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Content */}
        <div className="p-6 sm:p-8 space-y-6 flex-1">
          <div className="flex items-start gap-4">
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${currentStep.accentColor} text-white flex items-center justify-center shadow-lg flex-shrink-0`}
            >
              <StepIcon className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                {currentStep.badge}
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                {currentStep.title}
              </h3>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {currentStep.description}
          </p>

          {/* Highlights checklist */}
          <div className="bg-surface border border-border rounded-2xl p-4 space-y-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Key Capabilities:
            </div>
            {currentStep.highlights.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-foreground font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Navigation Strip */}
        <div className="p-6 bg-surface/50 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Step Progress Dots */}
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStepIndex(idx)}
                title={`Go to step ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStepIndex
                    ? 'w-7 bg-accent'
                    : idx < currentStepIndex
                    ? 'w-2 bg-emerald-500'
                    : 'w-2 bg-muted'
                }`}
              />
            ))}
            <span className="text-[11px] text-muted-foreground font-medium ml-2">
              {currentStepIndex + 1} of {TOUR_STEPS.length}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {currentStep.actionHref && (
              <Link
                href={currentStep.actionHref}
                onClick={markCompleted}
                className="px-3 py-2 text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1 mr-1"
              >
                <span>{currentStep.actionLabel}</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}

            {currentStepIndex > 0 && (
              <button
                onClick={handleBack}
                className="px-3 py-2 text-xs font-medium rounded-xl border border-border hover:bg-muted text-foreground flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-accent text-accent-foreground hover:opacity-90 flex items-center gap-1.5 shadow-md transition-opacity"
            >
              {isLast ? (
                <>
                  <span>Get Started</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
