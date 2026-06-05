#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "$0")/lib/common.sh"

log "05-install-docker"

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  log "Docker + Compose already installed"
  exit 0
fi

need_cmd curl
log "Installing Docker via get.docker.com..."
curl -fsSL https://get.docker.com | sh

if ! docker compose version >/dev/null 2>&1; then
  die "Docker installed but compose plugin missing — install docker-compose-plugin"
fi

log "Docker ready: $(docker --version)"
