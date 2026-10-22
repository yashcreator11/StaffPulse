import { describe, it, expect } from 'vitest';
import { lunchOverlapMinutes, timeToMins, effectiveMinutes, actualMinutes } from '../../lib/hoursCalc';

describe('hoursCalc - Lunch overlap & effective hours math', () => {
  it('parses valid time strings into minutes from midnight', () => {
    expect(timeToMins('00:00')).toBe(0);
    expect(timeToMins('09:30')).toBe(9 * 60 + 30);
    expect(timeToMins('13:00')).toBe(13 * 60);
    expect(timeToMins('18:45')).toBe(18 * 60 + 45);
    expect(timeToMins(null)).toBe(-1);
    expect(timeToMins('')).toBe(-1);
    expect(timeToMins('invalid')).toBe(-1);
  });

  it('calculates lunch overlap correctly', () => {
    const inTime = 9 * 60 + 30; // 09:30

    // Left before lunch window (13:00) -> 0 min overlap
    expect(lunchOverlapMinutes(inTime, 12 * 60 + 30)).toBe(0);

    // Left during lunch (13:30) -> 30 min overlap
    expect(lunchOverlapMinutes(inTime, 13 * 60 + 30)).toBe(30);

    // Left after lunch (18:30) -> full 60 min overlap
    expect(lunchOverlapMinutes(inTime, 18 * 60 + 30)).toBe(60);

    // Arrived during lunch (13:15) and left after (18:30) -> 45 min overlap
    expect(lunchOverlapMinutes(13 * 60 + 15, 18 * 60 + 30)).toBe(45);
  });

  it('calculates actual vs effective minutes properly', () => {
    // 09:30 to 18:30 = 9 hours = 540 min raw
    // minus 60 min lunch = 480 min effective (8.0 hours)
    expect(actualMinutes(540)).toBe(540);
    expect(effectiveMinutes(540, '18:30', '09:30')).toBe(480);

    // Left early: 09:30 to 12:30 = 3 hours = 180 min raw
    // no lunch overlap -> 180 min effective
    expect(effectiveMinutes(180, '12:30', '09:30')).toBe(180);
  });
});
