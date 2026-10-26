'use client';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle, Loader2, Sparkles, Check } from 'lucide-react';
import { validatePasswordStrength } from '@/lib/authPolicy';
import { createClient } from '@/lib/supabase/client';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPlan = (searchParams.get('plan') as 'starter' | 'pro' | 'enterprise') || 'pro';
  const [planTier, setPlanTier] = useState<'starter' | 'pro' | 'enterprise'>(initialPlan);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

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
          planTier,
          billingCycle,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create organization. Please try again.');
        setLoading(false);
        return;
      }

      setSuccess(`Organization "${name}" created! Signing in & redirecting to checkout...`);

      // Auto-authenticate as the newly created HR Super Admin
      try {
        const supabase = createClient();
        await supabase.auth.signInWithPassword({
          email: adminEmail,
          password,
        });
      } catch (authErr) {
        console.warn('Auto sign-in warning:', authErr);
      }

      setTimeout(() => {
        router.push(data.redirectUrl || `/checkout?plan=${planTier}&cycle=${billingCycle}&org=${data.orgId}`);
      }, 1000);
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
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Official GST B2B tax invoice and instant account activation</span>
            </div>
          </div>
        </div>

        <p className="text-blue-200/70 text-xs">
          © {new Date().getFullYear()} StaffPulse Platform
        </p>
      </div>

      {/* ── Right side: Organization Registration Form ── */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Create your organization</h2>
              <span className="text-[11px] font-semibold text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                Step 1 of 2
              </span>
            </div>
            <p className="text-[var(--text-muted)] text-xs mt-1">
              Set up your company workspace, then complete checkout to unlock your dashboard.
            </p>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 sm:p-7 shadow-xl space-y-5">
            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 text-xs rounded-xl p-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl p-3">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Plan Selection Carousel / Tabs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-[var(--text-primary)]">Select Subscription Tier</label>
                  <div className="flex items-center gap-1 text-[11px] bg-[var(--bg-surface)] p-0.5 rounded-lg border border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('annual')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                        billingCycle === 'annual'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Annual (20% off)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                        billingCycle === 'monthly'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Monthly
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPlanTier('starter')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      planTier === 'starter'
                        ? 'border-blue-500 bg-blue-500/10 shadow-sm ring-1 ring-blue-500'
                        : 'border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <div className="font-bold text-xs text-[var(--text-primary)]">Starter</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-extrabold mt-0.5">
                      {billingCycle === 'annual' ? '₹1,199' : '₹1,499'}
                      <span className="text-[10px] text-[var(--text-muted)] font-normal">/mo</span>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1 line-clamp-1">CSV Attendance</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlanTier('pro')}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      planTier === 'pro'
                        ? 'border-orange-500 bg-orange-500/10 shadow-sm ring-1 ring-orange-500'
                        : 'border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <span className="absolute -top-2 right-2 text-[9px] font-black uppercase tracking-wider bg-orange-500 text-white px-1.5 py-0.5 rounded-full shadow">
                      Popular
                    </span>
                    <div className="font-bold text-xs text-[var(--text-primary)]">Pro Growth</div>
                    <div className="text-xs text-orange-600 dark:text-orange-400 font-extrabold mt-0.5">
                      {billingCycle === 'annual' ? '₹2,399' : '₹2,999'}
                      <span className="text-[10px] text-[var(--text-muted)] font-normal">/mo</span>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1 line-clamp-1">Direct Hardware Push</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlanTier('enterprise')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      planTier === 'enterprise'
                        ? 'border-purple-500 bg-purple-500/10 shadow-sm ring-1 ring-purple-500'
                        : 'border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <div className="font-bold text-xs text-[var(--text-primary)]">Enterprise</div>
                    <div className="text-xs text-purple-600 dark:text-purple-400 font-extrabold mt-0.5">
                      {billingCycle === 'annual' ? '₹3,999' : '₹4,999'}
                      <span className="text-[10px] text-[var(--text-muted)] font-normal">/mo</span>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1 line-clamp-1">SSO & Multi-Branch</p>
                  </button>
                </div>
              </div>

              {/* Organization details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Location Code</label>
                  <input
                    type="text"
                    required
                    value={primaryOffice}
                    onChange={(e) => setPrimaryOffice(e.target.value.toUpperCase())}
                    placeholder="e.g. HQ or MUM"
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500 font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Workspace URL</label>
                <div className="flex items-center">
                  <span className="text-xs text-[var(--text-muted)] px-3 py-2 bg-[var(--bg-elevated)] border border-r-0 border-[var(--border)] rounded-l-xl">
                    staffpulse.app/
                  </span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="acme"
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-r-xl px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border)]/60">
                <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Admin Account Details
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Admin Full Name</label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Work Email</label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@acme.com"
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  Min 8 characters with at least one number and special symbol.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !name || !slug || !adminEmail || !password}
                className="w-full mt-3 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-bold py-3 rounded-xl shadow-lg transition-all duration-150"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registering Organization…
                  </>
                ) : (
                  <>
                    Continue to Checkout &amp; Activation
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
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

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[var(--bg-surface)] text-sm">Loading signup...</div>}>
      <SignupForm />
    </Suspense>
  );
}
