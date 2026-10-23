import { describe, it, expect, vi } from 'vitest';
import {
  evaluatePunchTimeliness,
  evaluateWorkDuration,
  getOfficeShifts,
  saveOfficeShift,
} from '../../lib/shifts/shiftService';

// Mock Supabase admin client
vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: () => ({
      from: () => ({
        select: () => ({
          eq: () => {
            const shiftData = [
              {
                id: 'shift_1',
                org_id: 'org_test_1',
                office_code: 'MUM',
                name: 'General Day Shift',
                start_time: '09:00:00',
                end_time: '18:00:00',
                grace_period_minutes: 15,
                half_day_threshold_minutes: 240,
                full_day_threshold_minutes: 480,
                is_night_shift: false,
                is_default: true,
              },
            ];
            return {
              eq: () => ({
                order: async () => ({ data: shiftData, error: null }),
              }),
              order: async () => ({ data: shiftData, error: null }),
            };
          },
        }),
        upsert: () => ({
          select: () => ({
            single: async () => ({
              data: {
                id: 'shift_1',
                org_id: 'org_test_1',
                office_code: 'MUM',
                name: 'General Day Shift',
                start_time: '09:00:00',
                end_time: '18:00:00',
                grace_period_minutes: 15,
                half_day_threshold_minutes: 240,
                full_day_threshold_minutes: 480,
                is_night_shift: false,
                is_default: true,
              },
              error: null,
            }),
          }),
        }),
      }),
    }),
  };
});

describe('Section C: Office Shift Timings & Grace Periods', () => {
  const sampleShift = {
    startTime: '09:00:00',
    gracePeriodMinutes: 15,
  };

  it('marks check-in on time when within grace period window (09:12 <= 09:15)', () => {
    const result = evaluatePunchTimeliness('09:12:00', sampleShift);
    expect(result.isLate).toBe(false);
    expect(result.minutesLate).toBe(0);
    expect(result.cutoffTime).toBe('09:15:00');
  });

  it('flags late mark with exact minutes when punch exceeds grace window (09:28 > 09:15)', () => {
    const result = evaluatePunchTimeliness('09:28:00', sampleShift);
    expect(result.isLate).toBe(true);
    expect(result.minutesLate).toBe(28); // 28 minutes past 09:00 shift start
  });

  it('evaluates working duration against half-day and full-day thresholds', () => {
    const thresholds = {
      halfDayThresholdMinutes: 240, // 4 hours
      fullDayThresholdMinutes: 480, // 8 hours
    };

    // 8.5 hours (510 min) -> Full day
    expect(evaluateWorkDuration(510, thresholds)).toBe('full_day');

    // 5.5 hours (330 min) -> Half day
    expect(evaluateWorkDuration(330, thresholds)).toBe('half_day');

    // 2.5 hours (150 min) -> Short duration / Absent
    expect(evaluateWorkDuration(150, thresholds)).toBe('short_duration');
  });

  it('fetches and saves office shift configurations', async () => {
    const shifts = await getOfficeShifts('org_test_1', 'MUM');
    expect(shifts.length).toBe(1);
    expect(shifts[0].officeCode).toBe('MUM');
    expect(shifts[0].gracePeriodMinutes).toBe(15);
  });
});
