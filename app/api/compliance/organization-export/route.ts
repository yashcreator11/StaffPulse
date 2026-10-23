import { NextResponse } from 'next/server';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';
import { createClient } from '@supabase/supabase-js';
import { ZipArchive } from '@/lib/export/zipBuilder';
import { logAuditEvent } from '@/lib/compliance/auditService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:34321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function toCSV(rows: Record<string, any>[]): string {
  if (!rows || rows.length === 0) return 'No data recorded\n';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(h => {
          const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ];
  return lines.join('\n');
}

export async function GET() {
  const requester = await getCurrentEmployee();
  if (!requester || (requester.role !== 'hr' && requester.role !== 'hr_super_admin')) {
    return NextResponse.json({ error: 'Unauthorized: Only HR Admins may execute full organizational data exports' }, { status: 403 });
  }

  const orgId = requester.org_id || '00000000-0000-0000-0000-000000000001';
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  // 1. Fetch organization details
  const { data: org } = await supabase.from('organizations').select('*').eq('id', orgId).single();

  // 2. Fetch all tenant datasets in parallel
  const [employeesRes, attendanceRes, leaveRequestsRes, balancesRes, auditRes] = await Promise.all([
    supabase.from('employees').select('id, employee_code, name, email, role, department, designation, office, status, date_of_joining').eq('org_id', orgId),
    supabase.from('attendance').select('employee_code, date, in_time, out_time, total_minutes, status, punch_records').eq('org_id', orgId).limit(10000),
    supabase.from('leave_requests').select('employee_code, leave_type, start_date, end_date, days_count, status, reason, created_at').eq('org_id', orgId),
    supabase.from('leave_balances').select('employee_code, leave_type, accrued, used, balance').eq('org_id', orgId),
    supabase.from('platform_audit_log').select('created_at, action, actor_email, actor_role, details').eq('org_id', orgId).order('created_at', { ascending: false }).limit(2000),
  ]);

  const zip = new ZipArchive();

  // Add CSV datasets
  zip.addFile('employees.csv', toCSV(employeesRes.data || []));
  zip.addFile('attendance_records.csv', toCSV(attendanceRes.data || []));
  zip.addFile('leave_requests.csv', toCSV(leaveRequestsRes.data || []));
  zip.addFile('leave_balances.csv', toCSV(balancesRes.data || []));
  zip.addFile('audit_trail.csv', toCSV(auditRes.data || []));

  // Add compliance manifest
  const manifest = {
    organization: {
      id: orgId,
      name: org?.name || 'StaffPulse Organization',
      exportedAt: new Date().toISOString(),
      exportedBy: {
        id: requester.id,
        email: requester.email,
        role: requester.role,
      },
    },
    counts: {
      employees: employeesRes.data?.length || 0,
      attendancePunches: attendanceRes.data?.length || 0,
      leaveRequests: leaveRequestsRes.data?.length || 0,
      leaveBalances: balancesRes.data?.length || 0,
      auditLogs: auditRes.data?.length || 0,
    },
    compliance: {
      standard: 'Digital Personal Data Protection (DPDP) Act 2023 (India)',
      dataPortability: '100% Customer Data Ownership Guarantee',
      format: 'UTF-8 RFC-4180 CSV & JSON',
      retentionPolicy: 'Exported copy belongs exclusively to the Customer.',
    },
  };
  zip.addFile('manifest.json', JSON.stringify(manifest, null, 2));

  // Log audit event
  await logAuditEvent({
    orgId,
    actorId: requester.id,
    actorEmail: requester.email,
    actorRole: requester.role,
    action: 'compliance.full_org_export',
    entityType: 'organization',
    entityId: orgId,
    details: {
      exportedRecordsCount: (employeesRes.data?.length || 0) + (attendanceRes.data?.length || 0),
    },
  });

  const zipBuffer = zip.generate();
  const dateStr = new Date().toISOString().split('T')[0];
  const safeOrgName = (org?.name || 'Workspace').replace(/[^a-zA-Z0-9]/g, '_');

  return new Response(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="StaffPulse_${safeOrgName}_Full_Backup_${dateStr}.zip"`,
      'Content-Length': String(zipBuffer.length),
    },
  });
}
