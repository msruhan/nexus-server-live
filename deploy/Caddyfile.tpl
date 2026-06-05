# Rendered by scripts/provision/30-deploy-compose.sh
# Domain must point to this VPS before health check passes.

{$CUSTOMER_DOMAIN} {
  reverse_proxy app:3000
}
