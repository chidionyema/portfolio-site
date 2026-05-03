output "app_name" {
  description = "Fly.io application name"
  value       = fly_app.app.name
}

output "app_id" {
  description = "Fly.io application ID"
  value       = fly_app.app.id
}

output "hostname" {
  description = "Fly.io hostname"
  value       = "${fly_app.app.name}.fly.dev"
}

output "internal_hostname" {
  description = "Internal hostname (for service-to-service)"
  value       = "${fly_app.app.name}.internal"
}

output "ipv4_address" {
  description = "Public IPv4 address"
  value       = var.internal ? null : try(fly_ip.ipv4[0].address, null)
}

output "ipv6_address" {
  description = "Public IPv6 address"
  value       = var.internal ? null : try(fly_ip.ipv6[0].address, null)
}

output "machine_ids" {
  description = "Machine IDs"
  value       = [for m in fly_machine.app : m.id]
}
