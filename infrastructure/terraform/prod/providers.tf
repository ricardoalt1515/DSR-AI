# ============================================================================
# AWS Provider Configuration
# ============================================================================
# Provider config should ONLY be in root module, never in reusable modules
# Reference: AWS Best Practices 2025
# ============================================================================

provider "aws" {
  region = var.aws_region

  # Default tags applied to ALL resources (best practice 2025)
  default_tags {
    tags = {
      Project     = "DSR Waste Platform"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Repository  = "github.com/dsr-inc/waste-platform"
      Owner       = var.owner_email
    }
  }
}
