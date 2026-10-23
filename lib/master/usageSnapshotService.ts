import { createLeaveServiceClient } from '../leaveSupabase/server';

export interface OnboardingStageStatus {
  stage: string;
  label: string;
  isCompleted: boolean;
  completedAt: string | null;
  metadata?: Record<string, unknown>;
}

export const ONBOARDING_STAGES = [
  { stage: 'company_details', label: 'Organization Created & Profile Set' },
  { stage: 'offices_configured', label: 'Office Locations & Shifts Setup' },
  { stage: 'policy_configured', label: 'Leave Policy & Quotas Defined' },
  { stage: 'employees_imported', label: 'Employee Directory Uploaded' },
  { stage: 'first_punch_uploaded', label: 'First Biometric Punch Sync' },
] as const;

export async function recordOnboardingStep(
  orgId: string,
  stage: string,
  metadata: Record<string, unknown> = {}
): Promise<boolean> {
  const service = createLeaveServiceClient();
  const nowIso = new Date().toISOString();

  const { error } = await service.from('onboarding_progress').upsert(
    {
      org_id: orgId,
      stage,
      is_completed: true,
      completed_at: nowIso,
      metadata,
      updated_at: nowIso,
    },
    { onConflict: 'org_id,stage' }
  );

  return !error;
}

export async function getOnboardingFunnel(orgId: string): Promise<OnboardingStageStatus[]> {
  const service = createLeaveServiceClient();

  const { data: rows } = await service
    .from('onboarding_progress')
    .select('stage, is_completed, completed_at, metadata')
    .eq('org_id', orgId);

  const lookup = new Map((rows || []).map((r) => [r.stage, r]));

  return ONBOARDING_STAGES.map((s) => {
    const existing = lookup.get(s.stage);
    return {
      stage: s.stage,
      label: s.label,
      isCompleted: existing?.is_completed ?? false,
      completedAt: existing?.completed_at ?? null,
      metadata: existing?.metadata ?? {},
    };
  });
}

export async function takeUsageSnapshot(
  orgId: string,
  snapshotDate: string = new Date().toISOString().slice(0, 10)
) {
  const service = createLeaveServiceClient();

  // 1. Count active employees
  const { count: empCount } = await service
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('is_deleted', false)
    .is('deactivated_at', null);

  // 2. Count total leaves
  const { count: leaveCount } = await service
    .from('leave_requests')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId);

  // 3. Count punches/attendance records
  const { count: attendanceCount } = await service
    .from('attendance')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId);

  const activeEmployees = empCount ?? 0;
  const totalLeaves = leaveCount ?? 0;
  const totalPunches = attendanceCount ?? 0;
  // Estimate ~0.0002 MB (200 bytes) per attendance record + employee metadata
  const storageMb = Number(((totalPunches * 0.0002) + (activeEmployees * 0.005)).toFixed(2));

  const { data, error } = await service
    .from('usage_snapshots')
    .upsert(
      {
        org_id: orgId,
        snapshot_date: snapshotDate,
        active_employees: activeEmployees,
        total_leaves_recorded: totalLeaves,
        total_punches: totalPunches,
        storage_mb: storageMb,
      },
      { onConflict: 'org_id,snapshot_date' }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to take usage snapshot for ${orgId}: ${error.message}`);
  }

  return data;
}

export async function takeAllUsageSnapshots() {
  const service = createLeaveServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: orgs, error } = await service
    .from('organizations')
    .select('id, name')
    .neq('status', 'suspended');

  if (error) throw new Error(error.message);

  const results: { orgId: string; orgName: string; success: boolean; error?: string }[] = [];

  for (const org of orgs || []) {
    try {
      await takeUsageSnapshot(org.id, today);
      results.push({ orgId: org.id, orgName: org.name, success: true });
    } catch (err: unknown) {
      results.push({
        orgId: org.id,
        orgName: org.name,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    snapshotDate: today,
    total: results.length,
    successful: results.filter((r) => r.success).length,
    results,
  };
}

export async function getOrgUsageHistory(orgId: string, limit: number = 30) {
  const service = createLeaveServiceClient();

  const { data, error } = await service
    .from('usage_snapshots')
    .select('*')
    .eq('org_id', orgId)
    .order('snapshot_date', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []).reverse();
}
