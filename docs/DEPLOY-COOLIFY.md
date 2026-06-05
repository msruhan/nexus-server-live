# Deploy NexusServer — Coolify + PostgreSQL (customer VPS)

Production platform for **white-glove customer installs**: full IMEI/server orders, wallet, webhooks, backups, CMS uploads, and in-process schedulers.

> **Repo split:** [nexusserver](https://github.com/msruhan/nexusserver) = Vercel marketing demo. **This repo** (`nexus-server-live`) = customer VPS via pre-built Docker image.

> **Security:** Customers deploy from **vendor container registry** (GHCR) — no Git clone of this repo on their VPS. Source stays on vendor CI only.

## Ringkasan

| Komponen | Layanan |
|----------|---------|
| App (Next.js) | Pre-built image `ghcr.io/msruhan/nexus-server` |
| Database | PostgreSQL 16 (Coolify service or compose stack) |
| Uploads | Volume → `/app/public/uploads` |
| Backups | Volume → `/app/storage/backups` + `pg_dump` in container |
| License | NexusPortal production URL + shared `LICENSE_API_SIGNING_SECRET` |

## Prerequisites

- VPS Ubuntu 22.04+ (4 GB RAM recommended)
- [Coolify](https://coolify.io) on VPS (optional — Hermes can use compose+Caddy instead)
- Domain pointed to VPS (HTTPS)
- NexusPortal production URL and license key for customer
- Vendor publishes image: see [`.github/workflows/docker-publish.yml`](../.github/workflows/docker-publish.yml)

## 1. Vendor — build & push image

On release tag `v*` (or manual workflow dispatch):

```bash
git tag v1.0.0 && git push origin v1.0.0
```

Image: `ghcr.io/msruhan/nexus-server:latest` and `ghcr.io/msruhan/nexus-server:1.0.0`

For **private** GHCR: grant customer VPS read-only `REGISTRY_TOKEN` on Hermes runner (never commit tokens).

## 2. Coolify — PostgreSQL

1. Add **PostgreSQL 16** service in Coolify.
2. Note internal hostname (e.g. `postgres-xxxxx`) and credentials.
3. Create database `nexus` if not auto-created.

## 3. Coolify — Application (Docker image, no Git)

1. **New Resource → Application → Docker Image** (not GitHub).
2. **Image:** `ghcr.io/msruhan/nexus-server:latest` (+ registry credentials if private).
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

7. Deploy. First deploy may fail until DB schema exists — run setup (step 4).

### Hermes automated Coolify deploy

Set on Hermes runner:

```bash
PROVISION_MODE=coolify
COOLIFY_API_TOKEN=...
COOLIFY_PROJECT_UUID=...
COOLIFY_SERVER_UUID=...
NEXUS_IMAGE=ghcr.io/msruhan/nexus-server:latest
```

Pipeline calls `POST /api/v1/applications/dockerimage` — see [`scripts/provision/30-deploy-coolify.sh`](../scripts/provision/30-deploy-coolify.sh).

## 4. Database schema + seed

**One-off** after first deploy (Coolify → Execute Command / SSH exec into app container):

```bash
npm run db:setup:production
```

Change admin password immediately after first login.

## 5. License activation

1. Customer receives license key from NexusPortal checkout.
2. Admin → **System** → enter key → activate against `NEXUS_LICENSE_SERVER_URL`.
3. Domain bound = `NEXT_PUBLIC_APP_URL` hostname.

See [LICENSE_PORTAL.md](./LICENSE_PORTAL.md).

## 6. Local smoke test (vendor machine — builds image locally)

```bash
cp .env.coolify.example .env.production
docker build -t nexus-server:local .
export NEXUS_IMAGE=nexus-server:local
export POSTGRES_PASSWORD=devpass
docker compose -f docker-compose.production.yml up -d --build   # dev only
docker compose -f docker-compose.production.yml exec app npm run db:setup:production
open http://localhost:3000
```

Customer VPS uses **image pull only** — see [`scripts/provision/`](../scripts/provision/README.md).

## 7. Vercel vs Coolify (this repo)

| Feature | Vercel (`nexusserver`) | Coolify (this repo) |
|---------|------------------------|---------------------|
| IMEI / server schedulers | Off or cron HTTP | In-process ✅ |
| Webhook dispatcher | Off | ✅ |
| DB backups admin | ❌ | ✅ |
| CMS uploads persist | ❌ | ✅ volume |
| One-click Portal updates | Limited | ✅ with disk |

## 8. Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `pull access denied` | Set `REGISTRY_USERNAME` + `REGISTRY_TOKEN` on Hermes; `docker login ghcr.io` on VPS |
| `DATA_ENCRYPTION_KEY is required` | Set in Coolify env, redeploy |
| Health check failing | Wait 90s start period; check logs |
| `check-db` missing tables | Run `npm run db:setup:production` |
| License activate fails | Match `LICENSE_API_SIGNING_SECRET` with Portal; HTTPS URLs |
| Uploads lost on redeploy | Mount volume `/app/public/uploads` |

## 9. Hermes / NexusPortal automation

- Hermes SCPs [`scripts/provision/`](../scripts/provision/) to customer VPS (no app repo)
- Pulls `NEXUS_IMAGE` from vendor registry
- NexusPortal **Start install** → Hermes SSH → `run-pipeline.sh`

See NexusPortal [design spec](https://github.com/msruhan/nexus-portal/blob/main/docs/superpowers/specs/2026-06-05-portal-hermes-install-design.md).
