import { createLeaveServiceClient } from '../leaveSupabase/server';

export type BackgroundJobType =
  | 'bulk_attendance_import'
  | 'payroll_export'
  | 'policy_simulation'
  | 'gdpr_erasure'
  | 'usage_snapshot';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface BackgroundJob {
  id: string;
  org_id: string;
  job_type: BackgroundJobType;
  status: JobStatus;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  progress: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function enqueueJob(
  orgId: string,
  jobType: BackgroundJobType,
  payload: Record<string, unknown> = {}
): Promise<BackgroundJob> {
  const service = createLeaveServiceClient();

  const { data, error } = await service
    .from('background_jobs')
    .insert({
      org_id: orgId,
      job_type: jobType,
      status: 'pending',
      payload,
      progress: 0,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to enqueue job: ${error?.message || 'Unknown database error'}`);
  }

  return data as BackgroundJob;
}

export async function getJobStatus(jobId: string): Promise<BackgroundJob | null> {
  const service = createLeaveServiceClient();

  const { data, error } = await service
    .from('background_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();

  if (error || !data) return null;
  return data as BackgroundJob;
}

export async function updateJobProgress(
  jobId: string,
  progress: number,
  status: JobStatus = 'processing',
  result: Record<string, unknown> | null = null,
  errorMessage: string | null = null
): Promise<boolean> {
  const service = createLeaveServiceClient();
  const nowIso = new Date().toISOString();

  const updates: Record<string, unknown> = {
    progress: Math.min(Math.max(progress, 0), 100),
    status,
    updated_at: nowIso,
  };

  if (status === 'processing') {
    updates.started_at = nowIso;
  }
  if (status === 'completed' || status === 'failed') {
    updates.completed_at = nowIso;
  }
  if (result) {
    updates.result = result;
  }
  if (errorMessage) {
    updates.error_message = errorMessage;
  }

  const { error } = await service
    .from('background_jobs')
    .update(updates)
    .eq('id', jobId);

  return !error;
}

export async function listRecentJobs(orgId: string, limit: number = 20): Promise<BackgroundJob[]> {
  const service = createLeaveServiceClient();

  const { data, error } = await service
    .from('background_jobs')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as BackgroundJob[];
}
