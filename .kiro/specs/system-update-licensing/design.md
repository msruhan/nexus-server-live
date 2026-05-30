# Technical Design Document

## Introduction

This document describes the technical design for the "System & Update" feature in NexusServer. This feature allows licensed installations to check for updates, download them, and apply them with a single click from the admin dashboard. The design covers only the NexusServer side (client); the Vendor Portal (License Server) is a separate project.

## Architecture Overview

```
NexusServer (Customer Installation)
├── /admin/system                    ← Admin UI page
├── /api/admin/system/               ← API routes
│   ├── license (activate/validate/deactivate)
│   ├── update-check
│   └── update-apply
├── src/lib/license/
│   ├── client.ts                    ← HTTP client to License Server
│   ├── validator.ts                 ← Periodic validation logic
│   └── types.ts
├── src/lib/updater/
│   ├── manager.ts                   ← Download, extract, build, restart
│   ├── backup.ts                    ← Backup/rollback logic
│   └── types.ts
└── prisma/schema.prisma             ← SiteSettings + UpdateLog model
```

## System Components

### Component 1: License Client (`src/lib/license/client.ts`)

**Purpose:** Communicates with the external License Server (NexusPortal) to validate licenses, activate keys, and deactivate installations.

**Design:**
- Raw `fetch` calls to the License Server URL (configured via `NEXUS_LICENSE_SERVER_URL` env var)
- Settings cached for 60s (same pattern as `src/lib/telegram/client.ts`)
- All calls have 30-second timeout
- Never throws — returns `{ ok, error }` result objects
- Fire-and-forget for periodic validation (never blocks app startup)

**Interface:**
```typescript
type LicenseStatus = 'active' | 'inactive' | 'not_activated';

type LicenseInfo = {
  status: LicenseStatus;
  key: string | null;        // masked
  domain: string | null;
  expiresAt: string | null;  // ISO date
  plan: string | null;
  lastValidatedAt: string | null;
  reason?: string;           // if inactive, why
};

type ActivateResult = { ok: true; info: LicenseInfo } | { ok: false; error: string };
type ValidateResult = { ok: true; info: LicenseInfo } | { ok: false; error: string };
type DeactivateResult = { ok: true } | { ok: false; error: string };

async function activateLicense(key: string): Promise<ActivateResult>;
async function validateLicense(): Promise<ValidateResult>;
async function deactivateLicense(): Promise<DeactivateResult>;
```

### Component 2: Update Manager (`src/lib/updater/manager.ts`)

**Purpose:** Handles the full update lifecycle: check for updates, download package, apply files, run migrations, rebuild, and restart.

**Design:**
- Check: queries License Server for latest version vs current `package.json` version
- Download: streams ZIP to `/tmp/nexus-update-{version}.zip`, verifies SHA-256 checksum
- Apply: extracts ZIP over project root (excludes `.env`, `prisma/*.db`, `node_modules`)
- Post-apply: runs `npm install`, `npx prisma generate`, `npx prisma db push`, `npm run build`
- Restart: executes configured restart command (default: `pm2 restart nexus-server`)
- Rollback: restores from backup tarball if any step fails
- Progress: writes status to a temp file (`/tmp/nexus-update-status.json`) that the UI polls

**Interface:**
```typescript
type UpdateInfo = {
  available: boolean;
  currentVersion: string;
  latestVersion: string | null;
  changelog: string | null;
  downloadSize: number | null; // bytes
  checksum: string | null;
};

type UpdateProgress = {
  phase: 'idle' | 'downloading' | 'extracting' | 'installing' | 'migrating' | 'building' | 'restarting' | 'done' | 'failed';
  percent: number;        // 0-100
  message: string;
  error?: string;
};

async function checkForUpdate(): Promise<UpdateInfo>;
async function applyUpdate(targetVersion: string): Promise<void>; // runs in background
function getUpdateProgress(): UpdateProgress;
```

### Component 3: Backup Manager (`src/lib/updater/backup.ts`)

**Purpose:** Creates a backup before update and restores if update fails.

**Design:**
- Before update: `tar -czf /tmp/nexus-backup-{timestamp}.tar.gz` of critical files
- Excludes: `node_modules/`, `.next/`, `/tmp/`, `prisma/*.db`
- Keeps only 1 backup (deletes previous)
- Rollback: extracts backup tarball back to project root

