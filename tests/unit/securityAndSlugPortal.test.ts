import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimit } from '../../lib/security/rateLimiter';
import { sanitizeCsvValue, sanitizeCsvRows } from '../../lib/security/sanitizeCsv';
import { validateFileBuffer } from '../../lib/validateFile';

describe('Security Suite: Rate Limiter Engine', () => {
  beforeEach(() => {
    resetRateLimit('test-rate-limit');
  });

  it('allows requests within threshold and blocks requests exceeding limit', () => {
    const key = 'test-client-ip';
    const limit = 3;
    const windowSec = 10;

    // 1st request
    const res1 = checkRateLimit(key, limit, windowSec);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    // 2nd request
    const res2 = checkRateLimit(key, limit, windowSec);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    // 3rd request
    const res3 = checkRateLimit(key, limit, windowSec);
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);

    // 4th request -> blocked
    const res4 = checkRateLimit(key, limit, windowSec);
    expect(res4.allowed).toBe(false);
    expect(res4.remaining).toBe(0);
    expect(res4.resetSeconds).toBeGreaterThan(0);
  });
});

describe('Security Suite: CSV Formula Injection (CWE-1236)', () => {
  it('neutralizes cells beginning with formula triggers (=, +, -, @, \\t, \\r)', () => {
    expect(sanitizeCsvValue('=cmd|"/C calc"!A0')).toBe(`'=cmd|"/C calc"!A0`);
    expect(sanitizeCsvValue('+12345')).toBe(`'+12345`);
    expect(sanitizeCsvValue('-500')).toBe(`'-500`);
    expect(sanitizeCsvValue('@SUM(A1:A10)')).toBe(`'@SUM(A1:A10)`);
    expect(sanitizeCsvValue('\tTabTrigger')).toBe(`'\tTabTrigger`);
    expect(sanitizeCsvValue('\rCarriageTrigger')).toBe(`'\rCarriageTrigger`);
  });

  it('leaves standard text and numbers safe without mutation', () => {
    expect(sanitizeCsvValue('Acme Corp')).toBe('Acme Corp');
    expect(sanitizeCsvValue('EMP101')).toBe('EMP101');
    expect(sanitizeCsvValue(42)).toBe('42');
    expect(sanitizeCsvValue('')).toBe('');
    expect(sanitizeCsvValue(null)).toBe('');
  });

  it('sanitizes rows of records thoroughly', () => {
    const rows = [
      { name: 'John Doe', formulaPayload: '=1+1', department: 'Engineering' },
      { name: 'Alice Smith', formulaPayload: '@HYPERLINK("http://evil.com")', department: 'Finance' },
    ];
    const sanitized = sanitizeCsvRows(rows);
    expect(sanitized[0].name).toBe('John Doe');
    expect(sanitized[0].formulaPayload).toBe(`'=1+1`);
    expect(sanitized[1].formulaPayload).toBe(`'@HYPERLINK("http://evil.com")`);
  });
});

describe('Security Suite: Binary Buffer File Upload Validation', () => {
  it('rejects disguised Windows PE executable files (MZ header)', () => {
    // 0x4D, 0x5A = MZ
    const fakeExe = new Uint8Array([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00]);
    const res = validateFileBuffer(fakeExe, 'malicious.csv');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Disguised binary executable');
  });

  it('rejects disguised Linux ELF executable files', () => {
    // 0x7F, 0x45, 0x4C, 0x46 = \x7fELF
    const fakeElf = new Uint8Array([0x7F, 0x45, 0x4C, 0x46, 0x01, 0x01]);
    const res = validateFileBuffer(fakeElf, 'malicious.csv');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Disguised Linux executable');
  });

  it('rejects files containing null bytes in initial chunk', () => {
    const textWithNull = new Uint8Array([0x61, 0x62, 0x00, 0x63, 0x64]); // "ab\0cd"
    const res = validateFileBuffer(textWithNull, 'payload.csv');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Binary or null byte content');
  });

  it('accepts legitimate CSV text buffers', () => {
    const encoder = new TextEncoder();
    const safeCsv = encoder.encode('Date,EmployeeCode,EmployeeName\n2026-07-01,EMP001,John Doe');
    const res = validateFileBuffer(safeCsv, 'attendance.csv');
    expect(res.valid).toBe(true);
  });
});
