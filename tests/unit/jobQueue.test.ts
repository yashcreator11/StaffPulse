import { describe, it, expect, vi } from 'vitest';
import { enqueueJob, updateJobProgress, getJobStatus } from '../../lib/jobs/jobQueue';
import * as serverModule from '../../lib/leaveSupabase/server';

describe('Section I: Background Job Queue (Item 160)', () => {
  it('enqueues a background job with pending status', async () => {
    const mockJob = {
      id: 'job-123',
      org_id: '00000000-0000-0000-0000-000000000001',
      job_type: 'bulk_attendance_import',
      status: 'pending',
      payload: { rowCount: 1500 },
      progress: 0,
      created_at: new Date().toISOString(),
    };

    const mockService = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockJob, error: null }),
          }),
        }),
      }),
    };

    vi.spyOn(serverModule, 'createLeaveServiceClient').mockReturnValue(mockService as any);

    const result = await enqueueJob(
      '00000000-0000-0000-0000-000000000001',
      'bulk_attendance_import',
      { rowCount: 1500 }
    );

    expect(result.id).toBe('job-123');
    expect(result.status).toBe('pending');
    expect(result.progress).toBe(0);
  });

  it('updates job progress and marks as completed', async () => {
    const mockService = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };

    vi.spyOn(serverModule, 'createLeaveServiceClient').mockReturnValue(mockService as any);

    const success = await updateJobProgress(
      'job-123',
      100,
      'completed',
      { importedRows: 1500, errors: 0 }
    );

    expect(success).toBe(true);
  });
});
