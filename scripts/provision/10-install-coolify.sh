#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "$0")/lib/common.sh"

log "10-install-coolify (mode=$PROVISION_MODE)"

if [[ "$PROVISION_MODE" != "coolify" ]]; then
  log "Skipping Coolify install (PROVISION_MODE=$PROVISION_MODE). Use PROVISION_MODE=coolify to install."
  exit 0
fi

if docker ps --format '{{.Names}}' 2>/dev/null | grep -qi coolify; then
  log "Coolify container already running — skip install"
  exit 0
fi

if [[ -d /data/coolify ]] && [[ -f /data/coolify/source/.env ]]; then
  log "Coolify data directory exists — skip install"
  exit 0
fi

need_cmd curl
log "Running official Coolify installer (may take several minutes)..."
export AUTOUPDATE="${COOLIFY_AUTOUPDATE:-false}"
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

log "Coolify install finished. Configure COOLIFY_API_TOKEN on Hermes for API deploy steps."
