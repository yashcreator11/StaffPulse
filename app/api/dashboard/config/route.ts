import { NextRequest, NextResponse } from 'next/server';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';
import { getDashboardConfig, updateDashboardConfig } from '@/lib/dashboard/dashboardConfigService';

// GET /api/dashboard/config
// Returns the tenant dashboard layout, group labels, and widget visibility
export async function GET() {
  const requester = await getCurrentEmployee();
  const orgId = requester?.org_id || '00000000-0000-0000-0000-000000000001';

  try {
    const config = await getDashboardConfig(orgId);
    return NextResponse.json({ config });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch dashboard config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/dashboard/config
// Updates tenant dashboard grouping label, enabled widgets, or default landing view
export async function POST(req: NextRequest) {
  const requester = await getCurrentEmployee();
  if (!requester || (requester.role !== 'hr' && requester.role !== 'hr_super_admin')) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const orgId = requester.org_id || '00000000-0000-0000-0000-000000000001';
  const body = await req.json().catch(() => null);

  try {
    const updated = await updateDashboardConfig(orgId, body || {});
    return NextResponse.json({ success: true, config: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update dashboard config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
