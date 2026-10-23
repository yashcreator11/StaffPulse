-- =============================================================================
-- Migration: 0027_auth_and_user_management.sql
-- Description: Employee offboarding lifecycle fields, multi-tenant organization
--              memberships, and organization authentication & password policies.
-- =============================================================================

-- 1. Employee Offboarding & Deactivation Fields
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS deactivated_by uuid REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS offboarding_reason text;

CREATE INDEX IF NOT EXISTS idx_employees_deactivated 
  ON employees(org_id, deactivated_at) 
  WHERE deactivated_at IS NOT NULL;

-- 2. Multi-Organization Memberships
-- Allows employees, consultants, and group managers to belong to more than one organization.
CREATE TABLE IF NOT EXISTS organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'employee',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_org_membership UNIQUE (auth_user_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_org_memberships_user 
  ON organization_memberships(auth_user_id);

CREATE INDEX IF NOT EXISTS idx_org_memberships_org 
  ON organization_memberships(org_id);

-- 3. Row Level Security for Organization Memberships
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_org_membership_isolation ON organization_memberships;

CREATE POLICY tenant_org_membership_isolation ON organization_memberships
  FOR ALL
  USING (
    org_id = auth_org_id() 
    OR auth_user_id = auth.uid()
  )
  WITH CHECK (
    org_id = auth_org_id()
  );

-- 4. Set Default Authentication Policies for WonderBiz and Existing Tenants
UPDATE organizations
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{auth_policy}',
  '{
    "allowed_providers": ["google", "azure", "password"],
    "min_password_length": 8,
    "require_special_char": true,
    "require_number": true,
    "session_timeout_hours": 72,
    "enforce_mfa": false
  }'::jsonb,
  true
)
WHERE settings->'auth_policy' IS NULL;

-- =============================================================================
-- ROLLBACK SCRIPT:
--
-- DROP TABLE IF EXISTS organization_memberships CASCADE;
-- ALTER TABLE employees DROP COLUMN IF EXISTS offboarding_reason;
-- ALTER TABLE employees DROP COLUMN IF EXISTS deactivated_by;
-- ALTER TABLE employees DROP COLUMN IF EXISTS deactivated_at;
-- =============================================================================
