# H2O Allegiant - Production Infrastructure (Terraform)

**Clean, simple Terraform following AWS 2025 best practices.**

## 🏗️ Architecture

- **NO over-modularization** (AWS Best Practice: "Don't wrap single resources")
- **Organized by logical files**, not nested modules  
- **All resources in root module** for simplicity
- **Default tags** applied automatically
- **Remote state** in S3 with locking

## 📁 File Structure

```
prod/
├── versions.tf         # Terraform & provider versions
├── providers.tf        # AWS provider config (default_tags)
├── variables.tf        # Input variables with validation
├── locals.tf           # Computed values & helpers
├── main.tf             # VPC, subnets, routing
├── security_groups.tf  # Security groups for all tiers
├── ecr.tf              # Docker image registry
├── s3.tf               # PDF storage bucket
├── secrets.tf          # Secrets Manager
├── rds.tf              # PostgreSQL database
├── elasticache.tf      # Redis cache
├── iam.tf              # IAM roles for ECS
├── ecs.tf              # ECS Fargate cluster & service
├── alb.tf              # Application Load Balancer
├── cloudwatch.tf       # Monitoring & alarms
└── outputs.tf          # Important values for deployment
```

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Install Terraform
brew install terraform  # macOS
# or download from: https://www.terraform.io/downloads

# Configure AWS CLI
aws configure

# Install required tools
brew install jq  # JSON processor
```

### 2. Setup Backend (One-time)

```bash
# Create S3 bucket for Terraform state
aws s3 mb s3://h2o-terraform-state-prod --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket h2o-terraform-state-prod \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for locking
aws dynamodb create-table \
  --table-name h2o-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 3. Configure Variables

```bash
# Copy example files
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl

# Edit terraform.tfvars with your values
nano terraform.tfvars

# Set secrets via environment variables
export TF_VAR_openai_api_key="sk-proj-xxxxx"
export TF_VAR_jwt_secret_key="$(openssl rand -hex 32)"
```

### 4. Initialize Terraform

```bash
terraform init -backend-config=backend.hcl
```

### 5. Deploy Infrastructure

```bash
# Review changes
terraform plan

# Apply (creates ~30 resources)
terraform apply

# Time: ~15-20 minutes
```

### 6. Get Outputs

```bash
# View all outputs
terraform output

# Get specific output
terraform output alb_dns_name
terraform output ecr_repository_url
```

## 📦 First Deployment

After infrastructure is created:

### 1. Build & Push Docker Image

```bash
# Get ECR login command from outputs
ECR_URL=$(terraform output -raw ecr_repository_url)

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_URL

# Build image
cd ../../../backend
docker build -t h2o-backend .

# Tag image
docker tag h2o-backend:latest $ECR_URL:latest

# Push to ECR
docker push $ECR_URL:latest
```

### 2. Update Container Image Variable

```bash
# Edit terraform.tfvars
container_image = "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/h2o-allegiant-prod-backend:latest"

# Apply changes
terraform apply
```

### 3. Run Database Migrations

```bash
# SSH into ECS task or run one-off task
aws ecs run-task \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --task-definition $(terraform output -raw ecs_task_definition_family) \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$(terraform output -json private_subnet_ids | jq -r '.[0]')],securityGroups=[sg-xxx]}" \
  --overrides '{"containerOverrides": [{"name": "backend", "command": ["alembic", "upgrade", "head"]}]}'
```

### 4. Verify Deployment

```bash
# Get ALB DNS
ALB_DNS=$(terraform output -raw alb_dns_name)

# Test health endpoint
curl https://$ALB_DNS/health

# Expected: {"status": "healthy", "database": "ok", "redis": "ok"}
```

## 🔄 Day-to-day Workflow

### Update Application Code

```bash
# 1. Make code changes, commit, push to GitHub
git push origin main

# 2. GitHub Actions automatically:
#    - Builds Docker image
#    - Pushes to ECR
#    - Updates ECS service
#    - Performs rolling deployment

# 3. Monitor deployment
aws ecs describe-services \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --services $(terraform output -raw ecs_service_name)
```

