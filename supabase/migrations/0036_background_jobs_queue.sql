-- Migration 0036: Background Jobs Queue (Section I Item 160)
-- Transactional background job queue for heavy imports, exports, and batch calculations

CREATE TABLE IF NOT EXISTS background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL, -- 'bulk_attendance_import', 'payroll_export', 'policy_simulation', 'gdpr_erasure'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  progress INT NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_background_jobs_org_status ON background_jobs(org_id, status);
CREATE INDEX IF NOT EXISTS idx_background_jobs_type ON background_jobs(job_type);

ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_manage_background_jobs" ON background_jobs
  FOR ALL TO authenticated
  USING (org_id = auth_org_id())
  WITH CHECK (org_id = auth_org_id());

CREATE POLICY "platform_admin_background_jobs" ON background_jobs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()));
