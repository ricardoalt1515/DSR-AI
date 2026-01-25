# H2O Allegiant - AWS Infrastructure (Terraform)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS CLOUD (us-east-1)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌─────────────────┐                 │
│  │  Route 53    │──────│  CloudFront     │                 │
│  │  (DNS)       │      │  (CDN)          │                 │
│  └──────────────┘      └────────┬────────┘                 │
│                                  │                           │
│         ┌────────────────────────┴────────────────┐         │
│         │                                          │         │
│         ▼                                          ▼         │
│  ┌─────────────────┐                    ┌─────────────────┐│
│  │  AWS Amplify    │                    │  ALB (Public)   ││
│  │  (Frontend)     │                    │  Port 443       ││
│  └─────────────────┘                    └────────┬────────┘│
│                                                   │          │
│                                                   ▼          │
│                                         ┌─────────────────┐ │
│                                         │  ECS Fargate    │ │
│                                         │  (Backend)      │ │
│                                         │                 │ │
│                                         │  ┌───────────┐  │ │
│                                         │  │ Task 1    │  │ │
│                                         │  │ (API)     │  │ │
│                                         │  │ 6 workers │  │ │
│                                         │  └───────────┘  │ │
│                                         │  ┌───────────┐  │ │
│                                         │  │ Task 2... │  │ │
│                                         │  └───────────┘  │ │
│                                         └────┬──────┬─────┘ │
│                                              │      │        │
│              ┌───────────────────────────────┘      │        │
│              ▼                                      ▼        │
│  ┌─────────────────────┐              ┌─────────────────┐  │
│  │  RDS PostgreSQL     │              │  ElastiCache    │  │
│  │  (Private Subnet)   │              │  Redis          │  │
│  │  - Multi-AZ         │              │  (Private)      │  │
│  └─────────────────────┘              └─────────────────┘  │
│              │                                              │
│              ▼                                              │
│  ┌─────────────────────┐              ┌─────────────────┐  │
│  │  S3 Bucket          │              │  CloudWatch     │  │
│  │  (PDFs)             │              │  (Logs/Metrics) │  │
│  └─────────────────────┘              └─────────────────┘  │
│                                                              │
│  ┌─────────────────────┐              ┌─────────────────┐  │
│  │  Secrets Manager    │              │  ECR            │  │
│  │  (API Keys)         │              │  (Docker Images)│  │
│  └─────────────────────┘              └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components

### Network Layer
- **VPC**: Custom VPC with public/private subnets
- **Subnets**: 2 AZs (us-east-1a, us-east-1b)
  - Public: ALB, NAT Gateway
  - Private: ECS Tasks, RDS, Redis
- **Security Groups**: Granular firewall rules

### Compute Layer
- **ECS Fargate**: Serverless container orchestration
  - Service: `h2o-backend-service`
  - Task Definition: 2 vCPU, 4 GB RAM, 6 workers
  - Auto-scaling: 1-3 tasks based on CPU/Memory
  - Health checks: `/health` endpoint

### Data Layer
- **RDS PostgreSQL**: Managed database
  - Instance: db.t4g.micro
  - Multi-AZ: Yes (production)
  - Backup: 7 days retention
  
- **ElastiCache Redis**: Managed cache
  - Node: cache.t4g.micro
  - For: Job status, rate limiting (future)

### Storage Layer
- **S3**: PDF storage with lifecycle policies
- **ECR**: Docker image registry

### Monitoring & Secrets
- **CloudWatch**: Logs, metrics, alarms
- **Secrets Manager**: API keys, passwords
- **X-Ray** (optional): Distributed tracing

## Directory Structure

```
infrastructure/
├── terraform/
│   ├── environments/
│   │   ├── dev/
│   │   │   ├── main.tf
│   │   │   ├── terraform.tfvars
│   │   │   └── backend.tf
│   │   └── prod/
│   │       ├── main.tf
│   │       ├── terraform.tfvars
│   │       └── backend.tf
│   ├── modules/
│   │   ├── networking/
│   │   ├── ecs/
│   │   ├── rds/
│   │   ├── elasticache/
│   │   ├── s3/
│   │   ├── secrets/
│   │   └── monitoring/
│   └── README.md (this file)
├── docker/
│   └── (Dockerfiles already in backend/)
└── scripts/
    ├── deploy.sh
    └── rollback.sh
```

## Prerequisites

1. **AWS CLI** configured
   ```bash
   aws configure
   ```

2. **Terraform** installed
   ```bash
   brew install terraform  # macOS
   # or
   wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
   ```

3. **Docker** running (for building images)

4. **GitHub** repository access

## Quick Start

### 1. Initialize Terraform

```bash
cd infrastructure/terraform/prod
terraform init
```

### 2. Review Plan

```bash
terraform plan
```

### 3. Apply Infrastructure

```bash
terraform apply
```

**Time**: ~15-20 minutes for full deployment

### 4. Deploy Application

```bash
# Build and push Docker image
cd ../../../../backend
./scripts/deploy.sh prod
```

## Deploy Workflow (Day-to-day)

