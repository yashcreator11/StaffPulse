-- Migration 0038: Demo Requests and Inquiries Table
-- Captures high-intent enterprise prospects requesting live product walkthroughs or calls

CREATE TABLE IF NOT EXISTS demo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  company_name text NOT NULL,
  employee_count text NOT NULL,
  phone text,
  hardware_brand text,
  preferred_slot text,
  notes text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'scheduled', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for searching and CRM sorting
CREATE INDEX IF NOT EXISTS idx_demo_requests_status_created ON demo_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_requests_email ON demo_requests(email);

-- Enable RLS
ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;

-- Allow public / anon to insert (lead capture from landing page)
CREATE POLICY "demo_requests_insert_public" ON demo_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Allow platform admins / service role to view and manage leads
CREATE POLICY "demo_requests_select_admin" ON demo_requests
  FOR SELECT TO authenticated
  USING (is_hr_admin() OR auth.role() = 'service_role');

CREATE POLICY "demo_requests_modify_admin" ON demo_requests
  FOR ALL TO authenticated
  USING (is_hr_admin() OR auth.role() = 'service_role')
  WITH CHECK (is_hr_admin() OR auth.role() = 'service_role');

GRANT INSERT ON demo_requests TO anon, authenticated;
GRANT ALL ON demo_requests TO service_role;
