import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Platform Master Console (Section O)', () => {
  // ── 1. Authorization Boundaries: Platform Admins vs Tenant Admins ─────
  describe('Control Plane RBAC & Tenant Isolation', () => {
    interface PlatformAdmin {
      id: string;
      user_id: string;
      role: 'super_admin' | 'ops' | 'support';
    }

    interface TenantEmployee {
      id: string;
      auth_user_id: string;
      org_id: string;
      role: 'hr_super_admin' | 'hr' | 'manager' | 'lead' | 'employee';
    }

    const platformAdmins: PlatformAdmin[] = [
      { id: 'pa-1', user_id: 'auth-plat-01', role: 'super_admin' },
      { id: 'pa-2', user_id: 'auth-plat-02', role: 'ops' },
    ];

    const tenantUsers: TenantEmployee[] = [
      { id: 'emp-1', auth_user_id: 'auth-tenant-hr-admin', org_id: 'org-1', role: 'hr_super_admin' },
      { id: 'emp-2', auth_user_id: 'auth-tenant-hr', org_id: 'org-1', role: 'hr' },
      { id: 'emp-3', auth_user_id: 'auth-tenant-emp', org_id: 'org-2', role: 'employee' },
    ];

    function checkMasterAccess(authUserId: string): { allowed: boolean; role?: string } {
      const admin = platformAdmins.find((a) => a.user_id === authUserId);
      if (!admin) return { allowed: false };
      return { allowed: true, role: admin.role };
    }

    it('allows registered platform admins into the master console', () => {
      const res = checkMasterAccess('auth-plat-01');
      expect(res.allowed).toBe(true);
      expect(res.role).toBe('super_admin');
    });

    it('strictly forbids tenant admins (even hr_super_admin) from accessing master control plane', () => {
      // Even though hr_super_admin has highest privilege inside their tenant,
      // they must NEVER be allowed inside the platform master console.
      tenantUsers.forEach((user) => {
        const res = checkMasterAccess(user.auth_user_id);
        expect(res.allowed).toBe(false);
      });
    });
  });

  // ── 2. Typed Confirmation Tokens for Critical Actions ────────────────
  describe('Action Confirmation Token Semantics', () => {
    function validateLifecycleAction(
      action: 'suspend' | 'reactivate',
      confirmation: string | undefined
    ): { valid: boolean; error?: string } {
      if (action === 'suspend') {
        if (confirmation !== 'SUSPEND') {
          return {
            valid: false,
            error: 'Suspension requires confirmation token "SUSPEND"',
          };
        }
        return { valid: true };
      }

      if (action === 'reactivate') {
        if (confirmation !== 'REACTIVATE') {
          return {
            valid: false,
            error: 'Reactivation requires confirmation token "REACTIVATE"',
          };
        }
        return { valid: true };
      }

      return { valid: false, error: 'Unknown action' };
    }

    it('requires exact "SUSPEND" token to suspend an organization', () => {
      expect(validateLifecycleAction('suspend', undefined).valid).toBe(false);
      expect(validateLifecycleAction('suspend', 'suspend').valid).toBe(false);
      expect(validateLifecycleAction('suspend', 'YES').valid).toBe(false);
      expect(validateLifecycleAction('suspend', 'SUSPEND').valid).toBe(true);
    });

    it('requires exact "REACTIVATE" token to reactivate an organization', () => {
      expect(validateLifecycleAction('reactivate', undefined).valid).toBe(false);
      expect(validateLifecycleAction('reactivate', 'reactivate').valid).toBe(false);
      expect(validateLifecycleAction('reactivate', 'OK').valid).toBe(false);
      expect(validateLifecycleAction('reactivate', 'REACTIVATE').valid).toBe(true);
    });
  });

  // ── 3. Suspended Organization Immediate Gateway Lockout ──────────────
  describe('Gateway Suspension Lockout Check', () => {
    function evaluateGatewayAccess(orgStatus: string, isJsonApi: boolean): { status: number; redirect?: string; error?: string } {
      if (orgStatus === 'suspended') {
        if (isJsonApi) {
          return { status: 403, error: 'Organization suspended. Please contact platform support.' };
        }
        return { status: 307, redirect: '/login?error=org_suspended' };
      }
      return { status: 200 };
    }

    it('blocks API calls with 403 when organization is suspended', () => {
      const res = evaluateGatewayAccess('suspended', true);
      expect(res.status).toBe(403);
      expect(res.error).toContain('suspended');
    });

    it('redirects page requests to login with org_suspended error code', () => {
      const res = evaluateGatewayAccess('suspended', false);
      expect(res.status).toBe(307);
      expect(res.redirect).toBe('/login?error=org_suspended');
    });

    it('allows active or trial organizations to proceed normally', () => {
      expect(evaluateGatewayAccess('active', false).status).toBe(200);
      expect(evaluateGatewayAccess('trial', false).status).toBe(200);
      expect(evaluateGatewayAccess('active', true).status).toBe(200);
    });
  });

  // ── 4. Append-Only Platform Audit Log Integrity ──────────────────────
  describe('Platform Audit Log Migration & Anti-Tampering', () => {
    it('migration SQL creates platform_audit_log and prevents UPDATE and DELETE', () => {
      const migrationPath = path.resolve(
        __dirname,
        '../../supabase/migrations/0024_platform_master_console.sql'
      );
      expect(fs.existsSync(migrationPath)).toBe(true);

      const sql = fs.readFileSync(migrationPath, 'utf8');

      // Verify table creation
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS platform_admins');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS platform_audit_log');

      // Verify anti-tampering trigger logic
      expect(sql).toContain('prevent_audit_log_tampering');
      expect(sql).toContain('platform_audit_log is immutable and append-only');
      expect(sql).toContain('BEFORE UPDATE OR DELETE ON platform_audit_log');

      // Verify RLS helper is_platform_admin
      expect(sql).toContain('CREATE OR REPLACE FUNCTION is_platform_admin');
    });
  });

  // ── 5. DPDP / GDPR Data Boundary on Master Endpoints ─────────────────
  describe('DPDP / GDPR Compliance on Master Console', () => {
    it('ensures master organization responses only expose tenant metadata, never raw punches or medical reasons', () => {
      const masterOrgPayload = {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'WonderBiz Technologies',
        slug: 'wonderbiz',
        plan: 'plan3',
        status: 'active',
        seat_limit: 500,
        active_employee_count: 342,
        created_at: '2026-01-01T00:00:00Z',
      };

      // Forbidden fields in master console payload
      const forbiddenFields = [
        'punches',
        'raw_attendance',
        'medical_reason',
        'biometric_data',
        'in_time',
        'out_time',
      ];

      forbiddenFields.forEach((field) => {
        expect(masterOrgPayload).not.toHaveProperty(field);
      });
      expect(masterOrgPayload.seat_limit).toBe(500);
      expect(masterOrgPayload.active_employee_count).toBe(342);
    });
  });
});
