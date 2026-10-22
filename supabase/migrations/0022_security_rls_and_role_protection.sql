-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0022 — Security, Role Protection & Role/Row-Based RLS
-- Section A of SaaS Readiness (P0)
--
-- 1. Drops blanket "authenticated read/write" RLS policies on all tables.
-- 2. Blocks role self-escalation via database trigger on employees.
-- 3. Removes public select on shared_links table.
-- 4. Installs role- and row-based RLS policies across tenant tables.
--
-- Rollback note:
-- To revert this migration:
--   DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation ON employees;
--   DROP FUNCTION IF EXISTS prevent_role_self_escalation();
--   DROP FUNCTION IF EXISTS can_manage_employee(uuid);
--   DROP FUNCTION IF EXISTS is_hr_admin();
--   DROP FUNCTION IF EXISTS is_manager_or_lead();
--   DROP FUNCTION IF EXISTS current_employee_id();
--   DROP FUNCTION IF EXISTS current_employee_code();
--   DROP FUNCTION IF EXISTS current_user_role();
--   And re-run blanket authenticated policies if required.
-- ═══════════════════════════════════════════════════════════════════════════

-- -----------------------------------------------------------------------------
-- 1. SECURITY DEFINER HELPER FUNCTIONS (STABLE, search_path = public)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM employees
  WHERE auth_user_id = auth.uid()
    AND is_deleted = false
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION current_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM employees
  WHERE auth_user_id = auth.uid()
    AND is_deleted = false
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION current_employee_code()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT employee_code FROM employees
  WHERE auth_user_id = auth.uid()
    AND is_deleted = false
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_hr_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.role() = 'service_role') OR EXISTS (
    SELECT 1 FROM employees
    WHERE auth_user_id = auth.uid()
      AND role IN ('hr', 'hr_super_admin')
      AND is_deleted = false
  );
$$;

CREATE OR REPLACE FUNCTION is_manager_or_lead()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.role() = 'service_role') OR EXISTS (
    SELECT 1 FROM employees
    WHERE auth_user_id = auth.uid()
      AND role IN ('manager', 'lead', 'hr', 'hr_super_admin')
      AND is_deleted = false
  );
$$;

CREATE OR REPLACE FUNCTION can_manage_employee(target_emp_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_hr_admin()
    OR target_emp_id = current_employee_id()
    OR EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = target_emp_id
        AND (
          e.reporting_manager_id = current_employee_id()
          OR e.reporting_lead_id = current_employee_id()
          OR EXISTS (
            SELECT 1 FROM department_managers dm
            WHERE dm.department = e.department
              AND dm.manager_id = current_employee_id()
          )
        )
    );
$$;

-- -----------------------------------------------------------------------------
-- 2. PREVENT ROLE SELF-ESCALATION (DATABASE TRIGGER)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role bypasses trigger for system migrations/admin tasks
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Block any role or employment status modification unless executed by HR admin
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.employment_status IS DISTINCT FROM OLD.employment_status) THEN
    IF NOT is_hr_admin() THEN
      RAISE EXCEPTION 'Unauthorized: only HR administrators can change employee roles or employment status';
    END IF;
  END IF;

  -- Non-HR users can only update their own row (e.g. theme_preference, avatar_url)
  IF NOT is_hr_admin() AND OLD.auth_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: cannot update employee record of another user';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation ON employees;
CREATE TRIGGER trg_prevent_role_self_escalation
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_self_escalation();

-- -----------------------------------------------------------------------------
-- 3. REMOVE BLANKET "AUTHENTICATED READ/WRITE" POLICIES
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'employees','custom_departments','leave_types','leave_balances',
    'balance_transactions','statutory_leave_records','leave_requests',
    'approval_steps','workforce_events','staging_existing_employees',
    'uploaded_months','attendance_records','column_mappings',
    'leave_records','custom_holidays','dashboard_settings','fnf_calculations',
    'department_managers','attendance_exceptions','missed_punch',
    'leave_policy_config','leave_type_thresholds','leave_threshold_alerts',
    'leave_regularisations','wfh_requests','escalation_reminders',
    'pending_employee_signups','offices','notifications','shared_links'
  ]
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS "authenticated read/write" ON %I', t);
    EXCEPTION WHEN undefined_table THEN
      -- table may not exist in all environments; skip
    END;
  END LOOP;
