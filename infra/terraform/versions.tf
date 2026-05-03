terraform {
  required_version = ">= 1.5.0"

  required_providers {
    neon = {
      source  = "kislerdm/neon"
      version = "~> 0.2"
    }
    fly = {
      source  = "fly-apps/fly"
      version = "~> 0.1"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4"
    }
  }
}
