# =============================================================================
# Grafana Cloud Module (Optional)
# =============================================================================
# Configures Grafana Cloud for observability
# Free tier: 10,000 series, 3 dashboards, 14-day retention
# =============================================================================
# Note: Grafana Cloud doesn't have a free-tier Terraform provider
# This module provides configuration and instructions
# =============================================================================

# Output dashboard configuration for manual setup
output "grafana_dashboard_config" {
  value = <<-EOT
    # Grafana Cloud Setup Instructions
    # ================================

    1. Sign up at https://grafana.com/products/cloud/
    2. Create a stack (free tier available)
    3. Note your stack URL: https://YOUR_STACK.grafana.net

    # Prometheus Remote Write Configuration
    # Add this to your API's appsettings.json:

    {
      "Prometheus": {
        "RemoteWrite": {
          "Endpoint": "https://prometheus-prod-XX-prod-XX.grafana.net/api/prom/push",
          "Username": "YOUR_PROMETHEUS_USER_ID",
          "Password": "YOUR_GRAFANA_API_KEY"
        }
      }
    }

    # Import Dashboard
    # ----------------
    # Import the pre-built dashboard from:
    # ${path.module}/dashboards/portfolio-overview.json

  EOT
}

# Create dashboard JSON template
resource "local_file" "dashboard" {
  filename = "${path.module}/dashboards/portfolio-overview.json"
  content  = jsonencode({
    title = "Portfolio Showcase"
    uid   = "portfolio-overview"
    panels = [
      {
        title      = "Request Rate"
        type       = "timeseries"
        datasource = "Prometheus"
        gridPos    = { h = 8, w = 12, x = 0, y = 0 }
        targets = [{
          expr         = "rate(http_requests_total[5m])"
          legendFormat = "{{method}} {{path}}"
        }]
      },
      {
        title      = "Error Rate"
        type       = "timeseries"
        datasource = "Prometheus"
        gridPos    = { h = 8, w = 12, x = 12, y = 0 }
        targets = [{
          expr         = "rate(http_requests_total{status=~\"5..\"}[5m])"
          legendFormat = "5xx errors"
        }]
      },
      {
        title      = "Circuit Breaker State"
        type       = "stat"
        datasource = "Prometheus"
        gridPos    = { h = 4, w = 6, x = 0, y = 8 }
        targets = [{
          expr         = "circuit_breaker_state"
          legendFormat = "{{service}}"
        }]
      },
      {
        title      = "Message Queue Depth"
        type       = "timeseries"
        datasource = "Prometheus"
        gridPos    = { h = 8, w = 12, x = 0, y = 12 }
        targets = [{
          expr         = "rabbitmq_queue_messages"
          legendFormat = "{{queue}}"
        }]
      },
      {
        title      = "Outbox Messages Pending"
        type       = "stat"
        datasource = "Prometheus"
        gridPos    = { h = 4, w = 6, x = 6, y = 8 }
        targets = [{
          expr = "outbox_messages_pending"
        }]
      },
      {
        title      = "Credential Rotation Events"
        type       = "timeseries"
        datasource = "Prometheus"
        gridPos    = { h = 8, w = 12, x = 12, y = 12 }
        targets = [{
          expr         = "rate(vault_credential_rotation_total[5m])"
          legendFormat = "rotations/sec"
        }]
      }
    ]
    refresh   = "5s"
    time      = { from = "now-1h", to = "now" }
    templating = { list = [] }
  })
}
