-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0008 — rename the "tech_lead" role to "lead".
--
-- Why: every team needs one person who has direct reports but no one below
-- them in the "who approves your leave" sense — every team lead, not just
-- engineering. "Tech Lead" as a label doesn't fit HR/Sales/Ops teams, so the
-- role is renamed to the generic "lead" everywhere: the `employees.role`
-- check constraint, the `employees.reporting_tech_lead_id` column (now
-- `reporting_lead_id`), and `leave_requests.approver_role`.
--
-- Run this against the SAME Supabase project unified_schema.sql /
-- 0007_department_managers_and_attendance_exceptions.sql were run against.
-- Safe to run more than once (every step guards for the old name already
-- being gone).
-- ═══════════════════════════════════════════════════════════════════════════




-- 1. Rename the column (structure only — no data loss, no cast needed).
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'employees' and column_name = 'reporting_tech_lead_id'
  ) then
    alter table employees rename column reporting_tech_lead_id to reporting_lead_id;
  end if;
end $$;

-- 2. Re-point the existing data: anyone with role = 'tech_lead' becomes
--    'lead'. Do this BEFORE swapping the check constraint below, since the
--    old constraint only allows 'tech_lead' and would reject 'lead' rows.
update employees set role = 'lead' where role = 'tech_lead';

do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'leave_requests' and column_name = 'approver_role'
  ) then
    update leave_requests set approver_role = 'lead' where approver_role = 'tech_lead';
    alter table leave_requests drop constraint if exists leave_requests_approver_role_check;
    alter table leave_requests
      add constraint leave_requests_approver_role_check
      check (approver_role = any (array['lead'::text, 'manager'::text, 'hr'::text]));
  end if;
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'approval_steps' and column_name = 'approver_role'
  ) then
    update approval_steps set approver_role = 'lead' where approver_role = 'tech_lead';
    alter table approval_steps drop constraint if exists approval_steps_approver_role_check;
    alter table approval_steps
      add constraint approval_steps_approver_role_check
      check (approver_role = any (array['lead'::text, 'manager'::text, 'hr'::text]));
  end if;
end $$;

-- 3. Swap the check constraints to the new allowed value.
alter table employees drop constraint if exists employees_role_check;
alter table employees
  add constraint employees_role_check
  check (role = any (array['employee'::text, 'lead'::text, 'manager'::text, 'hr'::text, 'hr_super_admin'::text]));

-- 4. The foreign key constraint on the renamed column keeps its old
--    generated name (Postgres doesn't auto-rename constraint names when you
--    rename a column) — that's cosmetic only, nothing else depends on the
--    constraint's name, so it's left as-is.
