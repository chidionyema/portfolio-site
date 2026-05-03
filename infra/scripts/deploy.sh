#!/bin/bash
# =============================================================================
# Portfolio Infrastructure Deployment Script
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/../terraform"

ACTION="${1:-plan}"

cd "$TERRAFORM_DIR"

case "$ACTION" in
    plan)
        echo "Planning infrastructure changes..."
        terraform plan -out=tfplan
        echo ""
        echo "Review the plan above. To apply, run:"
        echo "  ./scripts/deploy.sh apply"
        ;;

    apply)
        if [ -f "tfplan" ]; then
            echo "Applying saved plan..."
            terraform apply tfplan
            rm tfplan
        else
            echo "Applying infrastructure changes..."
            terraform apply -auto-approve
        fi

        echo ""
        echo "=========================================="
        echo "Infrastructure deployed!"
        echo "=========================================="

        # Show outputs
        echo ""
        echo "Connection strings saved to: terraform/.env.generated"
        echo ""
        terraform output -raw next_steps
        ;;

    output)
        terraform output
        ;;

    destroy)
        echo "WARNING: This will destroy all infrastructure!"
        read -p "Type 'destroy' to confirm: " CONFIRM
        if [ "$CONFIRM" = "destroy" ]; then
            terraform destroy -auto-approve
            echo "Infrastructure destroyed."
        else
            echo "Cancelled."
        fi
        ;;

    *)
        echo "Usage: $0 {plan|apply|output|destroy}"
        exit 1
        ;;
esac
