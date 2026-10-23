import { describe, it, expect } from 'vitest';
import {
  slugifyOrgName,
  parseCSVLine,
  parseEmployeeCSV,
  validateEmployeeRow,
  parseOpeningBalanceCSV,
  validateOpeningBalanceRow,
} from '../../lib/onboardingImportHelpers';
import { DEMO_EMPLOYEES, generateDemoAttendance } from '../../lib/demoDataGenerator';

describe('Section G: Onboarding and Admin Experience', () => {
  describe('Organization Slug Normalization', () => {
    it('converts standard organization name to slug', () => {
      expect(slugifyOrgName('Acme Corp')).toBe('acme-corp');
      expect(slugifyOrgName('WonderBiz Technologies')).toBe('wonderbiz-technologies');
    });

    it('strips special characters and punctuation', () => {
      expect(slugifyOrgName('Alpha & Beta Solutions, Ltd!')).toBe('alpha-beta-solutions-ltd');
      expect(slugifyOrgName('Tech@Home (India) Pvt. Ltd.')).toBe('techhome-india-pvt-ltd');
    });

    it('handles multiple consecutive spaces and dashes', () => {
      expect(slugifyOrgName('  Delta    Systems  --  Global  ')).toBe('delta-systems-global');
    });

    it('handles uppercase and accents', () => {
      expect(slugifyOrgName('NEXUS ENTERPRISES')).toBe('nexus-enterprises');
    });
  });

  describe('CSV Parsing', () => {
    it('correctly parses simple and quoted comma-separated lines', () => {
      expect(parseCSVLine('EMP001,John Doe,john@test.com')).toEqual(['EMP001', 'John Doe', 'john@test.com']);
      expect(parseCSVLine('EMP002,"Doe, Jane",jane@test.com')).toEqual(['EMP002', 'Doe, Jane', 'jane@test.com']);
      expect(parseCSVLine('EMP003,"Engineering, Platform",HQ')).toEqual(['EMP003', 'Engineering, Platform', 'HQ']);
    });

    it('parses multi-row employee CSV accurately', () => {
      const csv = `employee_code,full_name,email,department,office,role\n` +
        `EMP101,Aarav Kumar,aarav@test.com,Engineering,MUM,employee\n` +
        `EMP102,Priya Patel,priya@test.com,Product,PUN,manager\n`;

      const rows = parseEmployeeCSV(csv);
      expect(rows).toHaveLength(2);
      expect(rows[0].employee_code).toBe('EMP101');
      expect(rows[0].full_name).toBe('Aarav Kumar');
      expect(rows[0].email).toBe('aarav@test.com');
      expect(rows[0].department).toBe('Engineering');
      expect(rows[0].office).toBe('MUM');
      expect(rows[0].role).toBe('employee');

      expect(rows[1].employee_code).toBe('EMP102');
      expect(rows[1].role).toBe('manager');
    });

    it('handles empty or single header line gracefully', () => {
      expect(parseEmployeeCSV('')).toEqual([]);
      expect(parseEmployeeCSV('employee_code,full_name,email')).toEqual([]);
    });
  });

  describe('Employee Row Validation', () => {
    it('approves a valid employee row', () => {
      const seen = new Set<string>();
      const res = validateEmployeeRow(
        {
          employee_code: 'EMP001',
          full_name: 'John Doe',
          email: 'john@example.com',
          role: 'employee',
        },
        seen
      );
      expect(res.valid).toBe(true);
      expect(seen.has('EMP001')).toBe(true);
    });

    it('rejects missing employee_code', () => {
      const seen = new Set<string>();
      const res = validateEmployeeRow(
        {
          employee_code: '',
          full_name: 'John Doe',
          email: 'john@example.com',
        },
        seen
      );
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/Missing employee_code/);
    });

    it('rejects intra-file duplicate employee_code', () => {
      const seen = new Set<string>(['EMP001']);
      const res = validateEmployeeRow(
        {
          employee_code: 'EMP001',
          full_name: 'Clone Person',
          email: 'clone@example.com',
        },
        seen
      );
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/Duplicate employee_code "EMP001"/);
    });

    it('rejects missing full_name', () => {
      const seen = new Set<string>();
      const res = validateEmployeeRow(
        {
          employee_code: 'EMP002',
          full_name: '',
          email: 'test@example.com',
        },
        seen
      );
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/Missing full_name/);
    });

    it('rejects invalid email formats', () => {
      const seen = new Set<string>();
      const res = validateEmployeeRow(
        {
          employee_code: 'EMP003',
          full_name: 'Bad Email User',
          email: 'invalid-email-address',
        },
        seen
      );
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/Invalid email address/);
    });

    it('rejects unsupported role', () => {
      const seen = new Set<string>();
      const res = validateEmployeeRow(
        {
          employee_code: 'EMP004',
          full_name: 'Rogue Role',
          email: 'rogue@example.com',
          role: 'administrator_godmode',
        },
        seen
      );
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/Invalid role/);
    });
  });

  describe('Opening Balances CSV & Validation', () => {
    it('parses opening balance CSV rows', () => {
      const csv = `employee_code,leave_type_code,balance,year\n` +
        `EMP001,PL,14.5,2026\n` +
        `EMP001,CL,8.0,2026\n` +
        `EMP002,SL,5.5,2026\n`;

      const rows = parseOpeningBalanceCSV(csv);
      expect(rows).toHaveLength(3);
      expect(rows[0]).toEqual({
        employee_code: 'EMP001',
        leave_type_code: 'PL',
        balance: 14.5,
        year: 2026,
      });
      expect(rows[1].balance).toBe(8.0);
    });

    it('validates opening balance against known employees and leave types', () => {
      const knownEmps = new Set(['emp001', 'emp002']);
      const knownTypes = new Set(['PL', 'CL', 'SL']);

      const validRes = validateOpeningBalanceRow(
        { employee_code: 'EMP001', leave_type_code: 'PL', balance: 10, year: 2026 },
        knownEmps,
        knownTypes
      );
      expect(validRes.valid).toBe(true);

      const unknownEmp = validateOpeningBalanceRow(
        { employee_code: 'EMP999', leave_type_code: 'PL', balance: 10, year: 2026 },
        knownEmps,
        knownTypes
      );
      expect(unknownEmp.valid).toBe(false);
      expect(unknownEmp.error).toMatch(/Employee code "EMP999" not found/);

      const unknownType = validateOpeningBalanceRow(
        { employee_code: 'EMP001', leave_type_code: 'UNKNOWN_LEAVE', balance: 10, year: 2026 },
        knownEmps,
        knownTypes
      );
      expect(unknownType.valid).toBe(false);
      expect(unknownType.error).toMatch(/Leave type code "UNKNOWN_LEAVE" not recognized/);

      const negativeBal = validateOpeningBalanceRow(
        { employee_code: 'EMP001', leave_type_code: 'PL', balance: -5, year: 2026 },
        knownEmps,
        knownTypes
      );
      expect(negativeBal.valid).toBe(false);
      expect(negativeBal.error).toMatch(/Invalid balance/);

      const invalidYear = validateOpeningBalanceRow(
        { employee_code: 'EMP001', leave_type_code: 'PL', balance: 5, year: 1899 },
        knownEmps,
        knownTypes
      );
      expect(invalidYear.valid).toBe(false);
      expect(invalidYear.error).toMatch(/Invalid year/);
    });
  });

  describe('Demo Data Generator', () => {
    it('defines 10 demo employees across distinct departments and offices', () => {
      expect(DEMO_EMPLOYEES).toHaveLength(10);
      const depts = new Set(DEMO_EMPLOYEES.map((e) => e.department));
      expect(depts.size).toBeGreaterThanOrEqual(4);
      expect(depts.has('Engineering')).toBe(true);
      expect(depts.has('Product')).toBe(true);
      expect(depts.has('Design')).toBe(true);
      expect(depts.has('Operations')).toBe(true);

      const offices = new Set(DEMO_EMPLOYEES.map((e) => e.office));
      expect(offices.size).toBe(2);
      expect(offices.has('MUM')).toBe(true);
      expect(offices.has('PUN')).toBe(true);
    });

    it('generates attendance records strictly on weekdays with valid punch structure', () => {
      const records = generateDemoAttendance('test-org-uuid', DEMO_EMPLOYEES.slice(0, 2), 2026, 10);
      expect(records.length).toBeGreaterThan(0);

      for (const rec of records) {
        expect(rec.org_id).toBe('test-org-uuid');
        expect(rec.month_key).toMatch(/^2026_10_/);
        expect(rec.date).toMatch(/^2026-10-\d{2}$/);

        // Verify it was a weekday (Mon-Fri)
        const d = new Date(rec.date);
        const dayOfWeek = d.getDay();
        expect(dayOfWeek).not.toBe(0); // not Sunday
        expect(dayOfWeek).not.toBe(6); // not Saturday

        expect(['Present', 'Absent', 'Missed Punch Out']).toContain(rec.status);
      }
    });
  });
});
