# 🚀 DSR Waste Platform - AWS Infrastructure (Terraform)

## Overview

This directory contains production-grade Terraform configuration for deploying the DSR Waste Platform backend to AWS using ECS Fargate, RDS PostgreSQL, and ElastiCache Redis.

### Architecture

```
Internet
   ↓
Application Load Balancer (Public Subnets)
   ↓ (Port 8000)
ECS Fargate Backend Service (Private Subnets) ← Auto-scaling: 1-3 tasks
   ├→ RDS PostgreSQL (db.t4g.micro, Multi-AZ)
   ├→ ElastiCache Redis (cache.t4g.micro)
   └→ S3 (PDF Storage)

ECS Fargate Intake Worker Service (Private Subnets) ← Fixed count (1 task)
   ├→ RDS PostgreSQL
   ├→ ElastiCache Redis
   └→ S3 (PDF Storage)
```

### Resources Created (~30)

- **Networking**: VPC, 4 subnets, 2 NAT gateways, IGW, route tables
- **Compute**: ECS cluster, backend service + intake worker service, auto-scaling
- **Database**: RDS PostgreSQL 14 with Multi-AZ backup
- **Cache**: ElastiCache Redis 6.2
- **Storage**: S3 bucket (encrypted, versioned), ECR repository
- **Load Balancing**: ALB with health checks
- **Security**: 4 security groups, 2 IAM roles, Secrets Manager
- **Monitoring**: CloudWatch logs, dashboards, alarms

## Cost Estimate (Monthly)

| Component | Cost |
|-----------|------|
| **ECS Fargate** (2 backend + 1 worker, 1vCPU, 2GB) | $90 |
| **RDS PostgreSQL** (db.t4g.micro, Multi-AZ) | $32 |
| **ElastiCache Redis** (cache.t4g.micro) | $12 |
| **ALB** | $21 |
| **NAT Gateways** (2 AZs) | $64 |
| **S3 + ECR** | $5 |
| **CloudWatch + Secrets** | $5 |
| **Total Infrastructure** | **~$229/month** |
| **OpenAI API** (variable) | ~$50-200/month |
| **Total** | **~$279-429/month** |

## Prerequisites

### Local Setup

1. **Terraform** ≥ 1.5.0
   ```bash
   terraform --version  # >= 1.5.0
   ```

2. **AWS CLI** ≥ 2.0
   ```bash
   aws --version  # >= 2.0
   aws configure   # Set AWS credentials
   ```

3. **Tools**
   - `docker` (for building images)
   - `jq` (for parsing JSON)
   - `openssl` (for generating secrets)

### AWS Account

- AWS account with sufficient permissions
- VPC quota increased (if needed)
- IAM user with programmatic access

## Deployment Steps

### Step 1: Setup Terraform Backend (5 min)

Creates S3 bucket and DynamoDB table for state management:

```bash
cd infrastructure/scripts
./setup-backend.sh
```

This creates:
- S3 bucket: `dsr-waste-terraform-state-prod`
- DynamoDB table: `dsr-waste-terraform-locks`

### Step 2: Configure Terraform Variables (10 min)

```bash
cd infrastructure/terraform/prod

# Copy example files
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl

# Edit configuration
nano terraform.tfvars

# Update at minimum:
# - owner_email
# - alarm_email
# - cors_origins (your frontend URL)
```

### Step 3: Setup AWS Secrets (5 min)

Create OpenAI and JWT secrets:

```bash
# Set environment variables
export TF_VAR_openai_api_key="sk-proj-YOUR-KEY-HERE"
export TF_VAR_jwt_secret_key="$(openssl rand -hex 32)"

# Create secrets in AWS Secrets Manager
cd infrastructure/scripts
./setup-secrets.sh
```

### Step 4: Initialize Terraform (5 min)

```bash
cd infrastructure/terraform/prod

terraform init -backend-config=backend.hcl

# Expected output:
# ✅ Backend initialized (S3)
# ✅ Provider plugins installed
# ✅ Modules downloaded
```

### Step 5: Deploy Infrastructure (20 min)

```bash
# Validate configuration
terraform validate

# Review plan
terraform plan -out=tfplan

# Apply infrastructure
terraform apply tfplan

# ⏱️  This takes 15-20 minutes
# ECS, RDS, and other services are being created

# Save outputs
terraform output > outputs.txt
```

### Step 6: Build and Push Docker Image (10 min)

