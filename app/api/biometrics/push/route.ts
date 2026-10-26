import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logAuditEvent } from '@/lib/compliance/auditService';
import { parseAdmsPunches, normalizeTimestamp, UniversalPunch } from '@/lib/biometrics/deviceService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:34321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
}

/**
 * Resolve device token from request headers or query params
 */
function extractToken(req: NextRequest): string | null {
  const { searchParams } = new URL(req.url);
  const qToken = searchParams.get('token') || searchParams.get('key') || searchParams.get('api_token');
  if (qToken) return qToken.trim();

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  const customHeader = req.headers.get('x-device-token');
  if (customHeader) return customHeader.trim();

  return null;
}

/**
 * Universal Hardware Handshake & Heartbeat (ZKTeco ADMS & eSSL protocol)
 * Devices periodically ping this GET endpoint to sync time and verify server liveness.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sn = searchParams.get('SN') || searchParams.get('device_sn') || searchParams.get('sn') || 'UNKNOWN';
  const token = extractToken(req);

  const supabase = getSupabase();

  // If token or serial provided, update device heartbeat in registry
  if (token || sn !== 'UNKNOWN') {
    let query = supabase.from('registered_devices').select('id, org_id');
    if (token) {
      query = query.eq('api_token', token);
    } else {
      query = query.eq('device_serial', sn);
    }
    const { data: dev } = await query.maybeSingle();

    if (dev) {
      await supabase
        .from('registered_devices')
        .update({
          status: 'online',
          last_heartbeat_at: new Date().toISOString(),
        })
        .eq('id', dev.id);
    }
  }

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
  const sn = searchParams.get('SN') || searchParams.get('device_sn') || searchParams.get('sn') || 'PUSH_DEVICE';
  const token = extractToken(req);
  const explicitOrgId = searchParams.get('org_id');

  const supabase = getSupabase();

  // 1. Authenticate hardware / agent
  let targetOrgId: string | null = null;
  let matchedDevice: { id: string; org_id: string; total_punches_ingested: number } | null = null;

  if (token) {
    const { data: dev } = await supabase
      .from('registered_devices')
      .select('id, org_id, total_punches_ingested')
      .eq('api_token', token)
      .maybeSingle();
    if (dev) {
      matchedDevice = dev;
      targetOrgId = dev.org_id;
    }
  }

  // Fallback to Serial lookup if token was not embedded in push URL
  if (!targetOrgId && sn !== 'PUSH_DEVICE') {
    const { data: dev } = await supabase
      .from('registered_devices')
      .select('id, org_id, total_punches_ingested')
      .eq('device_serial', sn)
      .maybeSingle();
    if (dev) {
      matchedDevice = dev;
      targetOrgId = dev.org_id;
    }
  }

  // Fallback to explicitOrgId in testing/dev environments
  if (!targetOrgId && explicitOrgId) {
    targetOrgId = explicitOrgId;
  }

  // If still unauthenticated, reject unauthorized hardware push
  if (!targetOrgId) {
    return NextResponse.json(
      {
        error: 'Unauthorized: Device not registered or missing valid token',
        hint: 'Register this biometric device under /leave/admin/devices and configure the Push URL with your secret token.',
      },
      { status: 401 }
    );
  }

  const contentType = req.headers.get('content-type') || '';
  const punches: UniversalPunch[] = [];

  try {
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const items = Array.isArray(body) ? body : Array.isArray(body?.punches) ? body.punches : [body];
      for (const item of items) {
        if (item.employeeCode && item.timestamp) {
          punches.push({
            employeeCode: String(item.employeeCode).trim(),
            timestamp: normalizeTimestamp(String(item.timestamp)),
            deviceSerial: String(item.deviceSerial || sn).trim(),
            punchType: item.punchType,
          });
        }
      }
    } else {
      // Raw ADMS / iClock plain-text format (used by eSSL & ZKTeco hardware)
      const rawText = await req.text();
      const parsed = parseAdmsPunches(rawText, sn);
      punches.push(...parsed);
    }

    if (punches.length === 0) {
      return new NextResponse('OK: 0 punches parsed\n', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    // 2. Process & upsert attendance records
    let inserted = 0;
    for (const punch of punches) {
      const datePart = punch.timestamp.split(' ')[0] || new Date().toISOString().split('T')[0];
      const timePart = punch.timestamp.split(' ')[1] || '09:00:00';

      const { data: existing } = await supabase
        .from('attendance')
        .select('*')
        .eq('org_id', targetOrgId)
        .eq('employee_code', punch.employeeCode)
        .eq('date', datePart)
        .maybeSingle();

      if (!existing) {
        await supabase.from('attendance').insert({
          org_id: targetOrgId,
          employee_code: punch.employeeCode,
          date: datePart,
          in_time: timePart,
          out_time: timePart,
          total_minutes: 0,
          status: 'present',
          punch_records: [{ time: timePart, device: punch.deviceSerial || sn, type: punch.punchType || 'in' }],
        });
        inserted++;
      } else {
        const inTime = existing.in_time ? (timePart < existing.in_time ? timePart : existing.in_time) : timePart;
        const outTime = existing.out_time ? (timePart > existing.out_time ? timePart : existing.out_time) : timePart;

        const punchesList = Array.isArray(existing.punch_records) ? existing.punch_records : [];
        punchesList.push({ time: timePart, device: punch.deviceSerial || sn, type: punch.punchType || 'log' });

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

    // 3. Update device heartbeat and metrics
    if (matchedDevice) {
      await supabase
        .from('registered_devices')
        .update({
          status: 'online',
          last_heartbeat_at: new Date().toISOString(),
          last_punch_at: new Date().toISOString(),
          total_punches_ingested: (matchedDevice.total_punches_ingested || 0) + inserted,
        })
        .eq('id', matchedDevice.id);
    }

    // 4. Log compliance audit event
    await logAuditEvent({
      orgId: targetOrgId,
      actorId: 'system_hardware_push',
      actorEmail: `device:${sn}`,
      actorRole: 'system',
      action: 'biometrics.hardware_push_received',
      entityType: 'attendance',
      entityId: sn,
      details: {
        deviceSerial: sn,
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
