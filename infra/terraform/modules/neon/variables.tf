variable "project_name" {
  description = "Name for the Neon project"
  type        = string
}

variable "db_name" {
  description = "Name for the main database"
  type        = string
  default     = "portfolio"
}

variable "db_user" {
  description = "Database user name"
  type        = string
  default     = "portfolio_app"
}

variable "db_password" {
  description = "Database user password"
  type        = string
  sensitive   = true
}

variable "region" {
  description = "Neon region"
  type        = string
  default     = "aws-eu-west-1"
}
