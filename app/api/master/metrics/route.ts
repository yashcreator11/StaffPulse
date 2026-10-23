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

// GET /api/master/metrics
// Returns platform-level business and operational metrics
export async function GET() {
  const admin = await verifyPlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden: platform admin access required' }, { status: 403 });
  }

  const service = createServiceClient();

  // Run aggregate queries
  const [
    { count: totalOrgs },
    { count: activeOrgs },
    { count: trialOrgs },
    { count: suspendedOrgs },
    { count: totalEmployees },
    { data: subscriptions },
  ] = await Promise.all([
    service.from('organizations').select('*', { count: 'exact', head: true }),
    service.from('organizations').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    service.from('organizations').select('*', { count: 'exact', head: true }).eq('status', 'trial'),
    service.from('organizations').select('*', { count: 'exact', head: true }).eq('status', 'suspended'),
    service.from('employees').select('*', { count: 'exact', head: true }).neq('status', 'inactive'),
    service.from('subscriptions').select('seat_limit, price_per_seat, billing_cycle, status'),
  ]);

  // Estimate Monthly Recurring Revenue (MRR)
  let mrr = 0;
  if (subscriptions) {
    for (const sub of subscriptions) {
      if (sub.status === 'active') {
        const monthlyAmount =
          sub.billing_cycle === 'annual'
            ? (Number(sub.seat_limit) * Number(sub.price_per_seat)) / 12
            : Number(sub.seat_limit) * Number(sub.price_per_seat);
        mrr += monthlyAmount;
      }
    }
  }

  return NextResponse.json({
    metrics: {
      totalOrganizations: totalOrgs || 0,
      activeOrganizations: activeOrgs || 0,
      trialOrganizations: trialOrgs || 0,
      suspendedOrganizations: suspendedOrgs || 0,
      totalActiveEmployees: totalEmployees || 0,
      estimatedMrrUsd: Math.round(mrr * 100) / 100,
      annualRunRateUsd: Math.round(mrr * 12 * 100) / 100,
      trialConversionRatePercent: totalOrgs ? Math.round(((activeOrgs || 0) / totalOrgs) * 100) : 0,
    },
  });
}
