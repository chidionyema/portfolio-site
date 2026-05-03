#!/bin/bash
# =============================================================================
# Portfolio Infrastructure Setup Script
# =============================================================================
# Prerequisites:
# - Terraform >= 1.5.0
# - fly CLI (https://fly.io/docs/hands-on/install-flyctl/)
# - jq
# - curl
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/../terraform"

echo "=========================================="
echo "Portfolio Infrastructure Setup"
echo "=========================================="

# Check prerequisites
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo "Error: $1 is required but not installed."
        exit 1
    fi
}

echo "Checking prerequisites..."
check_command terraform
check_command fly
check_command jq
check_command curl

# Check Terraform version
TF_VERSION=$(terraform version -json | jq -r '.terraform_version')
echo "Terraform version: $TF_VERSION"

# Check Fly CLI authentication
echo "Checking Fly.io authentication..."
if ! fly auth whoami &> /dev/null; then
    echo "Please authenticate with Fly.io:"
    fly auth login
fi

# Check for terraform.tfvars
if [ ! -f "$TERRAFORM_DIR/terraform.tfvars" ]; then
    echo ""
    echo "Error: terraform.tfvars not found!"
    echo ""
    echo "Please copy terraform.tfvars.example to terraform.tfvars and fill in your values:"
    echo "  cp $TERRAFORM_DIR/terraform.tfvars.example $TERRAFORM_DIR/terraform.tfvars"
    echo ""
    echo "Required accounts (all free tier):"
    echo "  - Neon: https://console.neon.tech"
    echo "  - Upstash: https://console.upstash.com"
    echo "  - CloudAMQP: https://customer.cloudamqp.com"
    echo "  - Fly.io: https://fly.io (run: fly auth login)"
    echo "  - Cloudflare: https://dash.cloudflare.com"
    echo ""
    exit 1
fi

# Initialize Terraform
echo ""
echo "Initializing Terraform..."
cd "$TERRAFORM_DIR"
terraform init

# Validate configuration
echo ""
echo "Validating Terraform configuration..."
terraform validate

echo ""
echo "=========================================="
echo "Setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Review the plan: ./scripts/deploy.sh plan"
echo "  2. Deploy: ./scripts/deploy.sh apply"
echo ""
