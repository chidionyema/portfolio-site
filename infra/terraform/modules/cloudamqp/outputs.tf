output "instance_id" {
  description = "CloudAMQP instance ID"
  value       = try(local.rabbitmq_data.id, "")
}

output "host" {
  description = "RabbitMQ host"
  value       = try(regex("@([^/]+)", local.rabbitmq_data.url)[0], "")
}

output "username" {
  description = "RabbitMQ username"
  value       = try(regex("amqps://([^:]+):", local.rabbitmq_data.url)[0], "")
}

output "password" {
  description = "RabbitMQ password"
  value       = try(regex(":([^@]+)@", local.rabbitmq_data.url)[0], "")
  sensitive   = true
}

output "vhost" {
  description = "RabbitMQ vhost"
  value       = try(regex("/([^/]+)$", local.rabbitmq_data.url)[0], "")
}

output "amqp_url" {
  description = "Full AMQP connection URL"
  value       = try(local.rabbitmq_data.url, "")
  sensitive   = true
}

output "management_url" {
  description = "RabbitMQ management UI URL"
  value       = try(local.rabbitmq_data.url_api, "")
}
