import { ColumnMapping } from './types';

export interface VendorTemplate {
  id: string;
  name: string;
  vendor: string;
  description: string;
  defaultDateFormat: 'DMY' | 'MDY' | 'YMD';
  mapping: ColumnMapping;
  signatureHeaders: string[]; // Key columns characteristic of this hardware export
}

/**
 * Standard Hardware / Software Biometric Profiles
 * Used by Indian & international enterprises:
 * - eSSL (eTimeTrackLite, SilkBio, MB20)
 * - ZKTeco (BioTime, ZKBioSecurity, uFace)
 * - Matrix COSEC (CENTRA, VEGA, DOOR)
 * - Realtime Biometrics (T502, RS20, BioOffice)
 * - Hikvision (HikCentral, IVMS-4200)
 * - Generic Biometric CSV
 */
export const VENDOR_TEMPLATES: Record<string, VendorTemplate> = {
  essl: {
    id: 'essl',
    vendor: 'eSSL',
    name: 'eSSL eTimeTrackLite / SilkBio',
    description: 'Common in Indian enterprises using eSSL biometric readers and eTimeTrack software.',
    defaultDateFormat: 'DMY',
    signatureHeaders: ['Emp Code', 'Emp Name', 'In Time', 'Out Time', 'Punch Records'],
    mapping: {
      employeeCode: 'Emp Code',
      employeeName: 'Emp Name',
      date: 'Date',
      inTime: 'In Time',
      outTime: 'Out Time',
      status: 'Status',
      lateBy: 'Late By',
      earlyBy: 'Early By',
      duration: 'Total Hours',
      department: 'Department',
      vendorPreset: 'essl',
      dateFormat: 'DMY',
    },
  },
  zkteco: {
    id: 'zkteco',
    vendor: 'ZKTeco',
    name: 'ZKTeco BioTime / ZKBioSecurity',
    description: 'Standard export format from ZKTeco cloud/on-premise attendance software.',
    defaultDateFormat: 'DMY',
    signatureHeaders: ['AC-No.', 'Name', 'Clock-in', 'Clock-out', 'Attendance State'],
    mapping: {
      employeeCode: 'AC-No.',
      employeeName: 'Name',
      date: 'Date',
      inTime: 'Clock-in',
      outTime: 'Clock-out',
      status: 'Attendance State',
      lateBy: 'Late',
      earlyBy: 'Early',
      duration: 'Work Duration',
      department: 'Department',
      vendorPreset: 'zkteco',
      dateFormat: 'DMY',
    },
  },
  matrix: {
    id: 'matrix',
    vendor: 'Matrix Comsec',
    name: 'Matrix COSEC CENTRA / VEGA',
    description: 'Enterprise access control & time-attendance platform exports.',
    defaultDateFormat: 'DMY',
    signatureHeaders: ['User ID', 'User Name', 'Punch Date', 'First In', 'Last Out'],
    mapping: {
      employeeCode: 'User ID',
      employeeName: 'User Name',
      date: 'Punch Date',
      inTime: 'First In',
      outTime: 'Last Out',
      status: 'Status',
      lateBy: 'Late In',
      earlyBy: 'Early Out',
      duration: 'Work Hours',
      department: 'Department',
      vendorPreset: 'matrix',
      dateFormat: 'DMY',
    },
  },
  realtime: {
    id: 'realtime',
    vendor: 'Realtime Biometrics',
    name: 'Realtime T502 / BioOffice',
    description: 'Realtime standalone and cloud biometric devices.',
    defaultDateFormat: 'DMY',
    signatureHeaders: ['Enroll No', 'Staff Name', 'Att Date', 'Att Status'],
    mapping: {
      employeeCode: 'Enroll No',
      employeeName: 'Staff Name',
      date: 'Att Date',
      inTime: 'In',
      outTime: 'Out',
      status: 'Att Status',
      lateBy: 'Late (min)',
      earlyBy: 'Early (min)',
      duration: 'Work Time',
      department: 'Dept',
      vendorPreset: 'realtime',
      dateFormat: 'DMY',
    },
  },
  hikvision: {
    id: 'hikvision',
    vendor: 'Hikvision',
    name: 'Hikvision HikCentral / IVMS-4200',
    description: 'Hikvision facial recognition and terminal attendance exports.',
    defaultDateFormat: 'YMD',
    signatureHeaders: ['Person ID', 'Person Name', 'Event Date', 'Check-in Time', 'Check-out Time'],
    mapping: {
      employeeCode: 'Person ID',
      employeeName: 'Person Name',
      date: 'Event Date',
      inTime: 'Check-in Time',
      outTime: 'Check-out Time',
      status: 'Attendance Result',
      lateBy: 'Late Time',
      earlyBy: 'Leave Early Time',
      duration: 'Actual Work Time',
      department: 'Department Name',
      vendorPreset: 'hikvision',
      dateFormat: 'YMD',
    },
  },
  generic: {
    id: 'generic',
    vendor: 'Generic',
    name: 'Standard / Generic CSV',
    description: 'Default normalized format with standard headers.',
    defaultDateFormat: 'DMY',
    signatureHeaders: ['Employee Code', 'Date', 'In Time', 'Out Time'],
    mapping: {
      employeeCode: 'Employee Code',
      employeeName: 'Employee Name',
      date: 'Date',
      inTime: 'In Time',
      outTime: 'Out Time',
      status: 'Status',
      lateBy: 'Late By',
      earlyBy: 'Early By',
      duration: 'Duration',
      department: 'Department',
      vendorPreset: 'generic',
      dateFormat: 'DMY',
    },
  },
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_\-./()]+/g, '').replace(/[^a-z0-9]/g, '');
}

/**
 * Matches a list of CSV headers against known hardware export profiles.
 * Returns the best matching VendorTemplate if match confidence is high, or null.
 */
export function detectVendorTemplate(csvHeaders: string[]): VendorTemplate | null {
  if (!csvHeaders || csvHeaders.length === 0) return null;

  const normalizedCsv = new Set(csvHeaders.map(normalizeHeader));

  let bestMatch: { template: VendorTemplate; matchCount: number } | null = null;

  for (const template of Object.values(VENDOR_TEMPLATES)) {
    if (template.id === 'generic') continue;

    let matchCount = 0;
    for (const sig of template.signatureHeaders) {
      if (normalizedCsv.has(normalizeHeader(sig))) {
        matchCount++;
      }
    }

    // Require at least 2 signature headers to match
    if (matchCount >= 2 && (!bestMatch || matchCount > bestMatch.matchCount)) {
      bestMatch = { template, matchCount };
    }
  }

  return bestMatch ? bestMatch.template : null;
}
