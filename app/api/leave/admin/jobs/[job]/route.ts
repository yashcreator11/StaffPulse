import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createLeaveClient, createLeaveServiceClient } from '@/lib/leaveSupabase/server';
import { getFYStartYear } from '@/lib/leaveSupabase/fyHelpers';
import { sendLeaveReminder } from '@/lib/leaveSupabase/notifyLeaveEvent';
import { runLeaveThresholdCheck } from '@/lib/leaveSupabase/thresholdCheck';
import { runEscalationSweep } from '@/lib/leaveSupabase/attendanceEscalation';
import type { SupabaseClient } from '@supabase/supabase-js';

const JOBS = [
  'probation-accrual',
  'annual-reset',
  'pending-leave-reminders',
  'leave-threshold-check',
  'attendance-escalation-sweep',
] as const;
type Job = (typeof JOBS)[number];

function monthsSinceDOJ(doj: string, asOf: Date): number {
  const d = new Date(`${doj}T00:00:00Z`);
  let months = (asOf.getUTCFullYear() - d.getUTCFullYear()) * 12 + (asOf.getUTCMonth() - d.getUTCMonth());
  if (asOf.getUTCDate() < d.getUTCDate()) months -= 1;
  return Math.max(months, 0);
}

async function runProbationAccrualForOrg(service: SupabaseClient, orgId: string, asOf: Date) {
  const { data: employees, error: empError } = await service
    .from('employees')
    .select('id, date_of_joining')
    .eq('org_id', orgId)
    .not('date_of_joining', 'is', null);
  if (empError) throw new Error(empError.message);

  const { data: plType, error: plError } = await service
    .from('leave_types')
    .select('id')
    .eq('code', 'PL')
    .maybeSingle();
  if (plError || !plType) throw new Error(plError?.message ?? 'PL leave type not found');

  const results: { employeeId: string; completedMonth: number; ran: boolean; reason: string }[] = [];

  for (const emp of employees ?? []) {
    const completedMonth = monthsSinceDOJ(emp.date_of_joining, asOf);
    if (completedMonth < 1) {
      results.push({ employeeId: emp.id, completedMonth, ran: false, reason: 'Not yet 1 full month since joining' });
      continue;
    }

    const { data: balance } = await service
      .from('leave_balances')
      .select('id')
      .eq('employee_id', emp.id)
      .eq('leave_type_id', plType.id)
      .order('fy_start_year', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!balance) {
      results.push({ employeeId: emp.id, completedMonth, ran: false, reason: 'No PL balance row yet — not seeded/prorated' });
      continue;
    }

    const { data: existing } = await service
      .from('balance_transactions')
      .select('id')
      .eq('leave_balance_id', balance.id)
      .ilike('note', `%month ${completedMonth}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      results.push({ employeeId: emp.id, completedMonth, ran: false, reason: 'Already recorded for this month' });
      continue;
    }

    const { error: rpcError } = await service.rpc('fn_apply_probation_month_accrual', {
      p_employee_id: emp.id,
      p_completed_month: completedMonth,
    });

    results.push({
      employeeId: emp.id,
      completedMonth,
      ran: !rpcError,
      reason: rpcError ? rpcError.message : 'Accrual applied',
    });
  }

  return { job: 'probation-accrual', orgId, ranCount: results.filter((r) => r.ran).length, results };
}

async function runAnnualResetForOrg(service: SupabaseClient, orgId: string, asOf: Date) {
  const oldFyStartYear = getFYStartYear(asOf) - 1;

  const { data: employees, error: empError } = await service
    .from('employees')
    .select('id')
    .eq('org_id', orgId);
  if (empError) throw new Error(empError.message);

  const { data: plType, error: plError } = await service
    .from('leave_types')
    .select('id')
    .eq('code', 'PL')
    .maybeSingle();
  if (plError || !plType) throw new Error(plError?.message ?? 'PL leave type not found');

  const results: { employeeId: string; ran: boolean; reason: string }[] = [];

  for (const emp of employees ?? []) {
    const { data: oldBalance } = await service
      .from('leave_balances')
      .select('id')
      .eq('employee_id', emp.id)
      .eq('leave_type_id', plType.id)
      .eq('fy_start_year', oldFyStartYear)
      .maybeSingle();

    if (!oldBalance) {
      results.push({ employeeId: emp.id, ran: false, reason: `No FY${oldFyStartYear} PL balance to reset` });
      continue;
    }

    const { data: newBalance } = await service
      .from('leave_balances')
      .select('id')
      .eq('employee_id', emp.id)
      .eq('leave_type_id', plType.id)
      .eq('fy_start_year', oldFyStartYear + 1)
      .maybeSingle();

    if (!newBalance) {
      results.push({
        employeeId: emp.id,
        ran: false,
        reason: `FY${oldFyStartYear + 1} balances not provisioned yet — run pro-ration/seeding first`,
      });
      continue;
    }

    const { data: existing } = await service
      .from('balance_transactions')
      .select('id')
      .eq('leave_balance_id', oldBalance.id)
      .in('reason', ['carry_forward', 'encashment', 'lapse'])
      .limit(1);

    if (existing && existing.length > 0) {
      results.push({ employeeId: emp.id, ran: false, reason: `FY${oldFyStartYear} already reset` });
      continue;
    }

    const { error: rpcError } = await service.rpc('fn_annual_leave_reset', {
      p_employee_id: emp.id,
      p_old_fy_start_year: oldFyStartYear,
    });

    results.push({ employeeId: emp.id, ran: !rpcError, reason: rpcError ? rpcError.message : 'Reset applied' });
  }

  return { job: 'annual-reset', orgId, oldFyStartYear, ranCount: results.filter((r) => r.ran).length, results };
}

async function runPendingLeaveRemindersForOrg(service: SupabaseClient, orgId: string, asOf: Date) {
  const today = asOf.toISOString().slice(0, 10);

  const { data: pending, error } = await service
    .from('leave_requests')
    .select('id, start_date')
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .lte('start_date', today);
  if (error) throw new Error(error.message);

  const results: { requestId: string; sent: boolean; reason: string }[] = [];

  for (const req of pending ?? []) {
    const startOfToday = `${today}T00:00:00.000Z`;
    const { data: alreadySentToday } = await service
      .from('notifications')
      .select('id')
      .eq('leave_request_id', req.id)
      .eq('type', 'leave_reminder')
      .gte('created_at', startOfToday)
      .limit(1);

    if (alreadySentToday && alreadySentToday.length > 0) {
      results.push({ requestId: req.id, sent: false, reason: 'Already reminded today' });
      continue;
    }

    const outcome = await sendLeaveReminder(service, { mode: 'pending_request', requestId: req.id }, 'automatic');
    results.push({ requestId: req.id, sent: outcome.ok, reason: outcome.ok ? 'Reminder sent' : outcome.error ?? 'Unknown error' });
  }

  return { job: 'pending-leave-reminders', orgId, ranCount: results.filter((r) => r.sent).length, results };
}

async function runLeaveThresholdCheckJobForOrg(service: SupabaseClient, orgId: string, asOf: Date) {
  const { results, error } = await runLeaveThresholdCheck(service, asOf, orgId);
  if (error) throw new Error(error);
  return { job: 'leave-threshold-check', orgId, alertedCount: results.filter((r) => r.alerted).length, results };
}

async function runAttendanceEscalationSweepJobForOrg(service: SupabaseClient, orgId: string) {
  const results = await runEscalationSweep(service, orgId);
  return { job: 'attendance-escalation-sweep', orgId, sentCount: results.filter((r) => r.sent).length, results };
}

async function runJobForOrg(job: Job, orgId: string, service: SupabaseClient, now: Date) {
  if (job === 'probation-accrual') return runProbationAccrualForOrg(service, orgId, now);
  if (job === 'annual-reset') return runAnnualResetForOrg(service, orgId, now);
  if (job === 'pending-leave-reminders') return runPendingLeaveRemindersForOrg(service, orgId, now);
  if (job === 'attendance-escalation-sweep') return runAttendanceEscalationSweepJobForOrg(service, orgId);
  return runLeaveThresholdCheckJobForOrg(service, orgId, now);
}

// Multi-tenant cron execution loop with failure isolation per organization
async function runJob(job: Job, specificOrgId?: string) {
  const service = createLeaveServiceClient();
  const now = new Date();

  // If specific organization requested, run only for that org
  if (specificOrgId) {
    return runJobForOrg(job, specificOrgId, service, now);
  }

  // Otherwise, fetch all active non-suspended organizations and iterate with tenant isolation
  const { data: orgs, error: orgError } = await service
    .from('organizations')
    .select('id, name, status')
    .neq('status', 'suspended');

  if (orgError) {
    throw new Error(`Failed to list organizations: ${orgError.message}`);
  }

  const tenantResults: {
    orgId: string;
    orgName: string;
    success: boolean;
    error?: string;
    result?: unknown;
  }[] = [];

  for (const org of orgs || []) {
    try {
      const res = await runJobForOrg(job, org.id, service, now);
      tenantResults.push({
        orgId: org.id,
        orgName: org.name,
        success: true,
        result: res,
      });
    } catch (err: unknown) {
      console.error(`Job "${job}" failed for tenant "${org.name}" (${org.id}):`, err);
      tenantResults.push({
        orgId: org.id,
        orgName: org.name,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const successfulTenants = tenantResults.filter((t) => t.success).length;
  const failedTenants = tenantResults.filter((t) => !t.success).length;

  return {
    job,
    totalTenants: tenantResults.length,
    successfulTenants,
    failedTenants,
    tenantResults,
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ job: string }> }) {
  const { job } = await params;
  if (!JOBS.includes(job as Job)) {
    return NextResponse.json({ error: `Unknown job "${job}". Valid jobs: ${JOBS.join(', ')}` }, { status: 404 });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization') || '';
  const expectedHeader = cronSecret ? `Bearer ${cronSecret}` : '';

  const isAuthorized = (() => {
    if (!cronSecret || !authHeader) return false;
    const bufHeader = Buffer.from(authHeader);
    const bufExpected = Buffer.from(expectedHeader);
    if (bufHeader.length !== bufExpected.length) return false;
    return crypto.timingSafeEqual(bufHeader, bufExpected);
  })();

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Not authorized — this endpoint is for the scheduler only' }, { status: 401 });
  }

  const specificOrgId = req.nextUrl.searchParams.get('org_id') || undefined;

  try {
    const result = await runJob(job as Job, specificOrgId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Job "${job}" failed: ${message}` }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ job: string }> }) {
  const { job } = await params;
  if (!JOBS.includes(job as Job)) {
    return NextResponse.json({ error: `Unknown job "${job}". Valid jobs: ${JOBS.join(', ')}` }, { status: 404 });
  }

  const sessionClient = await createLeaveClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: caller } = await sessionClient
    .from('employees')
    .select('id, role, org_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (!caller || (caller.role !== 'hr' && caller.role !== 'hr_super_admin')) {
    return NextResponse.json({ error: 'HR admin role required to run scheduled jobs' }, { status: 403 });
  }

  try {
    const targetOrgId = caller.org_id || '00000000-0000-0000-0000-000000000001';
    const result = await runJob(job as Job, targetOrgId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Job "${job}" failed: ${message}` }, { status: 500 });
  }
}