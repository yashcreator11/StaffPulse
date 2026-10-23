-- =============================================================================
-- Migration: 0031_dashboard_config_and_widgets.sql
-- Description: Section N - Dashboard Adaptability, per-tenant group label,
--              default landing view, widget registry toggles, and comparison thresholds.
-- =============================================================================

-- 1. Dashboard Configurations Table
CREATE TABLE IF NOT EXISTS dashboard_configs (
  org_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  group_label text NOT NULL DEFAULT 'Department',
  default_view text NOT NULL DEFAULT 'month' CHECK (default_view IN ('today', 'month', 'comparison')),
  enabled_widgets jsonb NOT NULL DEFAULT '{
    "kpiCards": true,
    "trendChart": true,
    "groupChart": true,
    "lateRankings": true,
    "absentRankings": true,
    "teamSnapshot": true,
    "dayArrivalTimeline": true
  }'::jsonb,
  min_group_size integer NOT NULL DEFAULT 3,
  max_comparison_groups integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Row Level Security for Dashboard Configs
ALTER TABLE dashboard_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_dashboard_configs_isolation ON dashboard_configs;
CREATE POLICY tenant_dashboard_configs_isolation ON dashboard_configs
  FOR ALL
  USING (org_id = auth_org_id())
  WITH CHECK (org_id = auth_org_id());

-- 3. Seed Default Dashboard Configs for Existing Organizations
INSERT INTO dashboard_configs (org_id, group_label, default_view, min_group_size, max_comparison_groups)
SELECT id, 'Department', 'month', 3, 5 FROM organizations
ON CONFLICT (org_id) DO NOTHING;
