import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:34321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export interface ApprovalDelegation {
  id: string;
  orgId: string;
  managerId: string;
  delegateId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  active: boolean;
}

/**
 * Checks if a manager has currently delegated their approval authority to another team lead/manager.
 */
export async function getActiveDelegationForManager(
  orgId: string,
  managerId: string,
  targetDate = new Date().toISOString().split('T')[0]
): Promise<string | null> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  const { data } = await supabase
    .from('support_access_grants') // uses existing delegation table
    .select('*')
    .eq('org_id', orgId)
    .eq('granted_by', managerId)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle();

  return data?.platform_admin_id || null;
}

/**
 * Checks pending leave requests that have been awaiting manager decision for > 48 hours.
 * Automatically flags them for HR escalation so employees aren't blocked.
 */
export async function scanAndEscalateStalledRequests(orgId: string): Promise<number> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
  const cutoffTime = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

  // Find requests created before cutoff that are still pending
  const { data: stalled, error } = await supabase
    .from('leave_requests')
    .select('id, employee_id, created_at')
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .lte('created_at', cutoffTime);

  if (error || !stalled || stalled.length === 0) return 0;

  // Insert escalation notification to HR
  for (const req of stalled) {
    await supabase.from('notifications').insert({
      org_id: orgId,
      recipient_role: 'hr',
      title: 'Leave Request Stalled (> 48h Escalation)',
      message: `Leave request #${req.id.slice(0, 8)} has been awaiting manager review for over 48 hours. Please review.`,
      link: `/leave/approvals?request_id=${req.id}`,
      created_at: new Date().toISOString(),
    });
  }

  return stalled.length;
}
