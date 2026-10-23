import { describe, it, expect } from 'vitest';
import { detectVendorTemplate, VENDOR_TEMPLATES } from '../../lib/vendorTemplates';
import { autoMatchColumns } from '../../lib/columnMatch';
import { matchDeviceIdToEmployee, identifyUnmatchedDeviceIds } from '../../lib/deviceMatcher';
import { validateAttendanceImport } from '../../lib/importValidation';
import {
  normalizeDate,
  calculateDurationFromPunchRecords,
  isPunchTimeValid,
} from '../../lib/parseCSV';
import { REQUIRED_STANDARD_FIELDS, OPTIONAL_STANDARD_FIELDS } from '../../lib/validateFile';
import { ColumnMapping } from '../../lib/types';

describe('Section E: Attendance Data Ingestion', () => {
  describe('Vendor Device Template Library', () => {
    it('detects eSSL biometric export format', () => {
      const headers = ['Emp Code', 'Emp Name', 'Date', 'In Time', 'Out Time', 'Punch Records', 'Status'];
      const vendor = detectVendorTemplate(headers);
      expect(vendor).toBeDefined();
      expect(vendor?.id).toBe('essl');
      expect(vendor?.defaultDateFormat).toBe('DMY');
    });

    it('detects ZKTeco BioTime export format', () => {
      const headers = ['AC-No.', 'Name', 'Date', 'Clock-in', 'Clock-out', 'Attendance State', 'Late', 'Early'];
      const vendor = detectVendorTemplate(headers);
      expect(vendor).toBeDefined();
      expect(vendor?.id).toBe('zkteco');
    });

    it('detects Matrix COSEC CENTRA export format', () => {
      const headers = ['User ID', 'User Name', 'Punch Date', 'First In', 'Last Out', 'Status', 'Work Hours'];
      const vendor = detectVendorTemplate(headers);
      expect(vendor).toBeDefined();
      expect(vendor?.id).toBe('matrix');
    });

    it('detects Realtime Biometrics export format', () => {
      const headers = ['Enroll No', 'Staff Name', 'Att Date', 'In', 'Out', 'Att Status'];
      const vendor = detectVendorTemplate(headers);
      expect(vendor).toBeDefined();
      expect(vendor?.id).toBe('realtime');
    });

    it('detects Hikvision IVMS export format', () => {
      const headers = ['Person ID', 'Person Name', 'Event Date', 'Check-in Time', 'Check-out Time', 'Attendance Result'];
      const vendor = detectVendorTemplate(headers);
      expect(vendor).toBeDefined();
      expect(vendor?.id).toBe('hikvision');
      expect(vendor?.defaultDateFormat).toBe('YMD');
    });

    it('autoMatchColumns incorporates detected vendor preset and date format', () => {
      const headers = ['AC-No.', 'Name', 'Date', 'Clock-in', 'Clock-out', 'Attendance State', 'Late', 'Early', 'Work Duration'];
      const res = autoMatchColumns(headers);
      expect(res.detectedVendor?.id).toBe('zkteco');
      expect(res.mapping.vendorPreset).toBe('zkteco');
      expect(res.mapping.employeeCode).toBe('AC-No.');
      expect(res.mapping.inTime).toBe('Clock-in');
      expect(res.mapping.outTime).toBe('Clock-out');
    });
  });

  describe('Optional Department Field (Section E Item 101)', () => {
    it('department is excluded from REQUIRED_STANDARD_FIELDS and present in OPTIONAL_STANDARD_FIELDS', () => {
      expect((REQUIRED_STANDARD_FIELDS as readonly string[]).includes('department')).toBe(false);
      expect((OPTIONAL_STANDARD_FIELDS as readonly string[]).includes('department')).toBe(true);
      expect(REQUIRED_STANDARD_FIELDS.length).toBe(9);
    });
  });

  describe('Device ID to Employee Code Matcher (Section E Item 100)', () => {
    const knownCodes = new Set(['WB001', 'WB002', 'WB1024', 'EMP-0042', '999']);

    it('matches exact employee codes directly', () => {
      const res = matchDeviceIdToEmployee('999', knownCodes);
      expect(res.matchedBy).toBe('exact');
      expect(res.employeeCode).toBe('999');
    });

    it('matches case-insensitively', () => {
      const res = matchDeviceIdToEmployee('wb001', knownCodes);
      expect(res.matchedBy).toBe('exact');
      expect(res.employeeCode).toBe('WB001');
    });

    it('applies prefix rule', () => {
      const res = matchDeviceIdToEmployee('1024', knownCodes, { prefix: 'WB' });
      expect(res.matchedBy).toBe('prefix');
      expect(res.employeeCode).toBe('WB1024');
    });

    it('applies padding and prefix rules together', () => {
      const res = matchDeviceIdToEmployee('42', knownCodes, { prefix: 'EMP-', padLength: 4 });
      expect(res.matchedBy).toBe('padding');
      expect(res.employeeCode).toBe('EMP-0042');
    });

    it('applies explicit custom override mapping', () => {
      const custom = { 'DEV_X': 'WB002' };
      const res = matchDeviceIdToEmployee('DEV_X', knownCodes, {}, custom);
      expect(res.matchedBy).toBe('custom');
      expect(res.employeeCode).toBe('WB002');
    });

    it('flags unmatched device IDs', () => {
      const rows = [
        { deviceId: 'WB001', employeeName: 'Alice' },
        { deviceId: 'DEV_UNKNOWN_1', employeeName: 'Bob' },
        { deviceId: 'DEV_UNKNOWN_1', employeeName: 'Bob' },
        { deviceId: 'DEV_UNKNOWN_2', employeeName: 'Charlie' },
      ];
      const unmatched = identifyUnmatchedDeviceIds(rows, knownCodes);
      expect(unmatched).toHaveLength(2);
      expect(unmatched.find(u => u.deviceId === 'DEV_UNKNOWN_1')?.occurrenceCount).toBe(2);
      expect(unmatched.find(u => u.deviceId === 'DEV_UNKNOWN_2')?.occurrenceCount).toBe(1);
    });
  });

  describe('Import Validation Engine (Section E Item 96)', () => {
    const mockMapping: ColumnMapping = {
      employeeCode: 'EmpId',
      employeeName: 'Name',
      date: 'Date',
      inTime: 'In',
      outTime: 'Out',
      status: 'Status',
      lateBy: 'Late',
      earlyBy: 'Early',
      duration: 'Duration',
      dateFormat: 'DMY',
    };
    const knownEmployees = new Set(['EMP01', 'EMP02']);

    it('flags duplicate punches for the same employee on the same date', () => {
      const rows = [
        { EmpId: 'EMP01', Name: 'Alice', Date: '01/07/2026', In: '09:30', Out: '18:30', Status: 'Present', Late: '0:00', Early: '0:00', Duration: '9:00' },
        { EmpId: 'EMP01', Name: 'Alice', Date: '01/07/2026', In: '09:30', Out: '18:30', Status: 'Present', Late: '0:00', Early: '0:00', Duration: '9:00' },
      ];
      const report = validateAttendanceImport(rows, mockMapping, knownEmployees, 'DMY');
      expect(report.duplicatePunchesCount).toBe(1);
      expect(report.issues.some(i => i.type === 'duplicate_punch')).toBe(true);
    });

    it('flags unparseable bad dates', () => {
      const rows = [
        { EmpId: 'EMP01', Name: 'Alice', Date: 'INVALID_DATE', In: '09:30', Out: '18:30', Status: 'Present', Late: '0:00', Early: '0:00', Duration: '9:00' },
      ];
      const report = validateAttendanceImport(rows, mockMapping, knownEmployees);
      expect(report.badDatesCount).toBe(1);
      expect(report.issues.some(i => i.type === 'bad_date')).toBe(true);
    });

    it('detects unknown employees not in employee directory', () => {
      const rows = [
        { EmpId: 'EMP_NEW', Name: 'Dave', Date: '01/07/2026', In: '09:30', Out: '18:30', Status: 'Present', Late: '0:00', Early: '0:00', Duration: '9:00' },
      ];
      const report = validateAttendanceImport(rows, mockMapping, knownEmployees);
      expect(report.unknownEmployeesCount).toBe(1);
      expect(report.unknownEmployeeList[0].employeeCode).toBe('EMP_NEW');
      expect(report.canProceed).toBe(true); // can auto-onboard
    });
  });

  describe('Multi-Punch & Night Shift Duration Calculations (Section E Item 99)', () => {
    it('calculates duration from multiple comma-separated punch pairs', () => {
      // 09:15 to 13:00 (3h 45m = 225m) + 14:00 to 18:30 (4h 30m = 270m) = 495m (8h 15m)
      const punches = '09:15, 13:00, 14:00, 18:30';
      const duration = calculateDurationFromPunchRecords(punches);
      expect(duration).toBe('8:15');
    });

    it('handles night shifts crossing midnight in punch records', () => {
      // 22:00 in to 06:00 out next morning = 8 hours
      const punches = '22:00, 06:00';
      const duration = calculateDurationFromPunchRecords(punches);
      expect(duration).toBe('8:00');
    });

    it('ignores invalid punch strings', () => {
      expect(calculateDurationFromPunchRecords('--')).toBeNull();
      expect(calculateDurationFromPunchRecords('0:00')).toBeNull();
      expect(calculateDurationFromPunchRecords('')).toBeNull();
    });

    it('validates punch times correctly', () => {
      expect(isPunchTimeValid('09:30')).toBe(true);
      expect(isPunchTimeValid('0:00')).toBe(false);
      expect(isPunchTimeValid('--')).toBe(false);
      expect(isPunchTimeValid('—')).toBe(false);
      expect(isPunchTimeValid('')).toBe(false);
    });
  });

  describe('Date Format Normalization (DMY, MDY, YMD)', () => {
    it('normalizes DMY Indian default dates', () => {
      expect(normalizeDate('05/07/2026', 'DMY')).toBe('2026-07-05');
      expect(normalizeDate('25/12/2026', 'DMY')).toBe('2026-12-25');
    });

    it('normalizes MDY US format dates', () => {
      expect(normalizeDate('07/05/2026', 'MDY')).toBe('2026-07-05');
    });

    it('preserves ISO YMD format dates', () => {
      expect(normalizeDate('2026-07-05', 'YMD')).toBe('2026-07-05');
      expect(normalizeDate('2026-07-05T00:00:00', 'YMD')).toBe('2026-07-05');
    });
  });
});
