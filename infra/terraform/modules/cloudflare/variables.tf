variable "zone_id" {
  description = "Cloudflare Zone ID"
  type        = string
}

variable "domain_name" {
  description = "Domain name (e.g., chidionyema.dev)"
  type        = string
}

variable "api_hostname" {
  description = "Fly.io API hostname"
  type        = string
}

variable "pages_project_name" {
  description = "Cloudflare Pages project name"
  type        = string
  default     = "portfolio-site"
}
