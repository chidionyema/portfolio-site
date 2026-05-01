# Portfolio Infrastructure Automation

**Everything as Code. One command to deploy.**

---

## Infrastructure Options for Vault

### Option A: Vault on Fly.io (Recommended)

Fly.io free tier gives 3 machines. We use:
- Machine 1: .NET API (256MB)
- Machine 2: Vault dev mode (256MB)

**Pros:**
- Real Vault, not a simulator
- Full credential rotation demo with actual Vault
- Free

**Cons:**
- Dev mode (in-memory, data lost on restart)
- But that's fine for a demo

### Option B: HCP Vault (HashiCorp Cloud Platform)

HashiCorp offers a free tier:
- 25 secrets
- 25 clients
- Full production Vault

**Pros:**
- Production-grade Vault
- Persistent
- Managed

**Cons:**
- Requires HCP account setup
- Slightly more complex auth (HCP tokens)

### Decision: Option A (Vault on Fly.io)

Simpler, fully automated, demonstrates the same patterns.

---

## Final Architecture with Real Vault

```
┌─────────────────────────────────────────────────────────────────┐
│                         Fly.io (Free Tier)                       │
│                         3 machines available                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐         ┌─────────────────────┐        │
│  │   Machine 1: API    │         │  Machine 2: Vault   │        │
│  │                     │         │                     │        │
│  │   .NET 9 API        │◄───────▶│   Vault Dev Mode    │        │
│  │   256MB RAM         │  HTTP   │   256MB RAM         │        │
│  │   Scales to 0       │         │   Always on*        │        │
│  │                     │         │   Token: demo-token │        │
│  └──────────┬──────────┘         └─────────────────────┘        │
│             │                                                    │
└─────────────┼────────────────────────────────────────────────────┘
              │
              │  * Vault needs to stay on for credential rotation
              │    demo to work. ~$0 with free tier allowance.
              │
    ┌─────────┴─────────┬─────────────────┬─────────────────┐
    │                   │                 │                 │
    ▼                   ▼                 ▼                 ▼
┌─────────┐      ┌─────────┐       ┌─────────┐       ┌─────────┐
│  Neon   │      │ Upstash │       │CloudAMQP│       │ Grafana │
│Postgres │      │  Redis  │       │ RabbitMQ│       │  Cloud  │
└─────────┘      └─────────┘       └─────────┘       └─────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare (Free Tier)                        │
├─────────────────────────────────────────────────────────────────┤
│  Pages: Static frontend                                          │
│  DNS: chidionyema.dev                                            │
│  SSL: Automatic                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Automation Strategy

### What We'll Automate

| Resource | Tool | Provider |
|----------|------|----------|
| Neon PostgreSQL | Terraform | `neon` |
| Upstash Redis | Terraform | `upstash` |
| CloudAMQP RabbitMQ | Terraform | `cloudamqp` |
| Fly.io Apps + Machines | Terraform | `fly` |
| Cloudflare DNS + Pages | Terraform | `cloudflare` |
| Grafana Cloud | Terraform | `grafana` |
| Vault Configuration | Terraform | `vault` |
| Database Schemas | SQL Script | Post-deploy |
| Demo Data | .NET Migration | Post-deploy |

### What Needs Manual Setup (One-Time)

These require account creation and API key generation:

1. **Fly.io** - Create account, run `fly auth login`
2. **Neon** - Create account, get API key
3. **Upstash** - Create account, get API key
4. **CloudAMQP** - Create account, get API key
5. **Cloudflare** - Create account, get API token
6. **Grafana Cloud** - Create account, get API key

After that, everything is automated.

---

## Project Structure

```
portfolio-infra/
├── terraform/
│   ├── main.tf                 # Main configuration
│   ├── variables.tf            # Input variables
│   ├── outputs.tf              # Output values
│   ├── versions.tf             # Provider versions
│   │
│   ├── modules/
│   │   ├── neon/               # PostgreSQL
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   │
│   │   ├── upstash/            # Redis
│   │   │   └── ...
│   │   │
│   │   ├── cloudamqp/          # RabbitMQ
│   │   │   └── ...
│   │   │
│   │   ├── flyio/              # API + Vault
│   │   │   └── ...
│   │   │
│   │   ├── cloudflare/         # DNS + Pages
│   │   │   └── ...
│   │   │
│   │   ├── grafana/            # Monitoring
│   │   │   └── ...
│   │   │
│   │   └── vault-config/       # Vault secrets setup
│   │       └── ...
│   │
│   └── environments/
│       └── demo/
│           ├── terraform.tfvars
│           └── backend.tf
│
├── scripts/
│   ├── setup.sh                # Initial setup script
│   ├── deploy.sh               # Full deployment
│   ├── destroy.sh              # Tear down everything
│   ├── seed-vault.sh           # Configure Vault secrets
│   └── seed-database.sh        # Create schemas + demo data
│
├── .env.example                # Required environment variables
└── README.md                   # Setup instructions
```

---

## Terraform Configuration

### versions.tf

```hcl
# terraform/versions.tf

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    neon = {
      source  = "kislerdm/neon"
      version = "~> 0.2"
    }
    upstash = {
      source  = "upstash/upstash"
      version = "~> 1.5"
    }
    cloudamqp = {
      source  = "cloudamqp/cloudamqp"
      version = "~> 1.28"
    }
    fly = {
      source  = "fly-apps/fly"
      version = "~> 0.1"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    grafana = {
      source  = "grafana/grafana"
      version = "~> 2.0"
    }
    vault = {
      source  = "hashicorp/vault"
      version = "~> 3.0"
    }
  }
}
```

### variables.tf

```hcl
# terraform/variables.tf

