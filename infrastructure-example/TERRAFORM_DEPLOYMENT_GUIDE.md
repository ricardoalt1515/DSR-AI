# 🚀 Terraform Deployment Guide
## H2O Allegiant - Clean Infrastructure as Code (AWS Best Practices 2025)

---

## ✅ Lo Que Se Creó

### Estructura Limpia (NO Over-Modularizada)

Siguiendo **AWS Best Practices 2025**: "Don't wrap single resources"

```
infrastructure/terraform/prod/
├── versions.tf              # Terraform ~> 1.6, AWS provider ~> 5.0
├── providers.tf             # AWS config con default_tags
├── variables.tf             # 30+ variables con validación
├── locals.tf                # Valores computados limpios
├── main.tf                  # VPC, subnets, routing (130 líneas)
├── security_groups.tf       # 4 SGs granulares
├── ecr.tf                   # Docker registry
├── s3.tf                    # PDF storage con lifecycle
├── secrets.tf               # Secrets Manager (3 secrets)
├── rds.tf                   # PostgreSQL 14 optimizado
├── elasticache.tf           # Redis 6.2
├── iam.tf                   # Roles para ECS (least privilege)
├── ecs.tf                   # Fargate cluster + auto-scaling
├── alb.tf                   # Load balancer con HTTPS
├── cloudwatch.tf            # Monitoring + 6 alarms
├── outputs.tf               # 20+ outputs útiles
├── terraform.tfvars.example # Template de configuración
├── backend.hcl.example      # S3 backend config
├── README.md                # Documentación completa
└── .gitignore              # Protección de secretos
```

**Total**: ~1,200 líneas de Terraform limpio y mantenible

---

## 🎯 Filosofía de Diseño

### ✅ Best Practices Aplicadas

1. **No wrapped resources** - Todo en root module
2. **Organized by file** - Lógica agrupada, no nested modules
3. **Default tags** - Automático en provider
4. **Remote state** - S3 + DynamoDB locking
5. **Variable validation** - Fail fast en errores
6. **Secrets separation** - Nunca en código
7. **Security by default** - Encrypted, private, least privilege
8. **Cost optimization** - Lifecycle policies, right-sizing

### ❌ Anti-Patterns Evitados

1. ❌ Módulos que wrappean 1 recurso
2. ❌ Nested modules profundos (>2 niveles)
3. ❌ Hardcoded values
4. ❌ Secrets en código
5. ❌ Provider config en modules
6. ❌ Sin remote state
7. ❌ Sin variable validation

---

## 📊 Arquitectura Desplegada

```
Internet
   │
   ▼
┌─────────────────────────────────────────────┐
│ Application Load Balancer (Public Subnets) │
│ - HTTPS (443) → backend:8000                │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│ ECS Fargate (Private Subnets)                │
│ - Tasks: 1-3 (auto-scaling)                  │
│ - CPU: 2 vCPU, Memory: 4 GB                  │
│ - Timeout: 900s (15 min para AI)             │
│ - 6 Gunicorn workers                         │
└─┬─────────────┬────────────┬─────────────────┘
  │             │            │
  ▼             ▼            ▼
┌─────────┐ ┌─────────┐ ┌────────┐
│   RDS   │ │  Redis  │ │   S3   │
│PostgreSQL│ │ElastiCache│ │  PDFs  │
└─────────┘ └─────────┘ └────────┘
  (Multi-AZ)  (Single)    (Encrypted)
```

### Recursos Creados (~30)

- **Network**: VPC, 4 subnets, 2 NAT gateways, IGW, route tables
- **Compute**: ECS cluster, service, task definition, auto-scaling
- **Data**: RDS (PostgreSQL 14), ElastiCache (Redis 6.2)
- **Storage**: S3 bucket, ECR repository
- **Security**: 4 security groups, 2 IAM roles, 3 secrets
- **Load Balancing**: ALB, target group, 2 listeners
- **Monitoring**: CloudWatch log group, 6 alarms, SNS topic

---

## 🚀 Deployment Steps

### Paso 1: Setup Inicial (10 min)

```bash
# 1. Instalar Terraform
brew install terraform

# 2. Verificar versión
terraform version  # Should be >= 1.6.0

# 3. Configure AWS CLI
aws configure
# AWS Access Key ID: xxxxx
# AWS Secret Access Key: xxxxx
# Default region: us-east-1
# Default output format: json

# 4. Verificar credenciales
aws sts get-caller-identity
```

### Paso 2: Backend Setup (5 min)

```bash
# Crear S3 bucket para state
aws s3 mb s3://h2o-terraform-state-prod --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket h2o-terraform-state-prod \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket h2o-terraform-state-prod \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Create DynamoDB table for locking
aws dynamodb create-table \
  --table-name h2o-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Paso 3: Configuración (10 min)

```bash
cd infrastructure/terraform/prod

# Copy example files
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl

# Edit backend.hcl (ya tiene valores correctos, solo verificar)
nano backend.hcl

# Edit terraform.tfvars
nano terraform.tfvars

