import { NextRequest, NextResponse } from 'next/server';
import { getCurrentEmployee } from '@/lib/leaveSupabase/getCurrentEmployee';
import { createLeaveServiceClient } from '@/lib/leaveSupabase/server';
import { generateDeviceToken, computeDeviceStatus, DeviceVendor } from '@/lib/biometrics/deviceService';
import { logAuditEvent } from '@/lib/compliance/auditService';
import { isDemoEmail } from '@/lib/isDemoSandbox';

// GET /api/biometrics/devices
// Returns list of registered devices for the current tenant
export async function GET(req: NextRequest) {
  const requester = await getCurrentEmployee();
  if (!requester || (requester.role !== 'hr' && requester.role !== 'hr_super_admin')) {
    return NextResponse.json({ error: 'Unauthorized: HR Admin access required' }, { status: 403 });
  }

  const orgId = requester.org_id || '00000000-0000-0000-0000-000000000001';
  const supabase = createLeaveServiceClient();

  const { data: devices, error } = await supabase
    .from('registered_devices')
    .select('*, offices(code, name)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Compute live online/offline status dynamically
  const enriched = (devices || []).map((dev) => ({
    ...dev,
    status: computeDeviceStatus(dev.last_heartbeat_at),
  }));

  return NextResponse.json({ devices: enriched });
}

// POST /api/biometrics/devices
// Register a new biometric hardware unit or sync agent
export async function POST(req: NextRequest) {
  const requester = await getCurrentEmployee();
  if (!requester || (requester.role !== 'hr' && requester.role !== 'hr_super_admin')) {
    return NextResponse.json({ error: 'Unauthorized: HR Admin access required' }, { status: 403 });
  }

  if (isDemoEmail(requester.email)) {
    return NextResponse.json(
      { error: 'Device registration is disabled in demo sandbox mode. Please upgrade to a live plan.' },
      { status: 403 }
    );
  }

  const orgId = requester.org_id || '00000000-0000-0000-0000-000000000001';
  const body = await req.json();

  const deviceName = String(body.device_name || '').trim();
  const deviceSerial = String(body.device_serial || '').trim();
  const vendor: DeviceVendor = body.vendor || 'essl_zkteco';
  const officeCode = body.office_code || body.office_id || null;
  const ipAddress = body.ip_address ? String(body.ip_address).trim() : null;
  const notes = body.notes ? String(body.notes).trim() : null;

  if (!deviceName || !deviceSerial) {
    return NextResponse.json({ error: 'Device Name and Serial Number are required' }, { status: 400 });
  }

  const supabase = createLeaveServiceClient();
  const apiToken = generateDeviceToken();

  const { data: newDevice, error } = await supabase
    .from('registered_devices')
    .insert({
      org_id: orgId,
      device_name: deviceName,
      device_serial: deviceSerial,
      vendor,
      office_code: officeCode,
      api_token: apiToken,
      ip_address: ipAddress,
      status: 'pending',
      notes,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A device with this Serial Number is already registered in your organization' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent({
    orgId,
    actorId: requester.id,
    actorEmail: requester.email,
    actorRole: requester.role,
    action: 'biometrics.device_registered',
    entityType: 'registered_devices',
    entityId: newDevice.id,
    details: { deviceName, deviceSerial, vendor },
  });

  return NextResponse.json({ device: newDevice }, { status: 201 });
}

// DELETE /api/biometrics/devices
// Remove a registered device
export async function DELETE(req: NextRequest) {
  const requester = await getCurrentEmployee();
  if (!requester || (requester.role !== 'hr' && requester.role !== 'hr_super_admin')) {
    return NextResponse.json({ error: 'Unauthorized: HR Admin access required' }, { status: 403 });
  }

  if (isDemoEmail(requester.email)) {
    return NextResponse.json(
      { error: 'Device modification is disabled in demo sandbox mode. Please upgrade to a live plan.' },
      { status: 403 }
    );
  }

  const orgId = requester.org_id || '00000000-0000-0000-0000-000000000001';
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get('id');

  if (!deviceId) {
    return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
  }

  const supabase = createLeaveServiceClient();

  const { error } = await supabase
    .from('registered_devices')
    .delete()
    .eq('id', deviceId)
    .eq('org_id', orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent({
    orgId,
    actorId: requester.id,
    actorEmail: requester.email,
    actorRole: requester.role,
    action: 'biometrics.device_deleted',
    entityType: 'registered_devices',
    entityId: deviceId,
  });

  return NextResponse.json({ success: true });
}
