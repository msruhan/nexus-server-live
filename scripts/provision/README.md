# NexusServer provision scripts (Hermes / white-glove)

Deterministic bash pipeline for customer VPS installs. Hermes job runner SSHs to the customer server, exports env vars from the Portal job payload, and runs `run-pipeline.sh`.

## Required environment

| Variable | Source |
|----------|--------|
| `CUSTOMER_DOMAIN` | Portal provisioning form |
| `PORTAL_URL` | Portal job API (`portalUrl`) |
| `LICENSE_API_SIGNING_SECRET` | Hermes runner env (same as NexusPortal) |
| `LICENSE_KEY` | Portal job API (optional; activate in admin UI) |

## Optional

| Variable | Default |
|----------|---------|
| `PROVISION_MODE` | `compose` — docker compose + Caddy HTTPS |
| | `coolify` — installs Coolify; API deploy requires `COOLIFY_API_TOKEN` |
| `INSTALL_DIR` | `/opt/nexus-server-live` |
| `REPO_URL` | `https://github.com/msruhan/nexus-server-live.git` |
| `REPO_BRANCH` | `main` |

Secrets (`AUTH_SECRET`, `DATA_ENCRYPTION_KEY`, `CRON_SECRET`, `POSTGRES_PASSWORD`) are **generated on the VPS** (design D3) and written to `.env.production`.

## Pipeline steps

| Step | Script |
|------|--------|
| 0 | `00-preflight.sh` — Ubuntu/RAM checks |
| 0b | `05-install-docker.sh` — Docker + Compose if missing |
| 1 | `10-install-coolify.sh` — only when `PROVISION_MODE=coolify` |
| 2 | `20-clone-and-env.sh` — clone repo + `.env.production` |
| 3 | `30-deploy-compose.sh` — postgres + app + Caddy (Let's Encrypt) |
| 4 | `40-db-setup.sh` — `npm run db:setup:production` |
| 5 | `50-healthcheck.sh` — `GET https://{domain}/api/health` |

## Prerequisites (customer VPS)

- Ubuntu 22.04+, 4 GB RAM recommended
- **DNS:** `CUSTOMER_DOMAIN` A record → VPS IP **before** health check
- Docker Engine + Compose plugin (installed by `05-install-docker.sh` if missing)

## Manual smoke test

```bash
export CUSTOMER_DOMAIN=shop.example.com
export PORTAL_URL=https://nexus-portal-pied.vercel.app
export LICENSE_API_SIGNING_SECRET=your-shared-secret
sudo -E bash scripts/provision/run-pipeline.sh
```

## Hermes runner contract

Runner should:

1. Fetch job from Portal `GET /api/hermes/jobs/{token}`
2. SSH to customer VPS with fetched credentials
3. Export env from JSON payload + `LICENSE_API_SIGNING_SECRET` from runner
4. Upload or `git clone` this repo's `scripts/provision` (or clone full repo in step 20)
5. Run `bash run-pipeline.sh`; capture stdout/stderr
6. On failure → `POST /api/hermes/callback` with `status: failed`

## Compose vs Coolify

- **`compose` (default):** Production stack via `docker-compose.production.yml` + `docker-compose.provision.yml` (Caddy on 80/443). Matches [DEPLOY-COOLIFY.md](../../docs/DEPLOY-COOLIFY.md) local smoke test pattern with automatic HTTPS.
- **`coolify`:** Runs official Coolify installer. Full Coolify API deploy needs per-instance `COOLIFY_API_TOKEN` and project/server UUIDs — configure on Hermes when ready; until then installer completes and compose fallback may apply.

See [Portal ↔ Hermes design](https://github.com/msruhan/nexus-portal/blob/main/docs/superpowers/specs/2026-06-05-portal-hermes-install-design.md) (NexusPortal repo).
