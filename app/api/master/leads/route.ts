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

// GET /api/master/leads
// Fetches inbound enterprise demo requests captured from public showcase
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden: platform admin access required' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status');

  const service = createServiceClient();
  let query = service
    .from('demo_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: leads, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leads: leads || [] });
}

// PATCH /api/master/leads
// Updates status or notes of an inbound demo request
export async function PATCH(req: NextRequest) {
  const admin = await verifyPlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden: platform admin access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.id) {
    return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
  }

  const service = createServiceClient();
  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (body.status) {
    updatePayload.status = body.status;
  }
  if (body.notes !== undefined) {
    updatePayload.notes = body.notes;
  }

  const { data: updated, error } = await service
    .from('demo_requests')
    .update(updatePayload)
    .eq('id', body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Write audit log
  await service.from('platform_audit_log').insert({
    platform_admin_id: admin.id,
    action: 'update_demo_lead_status',
    details: { lead_id: body.id, status: body.status, company: updated?.company_name },
  });

  return NextResponse.json({ lead: updated });
}
