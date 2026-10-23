-- =============================================================================
-- Migration: 0030_compliance_audit_logs_and_retention.sql
-- Description: Section K - Compliance, DPDP Act 2023, GDPR data protection,
--              immutable audit logs, and organization retention settings.
-- =============================================================================

-- 1. Organizations Data Retention & DPDP Consent Fields
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS data_retention_days integer NOT NULL DEFAULT 730,
  ADD COLUMN IF NOT EXISTS dpdp_consent_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS dpo_contact_email text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

-- 2. Immutable Audit Log Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  actor_email text NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_time ON audit_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(org_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(org_id, actor_email);

-- 3. Row Level Security for Audit Logs (Append-Only)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_audit_logs_select ON audit_logs;
CREATE POLICY tenant_audit_logs_select ON audit_logs
  FOR SELECT
  USING (org_id = auth_org_id());

DROP POLICY IF EXISTS tenant_audit_logs_insert ON audit_logs;
CREATE POLICY tenant_audit_logs_insert ON audit_logs
  FOR INSERT
  WITH CHECK (org_id = auth_org_id());

-- NO UPDATE OR DELETE POLICIES = IMMUTABLE AUDIT LOG
