import { NextRequest, NextResponse } from 'next/server';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';
import { getOfficeShifts, saveOfficeShift } from '@/lib/shifts/shiftService';

// GET /api/shifts?officeCode=MUM
export async function GET(req: NextRequest) {
  const requester = await getCurrentEmployee();
  const orgId = requester?.org_id || '00000000-0000-0000-0000-000000000001';

  const { searchParams } = new URL(req.url);
  const officeCode = searchParams.get('officeCode') || undefined;

  try {
    const shifts = await getOfficeShifts(orgId, officeCode);
    return NextResponse.json({ shifts });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch shifts';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/shifts
export async function POST(req: NextRequest) {
  const requester = await getCurrentEmployee();
  if (!requester || (requester.role !== 'hr' && requester.role !== 'hr_super_admin')) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const orgId = requester.org_id || '00000000-0000-0000-0000-000000000001';
  const body = await req.json().catch(() => null);

  if (!body?.officeCode || !body?.name || !body?.startTime || !body?.endTime) {
    return NextResponse.json(
      { error: 'Missing required fields: officeCode, name, startTime, endTime' },
      { status: 400 }
    );
  }

  try {
    const saved = await saveOfficeShift(orgId, {
      officeCode: String(body.officeCode).trim(),
      name: String(body.name).trim(),
      startTime: String(body.startTime).trim(),
      endTime: String(body.endTime).trim(),
      gracePeriodMinutes: Number(body.gracePeriodMinutes ?? 15),
      halfDayThresholdMinutes: Number(body.halfDayThresholdMinutes ?? 240),
      fullDayThresholdMinutes: Number(body.fullDayThresholdMinutes ?? 480),
      isNightShift: Boolean(body.isNightShift),
      isDefault: Boolean(body.isDefault),
    });

    return NextResponse.json({ success: true, shift: saved });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save shift';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
