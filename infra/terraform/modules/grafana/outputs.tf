output "dashboard_file" {
  description = "Path to the dashboard JSON file"
  value       = local_file.dashboard.filename
}

output "setup_instructions" {
  description = "Setup instructions for Grafana Cloud"
  value       = <<-EOT
    Grafana Cloud Free Tier Setup:
    1. Create account at https://grafana.com/products/cloud/
    2. Create a stack
    3. Import dashboard from: ${local_file.dashboard.filename}
    4. Configure Prometheus remote write in your API
  EOT
}
