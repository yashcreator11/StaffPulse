import { NextRequest, NextResponse } from 'next/server';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';
import { getSingleDayMetrics } from '@/lib/dashboard/dashboardConfigService';

// GET /api/dashboard/day-view?date=YYYY-MM-DD
// Returns single-day operational attendance metrics for the day view dashboard
export async function GET(req: NextRequest) {
  const requester = await getCurrentEmployee();
  const orgId = requester?.org_id || '00000000-0000-0000-0000-000000000001';

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  try {
    const metrics = await getSingleDayMetrics(orgId, date);
    return NextResponse.json({ metrics });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch day metrics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