# Update these values:
# - owner_email
# - alarm_email
# - container_image (use placeholder first, update later)
# - cors_origins (your frontend domain)
# - domain_name (optional)

# Set secrets via environment variables
export TF_VAR_openai_api_key="sk-proj-YOUR-KEY-HERE"
export TF_VAR_jwt_secret_key="$(openssl rand -hex 32)"

# Verify secrets are set
echo $TF_VAR_openai_api_key | head -c 10  # Should show "sk-proj-xx"
```

### Paso 4: Deploy Infrastructure (20 min)

```bash
# Initialize Terraform
terraform init -backend-config=backend.hcl

# Expected output:
# ✅ Backend initialized (S3)
# ✅ Provider plugins installed
# ✅ Modules downloaded (if any)

# Validate configuration
terraform validate

# Expected: "Success! The configuration is valid."

# Review plan
terraform plan

# Expected: Plan to add ~30 resources

# Apply infrastructure
terraform apply

# Review changes, type "yes" when prompted
# ⏱️  Time: 15-20 minutes
```

### Paso 5: Verificar Deployment

```bash
# Check outputs
terraform output

# Key outputs:
# - alb_dns_name: Use this as BACKEND_URL
# - ecr_repository_url: For Docker push
# - rds_endpoint: Database connection
# - redis_endpoint: Cache connection

# Save important values
echo "export ALB_DNS=$(terraform output -raw alb_dns_name)" >> ~/.zshrc
echo "export ECR_URL=$(terraform output -raw ecr_repository_url)" >> ~/.zshrc
source ~/.zshrc
```

---

## 📦 First Application Deployment

### 1. Build & Push Docker Image

```bash
# Get ECR URL
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

# Verify image in ECR
aws ecr describe-images \
  --repository-name h2o-allegiant-prod-backend \
  --region us-east-1
```

### 2. Update Terraform with Image URL

```bash
cd ../infrastructure/terraform/prod

# Edit terraform.tfvars
nano terraform.tfvars

# Update container_image line:
container_image = "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/h2o-allegiant-prod-backend:latest"

# Apply changes
terraform apply

# This will update ECS service with new image
# ECS performs rolling deployment (zero downtime)
```

### 3. Run Database Migrations

```bash
# Get private subnet ID
SUBNET_ID=$(terraform output -json private_subnet_ids | jq -r '.[0]')

# Get ECS security group
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=h2o-allegiant-prod-ecs-tasks-*" \
  --query 'SecurityGroups[0].GroupId' --output text)

# Run migration task
aws ecs run-task \
  --cluster h2o-allegiant-prod-cluster \
  --task-definition h2o-allegiant-prod-backend \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SG_ID],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides": [{"name": "backend", "command": ["alembic", "upgrade", "head"]}]}'

# Wait for task to complete (~2 min)
# Check CloudWatch logs
aws logs tail /ecs/h2o-allegiant-prod-backend --follow
```

### 4. Verify Application

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

# Test API docs
open "http://$ALB_DNS/api/v1/docs"

# Should show Swagger UI
```

---

## 🔄 Day-to-Day Workflow

### Actualizar Código de Aplicación

```bash
# 1. Hacer cambios en código
git add backend/
git commit -m "feat: nueva feature"
git push origin main

# 2. GitHub Actions automáticamente:
#    ✅ Build Docker image
#    ✅ Push to ECR
#    ✅ Update ECS service
#    ✅ Rolling deployment

# 3. Monitorear deployment
gh run watch  # GitHub CLI

# O desde AWS Console:
open "https://console.aws.amazon.com/ecs/v2/clusters/h2o-allegiant-prod-cluster/services"
```

### Actualizar Infraestructura

```bash
# 1. Editar Terraform files
nano main.tf  # o cualquier archivo

# 2. Review changes
terraform plan

# 3. Apply changes
terraform apply

# ECS hace rolling deployment automáticamente
```

### Ver Logs

```bash
# Tail logs en tiempo real
aws logs tail /ecs/h2o-allegiant-prod-backend --follow

# Filtrar errores
aws logs tail /ecs/h2o-allegiant-prod-backend \
  --follow --filter-pattern "ERROR"

# Ver últimas 100 líneas
aws logs tail /ecs/h2o-allegiant-prod-backend --since 10m
```

---

## 💰 Costos Esperados

### Breakdown Mensual

```
Compute:
  ECS Fargate (2 tasks x 2vCPU x 4GB)    $60/mes
  
Data:
  RDS PostgreSQL (db.t4g.micro Multi-AZ)  $32/mes
  ElastiCache Redis (cache.t4g.micro)     $12/mes
  
Network:
  Application Load Balancer               $21/mes
  NAT Gateway (2 AZs)                     $64/mes
  Data Transfer                           $10/mes
  
Storage:
  S3 (10 GB + requests)                    $3/mes
  ECR (10 images)                          $1/mes
  
Monitoring & Security:
  CloudWatch Logs (5 GB)                   $3/mes
  Secrets Manager (3 secrets)              $2/mes
  
────────────────────────────────────────────
TOTAL Infrastructure:                   ~$208/mes

Application:
  OpenAI API (100 proposals x $0.50)     $50/mes
────────────────────────────────────────────
TOTAL:                                  ~$258/mes
```

