-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0025 — Flexible Leave Policy Engine (Section D of SaaS Roadmap)
--
-- 1. Drops hardcoded CHECK constraint on leave_types.code (SL, CL, PL, LWP only)
--    enabling custom and multi-tenant leave types (Maternity, Paternity,
--    Comp-Off, Bereavement, Optional Holidays, etc.).
-- 2. Scopes leave_types uniqueness to (org_id, code).
-- 3. Creates leave_policies, leave_rules, and policy_assignments tables
--    with effective-dated versions and multi-tenant org_id isolation.
-- 4. Seeds WonderBiz Standard Leave Policy (v1) for Org #1 with 100%
--    backward compatibility.
-- ═══════════════════════════════════════════════════════════════════════════

-- -----------------------------------------------------------------------------
-- 1. DROP RESTRICTIVE CHECK CONSTRAINT & GLOBAL UNIQUE ON leave_types.code
-- -----------------------------------------------------------------------------

ALTER TABLE leave_types DROP CONSTRAINT IF EXISTS leave_types_code_check;
ALTER TABLE leave_types DROP CONSTRAINT IF EXISTS leave_types_code_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_leave_types_org_code'
  ) THEN
    ALTER TABLE leave_types ADD CONSTRAINT uq_leave_types_org_code UNIQUE (org_id, code);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. CREATE leave_policies TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS leave_policies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  version         integer NOT NULL DEFAULT 1,
  is_active       boolean NOT NULL DEFAULT true,
  effective_from  date NOT NULL DEFAULT CURRENT_DATE,
  effective_to    date,
  settings        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_leave_policies_org_name_version UNIQUE (org_id, name, version)
);

CREATE INDEX IF NOT EXISTS idx_leave_policies_org_id ON leave_policies(org_id);
CREATE INDEX IF NOT EXISTS idx_leave_policies_active ON leave_policies(org_id, is_active);

