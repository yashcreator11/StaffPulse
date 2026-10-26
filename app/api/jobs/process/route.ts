import { NextRequest, NextResponse } from 'next/server';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';
import { processPendingBackgroundJobs } from '@/lib/jobs/jobWorker';

// POST /api/jobs/process — Process pending background jobs (worker runner trigger)
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const isAuthorizedCron = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);

  let targetOrgId: string | undefined;

  if (!isAuthorizedCron) {
    const requester = await getCurrentEmployee();
    if (!requester) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (requester.role !== 'hr' && requester.role !== 'hr_super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized: HR Admin privileges required' },
        { status: 403 }
      );
    }

    // Tenant isolation: HR admins can only process jobs for their own org
    if (requester.role !== 'hr_super_admin') {
      targetOrgId = requester.org_id || undefined;
    }
  }

  try {
    let limit = 10;
    try {
      const body = await req.json();
      if (typeof body?.limit === 'number' && body.limit > 0) {
        limit = Math.min(body.limit, 50);
      }
    } catch {
      // Empty or non-JSON body is valid, defaults to 10
    }

    const summary = await processPendingBackgroundJobs(limit, targetOrgId);

    return NextResponse.json({
      status: 'success',
      ...summary,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process background jobs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
