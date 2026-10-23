'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Shield, Lock, Mail, AlertCircle, ArrowLeft } from 'lucide-react';

function MasterLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    const err = searchParams.get('error');
    if (err === 'forbidden') {
      return 'Access Denied: Your account does not have Platform Master Admin privileges. Tenant admins cannot access the Master Console.';
    }
    return null;
  });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError('Login failed. Please verify credentials.');
        setLoading(false);
        return;
      }

      // Check if user is in platform_admins
      const { data: adminRecord, error: adminErr } = await supabase
        .from('platform_admins')
        .select('id, role')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (adminErr || !adminRecord) {
        // Not a platform admin - sign out and show error
        await supabase.auth.signOut();
        setError('Forbidden: This identity is not authorized as a Platform Master Admin.');
        setLoading(false);
        return;
      }

      // Successfully authenticated as platform admin
      router.push('/master');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during login.');
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto py-12 px-4 sm:px-6">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xl p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-xl bg-indigo-600 items-center justify-center text-white shadow-lg shadow-indigo-600/30 mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Platform Master Console
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1.5">
            Strict Multi-Tenant Control Plane · Append-Only Auditing
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Platform Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="master@staffpulse.io"
                required
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm transition-colors shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Authenticate to Control Plane'
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-muted)]">
          <Link
            href="/login"
            className="flex items-center gap-1.5 hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Customer App Login
          </Link>
          <span className="text-[10px] uppercase font-mono text-indigo-500">
            SEC-O-GATED
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MasterLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center text-xs text-[var(--text-muted)]">
          Loading Master Console Auth...
        </div>
      }
    >
      <MasterLoginForm />
    </Suspense>
  );
}
