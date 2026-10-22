import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  homeRouteForRole,
  type EmployeeRole,
} from '@/lib/leaveSupabase/getCurrentEmployee';

// GET /api/auth/callback — Supabase Google OAuth callback.
//
// Login security rules:
//   1. Existing employee matched strictly by verified email in employees table
//      -> link Google account and login directly.
//
//   2. Name-based account linking is RETIRED:
//      Requiring verified email match prevents spoofing and account collision.
//
//   3. @company email with no matching employee
//      -> create/refresh pending_employee_signups and send to /leave/pending.
//
//   4. Open redirect protection:
//      Enforces relative URLs starting with exactly one '/' in the 'next' parameter.

const COMPANY_EMAIL_DOMAIN = (
  process.env.COMPANY_EMAIL_DOMAIN || 'wonderbiz.in'
).toLowerCase();

function errorRedirect(origin: string, code: string) {
  const url = new URL('/login', origin);
  url.searchParams.set('error', code);
  return NextResponse.redirect(url);
}

function sanitizeRedirectPath(path: string | null): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  // Must start with exactly one '/' and not contain protocol or double slashes
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
    return trimmed;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { origin, searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (!code) {
    return errorRedirect(origin, 'oauth_missing_code');
  }

  const supabase = await createClient();

  const {
    data: sessionData,
    error: exchangeError,
  } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !sessionData?.user) {
    return errorRedirect(origin, 'oauth_exchange_failed');
  }

  const user = sessionData.user;
  const email = (user.email || '').trim().toLowerCase();

  const googleId =
    user.user_metadata?.provider_id ||
    user.user_metadata?.sub ||
    null;

  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null;

  if (!email) {
    await supabase.auth.signOut();
    return errorRedirect(origin, 'oauth_no_email');
  }

  const domain = email.split('@')[1] || '';
  const isCompanyDomain = domain === COMPANY_EMAIL_DOMAIN;

  const service = createServiceClient();

  // -------------------------------------------------------------------------
  // STEP 1: Strict email matching only (name-based linking retired)
  // -------------------------------------------------------------------------

  const { data: employee, error: lookupError } = await service
    .from('employees')
    .select(
      'id, full_name, email, role, auth_user_id, google_id, profile_confirmed_at, must_change_password'
    )
    .ilike('email', email)
    .maybeSingle();

  if (lookupError) {
    await supabase.auth.signOut();
    return errorRedirect(origin, 'oauth_lookup_failed');
  }

  // -------------------------------------------------------------------------
  // STEP 2: No existing employee found
  // -------------------------------------------------------------------------

  if (!employee) {
    if (!isCompanyDomain) {
      await supabase.auth.signOut();
      return errorRedirect(origin, 'unauthorized_email');
    }

    const { error: pendingError } = await service
      .from('pending_employee_signups')
      .upsert(
        {
          auth_user_id: user.id,
          email,
          full_name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            email,
          avatar_url: avatarUrl,
          google_id: googleId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'auth_user_id',
        }
      );

    if (pendingError) {
      await supabase.auth.signOut();
      return errorRedirect(origin, 'oauth_lookup_failed');
    }

    return NextResponse.redirect(new URL('/leave/pending', origin));
  }

  // -------------------------------------------------------------------------
  // STEP 3: Existing employee found
  // -------------------------------------------------------------------------

  const isAdminRole =
    employee.role === 'hr' ||
    employee.role === 'hr_super_admin';

  if (!isCompanyDomain && !isAdminRole) {
    await supabase.auth.signOut();
    return errorRedirect(origin, 'unauthorized_email');
  }

  // Never silently steal an employee record that is already linked
  // to another Supabase auth account.
  if (
    employee.auth_user_id &&
    employee.auth_user_id !== user.id
  ) {
    await supabase.auth.signOut();
    return errorRedirect(origin, 'already_linked_elsewhere');
  }

  // -------------------------------------------------------------------------
  // STEP 4: Link/update the existing employee
  // -------------------------------------------------------------------------

  const nowIso = new Date().toISOString();

  const update: Record<string, unknown> = {
    email,
    last_login_at: nowIso,
    updated_at: nowIso,
    profile_confirmed_at: employee.profile_confirmed_at || nowIso,
  };

  if (!employee.auth_user_id) {
    update.auth_user_id = user.id;
    update.auth_provider = 'google';
  }

  if (googleId && employee.google_id !== googleId) {
    update.google_id = googleId;
  }

  if (avatarUrl) {
    update.avatar_url = avatarUrl;
  }

  const { error: linkError } = await service
    .from('employees')
    .update(update)
    .eq('id', employee.id);

  if (linkError) {
    await supabase.auth.signOut();
    return errorRedirect(origin, 'link_failed');
  }

  // -------------------------------------------------------------------------
  // STEP 5: Remove stale pending signup
  // -------------------------------------------------------------------------

  await service
    .from('pending_employee_signups')
    .delete()
    .eq('auth_user_id', user.id);

  // -------------------------------------------------------------------------
  // STEP 6: Existing employee -> DIRECT LOGIN (Open-Redirect Protected)
  // -------------------------------------------------------------------------

  const safeNext = sanitizeRedirectPath(next);
  const destination =
    safeNext ||
    homeRouteForRole(employee.role as EmployeeRole);

  return NextResponse.redirect(new URL(destination, origin));
}