# ============================================================================
# ECR - Elastic Container Registry
# ============================================================================
# Docker image repository for backend container
# ============================================================================

resource "aws_ecr_repository" "backend" {
  name                 = "${local.name_prefix}-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true # Security best practice
  }

  encryption_configuration {
    encryption_type = "AES256" # Free encryption
  }

  tags = {
    Name = "${local.name_prefix}-backend-repo"
  }
}

# Lifecycle policy: Keep last 10 images, delete old ones
resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = {
        type = "expire"
      }
    }]
  })
}
