import { CurrentEmployee } from '../leaveSupabase/getCurrentEmployee';
import { isDemoEmail } from '../isDemoSandbox';

/**
 * Checks if the user's organization has a pending payment that blocks full dashboard/app access.
 * Returns true only for real paying customer accounts whose organization is still in 'pending_payment'.
 * Returns false for demo sandbox accounts and active subscribers.
 */
export function isPaymentPending(employee?: CurrentEmployee | null): boolean {
  if (!employee) return false;
  // Official demo sandbox accounts bypass payment check to explore preview data
  if (isDemoEmail(employee.email)) return false;

  const orgStatus = employee.organizations?.status;
  return orgStatus === 'pending_payment';
}
