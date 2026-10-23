-- =============================================================================
-- Migration: 0033_office_shifts_and_grace_periods.sql
-- Description: Section C & N - Office shift schedules, night shifts,
--              custom grace periods, and work hour thresholds per tenant.
-- =============================================================================

-- 1. Shifts Table
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  office_code text NOT NULL,
  name text NOT NULL,
  start_time time NOT NULL DEFAULT '09:00:00',
  end_time time NOT NULL DEFAULT '18:00:00',
  grace_period_minutes integer NOT NULL DEFAULT 15,
  half_day_threshold_minutes integer NOT NULL DEFAULT 240,
  full_day_threshold_minutes integer NOT NULL DEFAULT 480,
  is_night_shift boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_office_shift_name UNIQUE (org_id, office_code, name)
);

CREATE INDEX IF NOT EXISTS idx_shifts_lookup ON shifts(org_id, office_code);

-- 2. Row Level Security for Shifts
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_shifts_isolation ON shifts;
CREATE POLICY tenant_shifts_isolation ON shifts
  FOR ALL
  USING (org_id = auth_org_id())
  WITH CHECK (org_id = auth_org_id());

-- 3. Seed Default Shifts for Existing Organizations
-- WonderBiz: Mumbai & Hyderabad General Day Shift (9:00 - 18:00, 15m grace)
INSERT INTO shifts (org_id, office_code, name, start_time, end_time, grace_period_minutes, is_default)
SELECT id, 'MUM', 'General Day Shift (Mumbai)', '09:00:00', '18:00:00', 15, true
FROM organizations WHERE slug = 'wonderbiz'
ON CONFLICT DO NOTHING;

INSERT INTO shifts (org_id, office_code, name, start_time, end_time, grace_period_minutes, is_default)
SELECT id, 'HYD', 'General Day Shift (Hyderabad)', '09:30:00', '18:30:00', 15, true
FROM organizations WHERE slug = 'wonderbiz'
ON CONFLICT DO NOTHING;

-- Acme Innovations
INSERT INTO shifts (org_id, office_code, name, start_time, end_time, grace_period_minutes, is_default)
SELECT id, 'HQ', 'Standard Day Shift', '09:00:00', '17:30:00', 20, true
FROM organizations WHERE slug = 'acme'
ON CONFLICT DO NOTHING;

-- Nova Startups
INSERT INTO shifts (org_id, office_code, name, start_time, end_time, grace_period_minutes, is_default)
SELECT id, 'MAIN', 'Flexible Core Hours', '10:00:00', '19:00:00', 30, true
FROM organizations WHERE slug = 'nova'
ON CONFLICT DO NOTHING;
