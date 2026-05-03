variable "api_key" {
  description = "Grafana Cloud API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stack_slug" {
  description = "Grafana Cloud stack slug"
  type        = string
  default     = ""
}