# ─────────────────────────────────────────────────────────────────
# General
# ─────────────────────────────────────────────────────────────────

variable "project_name" {
  description = "Name prefix for all resources"
  type        = string
  default     = "haworks-demo"
}

variable "domain" {
  description = "Domain name for the portfolio"
  type        = string
  default     = "chidionyema.dev"
}

variable "region" {
  description = "Primary region for resources"
  type        = string
  default     = "eu-west-1"  # Maps to London/EU for most providers
}

# ─────────────────────────────────────────────────────────────────
# Provider API Keys (sensitive)
# ─────────────────────────────────────────────────────────────────

variable "neon_api_key" {
  description = "Neon API key"
  type        = string
  sensitive   = true
}

variable "upstash_api_key" {
  description = "Upstash API key"
  type        = string
  sensitive   = true
}

variable "upstash_email" {
  description = "Upstash account email"
  type        = string
}

variable "cloudamqp_api_key" {
  description = "CloudAMQP API key"
  type        = string
  sensitive   = true
}

variable "fly_api_token" {
  description = "Fly.io API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for domain"
  type        = string
}

variable "grafana_cloud_api_key" {
  description = "Grafana Cloud API key"
  type        = string
  sensitive   = true
}

variable "grafana_cloud_org" {
  description = "Grafana Cloud organization slug"
  type        = string
}

# ─────────────────────────────────────────────────────────────────
# Vault Configuration
# ─────────────────────────────────────────────────────────────────

variable "vault_dev_token" {
  description = "Root token for Vault dev mode"
  type        = string
  default     = "demo-root-token"
  sensitive   = true
}
```

### main.tf

```hcl
# terraform/main.tf

# ─────────────────────────────────────────────────────────────────
# Providers
# ─────────────────────────────────────────────────────────────────

provider "neon" {
  api_key = var.neon_api_key
}

provider "upstash" {
  api_key = var.upstash_api_key
  email   = var.upstash_email
}

provider "cloudamqp" {
  apikey = var.cloudamqp_api_key
}

