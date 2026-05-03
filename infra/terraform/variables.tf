# =============================================================================
# Portfolio Infrastructure Variables
# =============================================================================
# Copy terraform.tfvars.example to terraform.tfvars and fill in your values

# -----------------------------------------------------------------------------
# Domain & General
# -----------------------------------------------------------------------------
variable "domain_name" {
  description = "Your portfolio domain (e.g., chidionyema.dev)"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "demo"
}

# -----------------------------------------------------------------------------
# Neon (PostgreSQL)
# -----------------------------------------------------------------------------
variable "neon_api_key" {
  description = "Neon API key from console.neon.tech"
  type        = string
  sensitive   = true
}

variable "neon_project_name" {
  description = "Name for the Neon project"
  type        = string
  default     = "portfolio-showcase"
}

# -----------------------------------------------------------------------------
# Upstash (Redis)
# -----------------------------------------------------------------------------
variable "upstash_api_key" {
  description = "Upstash API key from console.upstash.com"
  type        = string
  sensitive   = true
}

variable "upstash_email" {
  description = "Upstash account email"
  type        = string
}

# -----------------------------------------------------------------------------
# CloudAMQP (RabbitMQ)
# -----------------------------------------------------------------------------
variable "cloudamqp_api_key" {
  description = "CloudAMQP API key from customer.cloudamqp.com"
  type        = string
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Fly.io
# -----------------------------------------------------------------------------
variable "fly_api_token" {
  description = "Fly.io API token from fly.io/user/personal_access_tokens"
  type        = string
  sensitive   = true
}

variable "fly_org" {
  description = "Fly.io organization slug"
  type        = string
  default     = "personal"
}

variable "fly_region" {
  description = "Fly.io region for deployment"
  type        = string
  default     = "lhr"  # London
}

# -----------------------------------------------------------------------------
# Cloudflare
# -----------------------------------------------------------------------------
variable "cloudflare_api_token" {
  description = "Cloudflare API token with Zone and DNS permissions"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for your domain"
  type        = string
}

# -----------------------------------------------------------------------------
# Grafana Cloud (Optional)
# -----------------------------------------------------------------------------
variable "grafana_cloud_api_key" {
  description = "Grafana Cloud API key (optional)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "grafana_cloud_stack_slug" {
  description = "Grafana Cloud stack slug (optional)"
  type        = string
  default     = ""
}
