-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0024 — Platform Master Console (Version 1)
-- Section O of SaaS Readiness (P0/P1)
--
-- 1. Creates platform_admins table (strictly isolated from tenant employees).
-- 2. Creates append-only platform_audit_log table.
-- 3. Implements is_platform_admin() security helper.
-- 4. Establishes RLS ensuring tenant admins (including hr_super_admin) get
--    403 / denied on master resources.
--
-- Rollback note:
-- To revert this migration:
--   - DROP TRIGGER IF EXISTS trg_prevent_audit_log_tampering ON platform_audit_log;
--   - DROP FUNCTION IF EXISTS prevent_audit_log_tampering();
--   - DROP FUNCTION IF EXISTS is_platform_admin();
--   - DROP TABLE IF EXISTS platform_audit_log;
--   - DROP TABLE IF EXISTS platform_admins;
-- ═══════════════════════════════════════════════════════════════════════════

-- -----------------------------------------------------------------------------
-- 1. CREATE PLATFORM ADMINS TABLE (Completely separate from employees)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS platform_admins (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL UNIQUE,
  email         text NOT NULL UNIQUE,
  role          text NOT NULL DEFAULT 'support' CHECK (role IN ('owner', 'support', 'finance', 'read_only')),
  mfa_required  boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_admins_user_id ON platform_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_admins_email ON platform_admins(email);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. CREATE APPEND-ONLY PLATFORM AUDIT LOG
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS platform_audit_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_admin_id   uuid REFERENCES platform_admins(id) ON DELETE SET NULL,
  org_id              uuid REFERENCES organizations(id) ON DELETE CASCADE,
  action              text NOT NULL,
  details             jsonb DEFAULT '{}'::jsonb,
  ip_address          text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_log_org ON platform_audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_log_action ON platform_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_platform_audit_log_time ON platform_audit_log(created_at DESC);

ALTER TABLE platform_audit_log ENABLE ROW LEVEL SECURITY;

-- Enforce append-only integrity: prevent updates or deletions on audit log
CREATE OR REPLACE FUNCTION prevent_audit_log_tampering()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'platform_audit_log is immutable and append-only. Updates and deletions are forbidden.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_tampering ON platform_audit_log;
CREATE TRIGGER trg_prevent_audit_log_tampering
  BEFORE UPDATE OR DELETE ON platform_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_tampering();

-- -----------------------------------------------------------------------------
-- 3. SECURITY DEFINER HELPER: is_platform_admin()
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.role() = 'service_role') OR EXISTS (
    SELECT 1 FROM platform_admins
    WHERE user_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- 4. MASTER CONSOLE ROW LEVEL SECURITY POLICIES
-- -----------------------------------------------------------------------------

-- Platform Admins table: only platform admins can view
CREATE POLICY "platform_admins_read" ON platform_admins
  FOR SELECT TO authenticated
  USING (is_platform_admin());

CREATE POLICY "platform_admins_write" ON platform_admins
  FOR ALL TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Platform Audit Log: platform admins can read and insert; nobody can update/delete
CREATE POLICY "platform_audit_log_read" ON platform_audit_log
  FOR SELECT TO authenticated
  USING (is_platform_admin());

CREATE POLICY "platform_audit_log_insert" ON platform_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (is_platform_admin());

-- Organizations management policy for platform admins
CREATE POLICY "org_platform_admin_all" ON organizations
  FOR ALL TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());
