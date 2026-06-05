#!/usr/bin/env bash
# Shared helpers for NexusServer white-glove provision scripts.
set -euo pipefail

log() { printf '[provision] %s\n' "$*"; }
die() { log "ERROR: $*"; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

need_env() {
  local name="$1"
  [[ -n "${!name:-}" ]] || die "Environment variable $name is required"
}

gen_b64_32() {
  openssl rand -base64 32
}

gen_hex_32() {
  openssl rand -hex 32
}

normalize_domain() {
  local d="${1:-}"
  d="${d#https://}"
  d="${d#http://}"
  d="${d%%/*}"
  d="${d%%:*}"
  printf '%s' "$d"
}

registry_login() {
  if [[ -z "${REGISTRY_TOKEN:-}" || -z "${REGISTRY_USERNAME:-}" ]]; then
    return 0
  fi
  local host="${REGISTRY_HOST:-ghcr.io}"
  need_cmd docker
  log "Logging in to container registry ($host)..."
  echo "$REGISTRY_TOKEN" | docker login "$host" -u "$REGISTRY_USERNAME" --password-stdin
}

export INSTALL_DIR="${INSTALL_DIR:-/opt/nexus-server}"
export NEXUS_IMAGE="${NEXUS_IMAGE:-ghcr.io/msruhan/nexus-server:latest}"
export PROVISION_MODE="${PROVISION_MODE:-compose}"

# Directory containing provision scripts (scripts/provision)
PROVISION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
