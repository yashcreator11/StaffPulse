import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

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

// GET /api/master/audit
// Fetches immutable platform audit log entries
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden: platform admin access required' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

  const service = createServiceClient();

  const { data: logs, error } = await service
    .from('platform_audit_log')
    .select('id, platform_admin_id, org_id, action, details, ip_address, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enrich with admin emails and org names for clean UI display
  const adminIds = Array.from(new Set((logs || []).map((l) => l.platform_admin_id).filter(Boolean)));
  const orgIds = Array.from(new Set((logs || []).map((l) => l.org_id).filter(Boolean)));

  const [{ data: admins }, { data: orgs }] = await Promise.all([
    adminIds.length > 0
      ? service.from('platform_admins').select('id, email, role').in('id', adminIds)
      : Promise.resolve({ data: [] }),
    orgIds.length > 0
      ? service.from('organizations').select('id, name, slug').in('id', orgIds)
      : Promise.resolve({ data: [] }),
  ]);

  const adminMap = new Map((admins || []).map((a) => [a.id, a]));
  const orgMap = new Map((orgs || []).map((o) => [o.id, o]));

  const enriched = (logs || []).map((log) => ({
    ...log,
    admin_email: log.platform_admin_id ? adminMap.get(log.platform_admin_id)?.email || 'Unknown' : 'System',
    org_name: log.org_id ? orgMap.get(log.org_id)?.name || 'Unknown' : null,
    org_slug: log.org_id ? orgMap.get(log.org_id)?.slug || null : null,
  }));

  return NextResponse.json({ auditLogs: enriched });
}
