# ============================================================================
# AWS Secrets Manager
# ============================================================================
# Secure storage for sensitive configuration
# ============================================================================

# -----------------------------------------------------------------------------
# Database Password (auto-generated)
# -----------------------------------------------------------------------------

resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "aws_secretsmanager_secret" "db_password" {
  name_prefix             = "${local.name_prefix}-db-password-"
  description             = "PostgreSQL master password"
  recovery_window_in_days = 7 # Allow recovery for 7 days

  tags = {
    Name = "${local.name_prefix}-db-password"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

# -----------------------------------------------------------------------------
# OpenAI API Key
# -----------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "openai_api_key" {
  name_prefix             = "${local.name_prefix}-openai-key-"
  description             = "OpenAI API Key for AI generation"
  recovery_window_in_days = 7

  tags = {
    Name = "${local.name_prefix}-openai-key"
  }
}

resource "aws_secretsmanager_secret_version" "openai_api_key" {
  count         = var.manage_secret_values ? 1 : 0
  secret_id     = aws_secretsmanager_secret.openai_api_key.id
  secret_string = var.openai_api_key

  lifecycle {
    precondition {
      condition     = var.openai_api_key != ""
      error_message = "openai_api_key must be set when manage_secret_values=true."
    }
  }
}

# -----------------------------------------------------------------------------
# JWT Secret Key
# -----------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "jwt_secret" {
  name_prefix             = "${local.name_prefix}-jwt-secret-"
  description             = "JWT Secret Key for authentication"
  recovery_window_in_days = 7

  tags = {
    Name = "${local.name_prefix}-jwt-secret"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  count         = var.manage_secret_values ? 1 : 0
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret_key

  lifecycle {
    precondition {
      condition     = var.jwt_secret_key != ""
      error_message = "jwt_secret_key must be set when manage_secret_values=true."
    }
  }
}
