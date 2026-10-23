-- Migration 0037: RLS policies for uploaded_months
-- Fixes code 42501: "new row violates row-level security policy for table 'uploaded_months'"
-- Ensures uploaded_months can be selected, inserted, and updated by authenticated users (and service_role).

DO $$
BEGIN
  -- Drop any legacy/stale policies if they exist
  DROP POLICY IF EXISTS "uploaded_months_select" ON uploaded_months;
  DROP POLICY IF EXISTS "uploaded_months_tenant_select" ON uploaded_months;
  DROP POLICY IF EXISTS "uploaded_months_modify" ON uploaded_months;
  DROP POLICY IF EXISTS "uploaded_months_tenant_modify" ON uploaded_months;
  DROP POLICY IF EXISTS "uploaded_months_read_all" ON uploaded_months;
  DROP POLICY IF EXISTS "uploaded_months_write_hr" ON uploaded_months;
  DROP POLICY IF EXISTS "authenticated read/write" ON uploaded_months;
END $$;

-- Enable RLS (already enabled, safe idempotent call)
ALTER TABLE uploaded_months ENABLE ROW LEVEL SECURITY;

-- 1. Read policy: Authenticated users can view uploaded months in their tenant (or if tenant unassigned)
CREATE POLICY "uploaded_months_tenant_select" ON uploaded_months
  FOR SELECT TO authenticated
  USING (
    org_id = auth_org_id()
    OR auth_org_id() IS NULL
    OR is_hr_admin()
    OR auth.role() = 'service_role'
  );

-- 2. Modify policy: HR admins, tenant members, and service role can insert/update/delete uploaded months
CREATE POLICY "uploaded_months_tenant_modify" ON uploaded_months
  FOR ALL TO authenticated
  USING (
    is_hr_admin()
    OR auth.role() = 'service_role'
    OR (org_id = auth_org_id())
    OR (auth_org_id() IS NULL)
  )
  WITH CHECK (
    is_hr_admin()
    OR auth.role() = 'service_role'
    OR (org_id = auth_org_id())
    OR (auth_org_id() IS NULL)
  );

-- Also allow service role bypass unconditionally
GRANT ALL ON uploaded_months TO authenticated;
GRANT ALL ON uploaded_months TO service_role;
