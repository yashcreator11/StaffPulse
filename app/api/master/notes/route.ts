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

// GET /api/master/notes?orgId=...
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden: platform admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get('orgId');
  if (!orgId) {
    return NextResponse.json({ error: 'orgId query parameter required' }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from('org_notes')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data || [] });
}

// POST /api/master/notes
export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden: platform admin access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const orgId = body?.orgId;
  const note = String(body?.note || '').trim();

  if (!orgId || !note) {
    return NextResponse.json({ error: 'orgId and note text are required' }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from('org_notes')
    .insert({
      org_id: orgId,
      author_id: admin.id,
      author_email: admin.email,
      note,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Record audit log
  await service.from('platform_audit_log').insert({
    platform_admin_id: admin.id,
    org_id: orgId,
    action: 'note.created',
    details: { noteId: data.id },
  });

  return NextResponse.json({ success: true, note: data });
}
