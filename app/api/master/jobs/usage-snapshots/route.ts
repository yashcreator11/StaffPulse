import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { takeAllUsageSnapshots } from '@/lib/master/usageSnapshotService';

// GET /api/master/jobs/usage-snapshots
// Nightly cron job to generate aggregated usage snapshots across all active tenants
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization') || '';
  const expectedHeader = cronSecret ? `Bearer ${cronSecret}` : '';

  const isAuthorized = (() => {
    if (!cronSecret || !authHeader) return false;
    const bufHeader = Buffer.from(authHeader);
    const bufExpected = Buffer.from(expectedHeader);
    if (bufHeader.length !== bufExpected.length) return false;
    return crypto.timingSafeEqual(bufHeader, bufExpected);
  })();

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await takeAllUsageSnapshots();
    return NextResponse.json(summary);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
