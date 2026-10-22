'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Search,
  Filter,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

interface OrgItem {
  id: string;
  name: string;
  slug: string;
  plan: 'plan1' | 'plan2' | 'plan3';
  status: 'trial' | 'active' | 'past_due' | 'grace_period' | 'read_only' | 'suspended' | 'cancelled';
  seat_limit: number;
  created_at: string;
  employeeCount: number;
  lastUploadAt: string | null;
}

export default function MasterOrganizationsPage() {
  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [plan, setPlan] = useState<'plan1' | 'plan2' | 'plan3'>('plan1');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchOrgs = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/master/organizations?status=${statusFilter}&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (res.ok) {
        setOrgs(data.organizations || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrgs();
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/master/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to create organization');
      } else {
        setShowCreateModal(false);
        setName('');
        setSlug('');
        fetchOrgs();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error creating organization');
    } finally {
      setCreating(false);
    }
  };

  const planBadge = (p: string) => {
    switch (p) {
      case 'plan3':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">Plan 3: Full Suite</span>;
      case 'plan2':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">Plan 2: Attendance + Leave</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Plan 1: Attendance</span>;
    }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case 'active':
        return <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>;
      case 'trial':
        return <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-600 dark:text-blue-400"><Clock className="w-3.5 h-3.5" /> Trial</span>;
      case 'suspended':
        return <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-600 dark:text-red-400"><ShieldAlert className="w-3.5 h-3.5" /> Suspended</span>;
      default:
        return <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400"><AlertTriangle className="w-3.5 h-3.5" /> {s}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Client Organizations</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Manage SaaS customer subscriptions, plans, health metrics, and tenant lifecycle.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Add Organization
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-[var(--bg-card)] p-3.5 rounded-2xl border border-[var(--border)] shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by company name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-[var(--text-muted)] ml-2 hidden md:block" />
          {['all', 'active', 'trial', 'suspended'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${
                statusFilter === filter
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Organizations Directory List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
          <p className="text-sm">Loading client organizations...</p>
        </div>
      ) : orgs.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-12 text-center">
          <Building2 className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-60" />
          <h3 className="font-semibold text-base mb-1">No Organizations Found</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto mb-4">
            {search ? 'Try adjusting your search criteria or filter.' : 'Get started by creating your first client organization.'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs"
          >
            <Plus className="w-4 h-4" />
            Add Organization
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgs.map((org) => (
            <div
              key={org.id}
              className="bg-[var(--bg-card)] border border-[var(--border)] hover:border-indigo-500/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base leading-snug">{org.name}</h3>
                    <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">slug: {org.slug}</p>
                  </div>
                  {statusBadge(org.status)}
                </div>

                <div>{planBadge(org.plan)}</div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border)] text-xs">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Headcount: <strong>{org.employeeCount}</strong> / {org.seat_limit}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span>
                      {org.lastUploadAt
                        ? `Last upload ${new Date(org.lastUploadAt).toLocaleDateString()}`
                        : 'No uploads yet'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[var(--border)] flex justify-end">
                <Link
                  href={`/master/organizations/${org.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Manage Organization <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-base">Add New Organization</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateOrg} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                    }
                  }}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Tenant Slug (Identifier)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. acme"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Subscription Plan</label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                >
                  <option value="plan1">Plan 1: Attendance Dashboard Only</option>
                  <option value="plan2">Plan 2: Attendance + Leave Tracker</option>
                  <option value="plan3">Plan 3: Full Suite (Self-Service + Approvals)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)]/80 text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create Organization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
