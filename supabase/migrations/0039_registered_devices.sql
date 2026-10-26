-- ==============================================================================
-- 0039_registered_devices.sql
-- Multi-Tenant Biometric Hardware Registry & Direct Push Engine
-- Supports eSSL, ZKTeco, Matrix, Realtime, BioMax, Hikvision & Sync Agent
-- ==============================================================================

CREATE TABLE IF NOT EXISTS registered_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  device_serial TEXT NOT NULL,
  vendor TEXT NOT NULL DEFAULT 'essl_zkteco' CHECK (vendor IN ('essl_zkteco', 'realtime_biomax', 'matrix', 'hikvision', 'sync_agent_legacy', 'other')),
  office_code TEXT REFERENCES offices(code) ON DELETE SET NULL,
  api_token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('online', 'offline', 'pending')),
  last_heartbeat_at TIMESTAMPTZ,
  last_punch_at TIMESTAMPTZ,
  total_punches_ingested BIGINT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, device_serial)
);

-- Indexing for high-speed device lookups during push ingestion
CREATE INDEX IF NOT EXISTS idx_registered_devices_token ON registered_devices(api_token);
CREATE INDEX IF NOT EXISTS idx_registered_devices_org ON registered_devices(org_id);
CREATE INDEX IF NOT EXISTS idx_registered_devices_serial ON registered_devices(device_serial);

-- Enable Row-Level Security
ALTER TABLE registered_devices ENABLE ROW LEVEL SECURITY;

-- Tenants can view and manage their own registered devices
CREATE POLICY "registered_devices_tenant_all" ON registered_devices
  FOR ALL
  USING (org_id = auth_org_id())
  WITH CHECK (org_id = auth_org_id());

-- Platform super-admins can view all devices in master console
CREATE POLICY "registered_devices_master_all" ON registered_devices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins pa 
      WHERE pa.user_id = auth.uid()
    )
  );

COMMENT ON TABLE registered_devices IS 'Registered biometric hardware units pushing live attendance into StaffPulse';
