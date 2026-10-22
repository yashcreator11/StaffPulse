import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// ── Master Console API: List & Create Organizations ─────────────────────────
// Security Rules:
// 1. Caller MUST be verified in platform_admins (tenant admins get 403).
// 2. Returns AGGREGATES only — NEVER exposes employee attendance records or leave details.

async function verifyPlatformAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data: admin } = await service
    .from('platform_admins')
    .select('id, user_id, email, role')
    .eq('user_id', user.id)
    .maybeSingle();

  return admin;
}

export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden: platform admin access required' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const search = searchParams.get('search')?.toLowerCase() || '';
  const statusFilter = searchParams.get('status');

  const service = createServiceClient();

  let query = service
    .from('organizations')
    .select('id, name, slug, plan, status, seat_limit, trial_ends_at, suspended_at, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data: orgs, error } = await query;

  if (error || !orgs) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch organizations' }, { status: 500 });
  }

  // Enrich organizations with aggregate counts (DPDP-compliant: zero raw attendance or personal data)
  const enriched = await Promise.all(
    orgs.map(async (org) => {
      // 1. Employee headcount
      const { count: employeeCount } = await service
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('is_deleted', false);

      // 2. Last attendance upload timestamp
      const { data: latestUpload } = await service
        .from('uploaded_months')
        .select('uploaded_at')
        .eq('org_id', org.id)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        ...org,
        employeeCount: employeeCount ?? 0,
        lastUploadAt: latestUpload?.uploaded_at ?? null,
      };
    })
  );

  const filtered = search
    ? enriched.filter((o) => o.name.toLowerCase().includes(search) || o.slug.toLowerCase().includes(search))
    : enriched;

  return NextResponse.json({ organizations: filtered });
}

export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden: platform admin access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.name || !body.slug) {
    return NextResponse.json({ error: 'Organization name and slug are required' }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: newOrg, error } = await service
    .from('organizations')
    .insert({
      name: body.name.trim(),
      slug: body.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''),
      plan: body.plan || 'plan1',
      status: body.status || 'trial',
      seat_limit: body.seat_limit ? parseInt(body.seat_limit, 10) : 100,
    })
    .select()
    .single();

  if (error || !newOrg) {
    return NextResponse.json({ error: error?.message || 'Failed to create organization' }, { status: 400 });
  }

  // Write immutable audit log
  await service.from('platform_audit_log').insert({
    platform_admin_id: admin.id,
    org_id: newOrg.id,
    action: 'create_organization',
    details: { name: newOrg.name, slug: newOrg.slug, plan: newOrg.plan },
  });

  return NextResponse.json({ organization: newOrg }, { status: 201 });
}
