# ============================================================================
# H2O Allegiant - Production Infrastructure
# ============================================================================
# Provider: AWS
# Region: us-east-1
# Managed by: Terraform
# ============================================================================

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state in S3 (run setup-backend.sh first)
  backend "s3" {
    bucket         = "h2o-terraform-state-prod"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "h2o-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "H2O Allegiant"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "DevOps"
    }
  }
}

# ============================================================================
# Data Sources
# ============================================================================

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# ============================================================================
# Local Variables
# ============================================================================

locals {
  name_prefix = "h2o-${var.environment}"

  azs = slice(data.aws_availability_zones.available.names, 0, 2)

  tags = {
    Project     = "H2O Allegiant"
    Environment = var.environment
  }
}

# ============================================================================
# Networking Module
# ============================================================================

module "networking" {
  source = "../../modules/networking"

  environment = var.environment
  name_prefix = local.name_prefix
  vpc_cidr    = var.vpc_cidr
  azs         = local.azs

  # Subnets
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs

  # NAT Gateway (expensive but necessary)
  enable_nat_gateway = var.enable_nat_gateway
  single_nat_gateway = var.environment != "prod" # Dev: 1 NAT, Prod: 2 NATs

  tags = local.tags
}

# ============================================================================
# Security Module (Security Groups)
# ============================================================================

module "security" {
  source = "../../modules/security"

  environment = var.environment
  name_prefix = local.name_prefix
  vpc_id      = module.networking.vpc_id

  tags = local.tags
}

# ============================================================================
# ECR (Docker Image Registry)
# ============================================================================

module "ecr" {
  source = "../../modules/ecr"

  environment = var.environment
  name_prefix = local.name_prefix

  # Image retention
  image_tag_mutability  = "MUTABLE"
  image_retention_count = 10 # Keep last 10 images

  tags = local.tags
}

# ============================================================================
# RDS PostgreSQL
# ============================================================================

module "rds" {
  source = "../../modules/rds"

  environment = var.environment
  name_prefix = local.name_prefix

  # Database config
  instance_class    = var.rds_instance_class
  allocated_storage = var.rds_allocated_storage
  engine_version    = "14.10"

  # Database credentials (from Secrets Manager)
  db_name     = var.db_name
  db_username = var.db_username
  # db_password generated automatically and stored in Secrets Manager

  # Network
  vpc_id             = module.networking.vpc_id
  subnet_ids         = module.networking.private_subnet_ids
  security_group_ids = [module.security.rds_security_group_id]

  # High availability
  multi_az                = var.environment == "prod"
  backup_retention_period = var.environment == "prod" ? 7 : 1

  # Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = local.tags
}

# ============================================================================
# ElastiCache Redis
# ============================================================================

module "elasticache" {
  source = "../../modules/elasticache"

  environment = var.environment
  name_prefix = local.name_prefix

  # Redis config
  node_type            = var.redis_node_type
  num_cache_nodes      = 1
  engine_version       = "6.x"
  parameter_group_name = "default.redis6.x"

  # Network
  vpc_id             = module.networking.vpc_id
  subnet_ids         = module.networking.private_subnet_ids
  security_group_ids = [module.security.redis_security_group_id]

  tags = local.tags
}

# ============================================================================
# S3 Bucket (PDF Storage)
# ============================================================================

module "s3" {
  source = "../../modules/s3"

  environment = var.environment
  name_prefix = local.name_prefix

  # Bucket config
  bucket_name = "${local.name_prefix}-storage"

  # Lifecycle rules
  enable_lifecycle_rule = true
  transition_days       = 90  # Move to Glacier after 90 days
  expiration_days       = 365 # Delete after 1 year

  # Versioning
  enable_versioning = var.environment == "prod"

  tags = local.tags
}

# ============================================================================
# Secrets Manager
# ============================================================================

module "secrets" {
  source = "../../modules/secrets"

  environment = var.environment
  name_prefix = local.name_prefix

  # Secrets to create
  secrets = {
    openai_api_key = {
      description = "OpenAI API Key for AI generation"
      value       = var.openai_api_key # Pass via tfvars or env
    }
    jwt_secret_key = {
      description = "JWT Secret Key for authentication"
      value       = var.jwt_secret_key
    }
    postgres_password = {
      description = "PostgreSQL master password"
      value       = module.rds.db_password # Auto-generated
    }
  }

  tags = local.tags
}

# ============================================================================
# ECS Fargate Cluster
# ============================================================================

module "ecs" {
  source = "../../modules/ecs"

  environment = var.environment
  name_prefix = local.name_prefix

  # Cluster
  cluster_name = "${local.name_prefix}-cluster"

