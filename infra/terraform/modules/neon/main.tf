# =============================================================================
# Neon PostgreSQL Module
# =============================================================================
# Creates a Neon project with database and role
# Free tier: 0.5GB storage, 1 project, branching
# =============================================================================

terraform {
  required_providers {
    neon = {
      source  = "kislerdm/neon"
      version = "~> 0.2"
    }
  }
}

# Create Neon project
resource "neon_project" "main" {
  name      = var.project_name
  region_id = var.region
}

# Get the default branch
data "neon_branch" "main" {
  project_id = neon_project.main.id
  name       = "main"
}

# Create database
resource "neon_database" "app" {
  project_id = neon_project.main.id
  branch_id  = data.neon_branch.main.id
  name       = var.db_name
  owner_name = "neondb_owner"
}

# Create application role
resource "neon_role" "app" {
  project_id = neon_project.main.id
  branch_id  = data.neon_branch.main.id
  name       = var.db_user
}

# Create schemas for bounded contexts
resource "neon_database" "schemas" {
  for_each = toset(["catalog", "orders", "payments", "content", "identity"])

  project_id = neon_project.main.id
  branch_id  = data.neon_branch.main.id
  name       = each.key
  owner_name = neon_role.app.name

  depends_on = [neon_role.app]
}
