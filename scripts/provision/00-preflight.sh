#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=lib/common.sh
source "$(dirname "$0")/lib/common.sh"

log "00-preflight"

need_cmd uname
need_cmd free
need_cmd openssl

need_env CUSTOMER_DOMAIN
need_env NEXUS_IMAGE
export CUSTOMER_DOMAIN="$(normalize_domain "$CUSTOMER_DOMAIN")"
[[ -n "$CUSTOMER_DOMAIN" ]] || die "CUSTOMER_DOMAIN is invalid"

if [[ -n "${PORTAL_URL:-}" && -n "${LICENSE_API_SIGNING_SECRET:-}" ]]; then
  log "Portal env present"
else
  log "WARN: PORTAL_URL or LICENSE_API_SIGNING_SECRET unset — 20-setup-env will fail"
fi

if [[ -r /etc/os-release ]]; then
  # shellcheck disable=SC1091
  source /etc/os-release
  [[ "${ID:-}" == "ubuntu" ]] || log "WARN: expected Ubuntu; found ${ID:-unknown}"
  [[ "${VERSION_ID:-0}" =~ ^2[2-9] ]] || log "WARN: Ubuntu 22.04+ recommended"
else
  log "WARN: /etc/os-release not found"
fi

mem_mb="$(free -m | awk '/^Mem:/{print $2}')"
if [[ "${mem_mb:-0}" -lt 3500 ]]; then
  log "WARN: RAM ${mem_mb}MB — 4GB+ recommended"
fi

log "Preflight OK — domain=$CUSTOMER_DOMAIN mode=$PROVISION_MODE"
log_image_tag "$NEXUS_IMAGE"
