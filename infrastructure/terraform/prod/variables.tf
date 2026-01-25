# ============================================================================
# Input Variables
# ============================================================================
# Follow naming convention: lowercase with underscores
# Required vars have no default, optional vars have sensible defaults
# ============================================================================

# -----------------------------------------------------------------------------
# General Configuration
# -----------------------------------------------------------------------------

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (prod, staging, dev)"
  type        = string

  validation {
    condition     = contains(["prod", "staging", "dev"], var.environment)
    error_message = "Environment must be prod, staging, or dev."
  }
}

variable "project_name" {
  description = "Project name used in resource naming"
  type        = string
  default     = "dsr-waste-platform"
}

variable "owner_email" {
  description = "Email of infrastructure owner (for tagging)"
  type        = string
}

# -----------------------------------------------------------------------------
# Network Configuration
# -----------------------------------------------------------------------------

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

# -----------------------------------------------------------------------------
# ECS Fargate Configuration
# -----------------------------------------------------------------------------

variable "ecs_task_cpu" {
  description = "CPU units for ECS task (1024 = 1 vCPU)"
  type        = number
  default     = 1024 # 1 vCPU (optimized for MVP, scale up based on metrics)

  validation {
    condition     = contains([256, 512, 1024, 2048, 4096], var.ecs_task_cpu)
    error_message = "Valid CPU values: 256, 512, 1024, 2048, 4096."
  }
}

variable "ecs_task_memory" {
  description = "Memory for ECS task in MB"
  type        = number
  default     = 2048 # 2 GB (optimized for MVP, scale up based on metrics)

  validation {
    condition     = var.ecs_task_memory >= 512 && var.ecs_task_memory <= 30720
    error_message = "Memory must be between 512 MB and 30 GB."
  }
}

variable "ecs_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 2
}

variable "ecs_intake_worker_desired_count" {
  description = "Desired number of intake worker tasks"
  type        = number
  default     = 1
}

variable "ecs_min_capacity" {
  description = "Minimum number of ECS tasks (auto-scaling)"
  type        = number
  default     = 1
}

variable "ecs_max_capacity" {
  description = "Maximum number of ECS tasks (auto-scaling)"
  type        = number
  default     = 3
}

variable "container_image" {
  description = "Docker image URL for backend container"
  type        = string
  default     = "public.ecr.aws/docker/library/nginx:alpine" # Placeholder, update after ECR push
}

# -----------------------------------------------------------------------------
# Database Configuration
# -----------------------------------------------------------------------------

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 20
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "dsr_waste_platform"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "waste_admin"
}

variable "db_multi_az" {
  description = "Enable Multi-AZ for RDS (prod only)"
  type        = bool
  default     = false # Set to true in prod terraform.tfvars
}

# -----------------------------------------------------------------------------
# Redis Configuration
# -----------------------------------------------------------------------------

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t4g.micro"
}

# -----------------------------------------------------------------------------
# Domain & SSL Configuration
# -----------------------------------------------------------------------------

variable "domain_name" {
  description = "Domain name for ALB (optional)"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS (optional)"
  type        = string
  default     = ""
}

variable "enable_https" {
  description = "Enable HTTPS listener on ALB"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Monitoring Configuration
# -----------------------------------------------------------------------------

variable "alarm_email" {
  description = "Email for CloudWatch alarms"
  type        = string
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets (required for Fargate)"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Application Configuration
# -----------------------------------------------------------------------------

variable "cors_origins" {
  description = "Allowed CORS origins (comma-separated)"
  type        = string
  default     = "http://localhost:3000"
}

# -----------------------------------------------------------------------------
# Secrets (via environment variables)
# -----------------------------------------------------------------------------
# NEVER commit secrets to git
# Set via: export TF_VAR_openai_api_key="sk-xxx"
# Or use AWS Secrets Manager ARN
# -----------------------------------------------------------------------------

variable "openai_api_key" {
  description = "OpenAI API key (pass via TF_VAR_openai_api_key)"
  type        = string
  sensitive   = true
}

variable "jwt_secret_key" {
  description = "JWT secret key (pass via TF_VAR_jwt_secret_key)"
  type        = string
  sensitive   = true
}
