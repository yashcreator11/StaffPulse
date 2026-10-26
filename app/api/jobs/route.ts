import { NextRequest, NextResponse } from 'next/server';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';
import { enqueueJob, listRecentJobs, BackgroundJobType } from '@/lib/jobs/jobQueue';
import { processPendingBackgroundJobs } from '@/lib/jobs/jobWorker';

// GET /api/jobs — List recent jobs for requester's organization
export async function GET() {
  const requester = await getCurrentEmployee();
  if (!requester) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (requester.role !== 'hr' && requester.role !== 'hr_super_admin') {
    return NextResponse.json({ error: 'Unauthorized: HR Admin privileges required' }, { status: 403 });
  }

  const orgId = requester.org_id || '00000000-0000-0000-0000-000000000001';
  try {
    const jobs = await listRecentJobs(orgId);
    return NextResponse.json({ jobs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list jobs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/jobs — Enqueue a new background task
export async function POST(req: NextRequest) {
  const requester = await getCurrentEmployee();
  if (!requester) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (requester.role !== 'hr' && requester.role !== 'hr_super_admin') {
    return NextResponse.json({ error: 'Unauthorized: HR Admin privileges required' }, { status: 403 });
  }

  const orgId = requester.org_id || '00000000-0000-0000-0000-000000000001';

  try {
    const body = await req.json();
    const { jobType, payload } = body;

    if (!jobType) {
      return NextResponse.json({ error: 'jobType is required' }, { status: 400 });
    }

    const job = await enqueueJob(orgId, jobType as BackgroundJobType, payload || {});
    queueMicrotask(() => {
      processPendingBackgroundJobs(5, orgId).catch(() => {});
    });
    return NextResponse.json({ job });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to enqueue job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
