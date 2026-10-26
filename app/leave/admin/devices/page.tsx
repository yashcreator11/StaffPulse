'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  HelpCircle,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Laptop,
  Radio,
  ExternalLink,
  Download,
  Building,
  Key,
  X,
  FileCode,
  Sparkles,
  Lock,
} from 'lucide-react';
import LeavePageHeader from '@/components/leave/LeavePageHeader';
import { createClient } from '@/lib/supabase/client';
import { isDemoEmail } from '@/lib/isDemoSandbox';

interface Office {
  code: string;
  name: string;
}

interface Device {
  id: string;
  device_name: string;
  device_serial: string;
  vendor: 'essl_zkteco' | 'realtime_biomax' | 'matrix' | 'hikvision' | 'sync_agent_legacy' | 'other';
  office_id: string | null;
  offices?: Office | null;
  api_token: string;
  status: 'online' | 'offline' | 'pending';
  last_heartbeat_at: string | null;
  last_punch_at: string | null;
  total_punches_ingested: number;
  notes?: string | null;
  created_at: string;
}

const VENDOR_LABELS: Record<string, string> = {
  essl_zkteco: 'eSSL & ZKTeco (ADMS Push)',
  realtime_biomax: 'Realtime & BioMax (Web Push)',
  matrix: 'Matrix COSEC',
  hikvision: 'Hikvision & Dahua',
  sync_agent_legacy: 'eTimeTrackLite (Windows Agent)',
  other: 'Universal Hardware (HTTP)',
};

