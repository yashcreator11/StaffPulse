import { NextRequest, NextResponse } from 'next/server';
import { createLeaveServiceClient } from '@/lib/leaveSupabase/server';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';

// GET /api/setup
// Returns current setup status for the logged-in administrator's organization
export async function GET() {
  const requester = await getCurrentEmployee();
  if (!requester || (requester.role !== 'hr' && requester.role !== 'hr_super_admin')) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const service = createLeaveServiceClient();

  const [orgRes, officesRes] = await Promise.all([
    service.from('organizations').select('id, name, slug, timezone, onboarding_completed_at, settings').eq('id', requester.org_id).single(),
    service.from('offices').select('code, name').eq('org_id', requester.org_id),
  ]);

  return NextResponse.json({
    organization: orgRes.data,
    offices: officesRes.data || [],
    isCompleted: Boolean(orgRes.data?.onboarding_completed_at),
  });
}

// POST /api/setup
// Completes the setup wizard, updating organization timezone, offices, and marking onboarding complete
export async function POST(req: NextRequest) {
  const requester = await getCurrentEmployee();
  if (!requester || (requester.role !== 'hr' && requester.role !== 'hr_super_admin')) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const service = createLeaveServiceClient();
  const orgId = requester.org_id;

  const timezone = String(body?.timezone || 'Asia/Kolkata').trim();
  const newOffices: { code: string; name: string }[] = Array.isArray(body?.offices) ? body.offices : [];

  // 1. Update organization settings & mark onboarding complete
  const nowIso = new Date().toISOString();
  const { error: orgError } = await service
    .from('organizations')
    .update({
      timezone,
      onboarding_completed_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', orgId);

  if (orgError) {
    return NextResponse.json({ error: orgError.message }, { status: 500 });
  }

  // 2. Insert any added offices
  if (newOffices.length > 0) {
    const officeRows = newOffices.map(o => ({
      org_id: orgId,
      code: o.code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8),
      name: o.name.trim() || `${o.code.toUpperCase()} Office`,
    }));

    await service.from('offices').upsert(officeRows, { onConflict: 'org_id,code' });
  }

  return NextResponse.json({
    success: true,
    message: 'Onboarding completed successfully!',
    redirectUrl: '/',
  });
}
