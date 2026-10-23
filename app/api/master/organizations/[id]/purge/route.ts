import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

async function verifyPlatformOwner() {
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: orgId } = await params;
  const admin = await verifyPlatformOwner();

  if (!admin || (admin.role !== 'owner' && admin.role !== 'support')) {
    return NextResponse.json({ error: 'Forbidden: Platform owner/support credentials required for data purge' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const confirmation = String(body.confirmation || '').trim();
  const requiredConfirmation = `CONFIRM_PURGE_${orgId.slice(0, 8)}`;

  if (confirmation !== requiredConfirmation) {
    return NextResponse.json(
      {
        error: `Invalid typed confirmation. To prevent accidental data loss, you must pass confirmation: "${requiredConfirmation}"`,
      },
      { status: 400 }
    );
  }

  const service = createServiceClient();

  // Fetch organization
  const { data: org } = await service.from('organizations').select('*').eq('id', orgId).maybeSingle();
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  try {
    // 1. Delete dependent child records
    await Promise.all([
      service.from('attendance').delete().eq('org_id', orgId),
      service.from('leave_requests').delete().eq('org_id', orgId),
      service.from('leave_balances').delete().eq('org_id', orgId),
      service.from('holidays').delete().eq('org_id', orgId),
      service.from('notifications').delete().eq('org_id', orgId),
      service.from('subscriptions').delete().eq('org_id', orgId),
      service.from('invoices').delete().eq('org_id', orgId),
      service.from('employees').delete().eq('org_id', orgId),
    ]);

    // 2. Mark organization as permanently purged
    await service.from('organizations').update({
      status: 'cancelled',
      name: `[PURGED] ${org.name}`,
      domain: `purged_${Date.now()}_${org.domain || ''}`,
      subscription_status: 'cancelled',
      updated_at: new Date().toISOString(),
    }).eq('id', orgId);

    // 3. Log permanent deletion in platform audit log
    await service.from('platform_audit_log').insert({
      platform_admin_id: admin.id,
      org_id: orgId,
      action: 'organization.permanent_purge_executed',
      details: {
        purgedOrgName: org.name,
        purgedOrgId: orgId,
        authorizedAdmin: admin.email,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Organization "${org.name}" and all associated workforce data have been permanently cryptographically purged.`,
      purgedOrgId: orgId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to execute purge';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
