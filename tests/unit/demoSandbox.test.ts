import { describe, it, expect } from 'vitest';
import { isDemoEmail } from '../../lib/isDemoSandbox';

describe('Demo Sandbox Protection & Access Control', () => {
  it('correctly identifies official demo sandbox accounts', () => {
    expect(isDemoEmail('demo.starter@staffpulse.io')).toBe(true);
    expect(isDemoEmail('demo.pro@staffpulse.io')).toBe(true);
    expect(isDemoEmail('demo.enterprise@staffpulse.io')).toBe(true);
  });

  it('handles case-insensitivity and whitespace in demo emails', () => {
    expect(isDemoEmail('  DEMO.STARTER@STAFFPULSE.IO  ')).toBe(true);
    expect(isDemoEmail('Demo.Pro@StaffPulse.io')).toBe(true);
  });

  it('rejects non-demo emails and paying customer accounts', () => {
    expect(isDemoEmail('hr@wonderbiz.in')).toBe(false);
    expect(isDemoEmail('admin@acme-corp.com')).toBe(false);
    expect(isDemoEmail('master@staffpulse.io')).toBe(false);
    expect(isDemoEmail('demo@gmail.com')).toBe(false);
  });

  it('handles null, undefined, and empty string safely', () => {
    expect(isDemoEmail(null)).toBe(false);
    expect(isDemoEmail(undefined)).toBe(false);
    expect(isDemoEmail('')).toBe(false);
    expect(isDemoEmail('   ')).toBe(false);
  });
});
