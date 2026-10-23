// Parameterized leave cycle: defaults to standard corporate leave year (25-Mar to 24-Mar next year),
// while supporting per-organization custom leave years (e.g. 1-Jan, 1-Apr).

/** Returns the FY key (the year the cycle STARTS) for a given date. */
export function getFYStartYear(
  date: Date = new Date(),
  cycleStartMonth: number = 3,
  cycleStartDay: number = 25
): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();

  const isBeforeCycleStart =
    month < cycleStartMonth ||
    (month === cycleStartMonth && day < cycleStartDay);

  return isBeforeCycleStart ? year - 1 : year;
}

/** Human label, e.g. "FY 2025-26" for fyStartYear = 2025. */
export function formatFYLabel(fyStartYear: number): string {
  return `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;
}