### Component 4: License Validator (Periodic) (`src/lib/license/validator.ts`)

**Purpose:** Validates license on app startup and every 24 hours.

**Design:**
- Hooks into `instrumentation.ts` (already exists for schedulers)
- On startup: validate once, update SiteSettings
- Every 24h: re-validate via `setInterval`
- Grace period: if License Server unreachable for 7 days, mark inactive
- Never blocks app startup or any user action

### Component 5: Admin System Page (`/admin/system`)

**Purpose:** UI for license management and one-click updates.

**Sections:**
1. **System Info** — version, Node.js version, uptime, domain
2. **License** — status badge, key (masked), expiry, activate/deactivate buttons
3. **Updates** — check button, available version card, "Update Now" button with progress
4. **Update History** — table of past updates (from UpdateLog model)

## Database Changes

### SiteSettings (additions)

```prisma
// ─── Licensing & Updates ─────────────────────────────────────
licenseKey           String?  @db.Text
licenseStatus        String   @default("not_activated") // active | inactive | not_activated
licenseDomain        String?
licensePlan          String?
licenseExpiresAt     DateTime?
licenseLastValidated DateTime?
licenseReason        String?  // reason if inactive

lastUpdateVersion    String?
lastUpdateAt         DateTime?
```

### New Model: UpdateLog

```prisma
model UpdateLog {
  id              String   @id @default(cuid())
  fromVersion     String
  toVersion       String
  status          String   // "success" | "failed" | "rolled_back"
  error           String?  @db.Text
  appliedAt       DateTime @default(now())
  durationSeconds Int?

  @@index([appliedAt])
}
```

### SubAdminPermission (addition)

```prisma
manageSystem  Boolean @default(false)
```

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/system` | GET | Get system info + license status |
| `/api/admin/system/license` | POST | Activate / deactivate license |
| `/api/admin/system/update-check` | POST | Check for available updates |
| `/api/admin/system/update-apply` | POST | Start update process |
| `/api/admin/system/update-progress` | GET | Poll update progress |

## Environment Variables

```env
# License Server URL (NexusPortal)
NEXUS_LICENSE_SERVER_URL=https://portal.nexusserver.com

# Restart command after update (default: pm2 restart nexus-server)
NEXUS_RESTART_COMMAND=pm2 restart nexus-server
```

## Security Considerations

1. **License key stored encrypted** — at-rest in SiteSettings (or rely on DB encryption)
2. **License Server communication** — HTTPS only, 30s timeout
3. **Update package integrity** — SHA-256 checksum verification before extraction
4. **Backup before update** — automatic rollback on failure
5. **Permission gated** — only ADMIN or SUB_ADMIN with `manageSystem` can access
6. **No source exposure** — ZIP packages are pre-built, customer never sees raw source

## Update Process Flow (Detailed)

```
Admin clicks "Update Now"
        │
        ▼
[1] POST /api/admin/system/update-apply { version: "1.3.0" }
        │
        ▼
[2] Verify license is active
        │ (fail → return error)
        ▼
[3] Create backup: tar -czf /tmp/nexus-backup-{ts}.tar.gz
        │
        ▼
[4] Download ZIP from License Server
        │ (stream, verify checksum)
        │ (fail → cleanup, return error)
        ▼
[5] Extract ZIP to project root
        │ (skip: .env, prisma/*.db, node_modules)
        ▼
[6] npm install --production
        │ (fail → rollback from backup)
        ▼
[7] npx prisma generate && npx prisma db push
        │ (fail → rollback from backup)
        ▼
[8] npm run build
        │ (fail → rollback from backup)
        ▼
[9] Record success in UpdateLog
        │
        ▼
[10] Execute restart command (pm2 restart / systemctl restart)
        │
        ▼
[11] Return success (UI shows "Update complete, restarting...")
```

## Non-Functional Requirements

- Update process must complete within 5 minutes for typical releases
- Progress polling interval: 2 seconds
- Maximum ZIP package size: 100MB
- Backup retention: 1 most recent backup only
- License validation must not block app startup (fire-and-forget)
