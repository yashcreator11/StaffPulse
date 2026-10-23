import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { takeAllUsageSnapshots } from '@/lib/master/usageSnapshotService';

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

// POST /api/master/jobs/trigger-snapshots
// Manually triggers usage snapshot engine across all active organizations
export async function POST() {
  const admin = await verifyPlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden: platform admin access required' }, { status: 403 });
  }

  try {
    const summary = await takeAllUsageSnapshots();

    // Log the manual trigger in audit log
    const service = createServiceClient();
    await service.from('platform_audit_log').insert({
      platform_admin_id: admin.id,
      action: 'manual_trigger_usage_snapshots',
      details: summary,
    });

    return NextResponse.json({ success: true, summary });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
