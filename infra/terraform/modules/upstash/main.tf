# =============================================================================
# Upstash Redis Module
# =============================================================================
# Creates an Upstash Redis database via REST API
# Free tier: 10,000 commands/day, 256MB storage
# =============================================================================
# Note: Upstash doesn't have an official Terraform provider
# This module uses local-exec with curl to manage resources
# =============================================================================

terraform {
  required_providers {
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4"
    }
  }
}

# Create Redis database via API
resource "null_resource" "redis_database" {
  triggers = {
    name   = var.database_name
    region = var.region
  }

  provisioner "local-exec" {
    command = <<-EOT
      curl -s -X POST "https://api.upstash.com/v2/redis/database" \
        -H "Authorization: Bearer ${var.api_key}" \
        -H "Content-Type: application/json" \
        -d '{
          "name": "${var.database_name}",
          "region": "${var.region}",
          "tls": true
        }' > ${path.module}/redis_response.json
    EOT
  }

  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      DB_ID=$(cat ${path.module}/redis_response.json | jq -r '.database_id')
      if [ -n "$DB_ID" ] && [ "$DB_ID" != "null" ]; then
        curl -s -X DELETE "https://api.upstash.com/v2/redis/database/$DB_ID" \
          -H "Authorization: Bearer ${self.triggers.api_key}"
      fi
    EOT
  }
}

# Read the response
data "local_file" "redis_response" {
  filename   = "${path.module}/redis_response.json"
  depends_on = [null_resource.redis_database]
}

locals {
  redis_data = jsondecode(data.local_file.redis_response.content)
}
