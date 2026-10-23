# StaffPulse — Enterprise Multi-Tenant Biometric Attendance & Leave SaaS

StaffPulse is a production-ready, cloud-native B2B SaaS platform that unifies raw biometric machine attendance ingestion (ZKTeco, eSSL, Matrix, Realtime, Hikvision) with flexible leave policy management, automated approvals, DPDP Act 2023 / GDPR compliance, and subscription billing.

---

## Architecture Overview

```
                      ┌───────────────────────────────────────────────┐
                      │              Platform Users                   │
                      │  (Master Admin / HR Admin / Manager / Staff)   │
                      └──────────────────────┬────────────────────────┘
                                             │ HTTPS
                                             ▼
                      ┌───────────────────────────────────────────────┐
                      │         Next.js 16 (App Router / Turbopack)   │
                      │    TypeScript · Tailwind CSS 4 · Recharts     │
                      └──────────────────────┬────────────────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
         ┌───────────────────────────┐               ┌───────────────────────────┐
         │ Tenant Dashboard & Leaves │               │   Platform Master Console │
         │   (/, /leave/**, /setup)  │               │      (/master/**)         │
         └─────────────┬─────────────┘               └─────────────┬─────────────┘
                       │                                           │
                       └─────────────────────┬─────────────────────┘
                                             ▼
                      ┌───────────────────────────────────────────────┐
                      │      Supabase PostgreSQL + RLS Engine        │
                      │  Tenant Isolation via auth_org_id() Helper    │
                      │  32 Applied Reversible Database Migrations    │
                      └───────────────────────────────────────────────┘
```

---

## Key SaaS Capabilities

### 1. Multi-Tenant Architecture & Security (P0)
* **True Tenant Isolation:** Every table is partitioned with `org_id NOT NULL` and enforced via PostgreSQL Row-Level Security (`auth_org_id()`). Cross-tenant access is rejected at the database engine level.
* **Role Protection:** Hierarchical authorization (`employee`, `lead`, `manager`, `hr`, `hr_super_admin`, and `platform_admin`). Role self-escalation is blocked in SQL triggers.
* **Separated Master Console:** Dedicated `/master` portal restricted to platform admins in `platform_admins`, requiring MFA and append-only audit logging.

### 2. Flexible Leave Policy Engine (P0/P1)
* **Custom Leave Types:** Eliminates hardcoded leave codes; organizations define custom entitlement rules, carry-forward caps, probation unlock criteria, and accrual frequencies.
* **Pure Functional Evaluation:** Evaluates leave requests and balance deductions deterministically via `evaluateLeaveRequest()`.

### 3. Biometric Attendance Ingestion (P1)
* **Multi-Format Parser:** Ingests raw punch logs across multiple vendors (eSSL, ZKTeco, Matrix, Hikvision).
* **Fuzzy Header Mapping:** Remembers per-organization device column layouts.
* **Operational Day View:** Real-time single-day workforce metrics, late arrival distributions, grace periods, and non-working day/holiday detection.

### 4. Billing, Subscriptions & Metering (P1)
* **Tier Gating:** Pre-configured tiers for **Starter** (25 seats), **Pro** (100 seats), and **Enterprise** (custom seats & SAML SSO).
* **Seat Capacity Enforcement:** Automatically pauses employee provisioning if tenant seat quota is exceeded.
* **Customer Billing Portal:** Self-serve tier upgrades, monthly vs. annual pricing (20% discount), invoice histories, and GSTIN tax invoicing.

### 5. Compliance & Trust (DPDP Act 2023 / GDPR) (P0/P1)
* **Immutable Audit Trail:** Append-only log recording administrative actions, role adjustments, and settings changes.
* **Data Portability:** One-click full organization JSON archive export complying with DPDP Act & GDPR Art. 20.
* **Right-to-be-Forgotten:** Permanent employee PII scrubbing and anonymization workflow with typed confirmation.

---

## Local Development Setup

### Prerequisites
* Node.js 20 or Node.js 22
* Docker Desktop (for Supabase CLI)
* Supabase CLI (`npm install -g supabase` or `npx supabase`)

### 1. Clone Repository & Install Dependencies
```bash
git clone https://github.com/yashcreator11/StaffPulse.git
cd StaffPulse
npm install
```

### 2. Start Local Supabase Stack
The repository uses custom non-reserved local ports (`3432x`) to avoid Windows NAT / Hyper-V port conflicts:
```bash
npx supabase start
```
* **API URL:** `http://127.0.0.1:34321`
* **Studio / Dashboard:** `http://127.0.0.1:34323`
* **PostgreSQL Database:** `127.0.0.1:34322`

Apply all 32 migrations:
```bash
npx supabase migration up
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## Default Seeded Test Environments

All test account passwords are: **`Password@123`**

### Platform Master Console
* **URL:** `http://localhost:3000/master/login`
* **Email:** `master@staffpulse.io` | **Role:** Platform Owner

### Tenant 1: WonderBiz Technologies (Plan 3 / Enterprise - 500 Seats)
* **URL:** `http://localhost:3000/login`
* **HR Admin:** `hr@wonderbiz.in`
* **Delivery Manager:** `manager@wonderbiz.in`
* **Employee:** `employee@wonderbiz.in`

### Tenant 2: Acme Innovations (Plan 2 / Pro - 100 Seats)
* **URL:** `http://localhost:3000/login`
* **HR Admin:** `hr@acme.com`
* **Product Manager:** `manager@acme.com`
* **Employee:** `employee@acme.com`

### Tenant 3: Nova Startups (Plan 1 / Starter - 25 Seats)
* **URL:** `http://localhost:3000/login`
* **Admin / Founder:** `admin@nova.co`
* **Employee:** `employee@nova.co`

---

## Testing & Quality Gates

Run the automated test suites:
```bash
# Vitest test suite (107 automated unit tests across 13 test files)
npm test

# TypeScript strict type checking (0 errors)
npx tsc --noEmit

# ESLint code quality scan
npm run lint

# Production Next.js build (compiles all 95 dynamic/static routes)
npm run build
```

---

## License

Proprietary — Built for multi-tenant enterprise biometric attendance and leave management.
