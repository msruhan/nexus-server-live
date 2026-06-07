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

exec_args=(-T)
if [[ -n "${SEED_ADMIN_EMAIL:-}" ]]; then
  exec_args+=(-e "SEED_ADMIN_EMAIL=${SEED_ADMIN_EMAIL}")
fi
if [[ -n "${SEED_ADMIN_PASSWORD:-}" ]]; then
  exec_args+=(-e "SEED_ADMIN_PASSWORD=${SEED_ADMIN_PASSWORD}")
fi

log "Running npm run db:setup:production inside app container..."
"${COMPOSE[@]}" "${local_files[@]}" --env-file .env.production \
  exec "${exec_args[@]}" app npm run db:setup:production

log "Restarting app after schema + seed..."
"${COMPOSE[@]}" "${local_files[@]}" --env-file .env.production restart app

wait_for_app_health "${local_files[@]}"

log "Database schema + seed complete"