ALTER TABLE leave_policies ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 3. CREATE leave_rules TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS leave_rules (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id         uuid NOT NULL REFERENCES leave_policies(id) ON DELETE CASCADE,
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  leave_type_code   text NOT NULL,
  rule_type         text NOT NULL, -- 'entitlement', 'notice_tier', 'documentation', 'consecutive_limit', 'probation', 'notice_period', 'sandwich'
  parameters        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_rules_policy ON leave_rules(policy_id);
CREATE INDEX IF NOT EXISTS idx_leave_rules_org ON leave_rules(org_id);
CREATE INDEX IF NOT EXISTS idx_leave_rules_type ON leave_rules(leave_type_code);

ALTER TABLE leave_rules ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 4. CREATE policy_assignments TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS policy_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  policy_id       uuid NOT NULL REFERENCES leave_policies(id) ON DELETE CASCADE,
  office_id       uuid REFERENCES offices(id) ON DELETE CASCADE,
  department      text,
  employee_type   text DEFAULT 'full_time',
  priority        integer DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_policy_assignments_org ON policy_assignments(org_id);
CREATE INDEX IF NOT EXISTS idx_policy_assignments_policy ON policy_assignments(policy_id);

ALTER TABLE policy_assignments ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY POLICIES (Tenant Isolation via auth_org_id())
-- -----------------------------------------------------------------------------

CREATE POLICY "leave_policies_tenant_select" ON leave_policies
  FOR SELECT TO authenticated
  USING (org_id = auth_org_id());

CREATE POLICY "leave_policies_tenant_all" ON leave_policies
  FOR ALL TO authenticated
  USING (org_id = auth_org_id())
  WITH CHECK (org_id = auth_org_id());

CREATE POLICY "leave_rules_tenant_select" ON leave_rules
  FOR SELECT TO authenticated
  USING (org_id = auth_org_id());

CREATE POLICY "leave_rules_tenant_all" ON leave_rules
  FOR ALL TO authenticated
  USING (org_id = auth_org_id())
  WITH CHECK (org_id = auth_org_id());

CREATE POLICY "policy_assignments_tenant_select" ON policy_assignments
  FOR SELECT TO authenticated
  USING (org_id = auth_org_id());

CREATE POLICY "policy_assignments_tenant_all" ON policy_assignments
  FOR ALL TO authenticated
  USING (org_id = auth_org_id())
  WITH CHECK (org_id = auth_org_id());

-- -----------------------------------------------------------------------------
-- 6. SEED WONDERBIZ STANDARD LEAVE POLICY (v1) FOR ORG #1
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  wb_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_policy_id uuid;
BEGIN
  -- Insert or select WonderBiz default policy
  INSERT INTO leave_policies (org_id, name, description, version, is_active, settings)
  VALUES (
    wb_id,
    'WonderBiz Standard Policy',
    'Canonical WonderBiz leave policy with SL, CL, PL rules, 4-month probation unlock, and notice tiers.',
    1,
    true,
    jsonb_build_object(
      'probation_unlock_months', 4,
      'allow_negative_balance', false,
      'sandwich_rules_enabled', true
    )
  )
  ON CONFLICT (org_id, name, version) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_policy_id;

  IF v_policy_id IS NOT NULL THEN
    -- Clear and re-seed policy rules for repeatability
    DELETE FROM leave_rules WHERE policy_id = v_policy_id;

    -- Planned Leave (PL) Rules
    INSERT INTO leave_rules (policy_id, org_id, leave_type_code, rule_type, parameters)
    VALUES
      (v_policy_id, wb_id, 'PL', 'entitlement', jsonb_build_object('annual_quota', 12, 'accrual_type', 'annual')),
      (v_policy_id, wb_id, 'PL', 'notice_tier', jsonb_build_object('tiers', jsonb_build_array(
        jsonb_build_object('min_days', 1, 'max_days', 2, 'notice_days', 3),
        jsonb_build_object('min_days', 3, 'max_days', 5, 'notice_days', 7),
        jsonb_build_object('min_days', 6, 'notice_days', 14)
      ))),
      (v_policy_id, wb_id, 'PL', 'sandwich', jsonb_build_object('enabled', true));

    -- Sick Leave (SL) Rules
    INSERT INTO leave_rules (policy_id, org_id, leave_type_code, rule_type, parameters)
    VALUES
      (v_policy_id, wb_id, 'SL', 'entitlement', jsonb_build_object('annual_quota', 7, 'accrual_type', 'annual')),
      (v_policy_id, wb_id, 'SL', 'documentation', jsonb_build_object('requires_certificate_after_days', 2));

    -- Casual Leave (CL) Rules
    INSERT INTO leave_rules (policy_id, org_id, leave_type_code, rule_type, parameters)
    VALUES
      (v_policy_id, wb_id, 'CL', 'entitlement', jsonb_build_object('annual_quota', 7, 'accrual_type', 'annual')),
      (v_policy_id, wb_id, 'CL', 'consecutive_limit', jsonb_build_object('max_consecutive_days', 3)),
      (v_policy_id, wb_id, 'CL', 'notice_tier', jsonb_build_object('tiers', jsonb_build_array(
        jsonb_build_object('min_days', 1, 'notice_days', 1)
      )));

    -- Leave Without Pay (LWP) Fallback Rules
    INSERT INTO leave_rules (policy_id, org_id, leave_type_code, rule_type, parameters)
    VALUES
      (v_policy_id, wb_id, 'LWP', 'entitlement', jsonb_build_object('annual_quota', 0, 'is_directly_applicable', false));

    -- Global Eligibility Rules
    INSERT INTO leave_rules (policy_id, org_id, leave_type_code, rule_type, parameters)
    VALUES
      (v_policy_id, wb_id, 'ALL', 'probation', jsonb_build_object('probation_unlock_months', 4, 'action', 'auto_lwp')),
      (v_policy_id, wb_id, 'ALL', 'notice_period', jsonb_build_object('action', 'auto_lwp'));

    -- Default organization assignment
    INSERT INTO policy_assignments (org_id, policy_id, employee_type, priority)
    VALUES (wb_id, v_policy_id, 'full_time', 0)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
