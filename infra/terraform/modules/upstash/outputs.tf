output "database_id" {
  description = "Upstash database ID"
  value       = try(local.redis_data.database_id, "")
}

output "endpoint" {
  description = "Redis endpoint"
  value       = try(local.redis_data.endpoint, "")
}

output "port" {
  description = "Redis port"
  value       = try(local.redis_data.port, 6379)
}

output "password" {
  description = "Redis password"
  value       = try(local.redis_data.password, "")
  sensitive   = true
}

output "connection_string" {
  description = "Redis connection string"
  value       = try("rediss://:${local.redis_data.password}@${local.redis_data.endpoint}:${local.redis_data.port}", "")
  sensitive   = true
}

output "rest_url" {
  description = "Upstash REST URL for HTTP access"
  value       = try(local.redis_data.rest_url, "")
}
