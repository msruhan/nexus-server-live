# Deploy NexusServer — Coolify + PostgreSQL (customer VPS)

Production platform for **white-glove customer installs**: full IMEI/server orders, wallet, webhooks, backups, CMS uploads, and in-process schedulers.

> **Repo split:** [nexusserver](https://github.com/msruhan/nexusserver) = Vercel marketing demo. **This repo** (`nexus-server-live`) = customer VPS via Coolify.

## Ringkasan

| Komponen | Layanan |
|----------|---------|
| App (Next.js) | Coolify — Dockerfile in repo root |
| Database | PostgreSQL 16 (Coolify managed service on same VPS) |
| Uploads | Volume → `/app/public/uploads` |
| Backups | Volume → `/app/storage/backups` + `pg_dump` in container |
| License | NexusPortal production URL + shared `LICENSE_API_SIGNING_SECRET` |

## Prerequisites

- VPS Ubuntu 22.04+ (4 GB RAM recommended)
- [Coolify](https://coolify.io) installed on VPS (or customer VPS with SSH access for Hermes)
- Domain pointed to Coolify reverse proxy (HTTPS)
- NexusPortal production URL and license key for customer

## 1. Coolify — PostgreSQL

1. Add **PostgreSQL 16** service in Coolify.
2. Note internal hostname (e.g. `postgres-xxxxx`) and credentials.
3. Create database `nexus` if not auto-created.

## 2. Coolify — Application

1. **New Resource → Application → GitHub** → `msruhan/nexus-server-live` (branch `main`).
2. **Build pack:** Dockerfile (auto-detected from repo root).
3. **Port:** `3000`.
4. **Health check:** `GET /api/health` (expects JSON `{ "ok": true }`).
5. **Persistent volumes:**

   | Container path | Purpose |
   |----------------|---------|
   | `/app/public/uploads` | CMS media uploads |
   | `/app/storage/backups` | Admin DB backup `.sql.gz` files |

6. **Environment variables:** copy from [`.env.coolify.example`](../.env.coolify.example).

Required:

```bash
DATABASE_URL=postgresql://nexus:PASSWORD@INTERNAL_HOST:5432/nexus?schema=public
DIRECT_URL=postgresql://nexus:PASSWORD@INTERNAL_HOST:5432/nexus?schema=public
AUTH_SECRET=...
DATA_ENCRYPTION_KEY=...
CRON_SECRET=...
AUTH_URL=https://customer.domain.com
NEXTAUTH_URL=https://customer.domain.com
NEXT_PUBLIC_APP_URL=https://customer.domain.com
NEXUS_LICENSE_SERVER_URL=https://your-nexus-portal.vercel.app
LICENSE_API_SIGNING_SECRET=...   # same as NexusPortal
```

7. Deploy. First deploy may fail until DB schema exists — run setup (step 3).

## 3. Database schema + seed

**One-off** after first deploy (Coolify → Execute Command / SSH exec into app container):

```bash
npm run db:setup:production
```

Or from a machine with network access to Postgres:

```bash
cp .env.coolify.example .env.production
# edit DATABASE_URL / DIRECT_URL
npm run db:setup:production
```

Change admin password immediately after first login.

## 4. License activation

1. Customer receives license key from NexusPortal checkout.
2. Admin → **System** → enter key → activate against `NEXUS_LICENSE_SERVER_URL`.
3. Domain bound = `NEXT_PUBLIC_APP_URL` hostname.

See [LICENSE_PORTAL.md](./LICENSE_PORTAL.md).

## 5. Local smoke test (docker compose)

```bash
cp .env.coolify.example .env.production
# set POSTGRES_PASSWORD in shell or .env.production
docker compose -f docker-compose.production.yml up -d --build
docker compose -f docker-compose.production.yml exec app npm run db:setup:production
open http://localhost:3000
```

## 6. Vercel vs Coolify (this repo)

| Feature | Vercel (`nexusserver`) | Coolify (this repo) |
|---------|------------------------|---------------------|
| IMEI / server schedulers | Off or cron HTTP | In-process ✅ |
| Webhook dispatcher | Off | ✅ |
| DB backups admin | ❌ | ✅ |
| CMS uploads persist | ❌ | ✅ volume |
| One-click Portal updates | Limited | ✅ with disk |

## 7. Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Build fails Prisma | Dockerfile runs `prisma generate` before `next build` |
| `DATA_ENCRYPTION_KEY is required` | Set in Coolify env, redeploy |
| Health check failing | Wait 90s start period; check logs |
| `check-db` missing tables | Run `npm run db:setup:production` |
| License activate fails | Match `LICENSE_API_SIGNING_SECRET` with Portal; HTTPS URLs |
| Uploads lost on redeploy | Mount volume `/app/public/uploads` |

## 8. Hermes / NexusPortal automation

Provision scripts live in [`scripts/provision/`](../scripts/provision/README.md):

- `run-pipeline.sh` — clone repo, generate `.env.production` on VPS (D3), deploy via docker compose + Caddy HTTPS, run `db:setup:production`, health check
- Default `PROVISION_MODE=compose`; set `PROVISION_MODE=coolify` to run the Coolify installer first
- NexusPortal **Start install** → Hermes SSH → runs pipeline on customer VPS

See NexusPortal [design spec](https://github.com/msruhan/nexus-portal/blob/main/docs/superpowers/specs/2026-06-05-portal-hermes-install-design.md).
