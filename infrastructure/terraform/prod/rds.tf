# ============================================================================
# RDS PostgreSQL
# ============================================================================

# Subnet group for RDS (must span multiple AZs)
resource "aws_db_subnet_group" "main" {
  name_prefix = "${local.name_prefix}-db-"
  subnet_ids  = aws_subnet.private[*].id
  description = "Subnet group for RDS PostgreSQL"

  tags = {
    Name = "${local.name_prefix}-db-subnet-group"
  }
}

# RDS Parameter Group (PostgreSQL 14 - using defaults)
resource "aws_db_parameter_group" "main" {
  name_prefix = "${local.name_prefix}-pg14-"
  family      = "postgres14"
  description = "Parameter group for PostgreSQL 14"

  # Using default parameters for MVP
  # Custom parameters can be added later via AWS Console if needed
  # Note: Some parameters like max_connections require DB reboot

  tags = {
    Name = "${local.name_prefix}-pg14-params"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier     = "${local.name_prefix}-db"
  engine         = "postgres"
  engine_version = "14.15"  # Latest 14.x version available

  # Instance configuration
  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3" # Latest generation, better performance
  storage_encrypted = true  # Encryption at rest

  # Database configuration
  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result
  port     = 5432

  # Network & Security
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # High Availability
  multi_az = var.db_multi_az

  # Backup & Maintenance
  backup_retention_period = var.environment == "prod" ? 7 : 1
  backup_window           = "03:00-04:00" # UTC
  maintenance_window      = "mon:04:00-mon:05:00"

  # Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  performance_insights_enabled    = var.environment == "prod"
  # monitoring_interval disabled (requires IAM role creation)
  # monitoring_interval = var.environment == "prod" ? 60 : 0

  # Parameter & Option Groups
  parameter_group_name = aws_db_parameter_group.main.name

  # Deletion protection
  deletion_protection       = var.environment == "prod"
  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${local.name_prefix}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  tags = {
    Name = "${local.name_prefix}-db"
  }

  lifecycle {
    ignore_changes = [
      password,                  # Managed by Secrets Manager
      final_snapshot_identifier, # Ignore timestamp changes
    ]
  }
}