```bash
# Get ECR repository URL
ECR_URL=$(terraform output -raw ecr_repository_url)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_URL

# Build image
cd backend
docker build --platform linux/amd64 -t waste-platform-backend .

# Tag image
docker tag waste-platform-backend:latest $ECR_URL:latest

# Push to ECR
docker push $ECR_URL:latest

# Verify image
aws ecr describe-images --repository-name dsr-waste-platform-prod-backend
```

### Step 7: Update Terraform with Image URL (5 min)

```bash
cd infrastructure/terraform/prod

# Edit terraform.tfvars
nano terraform.tfvars

# Update container_image line:
# container_image = "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/dsr-waste-platform-prod-backend:latest"

# Apply changes (ECS performs rolling deployment)
terraform apply
```

### Step 8: Run Database Migrations (5 min)

```bash
# Get private subnet and security group IDs
SUBNET_ID=$(terraform output -json private_subnet_ids | jq -r '.[0]')
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=tag:Name,Values=*ecs-tasks*" \
  --query 'SecurityGroups[0].GroupId' --output text)

# Run migration task
aws ecs run-task \
  --cluster dsr-waste-platform-prod-cluster \
  --task-definition dsr-waste-platform-prod-backend \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SG_ID],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides": [{"name": "backend", "command": ["alembic", "upgrade", "head"]}]}'

# Wait for migration
aws logs tail /ecs/dsr-waste-platform-prod-backend --follow
```

### Step 9: Verify Deployment (5 min)

```bash
# Get ALB DNS
ALB_DNS=$(terraform output -raw alb_dns_name)

# Test health endpoint
curl http://$ALB_DNS/health

# Expected response:
# {
#   "status": "healthy",
#   "database": "ok",
#   "redis": "ok",
#   "environment": "prod"
# }

# View API documentation
open "http://$ALB_DNS/api/v1/docs"
```

## Configuration Details

### Environment Variables

The backend receives these from Terraform:

```
ENVIRONMENT=prod
DEBUG=false
LOG_LEVEL=INFO
POSTGRES_SERVER=<RDS endpoint>
POSTGRES_PORT=5432
POSTGRES_DB=dsr_waste_platform
POSTGRES_USER=waste_admin
POSTGRES_PASSWORD=<from Secrets Manager>
REDIS_HOST=<ElastiCache endpoint>
REDIS_PORT=6379
S3_BUCKET=<S3 bucket name>
S3_REGION=us-east-1
OPENAI_API_KEY=<from Secrets Manager>
OPENAI_MODEL=gpt-4o-mini
SECRET_KEY=<from Secrets Manager>
CORS_ORIGINS=<from terraform.tfvars>
BACKEND_URL=http://<ALB DNS>
```

### Security Groups

| Name | Inbound | Purpose |
|------|---------|---------|
| ALB | 80, 443 from 0.0.0.0/0 | Internet-facing load balancer |
| ECS Tasks | 8000 from ALB | Backend application |
| RDS | 5432 from ECS Tasks | Database access |
| Redis | 6379 from ECS Tasks | Cache access |

### Auto-Scaling

Backend ECS service auto-scales based on:
- **CPU Utilization**: Target 70%
- **Memory Utilization**: Target 80%
- **Min Tasks**: 1
- **Max Tasks**: 3
- **Scale-up Time**: ~3 minutes
- **Scale-down Time**: ~15 minutes

Intake worker runs as a separate ECS service with a fixed desired count.

### Monitoring & Alarms

CloudWatch alarms configured for:
- ECS CPU > 80%
- ECS Memory > 85%
- RDS CPU > 75%
- RDS Low Storage < 5GB
- ALB 5xx Errors > 10/10min
- No Healthy Targets

Email alerts sent to: `alarm_email` variable

## Day-to-Day Operations

### Deploy New Code

```bash
# 1. Build and push Docker image
cd backend
docker build --platform linux/amd64 -t waste-platform-backend .
docker tag waste-platform-backend:latest $ECR_URL:latest
docker push $ECR_URL:latest

# 2. Update ECS service (ECS auto-performs rolling deployment)
cd infrastructure/terraform/prod
terraform apply -var="container_image=$ECR_URL:latest" -auto-approve
```

### Update Infrastructure

```bash
cd infrastructure/terraform/prod

# Edit Terraform files
nano main.tf  # or any file

# Review changes
terraform plan

# Apply changes
terraform apply
```

### View Logs

```bash
# Real-time logs
aws logs tail /ecs/dsr-waste-platform-prod-backend --follow

# Filter errors
aws logs tail /ecs/dsr-waste-platform-prod-backend --follow --filter-pattern "ERROR"

# Last 100 lines
aws logs tail /ecs/dsr-waste-platform-prod-backend --since 1h
```

