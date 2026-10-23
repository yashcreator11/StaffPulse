import { NextRequest, NextResponse } from 'next/server';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';
import { getJobStatus } from '@/lib/jobs/jobQueue';

// GET /api/jobs/[id] — Poll progress of a specific background job
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requester = await getCurrentEmployee();
  if (!requester) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const job = await getJobStatus(id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify tenant isolation
    const orgId = requester.org_id || '00000000-0000-0000-0000-000000000001';
    if (job.org_id !== orgId && requester.role !== 'hr_super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ job });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch job status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
