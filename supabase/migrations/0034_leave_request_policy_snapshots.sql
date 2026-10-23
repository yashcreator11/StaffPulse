-- Migration 0034: Leave Request Policy Snapshots (Section D Item 85)
-- Ensures that when an employee submits a leave request, the specific policy version
-- and snapshot of the evaluated rules are permanently locked to that request row.

ALTER TABLE leave_requests
ADD COLUMN IF NOT EXISTS policy_id UUID REFERENCES leave_policies(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS policy_version_id UUID,
ADD COLUMN IF NOT EXISTS policy_snapshot JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_leave_requests_policy ON leave_requests(policy_id);