END $$;

-- Also explicitly drop the insecure public select policy on shared_links
DROP POLICY IF EXISTS "anyone can read by token" ON shared_links;
DROP POLICY IF EXISTS "authenticated insert" ON shared_links;

-- -----------------------------------------------------------------------------
-- 4. ROLE- AND ROW-BASED RLS POLICIES
-- -----------------------------------------------------------------------------

-- === EMPLOYEES ===
-- Anyone authenticated can view employee directory (needed for search, colleagues, org chart, approvals)
CREATE POLICY "employees_select" ON employees
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "employees_insert" ON employees
  FOR INSERT TO authenticated
  WITH CHECK (is_hr_admin());

CREATE POLICY "employees_update" ON employees
  FOR UPDATE TO authenticated
  USING (is_hr_admin() OR auth_user_id = auth.uid())
  WITH CHECK (is_hr_admin() OR auth_user_id = auth.uid());

CREATE POLICY "employees_delete" ON employees
  FOR DELETE TO authenticated
  USING (is_hr_admin());

-- === ATTENDANCE RECORDS ===
CREATE POLICY "attendance_select" ON attendance_records
  FOR SELECT TO authenticated
  USING (
    is_hr_admin()
    OR employee_code = current_employee_code()
    OR EXISTS (
      SELECT 1 FROM employees e
      WHERE e.employee_code = attendance_records.employee_code
        AND can_manage_employee(e.id)
    )
  );

CREATE POLICY "attendance_modify" ON attendance_records
  FOR ALL TO authenticated
  USING (is_hr_admin())
  WITH CHECK (is_hr_admin());

-- === LEAVE BALANCES & TRANSACTIONS ===
CREATE POLICY "leave_balances_select" ON leave_balances
  FOR SELECT TO authenticated
  USING (is_hr_admin() OR employee_id = current_employee_id() OR can_manage_employee(employee_id));

CREATE POLICY "leave_balances_modify" ON leave_balances
  FOR ALL TO authenticated
  USING (is_hr_admin())
  WITH CHECK (is_hr_admin());

CREATE POLICY "balance_transactions_select" ON balance_transactions
  FOR SELECT TO authenticated
  USING (
    is_hr_admin()
    OR EXISTS (
      SELECT 1 FROM leave_balances lb
      WHERE lb.id = balance_transactions.leave_balance_id
        AND (lb.employee_id = current_employee_id() OR can_manage_employee(lb.employee_id))
    )
  );

CREATE POLICY "balance_transactions_modify" ON balance_transactions
  FOR ALL TO authenticated
  USING (is_hr_admin())
  WITH CHECK (is_hr_admin());

-- === LEAVE REQUESTS ===
CREATE POLICY "leave_requests_select" ON leave_requests
  FOR SELECT TO authenticated
  USING (is_hr_admin() OR employee_id = current_employee_id() OR can_manage_employee(employee_id));

CREATE POLICY "leave_requests_insert" ON leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (is_hr_admin() OR employee_id = current_employee_id());

CREATE POLICY "leave_requests_update" ON leave_requests
  FOR UPDATE TO authenticated
  USING (is_hr_admin() OR employee_id = current_employee_id() OR can_manage_employee(employee_id))
  WITH CHECK (is_hr_admin() OR employee_id = current_employee_id() OR can_manage_employee(employee_id));

CREATE POLICY "leave_requests_delete" ON leave_requests
  FOR DELETE TO authenticated
  USING (is_hr_admin());

-- === APPROVAL STEPS ===
CREATE POLICY "approval_steps_select" ON approval_steps
  FOR SELECT TO authenticated
  USING (
    is_hr_admin()
    OR approver_id = current_employee_id()
    OR EXISTS (
      SELECT 1 FROM leave_requests lr
      WHERE lr.id = approval_steps.leave_request_id
        AND (lr.employee_id = current_employee_id() OR can_manage_employee(lr.employee_id))
    )
  );

CREATE POLICY "approval_steps_modify" ON approval_steps
  FOR ALL TO authenticated
  USING (is_hr_admin() OR approver_id = current_employee_id())
  WITH CHECK (is_hr_admin() OR approver_id = current_employee_id());

