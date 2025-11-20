# ============================================================================
# CloudWatch Monitoring & Alarms
# ============================================================================

# SNS Topic for alarms (prod only)
resource "aws_sns_topic" "alarms" {
  count = var.environment == "prod" ? 1 : 0
  name  = "${local.name_prefix}-alarms"

  tags = {
    Name = "${local.name_prefix}-alarms-topic"
  }
}

resource "aws_sns_topic_subscription" "alarms_email" {
  count     = var.environment == "prod" && var.alarm_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alarms[0].arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# -----------------------------------------------------------------------------
# ECS Alarms
# -----------------------------------------------------------------------------

# High CPU utilization
resource "aws_cloudwatch_metric_alarm" "ecs_high_cpu" {
  count               = var.environment == "prod" ? 1 : 0
  alarm_name          = "${local.name_prefix}-ecs-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS CPU > 80% for 10 minutes"
  alarm_actions       = [aws_sns_topic.alarms[0].arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.backend.name
  }
}

# High Memory utilization
resource "aws_cloudwatch_metric_alarm" "ecs_high_memory" {
  count               = var.environment == "prod" ? 1 : 0
  alarm_name          = "${local.name_prefix}-ecs-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "ECS Memory > 85% for 10 minutes"
  alarm_actions       = [aws_sns_topic.alarms[0].arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.backend.name
  }
}

# -----------------------------------------------------------------------------
# RDS Alarms
# -----------------------------------------------------------------------------

# High database CPU
resource "aws_cloudwatch_metric_alarm" "rds_high_cpu" {
  count               = var.environment == "prod" ? 1 : 0
  alarm_name          = "${local.name_prefix}-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 75
  alarm_description   = "RDS CPU > 75% for 10 minutes"
  alarm_actions       = [aws_sns_topic.alarms[0].arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
}

# Low database storage
resource "aws_cloudwatch_metric_alarm" "rds_low_storage" {
  count               = var.environment == "prod" ? 1 : 0
  alarm_name          = "${local.name_prefix}-rds-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5000000000 # 5 GB in bytes
  alarm_description   = "RDS free storage < 5 GB"
  alarm_actions       = [aws_sns_topic.alarms[0].arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
}

# -----------------------------------------------------------------------------
# ALB Alarms
# -----------------------------------------------------------------------------

# High 5xx errors
resource "aws_cloudwatch_metric_alarm" "alb_high_5xx" {
  count               = var.environment == "prod" ? 1 : 0
  alarm_name          = "${local.name_prefix}-alb-high-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB 5xx errors > 10 in 10 minutes"
  alarm_actions       = [aws_sns_topic.alarms[0].arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
}

# No healthy targets
resource "aws_cloudwatch_metric_alarm" "alb_no_healthy_targets" {
  count               = var.environment == "prod" ? 1 : 0
  alarm_name          = "${local.name_prefix}-alb-no-healthy-targets"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 1
  alarm_description   = "No healthy ECS tasks available"
  alarm_actions       = [aws_sns_topic.alarms[0].arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.backend.arn_suffix
  }
}
