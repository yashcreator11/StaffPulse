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
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchOrgDetails();
  }, [fetchOrgDetails]);

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
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error updating status');
    } finally {
      setUpdating(false);
    }
  };

  const handleSavePlan = async () => {
    setSavingPlan(true);
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
        <p className="text-sm">Loading organization details...</p>
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

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          href="/master"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Organizations
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{org.name}</h1>
              {isSuspended ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20">
                  Suspended
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] font-mono mt-1">Tenant ID: {org.id}</p>
          </div>
        </div>

        {/* Lifecycle Actions */}
        <div className="flex items-center gap-3">
          {isSuspended ? (
            <button
              onClick={() => {
                setTargetStatus('active');
                setShowStatusModal(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-sm transition-all"
            >
              <Unlock className="w-3.5 h-3.5" /> Reactivate Organization
            </button>
          ) : (
            <button
              onClick={() => {
                setTargetStatus('suspended');
                setShowStatusModal(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 shadow-sm transition-all"
            >
              <Lock className="w-3.5 h-3.5" /> Suspend Organization
            </button>
          )}
        </div>
      </div>

      {/* Aggregate Metrics Grid (DPDP Compliant - strictly metadata) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>Enrolled Headcount</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold">{metrics?.employeeCount ?? 0}</div>
          <p className="text-xs text-[var(--text-muted)] mt-1">Limit: {org.seat_limit} seats</p>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>Configured Offices</span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold">{metrics?.officeCount ?? 0}</div>
          <p className="text-xs text-[var(--text-muted)] mt-1">Physical locations</p>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>Attendance Months</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold">{metrics?.uploadCount ?? 0}</div>
          <p className="text-xs text-[var(--text-muted)] mt-1">Monthly punch files uploaded</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription & Plan Settings */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border)]">
            <Sliders className="w-4 h-4 text-indigo-500" />
            <h2 className="font-bold text-base">Plan &amp; Quota Configuration</h2>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Current Subscription Tier
              </label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value as any)}
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="plan1">Plan 1: Attendance Dashboard</option>
                <option value="plan2">Plan 2: Attendance + Leave Tracker</option>
                <option value="plan3">Plan 3: Full Suite (Self-Service &amp; Approvals)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Seat Capacity Limit
              </label>
              <input
                type="number"
                min={1}
                value={seatLimit}
                onChange={(e) => setSeatLimit(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-2">
              <button
                onClick={handleSavePlan}
                disabled={savingPlan}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-sm transition-all"
              >
                {savingPlan && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Subscription Changes
              </button>
            </div>
          </div>
        </div>

        {/* Tenant Administrator Contacts */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border)]">
            <Shield className="w-4 h-4 text-indigo-500" />
            <h2 className="font-bold text-base">Tenant HR Administrators</h2>
          </div>

          {admins.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-4">No active HR administrators found for this organization.</p>
          ) : (
            <div className="space-y-3">
              {admins.map((adm) => (
                <div
                  key={adm.id}
                  className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-semibold">{adm.full_name}</p>
                    <p className="text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" /> {adm.email}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md font-mono text-[11px] bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                    {adm.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Typed Confirmation Modal for Suspend/Reactivate */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-bold text-base">
                Confirm {targetStatus === 'suspended' ? 'Organization Suspension' : 'Organization Reactivation'}
              </h3>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {targetStatus === 'suspended'
                ? `Suspending ${org.name} will immediately revoke access to all application routes and APIs for its employees and administrators. Data will be preserved.`
                : `Reactivating ${org.name} will restore login access and all tenant APIs.`}
            </p>

            <form onSubmit={handleStatusChange} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Type <strong>{targetStatus === 'suspended' ? 'SUSPEND' : 'REACTIVATE'}</strong> to confirm:
                </label>
                <input
                  type="text"
                  required
                  placeholder={targetStatus === 'suspended' ? 'SUSPEND' : 'REACTIVATE'}
                  value={typedConfirmation}
                  onChange={(e) => setTypedConfirmation(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
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
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || typedConfirmation !== (targetStatus === 'suspended' ? 'SUSPEND' : 'REACTIVATE')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-2 ${
                    targetStatus === 'suspended' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  } disabled:opacity-50`}
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
