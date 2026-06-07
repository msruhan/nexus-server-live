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

env_value_from_file() {
  local file="$1"
  local key="$2"
  [[ -f "$file" ]] || return 1
  grep -m1 "^${key}=" "$file" 2>/dev/null | cut -d= -f2- || return 1
}

load_postgres_password() {
  local env_file="${1:-$INSTALL_DIR/.env.production}"
  if [[ -n "${POSTGRES_PASSWORD:-}" ]]; then
    return 0
  fi
  if [[ -f "$env_file" ]]; then
    POSTGRES_PASSWORD="$(grep '^DATABASE_URL=' "$env_file" | sed -n 's/.*nexus:\([^@]*\)@.*/\1/p')"
    export POSTGRES_PASSWORD
  fi
}

compose_stack_files() {
  local -n out=$1
  out=(-f docker-compose.stack.yml)
  if [[ -f docker-compose.caddy.yml ]]; then
    out+=(-f docker-compose.caddy.yml)
  fi
}

init_compose() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
  elif docker-compose version >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
  else
    die "docker compose plugin not found"
  fi
}

wait_for_postgres() {
  local -a compose_files=("$@")
  init_compose
  local timeout="${WAIT_POSTGRES_TIMEOUT:-120}"
  log "Waiting for postgres (up to ${timeout}s)..."
  local deadline=$((SECONDS + timeout))
  until "${COMPOSE[@]}" "${compose_files[@]}" --env-file .env.production exec -T postgres \
    pg_isready -U nexus -d nexus >/dev/null 2>&1; do
    if (( SECONDS > deadline )); then
      "${COMPOSE[@]}" "${compose_files[@]}" --env-file .env.production logs --tail=40 postgres || true
      die "Postgres did not become ready in time"
    fi
    sleep 3
  done
  log "Postgres ready"
}

wait_for_app_health() {
  local -a compose_files=("$@")
  init_compose
  local timeout="${WAIT_APP_TIMEOUT:-180}"
  log "Waiting for app health (up to ${timeout}s)..."
  local deadline=$((SECONDS + timeout))
  until "${COMPOSE[@]}" "${compose_files[@]}" --env-file .env.production exec -T app \
    node -e "fetch('http://127.0.0.1:3000/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; do
    if (( SECONDS > deadline )); then
      "${COMPOSE[@]}" "${compose_files[@]}" --env-file .env.production logs --tail=80 app || true
      die "App did not respond to /api/health in time"
    fi
    sleep 5
  done
  log "App health OK"
}

export INSTALL_DIR="${INSTALL_DIR:-/opt/nexus-server}"
export NEXUS_IMAGE="${NEXUS_IMAGE:-ghcr.io/msruhan/nexus-server:latest}"
export PROVISION_MODE="${PROVISION_MODE:-compose}"

# Directory containing provision scripts (scripts/provision)
PROVISION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
