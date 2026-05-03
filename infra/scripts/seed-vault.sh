#!/bin/bash
# =============================================================================
# Seed Vault with Demo Secrets
# =============================================================================
# Run this after infrastructure is deployed to configure Vault
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load generated environment
if [ -f "$SCRIPT_DIR/../terraform/.env.generated" ]; then
    source "$SCRIPT_DIR/../terraform/.env.generated"
else
    echo "Error: .env.generated not found. Run deploy.sh first."
    exit 1
fi

echo "Configuring Vault..."

# Use Fly.io proxy to access Vault
echo "Opening proxy to Vault..."
fly proxy 8200:8200 -a portfolio-vault &
PROXY_PID=$!
sleep 3

export VAULT_ADDR="http://localhost:8200"
export VAULT_TOKEN="$VAULT_TOKEN"

# Enable database secrets engine
echo "Enabling database secrets engine..."
vault secrets enable -path=database database || true

# Configure database connection
echo "Configuring database connection..."
vault write database/config/neon \
    plugin_name=postgresql-database-plugin \
    allowed_roles="app-role" \
    connection_url="postgresql://{{username}}:{{password}}@$DATABASE_URL" \
    username="portfolio_app" \
    password="temp-password-will-rotate"

# Create role with short TTL for demo
echo "Creating database role..."
vault write database/roles/app-role \
    db_name=neon \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\"; \
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="2m" \
    max_ttl="5m"

# Enable KV secrets engine for static secrets
echo "Enabling KV secrets engine..."
vault secrets enable -path=secret -version=2 kv || true

# Store demo secrets
echo "Storing demo secrets..."
vault kv put secret/stripe \
    api_key="sk_test_demo_key_for_portfolio" \
    webhook_secret="whsec_demo_webhook_secret"

vault kv put secret/paypal \
    client_id="demo-client-id" \
    client_secret="demo-client-secret"

vault kv put secret/jwt \
    secret="demo-jwt-secret-for-portfolio-showcase-minimum-32-chars" \
    issuer="https://api.$DOMAIN" \
    audience="https://$DOMAIN"

# Cleanup proxy
kill $PROXY_PID 2>/dev/null || true

echo ""
echo "=========================================="
echo "Vault configured successfully!"
echo "=========================================="
echo ""
echo "Dynamic credentials available at: database/creds/app-role"
echo "TTL: 2 minutes (rotates automatically)"
echo ""
