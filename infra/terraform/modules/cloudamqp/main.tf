# =============================================================================
# CloudAMQP RabbitMQ Module
# =============================================================================
# Creates a CloudAMQP instance via REST API
# Free tier (Little Lemur): 1M messages/month, 20 connections
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

# Create RabbitMQ instance via API
resource "null_resource" "rabbitmq_instance" {
  triggers = {
    name   = var.instance_name
    region = var.region
  }

  provisioner "local-exec" {
    command = <<-EOT
      curl -s -X POST "https://customer.cloudamqp.com/api/instances" \
        -u ":${var.api_key}" \
        -H "Content-Type: application/json" \
        -d '{
          "name": "${var.instance_name}",
          "plan": "lemur",
          "region": "${var.region}"
        }' > ${path.module}/rabbitmq_response.json
    EOT
  }

  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      INSTANCE_ID=$(cat ${path.module}/rabbitmq_response.json | jq -r '.id')
      if [ -n "$INSTANCE_ID" ] && [ "$INSTANCE_ID" != "null" ]; then
        curl -s -X DELETE "https://customer.cloudamqp.com/api/instances/$INSTANCE_ID" \
          -u ":${self.triggers.api_key}"
      fi
    EOT
  }
}

# Read the response
data "local_file" "rabbitmq_response" {
  filename   = "${path.module}/rabbitmq_response.json"
  depends_on = [null_resource.rabbitmq_instance]
}

locals {
  rabbitmq_data = jsondecode(data.local_file.rabbitmq_response.content)
}
