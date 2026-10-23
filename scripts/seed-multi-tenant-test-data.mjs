// scripts/seed-multi-tenant-test-data.mjs
// End-to-end multi-tenant seeding script:
// Creates 3 distinct organizations across Plan 1, Plan 2, and Plan 3 tiers,
// with dedicated offices, leave policies, employees, biometric attendance records,
// leave balances, and pre-verified login credentials for every role.

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';

// 1. Load environment configuration from .env.local
if (existsSync('.env.local')) {
  const content = readFileSync('.env.local', 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:34321';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_PASSWORD = 'Password@123';

const TENANTS = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'WonderBiz Technologies',
    slug: 'wonderbiz',
    plan: 'plan3',
    status: 'active',
    seat_limit: 500,
    timezone: 'Asia/Kolkata',
    allowed_domains: ['wonderbiz.in', 'example.com'],
    offices: [
      { code: 'MUM', name: 'Mumbai HQ' },
      { code: 'HYD', name: 'Hyderabad Center' },
    ],
    leave_types: [
      { code: 'PL', name: 'Privilege Leave', days: 18 },
      { code: 'CL', name: 'Casual Leave', days: 12 },
      { code: 'SL', name: 'Sick Leave', days: 12 },
    ],
    employees: [
      {
        code: 'WB_HR',
        name: 'Harish Rathi',
        email: 'hr@wonderbiz.in',
        role: 'hr_super_admin',
        dept: 'Human Resources',
        office: 'MUM',
        title: 'Head of People Operations',
      },
      {
        code: 'WB_MGR',
        name: 'Manoj Gupta',
        email: 'manager@wonderbiz.in',
        role: 'manager',
        dept: 'Engineering',
        office: 'MUM',
        title: 'Engineering Director',
      },
      {
        code: 'WB_LEAD',
        name: 'Lavanya Nair',
        email: 'lead@wonderbiz.in',
        role: 'lead',
        dept: 'Engineering',
        office: 'MUM',
        title: 'Lead Architect',
      },
      {
        code: 'WB_DEV',
        name: 'Eshan Sharma',
        email: 'employee@wonderbiz.in',
        role: 'employee',
        dept: 'Engineering',
        office: 'MUM',
        title: 'Senior Software Engineer',
      },
      {
        code: 'WB_QA',
        name: 'Kavita Joshi',
        email: 'qa@wonderbiz.in',
        role: 'employee',
        dept: 'Engineering',
        office: 'HYD',
        title: 'QA Automation Specialist',
      },
    ],
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Acme Innovations',
    slug: 'acme',
    plan: 'plan2',
    status: 'active',
    seat_limit: 100,
    timezone: 'Asia/Kolkata',
    allowed_domains: ['acme.com'],
    offices: [
      { code: 'BLR', name: 'Bangalore Tech Park' },
      { code: 'DEL', name: 'Delhi NCR Hub' },
    ],
    leave_types: [
      { code: 'PTO', name: 'Paid Time Off', days: 24 },
      { code: 'SICK', name: 'Medical Leave', days: 10 },
      { code: 'COMP', name: 'Compensatory Off', days: 5 },
    ],
    employees: [
      {
        code: 'ACME_HR',
        name: 'Priya Sundaram',
        email: 'hr@acme.com',
        role: 'hr_super_admin',
        dept: 'People & Culture',
        office: 'BLR',
        title: 'HR Director',
      },
      {
        code: 'ACME_MGR',
        name: 'Rohan Mehra',
        email: 'manager@acme.com',
        role: 'manager',
        dept: 'Product',
        office: 'BLR',
        title: 'VP of Product',
      },
      {
        code: 'ACME_LEAD',
        name: 'Sneha Rao',
        email: 'lead@acme.com',
        role: 'lead',
        dept: 'Product',
        office: 'BLR',
        title: 'Design Lead',
      },
      {
        code: 'ACME_DEV',
        name: 'Vikram Seth',
        email: 'employee@acme.com',
        role: 'employee',
        dept: 'Product',
        office: 'DEL',
        title: 'Frontend Engineer',
      },
    ],
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Nova Startups',
    slug: 'nova',
    plan: 'plan1',
    status: 'trial',
    seat_limit: 25,
    timezone: 'Asia/Kolkata',
    allowed_domains: ['nova.co'],
    offices: [
      { code: 'PUN', name: 'Pune WeWork' },
    ],
    leave_types: [
      { code: 'AL', name: 'Annual Leave', days: 15 },
      { code: 'CL', name: 'Casual Leave', days: 6 },
    ],
    employees: [
      {
        code: 'NOVA_FOUNDER',
        name: 'Aditya Roy',
        email: 'admin@nova.co',
        role: 'hr_super_admin',
        dept: 'Operations',
        office: 'PUN',
        title: 'Co-founder & CEO',
      },
      {
        code: 'NOVA_LEAD',
        name: 'Tanvi Sen',
        email: 'lead@nova.co',
        role: 'lead',
        dept: 'Engineering',
        office: 'PUN',
        title: 'Fullstack Lead',
      },
      {
        code: 'NOVA_DEV',
        name: 'Devansh Kulkarni',
        email: 'employee@nova.co',
        role: 'employee',
        dept: 'Engineering',
        office: 'PUN',
        title: 'Junior Developer',
      },
    ],
  },
];