  # Service
  service_name   = "${local.name_prefix}-backend"
  task_family    = "${local.name_prefix}-backend"
  container_name = "backend"

  # Task resources
  task_cpu    = var.ecs_task_cpu
  task_memory = var.ecs_task_memory

  # Container config
  container_image = "${module.ecr.repository_url}:latest"
  container_port  = 8000

  # Environment variables
  environment_variables = {
    ENVIRONMENT = var.environment
    DEBUG       = "false"
    LOG_LEVEL   = "INFO"

    # Database
    POSTGRES_SERVER = module.rds.db_endpoint
    POSTGRES_PORT   = "5432"
    POSTGRES_DB     = var.db_name
    POSTGRES_USER   = var.db_username

    # Redis
    REDIS_HOST = module.elasticache.redis_endpoint
    REDIS_PORT = "6379"
    REDIS_DB   = "0"

    # Storage
    USE_LOCAL_STORAGE = "false"
    S3_BUCKET         = module.s3.bucket_name
    S3_REGION         = var.aws_region

    # API
    API_V1_PREFIX = "/api/v1"
    BACKEND_URL   = "https://${var.domain_name}" # Update after ALB creation
    CORS_ORIGINS  = var.cors_origins
  }

  # Secrets (from Secrets Manager)
  secrets = {
    OPENAI_API_KEY    = module.secrets.secret_arns["openai_api_key"]
    SECRET_KEY        = module.secrets.secret_arns["jwt_secret_key"]
    POSTGRES_PASSWORD = module.secrets.secret_arns["postgres_password"]
  }

  # Network
  vpc_id             = module.networking.vpc_id
  subnet_ids         = module.networking.private_subnet_ids
  security_group_ids = [module.security.ecs_security_group_id]

  # Load balancer
  target_group_arn = module.alb.target_group_arn

  # Auto-scaling
  min_capacity        = var.ecs_min_capacity
  max_capacity        = var.ecs_max_capacity
  cpu_target_value    = 70 # Scale when CPU > 70%
  memory_target_value = 80 # Scale when Memory > 80%

  # Health check
  health_check_path         = "/health"
  health_check_grace_period = 60

  # Deployment
  deployment_maximum_percent         = 200 # Allow double capacity during deploy
  deployment_minimum_healthy_percent = 100 # Always keep 100% healthy

  tags = local.tags
}

# ============================================================================
# Application Load Balancer
# ============================================================================

module "alb" {
  source = "../../modules/alb"

  environment = var.environment
  name_prefix = local.name_prefix

  # ALB config
  alb_name = "${local.name_prefix}-alb"
  internal = false # Public-facing

  # Network
  vpc_id             = module.networking.vpc_id
  subnet_ids         = module.networking.public_subnet_ids
  security_group_ids = [module.security.alb_security_group_id]

  # Target group
  target_group_name = "${local.name_prefix}-tg"
  target_port       = 8000
  target_protocol   = "HTTP"

  # Health check
  health_check_path     = "/health"
  health_check_interval = 30
  health_check_timeout  = 5
  healthy_threshold     = 2
  unhealthy_threshold   = 3

  # HTTPS (update with ACM certificate ARN after domain setup)
  enable_https    = var.enable_https
  certificate_arn = var.acm_certificate_arn

  tags = local.tags
}

# ============================================================================
# CloudWatch Monitoring
# ============================================================================

module "monitoring" {
  source = "../../modules/monitoring"

  environment = var.environment
  name_prefix = local.name_prefix

  # ECS monitoring
  ecs_cluster_name = module.ecs.cluster_name
  ecs_service_name = module.ecs.service_name

  # RDS monitoring
  rds_instance_id = module.rds.db_instance_id

  # Redis monitoring
  redis_cluster_id = module.elasticache.redis_cluster_id

  # Alarms
  alarm_email = var.alarm_email

  # Thresholds
  ecs_cpu_threshold    = 80
  ecs_memory_threshold = 85
  rds_cpu_threshold    = 75

  tags = local.tags
}

# ============================================================================
# Outputs
# ============================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "alb_dns_name" {
  description = "ALB DNS name - use this as BACKEND_URL"
  value       = module.alb.alb_dns_name
}

output "ecr_repository_url" {
  description = "ECR repository URL for Docker images"
  value       = module.ecr.repository_url
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.db_endpoint
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.elasticache.redis_endpoint
}

output "s3_bucket_name" {
  description = "S3 bucket name"
  value       = module.s3.bucket_name
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = module.ecs.service_name
}

output "secret_arns" {
  description = "Secret ARNs in Secrets Manager"
  value       = module.secrets.secret_arns
  sensitive   = true
}
