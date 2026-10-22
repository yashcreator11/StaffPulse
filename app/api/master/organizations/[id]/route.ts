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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyPlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden: platform admin access required' }, { status: 403 });
  }

  const { id } = await params;
  const service = createServiceClient();

  const { data: org, error } = await service
    .from('organizations')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  // Aggregate metadata
  const { count: employeeCount } = await service
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', id)
    .eq('is_deleted', false);

  // Tenant admin contacts (HR Admins)
  const { data: admins } = await service
    .from('employees')
    .select('id, full_name, email, role')
    .eq('org_id', id)
    .in('role', ['hr', 'hr_super_admin'])
    .eq('is_deleted', false);

  // Configuration summary
  const { count: officeCount } = await service
    .from('offices')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', id);

  const { count: uploadCount } = await service
    .from('uploaded_months')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', id);

  return NextResponse.json({
    organization: org,
    metrics: {
      employeeCount: employeeCount ?? 0,
      officeCount: officeCount ?? 0,
      uploadCount: uploadCount ?? 0,
    },
    adminContacts: admins ?? [],
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyPlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden: platform admin access required' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const service = createServiceClient();

  // Fetch current org state
  const { data: currentOrg } = await service
    .from('organizations')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!currentOrg) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  let actionType = 'update_organization';

  // 1. Suspension / Reactivation with typed confirmation
  if (body.status && body.status !== currentOrg.status) {
    if (body.status === 'suspended') {
      if (body.confirmation !== 'SUSPEND') {
        return NextResponse.json({ error: 'Typed confirmation "SUSPEND" is required' }, { status: 400 });
      }
      updates.status = 'suspended';
      updates.suspended_at = new Date().toISOString();
      actionType = 'suspend_organization';
    } else if (currentOrg.status === 'suspended' && body.status === 'active') {
      if (body.confirmation !== 'REACTIVATE') {
        return NextResponse.json({ error: 'Typed confirmation "REACTIVATE" is required' }, { status: 400 });
      }
      updates.status = 'active';
      updates.suspended_at = null;
      actionType = 'reactivate_organization';
    } else {
      updates.status = body.status;
      actionType = `set_status_${body.status}`;
    }
  }

  // 2. Plan change
  if (body.plan && ['plan1', 'plan2', 'plan3'].includes(body.plan)) {
    updates.plan = body.plan;
  }

  // 3. Seat limits
  if (body.seat_limit !== undefined) {
    updates.seat_limit = parseInt(body.seat_limit, 10);
  }

  const { data: updatedOrg, error: updateError } = await service
    .from('organizations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (updateError || !updatedOrg) {
    return NextResponse.json({ error: updateError?.message || 'Update failed' }, { status: 500 });
  }

  // Record action in immutable audit log
  await service.from('platform_audit_log').insert({
    platform_admin_id: admin.id,
    org_id: id,
    action: actionType,
    details: {
      previous: { status: currentOrg.status, plan: currentOrg.plan, seat_limit: currentOrg.seat_limit },
      updated: { status: updatedOrg.status, plan: updatedOrg.plan, seat_limit: updatedOrg.seat_limit },
    },
  });

  return NextResponse.json({ organization: updatedOrg });
}
