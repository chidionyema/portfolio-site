# =============================================================================
# Cloudflare Module
# =============================================================================
# Manages DNS records and Pages project for the portfolio
# Free tier: Unlimited DNS, 500 builds/month, unlimited bandwidth
# =============================================================================

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

# -----------------------------------------------------------------------------
# DNS Records
# -----------------------------------------------------------------------------

# API subdomain pointing to Fly.io
resource "cloudflare_record" "api" {
  zone_id = var.zone_id
  name    = "api"
  value   = var.api_hostname
  type    = "CNAME"
  proxied = true
  ttl     = 1  # Auto when proxied
}

# Root domain CNAME to Pages (will be added after Pages setup)
resource "cloudflare_record" "root" {
  zone_id = var.zone_id
  name    = "@"
  value   = "${var.pages_project_name}.pages.dev"
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

# WWW redirect to root
resource "cloudflare_record" "www" {
  zone_id = var.zone_id
  name    = "www"
  value   = var.domain_name
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

# -----------------------------------------------------------------------------
# Page Rules
# -----------------------------------------------------------------------------

# Redirect www to non-www
resource "cloudflare_page_rule" "www_redirect" {
  zone_id = var.zone_id
  target  = "www.${var.domain_name}/*"

  actions {
    forwarding_url {
      url         = "https://${var.domain_name}/$1"
      status_code = 301
    }
  }
}

# -----------------------------------------------------------------------------
# SSL/TLS Settings
# -----------------------------------------------------------------------------

resource "cloudflare_zone_settings_override" "ssl" {
  zone_id = var.zone_id

  settings {
    ssl                      = "full"
    always_use_https         = "on"
    min_tls_version          = "1.2"
    automatic_https_rewrites = "on"
    security_header {
      enabled            = true
      include_subdomains = true
      max_age            = 31536000
      preload            = true
    }
  }
}

# -----------------------------------------------------------------------------
# Pages Project (manual setup required)
# -----------------------------------------------------------------------------
# Note: Cloudflare Pages projects are created via dashboard or wrangler CLI
# This output provides the expected project name for consistency

output "pages_setup_command" {
  value = <<-EOT
    # Run this command to create the Pages project:
    npx wrangler pages project create ${var.pages_project_name}

    # Then deploy:
    npx wrangler pages deploy dist --project-name=${var.pages_project_name}
  EOT
}
