# ============================================================================
# Terraform & Provider Versions
# ============================================================================
# AWS Best Practice: Pin major + minor version, allow patch updates
# Reference: https://docs.aws.amazon.com/prescriptive-guidance/latest/
#            terraform-aws-provider-best-practices/version.html
# ============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0" # Allows 5.x, blocks 6.0
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Remote state backend (configured after initial setup)
  # Run: terraform init -backend-config=backend.hcl
  backend "s3" {
    # Values provided via backend.hcl file
    # bucket, key, region, dynamodb_table
  }
}
