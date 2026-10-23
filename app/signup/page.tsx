'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { validatePasswordStrength } from '@/lib/authPolicy';

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [primaryOffice, setPrimaryOffice] = useState('HQ');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-generate slug when name changes
  function handleNameChange(val: string) {
    setName(val);
    const generated = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(generated);
  }

  const pwdValidation = validatePasswordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!pwdValidation.isValid) {
      setError(pwdValidation.errors.join('. '));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/organizations/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          adminName,
          adminEmail,
          password,
          primaryOffice,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create organization. Please try again.');
        setLoading(false);
        return;
      }

      setSuccess(`Organization "${name}" created successfully! Redirecting to login…`);
      setTimeout(() => {
        router.push(data.redirectUrl || '/login?registered=1');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-surface)] text-[var(--text-primary)] flex">
      {/* ── Left side: Value proposition banner ── */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-indigo-700 via-blue-600 to-blue-800 text-white flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center border border-white/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold tracking-tight text-lg">StaffPulse</span>
        </div>

        <div className="space-y-4 max-w-md">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 border border-white/20 text-white">
            <ShieldCheck className="w-3.5 h-3.5" /> Multi-Tenant SaaS HRMS
          </span>
          <h1 className="text-3xl font-bold leading-tight">
            Start tracking attendance &amp; leaves for your organization
          </h1>
          <p className="text-blue-100 text-sm leading-relaxed">
            Connect biometric hardware, automate leave policies, empower department leads, and eliminate payroll guesswork with clean, tenant-isolated analytics.
          </p>

          <div className="pt-4 space-y-2.5 text-xs text-blue-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Full biometric vendor hardware support (eSSL, ZKTeco, Matrix, etc.)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Configurable Indian &amp; international leave policy rules</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>100% DPDP &amp; GDPR compliant tenant data isolation</span>
            </div>
          </div>
        </div>

        <p className="text-blue-200/70 text-xs">
          © {new Date().getFullYear()} StaffPulse Platform
        </p>
      </div>

      {/* ── Right side: Organization Registration Form ── */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Create your organization</h2>
            <p className="text-[var(--text-muted)] text-xs mt-1">
              Set up your company workspace and your administrator account.
            </p>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-xl">
            {error && (
              <div className="mb-5 flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 text-xs rounded-xl p-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-5 flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 text-xs rounded-xl p-3">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Organization details */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Company / Organization Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Workspace URL Slug</label>
                <div className="flex items-center">
                  <span className="text-xs text-[var(--text-muted)] px-3 py-2.5 bg-[var(--bg-elevated)] border border-r-0 border-[var(--border)] rounded-l-xl">
                    staffpulse.app/
                  </span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="acme"
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-r-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Primary Office */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Primary Office / Location Code</label>
                <input
                  type="text"
                  required
                  value={primaryOffice}
                  onChange={(e) => setPrimaryOffice(e.target.value.toUpperCase())}
                  placeholder="e.g. HQ or MUM"
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500 font-mono uppercase"
                />
              </div>

              <div className="pt-2 border-t border-[var(--border)]/60">
                <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Administrator Credentials
                </p>
              </div>

              {/* Administrator Name */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Admin Email */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Work Email Address</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@acme.com"
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                  Min 8 characters with at least one number and special symbol.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !name || !slug || !adminEmail || !password}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold py-3 rounded-xl shadow-md transition-all duration-150"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Workspace…
                  </>
                ) : (
                  <>
                    Create Organization Workspace
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-xs text-[var(--text-muted)]">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-500 hover:text-blue-400 font-semibold underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