### Update Infrastructure

```bash
# 1. Edit Terraform files or terraform.tfvars
# 2. Review changes
terraform plan

# 3. Apply changes
terraform apply

# ECS services update with zero downtime (rolling deployment)
```

### View Logs

```bash
# Tail ECS logs
aws logs tail $(terraform output -raw cloudwatch_log_group) --follow

# Filter for errors
aws logs tail $(terraform output -raw cloudwatch_log_group) --follow --filter-pattern "ERROR"
```

## 📊 Monitoring

### CloudWatch Dashboards

- **ECS**: CPU, Memory, Task Count
- **RDS**: Connections, CPU, Storage
- **ALB**: Request Count, Error Rates, Target Health

### Alarms (Production Only)

- ECS High CPU (>80%)
- ECS High Memory (>85%)
- RDS High CPU (>75%)
- RDS Low Storage (<5GB)
- ALB 5xx Errors (>10 in 10min)
- No Healthy Targets

## 💰 Cost Estimate

```
ECS Fargate (2 tasks, 2 vCPU, 4GB):    ~$60/mes
RDS (db.t4g.micro, Multi-AZ):           $32/mes
ElastiCache (cache.t4g.micro):          $12/mes
S3 + ECR:                                $5/mes
ALB:                                    $21/mes
NAT Gateway (2 AZs):                    $64/mes
CloudWatch + Secrets:                    $5/mes
────────────────────────────────────────────
TOTAL Infrastructure:                  ~$199/mes
OpenAI (variable):                      $50/mes
────────────────────────────────────────────
TOTAL:                                 ~$249/mes
```

## 🛠️ Common Operations

### Scale ECS Tasks

```bash
# Manual scaling
aws ecs update-service \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --service $(terraform output -raw ecs_service_name) \
  --desired-count 4

# Or update terraform.tfvars:
ecs_desired_count = 4
terraform apply
```

### Force New Deployment

```bash
aws ecs update-service \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --service $(terraform output -raw ecs_service_name) \
  --force-new-deployment
```

### Connect to Database

```bash
# Get connection info
terraform output connection_info

# Connect with psql
psql $(terraform output -raw connection_info | jq -r '.database_url')
```

## 🆘 Troubleshooting

### ECS Tasks Not Starting

```bash
# Check task stopped reason
aws ecs describe-tasks \
  --cluster $(terraform output -raw ecs_cluster_name) \
  --tasks TASK_ID

# Common issues:
# - Image pull error → Check ECR permissions
# - Health check failing → Check /health endpoint
# - Secrets access denied → Check IAM task execution role
```

### Database Connection Issues

```bash
# Verify security group allows ECS → RDS
# Verify RDS endpoint in task definition
# Check Secrets Manager password
```

### High Costs

```bash
# Identify top costs
aws ce get-cost-and-usage \
  --time-period Start=2025-10-01,End=2025-10-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE

# Common culprits:
# - NAT Gateway data transfer
# - ECS Fargate over-provisioned
# - RDS instance too large
```

## 📚 Best Practices Applied

✅ **No wrapped resources** (AWS 2025 guideline)  
✅ **Default tags** at provider level  
✅ **Remote state** with locking  
✅ **Variable validation**  
✅ **Secrets in Secrets Manager**  
✅ **Security groups** with least privilege  
✅ **Encryption** at rest (RDS, S3)  
✅ **Multi-AZ** for high availability  
✅ **Auto-scaling** configured  
✅ **CloudWatch alarms** for monitoring  
✅ **Lifecycle policies** for cost optimization  

## 🔗 References

- [AWS Terraform Best Practices 2025](https://docs.aws.amazon.com/prescriptive-guidance/latest/terraform-aws-provider-best-practices/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [ECS Fargate Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)

---

**Infrastructure is code. Keep it clean, simple, and maintainable.**
