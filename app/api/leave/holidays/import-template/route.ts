import { NextRequest, NextResponse } from 'next/server';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';
import { HOLIDAY_PRESETS, getResolvedHolidaysForYear } from '@/lib/templates/statutoryTemplates';
import { logAuditEvent } from '@/lib/compliance/auditService';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:34321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET() {
  return NextResponse.json({
    presets: Object.values(HOLIDAY_PRESETS).map(p => ({
      id: p.id,
      name: p.name,
      region: p.region,
      description: p.description,
      holidayCount: p.holidays.length,
    })),
  });
}

export async function POST(req: NextRequest) {
  const requester = await getCurrentEmployee();
  if (!requester || (requester.role !== 'hr' && requester.role !== 'hr_super_admin')) {
    return NextResponse.json({ error: 'Unauthorized: Only HR Admins may configure statutory holidays' }, { status: 403 });
  }

  const orgId = requester.org_id || '00000000-0000-0000-0000-000000000001';
  const body = await req.json().catch(() => ({}));
  const presetId = body.presetId || 'india_central';
  const year = Number(body.year) || new Date().getFullYear();

  const resolvedHolidays = getResolvedHolidaysForYear(presetId, year);
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  let inserted = 0;
  for (const h of resolvedHolidays) {
    const { error } = await supabase.from('holidays').upsert(
      {
        org_id: orgId,
        holiday_date: h.date,
        name: h.name,
      },
      { onConflict: 'org_id,holiday_date' }
    );
    if (!error) inserted++;
  }

  await logAuditEvent({
    orgId,
    actorId: requester.id,
    actorEmail: requester.email,
    actorRole: requester.role,
    action: 'settings.holiday_template_imported',
    entityType: 'holidays',
    entityId: presetId,
    details: { presetId, year, holidaysImported: inserted },
  });

  return NextResponse.json({
    success: true,
    message: `Successfully imported ${inserted} holidays from ${HOLIDAY_PRESETS[presetId]?.name || presetId} for ${year}.`,
    importedCount: inserted,
    year,
  });
}
