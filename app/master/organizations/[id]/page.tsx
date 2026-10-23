'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Building2,
  Users,
  Shield,
  ArrowLeft,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  Loader2,
  Mail,
  Sliders,
  ExternalLink,
  Copy,
  Check,
  Activity,
  Layers,
  FileText,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Database,
  Plus,
} from 'lucide-react';

interface OrgDetails {
  id: string;
  name: string;
  slug: string;
  plan: 'plan1' | 'plan2' | 'plan3';
  status: 'trial' | 'active' | 'past_due' | 'grace_period' | 'read_only' | 'suspended' | 'cancelled';
  seat_limit: number;
  trial_ends_at: string | null;
  suspended_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AdminContact {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export default function OrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orgId = params.id;

  const [org, setOrg] = useState<OrgDetails | null>(null);
  const [metrics, setMetrics] = useState<{ employeeCount: number; officeCount: number; uploadCount: number } | null>(null);
  const [admins, setAdmins] = useState<AdminContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);

  // Active Tab: 'overview' | 'subscription' | 'onboarding' | 'features' | 'notes' | 'security'
  const [activeTab, setActiveTab] = useState<'overview' | 'subscription' | 'onboarding' | 'features' | 'notes' | 'security'>('overview');

  // Status Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<'suspended' | 'active'>('suspended');
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Plan update state
  const [selectedPlan, setSelectedPlan] = useState<'plan1' | 'plan2' | 'plan3'>('plan1');
  const [seatLimit, setSeatLimit] = useState(100);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planSaveSuccess, setPlanSaveSuccess] = useState(false);

  // V2 Notes & Feature Flags state
  const [notes, setNotes] = useState<Array<{ id: string; author_email: string; note: string; created_at: string }>>([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<Array<{ id: string; feature_key: string; is_enabled: boolean }>>([]);

  // Onboarding Funnel & Usage Snapshots
  const [funnel, setFunnel] = useState<Array<{ stage: string; label: string; isCompleted: boolean; completedAt: string | null }>>([]);
  const [usageHistory, setUsageHistory] = useState<Array<{ id: string; snapshot_date: string; active_employees: number; total_leaves_recorded: number; total_punches: number; storage_mb: number }>>([]);
  const [capturingSnapshot, setCapturingSnapshot] = useState(false);

  const fetchOrgDetails = React.useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/master/organizations/${orgId}`);
      const data = await res.json();
      if (res.ok) {
        setOrg(data.organization);
        setMetrics(data.metrics);
        setAdmins(data.adminContacts || []);
        setSelectedPlan(data.organization.plan);
        setSeatLimit(data.organization.seat_limit || 100);
      }

      // Fetch Notes, Feature Flags, Onboarding Funnel, and Usage Snapshots
      const [notesRes, flagsRes, funnelRes, usageRes] = await Promise.all([
        fetch(`/api/master/notes?orgId=${orgId}`),
        fetch(`/api/master/feature-flags?orgId=${orgId}`),
        fetch(`/api/master/organizations/${orgId}/onboarding`),
        fetch(`/api/master/organizations/${orgId}/usage?limit=10`),
      ]);
      if (notesRes.ok) {
        const nData = await notesRes.json();
        setNotes(nData.notes || []);
      }
      if (flagsRes.ok) {
        const fData = await flagsRes.json();
        setFeatureFlags(fData.featureFlags || []);
      }
      if (funnelRes.ok) {
        const fnData = await funnelRes.json();
        setFunnel(fnData.funnel || []);
      }
      if (usageRes.ok) {
        const uData = await usageRes.json();
        setUsageHistory(uData.history || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchOrgDetails();
  }, [fetchOrgDetails]);

  const handleCopyId = () => {
    if (org?.id) {
      navigator.clipboard.writeText(org.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/master/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          confirmation: typedConfirmation,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to update organization status');
      } else {
        setShowStatusModal(false);
        setTypedConfirmation('');
        fetchOrgDetails();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error updating status');
    } finally {
      setUpdating(false);
    }
  };

  const handleSavePlan = async () => {
    setSavingPlan(true);
    setPlanSaveSuccess(false);
    try {
      const res = await fetch(`/api/master/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          seat_limit: seatLimit,
        }),
      });
      if (res.ok) {
        setPlanSaveSuccess(true);
        setTimeout(() => setPlanSaveSuccess(false), 3000);
        fetchOrgDetails();
      }
    } catch {
      // ignore
    } finally {
      setSavingPlan(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[var(--text-muted)]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm font-semibold">Loading tenant details…</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="text-center py-16 space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold">Organization Not Found</h2>
        <Link href="/master" className="text-sm text-indigo-500 hover:underline">
          Return to organizations directory
        </Link>
      </div>
    );
  }

  const isSuspended = org.status === 'suspended';
  const seatUtilization = Math.round(((metrics?.employeeCount ?? 0) / (org.seat_limit || 100)) * 100);

  const planBadge = (p: string) => {
    switch (p) {
      case 'plan3':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25">
            Enterprise Tier
          </span>
        );
      case 'plan2':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25">
            Pro Growth Tier
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            Starter Tier
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Breadcrumb Navigation ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <Link href="/master" className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Organizations</span>
        </Link>
        <span>/</span>
        <span className="font-bold text-[var(--text-primary)]">{org.name}</span>
      </div>

      {/* ── Executive Header Banner ─────────────────────────────────────── */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                {org.name}
              </h1>
              {planBadge(org.plan)}
              {isSuspended ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/25">
                  Suspended
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  Active
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)] mt-1.5 font-mono">
              <span>slug: <strong>{org.slug}</strong></span>
              <span>·</span>
              <button
                onClick={handleCopyId}
                className="inline-flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                title="Copy UUID to clipboard"
              >
                <span>ID: {org.id.slice(0, 8)}…{org.id.slice(-4)}</span>
                {copiedId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
              <span>·</span>
              <span>Created {new Date(org.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Link
            href={`/?org=${org.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] transition-all shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Launch Workspace</span>
          </Link>

          {isSuspended ? (
            <button
              onClick={() => {
                setTargetStatus('active');
                setShowStatusModal(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Reactivate</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setTargetStatus('suspended');
                setShowStatusModal(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Suspend</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Key Stat Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Headcount Utilization */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-semibold">Headcount Utilization</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--text-primary)]">
            {metrics?.employeeCount ?? 0}{' '}
            <span className="text-sm font-normal text-[var(--text-muted)]">/ {org.seat_limit} seats</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--bg-surface)] overflow-hidden border border-[var(--border)]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                seatUtilization >= 95
                  ? 'bg-red-500'
                  : seatUtilization >= 80
                  ? 'bg-amber-500'
                  : 'bg-indigo-600'
              }`}
              style={{ width: `${Math.min(seatUtilization, 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-[var(--text-muted)] pt-0.5">
            {seatUtilization}% of allocated capacity used
          </p>
        </div>

        {/* Physical Office Locations */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-semibold">Configured Offices</span>
            <Building2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--text-primary)]">
            {metrics?.officeCount ?? 0}
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Active biometric punch terminal locations
          </p>
        </div>

        {/* Biometric Upload History */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-semibold">Biometric Attendance Months</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--text-primary)]">
            {metrics?.uploadCount ?? 0}
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Monthly attendance sheets processed
          </p>
        </div>
      </div>

      {/* ── Sub-navigation Tabs ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'Resource Usage', icon: Activity },
          { id: 'subscription', label: 'Plan & Billing', icon: Sliders },
          { id: 'onboarding', label: 'Adoption Stepper', icon: Layers },
          { id: 'features', label: 'Feature Flags', icon: Sparkles },
          { id: 'notes', label: `Support Notes (${notes.length})`, icon: FileText },
          { id: 'security', label: 'Admin Contacts & Security', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: OVERVIEW & USAGE SNAPSHOTS ───────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
            <div>
              <h2 className="font-extrabold text-base text-[var(--text-primary)]">
                Tenant Usage Snapshots &amp; Storage Footprint
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Daily aggregated metrics for capacity planning and compliance audits.
              </p>
            </div>
            <button
              type="button"
              disabled={capturingSnapshot}
              onClick={async () => {
                setCapturingSnapshot(true);
                try {
                  const res = await fetch(`/api/master/organizations/${orgId}/usage`, { method: 'POST' });
                  if (res.ok) {
                    const data = await res.json();
                    if (data.snapshot) {
                      setUsageHistory((prev) => [
                        data.snapshot,
                        ...prev.filter((p) => p.snapshot_date !== data.snapshot.snapshot_date),
                      ]);
                    }
                  }
                } finally {
                  setCapturingSnapshot(false);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            >
              {capturingSnapshot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{capturingSnapshot ? 'Capturing…' : 'Capture Snapshot Now'}</span>
            </button>
          </div>

          {usageHistory.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-muted)] text-xs">
              No snapshots recorded yet. Click &quot;Capture Snapshot Now&quot; to establish an initial benchmark.
            </div>
          ) : (
            <div className="border border-[var(--border)] rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-surface)] border-b border-[var(--border)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Snapshot Date</th>
                    <th className="p-3">Active Headcount</th>
                    <th className="p-3">Punches Recorded</th>
                    <th className="p-3">Leaves Recorded</th>
                    <th className="p-3 text-right">Storage Footprint</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[var(--text-primary)]">
                  {usageHistory.map((s) => (
                    <tr key={s.id || s.snapshot_date} className="hover:bg-[var(--bg-surface)]/50 transition-colors">
                      <td className="p-3 font-mono font-bold">{s.snapshot_date}</td>
                      <td className="p-3 font-semibold">{s.active_employees}</td>
                      <td className="p-3 text-[var(--text-muted)]">{s.total_punches.toLocaleString()}</td>
                      <td className="p-3 text-[var(--text-muted)]">{s.total_leaves_recorded}</td>
                      <td className="p-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {s.storage_mb} MB
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: PLAN & BILLING CONFIGURATION ─────────────────────────── */}
      {activeTab === 'subscription' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-5">
          <div className="pb-3 border-b border-[var(--border)]">
            <h2 className="font-extrabold text-base text-[var(--text-primary)]">
              Subscription Tier &amp; Capacity Quota
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Configure seat limits and feature tier entitlements for this workspace.
            </p>
          </div>

          {planSaveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Subscription tier and seat limit saved successfully!</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
                Current Subscription Tier
              </label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="plan1">Plan 1: Attendance Dashboard ($2.40/seat)</option>
                <option value="plan2">Plan 2: Attendance + Leave Engine ($2.00/seat)</option>
                <option value="plan3">Plan 3: Full Enterprise Suite ($1.80/seat)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
                Seat Capacity Limit
              </label>
              <input
                type="number"
                min={5}
                max={10000}
                value={seatLimit}
                onChange={(e) => setSeatLimit(parseInt(e.target.value, 10) || 50)}
                className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-[var(--border)]">
            <div className="text-xs text-[var(--text-muted)]">
              Estimated Monthly Value:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                $
                {(
                  (seatLimit || 100) *
                  (selectedPlan === 'plan3' ? 1.8 : selectedPlan === 'plan2' ? 2.0 : 2.4)
                ).toFixed(2)}
                /mo
              </strong>
            </div>

            <button
              onClick={handleSavePlan}
              disabled={savingPlan}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white flex items-center gap-1.5 shadow-md transition-all"
            >
              {savingPlan && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{savingPlan ? 'Saving Changes…' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 3: ONBOARDING LIFECYCLE STEPPER ─────────────────────────── */}
      {activeTab === 'onboarding' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div>
              <h2 className="font-extrabold text-base text-[var(--text-primary)]">
                Onboarding Lifecycle &amp; Adoption
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Track how quickly this customer reached time-to-value milestones.
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {funnel.filter((f) => f.isCompleted).length} / {funnel.length || 5} Completed
            </span>
          </div>

          <div className="space-y-3">
            {funnel.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">Loading onboarding milestones…</p>
            ) : (
              funnel.map((step, idx) => (
                <div
                  key={step.stage}
                  className={`flex items-start justify-between p-3.5 rounded-xl border text-xs transition ${
                    step.isCompleted
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-[var(--bg-surface)] border-[var(--border)] opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                        step.isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {step.isCompleted ? '✓' : idx + 1}
                    </div>
                    <div>
                      <p className={`font-bold ${step.isCompleted ? 'text-emerald-700 dark:text-emerald-300' : 'text-[var(--text-primary)]'}`}>
                        {step.label}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">{step.stage}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        step.isCompleted
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {step.isCompleted ? 'Completed' : 'Pending'}
                    </span>
                    {step.completedAt && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                        {new Date(step.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: FEATURE FLAGS ────────────────────────────────────────── */}
      {activeTab === 'features' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="pb-3 border-b border-[var(--border)]">
            <h2 className="font-extrabold text-base text-[var(--text-primary)]">
              Feature Entitlements &amp; Capabilities
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Toggle advanced integrations and capabilities dynamically for this customer.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                key: 'sso_google',
                label: 'Google Workspace Single Sign-On (SSO)',
                desc: 'Allow employees and admins to authenticate with their Google company account',
              },
              {
                key: 'sso_m365',
                label: 'Microsoft 365 OAuth Login',
                desc: 'Enable seamless Entra ID / Microsoft 365 enterprise identity logins',
              },
              {
                key: 'biometric_automapper',
                label: 'Universal Biometric CSV Auto-Mapper',
                desc: 'Automatically detect and normalize non-standard punch column exports',
              },
              {
                key: 'sandwich_rule_engine',
                label: 'Indian Labor Law Sandwich Rule Automation',
                desc: 'Auto-deduct intervening weekly offs when leaves flank weekends or holidays',
              },
              {
                key: 'advanced_analytics',
                label: 'Executive Bradford Factor & Absence Heatmaps',
                desc: 'Surfaces chronic unplanned absence rankings and fatigue alerts',
              },
            ].map(({ key, label, desc }) => {
              const flag = featureFlags.find((f) => f.feature_key === key);
              const isEnabled = flag ? flag.is_enabled : true;

              return (
                <div
                  key={key}
                  className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs"
                >
                  <div className="space-y-0.5 max-w-lg">
                    <p className="font-bold text-[var(--text-primary)] text-sm">{label}</p>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{desc}</p>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono">{key}</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const nextVal = !isEnabled;
                      await fetch('/api/master/feature-flags', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orgId, featureKey: key, isEnabled: nextVal }),
                      });
                      setFeatureFlags((prev) =>
                        prev.map((f) => (f.feature_key === key ? { ...f, is_enabled: nextVal } : f))
                      );
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      isEnabled
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {isEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 5: SUPPORT & OPS NOTES ─────────────────────────────────── */}
      {activeTab === 'notes' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="pb-3 border-b border-[var(--border)]">
            <h2 className="font-extrabold text-base text-[var(--text-primary)]">
              Platform Support &amp; Sales Notes
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Internal private log for platform administrators. Never visible to tenant users.
            </p>
          </div>

          {/* New Note Composer */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Log an internal ops note (e.g. customer requested custom shift grace period)…"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            <button
              type="button"
              disabled={addingNote || !newNote.trim()}
              onClick={async () => {
                setAddingNote(true);
                try {
                  const res = await fetch('/api/master/notes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orgId, note: newNote }),
                  });
                  const data = await res.json();
                  if (res.ok) {
                    setNotes((prev) => [data.note, ...prev]);
                    setNewNote('');
                  }
                } finally {
                  setAddingNote(false);
                }
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-40 shadow-sm"
            >
              {addingNote ? 'Adding…' : 'Add Note'}
            </button>
          </div>

          <div className="space-y-3 mt-4">
            {notes.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-6 text-center">No internal notes logged yet.</p>
            ) : (
              notes.map((n) => (
                <div
                  key={n.id}
                  className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs space-y-1"
                >
                  <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
                    <span className="font-bold text-[var(--text-primary)]">{n.author_email}</span>
                    <span className="font-mono">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-[var(--text-secondary)] leading-relaxed pt-1">{n.note}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── TAB 6: ADMIN CONTACTS & DANGER ZONE ─────────────────────────── */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Tenant HR Admins List */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="pb-3 border-b border-[var(--border)]">
              <h2 className="font-extrabold text-base text-[var(--text-primary)]">
                Tenant HR Administrators &amp; Primary Contacts
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Authorized accounts with administrative privileges in this tenant workspace.
              </p>
            </div>

            {admins.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4">No HR admins registered yet.</p>
            ) : (
              <div className="space-y-3">
                {admins.map((adm) => (
                  <div
                    key={adm.id}
                    className="p-3.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">{adm.full_name}</p>
                      <p className="text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3" /> {adm.email}
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      {adm.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 space-y-3">
            <h3 className="font-bold text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Danger Zone: Tenant Suspension</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-xl">
              Suspending an organization immediately blocks all employees from logging in or calling API endpoints.
              All biometric records and leave ledger transactions remain preserved for audit compliance.
            </p>
            <div className="pt-2">
              {isSuspended ? (
                <button
                  onClick={() => {
                    setTargetStatus('active');
                    setShowStatusModal(true);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  Reactivate Organization Access
                </button>
              ) : (
                <button
                  onClick={() => {
                    setTargetStatus('suspended');
                    setShowStatusModal(true);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm"
                >
                  Suspend Organization Immediately
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Typed Confirmation Modal for Suspend/Reactivate ────────────── */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-extrabold text-base">
                Confirm {targetStatus === 'suspended' ? 'Tenant Suspension' : 'Tenant Reactivation'}
              </h3>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {targetStatus === 'suspended'
                ? `Suspending ${org.name} will immediately lock access for all its users. Database records remain intact.`
                : `Reactivating ${org.name} will restore immediate login access for all users.`}
            </p>

            <form onSubmit={handleStatusChange} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Type <strong>{targetStatus === 'suspended' ? 'SUSPEND' : 'REACTIVATE'}</strong> to confirm:
                </label>
                <input
                  type="text"
                  required
                  placeholder={targetStatus === 'suspended' ? 'SUSPEND' : 'REACTIVATE'}
                  value={typedConfirmation}
                  onChange={(e) => setTypedConfirmation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-500 text-xs rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusModal(false);
                    setTypedConfirmation('');
                    setErrorMsg('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || typedConfirmation !== (targetStatus === 'suspended' ? 'SUSPEND' : 'REACTIVATE')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 ${
                    targetStatus === 'suspended' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  } disabled:opacity-50 shadow-md`}
                >
                  {updating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm {targetStatus === 'suspended' ? 'Suspension' : 'Reactivation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