### Optimizaciones Posibles

**Para Development** (-$80/mes):
- Single NAT Gateway: -$32/mes
- RDS Single-AZ: -$16/mes
- Smaller instances: -$20/mes
- Stop when not in use: -$12/mes
**Dev Total**: ~$128/mes

**Para Production**:
- Use VPC Endpoints (instead of NAT): Save $64/mes, cost $7/mes
- Reserved Instances (1 year): Save 30%
- S3 Intelligent Tiering: Save 20% on storage

---

## 🛠️ Comandos Útiles

### Terraform

```bash
# Ver todos los outputs
terraform output

# Output específico
terraform output -raw alb_dns_name

# Ver state
terraform state list

# Ver recurso específico
terraform state show aws_lb.main

# Refresh state
terraform refresh

# Import recurso existente
terraform import aws_instance.example i-1234567890
```

### AWS CLI

```bash
# ECS: Ver tasks
aws ecs list-tasks --cluster h2o-allegiant-prod-cluster

# ECS: Describe service
aws ecs describe-services \
  --cluster h2o-allegiant-prod-cluster \
  --services h2o-allegiant-prod-backend

# ECS: Force new deployment
aws ecs update-service \
  --cluster h2o-allegiant-prod-cluster \
  --service h2o-allegiant-prod-backend \
  --force-new-deployment

# CloudWatch: Ver logs
aws logs tail /ecs/h2o-allegiant-prod-backend --follow

# RDS: Describe instance
aws rds describe-db-instances \
  --db-instance-identifier h2o-allegiant-prod-db

# S3: List buckets
aws s3 ls

# Secrets: Get secret value
aws secretsmanager get-secret-value \
  --secret-id h2o-allegiant-prod-openai-key
```

---

## 🆘 Troubleshooting

### ECS Tasks No Inician

```bash
# Ver stopped tasks
aws ecs describe-tasks \
  --cluster h2o-allegiant-prod-cluster \
  --tasks $(aws ecs list-tasks --cluster h2o-allegiant-prod-cluster --desired-status STOPPED --query 'taskArns[0]' --output text)

# Common issues:
# 1. Image pull error
#    → Check ECR permissions
#    → Verify image exists: aws ecr describe-images --repository-name h2o-allegiant-prod-backend
#
# 2. Health check failing
#    → Check /health endpoint
#    → View logs: aws logs tail /ecs/h2o-allegiant-prod-backend --follow
#
# 3. Secrets access denied
#    → Check IAM task execution role
#    → Verify secrets exist: aws secretsmanager list-secrets
```

### Database Connection Failed

```bash
# Verify security group allows ECS → RDS
aws ec2 describe-security-groups \
  --group-ids $(terraform output -json security_groups | jq -r '.rds')

# Test connection from ECS task
aws ecs execute-command \
  --cluster h2o-allegiant-prod-cluster \
  --task TASK_ID \
  --container backend \
  --command "psql -h RDS_ENDPOINT -U h2o_admin -d h2o_allegiant"
```

### High Costs

```bash
# Get cost breakdown
aws ce get-cost-and-usage \
  --time-period Start=2025-10-01,End=2025-10-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE

# Top cost drivers:
# 1. NAT Gateway: $64/mes (consider VPC endpoints)
# 2. ECS Fargate: Scale down during off-hours
# 3. RDS: Right-size instance class
```

---

## 📚 Documentación de Referencia

- [Terraform prod/README.md](./prod/README.md) - Guía detallada
- [AWS Best Practices 2025](https://docs.aws.amazon.com/prescriptive-guidance/latest/terraform-aws-provider-best-practices/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [ECS Fargate Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)

---

## ✅ Checklist Final

**Antes de Deploy**:
- [x] Terraform instalado (>= 1.6.0)
- [x] AWS CLI configurado
- [x] S3 backend creado
- [x] DynamoDB table creado
- [x] terraform.tfvars configurado
- [x] Secrets exportados (TF_VAR_*)

**Después de Deploy**:
- [x] Infrastructure creada (terraform apply exitoso)
- [x] Docker image built & pushed
- [x] ECS service running
- [x] Database migrations ejecutadas
- [x] Health check passing
- [x] GitHub Actions configurado
- [x] CloudWatch alarms funcionando
- [x] Frontend apuntando a ALB DNS

---

## 🎉 Resultado Final

**Tienes**:
- ✅ Infraestructura completa en AWS
- ✅ Código limpio siguiendo best practices 2025
- ✅ No over-modularización
- ✅ Remote state con locking
- ✅ Auto-scaling configurado
- ✅ Monitoring & alarms
- ✅ CI/CD con GitHub Actions
- ✅ Zero-downtime deployments
- ✅ Documentación completa

**Tiempo total**: ~45 minutos primera vez, después solo `git push`

**Costo**: ~$258/mes (infrastructure + OpenAI)

---

**Infrastructure is code. Keep it simple, clean, and maintainable.** 🚀
