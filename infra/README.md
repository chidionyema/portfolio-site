# Portfolio Showcase Infrastructure

Terraform modules for deploying the portfolio showcase infrastructure using free-tier cloud services.

## Cost

**Total: ~£10/year** (domain registration only)

| Service | Plan | Cost |
|---------|------|------|
| Neon PostgreSQL | Free | £0 |
| Upstash Redis | Free | £0 |
| CloudAMQP RabbitMQ | Free (Lemur) | £0 |
| Fly.io | Free (3 machines) | £0 |
| Cloudflare Pages | Free | £0 |
| Grafana Cloud | Free | £0 |
| Domain | Annual | ~£10 |

## Prerequisites

1. **Accounts** (all free tier):
   - [Neon](https://console.neon.tech) - PostgreSQL
   - [Upstash](https://console.upstash.com) - Redis
   - [CloudAMQP](https://customer.cloudamqp.com) - RabbitMQ
   - [Fly.io](https://fly.io) - API & Vault hosting
   - [Cloudflare](https://dash.cloudflare.com) - DNS & Pages

2. **Tools**:
   ```bash
   # Terraform
   brew install terraform

   # Fly.io CLI
   brew install flyctl
   fly auth login

   # Other tools
   brew install jq
   ```

3. **Domain**: Register your domain and add it to Cloudflare

## Quick Start

```bash
# 1. Clone and setup
cd portfolio-infra
cp terraform/terraform.tfvars.example terraform/terraform.tfvars

# 2. Fill in your API keys in terraform.tfvars

# 3. Initialize and deploy
./scripts/setup.sh
./scripts/deploy.sh plan
./scripts/deploy.sh apply

# 4. Configure Vault
./scripts/seed-vault.sh

# 5. Seed database
./scripts/seed-database.sh
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION SHOWCASE STACK                     │
│                         (All Free Tier)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐     ┌─────────────────┐                    │
│  │ Cloudflare      │     │ Fly.io          │                    │
│  │ Pages           │────▶│ (Free Tier)     │                    │
│  │ (Static Site)   │     │                 │                    │
│  │                 │     │ .NET 9 API      │                    │
│  │ - Portfolio     │     │ - Scales to 0   │                    │
│  │ - Docs          │     │ - Wakes on req  │                    │
│  └─────────────────┘     └────────┬────────┘                    │
│         FREE                      │                              │
│                    ┌──────────────┼──────────────┐              │
│                    │              │              │              │
│                    ▼              ▼              ▼              │
│           ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│           │ Neon        │ │ Upstash     │ │ CloudAMQP   │       │
│           │ PostgreSQL  │ │ Redis       │ │ RabbitMQ    │       │
│           │ Free: 0.5GB │ │ Free: 10K   │ │ Free: 1M    │       │
│           └─────────────┘ └─────────────┘ └─────────────┘       │
│                FREE            FREE            FREE              │
│                                                                  │
│           ┌─────────────┐                                       │
│           │ Vault       │ (Fly.io internal)                     │
│           │ Dev Mode    │                                       │
│           └─────────────┘                                       │
│                FREE                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
portfolio-infra/
├── terraform/
│   ├── main.tf              # Main configuration
│   ├── variables.tf         # Input variables
│   ├── outputs.tf           # Output values
│   ├── versions.tf          # Provider versions
│   ├── terraform.tfvars.example
│   └── modules/
│       ├── neon/            # PostgreSQL
│       ├── upstash/         # Redis
│       ├── cloudamqp/       # RabbitMQ
│       ├── flyio/           # Fly.io apps
│       ├── cloudflare/      # DNS & Pages
│       └── grafana/         # Monitoring
├── scripts/
│   ├── setup.sh             # Initialize Terraform
│   ├── deploy.sh            # Deploy infrastructure
│   ├── seed-vault.sh        # Configure Vault secrets
│   ├── seed-database.sh     # Seed demo data
│   └── destroy.sh           # Tear down everything
└── README.md
```

## Deployment Commands

```bash
# Plan changes
./scripts/deploy.sh plan

# Apply changes
./scripts/deploy.sh apply

# View outputs
./scripts/deploy.sh output

# Destroy everything
./scripts/destroy.sh
```

## After Deployment

1. **Deploy the API**:
   ```bash
   cd ../haworks-platform
   fly deploy --app portfolio-api
   ```

2. **Deploy the static site**:
   ```bash
   cd ../portfolio-site
   npm run build
   npx wrangler pages deploy dist
   ```

3. **Verify**:
   ```bash
   curl https://api.YOUR_DOMAIN/health
   ```

## Vault Credential Rotation Demo

The Vault is configured with short TTLs to demonstrate zero-downtime rotation:

- **Default TTL**: 2 minutes
- **Max TTL**: 5 minutes

Watch the rotation in the portfolio demo at `/demo/credential-rotation`.

## Troubleshooting

**Terraform init fails:**
```bash
rm -rf terraform/.terraform
cd terraform && terraform init
```

**Fly.io auth issues:**
```bash
fly auth logout
fly auth login
```

**Cannot reach Vault:**
```bash
# Open proxy to Vault
fly proxy 8200:8200 -a portfolio-vault
```
