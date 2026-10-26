import { describe, it, expect } from 'vitest';
import {
  generateDeviceToken,
  parseAdmsPunches,
  normalizeTimestamp,
  computeDeviceStatus,
} from '../../lib/biometrics/deviceService';

describe('Biometric Devices & Hardware Standardization Suite', () => {
  describe('Device API Token Generation', () => {
    it('generates high-entropy secure tokens with sp_dev_ prefix', () => {
      const token1 = generateDeviceToken();
      const token2 = generateDeviceToken();

      expect(token1).toMatch(/^sp_dev_[0-9a-f]{36}$/);
      expect(token2).toMatch(/^sp_dev_[0-9a-f]{36}$/);
      expect(token1).not.toBe(token2);
    });
  });

  describe('ADMS & iClock Hardware Parsing (eSSL & ZKTeco)', () => {
    it('parses standard tab-separated ATTLOG punch lines', () => {
      const rawText = `
101\t2026-10-24 09:15:30\t0\t1
102\t2026-10-24 09:18:00\t0\t1
101\t2026-10-24 18:05:12\t1\t1
      `;
      const punches = parseAdmsPunches(rawText, 'TEST_SN_01');

      expect(punches.length).toBe(3);
      expect(punches[0]).toEqual({
        employeeCode: '101',
        timestamp: '2026-10-24 09:15:30',
        deviceSerial: 'TEST_SN_01',
        punchType: 'in',
      });
      expect(punches[2]).toEqual({
        employeeCode: '101',
        timestamp: '2026-10-24 18:05:12',
        deviceSerial: 'TEST_SN_01',
        punchType: 'out',
      });
    });

    it('parses key-value ADMS protocol lines (USERID=... CHECKTIME=...)', () => {
      const rawText = `
USERID=EMP088\tCHECKTIME=2026-10-24 08:55:00\tCHECKTYPE=I
USERID=EMP099\tCHECKTIME=2026-10-24 09:02:15\tCHECKTYPE=I
      `;
      const punches = parseAdmsPunches(rawText, 'TEST_SN_02');

      expect(punches.length).toBe(2);
      expect(punches[0].employeeCode).toBe('EMP088');
      expect(punches[0].timestamp).toBe('2026-10-24 08:55:00');
      expect(punches[1].employeeCode).toBe('EMP099');
    });

    it('ignores control protocol lines like CMD, ATTLOG, OPLOG', () => {
      const rawText = `
CMD=101
ATTLOG
101\t2026-10-24 09:30:00\t0
      `;
      const punches = parseAdmsPunches(rawText, 'TEST_SN_03');

      expect(punches.length).toBe(1);
      expect(punches[0].employeeCode).toBe('101');
    });
  });

  describe('Timestamp Normalization', () => {
    it('normalizes ISO string with T to space-separated format', () => {
      const normalized = normalizeTimestamp('2026-10-24T09:30:00.000Z');
      expect(normalized).toBe('2026-10-24 09:30:00');
    });

    it('adds missing seconds if only hours and minutes are given', () => {
      const normalized = normalizeTimestamp('2026-10-24 09:30');
      expect(normalized).toBe('2026-10-24 09:30:00');
    });

    it('keeps valid standard YYYY-MM-DD HH:mm:ss untouched', () => {
      const normalized = normalizeTimestamp('2026-10-24 18:45:12');
      expect(normalized).toBe('2026-10-24 18:45:12');
    });
  });

  describe('Device Status & Heartbeat Computation', () => {
    it('flags device as online if heartbeat is within 15 minutes', () => {
      const recent = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min ago
      expect(computeDeviceStatus(recent, 15)).toBe('online');
    });

    it('flags device as offline if heartbeat is older than threshold', () => {
      const old = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 min ago
      expect(computeDeviceStatus(old, 15)).toBe('offline');
    });

    it('flags device as offline if heartbeat is null or invalid', () => {
      expect(computeDeviceStatus(null)).toBe('offline');
      expect(computeDeviceStatus('invalid-date')).toBe('offline');
    });
  });
});
