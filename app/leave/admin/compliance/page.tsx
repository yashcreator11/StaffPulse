'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  FileSpreadsheet,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle2,
  Search,
  Lock,
  Clock,
  UserX,
  FileText,
  RefreshCw,
} from 'lucide-react';
import LeavePageHeader from '@/components/leave/LeavePageHeader';
import LockedFeatureGate from '@/components/billing/LockedFeatureGate';

interface AuditLogEntry {
  id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export default function ComplianceManagementPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlanLocked, setIsPlanLocked] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionFilter, setActionFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [erasureModalOpen, setErasureModalOpen] = useState(false);
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [erasing, setErasing] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const loadAuditLogs = React.useCallback(async () => {
    setLoading(true);
    try {
      const url = actionFilter
        ? `/api/compliance/audit-logs?action=${encodeURIComponent(actionFilter)}`
        : '/api/compliance/audit-logs';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.planLocked) {
          setIsPlanLocked(true);
          return;
        }
      }
    } catch (err: unknown) {
      console.error(err);
      setToast({ kind: 'error', text: 'Failed to load audit logs' });
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  async function handleDownloadExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/compliance/export');
      if (!res.ok) throw new Error('Export request failed');
      const data = await res.json();

      // Trigger browser JSON download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `organization_data_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setToast({
        kind: 'success',
        text: 'Data export generated and downloaded successfully in DPDP / GDPR format.',
      });
      loadAuditLogs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      setToast({ kind: 'error', text: msg });
    } finally {
      setExporting(false);
    }
  }

  async function handleExecuteErasure() {
    if (confirmText !== 'PERMANENTLY_ERASE') return;
    setErasing(true);
    try {
      const res = await fetch('/api/compliance/erasure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: targetEmployeeId,
          confirmation: confirmText,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erasure request failed');

      setToast({
        kind: 'success',
        text: `Employee ${data.employeeCode} data scrubbed & erased per GDPR/DPDP requirements.`,
      });
      setErasureModalOpen(false);
      setTargetEmployeeId('');
      setConfirmText('');
      loadAuditLogs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erasure failed';
      setToast({ kind: 'error', text: msg });
    } finally {
      setErasing(false);
    }
  }

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.actor_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.entity_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isPlanLocked) {
    return (
      <LockedFeatureGate
        feature="compliance_dpdp"
        backHref="/leave/admin"
        backLabel="Back to Leave Balances"
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <LeavePageHeader
        title="Compliance & Data Privacy"
        description="Immutable audit logging, India DPDP Act 2023 / GDPR portable data exports, and Right-to-be-Forgotten workflows."
        backHref="/leave/admin"
        backLabel="Back to Leave Balances"
      />

      {toast && (
        <div
          className={`flex items-center gap-3 rounded-xl p-4 text-sm font-medium border ${
            toast.kind === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
          }`}
        >
          {toast.kind === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Compliance Overview Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">DPDP Act 2023 Ready</h3>
              <p className="text-xs text-slate-500">Consent, purpose limitation & portability</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Data Retention:</span>
            <span className="font-semibold text-slate-900 dark:text-white">730 Days (2 Years)</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tamper-Proof Audit Log</h3>
              <p className="text-xs text-slate-500">Append-only database security policy</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Total Audit Events:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{logs.length} logged</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Data Subject Rights</h3>
                <p className="text-xs text-slate-500">Export archive & Right to Erasure</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={exporting}
              onClick={handleDownloadExport}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-2 text-xs font-semibold shadow-sm transition"
            >
              <Download className="h-3.5 w-3.5" />
              {exporting ? 'Generating...' : 'Export Data'}
            </button>
            <button
              type="button"
              onClick={() => setErasureModalOpen(true)}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-rose-300 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 px-3 py-2 text-xs font-semibold hover:bg-rose-100 transition"
            >
              <UserX className="h-3.5 w-3.5" />
              Erasure
            </button>
          </div>
        </div>
      </div>

      {/* Live Immutable Audit Trail */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Immutable Audit Trail</h3>
            <p className="text-xs text-slate-500">
              Cryptographically timestamped log of role changes, policy overrides, exports and leave decisions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search action or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={loadAuditLogs}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              title="Refresh audit logs"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 py-4">
            <div className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No audit log entries match the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{log.actor_email}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{log.actor_role}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-blue-600 dark:text-blue-400">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize">{log.entity_type}</span>
                      {log.entity_id && (
                        <span className="ml-1 text-[10px] text-slate-400 font-mono">
                          ({log.entity_id.slice(0, 8)}...)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Right to Erasure Modal */}
      {erasureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Execute Right to Erasure
              </h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              This action complies with Article 17 GDPR & DPDP Act 2023. The employee record will be
              permanently scrubbed, personal data anonymized, and status set to inactive. Historical
              aggregate audit traces will be preserved.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Employee UUID to Erase:
                </label>
                <input
                  type="text"
                  placeholder="e.g. 8b7a8f9d-40bd-4418-a1b8-3e9cecd5073f"
                  value={targetEmployeeId}
                  onChange={(e) => setTargetEmployeeId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Type <span className="text-rose-600 font-bold">PERMANENTLY_ERASE</span> to confirm:
                </label>
                <input
                  type="text"
                  placeholder="PERMANENTLY_ERASE"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs focus:ring-2 focus:ring-rose-500 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setErasureModalOpen(false)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={erasing || confirmText !== 'PERMANENTLY_ERASE' || !targetEmployeeId}
                onClick={handleExecuteErasure}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white px-4 py-2 text-xs font-semibold transition"
              >
                {erasing ? 'Scrubbing...' : 'Confirm Permanent Erasure'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
