import { NextResponse } from 'next/server';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';
import { exportOrganizationDataArchive, logAuditEvent } from '@/lib/compliance/auditService';

// GET /api/compliance/export
// Generates full organization data dump for DPDP Act 2023 / GDPR portable data rights
export async function GET() {
  const requester = await getCurrentEmployee();
  if (!requester || (requester.role !== 'hr' && requester.role !== 'hr_super_admin')) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const orgId = requester.org_id || '00000000-0000-0000-0000-000000000001';
  try {
    const archive = await exportOrganizationDataArchive(orgId);

    await logAuditEvent({
      orgId,
      actorId: requester.id,
      actorEmail: requester.email,
      actorRole: requester.role,
      action: 'compliance.data_export',
      entityType: 'organization',
      entityId: orgId,
      details: { exportSummary: archive.metadata },
    });

    return NextResponse.json(archive);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to export organization data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
