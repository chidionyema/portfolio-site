output "api_record_id" {
  description = "API DNS record ID"
  value       = cloudflare_record.api.id
}

output "root_record_id" {
  description = "Root DNS record ID"
  value       = cloudflare_record.root.id
}

output "api_url" {
  description = "API URL"
  value       = "https://api.${var.domain_name}"
}

output "site_url" {
  description = "Site URL"
  value       = "https://${var.domain_name}"
}

output "pages_project_name" {
  description = "Pages project name for deployment"
  value       = var.pages_project_name
}
