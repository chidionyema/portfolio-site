#!/bin/bash
# =============================================================================
# Destroy Portfolio Infrastructure
# =============================================================================
# WARNING: This will delete all resources and data!
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/../terraform"

echo "=========================================="
echo "WARNING: DESTRUCTIVE OPERATION"
echo "=========================================="
echo ""
echo "This will permanently delete:"
echo "  - Neon PostgreSQL database"
echo "  - Upstash Redis database"
echo "  - CloudAMQP RabbitMQ instance"
echo "  - Fly.io applications (API + Vault)"
echo "  - Cloudflare DNS records"
echo ""
echo "All data will be PERMANENTLY LOST!"
echo ""

read -p "Type 'destroy-portfolio-infrastructure' to confirm: " CONFIRM

if [ "$CONFIRM" != "destroy-portfolio-infrastructure" ]; then
    echo "Cancelled."
    exit 0
fi

cd "$TERRAFORM_DIR"

echo ""
echo "Destroying infrastructure..."
terraform destroy -auto-approve

# Clean up generated files
rm -f .env.generated
rm -f tfplan

echo ""
echo "=========================================="
echo "Infrastructure destroyed."
echo "=========================================="
