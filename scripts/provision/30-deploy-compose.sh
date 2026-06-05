#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "$0")/lib/common.sh"

log "30-deploy-compose (mode=$PROVISION_MODE)"

need_cmd docker
need_env CUSTOMER_DOMAIN
[[ -f "$INSTALL_DIR/.env.production" ]] || die "Missing $INSTALL_DIR/.env.production — run 20-clone-and-env.sh first"

export CUSTOMER_DOMAIN="$(normalize_domain "$CUSTOMER_DOMAIN")"
cd "$INSTALL_DIR"

if [[ "$PROVISION_MODE" == "coolify" ]]; then
  if [[ -z "${COOLIFY_API_TOKEN:-}" ]]; then
    die "PROVISION_MODE=coolify requires COOLIFY_API_TOKEN on Hermes runner (create in Coolify UI → Keys & Tokens)"
  fi
  # Coolify API deploy is environment-specific (project/server UUID). Use compose fallback until configured.
  log "WARN: Coolify API deploy not fully automated in v1 — falling back to compose stack on this VPS"
fi

# Render Caddyfile (domain must match DNS)
mkdir -p deploy
printf '%s {\n  reverse_proxy app:3000\n}\n' "$CUSTOMER_DOMAIN" >deploy/Caddyfile

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif docker-compose version >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  die "docker compose plugin not found"
fi

export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"
if [[ -z "$POSTGRES_PASSWORD" ]]; then
  POSTGRES_PASSWORD="$(grep '^DATABASE_URL=' .env.production | sed -n 's/.*nexus:\([^@]*\)@.*/\1/p')"
  export POSTGRES_PASSWORD
fi

log "Building and starting stack (postgres + app + caddy)..."
"${COMPOSE[@]}" -f docker-compose.production.yml -f docker-compose.provision.yml --env-file .env.production up -d --build

log "Waiting for app health (up to 180s)..."
deadline=$((SECONDS + 180))
until "${COMPOSE[@]}" -f docker-compose.production.yml -f docker-compose.provision.yml exec -T app \
  node -e "fetch('http://127.0.0.1:3000/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; do
  if (( SECONDS > deadline )); then
    "${COMPOSE[@]}" -f docker-compose.production.yml -f docker-compose.provision.yml logs --tail=80 app || true
    die "App did not respond to /api/health in time"
  fi
  sleep 5
done

log "Deploy compose OK"
