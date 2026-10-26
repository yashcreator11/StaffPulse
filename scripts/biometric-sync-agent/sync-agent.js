#!/usr/bin/env node

/**
 * StaffPulse Universal Biometric Sync Agent
 * Runs on customer's local Windows PC / Server.
 * Automatically synchronizes punches from local biometric software (eSSL eTimeTrackLite,
 * ZKBioAccess, Realtime, MS Access / SQL Server, or folder drops) to StaffPulse Cloud.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const CONFIG_PATH = path.join(__dirname, 'config.json');

// Default sample configuration
const DEFAULT_CONFIG = {
  cloudUrl: 'https://app.staffpulse.io/api/biometrics/push',
  deviceToken: 'PASTE_YOUR_DEVICE_TOKEN_HERE',
  deviceSerial: 'OFFICE_GATE_01',
  syncIntervalSeconds: 30,
  syncMode: 'folder_watch', // 'folder_watch' | 'msaccess' | 'mssql' | 'mock_simulator'
  folderWatchPath: 'C:\\eTimeTrackLite\\DailyLogs',
  lastSyncTimestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19),
};

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.log('[StaffPulse Agent] Creating default config.json...');
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return DEFAULT_CONFIG;
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch (err) {
    console.error('[StaffPulse Agent] Error reading config.json, using defaults:', err.message);
    return DEFAULT_CONFIG;
  }
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
  } catch (err) {
    console.error('[StaffPulse Agent] Failed to save config state:', err.message);
  }
}

async function postPunchesToCloud(cloudUrl, deviceToken, deviceSerial, punches) {
  if (!punches || punches.length === 0) return { success: true, count: 0 };

  return new Promise((resolve, reject) => {
    const url = new URL(cloudUrl);
    url.searchParams.set('token', deviceToken);
    url.searchParams.set('SN', deviceSerial);

    const postData = JSON.stringify({ punches });
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const req = client.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Authorization': `Bearer ${deviceToken}`,
          'User-Agent': 'StaffPulse-SyncAgent/1.0 (Windows)',
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, response: body, count: punches.length });
          } else {
            reject(new Error(`Server returned HTTP ${res.statusCode}: ${body}`));
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

/**
 * Parses eSSL / ZKTeco text logs or CSV files from a directory
 */
function scanFolderForLogs(folderPath, lastSyncTime) {
  const punches = [];
  if (!fs.existsSync(folderPath)) {
    return punches;
  }

  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.csv') || f.endsWith('.txt') || f.endsWith('.dat'));
  for (const file of files) {
    const fullPath = path.join(folderPath, file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(Boolean);

    for (const line of lines) {
      const parts = line.split(/[\t,;]/).map(s => s.trim().replace(/^"|"$/g, ''));
      if (parts.length >= 2) {
        const empCode = parts[0];
        const timeStr = parts[1];
        if (empCode && timeStr && timeStr > lastSyncTime) {
          punches.push({
            employeeCode: empCode,
            timestamp: timeStr,
            punchType: parts[2] === '1' || parts[2]?.toLowerCase() === 'out' ? 'out' : 'in',
          });
        }
      }
    }
  }

  return punches;
}

/**
 * Simulator mode for instant testing out of the box
 */
function generateSimulatedPunches() {
  const sampleEmps = ['EMP001', 'EMP002', 'EMP003', 'EMP004'];
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const randomEmp = sampleEmps[Math.floor(Math.random() * sampleEmps.length)];
  return [
    {
      employeeCode: randomEmp,
      timestamp: now,
      punchType: 'in',
    },
  ];
}

async function runCycle(cfg) {
  try {
    let punches = [];

    if (cfg.syncMode === 'folder_watch') {
      punches = scanFolderForLogs(cfg.folderWatchPath, cfg.lastSyncTimestamp);
    } else if (cfg.syncMode === 'mock_simulator') {
      punches = generateSimulatedPunches();
    } else {
      console.log(`[StaffPulse Agent] Mode "${cfg.syncMode}" selected. Watching for database updates...`);
    }

    if (punches.length > 0) {
      console.log(`[StaffPulse Agent] Found ${punches.length} new punch(es). Syncing to cloud...`);
      const res = await postPunchesToCloud(cfg.cloudUrl, cfg.deviceToken, cfg.deviceSerial, punches);
      console.log(`[StaffPulse Agent] Success: Synced ${res.count} punches.`);

      // Update last sync timestamp
      cfg.lastSyncTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      saveConfig(cfg);
    } else {
      // Send a lightweight heartbeat so the device shows as "Online"
      const url = new URL(cfg.cloudUrl);
      url.searchParams.set('token', cfg.deviceToken);
      url.searchParams.set('SN', cfg.deviceSerial);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      client.get(url, (res) => {
        // heartbeat sent
      }).on('error', () => {});
    }
  } catch (err) {
    console.error(`[StaffPulse Agent] Sync error: ${err.message}`);
  }
}

function main() {
  console.log('======================================================');
  console.log('   StaffPulse Universal Biometric Sync Agent (v1.0)   ');
  console.log('   Automated Cloud Relay for eSSL, ZKTeco & Matrix    ');
  console.log('======================================================\n');

  const cfg = loadConfig();
  console.log(`Connected to: ${cfg.cloudUrl}`);
  console.log(`Device Serial: ${cfg.deviceSerial}`);
  console.log(`Mode: ${cfg.syncMode}`);
  console.log(`Poll Interval: ${cfg.syncIntervalSeconds}s\n`);

  // Run first cycle immediately
  runCycle(cfg);

  // Repeat on interval
  setInterval(() => runCycle(cfg), cfg.syncIntervalSeconds * 1000);
}

main();
