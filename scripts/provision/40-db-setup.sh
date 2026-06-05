#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "$0")/lib/common.sh"

log "40-db-setup"

cd "$INSTALL_DIR"

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
else
  COMPOSE=(docker-compose)
fi

log "Running npm run db:setup:production inside app container..."
"${COMPOSE[@]}" -f docker-compose.production.yml -f docker-compose.provision.yml exec -T app npm run db:setup:production

log "Database schema + seed complete"