export default function BiometricDevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [selectedDeviceForGuide, setSelectedDeviceForGuide] = useState<Device | null>(null);
  const [guideVendorTab, setGuideVendorTab] = useState<string>('essl_zkteco');

  // Add form fields
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceSerial, setNewDeviceSerial] = useState('');
  const [newVendor, setNewVendor] = useState<'essl_zkteco' | 'realtime_biomax' | 'matrix' | 'hikvision' | 'sync_agent_legacy' | 'other'>('essl_zkteco');
  const [newOfficeId, setNewOfficeId] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Copy feedback
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Demo Sandbox State
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [showDemoUpgradeModal, setShowDemoUpgradeModal] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setCurrentUserEmail(data.user.email);
    });
  }, []);

  const isDemo = isDemoEmail(currentUserEmail);

  async function loadDevices() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/biometrics/devices');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load devices');
      }
      const data = await res.json();
      setDevices(data.devices || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching devices');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDevices();
  }, []);

  async function handleRegisterDevice(e: React.FormEvent) {
    e.preventDefault();
    if (isDemo) {
      setShowAddModal(false);
      setShowDemoUpgradeModal(true);
      return;
    }
    if (!newDeviceName || !newDeviceSerial) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/biometrics/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_name: newDeviceName,
          device_serial: newDeviceSerial,
          vendor: newVendor,
          office_id: newOfficeId || null,
          notes: newNotes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to register device');
      }

      const { device } = await res.json();
      setDevices((prev) => [device, ...prev]);
      setShowAddModal(false);
      setNewDeviceName('');
      setNewDeviceSerial('');
      setNewNotes('');

      // Auto-open setup guide for this device
      setSelectedDeviceForGuide(device);
      setGuideVendorTab(device.vendor);
      setShowGuideModal(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error registering device');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteDevice(id: string) {
    if (isDemo) {
      setShowDemoUpgradeModal(true);
      return;
    }
    if (!confirm('Are you sure you want to remove this biometric device? Any automated punch feeds using this device token will stop syncing.')) {
      return;
    }

    try {
      const res = await fetch(`/api/biometrics/devices?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete device');
      }
      setDevices((prev) => prev.filter((d) => d.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting device');
    }
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2500);
  }

  function openGuide(device: Device) {
    setSelectedDeviceForGuide(device);
    setGuideVendorTab(device.vendor);
    setShowGuideModal(true);
  }

  const onlineCount = devices.filter((d) => d.status === 'online').length;
  const totalPunches = devices.reduce((acc, d) => acc + (d.total_punches_ingested || 0), 0);

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://app.staffpulse.io';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <LeavePageHeader
        title="Biometric Hardware Hub"
        description="Direct cloud push integration & device relay for eSSL, ZKTeco, Matrix, Realtime, and desktop time-clocks."
        backHref="/leave/admin"
        backLabel="Back to Leave Balances"
      />

      {/* ── Demo Sandbox Mode Alert Strip ─────────────────────── */}
      {isDemo && (
        <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/20 border-2 border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center shadow">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <div className="text-xs sm:text-sm font-extrabold text-amber-700 dark:text-amber-400">
                ⚡ Interactive Free Trial Sandbox Mode
              </div>
              <p className="text-[11px] text-muted-foreground">
                Biometric hardware registration is locked in preview mode. You can explore the interactive setup guides for all 5 brands or upgrade to connect real machines.
              </p>
            </div>
          </div>
          <a
            href="/signup"
            className="px-4 py-2 rounded-xl bg-accent text-white font-bold text-xs hover:opacity-90 transition-opacity flex-shrink-0 shadow-md"
          >
            Upgrade to Live Plan →
          </a>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connected Devices</span>
            <Cpu className="w-5 h-5 text-accent" />
          </div>
          <div className="text-2xl font-bold mt-2 text-foreground">{devices.length}</div>
          <p className="text-xs text-muted-foreground mt-1">Configured biometric units</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Online Status</span>
            <Radio className="w-5 h-5 text-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-bold mt-2 text-emerald-500">
            {onlineCount} <span className="text-sm font-normal text-muted-foreground">/ {devices.length} Active</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Heartbeat received in last 15 min</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Ingested Punches</span>
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold mt-2 text-foreground">{totalPunches.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">Pushed directly via hardware</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sync Agent</span>
              <Laptop className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">For legacy eTimeTrackLite & LAN machines</p>
          </div>
          <button
            onClick={() => {
              setSelectedDeviceForGuide(devices[0] || null);
              setGuideVendorTab('sync_agent_legacy');
              setShowGuideModal(true);
            }}
            className="mt-3 text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Download Windows Sync Utility
          </button>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface border border-border rounded-xl p-4">
        <div>
          <h3 className="font-semibold text-foreground text-sm">Hardware Network Management</h3>
          <p className="text-xs text-muted-foreground">
            Connect machines directly over Wi-Fi/4G or use the Windows Sync Agent for local databases.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadDevices}
            disabled={loading}
            className="px-3 py-2 text-xs font-medium border border-border bg-card rounded-lg hover:bg-muted text-foreground flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              if (isDemo) {
                setShowDemoUpgradeModal(true);
              } else {
                setShowAddModal(true);
              }
            }}
            className="px-4 py-2 text-xs font-semibold bg-accent text-accent-foreground rounded-lg hover:opacity-90 flex items-center gap-1.5 shadow-sm transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Register New Device
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Devices List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-accent" />
            <p className="text-sm">Querying registered biometric units...</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto">
            <Cpu className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <h4 className="text-base font-semibold text-foreground">No biometric devices configured yet</h4>
            <p className="text-xs text-muted-foreground mt-1 mb-5">
              Connect your first eSSL, ZKTeco, or Realtime machine. Punches will stream directly into attendance records without manual CSV uploads.
            </p>
            <button
              onClick={() => {
                if (isDemo) {
                  setShowDemoUpgradeModal(true);
                } else {
                  setShowAddModal(true);
                }
              }}
              className="px-4 py-2 text-xs font-semibold bg-accent text-accent-foreground rounded-lg hover:opacity-90 inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Your First Machine
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Device & Serial</th>
                  <th className="py-3 px-4">Brand / Protocol</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Connection Status</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4">Ingested Punches</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {devices.map((device) => {
                  const isOnline = device.status === 'online';
                  return (
                    <tr key={device.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground text-sm">{device.device_name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          SN: {device.device_serial}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-foreground border border-border">
                          {VENDOR_LABELS[device.vendor] || device.vendor}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground">
                        {device.offices?.name ? (
                          <span className="inline-flex items-center gap-1">
                            <Building className="w-3 h-3 text-muted-foreground/70" />
                            {device.offices.name} ({device.offices.code})
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground/60">All Branches</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {isOnline ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                              <span className="text-emerald-500 font-semibold">Online</span>
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 rounded-full bg-zinc-500" />
                              <span className="text-muted-foreground">Offline / Waiting</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground">
                        {device.last_punch_at ? (
                          <div>
                            <div className="text-foreground">Punch: {new Date(device.last_punch_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            <div className="text-[10px]">{new Date(device.last_punch_at).toLocaleDateString()}</div>
                          </div>
                        ) : device.last_heartbeat_at ? (
                          <div>
                            <div>Ping: {new Date(device.last_heartbeat_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                        ) : (
                          <span className="italic text-muted-foreground/60">Never connected</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        {device.total_punches_ingested.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => openGuide(device)}
                            title="View Keypad Setup Guide"
                            className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground flex items-center gap-1 transition-colors"
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-accent" /> Setup Guide
                          </button>

                          <button
                            onClick={() => handleCopy(device.api_token, device.id)}
                            title="Copy Device Secret Token"
                            className="px-2 py-1 text-[11px] font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground flex items-center gap-1 transition-colors"
                          >
                            {copiedToken === device.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </button>

                          <button
                            onClick={() => handleDeleteDevice(device.id)}
                            title="Delete Device"
                            className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Register Device */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] text-foreground border border-border rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-6 h-6 text-accent" />
              <h3 className="text-lg font-bold text-foreground">Register Biometric Device</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-6">
              Add your time-clock machine to generate its dedicated Push Server Token and live handshake configuration.
            </p>

            <form onSubmit={handleRegisterDevice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Device Name / Location *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mumbai Plant - Main Gate Face Reader"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Serial Number (SN) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Found on machine back sticker"
                    value={newDeviceSerial}
                    onChange={(e) => setNewDeviceSerial(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Brand / Hardware Protocol
                  </label>
                  <select
                    value={newVendor}
                    onChange={(e) => setNewVendor(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="essl_zkteco">eSSL & ZKTeco (ADMS Push)</option>
                    <option value="realtime_biomax">Realtime & BioMax</option>
                    <option value="matrix">Matrix COSEC</option>
                    <option value="hikvision">Hikvision & Dahua</option>
                    <option value="sync_agent_legacy">eTimeTrackLite (Windows Agent)</option>
                    <option value="other">Universal HTTP Hardware</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Connected on Floor 2 LAN via switch"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-accent text-accent-foreground rounded-lg hover:opacity-90 flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Registering...' : 'Generate Token & View Setup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Interactive Hardware Setup Guide */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] text-foreground border border-border rounded-2xl w-full max-w-3xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <HelpCircle className="w-6 h-6 text-accent" />
              <h3 className="text-lg font-bold text-foreground">
                Hardware Configuration & Setup Guide
              </h3>
            </div>
            {selectedDeviceForGuide && (
              <p className="text-xs text-muted-foreground mb-4">
                Configuring: <strong className="text-foreground">{selectedDeviceForGuide.device_name}</strong> (SN: {selectedDeviceForGuide.device_serial})
              </p>
            )}

            {/* Vendor Switcher Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-border pb-3 mb-6">
              {[
                { id: 'essl_zkteco', label: 'eSSL & ZKTeco' },
                { id: 'realtime_biomax', label: 'Realtime / BioMax' },
                { id: 'matrix', label: 'Matrix COSEC' },
                { id: 'sync_agent_legacy', label: 'eTimeTrackLite (Agent)' },
                { id: 'hikvision', label: 'Hikvision' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setGuideVendorTab(tab.id)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    guideVendorTab === tab.id
                      ? 'bg-accent text-accent-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Quick Copy Credentials Strip */}
            {selectedDeviceForGuide && (
              <div className="bg-slate-50 dark:bg-[#0b0f19] border border-border rounded-xl p-4 mb-6 space-y-3">
                <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Server Push Credentials for this Machine:</span>
                  <span className="text-[11px] font-normal text-muted-foreground">Enter these into machine settings</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white dark:bg-[#162032] border border-border p-2.5 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Server IP / Domain</div>
                      <div className="font-mono font-semibold text-foreground">
                        {typeof window !== 'undefined' ? window.location.hostname : 'app.staffpulse.io'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(window.location.hostname, 'host')}
                      className="p-1 hover:bg-muted rounded text-muted-foreground"
                    >
                      {copiedToken === 'host' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="bg-white dark:bg-[#162032] border border-border p-2.5 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Port</div>
                      <div className="font-mono font-semibold text-foreground">
                        {typeof window !== 'undefined' && window.location.port ? window.location.port : '443'}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 bg-white dark:bg-[#162032] border border-border p-2.5 rounded-lg flex items-center justify-between">
                    <div className="truncate mr-2">
                      <div className="text-[10px] text-muted-foreground uppercase">Direct Push URL with Token</div>
                      <div className="font-mono text-accent truncate text-[11px]">
                        {`${currentHost}/api/biometrics/push?token=${selectedDeviceForGuide.api_token}`}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handleCopy(
                          `${currentHost}/api/biometrics/push?token=${selectedDeviceForGuide.api_token}`,
                          'full_url'
                        )
                      }
                      className="px-2.5 py-1 bg-accent/10 text-accent hover:bg-accent/20 rounded text-xs font-medium flex items-center gap-1 flex-shrink-0"
                    >
                      {copiedToken === 'full_url' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />} Copy URL
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Guide Step-by-Step Content based on Tab */}
            {guideVendorTab === 'essl_zkteco' && (
              <div className="space-y-4 text-xs text-foreground">
                <h4 className="font-bold text-sm text-foreground">
                  Direct Machine Setup (No Desktop Software Required)
                </h4>
                <p className="text-muted-foreground">
                  Follow these 4 keypad steps on your eSSL or ZKTeco machine (e.g., K90, MB20, uFace, SilkBio):
                </p>

                <div className="space-y-3">
                  <div className="p-3 rounded-lg border border-border bg-slate-50 dark:bg-[#0b0f19] flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center flex-shrink-0 text-xs">
                      1
                    </span>
                    <div>
                      <strong className="text-foreground">Open Communications Menu:</strong>
                      <p className="text-muted-foreground mt-0.5">
                        Press <strong>Menu / M/OK</strong> on the device keypad $\rightarrow$ Navigate to <strong>Comm.</strong> (Communication) $\rightarrow$ <strong>Cloud Server Settings</strong> (or <strong>ADMS / Web Server</strong>).
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-surface flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center flex-shrink-0 text-xs">
                      2
                    </span>
                    <div>
                      <strong className="text-foreground">Enable Cloud Push:</strong>
                      <p className="text-muted-foreground mt-0.5">
                        Set <strong>Enable Domain Name</strong> to <strong>ON</strong>. Enter Server Address: <code className="bg-muted px-1.5 py-0.5 rounded text-accent font-mono">{typeof window !== 'undefined' ? window.location.hostname : 'app.staffpulse.io'}</code>
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-slate-50 dark:bg-[#0b0f19] flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center flex-shrink-0 text-xs">
                      3
                    </span>
                    <div>
                      <strong className="text-foreground">Set Server Port & Push URL:</strong>
                      <p className="text-muted-foreground mt-0.5">
                        Set Server Port to <strong>{typeof window !== 'undefined' && window.location.port ? window.location.port : '443'}</strong> (or 80 if HTTP). In the Push URL path, enter: <br/>
                        <code className="bg-muted px-1.5 py-0.5 rounded text-accent font-mono text-[10px] break-all">
                          {`/api/biometrics/push?token=${selectedDeviceForGuide?.api_token || 'TOKEN'}`}
                        </code>
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-slate-50 dark:bg-[#0b0f19] flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center flex-shrink-0 text-xs">
                      4
                    </span>
                    <div>
                      <strong className="text-foreground">Restart & Verify Connection:</strong>
                      <p className="text-muted-foreground mt-0.5">
                        Save and restart the device. The globe / cloud icon on the machine screen will turn <strong>Blue / Connected</strong>. In StaffPulse, this machine will immediately indicate 🟢 <strong>Online</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {guideVendorTab === 'sync_agent_legacy' && (
              <div className="space-y-4 text-xs text-foreground">
                <h4 className="font-bold text-sm text-foreground">
                  Using eSSL eTimeTrackLite Desktop Software?
                </h4>
                <p className="text-muted-foreground">
                  If your biometric machines are hooked to an on-premise Windows PC running <strong>eTimeTrackLite</strong>, run the <strong>StaffPulse Sync Agent</strong> to relay punches automatically:
                </p>

                <div className="bg-slate-50 dark:bg-[#0b0f19] border border-border rounded-xl p-4 space-y-3">
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    <Download className="w-4 h-4 text-purple-400" />
                    <span>Step 1: Download & Place Sync Agent on the Office PC</span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Place <code>StaffPulseSyncAgent.exe</code> into <code>C:\Program Files\StaffPulse\</code> or run the script using Node.js.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-[#0b0f19] border border-border rounded-xl p-4 space-y-3">
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-purple-400" />
                    <span>Step 2: Edit config.json with your Token</span>
                  </div>
                  <pre className="bg-white dark:bg-[#080c14] p-3 rounded-lg border border-border font-mono text-[11px] overflow-x-auto text-purple-600 dark:text-purple-300">
{`{
  "cloudUrl": "${currentHost}/api/biometrics/push",
  "deviceToken": "${selectedDeviceForGuide?.api_token || 'PASTE_YOUR_DEVICE_TOKEN_HERE'}",
  "deviceSerial": "${selectedDeviceForGuide?.device_serial || 'OFFICE_GATE_01'}",
  "syncIntervalSeconds": 30,
  "syncMode": "folder_watch",
  "folderWatchPath": "C:\\\\eTimeTrackLite\\\\DailyLogs"
}`}
                  </pre>
                  <p className="text-muted-foreground text-[11px]">
                    The agent monitors the folder or local MS Access / SQL Server database and pushes all new employee punches every 30 seconds.
                  </p>
                </div>
              </div>
            )}

            {guideVendorTab === 'realtime_biomax' && (
              <div className="space-y-4 text-xs text-foreground">
                <h4 className="font-bold text-sm text-foreground">Realtime & BioMax Cloud Setup</h4>
                <div className="space-y-2 text-muted-foreground">
                  <p>1. Open the machine menu $\rightarrow$ <strong>Network Settings</strong> $\rightarrow$ <strong>Web Server / Cloud</strong>.</p>
                  <p>2. Set Web Server to <strong>Enabled</strong>.</p>
                  <p>3. Enter Server Host: <code className="bg-muted px-1.5 py-0.5 rounded text-accent">{window?.location?.hostname || 'app.staffpulse.io'}</code></p>
                  <p>4. Enter Path: <code className="bg-muted px-1.5 py-0.5 rounded text-accent">/api/biometrics/push?token={selectedDeviceForGuide?.api_token}</code></p>
                  <p>5. Press Save. The machine will begin relaying attendance logs in real time.</p>
                </div>
              </div>
            )}

            {guideVendorTab === 'matrix' && (
              <div className="space-y-4 text-xs text-foreground">
                <h4 className="font-bold text-sm text-foreground">Matrix COSEC Hardware Configuration</h4>
                <div className="space-y-2 text-muted-foreground">
                  <p>1. Log in to your Matrix COSEC Door Controller / Panel Web Interface.</p>
                  <p>2. Go to <strong>System Configuration</strong> $\rightarrow$ <strong>Event Notification / HTTP Post</strong>.</p>
                  <p>3. Set Target URL: <code className="bg-muted px-1.5 py-0.5 rounded text-accent">{currentHost}/api/biometrics/push</code></p>
                  <p>4. Add Custom Header: <code className="bg-muted px-1.5 py-0.5 rounded text-accent">x-device-token: {selectedDeviceForGuide?.api_token}</code></p>
                  <p>5. Test connection and enable live punch delivery.</p>
                </div>
              </div>
            )}

            {guideVendorTab === 'hikvision' && (
              <div className="space-y-4 text-xs text-foreground">
                <h4 className="font-bold text-sm text-foreground">Hikvision MinMoe Face Terminals</h4>
                <div className="space-y-2 text-muted-foreground">
                  <p>1. Open Hikvision Web Manager via device IP (e.g. <code>http://192.168.1.100</code>).</p>
                  <p>2. Navigate to <strong>Configuration</strong> $\rightarrow$ <strong>Network</strong> $\rightarrow$ <strong>Advanced Settings</strong> $\rightarrow$ <strong>HTTP Listening</strong>.</p>
                  <p>3. Destination IP/URL: <code className="bg-muted px-1.5 py-0.5 rounded text-accent">{currentHost}/api/biometrics/push?token={selectedDeviceForGuide?.api_token}</code></p>
                  <p>4. Check <strong>Authentication Events (Face/Fingerprint/Card)</strong> and click Save.</p>
                </div>
              </div>
            )}

            <div className="mt-8 pt-4 border-t border-border flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-accent text-accent-foreground rounded-lg hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Demo Sandbox Upgrade Dialog ─────────────────────────────────── */}
      {showDemoUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-amber-500">
              <Lock className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-bold text-base text-foreground">Hardware Provisioning Locked in Sandbox</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You are currently test-driving StaffPulse in sandbox preview mode. Real biometric hardware cloud push, ADMS endpoints, and Windows sync token generation require an active subscription.
            </p>
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowDemoUpgradeModal(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium border border-border hover:bg-muted"
              >
                Close
              </button>
              <a
                href="/signup"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-accent text-white hover:opacity-90 shadow-md"
              >
                Upgrade to Live Plan →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
