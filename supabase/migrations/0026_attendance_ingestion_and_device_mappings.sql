-- =============================================================================
-- Migration: 0026_attendance_ingestion_and_device_mappings.sql
-- Description: Biometric device employee mappings, uploaded months freshness timestamps,
--              and optional department default for Section E (Attendance Data Ingestion).
-- =============================================================================

-- 1. Track data freshness timestamp on uploaded_months
ALTER TABLE uploaded_months 
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. Ensure attendance_records can safely default department to 'General'
-- for organizations without department structures
ALTER TABLE attendance_records 
  ALTER COLUMN department SET DEFAULT 'General';

-- 3. Device ID to Employee Code Mappings
-- Maps hardware biometric device enrollment IDs (e.g. numeric "104") to corporate
-- employee codes (e.g. "WB104" or "EMP-104") per organization and office.
CREATE TABLE IF NOT EXISTS device_employee_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES organizations(id) ON DELETE CASCADE,
  office_code text NOT NULL,
  device_id text NOT NULL,
  employee_code text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_device_emp_mapping UNIQUE (org_id, office_code, device_id)
);

CREATE INDEX IF NOT EXISTS idx_device_emp_mapping_lookup 
  ON device_employee_mappings(org_id, office_code, device_id);

CREATE INDEX IF NOT EXISTS idx_device_emp_mapping_emp 
  ON device_employee_mappings(org_id, employee_code);

-- 4. Enable Tenant-Isolated Row-Level Security
ALTER TABLE device_employee_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_device_emp_mapping_isolation ON device_employee_mappings;

CREATE POLICY tenant_device_emp_mapping_isolation ON device_employee_mappings
  FOR ALL
  USING (org_id = auth_org_id())
  WITH CHECK (org_id = auth_org_id());

-- =============================================================================
-- ROLLBACK SCRIPT:
--
-- DROP TABLE IF EXISTS device_employee_mappings CASCADE;
-- ALTER TABLE uploaded_months DROP COLUMN IF EXISTS updated_at;
-- ALTER TABLE attendance_records ALTER COLUMN department DROP DEFAULT;
-- =============================================================================
