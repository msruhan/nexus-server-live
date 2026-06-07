#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "$0")/lib/common.sh"

log "40-db-setup"

cd "$INSTALL_DIR"
[[ -f .env.production ]] || die "Missing .env.production — run 20-setup-env.sh first"

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
else
  COMPOSE=(docker-compose)
fi

load_postgres_password

local_files=()
compose_stack_files local_files

wait_for_postgres "${local_files[@]}"

# App crash-loops until schema exists — exec fails while container is Restarting.
log "Stopping app service (if running) before one-off db setup..."
"${COMPOSE[@]}" "${local_files[@]}" --env-file .env.production stop app 2>/dev/null || true

run_args=(run --rm --no-deps -T)
if [[ -n "${SEED_ADMIN_EMAIL:-}" ]]; then
  run_args+=(-e "SEED_ADMIN_EMAIL=${SEED_ADMIN_EMAIL}")
fi
if [[ -n "${SEED_ADMIN_PASSWORD:-}" ]]; then
  run_args+=(-e "SEED_ADMIN_PASSWORD=${SEED_ADMIN_PASSWORD}")
fi

log "Running npm run db:setup:production in one-off app container..."
"${COMPOSE[@]}" "${local_files[@]}" --env-file .env.production \
  "${run_args[@]}" app npm run db:setup:production

log "Starting app after schema + seed..."
"${COMPOSE[@]}" "${local_files[@]}" --env-file .env.production up -d app

wait_for_app_health "${local_files[@]}"

log "Database schema + seed complete"
