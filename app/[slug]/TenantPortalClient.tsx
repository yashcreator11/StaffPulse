'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Lock,
  ArrowRight,
  ShieldCheck,
  Clock,
  CalendarCheck,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface TenantPortalClientProps {
  org: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
  };
}

export default function TenantPortalClient({ org }: TenantPortalClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [microsoftLoading, setMicrosoftLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/api/auth/callback?next=/${encodeURIComponent(org.slug)}`;
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (err) {
      setGoogleLoading(false);
      setError(err.message);
    }
  }

  async function handleMicrosoftSignIn() {
    setError(null);
    setMicrosoftLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/api/auth/callback?next=/${encodeURIComponent(org.slug)}`;
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo,
        scopes: 'email profile openid',
      },
    });
    if (err) {
      setMicrosoftLoading(false);
      setError(err.message);
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !signInData.user) {
        throw new Error(signInError?.message || 'Invalid email or password.');
      }

      // Verify employee record & tenant membership
      const { data: emp, error: empError } = await supabase
        .from('employees')
        .select('id, role, org_id, deactivated_at, is_deleted, employment_status')
        .eq('auth_user_id', signInData.user.id)
        .maybeSingle();

      if (empError || !emp) {
        await supabase.auth.signOut();
        throw new Error("No employee record found for this user account. Please contact your HR administrator.");
      }

      if (emp.deactivated_at || emp.is_deleted || emp.employment_status === 'resigned' || emp.employment_status === 'terminated') {
        await supabase.auth.signOut();
        throw new Error("Your account has been deactivated. Please contact HR.");
      }

      // Check tenant isolation: ensure user actually belongs to this organization
      if (emp.org_id && emp.org_id !== org.id) {
        await supabase.auth.signOut();
        throw new Error(`This account belongs to a different workspace, not ${org.name}. Please use the correct login portal.`);
      }

      // Route based on role
      if (emp.role === 'employee') {
        router.replace('/leave/me');
      } else {
        router.replace('/');
      }
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-surface)] text-[var(--text-primary)] flex flex-col justify-between">
      {/* Top Banner */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-card)]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight leading-none text-[var(--text-primary)]">
              {org.name}
            </h1>
            <span className="text-[11px] text-[var(--text-muted)] font-medium">
              Dedicated Staff &amp; Attendance Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Workspace Active
          </span>
        </div>
      </header>

      {/* Main Content Card */}
      <main className="flex-1 flex items-center justify-center p-4 my-8">
        <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 shadow-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 mx-auto">
              <Lock className="w-3.5 h-3.5" /> Secure Single Sign-On
            </div>
            <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
              Sign In to {org.name}
            </h2>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Authorized employees and management of <strong className="text-[var(--text-primary)]">{org.name}</strong> only.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* SSO Buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              disabled={googleLoading || loading}
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-xs font-bold text-[var(--text-primary)] transition-all flex items-center justify-center gap-2.5 shadow-sm disabled:opacity-50"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google Workspace</span>
            </button>

            <button
              type="button"
              disabled={microsoftLoading || loading}
              onClick={handleMicrosoftSignIn}
              className="w-full py-2.5 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-xs font-bold text-[var(--text-primary)] transition-all flex items-center justify-center gap-2.5 shadow-sm disabled:opacity-50"
            >
              {microsoftLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                </svg>
              )}
              <span>Continue with Microsoft 365</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-[var(--border)] w-full" />
            <span className="bg-[var(--bg-card)] px-3 text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider absolute">
              Or email &amp; password
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
                Work Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)]">Password</label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying credentials…</span>
                </>
              ) : (
                <>
                  <span>Sign In to {org.name}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Perks */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 text-[11px] space-y-2 text-[var(--text-muted)]">
            <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Direct Staff Access</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Record Biometric Punch &amp; View Working Hours</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Apply for Planned, Sick, or Casual Leaves</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-4 text-center text-xs text-[var(--text-muted)]">
        <p>
          Powered by <Link href="/" className="font-bold text-[var(--text-primary)] hover:underline">StaffPulse</Link> Biometric &amp; Attendance Operating System.
        </p>
      </footer>
    </div>
  );
}