-- === NOTIFICATIONS ===
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT TO authenticated
  USING (is_hr_admin() OR employee_id = current_employee_id());

CREATE POLICY "notifications_modify" ON notifications
  FOR ALL TO authenticated
  USING (is_hr_admin() OR employee_id = current_employee_id())
  WITH CHECK (is_hr_admin() OR employee_id = current_employee_id());

-- === WFH REQUESTS ===
CREATE POLICY "wfh_requests_select" ON wfh_requests
  FOR SELECT TO authenticated
  USING (is_hr_admin() OR employee_id = current_employee_id() OR can_manage_employee(employee_id));

CREATE POLICY "wfh_requests_insert" ON wfh_requests
  FOR INSERT TO authenticated
  WITH CHECK (is_hr_admin() OR employee_id = current_employee_id());

CREATE POLICY "wfh_requests_update" ON wfh_requests
  FOR UPDATE TO authenticated
  USING (is_hr_admin() OR employee_id = current_employee_id() OR can_manage_employee(employee_id))
  WITH CHECK (is_hr_admin() OR employee_id = current_employee_id() OR can_manage_employee(employee_id));

-- === LEAVE REGULARISATIONS ===
CREATE POLICY "leave_regularisations_select" ON leave_regularisations
  FOR SELECT TO authenticated
  USING (is_hr_admin() OR employee_id = current_employee_id() OR can_manage_employee(employee_id));

CREATE POLICY "leave_regularisations_insert" ON leave_regularisations
  FOR INSERT TO authenticated
  WITH CHECK (is_hr_admin() OR employee_id = current_employee_id());

CREATE POLICY "leave_regularisations_update" ON leave_regularisations
  FOR UPDATE TO authenticated
  USING (is_hr_admin() OR employee_id = current_employee_id() OR can_manage_employee(employee_id))
  WITH CHECK (is_hr_admin() OR employee_id = current_employee_id() OR can_manage_employee(employee_id));

-- === ATTENDANCE EXCEPTIONS & MISSED PUNCH ===
CREATE POLICY "attendance_exceptions_select" ON attendance_exceptions
  FOR SELECT TO authenticated
  USING (is_hr_admin() OR employee_id = current_employee_id() OR can_manage_employee(employee_id));

CREATE POLICY "attendance_exceptions_modify" ON attendance_exceptions
  FOR ALL TO authenticated
  USING (is_hr_admin())
  WITH CHECK (is_hr_admin());

CREATE POLICY "missed_punch_select" ON missed_punch
  FOR SELECT TO authenticated
  USING (is_hr_admin() OR employee_id = current_employee_id() OR can_manage_employee(employee_id));

CREATE POLICY "missed_punch_modify" ON missed_punch
  FOR ALL TO authenticated
  USING (is_hr_admin())
  WITH CHECK (is_hr_admin());

-- === SHARED LINKS ===
-- Only HR administrators can create or view shared links in database.
-- Public access by token is handled via server route (/api/shared-link) with service client.
CREATE POLICY "shared_links_hr_all" ON shared_links
  FOR ALL TO authenticated
  USING (is_hr_admin())
  WITH CHECK (is_hr_admin());

-- === CONFIGURATION & REFERENCE TABLES (READ BY ALL, WRITE BY HR) ===
DO $$
DECLARE
  ref_table text;
BEGIN
  FOREACH ref_table IN ARRAY ARRAY[
    'custom_departments', 'leave_types', 'custom_holidays', 'offices',
    'leave_policy_config', 'leave_type_thresholds', 'department_managers',
    'column_mappings', 'dashboard_settings'
  ]
  LOOP
    BEGIN
      EXECUTE format('
        CREATE POLICY "%s_read_all" ON %I FOR SELECT TO authenticated USING (true);
        CREATE POLICY "%s_write_hr" ON %I FOR ALL TO authenticated USING (is_hr_admin()) WITH CHECK (is_hr_admin());
      ', ref_table, ref_table, ref_table, ref_table);
    EXCEPTION WHEN undefined_table THEN
      -- table may not exist in all environments; skip
    END;
  END LOOP;
END $$;
