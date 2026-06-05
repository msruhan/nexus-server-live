#!/usr/bin/env bash
# NexusServer white-glove install pipeline (Hermes / manual SSH).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/common.sh
source "$ROOT/lib/common.sh"

steps=(
  00-preflight.sh
  05-install-docker.sh
  10-install-coolify.sh
  20-clone-and-env.sh
  30-deploy-compose.sh
  40-db-setup.sh
  50-healthcheck.sh
)

for step in "${steps[@]}"; do
  bash "$ROOT/$step"
done

log "Pipeline complete — admin should verify in NexusPortal and Mark live"
