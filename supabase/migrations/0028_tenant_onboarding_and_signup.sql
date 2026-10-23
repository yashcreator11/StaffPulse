-- =============================================================================
-- Migration: 0028_tenant_onboarding_and_signup.sql
-- Description: Tenant onboarding completion flag, organization timezone,
--              and opening leave balances migration table with tenant RLS.
-- =============================================================================

-- 1. Organization Onboarding State & Timezone
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Kolkata';

-- Mark WonderBiz as already onboarded so it never sees initial setup wizard
UPDATE organizations
SET onboarding_completed_at = now()
WHERE id = '00000000-0000-0000-0000-000000000001' 
  AND onboarding_completed_at IS NULL;

-- 2. Opening Leave Balances Table
-- Stores opening/carried-forward balances imported during tenant migration from legacy HRMS
CREATE TABLE IF NOT EXISTS opening_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES organizations(id) ON DELETE CASCADE,
  employee_code text NOT NULL,
  leave_type_code text NOT NULL,
  balance numeric(5, 2) NOT NULL,
  year int NOT NULL,
  imported_by uuid REFERENCES employees(id),
  imported_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_opening_balance UNIQUE (org_id, employee_code, leave_type_code, year)
);

CREATE INDEX IF NOT EXISTS idx_opening_balances_lookup 
  ON opening_balances(org_id, employee_code, year);

-- 3. Row Level Security for Opening Balances
ALTER TABLE opening_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_opening_balances_isolation ON opening_balances;

CREATE POLICY tenant_opening_balances_isolation ON opening_balances
  FOR ALL
  USING (org_id = auth_org_id())
  WITH CHECK (org_id = auth_org_id());

-- =============================================================================
-- ROLLBACK SCRIPT:
--
-- DROP TABLE IF EXISTS opening_balances CASCADE;
-- ALTER TABLE organizations DROP COLUMN IF EXISTS timezone;
-- ALTER TABLE organizations DROP COLUMN IF EXISTS onboarding_completed_at;
-- =============================================================================
