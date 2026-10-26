/**
 * StaffPulse Demo Sandbox Utilities
 * Identifies demo trial accounts and enforces read-only preview protections.
 */

export function isDemoEmail(email?: string | null): boolean {
  if (!email) return false;
  const cleaned = email.toLowerCase().trim();
  return (
    cleaned.endsWith('@staffpulse.io') &&
    (cleaned.startsWith('demo.') || cleaned === 'demo@staffpulse.io')
  );
}

export const DEMO_PREVIEW_NOTICE = {
  title: 'Free Demo Sandbox Mode',
  message: 'You are currently test-driving StaffPulse with pre-loaded sample data. Real biometric device synchronization and CSV uploads are disabled in preview mode.',
  actionLabel: 'Upgrade to Live Subscription',
  actionHref: '/signup',
};