async function ensureAuthUser(email, password, fullName) {
  const { data: listData } = await supabase.auth.admin.listUsers();
  const existing = (listData?.users || []).find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) {
    throw new Error(`Failed to create auth user ${email}: ${error.message}`);
  }
  return data.user.id;
}

function generatePunchesForEmployee(orgId, emp, year, month) {
  const monthStr = String(month).padStart(2, '0');
  const daysInMonth = new Date(year, month, 0).getDate();
  const records = [];

  for (let day = 1; day <= Math.min(daysInMonth, 22); day++) {
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

    const dayStr = String(day).padStart(2, '0');
    const date = `${year}-${monthStr}-${dayStr}`;
    const rand = (day * 17 + emp.code.charCodeAt(emp.code.length - 1)) % 100;

    let status = 'Present';
    let inTime = '09:20';
    let outTime = '18:30';
    let duration = '9:10';
    let lateBy = '0:00';

    if (rand < 5) {
      status = 'Absent';
      inTime = '';
      outTime = '';
      duration = '0:00';
    } else if (rand < 15) {
      status = 'Present';
      inTime = '10:15';
      outTime = '18:45';
      lateBy = '0:45';
      duration = '8:30';
    }

    records.push({
      org_id: orgId,
      month_key: `${year}_${monthStr}_${emp.office}`,
      employee_code: emp.code,
      employee_name: emp.name,
      department: emp.dept,
      office_code: emp.office,
      date,
      in_time: inTime || null,
      out_time: outTime || null,
      status,
      late_by: lateBy,
      early_by: '0:00',
      duration,
      punch_count: inTime ? (outTime ? 2 : 1) : 0,
    });
  }

  return records;
}

