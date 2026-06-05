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

export INSTALL_DIR="${INSTALL_DIR:-/opt/nexus-server-live}"
export REPO_URL="${REPO_URL:-https://github.com/msruhan/nexus-server-live.git}"
export REPO_BRANCH="${REPO_BRANCH:-main}"
export PROVISION_MODE="${PROVISION_MODE:-compose}"

# Directory containing provision scripts (scripts/provision)
PROVISION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
