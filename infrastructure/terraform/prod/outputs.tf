# ============================================================================
# Outputs
# ============================================================================
# Important values needed for deployment and configuration
# ============================================================================

# -----------------------------------------------------------------------------
# Network Outputs
# -----------------------------------------------------------------------------

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

# -----------------------------------------------------------------------------
# Compute Outputs
# -----------------------------------------------------------------------------

output "ecr_repository_url" {
  description = "ECR repository URL - use this to push Docker images"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.backend.name
}

output "ecs_intake_worker_service_name" {
  description = "ECS intake worker service name"
  value       = aws_ecs_service.intake_worker.name
}

output "ecs_task_definition_family" {
  description = "ECS task definition family"
  value       = aws_ecs_task_definition.backend.family
}

output "ecs_intake_worker_task_definition_family" {
  description = "ECS intake worker task definition family"
  value       = aws_ecs_task_definition.intake_worker.family
}

# -----------------------------------------------------------------------------
# Load Balancer Outputs
# -----------------------------------------------------------------------------

output "alb_dns_name" {
  description = "ALB DNS name - use this as BACKEND_URL"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "ALB hosted zone ID (for Route53)"
  value       = aws_lb.main.zone_id
}

output "alb_arn" {
  description = "ALB ARN"
  value       = aws_lb.main.arn
}

output "target_group_arn" {
  description = "Target group ARN"
  value       = aws_lb_target_group.backend.arn
}

# -----------------------------------------------------------------------------
# Database Outputs
# -----------------------------------------------------------------------------

output "rds_endpoint" {
  description = "RDS endpoint (includes port)"
  value       = aws_db_instance.main.endpoint
}

output "rds_address" {
  description = "RDS address (hostname only)"
  value       = aws_db_instance.main.address
}

output "rds_instance_id" {
  description = "RDS instance identifier"
  value       = aws_db_instance.main.id
}

output "db_name" {
  description = "Database name"
  value       = aws_db_instance.main.db_name
}

# -----------------------------------------------------------------------------
# Redis Outputs
# -----------------------------------------------------------------------------

output "redis_endpoint" {
  description = "Redis endpoint (includes port)"
  value       = "${aws_elasticache_cluster.main.cache_nodes[0].address}:${aws_elasticache_cluster.main.cache_nodes[0].port}"
}

output "redis_address" {
  description = "Redis address (hostname only)"
  value       = aws_elasticache_cluster.main.cache_nodes[0].address
}

# -----------------------------------------------------------------------------
# Storage Outputs
# -----------------------------------------------------------------------------

output "s3_bucket_name" {
  description = "S3 bucket name for PDF storage"
  value       = aws_s3_bucket.storage.id
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.storage.arn
}

# -----------------------------------------------------------------------------
# Secrets Outputs
# -----------------------------------------------------------------------------

output "secret_arns" {
  description = "Secret ARNs in Secrets Manager"
  value = {
    openai_api_key = aws_secretsmanager_secret.openai_api_key.arn
    jwt_secret     = aws_secretsmanager_secret.jwt_secret.arn
    db_password    = aws_secretsmanager_secret.db_password.arn
  }
  sensitive = true
}

# -----------------------------------------------------------------------------
# Monitoring Outputs
# -----------------------------------------------------------------------------

output "cloudwatch_log_group" {
  description = "CloudWatch log group for ECS"
  value       = aws_cloudwatch_log_group.ecs.name
}

output "sns_topic_arn" {
  description = "SNS topic ARN for alarms (prod only)"
  value       = var.environment == "prod" && var.alarm_email != "" ? aws_sns_topic.alarms[0].arn : null
}

# -----------------------------------------------------------------------------
# Deployment Info
# -----------------------------------------------------------------------------

output "deployment_summary" {
  description = "Quick reference for deployment"
  value = {
    # Docker commands
    ecr_login_command = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${aws_ecr_repository.backend.repository_url}"

    # Update ENV vars in Amplify with this URL
    backend_url = "https://${aws_lb.main.dns_name}"

    # ECS deployment
    ecs_update_command = "aws ecs update-service --cluster ${aws_ecs_cluster.main.name} --service ${aws_ecs_service.backend.name} --force-new-deployment"

    # View logs
    logs_command = "aws logs tail ${aws_cloudwatch_log_group.ecs.name} --follow"
  }
}

# -----------------------------------------------------------------------------
# Connection Strings (for local testing)
# -----------------------------------------------------------------------------

output "connection_info" {
  description = "Connection information for local testing"
  value = {
    database_url = "postgresql://${var.db_username}:PASSWORD@${aws_db_instance.main.endpoint}/${var.db_name}"
    redis_url    = "redis://${aws_elasticache_cluster.main.cache_nodes[0].address}:6379"
    s3_bucket    = aws_s3_bucket.storage.id
  }
  sensitive = true
}