async function main() {
  console.log('================================================================');
  console.log('StaffPulse: Seeding 3 Multi-Tenant Sandbox Organizations & Users');
  console.log('================================================================\n');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthStr = String(currentMonth).padStart(2, '0');

  // 1. Create Platform Master Admin
  const masterAuthId = await ensureAuthUser('master@staffpulse.io', DEFAULT_PASSWORD, 'Platform Master Admin');
  await supabase.from('platform_admins').upsert(
    {
      user_id: masterAuthId,
      email: 'master@staffpulse.io',
      full_name: 'Platform Super Admin',
      role: 'super_admin',
      is_active: true,
    },
    { onConflict: 'user_id' }
  );
  console.log('[MASTER PLATFORM CONSOLE]');
  console.log('URL:      http://localhost:3000/master/login');
  console.log('Email:    master@staffpulse.io');
  console.log('Password: ' + DEFAULT_PASSWORD);
  console.log('----------------------------------------------------------------\n');

  // 2. Loop through each of the 3 Organizations
  for (const tenant of TENANTS) {
    console.log(`[SEEDING TENANT] ${tenant.name} (${tenant.plan.toUpperCase()} Tier)`);
    console.log(`Slug: ${tenant.slug} | Status: ${tenant.status} | Seat Limit: ${tenant.seat_limit}`);

    // A. Upsert Organization
    await supabase.from('organizations').upsert(
      {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        status: tenant.status,
        seat_limit: tenant.seat_limit,
        timezone: tenant.timezone,
        onboarding_completed_at: new Date().toISOString(),
        settings: {
          allowed_domains: tenant.allowed_domains,
          data_retention_days: 365,
        },
      },
      { onConflict: 'id' }
    );

    // B. Upsert Offices
    for (const off of tenant.offices) {
      await supabase.from('offices').upsert(
        { code: off.code, name: off.name, org_id: tenant.id },
        { onConflict: 'code' }
      );
    }

    // C. Upsert Leave Types
    const insertedLeaveTypes = [];
    for (const lt of tenant.leave_types) {
      const { data: upsertedType } = await supabase
        .from('leave_types')
        .upsert(
          {
            org_id: tenant.id,
            code: lt.code,
            name: lt.name,
            annual_quota: lt.days,
            is_active: true,
          },
          { onConflict: 'org_id,code' }
        )
        .select('id, code')
        .single();

      if (upsertedType) insertedLeaveTypes.push(upsertedType);
    }

    // D. Upsert Uploaded Months metadata for each office
    for (const off of tenant.offices) {
      await supabase.from('uploaded_months').upsert(
        {
          key: `${currentYear}_${monthStr}_${off.code}`,
          org_id: tenant.id,
          office_code: off.code,
          label: `${off.code} — ${currentMonth}/${currentYear}`,
          month: monthStr,
          year: String(currentYear),
        },
        { onConflict: 'key' }
      );
    }

    // E. Upsert Employees & Auth Accounts
    let managerId = null;
    let leadId = null;
    const allTenantPunches = [];

    for (const emp of tenant.employees) {
      const authId = await ensureAuthUser(emp.email, DEFAULT_PASSWORD, emp.name);

      const empPayload = {
        org_id: tenant.id,
        auth_user_id: authId,
        employee_code: emp.code,
        full_name: emp.name,
        email: emp.email,
        role: emp.role,
        department: emp.dept,
        office: emp.office,
        job_title: emp.title,
        employment_status: 'active',
        date_of_joining: '2024-01-01',
        is_deleted: false,
        reporting_manager_id: emp.role === 'employee' || emp.role === 'lead' ? managerId : null,
        reporting_lead_id: emp.role === 'employee' ? leadId : null,
        updated_at: new Date().toISOString(),
      };

      const { data: upsertedEmp, error: empErr } = await supabase
        .from('employees')
        .upsert(empPayload, { onConflict: 'org_id,employee_code' })
        .select('id')
        .single();

      if (empErr) {
        console.error(`  Error creating employee ${emp.code}:`, empErr.message);
        continue;
      }

      if (emp.role === 'manager') managerId = upsertedEmp.id;
      if (emp.role === 'lead') leadId = upsertedEmp.id;

      // Seed leave balances for employee
      if (insertedLeaveTypes.length > 0) {
        const balPayload = insertedLeaveTypes.map((t) => ({
          org_id: tenant.id,
          employee_id: upsertedEmp.id,
          leave_type_id: t.id,
          year: currentYear,
          balance: t.code === 'PL' || t.code === 'PTO' || t.code === 'AL' ? 14 : 6,
        }));
        await supabase.from('leave_balances').upsert(balPayload, {
          onConflict: 'employee_id,leave_type_id,year',
        });
      }

      // Generate attendance punches
      const punches = generatePunchesForEmployee(tenant.id, emp, currentYear, currentMonth);
      allTenantPunches.push(...punches);

      console.log(`  ✓ [${emp.role.padEnd(14)}] ${emp.email.padEnd(26)} (Password: ${DEFAULT_PASSWORD})`);
    }

    // F. Batch Upsert Biometric Attendance Punches
    for (let i = 0; i < allTenantPunches.length; i += 200) {
      const batch = allTenantPunches.slice(i, i + 200);
      await supabase.from('attendance_records').upsert(batch, {
        onConflict: 'employee_code,date,office_code',
      });
    }

    console.log(`  ✓ Seeded ${allTenantPunches.length} biometric punch records for ${tenant.name}.\n`);
  }

  console.log('================================================================');
  console.log('Multi-Tenant Testing Data Setup Complete!');
  console.log('You can now log in and test all 3 organizations end-to-end.');
  console.log('================================================================');
}

main().catch(console.error);
