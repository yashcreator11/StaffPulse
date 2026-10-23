import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logAuditEvent } from '@/lib/compliance/auditService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:34321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface BiometricPunchLog {
  employeeCode: string;
  timestamp: string; // YYYY-MM-DD HH:mm:ss
  deviceSerial: string;
  punchType?: 'in' | 'out' | 'break_out' | 'break_in';
}

/**
 * Universal Hardware Handshake (ZKTeco ADMS & eSSL protocol)
 * Hardware periodically pings this GET endpoint to sync time and verify server heartbeat.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sn = searchParams.get('SN') || searchParams.get('device_sn') || 'UNKNOWN';

  // Standard ADMS / eSSL handshake response format
  const serverTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
  return new NextResponse(`OK\nServerTime=${serverTime}\nPushOptionsFlag=1\nTransFlag=TransData AttLog\n`, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

/**
 * Universal Hardware Data Push Receiver
 * Accepts punches pushed automatically by eSSL, ZKTeco, Matrix COSEC, or local sync agents.
 */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orgParam = searchParams.get('org_id') || searchParams.get('token');
  const deviceSn = searchParams.get('SN') || searchParams.get('device_sn') || 'PUSH_DEVICE';

  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  // Resolve target organization
  let orgId = orgParam;
  if (!orgId) {
    // If not supplied in query param, resolve default or lookup by device
    const { data: firstOrg } = await supabase.from('organizations').select('id').order('created_at').limit(1).single();
    orgId = firstOrg?.id || '00000000-0000-0000-0000-000000000001';
  }
  const targetOrgId: string = orgId || '00000000-0000-0000-0000-000000000001';

  const contentType = req.headers.get('content-type') || '';
  const punches: BiometricPunchLog[] = [];

  try {
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const items = Array.isArray(body) ? body : [body];
      for (const item of items) {
        if (item.employeeCode && item.timestamp) {
          punches.push({
            employeeCode: String(item.employeeCode).trim(),
            timestamp: String(item.timestamp).trim(),
            deviceSerial: String(item.deviceSerial || deviceSn).trim(),
            punchType: item.punchType,
          });
        }
      }
    } else {
      // Raw text format (tab/newline delimited used by eSSL ADMS)
      const rawText = await req.text();
      const lines = rawText.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\t|,/);
        // Typical format: [UserPIN, Timestamp, Status, VerifyType]
        if (parts.length >= 2) {
          const empCode = parts[0].trim();
          const time = parts[1].trim();
          if (empCode && time && time.includes(':')) {
            punches.push({
              employeeCode: empCode,
              timestamp: time,
              deviceSerial: deviceSn,
              punchType: parts[2] === '1' ? 'out' : 'in',
            });
          }
        }
      }
    }

    if (punches.length === 0) {
      return new NextResponse('OK: 0 punches parsed\n', { status: 200 });
    }

    // Process and upsert into attendance records
    let inserted = 0;
    for (const punch of punches) {
      const datePart = punch.timestamp.split(' ')[0] || new Date().toISOString().split('T')[0];
      const timePart = punch.timestamp.split(' ')[1] || '09:00:00';

      // Check existing record for employee & date
      const { data: existing } = await supabase
        .from('attendance')
        .select('*')
        .eq('org_id', targetOrgId)
        .eq('employee_code', punch.employeeCode)
        .eq('date', datePart)
        .maybeSingle();

      if (!existing) {
        // Create new attendance record
        await supabase.from('attendance').insert({
          org_id: targetOrgId,
          employee_code: punch.employeeCode,
          date: datePart,
          in_time: timePart,
          out_time: timePart,
          total_minutes: 0,
          status: 'present',
          punch_records: [{ time: timePart, device: punch.deviceSerial, type: punch.punchType || 'in' }],
        });
        inserted++;
      } else {
        // Update existing record (earliest in_time, latest out_time)
        const inTime = existing.in_time ? (timePart < existing.in_time ? timePart : existing.in_time) : timePart;
        const outTime = existing.out_time ? (timePart > existing.out_time ? timePart : existing.out_time) : timePart;

        const punchesList = Array.isArray(existing.punch_records) ? existing.punch_records : [];
        punchesList.push({ time: timePart, device: punch.deviceSerial, type: punch.punchType || 'log' });

        // Calculate minutes between in and out
        const [inH, inM] = inTime.split(':').map(Number);
        const [outH, outM] = outTime.split(':').map(Number);
        const totalMinutes = Math.max(0, (outH * 60 + outM) - (inH * 60 + inM));

        await supabase
          .from('attendance')
          .update({
            in_time: inTime,
            out_time: outTime,
            total_minutes: totalMinutes,
            punch_records: punchesList,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        inserted++;
      }
    }

    // Log audit event for hardware push
    await logAuditEvent({
      orgId: targetOrgId,
      actorId: 'system_hardware_push',
      actorEmail: `device:${deviceSn}`,
      actorRole: 'system',
      action: 'biometrics.hardware_push_received',
      entityType: 'attendance',
      entityId: deviceSn,
      details: {
        deviceSerial: deviceSn,
        punchesReceived: punches.length,
        punchesProcessed: inserted,
      },
    });

    return new NextResponse(`OK: ${inserted} punches synchronized\n`, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Biometric sync error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
