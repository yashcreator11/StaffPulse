import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enqueueJob, updateJobProgress, getJobStatus, BackgroundJob } from '../../lib/jobs/jobQueue';
import { executeJob, processPendingBackgroundJobs } from '../../lib/jobs/jobWorker';
import * as serverModule from '../../lib/leaveSupabase/server';

describe('Section I: Background Job Queue & Worker (Item 160)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

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

  describe('Background Job Worker Execution', () => {
    it('executes a bulk_attendance_import job and marks completed', async () => {
      const mockService = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };
      vi.spyOn(serverModule, 'createLeaveServiceClient').mockReturnValue(mockService as any);

      const job: BackgroundJob = {
        id: 'job-import-01',
        org_id: 'org-test-1',
        job_type: 'bulk_attendance_import',
        status: 'pending',
        payload: { rowCount: 50 },
        result: null,
        progress: 0,
        error_message: null,
        started_at: null,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await executeJob(job);
      expect(result.success).toBe(true);
      expect(result.result?.importedRows).toBe(50);
      expect(result.jobType).toBe('bulk_attendance_import');
    });

    it('executes payroll_export, policy_simulation, gdpr_erasure, usage_snapshot successfully', async () => {
      const mockService = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };
      vi.spyOn(serverModule, 'createLeaveServiceClient').mockReturnValue(mockService as any);

      const jobTypes = ['payroll_export', 'policy_simulation', 'gdpr_erasure', 'usage_snapshot'] as const;

      for (const jType of jobTypes) {
        const job: BackgroundJob = {
          id: `job-${jType}`,
          org_id: 'org-test-1',
          job_type: jType,
          status: 'pending',
          payload: { employeeId: 'EMP_001', period: '2026-10' },
          result: null,
          progress: 0,
          error_message: null,
          started_at: null,
          completed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const res = await executeJob(job);
        expect(res.success).toBe(true);
      }
    });

    it('fails gracefully when encountering an unsupported job type', async () => {
      const mockService = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };
      vi.spyOn(serverModule, 'createLeaveServiceClient').mockReturnValue(mockService as any);

      const job = {
        id: 'job-invalid-01',
        org_id: 'org-test-1',
        job_type: 'unsupported_action' as any,
        status: 'pending',
        payload: {},
        result: null,
        progress: 0,
        error_message: null,
        started_at: null,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as BackgroundJob;

      const res = await executeJob(job);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Unsupported background job type');
    });

    it('processPendingBackgroundJobs pulls pending queue items and executes them', async () => {
      const mockPendingJobs: BackgroundJob[] = [
        {
          id: 'job-batch-1',
          org_id: 'org-batch',
          job_type: 'bulk_attendance_import',
          status: 'pending',
          payload: { rowCount: 10 },
          result: null,
          progress: 0,
          error_message: null,
          started_at: null,
          completed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockService = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: mockPendingJobs, error: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };

      vi.spyOn(serverModule, 'createLeaveServiceClient').mockReturnValue(mockService as any);

      const batchResult = await processPendingBackgroundJobs(5);
      expect(batchResult.processed).toBe(1);
      expect(batchResult.succeeded).toBe(1);
      expect(batchResult.failed).toBe(0);
    });
  });

  describe('Jobs API Route Guards (SEC-01 & ARC-01)', () => {
    it('rejects unauthenticated requests with 401 on POST /api/jobs', async () => {
      const authModule = await import('../../lib/leaveSupabase/getCurrentEmployee');
      vi.spyOn(authModule, 'getCurrentEmployee').mockResolvedValue(null);

      const { POST } = await import('../../app/api/jobs/route');
      const req = new Request('http://localhost:3000/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobType: 'bulk_attendance_import' }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Not authenticated');
    });

    it('rejects non-HR employees with 403 on POST /api/jobs', async () => {
      const authModule = await import('../../lib/leaveSupabase/getCurrentEmployee');
      vi.spyOn(authModule, 'getCurrentEmployee').mockResolvedValue({
        id: 'emp-1',
        full_name: 'Test Employee',
        employee_code: 'EMP001',
        email: 'emp@staffpulse.io',
        role: 'employee',
        department: 'Engineering',
        office: 'HQ',
        reporting_lead_id: null,
        reporting_manager_id: null,
        must_change_password: false,
        profile_confirmed_at: '2026-01-01',
        avatar_url: null,
        auth_provider: 'password',
        org_id: 'org-test',
      });

      const { POST } = await import('../../app/api/jobs/route');
      const req = new Request('http://localhost:3000/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobType: 'gdpr_erasure' }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('HR Admin privileges required');
    });

    it('rejects non-HR employees with 403 on GET /api/jobs', async () => {
      const authModule = await import('../../lib/leaveSupabase/getCurrentEmployee');
      vi.spyOn(authModule, 'getCurrentEmployee').mockResolvedValue({
        id: 'emp-2',
        full_name: 'Lead Staff',
        employee_code: 'LEAD001',
        email: 'lead@staffpulse.io',
        role: 'lead',
        department: 'Operations',
        office: 'HQ',
        reporting_lead_id: null,
        reporting_manager_id: null,
        must_change_password: false,
        profile_confirmed_at: '2026-01-01',
        avatar_url: null,
        auth_provider: 'password',
        org_id: 'org-test',
      });

      const { GET } = await import('../../app/api/jobs/route');
      const res = await GET();
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('HR Admin privileges required');
    });

    it('allows HR admin on POST /api/jobs', async () => {
      const authModule = await import('../../lib/leaveSupabase/getCurrentEmployee');
      vi.spyOn(authModule, 'getCurrentEmployee').mockResolvedValue({
        id: 'hr-1',
        full_name: 'HR Admin',
        employee_code: 'HR001',
        email: 'hr@staffpulse.io',
        role: 'hr',
        department: 'HR',
        office: 'HQ',
        reporting_lead_id: null,
        reporting_manager_id: null,
        must_change_password: false,
        profile_confirmed_at: '2026-01-01',
        avatar_url: null,
        auth_provider: 'password',
        org_id: 'org-test',
      });

      const mockJob = {
        id: 'job-hr-1',
        org_id: 'org-test',
        job_type: 'bulk_attendance_import',
        status: 'pending',
        payload: { rowCount: 100 },
        progress: 0,
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

      const { POST } = await import('../../app/api/jobs/route');
      const req = new Request('http://localhost:3000/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobType: 'bulk_attendance_import', payload: { rowCount: 100 } }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.job.id).toBe('job-hr-1');
    });
  });
});
