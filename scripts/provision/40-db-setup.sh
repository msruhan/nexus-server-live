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

COMPOSE_FILES=(-f docker-compose.stack.yml)
if [[ -f docker-compose.caddy.yml ]]; then
  COMPOSE_FILES+=(-f docker-compose.caddy.yml)
fi

log "Running npm run db:setup:production inside app container..."
"${COMPOSE[@]}" "${COMPOSE_FILES[@]}" exec -T app npm run db:setup:production

log "Database schema + seed complete"
