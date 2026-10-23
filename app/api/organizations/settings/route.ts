import { NextRequest, NextResponse } from 'next/server';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';
import { createLeaveServiceClient } from '@/lib/leaveSupabase/server';

export async function GET() {
  try {
    const requester = await getCurrentEmployee();
    if (!requester || (requester.role !== 'hr' && requester.role !== 'hr_super_admin')) {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const orgId = requester.org_id || '00000000-0000-0000-0000-000000000001';
    const service = createLeaveServiceClient();

    const [orgResult, employeesResult, officesResult, leaveTypesResult] = await Promise.all([
      service.from('organizations').select('*').eq('id', orgId).single(),
      service.from('employees').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
      service.from('offices').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
      service.from('leave_types').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    ]);

    if (orgResult.error || !orgResult.data) {
      return NextResponse.json(
        { error: orgResult.error?.message || 'Organization not found' },
        { status: 404 }
      );
    }

    const org = orgResult.data;
    const settings = (org.settings as Record<string, unknown>) || {};

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        status: org.status,
        seat_limit: org.seat_limit,
        timezone: org.timezone || 'Asia/Kolkata',
        allowed_domains: Array.isArray(settings.allowed_domains) ? settings.allowed_domains : [],
        data_retention_days: typeof settings.data_retention_days === 'number' ? settings.data_retention_days : 365,
        onboarding_completed_at: org.onboarding_completed_at,
        created_at: org.created_at,
      },
      stats: {
        employeeCount: employeesResult.count ?? 0,
        officeCount: officesResult.count ?? 0,
        leaveTypeCount: leaveTypesResult.count ?? 0,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const requester = await getCurrentEmployee();
    if (!requester || (requester.role !== 'hr' && requester.role !== 'hr_super_admin')) {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const orgId = requester.org_id || '00000000-0000-0000-0000-000000000001';
    const body = await req.json();

    const { name, timezone, allowed_domains, data_retention_days } = body;
    const service = createLeaveServiceClient();

    // Fetch existing settings
    const { data: existing, error: fetchErr } = await service
      .from('organizations')
      .select('settings, name, timezone')
      .eq('id', orgId)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const currentSettings = (existing.settings as Record<string, unknown>) || {};
    const updatedSettings = { ...currentSettings };

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof name === 'string' && name.trim().length >= 2) {
      updatePayload.name = name.trim();
    }

    if (typeof timezone === 'string' && timezone.trim()) {
      updatePayload.timezone = timezone.trim();
    }

    if (Array.isArray(allowed_domains)) {
      const cleanDomains = allowed_domains
        .filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
        .map((d) => d.trim().toLowerCase());
      updatedSettings.allowed_domains = cleanDomains;
    }

    if (typeof data_retention_days === 'number' && data_retention_days >= 30 && data_retention_days <= 3650) {
      updatedSettings.data_retention_days = data_retention_days;
    }

    updatePayload.settings = updatedSettings;

    const { error: updateErr } = await service
      .from('organizations')
      .update(updatePayload)
      .eq('id', orgId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: 'Organization settings updated successfully.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
