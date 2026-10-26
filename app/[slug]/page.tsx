import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Building2, AlertTriangle, ArrowRight, LogOut, ShieldAlert } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';
import TenantPortalClient from './TenantPortalClient';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function OrganizationSlugPortal({ params }: PageProps) {
  const { slug } = await params;
  const normalizedSlug = (slug || '').trim().toLowerCase();

  // Look up organization by slug
  const supabase = createServiceClient();
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug, plan, status, settings')
    .eq('slug', normalizedSlug)
    .maybeSingle();

  // 1. Not Found screen
  if (!org) {
    return (
      <div className="min-h-screen bg-[var(--bg-surface)] text-[var(--text-primary)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-[var(--text-primary)]">Workspace Not Found</h1>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              We couldn&apos;t find an organization matching the workspace URL{' '}
              <code className="px-2 py-0.5 rounded bg-[var(--bg-surface)] text-blue-500 font-mono font-bold">
                /{slug}
              </code>.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] text-left text-xs text-[var(--text-muted)] space-y-1.5">
            <p className="font-semibold text-[var(--text-primary)]">Looking for your company?</p>
            <p>• Verify the spelling with your HR department.</p>
            <p>• Or log in via the global login gateway.</p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/login"
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all text-center"
            >
              Go to Global Sign-In Gateway
            </Link>
            <Link
              href="/"
              className="w-full py-2.5 px-4 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] rounded-xl transition-all text-center"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Suspended Organization Check
  if (org.status === 'suspended') {
    return (
      <div className="min-h-screen bg-[var(--bg-surface)] text-[var(--text-primary)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[var(--bg-card)] border border-destructive/30 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center mx-auto border border-destructive/20">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-[var(--text-primary)]">{org.name} Suspended</h1>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              This organization workspace is currently suspended by platform administration.
            </p>
          </div>
          <p className="text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border)]">
            Please contact your organization administrator or email{' '}
            <strong className="text-[var(--text-primary)]">support@staffpulse.io</strong> to reactivate access.
          </p>
          <Link
            href="/"
            className="inline-block py-2.5 px-5 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-semibold rounded-xl"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // 3. User session check
  const employee = await getCurrentEmployee();

  if (employee) {
    // If the authenticated user belongs to THIS organization:
    if (employee.org_id === org.id) {
      if (employee.role === 'employee') {
        redirect('/leave/me');
      } else {
        redirect('/');
      }
    }

    // If the authenticated user belongs to a DIFFERENT organization:
    return (
      <div className="min-h-screen bg-[var(--bg-surface)] text-[var(--text-primary)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-[var(--text-primary)]">Account Mismatch</h1>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              You are currently signed in as <strong className="text-[var(--text-primary)]">{employee.email}</strong>, which belongs to another organization.
            </p>
          </div>
          <p className="text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border)]">
            To access the <strong className="text-[var(--text-primary)]">{org.name}</strong> portal, please sign out of your current session first.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/login"
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all text-center flex items-center justify-center gap-2"
            >
              <span>Switch Account / Sign Out</span>
              <LogOut className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="w-full py-2.5 px-4 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] rounded-xl transition-all text-center"
            >
              Return to Your Own Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Render dedicated tenant portal login
  return <TenantPortalClient org={org} />;
}
