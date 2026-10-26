// scripts/seed-test-users.mjs
// Seeds test users across all system roles with pre-configured credentials

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';

// Load .env.local natively
if (existsSync('.env.local')) {
  const content = readFileSync('.env.local', 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:34321';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
const STARTER_DEMO_ORG_ID = '00000000-0000-0000-0000-000000000002';
const PRO_DEMO_ORG_ID = '00000000-0000-0000-0000-000000000003';
const TEST_PASSWORD = 'Password@123';

const TEST_USERS = [
  {
    role: 'hr_super_admin',
    employee_code: 'TEST_HR',
    full_name: 'Harish Rathi (HR Admin)',
    email: 'hr@wonderbiz.in',
    department: 'Human Resources',
    office: 'MUM',
    job_title: 'Head of People Operations',
  },
  {
    role: 'manager',
    employee_code: 'TEST_MGR',
    full_name: 'Manoj Gupta (Delivery Manager)',
    email: 'manager@wonderbiz.in',
    department: 'Engineering',
    office: 'MUM',
    job_title: 'Engineering Director',
  },
  {
    role: 'lead',
    employee_code: 'TEST_LEAD',
    full_name: 'Lavanya Nair (Tech Lead)',
    email: 'lead@wonderbiz.in',
    department: 'Engineering',
    office: 'MUM',
    job_title: 'Team Lead',
  },
  {
    role: 'employee',
    employee_code: 'TEST_EMP',
    full_name: 'Eshan Sharma (Software Engineer)',
    email: 'employee@wonderbiz.in',
    department: 'Engineering',
    office: 'MUM',
    job_title: 'Software Developer',
  },
  {
    role: 'hr_super_admin',
    employee_code: 'DEMO_STARTER',
    full_name: 'Starter Plan Demo Admin',
    email: 'demo.starter@staffpulse.io',
    department: 'Operations',
    office: 'MUM',
    job_title: 'Demo HR Admin (Starter)',
    customOrgId: STARTER_DEMO_ORG_ID,
  },
  {
    role: 'hr_super_admin',
    employee_code: 'DEMO_PRO',
    full_name: 'Pro Growth Plan Demo Admin',
    email: 'demo.pro@staffpulse.io',
    department: 'People Operations',
    office: 'MUM',
    job_title: 'Demo HR Admin (Pro Growth)',
    customOrgId: PRO_DEMO_ORG_ID,
  },
  {
    role: 'hr_super_admin',
    employee_code: 'DEMO_ENT',
    full_name: 'Enterprise Plan Demo Admin',
    email: 'demo.enterprise@staffpulse.io',
    department: 'Executive HR',
    office: 'MUM',
    job_title: 'Demo HR Director (Enterprise)',
    customOrgId: DEFAULT_ORG_ID,
  },
];

const MASTER_ADMIN = {
  email: 'master@staffpulse.io',
  full_name: 'Platform Super Admin',
  role: 'super_admin',
};

async function getOrCreateAuthUser(email, password, fullName) {
  // Check if auth user already exists
  const { data: listData } = await supabase.auth.admin.listUsers();
  const existing = (listData?.users || []).find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (existing) {
    // Update password to ensure it matches TEST_PASSWORD
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

async function main() {
  console.log('Seeding test users for local testing...\n');

  // 1. Ensure all 3 Plan Demo Organizations exist
  await supabase.from('organizations').upsert(
    [
      {
        id: DEFAULT_ORG_ID,
        name: 'WonderBiz (Enterprise)',
        slug: 'wonderbiz',
        plan: 'plan3',
        status: 'active',
        timezone: 'Asia/Kolkata',
        settings: { allowed_domains: ['wonderbiz.in', 'example.com', 'staffpulse.io'] },
      },
      {
        id: STARTER_DEMO_ORG_ID,
        name: 'StaffPulse Starter Demo',
        slug: 'demo-starter',
        plan: 'plan1',
        status: 'active',
        timezone: 'Asia/Kolkata',
        settings: { allowed_domains: ['staffpulse.io'] },
      },
      {
        id: PRO_DEMO_ORG_ID,
        name: 'StaffPulse Pro Growth Demo',
        slug: 'demo-pro',
        plan: 'plan2',
        status: 'active',
        timezone: 'Asia/Kolkata',
        settings: { allowed_domains: ['staffpulse.io'] },
      },
    ],
    { onConflict: 'id' }
  );

  // 1b. Seed Subscriptions Table for each plan
  await supabase.from('subscriptions').upsert(
    [
      {
        org_id: DEFAULT_ORG_ID,
        plan_tier: 'enterprise',
        billing_cycle: 'annual',
        seat_limit: 500,
        price_per_seat: 120,
        currency: 'INR',
        status: 'active',
      },
      {
        org_id: STARTER_DEMO_ORG_ID,
        plan_tier: 'starter',
        billing_cycle: 'monthly',
        seat_limit: 50,
        price_per_seat: 49,
        currency: 'INR',
        status: 'active',
      },
      {
        org_id: PRO_DEMO_ORG_ID,
        plan_tier: 'pro',
        billing_cycle: 'annual',
        seat_limit: 150,
        price_per_seat: 89,
        currency: 'INR',
        status: 'active',
      },
    ],
    { onConflict: 'org_id' }
  );

  // 2. Ensure MUM and HYD offices exist
  await supabase.from('offices').upsert(
    [
      { code: 'MUM', name: 'Mumbai HQ', org_id: DEFAULT_ORG_ID },
      { code: 'HYD', name: 'Hyderabad Office', org_id: DEFAULT_ORG_ID },
      { code: 'MUM_STARTER', name: 'Mumbai Office', org_id: STARTER_DEMO_ORG_ID },
      { code: 'MUM_PRO', name: 'Mumbai Office', org_id: PRO_DEMO_ORG_ID },
    ],
    { onConflict: 'code' }
  );

  // 3. Create Platform Super Admin
  const masterAuthId = await getOrCreateAuthUser(MASTER_ADMIN.email, TEST_PASSWORD, MASTER_ADMIN.full_name);
  await supabase.from('platform_admins').upsert(
    {
      user_id: masterAuthId,
      email: MASTER_ADMIN.email,
      full_name: MASTER_ADMIN.full_name,
      role: 'owner',
      mfa_required: false,
      is_active: true,
    },
    { onConflict: 'user_id' }
  );
  console.log(`[Master Console]  Email: ${MASTER_ADMIN.email} | Pass: ${TEST_PASSWORD} | Role: super_admin`);

  // 4. Create Tenant Role Users (HR, Manager, Lead, Employee)
  let managerId = null;
  let leadId = null;

  for (const u of TEST_USERS) {
    const authId = await getOrCreateAuthUser(u.email, TEST_PASSWORD, u.full_name);
    const targetOrgId = u.customOrgId || DEFAULT_ORG_ID;

    const empPayload = {
      org_id: targetOrgId,
      auth_user_id: authId,
      employee_code: u.employee_code,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      department: u.department,
      office: u.office,
      job_title: u.job_title,
      employment_status: 'active',
      date_of_joining: '2024-01-01',
      is_deleted: false,
      reporting_manager_id: u.role === 'employee' || u.role === 'lead' ? managerId : null,
      reporting_lead_id: u.role === 'employee' ? leadId : null,
      updated_at: new Date().toISOString(),
    };

    const { data: upsertedEmp, error: empErr } = await supabase
      .from('employees')
      .upsert(empPayload, { onConflict: 'auth_user_id' })
      .select('id')
      .single();

    if (empErr) {
      console.error(`Failed to upsert employee ${u.employee_code}:`, empErr.message);
      continue;
    }

    if (u.role === 'manager') managerId = upsertedEmp.id;
    if (u.role === 'lead') leadId = upsertedEmp.id;

    console.log(`[Tenant User]     Email: ${u.email.padEnd(24)} | Pass: ${TEST_PASSWORD} | Role: ${u.role}`);
  }

  // 5. Seed default leave balances for test employee
  const { data: testEmp } = await supabase
    .from('employees')
    .select('id')
    .eq('org_id', DEFAULT_ORG_ID)
    .eq('employee_code', 'TEST_EMP')
    .single();

  const { data: leaveTypes } = await supabase
    .from('leave_types')
    .select('id, code')
    .eq('org_id', DEFAULT_ORG_ID);

  if (testEmp && leaveTypes && leaveTypes.length > 0) {
    const currentYear = new Date().getFullYear();
    const balancePayload = leaveTypes.map((lt) => ({
      employee_id: testEmp.id,
      leave_type_id: lt.id,
      year: currentYear,
      balance: lt.code === 'PL' ? 14 : lt.code === 'CL' ? 7 : 10,
      org_id: DEFAULT_ORG_ID,
    }));

    await supabase.from('leave_balances').upsert(balancePayload, {
      onConflict: 'employee_id,leave_type_id,year',
    });
  }

  console.log('\nAll test logins are created and ready for testing!');
}

main().catch(console.error);