### After Setup (Just Git Push!)

```bash
# 1. Make code changes
git add .
git commit -m "feat: new feature"
git push origin main

# 2. GitHub Actions automatically:
#    - Builds Docker image
#    - Pushes to ECR
#    - Updates ECS service
#    - Performs rolling deployment

# 3. Monitor deployment
aws ecs describe-services --cluster h2o-prod --services h2o-backend
```

**That's it!** As simple as Amplify.

## Cost Breakdown

### Development Environment
```
ECS Fargate (1 task, 2 vCPU, 4GB): ~$30/mes
RDS (db.t4g.micro):                 $15/mes
ElastiCache (cache.t4g.micro):      $12/mes
S3 + ECR:                            $5/mes
NAT Gateway:                        $32/mes (can disable in dev)
────────────────────────────────────────
TOTAL (dev):                        ~$94/mes
```

### Production Environment
```
ECS Fargate (2-3 tasks):           ~$60-90/mes
RDS (db.t4g.small, Multi-AZ):       $60/mes
ElastiCache (cache.t4g.small):      $24/mes
S3 + ECR:                           $10/mes
ALB:                                $16/mes
NAT Gateway (2 AZs):                $64/mes
CloudWatch:                          $5/mes
────────────────────────────────────────
TOTAL (prod):                      ~$239/mes
```

**Note**: NAT Gateway is expensive but necessary for private subnets. Alternative: VPC Endpoints (+$7/mes each, cheaper for high traffic).

## Terraform State Management

### Backend Configuration

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "h2o-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

**Why S3 backend?**
- Team collaboration (shared state)
- State locking (prevents conflicts)
- Versioning (rollback capability)

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend to ECS

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - Build Docker image
      - Push to ECR
      - Update ECS task definition
      - Deploy to ECS
      - Wait for stable deployment
      - Run smoke tests
```

**Features**:
- ✅ Automatic on push to main
- ✅ Rolling deployment (zero downtime)
- ✅ Automatic rollback on failure
- ✅ Slack notifications

## Monitoring

### CloudWatch Dashboards

1. **ECS Metrics**
   - CPU/Memory utilization
   - Task count
   - Target tracking

2. **RDS Metrics**
   - Connections
   - Query performance
   - Storage

3. **Application Metrics**
   - API latency
   - Error rates
   - AI generation duration

### Alarms

```
High CPU (ECS):       > 80% for 5 min
High Memory (ECS):    > 85% for 5 min
High Error Rate:      > 1% for 5 min
RDS Connections:      > 80 connections
Slow Queries:         > 1s average
```

## Rollback Strategy

### Automatic Rollback (via ECS)

```bash
# If new deployment fails health checks, ECS automatically rolls back
# No action needed!
```

### Manual Rollback

```bash
# Option 1: Rollback to previous task definition
aws ecs update-service \
  --cluster h2o-prod \
  --service h2o-backend \
  --task-definition h2o-backend:123  # Previous version

# Option 2: Via GitHub Actions (revert commit)
git revert HEAD
git push origin main
```

## Security Best Practices

1. **Secrets Management**
   - All secrets in AWS Secrets Manager
   - No secrets in code or Terraform
   - Automatic rotation enabled

2. **Network Security**
   - Private subnets for all data services
   - Security groups with least privilege
   - HTTPS only (no HTTP)

3. **IAM Roles**
   - Task execution role (pull image, logs)
   - Task role (access S3, Secrets Manager)
   - Principle of least privilege

4. **Encryption**
   - RDS: Encrypted at rest
   - S3: Server-side encryption
   - Secrets Manager: KMS encryption

## Troubleshooting

### Common Issues

**Issue**: Task fails to start
```bash
# Check logs
aws logs tail /aws/ecs/h2o-backend --follow

# Check task stopped reason
aws ecs describe-tasks --cluster h2o-prod --tasks TASK_ID
```

**Issue**: Database connection fails
```bash
# Verify security group allows ECS -> RDS
# Verify connection string in Secrets Manager
```

**Issue**: High costs
```bash
# Check NAT Gateway usage (biggest cost)
# Consider VPC Endpoints
# Review CloudWatch metrics for idle resources
```

## Maintenance

### Database Migrations

```bash
# Run migrations via ECS one-off task
aws ecs run-task \
  --cluster h2o-prod \
  --task-definition h2o-backend \
  --overrides '{"containerOverrides": [{"name": "backend", "command": ["alembic", "upgrade", "head"]}]}'
```

### Scaling

```bash
# Manual scale (for load testing)
aws ecs update-service \
  --cluster h2o-prod \
  --service h2o-backend \
  --desired-count 5
```

## Next Steps

1. ✅ Review this architecture
2. ✅ Customize terraform.tfvars
3. ✅ Run terraform apply
4. ✅ Setup GitHub Actions
5. ✅ Deploy application
6. ✅ Configure monitoring
7. ✅ Test end-to-end

## Support

- **Terraform Docs**: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- **ECS Best Practices**: https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/
- **AWS Well-Architected**: https://aws.amazon.com/architecture/well-architected/
