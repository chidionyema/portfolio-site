variable "api_key" {
  description = "Upstash API key"
  type        = string
  sensitive   = true
}

variable "email" {
  description = "Upstash account email"
  type        = string
}

variable "database_name" {
  description = "Name for the Redis database"
  type        = string
  default     = "portfolio-cache"
}

variable "region" {
  description = "Upstash region"
  type        = string
  default     = "eu-west-1"
}
