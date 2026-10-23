-- =============================================================================
-- Migration: 0032_master_console_v2_features.sql
-- Description: Section O - Master Console V2 features: support notes,
--              organization feature flags, consent-based impersonation grants,
--              and platform announcements.
-- =============================================================================

-- 1. Organization Support Notes Table
CREATE TABLE IF NOT EXISTS org_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_email text NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_notes_org ON org_notes(org_id, created_at DESC);

-- 2. Organization Feature Flags Table
CREATE TABLE IF NOT EXISTS org_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_feature UNIQUE (org_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_org_feature_flags ON org_feature_flags(org_id);

-- 3. Consent-Based Support Impersonation Grants Table
CREATE TABLE IF NOT EXISTS support_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES employees(id),
  platform_admin_id uuid NOT NULL,
  admin_email text NOT NULL,
  reason text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_grants_org ON support_access_grants(org_id, expires_at);

-- 4. Platform Announcements Table
CREATE TABLE IF NOT EXISTS platform_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'maintenance', 'critical')),
  target_plan text DEFAULT 'all',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default feature flags for existing organizations
INSERT INTO org_feature_flags (org_id, feature_key, is_enabled)
SELECT id, 'sso_google', true FROM organizations
ON CONFLICT DO NOTHING;

INSERT INTO org_feature_flags (org_id, feature_key, is_enabled)
SELECT id, 'sso_m365', (plan IN ('plan2', 'plan3')) FROM organizations
ON CONFLICT DO NOTHING;

INSERT INTO org_feature_flags (org_id, feature_key, is_enabled)
SELECT id, 'sso_saml', (plan = 'plan3') FROM organizations
ON CONFLICT DO NOTHING;

INSERT INTO org_feature_flags (org_id, feature_key, is_enabled)
SELECT id, 'advanced_analytics', (plan IN ('plan2', 'plan3')) FROM organizations
ON CONFLICT DO NOTHING;
