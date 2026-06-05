#!/usr/bin/env bash
set -euo pipefail
# Deploy NexusServer via Coolify API (Docker image — no git on customer VPS).
# shellcheck source=lib/common.sh
source "$(dirname "$0")/lib/common.sh"

log "30-deploy-coolify"

need_env NEXUS_IMAGE
need_env CUSTOMER_DOMAIN
need_env COOLIFY_API_TOKEN
need_env COOLIFY_PROJECT_UUID
need_env COOLIFY_SERVER_UUID

export CUSTOMER_DOMAIN="$(normalize_domain "$CUSTOMER_DOMAIN")"
APP_URL="https://${CUSTOMER_DOMAIN}"

COOLIFY_API_URL="${COOLIFY_API_URL:-http://127.0.0.1:8000/api/v1}"
COOLIFY_ENV="${COOLIFY_ENVIRONMENT_NAME:-production}"
APP_NAME="${COOLIFY_APP_NAME:-nexus-${CUSTOMER_DOMAIN//./-}}"

need_cmd curl
need_cmd jq

auth_header="Authorization: Bearer ${COOLIFY_API_TOKEN}"
json_ct="Content-Type: application/json"

# Parse image name:tag
image_repo="${NEXUS_IMAGE%%:*}"
image_tag="${NEXUS_IMAGE#*:}"
if [[ "$image_repo" == "$image_tag" ]]; then
  image_tag="latest"
fi

log "Creating Coolify application from image $image_repo:$image_tag"

create_payload="$(jq -n \
  --arg project_uuid "$COOLIFY_PROJECT_UUID" \
  --arg server_uuid "$COOLIFY_SERVER_UUID" \
  --arg environment_name "$COOLIFY_ENV" \
  --arg image_name "$image_repo" \
  --arg image_tag "$image_tag" \
  --arg ports "3000" \
  --arg name "$APP_NAME" \
  --arg domains "$APP_URL" \
  '{
    project_uuid: $project_uuid,
    server_uuid: $server_uuid,
    environment_name: $environment_name,
    docker_registry_image_name: $image_name,
    docker_registry_image_tag: $image_tag,
    ports_exposes: $ports,
    name: $name,
    domains: $domains,
    instant_deploy: true,
    https_enabled: true
  }')"

resp="$(curl -fsS -X POST "${COOLIFY_API_URL}/applications/dockerimage" \
  -H "$auth_header" -H "$json_ct" \
  -d "$create_payload")"

app_uuid="$(echo "$resp" | jq -r '.uuid // empty')"
if [[ -z "$app_uuid" ]]; then
  app_uuid="$(echo "$resp" | jq -r '.id // empty')"
fi
[[ -n "$app_uuid" ]] || die "Coolify create app failed: $resp"

log "Coolify app uuid=$app_uuid — syncing env from $INSTALL_DIR/.env.production"

while IFS= read -r line || [[ -n "$line" ]]; do
  [[ "$line" =~ ^[A-Z_][A-Z0-9_]*= ]] || continue
  key="${line%%=*}"
  val="${line#*=}"
  env_payload="$(jq -n --arg key "$key" --arg val "$val" '{key: $key, value: $val, is_preview: false}')"
  curl -fsS -X POST "${COOLIFY_API_URL}/applications/${app_uuid}/envs" \
    -H "$auth_header" -H "$json_ct" \
    -d "$env_payload" >/dev/null || log "WARN: failed to set env $key"
done <"$INSTALL_DIR/.env.production"

curl -fsS -X GET "${COOLIFY_API_URL}/deploy?uuid=${app_uuid}" \
  -H "$auth_header" >/dev/null || log "WARN: deploy trigger returned non-zero (app may still start)"

log "Coolify deploy triggered — verify $APP_URL/api/health after DNS propagates"
