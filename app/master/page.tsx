'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
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
  TrendingUp,
  PhoneCall,
  FileText,
  Activity,
  Layers,
  ExternalLink,
  RefreshCw,
  Sliders,
  DollarSign,
  ChevronRight,
  Mail,
  UserCheck,
  Check,
  X,
  Play,
  Database,
  Sparkles,
  LayoutGrid,
  List,
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

interface DemoLead {
  id: string;
  full_name: string;
  email: string;
  company_name: string;
  employee_count: string;
  phone: string | null;
  hardware_brand: string | null;
  preferred_slot: string | null;
  notes: string | null;
  status: 'new' | 'contacted' | 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

interface AuditLogItem {
  id: string;
  platform_admin_id: string | null;
  org_id: string | null;
  action: string;
  details: any;
  ip_address: string | null;
  created_at: string;
  admin_email: string;
  org_name: string | null;
  org_slug: string | null;
}

function MasterDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'orgs' | 'leads' | 'audit' | 'system') || 'orgs';

  const [activeTab, setActiveTab] = useState<'orgs' | 'leads' | 'audit' | 'system'>(initialTab);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Organizations State
  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [metrics, setMetrics] = useState<{
    totalOrganizations: number;
    activeOrganizations: number;
    trialOrganizations: number;
    suspendedOrganizations: number;
    totalActiveEmployees: number;
    estimatedMrrUsd: number;
    annualRunRateUsd: number;
    trialConversionRatePercent: number;
  } | null>(null);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  // Inbound Leads CRM State
  const [leads, setLeads] = useState<DemoLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadStatusFilter, setLeadStatusFilter] = useState('all');
  const [leadSearch, setLeadSearch] = useState('');
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);

  // Platform Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // System Operations State
  const [runningSnapshot, setRunningSnapshot] = useState(false);
  const [snapshotResult, setSnapshotResult] = useState<any | null>(null);

  // Create Org Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [plan, setPlan] = useState<'plan1' | 'plan2' | 'plan3'>('plan2');
  const [seatLimit, setSeatLimit] = useState(100);
  const [initialStatus, setInitialStatus] = useState<'active' | 'trial'>('active');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-generate slug when typing name
  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]/g, '-')) {
      setSlug(
        val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      );
    }
  };

  // Sync tab with URL
  const handleTabChange = (tab: 'orgs' | 'leads' | 'audit' | 'system') => {
    setActiveTab(tab);
    router.replace(`/master?tab=${tab}`);
  };

  // Fetch Organizations & Platform Metrics
  const fetchOrgs = React.useCallback(async () => {
    setLoadingOrgs(true);
    try {
      const [res, metricsRes] = await Promise.all([
        fetch(`/api/master/organizations?status=${statusFilter}&search=${encodeURIComponent(search)}`),
        fetch('/api/master/metrics'),
      ]);
      const data = await res.json();
      if (res.ok) setOrgs(data.organizations || []);
      if (metricsRes.ok) {
        const mData = await metricsRes.json();
        setMetrics(mData.metrics);
      }
    } catch {
      // ignore
    } finally {
      setLoadingOrgs(false);
    }
  }, [statusFilter, search]);

  // Fetch Inbound Leads
  const fetchLeads = React.useCallback(async () => {
    setLoadingLeads(true);
    try {
      const res = await fetch(`/api/master/leads?status=${leadStatusFilter}`);
      const data = await res.json();
      if (res.ok) setLeads(data.leads || []);
    } catch {
      // ignore
    } finally {
      setLoadingLeads(false);
    }
  }, [leadStatusFilter]);

  // Fetch Audit Logs
  const fetchAuditLogs = React.useCallback(async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch('/api/master/audit?limit=50');
      const data = await res.json();
      if (res.ok) setAuditLogs(data.auditLogs || []);
    } catch {
      // ignore
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  useEffect(() => {
    if (activeTab === 'leads') fetchLeads();
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab, fetchLeads, fetchAuditLogs]);

  // Update Lead Status
  const handleUpdateLeadStatus = async (id: string, newStatus: DemoLead['status']) => {
    setUpdatingLeadId(id);
    try {
      const res = await fetch('/api/master/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)));
      }
    } catch {
      // ignore
    } finally {
      setUpdatingLeadId(null);
    }
  };

  // Convert Lead to Organization
  const handleConvertLead = (lead: DemoLead) => {
    setName(lead.company_name);
    setSlug(
      lead.company_name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    );
    const parsedSeats = parseInt(lead.employee_count.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(parsedSeats) && parsedSeats > 0) {
      setSeatLimit(parsedSeats);
    }
    setShowCreateModal(true);
  };

  // Trigger Usage Snapshots Job
  const handleTriggerSnapshots = async () => {
    setRunningSnapshot(true);
    setSnapshotResult(null);
    try {
      const res = await fetch('/api/master/jobs/trigger-snapshots', { method: 'POST' });
      const data = await res.json();
      setSnapshotResult(data);
      fetchOrgs();
    } catch (err: any) {
      setSnapshotResult({ error: err?.message || 'Failed to run snapshot' });
    } finally {
      setRunningSnapshot(false);
    }
  };

  // Create Organization Submission
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/master/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          plan,
          status: initialStatus,
          seat_limit: seatLimit,
        }),
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
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error creating organization');
    } finally {
      setCreating(false);
    }
  };

  // Filtered orgs by plan
  const filteredOrgs = orgs.filter((org) => {
    if (planFilter !== 'all' && org.plan !== planFilter) return false;
    return true;
  });

  // Filtered leads
  const filteredLeads = leads.filter((lead) => {
    if (!leadSearch) return true;
    const term = leadSearch.toLowerCase();
    return (
      lead.company_name.toLowerCase().includes(term) ||
      lead.full_name.toLowerCase().includes(term) ||
      lead.email.toLowerCase().includes(term)
    );
  });

  const planBadge = (p: string) => {
    switch (p) {
      case 'plan3':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25">
            Enterprise (Plan 3)
          </span>
        );
      case 'plan2':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25">
            Pro Growth (Plan 2)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            Starter (Plan 1)
          </span>
        );
    }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 className="w-3.5 h-3.5" /> Active
          </span>
        );
      case 'trial':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25">
            <Clock className="w-3.5 h-3.5" /> Trial
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/25">
            <ShieldAlert className="w-3.5 h-3.5" /> Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
            <AlertTriangle className="w-3.5 h-3.5" /> {s}
          </span>
        );
    }
  };

  const leadStatusBadge = (s: DemoLead['status']) => {
    switch (s) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            New Lead
          </span>
        );
      case 'contacted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-600 dark:text-blue-400">
            Contacted
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400">
            Demo Scheduled
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            Won / Converted
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-500/15 text-zinc-500">
            Archived
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header Bar ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Platform Master Console
            </h1>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
              Control Room
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Global multi-tenant governance, subscription billing MRR, sales leads, and platform health.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setName('');
              setSlug('');
              setShowCreateModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/25 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>New Organization</span>
          </button>
        </div>
      </div>

      {/* ── Platform Metrics Strip ─────────────────────────────────────── */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* MRR Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-5 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-muted)]">Monthly Recurring (MRR)</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
              ${metrics.estimatedMrrUsd.toLocaleString()}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span>ARR: <strong>${metrics.annualRunRateUsd.toLocaleString()}</strong></span>
            </div>
          </div>

          {/* Active Workspaces Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-5 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-muted)]">Client Workspaces</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
              {metrics.activeOrganizations}{' '}
              <span className="text-xs font-normal text-[var(--text-muted)]">/ {metrics.totalOrganizations} total</span>
            </div>
            <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <span>{metrics.trialConversionRatePercent}% active conversion</span>
            </div>
          </div>

          {/* Total Employees Under Management */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-5 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-muted)]">Total Employees</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight">
              {metrics.totalActiveEmployees.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] text-[var(--text-muted)]">
              Across all tenant databases
            </div>
          </div>

          {/* Inbound Leads / Trials Alert Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-5 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-muted)]">Sales Pipeline & Trials</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <PhoneCall className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
              {metrics.trialOrganizations}{' '}
              <span className="text-xs font-normal text-[var(--text-muted)]">trials</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-rose-500 font-semibold">{metrics.suspendedOrganizations} suspended</span>
              <button
                onClick={() => handleTabChange('leads')}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                View Leads →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Master Tab Navigation Bar ──────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pt-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-px">
          <button
            onClick={() => handleTabChange('orgs')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'orgs'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Organizations ({orgs.length})</span>
          </button>

          <button
            onClick={() => handleTabChange('leads')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'leads'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>Inbound Demo Leads</span>
            {leads.filter((l) => l.status === 'new').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-extrabold">
                {leads.filter((l) => l.status === 'new').length}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('audit')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'audit'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Platform Audit Ledger</span>
          </button>

          <button
            onClick={() => handleTabChange('system')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'system'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>System Health & Jobs</span>
          </button>
        </div>

        {activeTab === 'orgs' && (
          <div className="hidden sm:flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Compact Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: CLIENT ORGANIZATIONS DIRECTORY                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'orgs' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col md:flex-row gap-3 bg-[var(--bg-card)] p-3 rounded-2xl border border-[var(--border)] shadow-sm">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search organizations by name or slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all placeholder:text-[var(--text-muted)]"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <div className="flex items-center gap-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-1 text-xs">
                <span className="px-2 text-[var(--text-muted)] font-medium">Status:</span>
                {['all', 'active', 'trial', 'suspended'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all ${
                      statusFilter === filter
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-1 text-xs">
                <span className="px-2 text-[var(--text-muted)] font-medium">Tier:</span>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'plan1', label: 'Starter' },
                  { id: 'plan2', label: 'Pro' },
                  { id: 'plan3', label: 'Enterprise' },
                ].map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => setPlanFilter(tier.id)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      planFilter === tier.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Directory Content */}
          {loadingOrgs ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
              <p className="text-sm font-medium">Loading client workspaces...</p>
            </div>
          ) : filteredOrgs.length === 0 ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-12 text-center">
              <Building2 className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-60" />
              <h3 className="font-bold text-base mb-1">No Organizations Matched</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto mb-4">
                {search ? 'Try clearing your search filters or status tags.' : 'Create your first SaaS client organization to begin.'}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-md"
              >
                <Plus className="w-4 h-4" />
                Add Organization
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* Card Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrgs.map((org) => {
                const seatUtilization = Math.round((org.employeeCount / (org.seat_limit || 100)) * 100);
                return (
                  <div
                    key={org.id}
                    className="bg-[var(--bg-card)] border border-[var(--border)] hover:border-indigo-500/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-base leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {org.name}
                          </h3>
                          <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                            slug: {org.slug}
                          </p>
                        </div>
                        {statusBadge(org.status)}
                      </div>

                      <div className="flex items-center justify-between">
                        {planBadge(org.plan)}
                        <span className="text-[11px] text-[var(--text-muted)]">
                          Since {new Date(org.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Headcount Utilization Meter */}
                      <div className="space-y-1.5 pt-2 border-t border-[var(--border)]">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-muted)]">Active Headcount:</span>
                          <span className="font-bold text-[var(--text-primary)]">
                            {org.employeeCount} <span className="font-normal text-[var(--text-muted)]">/ {org.seat_limit} seats</span>
                          </span>
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
                      </div>

                      {/* Biometric Upload Recency */}
                      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Biometric Sync:</span>
                        </div>
                        <span className="font-medium text-[var(--text-secondary)]">
                          {org.lastUploadAt
                            ? new Date(org.lastUploadAt).toLocaleDateString()
                            : 'Pending first sync'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center justify-between">
                      <Link
                        href={`/?org=${org.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        title="Open customer view in new tab"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Launch</span>
                      </Link>

                      <Link
                        href={`/master/organizations/${org.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <span>Manage Tenant</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Compact Data Table View */
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-surface)] border-b border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">Organization</th>
                      <th className="px-4 py-3">Plan Tier</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Seats / Limit</th>
                      <th className="px-4 py-3">Last Biometric Sync</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-[var(--text-primary)]">
                    {filteredOrgs.map((org) => (
                      <tr key={org.id} className="hover:bg-[var(--bg-surface)]/50 transition-colors">
                        <td className="px-4 py-3.5 font-bold">
                          <div className="flex flex-col">
                            <span>{org.name}</span>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">{org.slug}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">{planBadge(org.plan)}</td>
                        <td className="px-4 py-3.5">{statusBadge(org.status)}</td>
                        <td className="px-4 py-3.5 font-semibold">
                          {org.employeeCount} / {org.seat_limit}
                        </td>
                        <td className="px-4 py-3.5 text-[var(--text-muted)]">
                          {org.lastUploadAt
                            ? new Date(org.lastUploadAt).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            href={`/master/organizations/${org.id}`}
                            className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            Manage <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: INBOUND SALES PIPELINE CRM (demo_requests)                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          {/* Header & CRM Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-card)] p-3.5 rounded-2xl border border-[var(--border)] shadow-sm">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search leads by company, contact name, or email..."
                value={leadSearch}
                onChange={(e) => setLeadSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder:text-[var(--text-muted)]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto text-xs bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border)]">
              <span className="px-2 text-[var(--text-muted)] font-medium">Status:</span>
              {['all', 'new', 'contacted', 'scheduled', 'completed', 'cancelled'].map((st) => (
                <button
                  key={st}
                  onClick={() => setLeadStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all ${
                    leadStatusFilter === st
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Leads List */}
          {loadingLeads ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
              <p className="text-sm font-medium">Loading inbound demo requests...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-12 text-center">
              <PhoneCall className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-60" />
              <h3 className="font-bold text-base mb-1">No Demo Inquiries Found</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Inbound requests captured from the public landing page &amp; showcase will appear right here in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:border-indigo-500/40 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-extrabold text-base text-[var(--text-primary)]">
                          {lead.company_name}
                        </h3>
                        {leadStatusBadge(lead.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)] mt-1">
                        <span>Contact: <strong>{lead.full_name}</strong></span>
                        <span>·</span>
                        <a href={`mailto:${lead.email}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                          {lead.email}
                        </a>
                        {lead.phone && (
                          <>
                            <span>·</span>
                            <span>Phone: <strong>{lead.phone}</strong></span>
                          </>
                        )}
                        <span>·</span>
                        <span>Received {new Date(lead.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleConvertLead(lead)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
                        title="Create tenant organization from this lead"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Convert to Client Org</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border)] text-xs">
                    <div>
                      <span className="text-[var(--text-muted)] block text-[10px] font-semibold uppercase">Team Size</span>
                      <span className="font-bold text-[var(--text-primary)]">{lead.employee_count} employees</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block text-[10px] font-semibold uppercase">Biometric Hardware</span>
                      <span className="font-bold text-[var(--text-primary)]">{lead.hardware_brand || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block text-[10px] font-semibold uppercase">Preferred Walkthrough Slot</span>
                      <span className="font-bold text-[var(--text-primary)]">{lead.preferred_slot || 'Anytime'}</span>
                    </div>
                  </div>

                  {lead.notes && (
                    <div className="text-xs bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/40 rounded-xl p-3 text-[var(--text-secondary)]">
                      <strong className="text-indigo-600 dark:text-indigo-400 block text-[10px] uppercase font-bold mb-0.5">
                        Prospect Request / Note:
                      </strong>
                      <p className="leading-relaxed">{lead.notes}</p>
                    </div>
                  )}

                  {/* Status Dropdown Transition Controls */}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs">
                    <span className="text-[var(--text-muted)] text-[11px]">Update Lead Status:</span>
                    <div className="flex items-center gap-1.5">
                      {(['new', 'contacted', 'scheduled', 'completed', 'cancelled'] as const).map((st) => (
                        <button
                          key={st}
                          disabled={updatingLeadId === lead.id || lead.status === st}
                          onClick={() => handleUpdateLeadStatus(lead.id, st)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all ${
                            lead.status === st
                              ? 'bg-indigo-600 text-white'
                              : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: PLATFORM AUDIT LEDGER (Append-Only Log)                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)] shadow-sm">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                <span>Tamper-Proof Audit Trail</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/25">
                  Append-Only
                </span>
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Every master action (tenant creation, plan updates, status freezes) is cryptographically locked.
              </p>
            </div>
            <button
              onClick={fetchAuditLogs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-xs font-semibold hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {loadingAudit ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
              <p className="text-sm font-medium">Loading audit logs...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-12 text-center">
              <FileText className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-60" />
              <h3 className="font-bold text-base mb-1">No Audit Logs Yet</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Admin operations will be recorded here automatically.
              </p>
            </div>
          ) : (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm divide-y divide-[var(--border)]">
              {auditLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <div key={log.id} className="p-4 hover:bg-[var(--bg-surface)]/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 uppercase">
                          {log.action}
                        </span>
                        <span className="text-xs font-semibold text-[var(--text-primary)]">
                          {log.org_name ? (
                            <span>
                              Target: <strong>{log.org_name}</strong> ({log.org_slug})
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)]">Platform Global Action</span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                        <span>By: <strong>{log.admin_email}</strong></span>
                        <span>·</span>
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                        <button
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline ml-2"
                        >
                          {isExpanded ? 'Hide Payload' : 'View Payload'}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 p-3 rounded-xl bg-black/90 text-emerald-400 font-mono text-[11px] overflow-x-auto border border-zinc-800">
                        <pre>{JSON.stringify(log.details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: SYSTEM HEALTH & MAINTENANCE                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'system' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  PostgreSQL &amp; RLS
                </span>
                <Database className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>Isolated &amp; Healthy</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Tenant isolation enforced by PostgreSQL Row Level Security policies across all tables.
              </p>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Usage Snapshot Scheduler
                </span>
                <Clock className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                <span>Nightly Cron Active</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Aggregates employee headcount, leave records, and punches into historical analytics daily.
              </p>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  DPDP Act 2023 Readiness
                </span>
                <ShieldAlert className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>Compliant</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                AES-256 data encryption at rest, Right-to-Erasure workflows, and tamper-proof admin audit trail.
              </p>
            </div>
          </div>

          {/* Trigger Usage Snapshots Card */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-[var(--text-primary)]">
                  Manual Job Execution: Tenant Usage Snapshots
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Run an immediate snapshot cycle across all active tenant organizations without waiting for the nightly cron.
                </p>
              </div>
              <button
                disabled={runningSnapshot}
                onClick={handleTriggerSnapshots}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs sm:text-sm shadow-md transition-all"
              >
                {runningSnapshot ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Executing Snapshot Job…</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Run Snapshot Job Now</span>
                  </>
                )}
              </button>
            </div>

            {snapshotResult && (
              <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-mono space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Snapshot Run Completed:</span>
                </div>
                <pre className="text-[11px] overflow-x-auto text-[var(--text-primary)]">
                  {JSON.stringify(snapshotResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Create Organization Modal ──────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[var(--text-primary)]">
                    Create Client Workspace
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">Onboard a new SaaS tenant</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Company / Organization Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Innovations Pvt Ltd"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Workspace Slug (URL Subdomain)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="acme-innovations"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    className="w-full px-3.5 py-2.5 text-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                  Access URL: staffpulse.io/{slug || 'your-slug'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Subscription Tier
                  </label>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="plan1">Starter ($2.40/seat)</option>
                    <option value="plan2">Pro Growth ($2.00/seat)</option>
                    <option value="plan3">Enterprise ($1.80/seat)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Seat Limit
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={10000}
                    value={seatLimit}
                    onChange={(e) => setSeatLimit(parseInt(e.target.value, 10) || 50)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Initial Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInitialStatus('active')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      initialStatus === 'active'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border)]'
                    }`}
                  >
                    Paid Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setInitialStatus('trial')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      initialStatus === 'trial'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border)]'
                    }`}
                  >
                    14-Day Free Trial
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs shadow-md"
                >
                  {creating ? 'Creating…' : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MasterOrganizationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-24 text-[var(--text-muted)]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
          <p className="text-sm font-medium">Loading Master Console…</p>
        </div>
      }
    >
      <MasterDashboardContent />
    </Suspense>
  );
}
