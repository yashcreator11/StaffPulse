'use client';

import React, { useEffect, useState } from 'react';
import {
  Building2,
  Globe,
  Clock,
  Shield,
  Upload,
  Download,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface OrgDetails {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  seat_limit: number;
  timezone: string;
  allowed_domains: string[];
  data_retention_days: number;
  onboarding_completed_at: string | null;
  created_at: string;
}

interface OrgStats {
  employeeCount: number;
  officeCount: number;
  leaveTypeCount: number;
}

const COMMON_TIMEZONES = [
  'Asia/Kolkata',
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export default function OrgSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [org, setOrg] = useState<OrgDetails | null>(null);
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [domainsInput, setDomainsInput] = useState('');
  const [retentionDays, setRetentionDays] = useState(365);

  // File upload states
  const [empFile, setEmpFile] = useState<File | null>(null);
  const [empImporting, setEmpImporting] = useState(false);
  const [empImportResult, setEmpImportResult] = useState<string | null>(null);

  const [balFile, setBalFile] = useState<File | null>(null);
  const [balImporting, setBalImporting] = useState(false);
  const [balImportResult, setBalImportResult] = useState<string | null>(null);

  const [seedingDemo, setSeedingDemo] = useState(false);
  const [demoResult, setDemoResult] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch('/api/organizations/settings');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch settings');
      }
      const data = await res.json();
      setOrg(data.organization);
      setStats(data.stats);
      setName(data.organization.name || '');
      setTimezone(data.organization.timezone || 'Asia/Kolkata');
      setDomainsInput((data.organization.allowed_domains || []).join(', '));
      setRetentionDays(data.organization.data_retention_days || 365);
    } catch (err: unknown) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Error loading organization settings',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const allowedDomains = domainsInput
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);

      const res = await fetch('/api/organizations/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          timezone,
          allowed_domains: allowedDomains,
          data_retention_days: Number(retentionDays),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setMessage({ kind: 'success', text: data.message || 'Settings updated successfully!' });
      fetchSettings();
    } catch (err: unknown) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Error updating settings',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleImportEmployees() {
    if (!empFile) return;
    setEmpImporting(true);
    setEmpImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', empFile);

      const res = await fetch('/api/leave/admin/employees/import-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Employee import failed');
      }

      setEmpImportResult(
        `Successfully imported ${data.importedCount} employees (${data.skippedCount} skipped, ${data.errors?.length || 0} warnings).`
      );
      setEmpFile(null);
      fetchSettings();
    } catch (err: unknown) {
      setEmpImportResult(`Error: ${err instanceof Error ? err.message : 'Failed to import employees'}`);
    } finally {
      setEmpImporting(false);
    }
  }

  async function handleImportBalances() {
    if (!balFile) return;
    setBalImporting(true);
    setBalImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', balFile);

      const res = await fetch('/api/leave/admin/opening-balances', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Opening balances import failed');
      }

      setBalImportResult(
        `Successfully imported ${data.importedCount} balances for FY ${data.year} (${data.skippedCount} skipped).`
      );
      setBalFile(null);
    } catch (err: unknown) {
      setBalImportResult(`Error: ${err instanceof Error ? err.message : 'Failed to import opening balances'}`);
    } finally {
      setBalImporting(false);
    }
  }

  async function handleSeedDemoData() {
    if (!confirm('This will seed 10 sample employees, 2 offices, and 30 days of attendance logs. Continue?')) {
      return;
    }

    setSeedingDemo(true);
    setDemoResult(null);

    try {
      const res = await fetch('/api/demo/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to seed demo data');
      }

      setDemoResult(
        `Demo data loaded! Seeded ${data.seeded.offices} offices, ${data.seeded.departments} departments, ${data.seeded.employees} employees, and ${data.seeded.attendanceRecords} attendance punches.`
      );
      fetchSettings();
    } catch (err: unknown) {
      setDemoResult(`Error: ${err instanceof Error ? err.message : 'Failed to seed demo data'}`);
    } finally {
      setSeedingDemo(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
        Loading organization settings…
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {message && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm ${
            message.kind === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {message.kind === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Overview Cards */}
      {org && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs uppercase font-semibold text-slate-400 block mb-1">Plan Tier</span>
            <div className="text-lg font-bold text-slate-100 uppercase">{org.plan}</div>
            <span className="text-xs text-emerald-400 capitalize font-medium">{org.status}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs uppercase font-semibold text-slate-400 block mb-1">Employees</span>
            <div className="text-lg font-bold text-slate-100">{stats.employeeCount}</div>
            <span className="text-xs text-slate-400">Limit: {org.seat_limit}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs uppercase font-semibold text-slate-400 block mb-1">Offices</span>
            <div className="text-lg font-bold text-slate-100">{stats.officeCount}</div>
            <span className="text-xs text-slate-400">Configured</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs uppercase font-semibold text-slate-400 block mb-1">Leave Types</span>
            <div className="text-lg font-bold text-slate-100">{stats.leaveTypeCount}</div>
            <span className="text-xs text-slate-400">Active policies</span>
          </div>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              Organization Profile & Settings
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage your company name, timezone, allowed email domains, and data retention.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Company / Organization Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Organization URL Slug</label>
            <input
              type="text"
              disabled
              value={org?.slug || ''}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
            />
            <p className="text-[10px] text-slate-500 mt-1">Tenant slugs are unique identifiers and cannot be modified.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Primary Time Zone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              Allowed Email Domains
            </label>
            <input
              type="text"
              placeholder="e.g. acme.com, acmecorp.in"
              value={domainsInput}
              onChange={(e) => setDomainsInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Comma-separated. Users can only authenticate if their email matches these domains.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              Data Retention (Days)
            </label>
            <input
              type="number"
              min={30}
              max={3650}
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">Attendance logs retention period (default: 365 days).</p>
          </div>
        </div>
      </form>

      {/* Onboarding & Bulk Migration Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-400" />
            Data Import & Onboarding Migration
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Bulk-import your workforce directory, migrate leave balances, or re-run the setup wizard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Employee CSV Importer */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-200">Bulk Employee Import</h4>
              <a
                href="/api/leave/admin/employees/import-csv"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                download="employee_import_template.csv"
              >
                <Download className="w-3.5 h-3.5" />
                Download Template
              </a>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload your employee roster CSV with codes, names, emails, departments, roles, and offices.
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setEmpFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
            />
            <button
              type="button"
              disabled={!empFile || empImporting}
              onClick={handleImportEmployees}
              className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold py-2 rounded-xl transition"
            >
              {empImporting ? 'Importing Employees…' : 'Import Employee CSV'}
            </button>
            {empImportResult && (
              <p className="text-xs mt-2 text-indigo-300 bg-indigo-950/40 p-2 rounded-lg border border-indigo-900/50">
                {empImportResult}
              </p>
            )}
          </div>

          {/* Opening Balances Importer */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-200">Opening Leave Balances</h4>
              <a
                href="/api/leave/admin/opening-balances"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                download="opening_balances_template.csv"
              >
                <Download className="w-3.5 h-3.5" />
                Download Template
              </a>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Import carried-forward leave balances from your previous HRMS for each employee code.
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setBalFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
            />
            <button
              type="button"
              disabled={!balFile || balImporting}
              onClick={handleImportBalances}
              className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold py-2 rounded-xl transition"
            >
              {balImporting ? 'Importing Balances…' : 'Import Opening Balances'}
            </button>
            {balImportResult && (
              <p className="text-xs mt-2 text-indigo-300 bg-indigo-950/40 p-2 rounded-lg border border-indigo-900/50">
                {balImportResult}
              </p>
            )}
          </div>
        </div>

        {/* Guided Setup & Demo Seeding */}
        <div className="border-t border-slate-800 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-4 flex items-center justify-between">
            <div>
              <h5 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Demo Mode & Sample Data
              </h5>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Populate sample offices, departments, and 10 employees with 30 days of punches.
              </p>
            </div>
            <button
              type="button"
              disabled={seedingDemo}
              onClick={handleSeedDemoData}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-medium px-3 py-1.5 rounded-lg transition shrink-0 ml-3"
            >
              {seedingDemo ? 'Seeding…' : 'Seed Demo Data'}
            </button>
          </div>

          <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-4 flex items-center justify-between">
            <div>
              <h5 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Setup Wizard
              </h5>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Walk through initial offices, grouping model, and policy configuration.
              </p>
            </div>
            <Link
              href="/setup"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-lg transition shrink-0 ml-3 flex items-center gap-1"
            >
              Launch Wizard
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {demoResult && (
          <p className="text-xs text-amber-300 bg-amber-950/40 p-2.5 rounded-xl border border-amber-900/50">
            {demoResult}
          </p>
        )}
      </div>
    </div>
  );
}
