variable "app_name" {
  description = "Name for the Fly.io application"
  type        = string
}

variable "org" {
  description = "Fly.io organization"
  type        = string
  default     = "personal"
}

variable "region" {
  description = "Fly.io region"
  type        = string
  default     = "lhr"
}

variable "image" {
  description = "Docker image to deploy"
  type        = string
}

variable "internal" {
  description = "Whether this is an internal-only app (no public IP)"
  type        = bool
  default     = false
}

variable "machine_count" {
  description = "Number of machines to create"
  type        = number
  default     = 1
}

variable "cpus" {
  description = "Number of CPUs"
  type        = number
  default     = 1
}

variable "memory_mb" {
  description = "Memory in MB"
  type        = number
  default     = 256
}

variable "cpu_type" {
  description = "CPU type (shared or performance)"
  type        = string
  default     = "shared"
}

variable "env" {
  description = "Environment variables"
  type        = map(string)
  default     = {}
}

variable "services" {
  description = "Service configuration"
  type = list(object({
    internal_port = number
    protocol      = string
    ports = list(object({
      port     = number
      handlers = list(string)
    }))
  }))
  default = []
}
