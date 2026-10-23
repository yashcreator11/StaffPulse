export interface TeamMetric {
  name: string;
  attendanceRate: number;
  headcount: number;
}

export function shouldSuppressRate(headcount: number, minGroupSize: number = 3): boolean {
  return headcount < minGroupSize;
}

export function filterAndRankTeams(
  teams: TeamMetric[],
  options: { minGroupSize?: number; topN?: number } = {}
) {
  const { minGroupSize = 3, topN = 5 } = options;

  const validTeams = teams.filter((t) => !shouldSuppressRate(t.headcount, minGroupSize));
  const suppressedCount = teams.length - validTeams.length;

  const sortedDescending = [...validTeams].sort((a, b) => b.attendanceRate - a.attendanceRate);
  const sortedAscending = [...validTeams].sort((a, b) => a.attendanceRate - b.attendanceRate);

  const top = sortedDescending.slice(0, topN);
  const bottom = sortedAscending.slice(0, topN);

  return {
    validTeams,
    suppressedCount,
    top,
    bottom,
  };
}
