import { NextRequest, NextResponse } from 'next/server';
import { getOrgUsageHistory, takeUsageSnapshot } from '@/lib/master/usageSnapshotService';

// GET /api/master/organizations/[id]/usage
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit')) || 30;

  try {
    const history = await getOrgUsageHistory(id, limit);
    return NextResponse.json({ history });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch usage history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/master/organizations/[id]/usage
// Triggers an immediate snapshot calculation for this organization
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const snapshot = await takeUsageSnapshot(id);
    return NextResponse.json({ success: true, snapshot });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate usage snapshot';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
