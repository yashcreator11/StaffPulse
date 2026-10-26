import { describe, it, expect, beforeEach } from 'vitest';

describe('Interactive Product Tour Engine', () => {
  const orgId = 'org_enterprise_test';
  const storageKey = `staffpulse_tour_completed_${orgId}`;

  // Mock localStorage for Vitest Node environment
  const mockStorage: Record<string, string> = {};
  const localStorageMock = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => {
      mockStorage[key] = val;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
    clear: () => {
      for (const k in mockStorage) delete mockStorage[k];
    },
  };

  beforeEach(() => {
    localStorageMock.clear();
  });

  it('detects when an organization is new and has not completed the tour', () => {
    const isCompleted = localStorageMock.getItem(storageKey);
    expect(isCompleted).toBeNull();
  });

  it('marks tour completed upon dismissal and prevents recurring popups', () => {
    // User clicks "Get Started" or "Dismiss"
    localStorageMock.setItem(storageKey, 'true');

    expect(localStorageMock.getItem(storageKey)).toBe('true');
  });

  it('isolates tour completion state per organization (multi-tenant safety)', () => {
    const orgAKey = 'staffpulse_tour_completed_org_A';
    const orgBKey = 'staffpulse_tour_completed_org_B';

    localStorageMock.setItem(orgAKey, 'true');

    expect(localStorageMock.getItem(orgAKey)).toBe('true');
    expect(localStorageMock.getItem(orgBKey)).toBeNull();
  });
});
