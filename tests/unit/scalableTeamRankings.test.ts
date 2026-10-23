import { describe, it, expect } from 'vitest';

describe('Section N3: Scalable Team Rankings & Rate Suppression Logic', () => {
  const teams = [
    { teamName: 'Engineering', headcount: 25, attendanceRate: 94.5, presentCount: 23, lateCount: 2 },
    { teamName: 'Design', headcount: 8, attendanceRate: 98.0, presentCount: 8, lateCount: 0 },
    { teamName: 'Marketing', headcount: 12, attendanceRate: 85.2, presentCount: 10, lateCount: 3 },
    { teamName: 'Sales', headcount: 15, attendanceRate: 88.0, presentCount: 13, lateCount: 4 },
    { teamName: 'Finance', headcount: 6, attendanceRate: 91.5, presentCount: 5, lateCount: 1 },
    { teamName: 'Legal Solo', headcount: 1, attendanceRate: 100.0, presentCount: 1, lateCount: 0 }, // Suppressed (< 3)
    { teamName: 'Security Duo', headcount: 2, attendanceRate: 50.0, presentCount: 1, lateCount: 0 }, // Suppressed (< 3)
  ];

  it('filters out teams below minimum group size threshold (< 3 staff members)', () => {
    const minThreshold = 3;
    const eligible = teams.filter((t) => t.headcount >= minThreshold);
    const suppressed = teams.filter((t) => t.headcount < minThreshold);

    expect(eligible.length).toBe(5);
    expect(suppressed.length).toBe(2);
    expect(suppressed.map((s) => s.teamName)).toEqual(['Legal Solo', 'Security Duo']);
  });

  it('ranks eligible teams correctly into Top N and Bottom N', () => {
    const eligible = teams.filter((t) => t.headcount >= 3);
    const topRanked = [...eligible].sort((a, b) => b.attendanceRate - a.attendanceRate);
    const bottomRanked = [...eligible].sort((a, b) => a.attendanceRate - b.attendanceRate);

    // Highest rate should be Design at 98.0%
    expect(topRanked[0].teamName).toBe('Design');
    expect(topRanked[0].attendanceRate).toBe(98.0);

    // Lowest rate should be Marketing at 85.2%
    expect(bottomRanked[0].teamName).toBe('Marketing');
    expect(bottomRanked[0].attendanceRate).toBe(85.2);
  });
});
