'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react';

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST +05:30)' },
  { value: 'UTC', label: 'UTC (+00:00)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST +04:00)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT +08:00)' },
];

export default function SetupWizardPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [offices, setOffices] = useState<{ code: string; name: string }[]>([
    { code: 'HQ', name: 'Headquarters' },
  ]);
  const [groupingModel, setGroupingModel] = useState<'departments' | 'flat'>('departments');
  const [newOfficeCode, setNewOfficeCode] = useState('');
  const [newOfficeName, setNewOfficeName] = useState('');

  useEffect(() => {
    fetch('/api/setup')
      .then((res) => {
        if (!res.ok) {
          router.replace('/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.isCompleted) {
          router.replace('/');
          return;
        }
        if (data.organization?.name) {
          setOrgName(data.organization.name);
        }
        if (data.organization?.timezone) {
          setTimezone(data.organization.timezone);
        }
        if (data.offices && data.offices.length > 0) {
          setOffices(data.offices);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [router]);

  function addOffice() {
    const code = newOfficeCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const name = newOfficeName.trim() || `${code} Office`;
    if (!code) return;
    if (offices.some((o) => o.code === code)) return;
    setOffices([...offices, { code, name }]);
    setNewOfficeCode('');
    setNewOfficeName('');
  }

  function removeOffice(code: string) {
    if (offices.length <= 1) return; // Keep at least one primary office
    setOffices(offices.filter((o) => o.code !== code));
  }

  async function handleComplete(seedSampleData: boolean = false) {
    setSaving(true);
    try {
      if (seedSampleData) {
        setSeedingDemo(true);
        await fetch('/api/demo/seed', { method: 'POST' });
        setSeedingDemo(false);
      }

      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timezone,
          offices,
          groupingModel,
        }),
      });

      if (res.ok) {
        router.push('/');
        router.refresh();
      }
    } catch {
      setSaving(false);
      setSeedingDemo(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-surface)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-surface)] text-[var(--text-primary)] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* ── Progress Indicators ── */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
            <span>Setup Wizard</span>
            <span>Step {step} of 4</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-blue-600' : 'bg-[var(--bg-elevated)] border border-[var(--border)]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* ── Card Container ── */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-xl">
          {/* STEP 1: Company Profile & Timezone */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Company Profile &amp; Timezone</h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Configure your primary timezone for biometric day boundaries and reporting.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Organization Name</label>
                  <input
                    type="text"
                    disabled
                    value={orgName}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] opacity-75"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Primary Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                    Attendance records and daily cutoffs will calculate according to this timezone.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Branch Offices */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Branch Offices &amp; Locations</h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Define the locations where your biometric devices are deployed.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg-surface)]">
                  {offices.map((o) => (
                    <div key={o.code} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold px-2 py-1 bg-blue-500/10 text-blue-500 rounded border border-blue-500/20">
                          {o.code}
                        </span>
                        <span className="text-sm font-medium">{o.name}</span>
                      </div>
                      {offices.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOffice(o.code)}
                          className="p-1.5 text-[var(--text-muted)] hover:text-red-500 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Office Form */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newOfficeCode}
                    onChange={(e) => setNewOfficeCode(e.target.value)}
                    placeholder="CODE (e.g. PUN)"
                    className="w-28 uppercase font-mono bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={newOfficeName}
                    onChange={(e) => setNewOfficeName(e.target.value)}
                    placeholder="Location Name (e.g. Pune Tech Park)"
                    className="flex-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addOffice}
                    disabled={!newOfficeCode.trim()}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-xs font-medium disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Grouping Model */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Team &amp; Department Structure</h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    How does your organization structure people and reporting lines?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setGroupingModel('departments')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    groupingModel === 'departments'
                      ? 'bg-blue-500/10 border-blue-500 text-blue-500 dark:text-blue-400'
                      : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] hover:border-blue-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm text-[var(--text-primary)]">Department-Based</span>
                    {groupingModel === 'departments' && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Employees belong to departments (Engineering, Sales, HR, etc.) with dedicated breakdown analytics and department managers.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setGroupingModel('flat')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    groupingModel === 'flat'
                      ? 'bg-blue-500/10 border-blue-500 text-blue-500 dark:text-blue-400'
                      : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] hover:border-blue-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm text-[var(--text-primary)]">Flat / Company-Wide</span>
                    {groupingModel === 'flat' && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Best for flat startups, single teams, or companies with no department columns. Clean, unified company-wide roster view.
                  </p>
                </button>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Ready to Launch */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">You&apos;re Ready to Launch!</h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Choose how you would like to start your workspace.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {/* Option 1: Explore with Sample Demo Data */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleComplete(true)}
                  className="w-full p-4 rounded-xl border border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10 text-left transition-all group flex items-start gap-3.5"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[var(--text-primary)]">
                        Explore with Sample Demo Data (Recommended)
                      </span>
                      <span className="text-[10px] font-bold uppercase bg-blue-500 text-white px-1.5 py-0.5 rounded">
                        Fastest
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Populates 2 offices, 4 departments, 10 employees, and 1 month of attendance records so you can test all charts, single-day views, and leave requests immediately.
                    </p>
                  </div>
                </button>

                {/* Option 2: Empty Workspace */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleComplete(false)}
                  className="w-full p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-left transition-all flex items-start gap-3.5"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-[var(--text-primary)]">
                      Start Clean with an Empty Workspace
                    </span>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Take me directly to the empty dashboard so I can upload our company biometric CSV files and onboard employees myself.
                    </p>
                  </div>
                </button>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setStep(3)}
                  className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                {saving && (
                  <span className="flex items-center gap-2 text-xs text-blue-500 font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {seedingDemo ? 'Seeding demo data…' : 'Finalizing workspace…'}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
