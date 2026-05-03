# =============================================================================
# Infrastructure Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# URLs & Endpoints
# -----------------------------------------------------------------------------
output "api_url" {
  description = "Portfolio API URL"
  value       = "https://api.${var.domain_name}"
}

output "site_url" {
  description = "Portfolio website URL"
  value       = "https://${var.domain_name}"
}

output "vault_internal_url" {
  description = "Vault internal URL (only accessible from Fly.io network)"
  value       = "http://portfolio-vault.internal:8200"
}

# -----------------------------------------------------------------------------
# Connection Strings (Sensitive)
# -----------------------------------------------------------------------------
output "database_connection_string" {
  description = "Neon PostgreSQL connection string"
  value       = module.neon.connection_string
  sensitive   = true
}

output "redis_connection_string" {
  description = "Upstash Redis connection string"
  value       = module.upstash.connection_string
  sensitive   = true
}

output "rabbitmq_connection_string" {
  description = "CloudAMQP RabbitMQ connection string"
  value       = module.cloudamqp.amqp_url
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Vault Configuration
# -----------------------------------------------------------------------------
output "vault_token" {
  description = "Vault dev mode root token"
  value       = random_password.vault_token.result
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Fly.io Details
# -----------------------------------------------------------------------------
output "fly_api_app" {
  description = "Fly.io API application name"
  value       = module.api.app_name
}

output "fly_vault_app" {
  description = "Fly.io Vault application name"
  value       = module.vault.app_name
}

# -----------------------------------------------------------------------------
# Deployment Commands
# -----------------------------------------------------------------------------
output "next_steps" {
  description = "Next steps after terraform apply"
  value       = <<-EOT

    Infrastructure deployed successfully!

    Next steps:
    1. Build and push API image:
       cd ../ritualworks
       fly deploy --app portfolio-api

    2. Deploy static site to Cloudflare Pages:
       cd ../portfolio-site
       npm run build
       npx wrangler pages deploy dist

    3. Seed Vault secrets:
       ./scripts/seed-vault.sh

    4. Run database migrations:
       ./scripts/seed-database.sh

    5. Test the deployment:
       curl https://api.${var.domain_name}/health

  EOT
}
