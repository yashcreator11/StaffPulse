import { describe, it, expect, vi } from 'vitest';
import {
  logAuditEvent,
  exportOrganizationDataArchive,
  executeEmployeeDataErasure,
} from '../../lib/compliance/auditService';

// Mock Supabase admin client
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn().mockReturnValue({
  eq: () => ({ eq: async () => ({ error: null }) }),
});

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: () => ({
      from: (table: string) => {
        if (table === 'audit_logs') {
          return {
            insert: mockInsert,
            select: () => ({
              eq: () => ({
                limit: async () => ({ data: [] }),
                order: () => ({
                  range: async () => ({
                    data: [
                      {
                        id: 'log_1',
                        action: 'leave.approve',
                        entity_type: 'leave_application',
                        actor_email: 'hr@wonderbiz.in',
                        created_at: new Date().toISOString(),
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'employees') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: async () => ({
                    data: {
                      id: 'emp_123',
                      email: 'target@wonderbiz.in',
                      employee_code: 'WB099',
                      org_id: 'org_wb_1',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: mockUpdate,
          };
        }
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { id: 'org_wb_1', name: 'WonderBiz' } }),
              limit: async () => ({ data: [] }),
            }),
          }),
        };
      },
    }),
  };
});

describe('Section K: Compliance & DPDP Act 2023 / GDPR', () => {
  it('appends audit log events without throwing', async () => {
    await expect(
      logAuditEvent({
        orgId: 'org_wb_1',
        actorEmail: 'hr@wonderbiz.in',
        actorRole: 'hr_admin',
        action: 'settings.update',
        entityType: 'organization',
        entityId: 'org_wb_1',
        details: { change: 'timezone_updated' },
      })
    ).resolves.not.toThrow();

    expect(mockInsert).toHaveBeenCalled();
  });

  it('generates compliant organization data export structure', async () => {
    const archive = await exportOrganizationDataArchive('org_wb_1');
    expect(archive).toBeDefined();
    expect(archive.complianceStandard).toContain('DPDP Act 2023 / GDPR Article 20');
    expect(archive.metadata).toBeDefined();
    expect(archive.data).toHaveProperty('employees');
    expect(archive.data).toHaveProperty('leavePolicies');
    expect(archive.data).toHaveProperty('attendanceRecords');
  });

  it('executes employee data erasure and anonymizes PII', async () => {
    const result = await executeEmployeeDataErasure('org_wb_1', 'emp_123', 'hr@wonderbiz.in');
    expect(result.success).toBe(true);
    expect(result.employeeCode).toBe('WB099');
    expect(mockUpdate).toHaveBeenCalled();
  });
});
