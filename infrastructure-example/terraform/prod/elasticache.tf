# ============================================================================
# ElastiCache Redis
# ============================================================================

# Subnet group for ElastiCache
resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.name_prefix}-redis-subnet"
  subnet_ids = aws_subnet.private[*].id

  description = "Subnet group for ElastiCache Redis"

  tags = {
    Name = "${local.name_prefix}-redis-subnet-group"
  }
}

# Redis cluster
resource "aws_elasticache_cluster" "main" {
  cluster_id           = "${local.name_prefix}-redis"
  engine               = "redis"
  engine_version       = "6.2"
  node_type            = var.redis_node_type
  num_cache_nodes      = 1
  parameter_group_name = "default.redis6.x"
  port                 = 6379

  # Network & Security
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.elasticache.id]

  # Maintenance
  maintenance_window = "sun:05:00-sun:06:00"
  snapshot_window    = "03:00-05:00"

  # Backups (prod only)
  snapshot_retention_limit = var.environment == "prod" ? 5 : 0

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  # Notifications via CloudWatch alarms (simpler)

  tags = {
    Name = "${local.name_prefix}-redis"
  }
}
