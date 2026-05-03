# =============================================================================
# Fly.io Application Module
# =============================================================================
# Creates a Fly.io application with machines
# Free tier: 3 shared-cpu-1x VMs, 256MB RAM each
# =============================================================================

terraform {
  required_providers {
    fly = {
      source  = "fly-apps/fly"
      version = "~> 0.1"
    }
  }
}

# Create Fly.io app
resource "fly_app" "app" {
  name = var.app_name
  org  = var.org
}

# Create machine
resource "fly_machine" "app" {
  count = var.machine_count

  app    = fly_app.app.name
  region = var.region
  name   = "${var.app_name}-${count.index}"

  image = var.image

  cpus     = var.cpus
  memorymb = var.memory_mb
  cputype  = var.cpu_type

  env = var.env

  dynamic "services" {
    for_each = var.services
    content {
      internal_port = services.value.internal_port
      protocol      = services.value.protocol

      dynamic "ports" {
        for_each = services.value.ports
        content {
          port     = ports.value.port
          handlers = ports.value.handlers
        }
      }
    }
  }
}

# Allocate IP addresses (only for external apps)
resource "fly_ip" "ipv4" {
  count = var.internal ? 0 : 1

  app  = fly_app.app.name
  type = "v4"
}

resource "fly_ip" "ipv6" {
  count = var.internal ? 0 : 1

  app  = fly_app.app.name
  type = "v6"
}
