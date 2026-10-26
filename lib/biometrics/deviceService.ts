/**
 * StaffPulse Universal Biometric Device Engine
 * Handles device registration, token generation, hardware authentication,
 * and parsing of ADMS/iClock and JSON payloads for eSSL, ZKTeco, Matrix, etc.
 */

import crypto from 'crypto';

export type DeviceVendor = 
  | 'essl_zkteco'
  | 'realtime_biomax'
  | 'matrix'
  | 'hikvision'
  | 'sync_agent_legacy'
  | 'other';

export interface RegisteredDevice {
  id: string;
  org_id: string;
  device_name: string;
  device_serial: string;
  vendor: DeviceVendor;
  office_id: string | null;
  api_token: string;
  ip_address: string | null;
  status: 'online' | 'offline' | 'pending';
  last_heartbeat_at: string | null;
  last_punch_at: string | null;
  total_punches_ingested: number;
  notes?: string | null;
  created_at: string;
}

export interface UniversalPunch {
  employeeCode: string;
  timestamp: string; // YYYY-MM-DD HH:mm:ss
  deviceSerial?: string;
  punchType?: 'in' | 'out' | 'break_out' | 'break_in';
  verificationMode?: 'finger' | 'face' | 'card' | 'password';
}

/**
 * Generate a cryptographically secure device API token
 */
export function generateDeviceToken(): string {
  return `sp_dev_${crypto.randomBytes(18).toString('hex')}`;
}

/**
 * Parse raw ADMS / iClock formatted punch strings (eSSL & ZKTeco hardware)
 * Format is commonly tab or comma separated:
 * e.g. "101\t2026-10-24 09:15:30\t1\t0\t0\t0"
 * or "USERID=101\tCHECKTIME=2026-10-24 09:15:30\tCHECKTYPE=I"
 */
export function parseAdmsPunches(rawText: string, fallbackSerial = 'ADMS_DEVICE'): UniversalPunch[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const results: UniversalPunch[] = [];

  for (const line of lines) {
    // Skip protocol control lines or headers
    if (line.startsWith('CMD') || line.startsWith('ATTLOG') || line.startsWith('OPLOG')) continue;

    // Check key=value format (e.g., USERID=101 CHECKTIME=2026-10-24 08:55:00)
    if (line.includes('USERID=') || line.includes('CHECKTIME=') || line.includes('PIN=')) {
      const userMatch = line.match(/(?:USERID|PIN)=([^\t\r\n\s]+)/i);
      const timeMatch = line.match(/(?:CHECKTIME|TIME)=([^\t\r\n]+?)(?=\s+[A-Z_]+=|$)/i);
      const empCode = userMatch ? userMatch[1].trim() : '';
      const timeStr = timeMatch ? timeMatch[1].trim() : '';

      if (empCode && timeStr) {
        results.push({
          employeeCode: empCode,
          timestamp: normalizeTimestamp(timeStr),
          deviceSerial: fallbackSerial,
        });
      }
      continue;
    }

    // Check tab-separated or whitespace-separated standard ATTLOG format:
    // [0]=PIN/EmpCode, [1]=Date, [2]=Time or [1]=Combined DateTime, [2]=Status/Type
    const parts = line.split('\t').map(s => s.trim());
    if (parts.length >= 2) {
      const empCode = parts[0];
      let timeStr = parts[1];

      // Sometimes parts[1] is Date and parts[2] is Time
      if (parts[1].match(/^\d{4}-\d{2}-\d{2}$/) && parts[2]?.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
        timeStr = `${parts[1]} ${parts[2]}`;
      }

      if (empCode && timeStr && timeStr.length >= 10) {
        results.push({
          employeeCode: empCode.replace(/^0+/, '') || empCode, // Strip leading zeros if desired
          timestamp: normalizeTimestamp(timeStr),
          deviceSerial: fallbackSerial,
          punchType: parts[2] === '0' || parts[2] === 'I' ? 'in' : parts[2] === '1' || parts[2] === 'O' ? 'out' : undefined,
        });
      }
    }
  }

  return results;
}

/**
 * Normalizes different date-time formats to "YYYY-MM-DD HH:mm:ss"
 */
export function normalizeTimestamp(raw: string): string {
  const cleaned = raw.trim().replace('T', ' ');
  // If already standard YYYY-MM-DD HH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  // If YYYY-MM-DD HH:mm
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(cleaned)) {
    return `${cleaned}:00`;
  }
  // Try JS Date parse fallback
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    return d.toISOString().replace('T', ' ').substring(0, 19);
  }
  return cleaned;
}

/**
 * Determine if a device is online based on its last heartbeat timestamp.
 * Defaults to online if pinged within the last 15 minutes.
 */
export function computeDeviceStatus(lastHeartbeat: string | null, thresholdMinutes = 15): 'online' | 'offline' {
  if (!lastHeartbeat) return 'offline';
  const lastTime = new Date(lastHeartbeat).getTime();
  if (isNaN(lastTime)) return 'offline';
  const diffMs = Date.now() - lastTime;
  return diffMs <= thresholdMinutes * 60 * 1000 ? 'online' : 'offline';
}
