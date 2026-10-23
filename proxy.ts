import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// ── Auth model (SaaS Gateway) ───────────────────────────────────────────
// 1. /master/* and /api/master/* — Platform Master Console.
//    Gated strictly by platform_admins table (independent of tenant employees).
//    Tenant admins (including hr_super_admin) are blocked with 403.
//
// 2. Suspended Organizations:
//    Blocked from accessing application routes or tenant APIs.
//
// 3. Role-based routing:
//    - hr / hr_super_admin : full Dashboard ('/') + full Leave Tracker admin.
//    - manager / lead       : read-only team view + leave approvals.
//    - employee             : '/leave/me' only.

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // ── Master Platform Console Routing ───────────────────────────────────
  const isMasterRoute = pathname.startsWith('/master') || pathname.startsWith('/api/master');
  const isMasterLogin = pathname === '/master/login';

  if (isMasterRoute && !isMasterLogin) {
    const { response, user, supabase } = await updateSession(req);
    const wantsJson = pathname.startsWith('/api') || req.headers.get('accept')?.includes('application/json');

    if (!user) {
      if (wantsJson) {
        return NextResponse.json({ error: 'Master authentication required' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/master/login', req.url));
    }

    if (supabase) {
      const { data: admin } = await supabase
        .from('platform_admins')
        .select('id, role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!admin) {
        if (wantsJson) {
          return NextResponse.json({ error: 'Forbidden: Platform admin privileges required' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/master/login?error=forbidden', req.url));
      }
    }

    return response;
  }

  const isLeaveRoute = pathname.startsWith('/leave') || pathname.startsWith('/api/leave');

  if (isLeaveRoute) {
    const { response } = await updateSession(req);
    return response;
  }

  const isPublicLanding = pathname === '/' || pathname === '/terms' || pathname === '/privacy';
  const isSharedView = req.nextUrl.searchParams.get('view') === '1';
  const isSharedLinkApi = pathname.startsWith('/api/shared-link');
  const isLoginPage = pathname.startsWith('/login') || isMasterLogin;
  const isSignupPage = pathname.startsWith('/signup') || pathname.startsWith('/api/organizations/signup');
  const isSetupPage = pathname.startsWith('/setup') || pathname.startsWith('/api/setup');
  const isAuthApi = pathname.startsWith('/api/auth');
  const isHealthApi = pathname.startsWith('/api/health');
  const isDemoApi = pathname.startsWith('/api/demo');

  if (isPublicLanding || isSharedView || isSharedLinkApi || isLoginPage || isSignupPage || isSetupPage || isAuthApi || isHealthApi || isDemoApi) {
    const { response } = await updateSession(req);
    return response;
  }

  const { response, user, supabase } = await updateSession(req);

  if (!user) {
    const wantsJson = pathname.startsWith('/api') || req.headers.get('accept')?.includes('application/json') || req.headers.get('x-requested-with') === 'XMLHttpRequest';
    if (wantsJson) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // ── Suspended Organization & Role Check ──────────────────────────────
  const isPrefetch = req.headers.get('next-router-prefetch') === '1' || req.headers.get('purpose') === 'prefetch';

  if (!isPrefetch && supabase) {
    const { data: employee } = await supabase
      .from('employees')
      .select('role, org_id, deactivated_at, is_deleted, employment_status, organizations!employees_org_id_fkey(status)')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    // Block deactivated / offboarded employees immediately
    const isDeactivated = Boolean(
      employee?.deactivated_at ||
      employee?.is_deleted ||
      employee?.employment_status === 'resigned' ||
      employee?.employment_status === 'terminated'
    );
    if (employee && isDeactivated) {
      const wantsJson = pathname.startsWith('/api') || req.headers.get('accept')?.includes('application/json');
      if (wantsJson) {
        return NextResponse.json({ error: 'Account deactivated. Please contact your organization administrator.' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/login?error=account_deactivated', req.url));
    }

    // Block suspended organizations immediately
    const orgStatus = (employee as any)?.organizations?.status;
    if (orgStatus === 'suspended') {
      const wantsJson = pathname.startsWith('/api') || req.headers.get('accept')?.includes('application/json');
      if (wantsJson) {
        return NextResponse.json({ error: 'Organization suspended. Please contact platform support.' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/login?error=org_suspended', req.url));
    }

    // Role check — plain `employee` role never sees the root Dashboard
    if (pathname === '/' && employee?.role === 'employee') {
      return NextResponse.redirect(new URL('/leave/me', req.url));
    }
  }

  return response;
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
