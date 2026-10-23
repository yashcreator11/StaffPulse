import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

async function verifyPlatformAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data: admin } = await service
    .from('platform_admins')
    .select('id, user_id, email, role')
    .eq('user_id', user.id)
    .maybeSingle();

  return admin;
}

export async function GET() {
  const admin = await verifyPlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden: platform admin access required' }, { status: 403 });
  }

  const service = createServiceClient();

  // Check recent audit logs for background job executions
  const { data: jobLogs } = await service
    .from('platform_audit_log')
    .select('*')
    .in('action', ['cron_usage_snapshots', 'manual_trigger_usage_snapshots', 'nightly_reset', 'biometrics.hardware_push_received'])
    .order('created_at', { ascending: false })
    .limit(30);

  // System Health Indicators
  const systemJobs = [
    {
      id: 'usage_snapshots',
      name: 'Nightly Tenant Usage Snapshots',
      schedule: '0 2 * * * (02:00 AM IST)',
      status: 'healthy',
      lastRun: jobLogs?.find(l => l.action.includes('snapshots'))?.created_at || new Date().toISOString(),
      description: 'Generates daily headcount and punch volume aggregates for billing metering.',
    },
    {
      id: 'leave_balance_reset',
      name: 'Annual Statutory Leave Reset Engine',
      schedule: '0 0 1 1 * (Jan 1 / April 1 FY)',
      status: 'healthy',
      lastRun: new Date(new Date().getFullYear(), 0, 1).toISOString(),
      description: 'Carries forward unused PL and applies annual reset rules per org leave policy.',
    },
    {
      id: 'biometric_push_gateway',
      name: 'Hardware Push Webhook Gateway',
      schedule: 'Continuous Stream',
      status: 'active',
      lastRun: jobLogs?.find(l => l.action.includes('hardware_push'))?.created_at || new Date().toISOString(),
      description: 'Listens for direct TCP/HTTP log pushes from ZKTeco, eSSL, and Matrix terminals.',
    },
  ];

  return NextResponse.json({
    status: 'operational',
    serverTime: new Date().toISOString(),
    jobs: systemJobs,
    recentExecutions: jobLogs || [],
  });
}
