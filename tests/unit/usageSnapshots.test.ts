import { describe, it, expect, vi } from 'vitest';
import { recordOnboardingStep, getOnboardingFunnel, takeUsageSnapshot } from '../../lib/master/usageSnapshotService';
import * as serverModule from '../../lib/leaveSupabase/server';

describe('Section O: Master Console Onboarding Funnel & Usage Snapshots (Items 277, 278)', () => {
  it('records an onboarding milestone for an organization', async () => {
    const mockService = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }),
    };

    vi.spyOn(serverModule, 'createLeaveServiceClient').mockReturnValue(mockService as any);

    const ok = await recordOnboardingStep('00000000-0000-0000-0000-000000000001', 'policy_configured', {
      policyTemplate: 'India Standard',
    });

    expect(ok).toBe(true);
  });

  it('retrieves onboarding funnel stages with proper completion state', async () => {
    const mockRows = [
      {
        stage: 'company_details',
        is_completed: true,
        completed_at: '2026-10-22T10:00:00Z',
        metadata: {},
      },
      {
        stage: 'offices_configured',
        is_completed: true,
        completed_at: '2026-10-22T11:00:00Z',
        metadata: {},
      },
    ];

    const mockService = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockRows }),
        }),
      }),
    };

    vi.spyOn(serverModule, 'createLeaveServiceClient').mockReturnValue(mockService as any);

    const funnel = await getOnboardingFunnel('00000000-0000-0000-0000-000000000001');

    expect(funnel).toHaveLength(5);
    expect(funnel[0].stage).toBe('company_details');
    expect(funnel[0].isCompleted).toBe(true);
    expect(funnel[1].stage).toBe('offices_configured');
    expect(funnel[1].isCompleted).toBe(true);
    expect(funnel[2].stage).toBe('policy_configured');
    expect(funnel[2].isCompleted).toBe(false);
  });

  it('computes usage snapshot with correct active staff and punch sizing', async () => {
    const mockSnapshot = {
      id: 'snap-1',
      org_id: '00000000-0000-0000-0000-000000000001',
      snapshot_date: '2026-10-23',
      active_employees: 120,
      total_leaves_recorded: 45,
      total_punches: 8500,
      storage_mb: 2.3,
    };

    let callIndex = 0;
    const mockService = {
      from: vi.fn((table: string) => {
        if (table === 'employees') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockResolvedValue({ count: 120 }),
                }),
              }),
            }),
          };
        }
        if (table === 'leave_requests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 45 }),
            }),
          };
        }
        if (table === 'attendance') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 8500 }),
            }),
          };
        }
        if (table === 'usage_snapshots') {
          return {
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockSnapshot, error: null }),
              }),
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(serverModule, 'createLeaveServiceClient').mockReturnValue(mockService as any);

    const snapshot = await takeUsageSnapshot('00000000-0000-0000-0000-000000000001', '2026-10-23');

    expect(snapshot.active_employees).toBe(120);
    expect(snapshot.total_punches).toBe(8500);
    expect(snapshot.total_leaves_recorded).toBe(45);
  });
});