provider "fly" {
  fly_api_token = var.fly_api_token
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "grafana" {
  cloud_api_key = var.grafana_cloud_api_key
}

# Vault provider configured after Vault is deployed
provider "vault" {
  address = "https://vault.${var.domain}"
  token   = var.vault_dev_token
}

# ─────────────────────────────────────────────────────────────────
# Modules
# ─────────────────────────────────────────────────────────────────

module "neon" {
  source       = "./modules/neon"
  project_name = var.project_name
  region       = "eu-central-1"  # Neon region
}

module "upstash" {
  source       = "./modules/upstash"
  project_name = var.project_name
  region       = "eu-west-1"
}

module "cloudamqp" {
  source       = "./modules/cloudamqp"
  project_name = var.project_name
  region       = "amazon-web-services::eu-west-1"
}

module "flyio" {
  source         = "./modules/flyio"
  project_name   = var.project_name
  region         = "lhr"  # London
  vault_token    = var.vault_dev_token

  # Pass connection strings
  database_url   = module.neon.connection_string
  redis_url      = module.upstash.connection_string
  rabbitmq_url   = module.cloudamqp.connection_string
}

module "cloudflare" {
  source     = "./modules/cloudflare"
  domain     = var.domain
  zone_id    = var.cloudflare_zone_id

  # Fly.io IPs/hostnames
  api_hostname   = module.flyio.api_hostname
  vault_hostname = module.flyio.vault_hostname
}

module "grafana" {
  source       = "./modules/grafana"
  project_name = var.project_name
  org_slug     = var.grafana_cloud_org

  # Metrics endpoint from API
  prometheus_url = "https://api.${var.domain}/metrics"
}

# Vault configuration (runs after Vault is deployed)
module "vault_config" {
  source = "./modules/vault-config"

  depends_on = [module.flyio]

  database_connection_string = module.neon.admin_connection_string
  database_name             = module.neon.database_name
}
```

### outputs.tf

```hcl
# terraform/outputs.tf

output "api_url" {
  description = "URL of the deployed API"
  value       = "https://api.${var.domain}"
}

output "vault_url" {
  description = "URL of the Vault instance"
  value       = "https://vault.${var.domain}"
}

output "site_url" {
  description = "URL of the portfolio site"
  value       = "https://${var.domain}"
}

output "database_host" {
  description = "PostgreSQL host (for migrations)"
  value       = module.neon.host
  sensitive   = true
}

output "grafana_dashboard_url" {
  description = "Grafana dashboard URL"
  value       = module.grafana.dashboard_url
}

output "connection_strings" {
  description = "All connection strings (for local testing)"
  value = {
    database = module.neon.connection_string
    redis    = module.upstash.connection_string
    rabbitmq = module.cloudamqp.connection_string
  }
  sensitive = true
}
```

---

## Module: Neon PostgreSQL

```hcl
# terraform/modules/neon/main.tf

resource "neon_project" "main" {
  name      = var.project_name
  region_id = var.region

  default_endpoint_settings {
    autoscaling_limit_min_cu = 0.25
    autoscaling_limit_max_cu = 0.25
    suspend_timeout_seconds  = 300  # Sleep after 5 min inactivity
  }
}

resource "neon_database" "haworks" {
  project_id = neon_project.main.id
  branch_id  = neon_project.main.default_branch_id
  name       = "haworks"
  owner_name = neon_project.main.database_user
}

resource "neon_role" "app" {
  project_id = neon_project.main.id
  branch_id  = neon_project.main.default_branch_id
  name       = "haworks_app"
}

output "connection_string" {
  value     = "postgres://${neon_role.app.name}:${neon_role.app.password}@${neon_project.main.database_host}/${neon_database.haworks.name}?sslmode=require"
  sensitive = true
}

output "admin_connection_string" {
  value     = neon_project.main.connection_uri
  sensitive = true
}

output "host" {
  value = neon_project.main.database_host
}

output "database_name" {
  value = neon_database.haworks.name
}
```

---

## Module: Upstash Redis

```hcl
# terraform/modules/upstash/main.tf

resource "upstash_redis_database" "main" {
  database_name = var.project_name
  region        = var.region
  tls           = true
  eviction      = true
}

output "connection_string" {
  value     = "rediss://default:${upstash_redis_database.main.password}@${upstash_redis_database.main.endpoint}:${upstash_redis_database.main.port}"
  sensitive = true
}

output "rest_url" {
  value = upstash_redis_database.main.rest_url
}
```

---

## Module: CloudAMQP RabbitMQ

```hcl
# terraform/modules/cloudamqp/main.tf

resource "cloudamqp_instance" "main" {
  name   = var.project_name
  plan   = "lemur"  # Free tier
  region = var.region

  no_default_alarms = true
}

output "connection_string" {
  value     = cloudamqp_instance.main.url
  sensitive = true
}

output "management_url" {
  value = "https://${cloudamqp_instance.main.host}"
}
```

---

## Module: Fly.io (API + Vault)

```hcl
# terraform/modules/flyio/main.tf

# ─────────────────────────────────────────────────────────────────
# Vault Machine
# ─────────────────────────────────────────────────────────────────

resource "fly_app" "vault" {
  name = "${var.project_name}-vault"
  org  = "personal"
}

resource "fly_machine" "vault" {
  app    = fly_app.vault.name
  region = var.region
  name   = "vault"

  image = "hashicorp/vault:1.15"

  cpus     = 1
  memory   = 256
  cpu_kind = "shared"

  env = {
    VAULT_DEV_ROOT_TOKEN_ID = var.vault_token
    VAULT_DEV_LISTEN_ADDRESS = "0.0.0.0:8200"
    VAULT_API_ADDR = "http://0.0.0.0:8200"
  }

  cmd = ["server", "-dev"]

  services = [
    {
      ports = [
        {
          port     = 443
          handlers = ["tls", "http"]
        },
        {
          port     = 80
          handlers = ["http"]
        }
      ]
      protocol      = "tcp"
      internal_port = 8200
    }
  ]
}

# ─────────────────────────────────────────────────────────────────
# API Machine
# ─────────────────────────────────────────────────────────────────

resource "fly_app" "api" {
  name = "${var.project_name}-api"
  org  = "personal"
}

resource "fly_machine" "api" {
  app    = fly_app.api.name
  region = var.region
  name   = "api"

  image = "registry.fly.io/${fly_app.api.name}:latest"

  cpus     = 1
  memory   = 256
  cpu_kind = "shared"

  env = {
    ASPNETCORE_ENVIRONMENT = "Demo"
    ASPNETCORE_URLS        = "http://+:8080"
  }

  services = [
    {
      ports = [
        {
          port     = 443
          handlers = ["tls", "http"]
        },
        {
          port     = 80
          handlers = ["http"]
        }
      ]
      protocol      = "tcp"
      internal_port = 8080

      # Auto-stop when idle
      auto_stop_machines  = true
      auto_start_machines = true
      min_machines_running = 0
    }
  ]
}

# Secrets for API
resource "fly_secret" "api_secrets" {
  app = fly_app.api.name

  secrets = {
    DATABASE_URL          = var.database_url
    REDIS_URL             = var.redis_url
    RABBITMQ_URL          = var.rabbitmq_url
    VAULT_ADDR            = "http://${fly_app.vault.name}.internal:8200"
    VAULT_TOKEN           = var.vault_token
  }
}

output "api_hostname" {
  value = "${fly_app.api.name}.fly.dev"
}

output "vault_hostname" {
  value = "${fly_app.vault.name}.fly.dev"
}

output "vault_internal_url" {
  value = "http://${fly_app.vault.name}.internal:8200"
}
```

---

## Module: Cloudflare DNS + Pages

```hcl
# terraform/modules/cloudflare/main.tf

# ─────────────────────────────────────────────────────────────────
# DNS Records
# ─────────────────────────────────────────────────────────────────

# API subdomain
resource "cloudflare_record" "api" {
  zone_id = var.zone_id
  name    = "api"
  type    = "CNAME"
  value   = var.api_hostname
  proxied = true
}

# Vault subdomain
resource "cloudflare_record" "vault" {
  zone_id = var.zone_id
  name    = "vault"
  type    = "CNAME"
  value   = var.vault_hostname
  proxied = true
}

# Root domain -> Pages
resource "cloudflare_record" "root" {
  zone_id = var.zone_id
  name    = "@"
  type    = "CNAME"
  value   = cloudflare_pages_project.portfolio.subdomain
  proxied = true
}

# www -> root
resource "cloudflare_record" "www" {
  zone_id = var.zone_id
  name    = "www"
  type    = "CNAME"
  value   = var.domain
  proxied = true
}

# ─────────────────────────────────────────────────────────────────
# Pages Project
# ─────────────────────────────────────────────────────────────────

resource "cloudflare_pages_project" "portfolio" {
  account_id        = var.account_id
  name              = "chidionyema-portfolio"
  production_branch = "main"

  build_config {
    build_command   = "npm run build"
    destination_dir = "dist"
    root_dir        = "portfolio"
  }

  deployment_configs {
    production {
      environment_variables = {
        PUBLIC_API_URL    = "https://api.${var.domain}"
        PUBLIC_VAULT_URL  = "https://vault.${var.domain}"
      }
    }
  }
}

resource "cloudflare_pages_domain" "root" {
  account_id   = var.account_id
  project_name = cloudflare_pages_project.portfolio.name
  domain       = var.domain
}

output "pages_url" {
  value = cloudflare_pages_project.portfolio.subdomain
}
```

---

## Module: Vault Configuration

This configures Vault AFTER it's deployed with database secrets engine.

```hcl
# terraform/modules/vault-config/main.tf

# Enable database secrets engine
resource "vault_mount" "database" {
  path = "database"
  type = "database"
}

# Configure PostgreSQL connection
resource "vault_database_secret_backend_connection" "postgres" {
  backend       = vault_mount.database.path
  name          = "haworks"
  allowed_roles = ["app-role"]

  postgresql {
    connection_url = var.database_connection_string
  }
}

# Create role for app credentials
resource "vault_database_secret_backend_role" "app" {
  backend     = vault_mount.database.path
  name        = "app-role"
  db_name     = vault_database_secret_backend_connection.postgres.name

  creation_statements = [
    "CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';",
    "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA catalog TO \"{{name}}\";",
    "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA orders TO \"{{name}}\";",
    "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA payments TO \"{{name}}\";",
    "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA content TO \"{{name}}\";",
    "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA identity TO \"{{name}}\";",
    "GRANT USAGE ON ALL SEQUENCES IN SCHEMA catalog TO \"{{name}}\";",
    "GRANT USAGE ON ALL SEQUENCES IN SCHEMA orders TO \"{{name}}\";",
    "GRANT USAGE ON ALL SEQUENCES IN SCHEMA payments TO \"{{name}}\";",
    "GRANT USAGE ON ALL SEQUENCES IN SCHEMA content TO \"{{name}}\";",
    "GRANT USAGE ON ALL SEQUENCES IN SCHEMA identity TO \"{{name}}\";",
  ]

  revocation_statements = [
    "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA catalog FROM \"{{name}}\";",
    "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA orders FROM \"{{name}}\";",
    "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA payments FROM \"{{name}}\";",
    "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA content FROM \"{{name}}\";",
    "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA identity FROM \"{{name}}\";",
    "DROP ROLE IF EXISTS \"{{name}}\";",
  ]

  # Short TTL for demo (credential rotation every 2 minutes)
  default_ttl = 120   # 2 minutes
  max_ttl     = 300   # 5 minutes
}

# Store static secrets for demo
resource "vault_kv_secret_v2" "demo_secrets" {
  mount = "secret"
  name  = "demo"

  data_json = jsonencode({
    stripe_api_key     = "sk_test_demo_key"
    stripe_webhook_secret = "whsec_demo_secret"
    jwt_secret         = "demo-jwt-secret-at-least-32-characters-long"
  })
}

output "database_role_path" {
  value = "database/creds/app-role"
}

output "secrets_path" {
  value = "secret/data/demo"
}
```

---

## Module: Grafana Cloud

```hcl
# terraform/modules/grafana/main.tf

resource "grafana_cloud_stack" "main" {
  name        = var.project_name
  slug        = replace(var.project_name, "-", "")
  region_slug = "eu"
}

# Dashboard for the demo
resource "grafana_dashboard" "haworks" {
  org_id = grafana_cloud_stack.main.org_id

  config_json = jsonencode({
    title = "HaWorks Demo"
    panels = [
      {
        title      = "Request Rate"
        type       = "timeseries"
        gridPos    = { h = 8, w = 12, x = 0, y = 0 }
        datasource = "prometheus"
        targets = [{
          expr = "rate(http_requests_total[5m])"
        }]
      },
      {
        title      = "Error Rate"
        type       = "timeseries"
        gridPos    = { h = 8, w = 12, x = 12, y = 0 }
        datasource = "prometheus"
        targets = [{
          expr = "rate(http_requests_total{status=~\"5..\"}[5m])"
        }]
      },
      {
        title      = "Circuit Breaker State"
        type       = "stat"
        gridPos    = { h = 4, w = 6, x = 0, y = 8 }
        datasource = "prometheus"
        targets = [{
          expr = "circuit_breaker_state"
        }]
      },
      {
        title      = "Credential Rotations"
        type       = "stat"
        gridPos    = { h = 4, w = 6, x = 6, y = 8 }
        datasource = "prometheus"
        targets = [{
          expr = "credential_rotations_total"
        }]
      },
      {
        title      = "Queue Depth"
        type       = "timeseries"
        gridPos    = { h = 8, w = 12, x = 0, y = 12 }
        datasource = "prometheus"
        targets = [{
          expr = "rabbitmq_queue_messages"
        }]
      }
    ]
  })
}

# Public dashboard for embedding
resource "grafana_dashboard_public" "haworks" {
  org_id        = grafana_cloud_stack.main.org_id
  dashboard_uid = grafana_dashboard.haworks.uid

  access_token    = "haworks-public-demo"
  time_selection  = true
  is_enabled      = true
}

output "dashboard_url" {
  value = grafana_dashboard_public.haworks.public_url
}

output "prometheus_remote_write_url" {
  value = grafana_cloud_stack.main.prometheus_remote_write_endpoint
}
```

---

## Scripts

### setup.sh - Initial Setup

```bash
#!/bin/bash
# scripts/setup.sh
# One-time setup script

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           HaWorks Portfolio Infrastructure Setup              ║"
echo "╚═══════════════════════════════════════════════════════════════╝"

# Check prerequisites
echo ""
echo "Checking prerequisites..."

command -v terraform >/dev/null 2>&1 || { echo "❌ Terraform not installed. Install from https://terraform.io"; exit 1; }
command -v flyctl >/dev/null 2>&1 || { echo "❌ Fly CLI not installed. Run: curl -L https://fly.io/install.sh | sh"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "❌ jq not installed. Install via your package manager"; exit 1; }

echo "✅ Prerequisites installed"

# Check for .env file
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env from template..."
    cp .env.example .env
    echo ""
    echo "⚠️  Please edit .env with your API keys before continuing."
    echo "   Required keys:"
    echo "   - NEON_API_KEY (from https://console.neon.tech)"
    echo "   - UPSTASH_API_KEY (from https://console.upstash.com)"
    echo "   - CLOUDAMQP_API_KEY (from https://customer.cloudamqp.com)"
    echo "   - FLY_API_TOKEN (run: fly auth token)"
    echo "   - CLOUDFLARE_API_TOKEN (from https://dash.cloudflare.com/profile/api-tokens)"
    echo "   - GRAFANA_CLOUD_API_KEY (from https://grafana.com/orgs/YOUR_ORG/api-keys)"
    echo ""
    exit 1
fi

# Load environment
source .env

# Verify all keys are set
missing_keys=()
[ -z "$NEON_API_KEY" ] && missing_keys+=("NEON_API_KEY")
[ -z "$UPSTASH_API_KEY" ] && missing_keys+=("UPSTASH_API_KEY")
[ -z "$CLOUDAMQP_API_KEY" ] && missing_keys+=("CLOUDAMQP_API_KEY")
[ -z "$FLY_API_TOKEN" ] && missing_keys+=("FLY_API_TOKEN")
[ -z "$CLOUDFLARE_API_TOKEN" ] && missing_keys+=("CLOUDFLARE_API_TOKEN")
[ -z "$GRAFANA_CLOUD_API_KEY" ] && missing_keys+=("GRAFANA_CLOUD_API_KEY")

if [ ${#missing_keys[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    printf '   - %s\n' "${missing_keys[@]}"
    exit 1
fi

echo "✅ Environment variables configured"

# Initialize Terraform
echo ""
echo "Initializing Terraform..."
cd terraform/environments/demo
terraform init

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Run: ./scripts/deploy.sh"
echo "  2. Wait for deployment (~5 minutes)"
echo "  3. Visit your portfolio at https://${TF_VAR_domain:-chidionyema.dev}"
```

### deploy.sh - Full Deployment

```bash
#!/bin/bash
# scripts/deploy.sh
# Deploy everything

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           HaWorks Portfolio - Full Deployment                 ║"
echo "╚═══════════════════════════════════════════════════════════════╝"

# Load environment
source .env

# Export as TF_VAR_*
export TF_VAR_neon_api_key="$NEON_API_KEY"
export TF_VAR_upstash_api_key="$UPSTASH_API_KEY"
export TF_VAR_upstash_email="$UPSTASH_EMAIL"
export TF_VAR_cloudamqp_api_key="$CLOUDAMQP_API_KEY"
export TF_VAR_fly_api_token="$FLY_API_TOKEN"
export TF_VAR_cloudflare_api_token="$CLOUDFLARE_API_TOKEN"
export TF_VAR_cloudflare_zone_id="$CLOUDFLARE_ZONE_ID"
export TF_VAR_grafana_cloud_api_key="$GRAFANA_CLOUD_API_KEY"
export TF_VAR_grafana_cloud_org="$GRAFANA_CLOUD_ORG"
export TF_VAR_domain="${DOMAIN:-chidionyema.dev}"

cd terraform/environments/demo

# Plan
echo ""
echo "Planning infrastructure changes..."
terraform plan -out=tfplan

# Confirm
echo ""
read -p "Apply changes? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Apply
echo ""
echo "Applying infrastructure..."
terraform apply tfplan

# Get outputs
echo ""
echo "Getting connection details..."
DATABASE_URL=$(terraform output -raw connection_strings | jq -r '.database')
REDIS_URL=$(terraform output -raw connection_strings | jq -r '.redis')
RABBITMQ_URL=$(terraform output -raw connection_strings | jq -r '.rabbitmq')
VAULT_URL=$(terraform output -raw vault_url)

# Build and deploy API
echo ""
echo "Building and deploying API..."
cd ../../../

# Build Docker image
docker build -f Dockerfile.demo -t haworks-demo-api .

# Push to Fly.io registry
flyctl auth docker
docker tag haworks-demo-api registry.fly.io/haworks-demo-api:latest
docker push registry.fly.io/haworks-demo-api:latest

# Deploy
flyctl deploy --image registry.fly.io/haworks-demo-api:latest

# Wait for API to be healthy
echo ""
echo "Waiting for API to be healthy..."
API_URL=$(terraform -chdir=terraform/environments/demo output -raw api_url)
for i in {1..30}; do
    if curl -s "${API_URL}/health" | grep -q "Healthy"; then
        echo "✅ API is healthy"
        break
    fi
    echo "   Waiting... ($i/30)"
    sleep 5
done

# Seed database schemas
echo ""
echo "Creating database schemas..."
./scripts/seed-database.sh

# Configure Vault
echo ""
echo "Configuring Vault..."
./scripts/seed-vault.sh

# Build and deploy frontend
echo ""
echo "Building frontend..."
cd portfolio
npm ci
npm run build

echo ""
echo "Deploying frontend to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name=chidionyema-portfolio

cd ..

# Done
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    Deployment Complete!                       ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "URLs:"
echo "  Portfolio: https://${TF_VAR_domain}"
echo "  API:       ${API_URL}"
echo "  Vault:     ${VAULT_URL}"
echo "  Grafana:   $(terraform -chdir=terraform/environments/demo output -raw grafana_dashboard_url)"
echo ""
echo "Test it:"
echo "  curl ${API_URL}/health"
echo "  curl ${API_URL}/api/demo/credentials"
echo ""
```

### seed-database.sh - Create Schemas

```bash
#!/bin/bash
# scripts/seed-database.sh
# Create database schemas and run migrations

set -e

source .env

cd terraform/environments/demo
DATABASE_URL=$(terraform output -raw connection_strings | jq -r '.database')
cd ../../..

echo "Creating database schemas..."

psql "$DATABASE_URL" << 'EOF'
-- Create schemas for bounded contexts
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS orders;
CREATE SCHEMA IF NOT EXISTS payments;
CREATE SCHEMA IF NOT EXISTS content;
CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS demo;

-- Grant permissions to app role
DO $$
BEGIN
    -- Catalog
    EXECUTE 'GRANT ALL ON SCHEMA catalog TO ' || current_user;
    EXECUTE 'GRANT ALL ON SCHEMA orders TO ' || current_user;
    EXECUTE 'GRANT ALL ON SCHEMA payments TO ' || current_user;
    EXECUTE 'GRANT ALL ON SCHEMA content TO ' || current_user;
    EXECUTE 'GRANT ALL ON SCHEMA identity TO ' || current_user;
    EXECUTE 'GRANT ALL ON SCHEMA demo TO ' || current_user;
END $$;

-- Demo event log table
CREATE TABLE IF NOT EXISTS demo.event_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_log_created ON demo.event_log(created_at DESC);

-- Demo credential rotation history
CREATE TABLE IF NOT EXISTS demo.credential_rotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    old_version VARCHAR(50),
    new_version VARCHAR(50) NOT NULL,
    rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    requests_during_rotation INT NOT NULL DEFAULT 0,
    failed_during_rotation INT NOT NULL DEFAULT 0
);

SELECT 'Schemas created successfully' as status;
EOF

echo "Running EF Core migrations..."
cd src

# Run migrations for each context
dotnet ef database update --context CatalogDbContext -- --environment Demo
dotnet ef database update --context OrderDbContext -- --environment Demo
dotnet ef database update --context PaymentDbContext -- --environment Demo
dotnet ef database update --context ContentDbContext -- --environment Demo
dotnet ef database update --context IdentityDbContext -- --environment Demo

cd ..

echo "Seeding demo data..."
curl -X POST "https://api.${DOMAIN:-chidionyema.dev}/api/demo/reset"

echo "✅ Database setup complete"
```

### seed-vault.sh - Configure Vault

```bash
#!/bin/bash
# scripts/seed-vault.sh
# Configure Vault secrets engine and roles

set -e

source .env

cd terraform/environments/demo
VAULT_ADDR=$(terraform output -raw vault_url)
DATABASE_URL=$(terraform output -raw connection_strings | jq -r '.database')
cd ../../..

export VAULT_ADDR
export VAULT_TOKEN="${VAULT_DEV_TOKEN:-demo-root-token}"

echo "Configuring Vault at ${VAULT_ADDR}..."

# Wait for Vault to be ready
for i in {1..30}; do
    if vault status > /dev/null 2>&1; then
        echo "✅ Vault is ready"
        break
    fi
    echo "   Waiting for Vault... ($i/30)"
    sleep 2
done

# Enable database secrets engine
echo "Enabling database secrets engine..."
vault secrets enable -path=database database 2>/dev/null || true

# Configure PostgreSQL connection
echo "Configuring PostgreSQL connection..."
vault write database/config/haworks \
    plugin_name=postgresql-database-plugin \
    allowed_roles="app-role" \
    connection_url="postgresql://{{username}}:{{password}}@${DATABASE_HOST}/${DATABASE_NAME}?sslmode=require" \
    username="${DATABASE_USER}" \
    password="${DATABASE_PASSWORD}"

# Create role with short TTL for demo
echo "Creating app role with short TTL..."
vault write database/roles/app-role \
    db_name=haworks \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA catalog TO \"{{name}}\"; \
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA orders TO \"{{name}}\"; \
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA payments TO \"{{name}}\"; \
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA content TO \"{{name}}\"; \
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA identity TO \"{{name}}\"; \
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA catalog TO \"{{name}}\"; \
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA orders TO \"{{name}}\"; \
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA payments TO \"{{name}}\"; \
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA content TO \"{{name}}\"; \
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA identity TO \"{{name}}\";" \
    revocation_statements="REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA catalog FROM \"{{name}}\"; \
        REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA orders FROM \"{{name}}\"; \
        REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA payments FROM \"{{name}}\"; \
        REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA content FROM \"{{name}}\"; \
        REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA identity FROM \"{{name}}\"; \
        DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="2m" \
    max_ttl="5m"

# Store static secrets
echo "Storing demo secrets..."
vault kv put secret/demo \
    stripe_api_key="sk_test_demo_key" \
    stripe_webhook_secret="whsec_demo_secret" \
    jwt_secret="demo-jwt-secret-at-least-32-characters-long"

# Test credential generation
echo "Testing credential generation..."
vault read database/creds/app-role

echo "✅ Vault configuration complete"
echo ""
echo "Credentials will rotate every 2 minutes for demo purposes."
echo "Watch the demo at https://${DOMAIN:-chidionyema.dev}/demo"
```

### destroy.sh - Tear Down

```bash
#!/bin/bash
# scripts/destroy.sh
# Tear down all infrastructure

set -e

echo "⚠️  This will destroy ALL portfolio infrastructure!"
echo ""
read -p "Are you sure? Type 'destroy' to confirm: " confirm

if [ "$confirm" != "destroy" ]; then
    echo "Aborted."
    exit 1
fi

source .env

export TF_VAR_neon_api_key="$NEON_API_KEY"
export TF_VAR_upstash_api_key="$UPSTASH_API_KEY"
export TF_VAR_upstash_email="$UPSTASH_EMAIL"
export TF_VAR_cloudamqp_api_key="$CLOUDAMQP_API_KEY"
export TF_VAR_fly_api_token="$FLY_API_TOKEN"
export TF_VAR_cloudflare_api_token="$CLOUDFLARE_API_TOKEN"
export TF_VAR_cloudflare_zone_id="$CLOUDFLARE_ZONE_ID"
export TF_VAR_grafana_cloud_api_key="$GRAFANA_CLOUD_API_KEY"
export TF_VAR_grafana_cloud_org="$GRAFANA_CLOUD_ORG"

cd terraform/environments/demo

terraform destroy -auto-approve

echo "✅ All infrastructure destroyed"
```

---

## .env.example

```bash
# .env.example
# Copy to .env and fill in your API keys

# Domain
DOMAIN=chidionyema.dev

# Neon PostgreSQL
# Get from: https://console.neon.tech → Account Settings → API Keys
NEON_API_KEY=

# Upstash Redis
# Get from: https://console.upstash.com → Account → API Keys
UPSTASH_API_KEY=
UPSTASH_EMAIL=

# CloudAMQP RabbitMQ
# Get from: https://customer.cloudamqp.com → API Access
CLOUDAMQP_API_KEY=

# Fly.io
# Get by running: fly auth token
FLY_API_TOKEN=

# Cloudflare
# Get from: https://dash.cloudflare.com/profile/api-tokens
# Needs permissions: Zone:DNS:Edit, Zone:Zone:Read, Pages:Edit
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ZONE_ID=
CLOUDFLARE_ACCOUNT_ID=

# Grafana Cloud
# Get from: https://grafana.com/orgs/YOUR_ORG/api-keys
GRAFANA_CLOUD_API_KEY=
GRAFANA_CLOUD_ORG=

# Vault (for dev mode)
VAULT_DEV_TOKEN=demo-root-token
```

---

## Summary

### What's Automated

| Resource | How | Time |
|----------|-----|------|
| PostgreSQL (Neon) | Terraform | ~30s |
| Redis (Upstash) | Terraform | ~30s |
| RabbitMQ (CloudAMQP) | Terraform | ~60s |
| **Vault (Fly.io)** | Terraform | ~60s |
| API (Fly.io) | Terraform + Docker | ~120s |
| DNS (Cloudflare) | Terraform | ~30s |
| Frontend (Cloudflare Pages) | Script | ~60s |
| Vault Config | Script | ~30s |
| Database Schemas | Script | ~30s |

**Total automated deployment time: ~8 minutes**

### What's Manual (One-Time)

1. Create accounts at each provider (~30 min total)
2. Generate API keys (~10 min)
3. Fill in `.env` file (~5 min)

### Commands

```bash
# First time
./scripts/setup.sh    # Check prerequisites, init Terraform

# Deploy everything
./scripts/deploy.sh   # ~8 minutes

# Tear down
./scripts/destroy.sh  # Clean slate
```

### Real Vault Features Demonstrated

With real Vault running on Fly.io, visitors see:

1. **Dynamic database credentials** - Actually generated by Vault
2. **TTL countdown** - Real 2-minute TTL
3. **Credential rotation** - Real rotation via Vault database secrets engine
4. **Connection pool drain** - Real NpgSQL pool management
5. **Zero failures** - Actual proof, not simulation

This is **production-grade credential rotation** running on free infrastructure.
