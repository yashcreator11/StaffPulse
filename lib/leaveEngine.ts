/**
 * Pure Leave Policy Engine (Section D)
 *
 * Side-effect free, deterministic evaluation of leave requests against policy rules.
 * Separates policy calculation from database mutation layers.
 *
 * Guarantees 100% backward compatibility for WonderBiz as Organization #1.
 */

export interface NoticeTier {
  minDays: number;
  maxDays?: number;
  noticeDays: number;
}

export interface LeavePolicyRules {
  probationUnlockMonths?: number;
  allowNegativeBalance?: boolean;
  sandwichRulesEnabled?: boolean;
  maxConsecutiveDays?: number;
  requiresCertificateAfterDays?: number;
  noticeTiers?: NoticeTier[];
}

export interface EmployeePolicyContext {
  dateOfJoining: string;
  employmentStatus: string; // 'active', 'probation', 'notice_period', 'exited'
  dateOfExit?: string | null;
  noticePeriodDays?: number | null;
}

export interface LeaveEvaluationInput {
  leaveTypeCode: string; // 'SL', 'CL', 'PL', 'LWP', or custom 'ML', 'CO', etc.
  startDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD
  totalDays: number;
  isHalfDay?: boolean;
  submissionDate?: string; // defaults to today (YYYY-MM-DD)
  employee: EmployeePolicyContext;
  currentBalance?: number;
  policyRules?: LeavePolicyRules;
}

export interface LeaveEvaluationResult {
  action: 'allow' | 'auto_lwp' | 'warning' | 'reject';
  convertedToLwp: boolean;
  lwpReason: string | null;
  warnings: string[];
  certificateRequired: boolean;
  noticeDaysGiven: number;
  minNoticeDaysRequired: number;
  noticeShortfall: boolean;
  effectiveLeaveTypeCode: string;
}

export function parseDate(d: string): Date {
  return new Date(`${d}T00:00:00Z`);
}

export function calendarDaysBetween(fromDateStr: string, toDateStr: string): number {
  const from = parseDate(fromDateStr);
  const to = parseDate(toDateStr);
  const diffTime = to.getTime() - from.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function addMonthsToDate(dateStr: string, months: number): Date {
  const d = parseDate(dateStr);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/**
 * Pure function: Evaluates notice tier requirements given request duration and notice given.
 */
export function getRequiredNoticeDays(totalDays: number, tiers?: NoticeTier[]): number {
  if (!tiers || tiers.length === 0) {
    // Default WonderBiz Planned Leave notice tiers
    if (totalDays <= 2) return 3;
    if (totalDays <= 5) return 7;
    return 14;
  }

  for (const tier of tiers) {
    if (totalDays >= tier.minDays && (tier.maxDays === undefined || totalDays <= tier.maxDays)) {
      return tier.noticeDays;
    }
  }

  return 0;
}

/**
 * Pure function: Main evaluation entry point
 */
export function evaluateLeaveRequest(input: LeaveEvaluationInput): LeaveEvaluationResult {
  const {
    leaveTypeCode,
    startDate,
    totalDays,
    submissionDate = new Date().toISOString().slice(0, 10),
    employee,
    currentBalance = 0,
    policyRules = {},
  } = input;

  const warnings: string[] = [];
  let convertedToLwp = false;
  let lwpReason: string | null = null;
  let certificateRequired = false;

  const probationMonths = policyRules.probationUnlockMonths ?? 4;

  // ── 1. Probation Rule ───────────────────────────────────────────────────
  if (employee.dateOfJoining) {
    const unlockDate = addMonthsToDate(employee.dateOfJoining, probationMonths);
    const start = parseDate(startDate);
    if (start < unlockDate) {
      convertedToLwp = true;
      lwpReason = `Leave during probation period (before month-${probationMonths} unlock)`;
    }
  }

  // ── 2. Notice Period Rule ───────────────────────────────────────────────
  if (!convertedToLwp && employee.employmentStatus === 'notice_period') {
    const start = parseDate(startDate);
    if (!employee.dateOfExit) {
      const today = parseDate(submissionDate);
      if (start >= today) {
        convertedToLwp = true;
        lwpReason = 'Leave during notice period';
      }
    } else {
      const exit = parseDate(employee.dateOfExit);
      const days = employee.noticePeriodDays ?? 30;
      const windowStart = new Date(exit);
      windowStart.setUTCDate(windowStart.getUTCDate() - days);

      if (start >= windowStart) {
        convertedToLwp = true;
        lwpReason = 'Leave during notice period';
      }
    }
  }

  // ── 3. Balance Check ────────────────────────────────────────────────────
  const allowNegative = policyRules.allowNegativeBalance ?? false;
  if (!convertedToLwp && leaveTypeCode !== 'LWP' && !allowNegative) {
    if (currentBalance < totalDays) {
      convertedToLwp = true;
      lwpReason = `Insufficient ${leaveTypeCode} balance (${currentBalance} available, ${totalDays} requested) — auto-converted to LWP.`;
    }
  }

  // ── 4. Notice Period Shortfall (PL / General) ───────────────────────────
  const noticeDaysGiven = calendarDaysBetween(submissionDate, startDate);
  let minNoticeDaysRequired = 0;
  let noticeShortfall = false;

  if (leaveTypeCode === 'PL' || policyRules.noticeTiers) {
    minNoticeDaysRequired = getRequiredNoticeDays(totalDays, policyRules.noticeTiers);
    if (noticeDaysGiven < minNoticeDaysRequired) {
      noticeShortfall = true;
      warnings.push(
        `Short notice: ${noticeDaysGiven} calendar days provided, but ${minNoticeDaysRequired} days required for a ${totalDays}-day leave.`
      );
    }
  }

  // ── 5. Medical Certificate Requirement (SL) ─────────────────────────────
  const certThreshold = policyRules.requiresCertificateAfterDays ?? 2;
  if (leaveTypeCode === 'SL' && totalDays > certThreshold) {
    certificateRequired = true;
    warnings.push(`Medical certificate required for Sick Leave exceeding ${certThreshold} days.`);
  }

  // ── 6. Consecutive Days Limit (CL / General) ────────────────────────────
  const maxConsecutive = policyRules.maxConsecutiveDays ?? (leaveTypeCode === 'CL' ? 3 : undefined);
  if (maxConsecutive !== undefined && totalDays > maxConsecutive) {
    warnings.push(
      `Exceeds maximum consecutive limit of ${maxConsecutive} days for ${leaveTypeCode}.`
    );
  }

  // ── Action Resolution ───────────────────────────────────────────────────
  let action: LeaveEvaluationResult['action'] = 'allow';
  if (convertedToLwp) {
    action = 'auto_lwp';
  } else if (warnings.length > 0) {
    action = 'warning';
  }

  return {
    action,
    convertedToLwp,
    lwpReason,
    warnings,
    certificateRequired,
    noticeDaysGiven,
    minNoticeDaysRequired,
    noticeShortfall,
    effectiveLeaveTypeCode: convertedToLwp ? 'LWP' : leaveTypeCode,
  };
}
