# ============================================================================
# Application Load Balancer
# ============================================================================

# ALB
resource "aws_lb" "main" {
  name_prefix        = substr("${var.project_name}-", 0, 6) # Max 6 chars for prefix
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  # Enable deletion protection in prod
  enable_deletion_protection = var.environment == "prod"

  # Access logs (optional, requires S3 bucket)
  # access_logs {
  #   bucket  = aws_s3_bucket.alb_logs.id
  #   enabled = true
  # }

  tags = {
    Name = "${local.name_prefix}-alb"
  }
}

# Target Group
resource "aws_lb_target_group" "backend" {
  name_prefix = substr("${local.name_prefix}-", 0, 6)
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip" # Required for Fargate

  # Health check
  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 3
  }

  # Deregistration delay (lower for faster deployments)
  deregistration_delay = 30

  tags = {
    Name = "${local.name_prefix}-backend-tg"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# -----------------------------------------------------------------------------
# Listeners
# -----------------------------------------------------------------------------

# HTTPS Listener (primary)
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06" # Latest TLS policy
  certificate_arn   = var.acm_certificate_arn != "" ? var.acm_certificate_arn : null

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  # Skip if no certificate provided
  count = var.enable_https && var.acm_certificate_arn != "" ? 1 : 0

  tags = {
    Name = "${local.name_prefix}-https-listener"
  }
}

# HTTP Listener (redirect to HTTPS or forward if no SSL)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = var.enable_https && var.acm_certificate_arn != "" ? "redirect" : "forward"

    # Redirect to HTTPS if certificate exists
    dynamic "redirect" {
      for_each = var.enable_https && var.acm_certificate_arn != "" ? [1] : []
      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }

    # Forward to target group if no SSL
    target_group_arn = var.enable_https && var.acm_certificate_arn != "" ? null : aws_lb_target_group.backend.arn
  }

  tags = {
    Name = "${local.name_prefix}-http-listener"
  }
}
