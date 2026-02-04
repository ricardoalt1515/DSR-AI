# ============================================================================
# S3 - Storage for PDF files
# ============================================================================

resource "aws_s3_bucket" "storage" {
  bucket = "${local.name_prefix}-storage"

  tags = {
    Name = "${local.name_prefix}-storage"
  }
}

# Versioning (recommended for production)
resource "aws_s3_bucket_versioning" "storage" {
  bucket = aws_s3_bucket.storage.id

  versioning_configuration {
    status = var.environment == "prod" ? "Enabled" : "Suspended"
  }
}

# Encryption at rest (AWS managed key)
resource "aws_s3_bucket_server_side_encryption_configuration" "storage" {
  bucket = aws_s3_bucket.storage.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access (security best practice)
resource "aws_s3_bucket_public_access_block" "storage" {
  bucket = aws_s3_bucket.storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle rule: Transition old PDFs to cheaper storage
resource "aws_s3_bucket_lifecycle_configuration" "storage" {
  bucket = aws_s3_bucket.storage.id

  rule {
    id     = "transition-old-pdfs"
    status = "Enabled"

    filter {} # Apply to all objects

    transition {
      days          = 90
      storage_class = "STANDARD_IA" # Infrequent Access (cheaper)
    }

    transition {
      days          = 180
      storage_class = "GLACIER_IR" # Glacier Instant Retrieval
    }

    expiration {
      days = 365 # Delete after 1 year
    }
  }
}

# CORS configuration (for presigned URLs from frontend)
resource "aws_s3_bucket_cors_configuration" "storage" {
  bucket = aws_s3_bucket.storage.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD", "PUT"]
    allowed_origins = split(",", var.cors_origins)
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}
