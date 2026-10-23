import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:34321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

export interface AuditEventParams {
  orgId: string;
  actorId?: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent(params: AuditEventParams) {
  try {
    const supabase = getAdminClient();
    await supabase.from('audit_logs').insert({
      org_id: params.orgId,
      actor_id: params.actorId || null,
      actor_email: params.actorEmail,
      actor_role: params.actorRole,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      details: params.details || {},
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
    });
  } catch (err) {
    // Audit logging should not crash the primary operational request, but warn in server logs
    console.error('[logAuditEvent Error]', err);
  }
}

export async function getAuditLogs(
  orgId: string,
  options?: { limit?: number; offset?: number; entityType?: string; action?: string }
) {
  const supabase = getAdminClient();
  let query = supabase
    .from('audit_logs')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (options?.entityType) {
    query = query.eq('entity_type', options.entityType);
  }
  if (options?.action) {
    query = query.ilike('action', `%${options.action}%`);
  }

  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function exportOrganizationDataArchive(orgId: string) {
  const supabase = getAdminClient();

  const [
    { data: org },
    { data: employees },
    { data: offices },
    { data: policies },
    { data: leaves },
    { data: attendance },
    { data: auditLogs },
  ] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', orgId).single(),
    supabase.from('employees').select('*').eq('org_id', orgId),
    supabase.from('offices').select('*').eq('org_id', orgId),
    supabase.from('leave_policies').select('*').eq('org_id', orgId),
    supabase.from('leave_applications').select('*').eq('org_id', orgId).limit(500),
    supabase.from('attendance_records').select('*').eq('org_id', orgId).limit(1000),
    supabase.from('audit_logs').select('*').eq('org_id', orgId).limit(200),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    complianceStandard: 'DPDP Act 2023 / GDPR Article 20 Portable Data',
    organization: org,
    metadata: {
      totalEmployees: employees?.length || 0,
      totalOffices: offices?.length || 0,
      totalPolicies: policies?.length || 0,
      totalLeaveApplications: leaves?.length || 0,
      totalAttendanceSample: attendance?.length || 0,
    },
    data: {
      employees: employees || [],
      offices: offices || [],
      leavePolicies: policies || [],
      leaveApplications: leaves || [],
      attendanceRecords: attendance || [],
      auditTrailSummary: auditLogs || [],
    },
  };
}

export async function executeEmployeeDataErasure(
  orgId: string,
  employeeId: string,
  actorEmail: string
) {
  const supabase = getAdminClient();

  // 1. Fetch employee to verify existence & tenant match
  const { data: emp, error } = await supabase
    .from('employees')
    .select('id, email, employee_code, org_id')
    .eq('id', employeeId)
    .eq('org_id', orgId)
    .single();

  if (error || !emp) {
    throw new Error('Employee not found or access denied');
  }

  // 2. Anonymize/Scrub personal details in compliance with GDPR Art 17 / DPDP Right to Erasure
  const anonymizedEmail = `erased_${emp.employee_code}_${Date.now()}@anonymized.internal`;
  const anonymizedName = `Erased Employee ${emp.employee_code}`;

  await supabase
    .from('employees')
    .update({
      email: anonymizedEmail,
      name: anonymizedName,
      status: 'inactive',
      phone: null,
      reporting_manager_id: null,
      reporting_lead_id: null,
    })
    .eq('id', employeeId)
    .eq('org_id', orgId);

  // 3. Log audit event
  await logAuditEvent({
    orgId,
    actorEmail,
    actorRole: 'hr_admin',
    action: 'compliance.employee_erasure',
    entityType: 'employee',
    entityId: employeeId,
    details: { employeeCode: emp.employee_code, formerEmail: emp.email },
  });

  return { success: true, employeeCode: emp.employee_code, erasedAt: new Date().toISOString() };
}
