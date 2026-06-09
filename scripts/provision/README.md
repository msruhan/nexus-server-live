# NexusServer provision scripts (Hermes / white-glove)

Deterministic bash pipeline for customer VPS installs. Hermes job runner SCPs these scripts to the customer server (no app source), exports env vars from the Portal job payload, and runs `run-pipeline.sh`.

## Distribution model

**Customer VPS receives a pre-built Docker image only** — no Git clone of `nexus-server-live`. Vendor CI builds and pushes to GHCR (or private registry); Hermes passes `NEXUS_IMAGE` and optional registry credentials.

## Required environment

| Variable | Source |
|----------|--------|
| `CUSTOMER_DOMAIN` | Portal provisioning form |
| `PORTAL_URL` | Portal job API (`portalUrl`) |
| `LICENSE_API_SIGNING_SECRET` | Hermes runner env (same as NexusPortal) |
| `NEXUS_IMAGE` | Hermes runner / Portal (`nexusImage`), e.g. `ghcr.io/msruhan/nexus-server:latest` |

## Optional

| Variable | Default |
|----------|---------|
| `PROVISION_MODE` | `compose` — docker compose + Caddy HTTPS |
| | `coolify` — Coolify installer + API deploy when UUIDs set |
| `INSTALL_DIR` | `/opt/nexus-server` |
| `REGISTRY_USERNAME` / `REGISTRY_TOKEN` | For private GHCR pulls on customer VPS |
| `REGISTRY_HOST` | `ghcr.io` |
| `NEXUS_MASK_REGISTRY` | `true` — pull vendor image, retag to `nexus-server:tag` on VPS (hides `ghcr.io` in `docker ps` / `.env`) |
| `NEXUS_LOCAL_IMAGE_NAME` | `nexus-server` — local tag name when masking is enabled |
| `COOLIFY_API_TOKEN` | Coolify UI → Keys & Tokens |
| `COOLIFY_PROJECT_UUID` / `COOLIFY_SERVER_UUID` | Required for Coolify API deploy |
| `COOLIFY_ENVIRONMENT_NAME` | `production` |
| `COOLIFY_API_URL` | `http://127.0.0.1:8000/api/v1` |

Secrets (`AUTH_SECRET`, `DATA_ENCRYPTION_KEY`, `CRON_SECRET`, `POSTGRES_PASSWORD`) are **generated on the VPS** (design D3) and written to `.env.production`.

## Pipeline steps

| Step | Script |
|------|--------|
| 0 | `00-preflight.sh` — Ubuntu/RAM/image checks |
| 0b | `05-install-docker.sh` — Docker + Compose if missing |
| 1 | `10-install-coolify.sh` — only when `PROVISION_MODE=coolify` |
| 2 | `20-setup-env.sh` — compose templates + `.env.production` (no git) |
| 3 | `30-deploy-compose.sh` — pull image, postgres + app + Caddy; wait for Postgres only |
| 3b | `30-deploy-coolify.sh` — when Coolify API UUIDs configured |
| 4 | `40-db-setup.sh` — one-off `docker compose run` for `db:setup:production`, then start app and wait for `/api/health` |
| 5 | `50-healthcheck.sh` — `GET https://{domain}/api/health` |

Step 30 does **not** wait for app health — the image runs `check-db` before `next start`, so tables must exist first (step 40). Retries reuse secrets from an existing `.env.production` when present.

## Manual smoke test

```bash
export CUSTOMER_DOMAIN=shop.example.com
export PORTAL_URL=https://nexus-portal-pied.vercel.app
export LICENSE_API_SIGNING_SECRET=your-shared-secret
export NEXUS_IMAGE=ghcr.io/msruhan/nexus-server:latest
sudo -E bash scripts/provision/run-pipeline.sh
```

## Hermes runner contract

1. Fetch job from Portal `GET /api/hermes/jobs/{token}`
2. SCP this `scripts/provision/` directory to customer VPS (bundled in `hermes-job-runner/provision/`)
3. SSH with env: `NEXUS_IMAGE`, registry creds, domain, portal URL
4. Run `bash run-pipeline.sh`
5. On failure → `POST /api/hermes/callback` with `status: failed`

## Compose vs Coolify

- **`compose` (default):** Pull vendor image + `docker-compose.stack.yml` + Caddy (Let's Encrypt). No Coolify UI required.
- **`coolify`:** Installs Coolify, then uses Coolify API (`POST /applications/dockerimage`) when `COOLIFY_*` UUIDs are set; otherwise compose+image fallback.

See [DEPLOY-COOLIFY.md](../../docs/DEPLOY-COOLIFY.md) and NexusPortal [design spec](https://github.com/msruhan/nexus-portal/blob/main/docs/superpowers/specs/2026-06-05-portal-hermes-install-design.md).
