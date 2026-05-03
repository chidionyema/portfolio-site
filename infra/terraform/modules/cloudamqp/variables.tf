variable "api_key" {
  description = "CloudAMQP API key"
  type        = string
  sensitive   = true
}

variable "instance_name" {
  description = "Name for the RabbitMQ instance"
  type        = string
  default     = "portfolio-mq"
}

variable "region" {
  description = "CloudAMQP region"
  type        = string
  default     = "amazon-web-services::eu-west-1"
}
