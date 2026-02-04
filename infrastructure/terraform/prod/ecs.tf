# ============================================================================
# ECS Fargate - Container Orchestration
# ============================================================================

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${local.name_prefix}-backend"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name = "${local.name_prefix}-ecs-logs"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = var.environment == "prod" ? "enabled" : "disabled"
  }

  tags = {
    Name = "${local.name_prefix}-cluster"
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "backend" {
  family                   = "${local.name_prefix}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory

  # IAM roles
  execution_role_arn = aws_iam_role.ecs_task_execution.arn
  task_role_arn      = aws_iam_role.ecs_task.arn

  # Runtime platform (explicit for clarity and future ARM64/Graviton migration)
  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  # Container definition
  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = var.container_image
      essential = true

      portMappings = [
        {
          containerPort = 8000
          protocol      = "tcp"
        }
      ]

      # Environment variables (non-sensitive)
      environment = local.container_environment

      # Secrets (from Secrets Manager)
      secrets = local.container_secrets

      # Logging
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      # Health check
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "${local.name_prefix}-backend-task"
  }
}

# ECS Task Definition (Intake Worker)
resource "aws_ecs_task_definition" "intake_worker" {
  family                   = "${local.name_prefix}-intake-worker"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_worker_cpu
  memory                   = var.ecs_worker_memory

  # IAM roles
  execution_role_arn = aws_iam_role.ecs_task_execution.arn
  task_role_arn      = aws_iam_role.ecs_task.arn

  # Runtime platform (explicit for clarity and future ARM64/Graviton migration)
  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  # Container definition
  container_definitions = jsonencode([
    {
      name      = "intake-worker"
      image     = var.container_image
      essential = true

      # Environment variables (non-sensitive)
      environment = local.container_environment

      # Secrets (from Secrets Manager)
      secrets = local.container_secrets

      # Command override
      command = ["python", "/app/scripts/intake_ingestion_worker.py"]

      # Logging
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "worker"
        }
      }

      # Health check (ensure worker process is running)
      healthCheck = {
        command     = ["CMD", "python", "/app/scripts/healthcheck_intake_worker.py"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }
    }
  ])

  tags = {
    Name = "${local.name_prefix}-intake-worker-task"
  }
}

# ECS Service
resource "aws_ecs_service" "backend" {
  name                   = "${local.name_prefix}-backend"
  cluster                = aws_ecs_cluster.main.id
  task_definition        = aws_ecs_task_definition.backend.arn
  desired_count          = var.ecs_desired_count
  launch_type            = "FARGATE"
  enable_execute_command = true

  # Platform version (latest)
  platform_version = "LATEST"

  # Network configuration
  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false # Private subnets
  }

  # Load balancer integration
  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8000
  }

  # Deployment configuration
  deployment_maximum_percent         = 200 # Allow double capacity during deploy
  deployment_minimum_healthy_percent = 100 # Always keep 100% healthy

  # Circuit breaker (auto-rollback on failure)
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  # Health check grace period
  health_check_grace_period_seconds = 60

  # Tags propagation
  propagate_tags = "SERVICE"

  # Depends on ALB listener (use http which always exists)
  depends_on = [aws_lb_listener.http]

  tags = {
    Name = "${local.name_prefix}-backend-service"
  }

  lifecycle {
    ignore_changes = [
      desired_count, # Managed by auto-scaling
    ]
  }
}

# ECS Service (Intake Worker)
resource "aws_ecs_service" "intake_worker" {
  name                   = "${local.name_prefix}-intake-worker"
  cluster                = aws_ecs_cluster.main.id
  task_definition        = aws_ecs_task_definition.intake_worker.arn
  desired_count          = var.ecs_intake_worker_desired_count
  launch_type            = "FARGATE"
  enable_execute_command = true

  # Platform version (latest)
  platform_version = "LATEST"

  # Network configuration
  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false # Private subnets
  }

  # Deployment configuration
  deployment_maximum_percent         = 200 # Allow double capacity during deploy
  deployment_minimum_healthy_percent = 0   # Allow replacement when desired_count = 1

  # Circuit breaker (auto-rollback on failure)
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  # Tags propagation
  propagate_tags = "SERVICE"

  tags = {
    Name = "${local.name_prefix}-intake-worker-service"
  }

}

# -----------------------------------------------------------------------------
# Auto-Scaling
# -----------------------------------------------------------------------------

# Auto-scaling target
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = var.ecs_max_capacity
  min_capacity       = var.ecs_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Scale on CPU utilization
resource "aws_appautoscaling_policy" "ecs_cpu" {
  name               = "${local.name_prefix}-ecs-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = 70.0 # Scale when CPU > 70%
    scale_in_cooldown  = 300  # 5 min
    scale_out_cooldown = 60   # 1 min

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}

# Scale on memory utilization
resource "aws_appautoscaling_policy" "ecs_memory" {
  name               = "${local.name_prefix}-ecs-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = 80.0 # Scale when Memory > 80%
    scale_in_cooldown  = 300
    scale_out_cooldown = 60

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
  }
}
