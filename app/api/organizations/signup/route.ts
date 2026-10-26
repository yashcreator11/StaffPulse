import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { validatePasswordStrength } from '@/lib/authPolicy';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON request' }, { status: 400 });
    }

    const name = String(body.name || '').trim();
    const rawSlug = String(body.slug || '').trim().toLowerCase();
    const adminName = String(body.adminName || '').trim();
    const adminEmail = String(body.adminEmail || '').trim().toLowerCase();
    const password = String(body.password || '');
    const officeCode = (String(body.primaryOffice || 'HQ').trim().toUpperCase()).replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'HQ';

    // 1. Validation
    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Organization name must be at least 2 characters.' }, { status: 400 });
    }

    const slug = rawSlug.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!slug || slug.length < 2) {
      return NextResponse.json({ error: 'URL slug must be at least 2 alphanumeric characters.' }, { status: 400 });
    }

    if (!adminName || adminName.length < 2) {
      return NextResponse.json({ error: 'Admin full name is required.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!adminEmail || !emailRegex.test(adminEmail)) {
      return NextResponse.json({ error: 'A valid business email address is required.' }, { status: 400 });
    }

    const passwordVal = validatePasswordStrength(password);
    if (!passwordVal.isValid) {
      return NextResponse.json({ error: passwordVal.errors.join('. ') }, { status: 400 });
    }

    const service = createServiceClient();

    // 2. Slug uniqueness check
    const { data: existingSlug } = await service
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existingSlug) {
      return NextResponse.json({ error: `The URL slug "${slug}" is already taken. Please choose another.` }, { status: 409 });
    }

    const emailDomain = adminEmail.split('@')[1];

    const planTier = (body.planTier || 'pro') as 'starter' | 'pro' | 'enterprise';
    const billingCycle = (body.billingCycle || 'annual') as 'monthly' | 'annual';
    const planCode = planTier === 'enterprise' ? 'plan3' : planTier === 'starter' ? 'plan1' : 'plan2';

    // 3. Create organization with pending_payment status
    const { data: org, error: orgError } = await service
      .from('organizations')
      .insert({
        name,
        slug,
        plan: planCode,
        status: 'pending_payment',
        seat_limit: 50,
        settings: {
          allowed_domains: [emailDomain],
          timezone: 'Asia/Kolkata',
          auth_policy: {
            allowed_providers: ['google', 'azure', 'password'],
            min_password_length: 8,
          },
        },
      })
      .select('id, slug, name')
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: `Failed to create organization: ${orgError?.message}` }, { status: 500 });
    }

    // 4. Create primary office
    await service.from('offices').insert({
      org_id: org.id,
      code: officeCode,
      name: `${name} (${officeCode})`,
    });

    // 5. Seed standard leave types
    const defaultLeaveTypes = [
      { org_id: org.id, code: 'PL', name: 'Paid / Privilege Leave', days_per_year: 15, is_carry_forward: true },
      { org_id: org.id, code: 'CL', name: 'Casual Leave', days_per_year: 12, is_carry_forward: false },
      { org_id: org.id, code: 'SL', name: 'Sick Leave', days_per_year: 10, is_carry_forward: false },
      { org_id: org.id, code: 'LWP', name: 'Leave Without Pay', days_per_year: 0, is_carry_forward: false },
    ];
    await service.from('leave_types').insert(defaultLeaveTypes);

    // 6. Provision Supabase Auth User
    const { data: authUser, error: authError } = await service.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: adminName,
        org_id: org.id,
      },
    });

    if (authError || !authUser?.user) {
      // Rollback org creation
      await service.from('organizations').delete().eq('id', org.id);
      return NextResponse.json({ error: `Auth account creation failed: ${authError?.message}` }, { status: 400 });
    }

    // 7. Create Employee Record for the Administrator
    const { data: emp, error: empError } = await service
      .from('employees')
      .insert({
        org_id: org.id,
        auth_user_id: authUser.user.id,
        employee_code: 'ADM-001',
        full_name: adminName,
        email: adminEmail,
        role: 'hr_super_admin',
        office: officeCode,
        department: 'Management',
        employment_status: 'active',
        date_of_joining: new Date().toISOString().split('T')[0],
        profile_confirmed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (empError) {
      console.warn('[Signup] Employee profile creation failed:', empError.message);
    }

    // 8. Create Organization Membership
    await service.from('organization_memberships').insert({
      org_id: org.id,
      auth_user_id: authUser.user.id,
      employee_id: emp?.id ?? null,
      role: 'hr_super_admin',
      is_primary: true,
    });

    // 9. Create pending subscription record
    await service.from('subscriptions').insert({
      org_id: org.id,
      plan_tier: planTier,
      billing_cycle: billingCycle,
      seat_limit: 50,
      price_per_seat: planTier === 'enterprise' ? 65 : planTier === 'pro' ? 45 : 25,
      currency: 'INR',
      status: 'pending_payment',
    });

    return NextResponse.json({
      success: true,
      orgId: org.id,
      slug: org.slug,
      planTier,
      billingCycle,
      message: `Organization "${name}" created. Please complete payment to activate your subscription.`,
      redirectUrl: `/checkout?plan=${planTier}&cycle=${billingCycle}&org=${org.id}`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
