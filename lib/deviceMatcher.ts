export interface DeviceMatchingRules {
  prefix?: string; // e.g. "WB" or "EMP-"
  padLength?: number; // e.g. 4 -> "0012"
  stripLeadingZeros?: boolean; // e.g. "00123" -> "123"
  caseSensitive?: boolean;
}

export interface DeviceMatchResult {
  deviceId: string;
  employeeCode: string;
  matchedBy: 'exact' | 'custom' | 'prefix' | 'padding' | 'strip_zeros' | 'unmatched';
}

export interface UnmatchedDeviceEntry {
  deviceId: string;
  employeeName?: string;
  sampleRowIndex: number;
  occurrenceCount: number;
}

/**
 * Normalizes and attempts to match a device ID from biometric hardware
 * to an existing employee code using configurable matching rules and/or manual overrides.
 */
export function matchDeviceIdToEmployee(
  deviceId: string,
  existingEmployeeCodes: Set<string>,
  rules?: DeviceMatchingRules,
  customMapping?: Record<string, string>
): DeviceMatchResult {
  const rawId = deviceId.trim();
  if (!rawId) {
    return { deviceId: rawId, employeeCode: '', matchedBy: 'unmatched' };
  }

  // 1. Explicit manual custom mapping
  if (customMapping && customMapping[rawId]) {
    return { deviceId: rawId, employeeCode: customMapping[rawId], matchedBy: 'custom' };
  }

  // 2. Direct exact match
  if (existingEmployeeCodes.has(rawId)) {
    return { deviceId: rawId, employeeCode: rawId, matchedBy: 'exact' };
  }

  // Case-insensitive match check
  for (const code of existingEmployeeCodes) {
    if (code.toLowerCase() === rawId.toLowerCase()) {
      return { deviceId: rawId, employeeCode: code, matchedBy: 'exact' };
    }
  }

  // 3. Prefix matching rule
  if (rules?.prefix) {
    const candidate = `${rules.prefix}${rawId}`;
    if (existingEmployeeCodes.has(candidate)) {
      return { deviceId: rawId, employeeCode: candidate, matchedBy: 'prefix' };
    }
    // Prefix stripping: if deviceId itself has prefix but code doesn't
    if (rawId.startsWith(rules.prefix)) {
      const stripped = rawId.slice(rules.prefix.length);
      if (existingEmployeeCodes.has(stripped)) {
        return { deviceId: rawId, employeeCode: stripped, matchedBy: 'prefix' };
      }
    }
  }

  // 4. Zero padding: pad numeric ID to padLength (e.g. 12 -> 0012)
  if (rules?.padLength && /^\d+$/.test(rawId)) {
    const padded = rawId.padStart(rules.padLength, '0');
    if (existingEmployeeCodes.has(padded)) {
      return { deviceId: rawId, employeeCode: padded, matchedBy: 'padding' };
    }
    // Combined prefix + padding: e.g. WB + 0012 -> WB0012
    if (rules.prefix) {
      const prefixedPadded = `${rules.prefix}${padded}`;
      if (existingEmployeeCodes.has(prefixedPadded)) {
        return { deviceId: rawId, employeeCode: prefixedPadded, matchedBy: 'padding' };
      }
    }
  }

  // 5. Strip leading zeros: e.g. 00045 -> 45
  if (rules?.stripLeadingZeros && /^\d+$/.test(rawId)) {
    const stripped = rawId.replace(/^0+/, '') || '0';
    if (existingEmployeeCodes.has(stripped)) {
      return { deviceId: rawId, employeeCode: stripped, matchedBy: 'strip_zeros' };
    }
  }

  // No match found
  return { deviceId: rawId, employeeCode: rawId, matchedBy: 'unmatched' };
}

/**
 * Scans an array of raw CSV rows to find any device IDs that don't match known employees.
 */
export function identifyUnmatchedDeviceIds(
  rows: { deviceId: string; employeeName?: string }[],
  existingEmployeeCodes: Set<string>,
  rules?: DeviceMatchingRules,
  customMapping?: Record<string, string>
): UnmatchedDeviceEntry[] {
  const counts = new Map<string, { employeeName?: string; sampleIndex: number; count: number }>();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const match = matchDeviceIdToEmployee(r.deviceId, existingEmployeeCodes, rules, customMapping);
    if (match.matchedBy === 'unmatched') {
      const existing = counts.get(r.deviceId);
      if (existing) {
        existing.count++;
      } else {
        counts.set(r.deviceId, {
          employeeName: r.employeeName,
          sampleIndex: i,
          count: 1,
        });
      }
    }
  }

  return Array.from(counts.entries()).map(([deviceId, val]) => ({
    deviceId,
    employeeName: val.employeeName,
    sampleRowIndex: val.sampleIndex,
    occurrenceCount: val.count,
  }));
}