### Access Database

```bash
# Connect to RDS (from ECS task)
aws ecs execute-command \
  --cluster dsr-waste-platform-prod-cluster \
  --task TASK_ID \
  --container backend \
  --command "psql -h RDS_ENDPOINT -U waste_admin -d dsr_waste_platform"
```

## Troubleshooting

### ECS Tasks Not Starting

```bash
# Check stopped tasks
aws ecs list-tasks --cluster dsr-waste-platform-prod-cluster --desired-status STOPPED

# Describe task
aws ecs describe-tasks --cluster dsr-waste-platform-prod-cluster --tasks TASK_ARN

# Check logs
aws logs tail /ecs/dsr-waste-platform-prod-backend --follow

# Common issues:
# - Image pull error: Check ECR credentials and image exists
# - Health check failing: Verify /health endpoint works
# - Database connection: Check security group rules
```

### Database Connection Failed

```bash
# Verify security group allows ECS → RDS
aws ec2 describe-security-groups \
  --filters "Name=tag:Name,Values=*rds*"

# Test RDS connectivity
psql -h RDS_ENDPOINT -U waste_admin -d dsr_waste_platform
```

### High Costs

```bash
# Check spending by service
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE

# Cost optimization:
# - Scale down ECS tasks when not needed
# - Use VPC Endpoints instead of NAT (saves $32/month)
# - Enable RDS Single-AZ for non-prod (saves $15/month)
```

## Useful Commands

### Terraform

```bash
terraform output                          # Show all outputs
terraform output -raw alb_dns_name       # Get ALB DNS
terraform state list                      # List all resources
terraform state show aws_lb.main          # Show specific resource
terraform refresh                         # Refresh state
terraform plan -destroy                   # Plan destruction
terraform destroy                         # Destroy all resources
```

### AWS CLI

```bash
# ECS
aws ecs list-clusters
aws ecs describe-services --cluster dsr-waste-platform-prod-cluster
aws ecs list-tasks --cluster dsr-waste-platform-prod-cluster
aws ecs describe-tasks --cluster dsr-waste-platform-prod-cluster --tasks TASK_ARN

# ECS Force Deployment
aws ecs update-service \
  --cluster dsr-waste-platform-prod-cluster \
  --service dsr-waste-platform-prod-backend \
  --force-new-deployment

# CloudWatch
aws logs tail /ecs/dsr-waste-platform-prod-backend --follow
aws logs filter-log-events --log-group-name /ecs/dsr-waste-platform-prod-backend --filter-pattern "ERROR"

# RDS
aws rds describe-db-instances --db-instance-identifier dsr-waste-platform-prod-db

# S3
aws s3 ls s3://dsr-waste-platform-prod-storage

# ECR
aws ecr describe-images --repository-name dsr-waste-platform-prod-backend
```

## Best Practices

1. **State Management**
   - Always use remote state (S3)
   - Enable state locking (DynamoDB)
   - Backup state regularly
   - Never commit `.tfstate` files

2. **Secrets**
   - Never hardcode secrets
   - Use AWS Secrets Manager
   - Rotate secrets periodically
   - Use IAM-based access

3. **Monitoring**
   - Enable CloudWatch Logs
   - Configure alarms early
   - Monitor costs regularly
   - Review performance metrics

4. **High Availability**
   - Multi-AZ for RDS (production)
   - Auto-scaling for ECS
   - Health checks on ALB
   - Circuit breaker enabled

5. **Updates**
   - Test in dev first
   - Plan before applying
   - Use rolling deployments
   - Keep automatic rollback enabled

## FAQ

**Q: Can I use smaller instances to reduce cost?**
A: Yes, reduce `ecs_task_cpu` and `ecs_task_memory` in terraform.tfvars.

**Q: How do I enable HTTPS?**
A: Create ACM certificate, set `acm_certificate_arn` and `enable_https = true`.

**Q: How do I backup the database?**
A: RDS automatic backups are enabled. Configure retention in `rds.tf`.

**Q: Can I scale to multiple regions?**
A: Yes, create separate environments directory (prod-us-west-2, etc).

**Q: How do I destroy infrastructure?**
A: Run `terraform destroy` in infrastructure/terraform/prod/.

## Support

- Terraform AWS Provider: https://registry.terraform.io/providers/hashicorp/aws
- AWS Best Practices: https://docs.aws.amazon.com/prescriptive-guidance/
- ECS Fargate Guide: https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/

---

**Last Updated**: 2025-01-17
**Status**: ✅ Production Ready
**Total Time First Deploy**: ~75 minutes
