import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:34321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

export interface OfficeShift {
  id: string;
  orgId: string;
  officeCode: string;
  name: string;
  startTime: string; // '09:00:00'
  endTime: string;   // '18:00:00'
  gracePeriodMinutes: number;
  halfDayThresholdMinutes: number;
  fullDayThresholdMinutes: number;
  isNightShift: boolean;
  isDefault: boolean;
}

export async function getOfficeShifts(orgId: string, officeCode?: string): Promise<OfficeShift[]> {
  const supabase = getAdminClient();
  let query = supabase.from('shifts').select('*').eq('org_id', orgId);
  if (officeCode) query = query.eq('office_code', officeCode);

  const { data, error } = await query.order('name');
  if (error) throw new Error(error.message);

  return (data || []).map((s) => ({
    id: s.id,
    orgId: s.org_id,
    officeCode: s.office_code,
    name: s.name,
    startTime: s.start_time,
    endTime: s.end_time,
    gracePeriodMinutes: s.grace_period_minutes,
    halfDayThresholdMinutes: s.half_day_threshold_minutes,
    fullDayThresholdMinutes: s.full_day_threshold_minutes,
    isNightShift: s.is_night_shift,
    isDefault: s.is_default,
  }));
}

export async function saveOfficeShift(
  orgId: string,
  shift: Omit<OfficeShift, 'id' | 'orgId'> & { id?: string }
): Promise<OfficeShift> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('shifts')
    .upsert(
      {
        ...(shift.id ? { id: shift.id } : {}),
        org_id: orgId,
        office_code: shift.officeCode,
        name: shift.name,
        start_time: shift.startTime,
        end_time: shift.endTime,
        grace_period_minutes: shift.gracePeriodMinutes,
        half_day_threshold_minutes: shift.halfDayThresholdMinutes,
        full_day_threshold_minutes: shift.fullDayThresholdMinutes,
        is_night_shift: shift.isNightShift,
        is_default: shift.isDefault,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,office_code,name' }
    )
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    orgId: data.org_id,
    officeCode: data.office_code,
    name: data.name,
    startTime: data.start_time,
    endTime: data.end_time,
    gracePeriodMinutes: data.grace_period_minutes,
    halfDayThresholdMinutes: data.half_day_threshold_minutes,
    fullDayThresholdMinutes: data.full_day_threshold_minutes,
    isNightShift: data.is_night_shift,
    isDefault: data.is_default,
  };
}

/**
 * Calculates punch timeliness against a shift schedule.
 * Example: Shift start 09:00, Grace 15m -> latest on-time punch is 09:15:00.
 */
export function evaluatePunchTimeliness(
  punchInTimeStr: string,
  shift: Pick<OfficeShift, 'startTime' | 'gracePeriodMinutes'>
): { isLate: boolean; minutesLate: number; cutoffTime: string } {
  const [shH, shM] = shift.startTime.split(':').map(Number);
  const [inH, inM, inS = 0] = punchInTimeStr.split(':').map(Number);

  const shiftStartMin = shH * 60 + shM;
  const graceCutoffMin = shiftStartMin + shift.gracePeriodMinutes;
  const punchMin = inH * 60 + inM + inS / 60;

  const isLate = punchMin > graceCutoffMin;
  const minutesLate = isLate ? Math.round(punchMin - shiftStartMin) : 0;

  const cutoffH = Math.floor(graceCutoffMin / 60);
  const cutoffM = graceCutoffMin % 60;
  const cutoffTime = `${String(cutoffH).padStart(2, '0')}:${String(cutoffM).padStart(2, '0')}:00`;

  return { isLate, minutesLate, cutoffTime };
}

/**
 * Evaluates working duration against half-day and full-day thresholds.
 */
export function evaluateWorkDuration(
  durationMinutes: number,
  shift: Pick<OfficeShift, 'halfDayThresholdMinutes' | 'fullDayThresholdMinutes'>
): 'full_day' | 'half_day' | 'short_duration' {
  if (durationMinutes >= shift.fullDayThresholdMinutes) {
    return 'full_day';
  }
  if (durationMinutes >= shift.halfDayThresholdMinutes) {
    return 'half_day';
  }
  return 'short_duration';
}
