#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "$0")/lib/common.sh"

log "50-healthcheck"

need_env CUSTOMER_DOMAIN
export CUSTOMER_DOMAIN="$(normalize_domain "$CUSTOMER_DOMAIN")"
URL="https://${CUSTOMER_DOMAIN}/api/health"

need_cmd curl
log "Checking $URL (DNS must point to this VPS)"

deadline=$((SECONDS + 300))
last_err=""

while (( SECONDS < deadline )); do
  if resp="$(curl -fsS "$URL" 2>&1)"; then
    if echo "$resp" | grep -q '"ok"[[:space:]]*:[[:space:]]*true'; then
      log "Health check OK: $resp"
      exit 0
    fi
    last_err="unexpected body: $resp"
  else
    last_err="$resp"
  fi
  log "Waiting for HTTPS health (retry in 10s)..."
  sleep 10
done

die "Health check failed after 300s — ${last_err:-unknown error}. Verify DNS for $CUSTOMER_DOMAIN points to this server."
