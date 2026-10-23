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

// GET /api/master/feature-flags?orgId=...
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden: platform admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get('orgId');
  if (!orgId) {
    return NextResponse.json({ error: 'orgId parameter required' }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from('org_feature_flags')
    .select('*')
    .eq('org_id', orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ featureFlags: data || [] });
}

// POST /api/master/feature-flags
export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden: platform admin access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const orgId = body?.orgId;
  const featureKey = body?.featureKey;
  const isEnabled = Boolean(body?.isEnabled);

  if (!orgId || !featureKey) {
    return NextResponse.json({ error: 'orgId and featureKey required' }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from('org_feature_flags')
    .upsert(
      {
        org_id: orgId,
        feature_key: featureKey,
        is_enabled: isEnabled,
        updated_by: admin.email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,feature_key' }
    )
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await service.from('platform_audit_log').insert({
    platform_admin_id: admin.id,
    org_id: orgId,
    action: 'feature_flag.updated',
    details: { featureKey, isEnabled },
  });

  return NextResponse.json({ success: true, featureFlag: data });
}
