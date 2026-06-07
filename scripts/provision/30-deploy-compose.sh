#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "$0")/lib/common.sh"

log "30-deploy-compose (mode=$PROVISION_MODE)"

need_cmd docker
need_env CUSTOMER_DOMAIN
need_env NEXUS_IMAGE
[[ -f "$INSTALL_DIR/.env.production" ]] || die "Missing $INSTALL_DIR/.env.production — run 20-setup-env.sh first"

export CUSTOMER_DOMAIN="$(normalize_domain "$CUSTOMER_DOMAIN")"
cd "$INSTALL_DIR"

if [[ "$PROVISION_MODE" == "coolify" ]]; then
  if [[ -n "${COOLIFY_API_TOKEN:-}" && -n "${COOLIFY_PROJECT_UUID:-}" && -n "${COOLIFY_SERVER_UUID:-}" ]]; then
    bash "$(dirname "$0")/30-deploy-coolify.sh"
    exit 0
  fi
  log "WARN: Coolify API UUIDs not set — falling back to compose+image on this VPS"
fi

mkdir -p deploy
printf '%s {\n  reverse_proxy app:3000\n}\n' "$CUSTOMER_DOMAIN" >deploy/Caddyfile

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif docker-compose version >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  die "docker compose plugin not found"
fi

load_postgres_password

registry_login
log "Pulling $NEXUS_IMAGE ..."
docker pull "$NEXUS_IMAGE"

log "Starting stack (postgres + app + caddy) from pre-built image..."
"${COMPOSE[@]}" -f docker-compose.stack.yml -f docker-compose.caddy.yml --env-file .env.production up -d

# App may crash-loop until step 40 runs db:setup:production — only wait for Postgres here.
wait_for_postgres -f docker-compose.stack.yml -f docker-compose.caddy.yml

log "Deploy compose OK (db schema applied in step 40)"
