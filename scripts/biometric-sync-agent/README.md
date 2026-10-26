# StaffPulse Universal Biometric Sync Agent

A lightweight Windows background relay service that connects on-premise biometric time-clocks (eSSL, ZKTeco, Matrix COSEC, Realtime, Mantra) to **StaffPulse Cloud**.

---

## Capabilities

1. **Folder / Log Drop Sync:** Watches folders where desktop software (e.g. eTimeTrackLite) dumps `.csv`, `.txt`, or `.dat` attendance logs.
2. **Local Database Connector:** Syncs directly from MS Access (`.mdb`) or Microsoft SQL Server tables (`DeviceLogs`).
3. **Heartbeat Relay:** Informs the StaffPulse admin dashboard that the local device is **Online** in real time.
4. **Offline Resilience:** If the office loses internet access, punches accumulate locally and are automatically flushed to StaffPulse as soon as connectivity resumes.

---

## Quick Start

### 1. Configuration (`config.json`)
Create or edit `config.json` next to the executable:

```json
{
  "cloudUrl": "https://your-domain.com/api/biometrics/push",
  "deviceToken": "sp_dev_xxxxxxxxxxxxxxxxxxxx",
  "deviceSerial": "MUMBAI_GATE_FACE01",
  "syncIntervalSeconds": 30,
  "syncMode": "folder_watch",
  "folderWatchPath": "C:\\eTimeTrackLite\\DailyLogs"
}
```

### 2. Run Locally with Node.js
```bash
node sync-agent.js
```

### 3. Compile to a Single Windows Executable (`.exe`)
To distribute to non-technical client IT staff with zero dependencies:

```bash
npm install -g pkg
pkg sync-agent.js --targets node18-win-x64 --output StaffPulseSyncAgent.exe
```

This creates `StaffPulseSyncAgent.exe` (a self-contained Windows executable). Place it in `C:\Program Files\StaffPulse\` and run it on startup or install as a Windows Service using NSSM:

```cmd
nssm install StaffPulseSync C:\Program Files\StaffPulse\StaffPulseSyncAgent.exe
nssm start StaffPulseSync
```
