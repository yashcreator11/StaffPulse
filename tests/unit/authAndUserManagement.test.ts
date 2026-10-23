import { describe, it, expect } from 'vitest';
import {
  validatePasswordStrength,
  isProviderAllowed,
  isEmployeeDeactivated,
  DEFAULT_AUTH_POLICY,
  type AuthPolicy,
} from '../../lib/authPolicy';

describe('Section F: Authentication and User Management', () => {
  describe('Password Policy Enforcement', () => {
    it('accepts strong passwords meeting default requirements', () => {
      const result = validatePasswordStrength('SecureP@ssw0rd!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('flags passwords that are too short', () => {
      const result = validatePasswordStrength('Sh0rt!');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('at least 8 characters'))).toBe(true);
    });

    it('enforces custom minimum password length', () => {
      const policy: AuthPolicy = { min_password_length: 12 };
      const short = validatePasswordStrength('P@ssword123', policy);
      expect(short.isValid).toBe(false);
      expect(short.errors.some(e => e.includes('at least 12 characters'))).toBe(true);

      const valid = validatePasswordStrength('P@ssword12345', policy);
      expect(valid.isValid).toBe(true);
    });

    it('requires uppercase letters when configured', () => {
      const policy: AuthPolicy = { require_uppercase: true };
      const res = validatePasswordStrength('lowercase_only_123!', policy);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.includes('uppercase letter'))).toBe(true);
    });

    it('requires numbers when configured', () => {
      const policy: AuthPolicy = { require_number: true };
      const res = validatePasswordStrength('NoNumbersHere!@#', policy);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.includes('number'))).toBe(true);
    });

    it('requires special symbols when configured', () => {
      const policy: AuthPolicy = { require_special_char: true };
      const res = validatePasswordStrength('NoSpecialChars123', policy);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.includes('special symbol'))).toBe(true);
    });
  });

  describe('Allowed Provider Policy', () => {
    it('allows google, azure, and password by default', () => {
      expect(isProviderAllowed('google', DEFAULT_AUTH_POLICY)).toBe(true);
      expect(isProviderAllowed('azure', DEFAULT_AUTH_POLICY)).toBe(true);
      expect(isProviderAllowed('password', DEFAULT_AUTH_POLICY)).toBe(true);
      expect(isProviderAllowed('sso', DEFAULT_AUTH_POLICY)).toBe(false);
    });

    it('blocks providers restricted by organization policy', () => {
      const enterprisePolicy: AuthPolicy = {
        allowed_providers: ['azure', 'sso'],
      };
      expect(isProviderAllowed('azure', enterprisePolicy)).toBe(true);
      expect(isProviderAllowed('sso', enterprisePolicy)).toBe(true);
      expect(isProviderAllowed('google', enterprisePolicy)).toBe(false);
      expect(isProviderAllowed('password', enterprisePolicy)).toBe(false);
    });
  });

  describe('Employee Deactivation & Offboarding Lifecycle', () => {
    it('identifies active employees as not deactivated', () => {
      const activeEmployee = {
        employment_status: 'active',
        is_deleted: false,
        deactivated_at: null,
      };
      expect(isEmployeeDeactivated(activeEmployee)).toBe(false);
    });

    it('detects deactivated employee via deactivated_at timestamp', () => {
      const deactivated = {
        employment_status: 'active',
        is_deleted: false,
        deactivated_at: '2026-10-23T10:00:00Z',
      };
      expect(isEmployeeDeactivated(deactivated)).toBe(true);
    });

    it('detects deactivated employee via is_deleted flag', () => {
      const deleted = {
        employment_status: 'active',
        is_deleted: true,
        deactivated_at: null,
      };
      expect(isEmployeeDeactivated(deleted)).toBe(true);
    });

    it('detects deactivated employee via resigned status', () => {
      const resigned = {
        employment_status: 'resigned',
        is_deleted: false,
        deactivated_at: null,
      };
      expect(isEmployeeDeactivated(resigned)).toBe(true);
    });

    it('detects deactivated employee via terminated status', () => {
      const terminated = {
        employment_status: 'terminated',
        is_deleted: false,
        deactivated_at: null,
      };
      expect(isEmployeeDeactivated(terminated)).toBe(true);
    });
  });

  describe('Open Redirect Sanitization (Login & Callback Protection)', () => {
    function sanitizeRedirectPath(path: string | null): string | null {
      if (!path) return null;
      const trimmed = path.trim();
      if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
        return trimmed;
      }
      return null;
    }

    it('allows valid relative paths', () => {
      expect(sanitizeRedirectPath('/leave/me')).toBe('/leave/me');
      expect(sanitizeRedirectPath('/master/organizations')).toBe('/master/organizations');
      expect(sanitizeRedirectPath('/?view=1')).toBe('/?view=1');
    });

    it('blocks absolute URLs and protocol schemes', () => {
      expect(sanitizeRedirectPath('https://malicious.com')).toBeNull();
      expect(sanitizeRedirectPath('http://malicious.com')).toBeNull();
      expect(sanitizeRedirectPath('javascript:alert(1)')).toBeNull();
    });

    it('blocks protocol-relative double slash URLs', () => {
      expect(sanitizeRedirectPath('//malicious.com')).toBeNull();
      expect(sanitizeRedirectPath('//malicious.com/leave')).toBeNull();
    });

    it('blocks backslash bypass attempts', () => {
      expect(sanitizeRedirectPath('/\\malicious.com')).toBeNull();
    });
  });
});
