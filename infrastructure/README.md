# 🏗️ DSR Waste Platform - Infrastructure as Code

## Overview

This directory contains all infrastructure configuration for deploying DSR Waste Platform to AWS using Terraform and best practices for production-grade deployments.

## Directory Structure

```
infrastructure/
├── terraform/
│   └── prod/
│       ├── versions.tf              # Terraform & provider versions
│       ├── providers.tf             # AWS provider config
│       ├── variables.tf             # Input variables
│       ├── locals.tf                # Computed values
│       ├── main.tf                  # VPC & networking
│       ├── security_groups.tf       # 4 SGs (ALB, ECS, RDS, Redis)
│       ├── iam.tf                   # IAM roles & policies
│       ├── ecr.tf                   # Docker registry
│       ├── s3.tf                    # S3 storage
│       ├── secrets.tf               # Secrets Manager
│       ├── rds.tf                   # PostgreSQL database
│       ├── elasticache.tf           # Redis cache
│       ├── ecs.tf                   # ECS Fargate cluster
│       ├── alb.tf                   # Load balancer
│       ├── cloudwatch.tf            # Monitoring
│       ├── outputs.tf               # Output values
│       ├── terraform.tfvars.example # Example variables
│       ├── backend.hcl.example      # Example backend config
│       ├── README.md                # Detailed deployment guide
│       └── .gitignore               # Git ignore rules
└── scripts/
    ├── setup-backend.sh             # Setup S3 + DynamoDB
    ├── setup-secrets.sh             # Create AWS secrets
    └── README.md                    # Scripts documentation
```

## Quick Start

### 1. Setup Backend (5 min)

```bash
cd scripts
./setup-backend.sh
```

Creates S3 bucket and DynamoDB table for Terraform state.

### 2. Configure Variables (10 min)

```bash
cd terraform/prod
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars  # Edit your values
```

### 3. Setup Secrets (5 min)

```bash
export TF_VAR_openai_api_key="sk-proj-YOUR-KEY"
export TF_VAR_jwt_secret_key="$(openssl rand -hex 32)"

cd scripts
./setup-secrets.sh
```

### 4. Deploy Infrastructure (20 min)

```bash
cd terraform/prod
terraform init -backend-config=backend.hcl
terraform plan
terraform apply
```

### 5. Deploy Application (15 min)

```bash
# Build and push Docker image
cd backend
docker build --platform linux/amd64 -t waste-platform-backend .
docker tag waste-platform-backend:latest $ECR_URL:latest
docker push $ECR_URL:latest

# Update Terraform with image URL
cd ../infrastructure/terraform/prod
terraform apply

# Run migrations
./run-migrations.sh
```

### 6. Verify Deployment (5 min)

```bash
ALB_DNS=$(terraform output -raw alb_dns_name)
curl http://$ALB_DNS/health
```

## Architecture

### AWS Services

- **ECS Fargate**: Container orchestration (1-3 tasks)
- **RDS PostgreSQL**: Managed relational database
- **ElastiCache Redis**: In-memory cache for sessions
- **S3**: File storage for PDFs and assets
- **ECR**: Docker image registry
- **ALB**: Application Load Balancer
- **CloudWatch**: Logs, metrics, and alarms
- **Secrets Manager**: Secure secrets storage
- **VPC**: Network isolation (public + private subnets)

### High Availability

- **Multi-AZ**: Spread across 2 availability zones
- **Auto-scaling**: ECS scales 1-3 tasks based on CPU/memory
- **Health Checks**: ALB health checks + ECS health checks
- **Circuit Breaker**: Automatic rollback on deployment failure
- **Backups**: RDS automated backups (7 days)

## Cost

**Infrastructure**: ~$199/month
- ECS Fargate: $60
- RDS PostgreSQL: $32
- ElastiCache Redis: $12
- ALB + NAT: $85
- Storage + Monitoring: $10

**Application**: ~$50-200/month
- OpenAI API usage (variable)

**Total**: ~$249-399/month

## Prerequisites

- Terraform ≥ 1.5.0
- AWS CLI ≥ 2.0
- Docker (for building images)
- jq, openssl, git

## Deployment Time

- **First Deployment**: 75 minutes total
  - Backend setup: 5 min
  - Configuration: 10 min
  - Secrets setup: 5 min
  - Infrastructure: 20 min
  - Image build/push: 10 min
  - Application deploy: 15 min
  - Verification: 5 min

- **Subsequent Deployments**: 10-15 minutes
  - Code changes + git push
  - CI/CD pipeline auto-deploys (when configured)

## Files Reference

| File | Purpose |
|------|---------|
| `terraform/prod/README.md` | Comprehensive deployment guide |
| `scripts/setup-backend.sh` | Initialize Terraform state backend |
| `scripts/setup-secrets.sh` | Create AWS Secrets Manager entries |

## Common Tasks

### View Logs
```bash
aws logs tail /ecs/dsr-waste-platform-prod-backend --follow
```

### Deploy New Code
```bash
cd backend
docker build --platform linux/amd64 -t backend .
docker tag backend:latest $ECR_URL:latest
docker push $ECR_URL:latest
# ECS auto-deploys
```

### SSH to Database
```bash
# Temporarily enable public access in RDS
# Then: psql -h ENDPOINT -U waste_admin -d dsr_waste_platform
```

### Destroy All Resources
```bash
cd terraform/prod
terraform destroy
```

## Security

- ✅ No secrets in code (Secrets Manager)
- ✅ Private subnets for backend services
- ✅ Security groups with least privilege
- ✅ IAM roles with minimal permissions
- ✅ RDS encryption at rest
- ✅ S3 encryption + versioning
- ✅ ALB HTTPS ready
- ✅ CloudWatch monitoring

## Monitoring

Dashboard includes:
- ECS CPU/Memory utilization
- RDS connections and storage
- ALB request count and latency
- Error rates (4xx, 5xx)
- Healthy target count

Alarms configured for:
- High CPU (> 80%)
- High Memory (> 85%)
- Database issues
- Health check failures

## Troubleshooting

See `terraform/prod/README.md` Troubleshooting section for:
- ECS tasks not starting
- Database connection issues
- High costs
- Deployment failures

## Contact

For questions about infrastructure:
- Check the `terraform/prod/README.md` for detailed guide
- Review AWS documentation
- Check CloudWatch logs

---

**Status**: ✅ Production Ready
**Last Updated**: 2025-01-17
**Terraform Version**: >= 1.5.0
**AWS Provider Version**: ~> 5.0
