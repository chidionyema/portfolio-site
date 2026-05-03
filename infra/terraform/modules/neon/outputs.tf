output "project_id" {
  description = "Neon project ID"
  value       = neon_project.main.id
}

output "host" {
  description = "Database host"
  value       = neon_project.main.database_host
}

output "database_name" {
  description = "Database name"
  value       = neon_database.app.name
}

output "username" {
  description = "Database username"
  value       = neon_role.app.name
}

output "connection_string" {
  description = "Full connection string"
  value       = "Host=${neon_project.main.database_host};Database=${neon_database.app.name};Username=${neon_role.app.name};Password=${var.db_password};SSL Mode=Require"
  sensitive   = true
}

output "connection_string_pooled" {
  description = "Connection string with connection pooling"
  value       = "Host=${replace(neon_project.main.database_host, ".neon.tech", "-pooler.neon.tech")};Database=${neon_database.app.name};Username=${neon_role.app.name};Password=${var.db_password};SSL Mode=Require"
  sensitive   = true
}
