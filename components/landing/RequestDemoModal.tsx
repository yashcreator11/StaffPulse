'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Loader2,
  Sparkles,
  Phone,
  Mail,
  Building,
  Users,
  Clock,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

interface RequestDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RequestDemoModal({ isOpen, onClose }: RequestDemoModalProps) {
  const [step, setStep] = useState<1 | 2>(1);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [employeeCount, setEmployeeCount] = useState('50-200');
  const [phone, setPhone] = useState('');
  const [hardwareBrand, setHardwareBrand] = useState('eSSL');
  const [preferredSlot, setPreferredSlot] = useState('Morning (10:00 AM - 1:00 PM IST)');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  function handleNextStep(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !email.trim() || !companyName.trim()) {
      setError('Please provide your name, work email, and company name.');
      return;
    }
    // Basic email check
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid work email address.');
      return;
    }
    setStep(2);
  }

  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/demo/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          companyName,
          employeeCount,
          phone,
          hardwareBrand,
          preferredSlot,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit request. Please try again.');
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  function handleResetAndClose() {
    setStep(1);
    setSubmitted(false);
    setError(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-150 overflow-hidden">
      <div
        className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative top bar */}
        <div className="h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-blue-600 shrink-0" />

        {/* Close button */}
        <button
          onClick={handleResetAndClose}
          className="absolute top-3.5 right-3.5 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--bg-elevated)] transition-colors z-10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 sm:p-7 overflow-y-auto no-scrollbar">
          {submitted ? (
            <div className="text-center py-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-[var(--text-primary)]">Demo Slot Reserved!</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1.5 max-w-sm mx-auto leading-relaxed">
                  Thank you, <span className="font-semibold text-[var(--text-primary)]">{fullName}</span>. An invite has been queued for <span className="font-semibold text-[var(--text-primary)]">{email}</span>.
                </p>
              </div>

              <div className="bg-[var(--bg-elevated)] p-3.5 rounded-xl border border-[var(--border)] text-left text-xs space-y-1.5 text-[var(--text-secondary)]">
                <div className="flex items-center gap-1.5 text-emerald-500 font-semibold text-[11px] uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Scheduled Session:</span>
                </div>
                <p>• <strong>Preferred Window:</strong> {preferredSlot}</p>
                <p>• <strong>Hardware Profile:</strong> {hardwareBrand} Biometric Ingestion</p>
                <p>• <strong>Organization:</strong> {companyName} ({employeeCount} staff)</p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleResetAndClose}
                  className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs transition-all shadow-md"
                >
                  Back to Showcase
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Header & Step Indicator */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                    <Sparkles className="w-3 h-3" />
                    <span>15-Min Live Demo</span>
                  </div>
                  <div className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1.5">
                    <span className={step === 1 ? 'text-[var(--accent)] font-extrabold' : 'text-[var(--text-dim)]'}>
                      1. Info
                    </span>
                    <span className="text-[var(--text-dim)]">/</span>
                    <span className={step === 2 ? 'text-[var(--accent)] font-extrabold' : 'text-[var(--text-dim)]'}>
                      2. Schedule
                    </span>
                  </div>
                </div>

                <h3 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
                  {step === 1 ? 'Schedule Your StaffPulse Demo' : 'Select Time & Hardware Preferences'}
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {step === 1
                    ? 'Get a tailored walkthrough with a biometric & payroll compliance specialist.'
                    : 'Tell us your hardware device so we can customize the live ingestion preview.'}
                </p>
              </div>

              {error && (
                <div className="mb-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium">
                  {error}
                </div>
              )}

              {/* STEP 1: Personal & Company Info */}
              {step === 1 && (
                <form onSubmit={handleNextStep} className="space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                        Full Name <span className="text-orange-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Priya Sharma"
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                        Work Email <span className="text-orange-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="priya@company.com"
                          className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                        />
                        <Mail className="w-3.5 h-3.5 text-[var(--text-dim)] absolute left-2.5 top-2.5" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                        Company Name <span className="text-orange-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Acme Enterprises"
                          className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                        />
                        <Building className="w-3.5 h-3.5 text-[var(--text-dim)] absolute left-2.5 top-2.5" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                        Team Size
                      </label>
                      <div className="relative">
                        <select
                          value={employeeCount}
                          onChange={(e) => setEmployeeCount(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all appearance-none cursor-pointer"
                        >
                          <option value="10-50">10 – 50 Staff</option>
                          <option value="50-200">50 – 200 Staff</option>
                          <option value="200-500">200 – 500 Staff</option>
                          <option value="500-1500">500 – 1,500 Staff</option>
                          <option value="1500+">1,500+ Staff (Enterprise)</option>
                        </select>
                        <Users className="w-3.5 h-3.5 text-[var(--text-dim)] absolute left-2.5 top-2.5 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <span>Continue to Slot Selection</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <p className="text-[10px] text-center text-[var(--text-dim)] mt-2">
                      Zero spam. We never share your contact details.
                    </p>
                  </div>
                </form>
              )}

              {/* STEP 2: Meeting Preferences & Hardware */}
              {step === 2 && (
                <form onSubmit={handleFinalSubmit} className="space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                        Biometric Hardware
                      </label>
                      <select
                        value={hardwareBrand}
                        onChange={(e) => setHardwareBrand(e.target.value)}
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all appearance-none cursor-pointer"
                      >
                        <option value="eSSL">eSSL Security</option>
                        <option value="Matrix COSEC">Matrix COSEC</option>
                        <option value="ZKTeco">ZKTeco Biometrics</option>
                        <option value="Realtime Timewatch">Realtime Timewatch</option>
                        <option value="Mantra Softech">Mantra Softech</option>
                        <option value="BioMax">BioMax</option>
                        <option value="Custom / Other CSV">Other CSV / Custom Device</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                        Preferred Window
                      </label>
                      <div className="relative">
                        <select
                          value={preferredSlot}
                          onChange={(e) => setPreferredSlot(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all appearance-none cursor-pointer"
                        >
                          <option value="Morning (10:00 AM - 1:00 PM IST)">Morning (10 AM – 1 PM)</option>
                          <option value="Afternoon (2:00 PM - 5:00 PM IST)">Afternoon (2 PM – 5 PM)</option>
                          <option value="Evening (5:00 PM - 7:30 PM IST)">Evening (5 PM – 7:30 PM)</option>
                          <option value="Next Working Day">Earliest Next Working Day</option>
                        </select>
                        <Clock className="w-3.5 h-3.5 text-[var(--text-dim)] absolute left-2.5 top-2.5 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                        Phone Number <span className="text-[var(--text-dim)]">(Optional)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                        />
                        <Phone className="w-3.5 h-3.5 text-[var(--text-dim)] absolute left-2.5 top-2.5" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                        Notes <span className="text-[var(--text-dim)]">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. 2 branch offices"
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] hover:bg-[var(--border)] text-[var(--text-secondary)] font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Reserving Slot...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Confirm 15-Min Live Demo</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
