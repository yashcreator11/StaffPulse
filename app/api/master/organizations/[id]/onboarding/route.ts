import { NextRequest, NextResponse } from 'next/server';
import { getOnboardingFunnel, recordOnboardingStep } from '@/lib/master/usageSnapshotService';

// GET /api/master/organizations/[id]/onboarding
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const funnel = await getOnboardingFunnel(id);
    return NextResponse.json({ funnel });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch onboarding funnel';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/master/organizations/[id]/onboarding
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { stage, metadata } = body;
    if (!stage) {
      return NextResponse.json({ error: 'stage is required' }, { status: 400 });
    }
    const success = await recordOnboardingStep(id, stage, metadata);
    return NextResponse.json({ success });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record onboarding step';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
