-- Migration 0035: Master Console Onboarding Funnel and Usage Snapshots (Section O Items 277, 278)
-- 1. onboarding_progress: tracks setup funnel stages for each organization
-- 2. usage_snapshots: aggregate nightly usage data per organization

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stage TEXT NOT NULL, -- 'company_details', 'offices_configured', 'policy_configured', 'employees_imported', 'first_punch_uploaded'
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, stage)
);

CREATE TABLE IF NOT EXISTS usage_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  active_employees INT NOT NULL DEFAULT 0,
  total_leaves_recorded INT NOT NULL DEFAULT 0,
  total_punches INT NOT NULL DEFAULT 0,
  storage_mb NUMERIC(8,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_org ON onboarding_progress(org_id);
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_org_date ON usage_snapshots(org_id, snapshot_date);

-- Enable RLS
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_snapshots ENABLE ROW LEVEL SECURITY;

-- Tenant access: read/write own onboarding progress
CREATE POLICY "tenant_manage_onboarding_progress" ON onboarding_progress
  FOR ALL TO authenticated
  USING (org_id = auth_org_id())
  WITH CHECK (org_id = auth_org_id());

-- Tenant access: read own usage snapshots
CREATE POLICY "tenant_read_usage_snapshots" ON usage_snapshots
  FOR SELECT TO authenticated
  USING (org_id = auth_org_id());

-- Platform admin master console access
CREATE POLICY "platform_admin_onboarding_progress" ON onboarding_progress
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()));

CREATE POLICY "platform_admin_usage_snapshots" ON usage_snapshots
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()));
