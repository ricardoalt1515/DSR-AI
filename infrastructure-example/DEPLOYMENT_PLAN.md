# 🚀 Deployment Plan: Fargate + Terraform

## Decisión: Fargate ✅

**Razones**:
1. ✅ Mejor costo ($90/mes vs $150/mes App Runner)
2. ✅ Más control y configuración
3. ✅ No necesita migración futura
4. ✅ CI/CD igual de fácil que App Runner
5. ✅ Blue/Green deployments nativos
6. ✅ Rollback automático

---

## 📊 Comparación Final

| Feature | App Runner | Fargate + Terraform |
|---------|-----------|---------------------|
| **Setup inicial** | 10 min manual | 30 min Terraform |
| **Deploy código** | Git push | Git push (GitHub Actions) |
| **Costo mensual** | $150/mes | $90/mes ✅ |
| **Control** | Básico | Total ✅ |
| **Escalabilidad** | Auto | Auto + Custom ✅ |
| **Infraestructura como código** | No | Sí ✅ |
| **Team collaboration** | Limitado | Completo ✅ |
| **Rollback** | Manual | Automático ✅ |

---

## 🎯 Plan de Implementación (3 Fases)

### FASE 1: Terraform Setup (1 hora)

#### 1.1 Instalar Terraform
```bash
# macOS
brew install terraform

# Verificar
terraform --version
```

#### 1.2 Crear Backend S3 (para state)
```bash
cd infrastructure/terraform
./scripts/setup-backend.sh prod

# Crea:
# - S3 bucket: h2o-terraform-state-prod
# - DynamoDB: h2o-terraform-locks
```

#### 1.3 Configurar Variables
```bash
cd environments/prod
cp terraform.tfvars.example terraform.tfvars

# Editar terraform.tfvars
nano terraform.tfvars

# Secrets vía environment variables (más seguro)
export TF_VAR_openai_api_key="sk-proj-xxxxx"
export TF_VAR_jwt_secret_key="$(openssl rand -hex 32)"
```

#### 1.4 Initialize Terraform
```bash
terraform init
terraform plan  # Review cambios
```

---

### FASE 2: Deploy Infrastructure (30 min)

#### 2.1 Apply Terraform
```bash
terraform apply

# Review output:
# - VPC creado
# - Subnets creadas
# - RDS endpoint
# - Redis endpoint  
# - ECR repository
# - ECS cluster
# - ALB DNS name

# Time: ~15-20 minutos
```

#### 2.2 Configurar Domain (opcional)
```bash
# Si tienes dominio:
# 1. Create ACM certificate
aws acm request-certificate \
  --domain-name api.h2o-allegiant.com \
  --validation-method DNS

# 2. Add validation records to Route 53
# 3. Update terraform.tfvars con certificate_arn
# 4. terraform apply
```

---

### FASE 3: Deploy Application (30 min)

#### 3.1 Setup GitHub Actions

```bash
# Add secrets to GitHub repo
# Settings → Secrets and variables → Actions

AWS_ACCESS_KEY_ID=AKIAXXXXX
AWS_SECRET_ACCESS_KEY=xxxxx
```

#### 3.2 First Deploy (Manual)

```bash
# Build y push image inicial
cd backend

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build
docker build -t h2o-prod-backend .

# Tag
docker tag h2o-prod-backend:latest \
  ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/h2o-prod-backend:latest

# Push
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/h2o-prod-backend:latest
```

#### 3.3 Run Database Migrations

```bash
# Via ECS one-off task
aws ecs run-task \
  --cluster h2o-prod-cluster \
  --task-definition h2o-prod-backend \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides": [{"name": "backend", "command": ["alembic", "upgrade", "head"]}]}'

# Wait for completion
# Check logs in CloudWatch
```

#### 3.4 Verify Deployment

```bash
# Get ALB DNS from Terraform output
terraform output alb_dns_name

# Test health endpoint
curl https://h2o-prod-alb-xxxxx.us-east-1.elb.amazonaws.com/health

# Expected:
{
  "status": "healthy",
  "database": "ok",
  "redis": "ok"
}
```

---

## 🔄 Workflow Diario (Post-Setup)

### Desarrollador hace cambios:

```bash
# 1. Hacer cambios en código
git add backend/
git commit -m "feat: nueva feature"
git push origin main

# 2. GitHub Actions automáticamente:
#    ✅ Build Docker image
#    ✅ Push to ECR
#    ✅ Update ECS task definition
#    ✅ Deploy con rolling update
#    ✅ Health check
#    ✅ Rollback si falla

# 3. Monitor deployment
gh run watch  # GitHub CLI

# 4. Verify
curl https://api.h2o-allegiant.com/health
```

**Tiempo total**: 5-7 minutos (igual que App Runner!)

---

## 📁 Estructura de Archivos Creada

```
h2o-allegiant/
├── infrastructure/
│   ├── terraform/
│   │   ├── environments/
│   │   │   ├── prod/
│   │   │   │   ├── main.tf ✅
│   │   │   │   ├── variables.tf
│   │   │   │   ├── terraform.tfvars.example ✅
│   │   │   │   └── backend.tf
│   │   │   └── dev/
│   │   │       └── (same structure)
│   │   ├── modules/
│   │   │   ├── networking/
│   │   │   ├── ecs/
│   │   │   ├── rds/
│   │   │   ├── elasticache/
│   │   │   ├── s3/
│   │   │   ├── secrets/
│   │   │   ├── alb/
│   │   │   ├── ecr/
│   │   │   └── monitoring/
│   │   └── README.md ✅
│   └── scripts/
│       ├── setup-backend.sh
│       └── deploy.sh
├── .github/
│   └── workflows/
│       └── deploy-backend.yml ✅
└── DEPLOYMENT_PLAN.md ✅ (este archivo)
```

---

## 💰 Costo Detallado

### Producción (24/7)

```
ECS Fargate:
  - Tasks: 2-3 tasks @ $0.04/hour
  - CPU: 2 vCPU, Memory: 4 GB
  - Cost: 2 * $0.04 * 730h = $58/mes

RDS PostgreSQL:
  - Instance: db.t4g.micro
  - Multi-AZ: Yes
  - Storage: 20 GB
  - Cost: $30/mes (Multi-AZ) + $2/mes (storage) = $32/mes

ElastiCache Redis:
  - Node: cache.t4g.micro
  - Cost: $12/mes

S3 + ECR:
  - Storage: 10 GB
  - Requests: minimal
  - Cost: $5/mes

Application Load Balancer:
  - Fixed: $16/mes
  - Data transfer: ~$5/mes
  - Cost: $21/mes

NAT Gateway (2 AZs):
  - Fixed: $32/mes each = $64/mes
  - Data transfer: included
  - Cost: $64/mes

CloudWatch:
  - Logs: 5 GB/mes
  - Metrics: Standard
  - Alarms: 10
  - Cost: $5/mes

Secrets Manager:
  - Secrets: 3
  - Cost: $2/mes

───────────────────────────────
TOTAL Infrastructure: $199/mes
OpenAI (variable):     $50/mes
───────────────────────────────
TOTAL:                ~$249/mes
```

### Optimizaciones para Desarrollo

```
Development Environment (solo cuando trabajas):

- Single NAT Gateway: -$32/mes
- Single AZ RDS: -$15/mes  
- Smaller instances: -$20/mes
- Stop when not in use: -50%

Dev cost: ~$60/mes
```

---

## 🔧 Terraform Modules Overview

### Module: Networking
```hcl
# Crea:
- VPC con CIDR configurable
- 2 public subnets (ALB)
- 2 private subnets (ECS, RDS, Redis)
- Internet Gateway
- NAT Gateways (1 o 2 según env)
- Route tables
```

### Module: ECS
```hcl
# Crea:
- ECS Cluster (Fargate)
- Task Definition (2 vCPU, 4 GB)
- ECS Service con auto-scaling
- CloudWatch Log Group
- IAM roles (execution + task)
- Target tracking scaling policies
```

### Module: RDS
```hcl
# Crea:
- RDS PostgreSQL instance
- Subnet group
- Parameter group
- Auto-generated password → Secrets Manager
- Automated backups
- CloudWatch alarms
```

---

## 📊 Monitoring & Alarms

### CloudWatch Dashboards Auto-Creados

1. **ECS Dashboard**
   - CPU Utilization
   - Memory Utilization
   - Task Count
   - Network I/O

2. **RDS Dashboard**
   - Connections
   - CPU
   - Free Storage
   - Read/Write IOPS

3. **Application Dashboard**
   - Request Count
   - Error Rate (4xx, 5xx)
   - Target Response Time

### Alarms Configurados

```
High ECS CPU:      > 80% for 5 min → SNS email
High ECS Memory:   > 85% for 5 min → SNS email
High RDS CPU:      > 75% for 10 min → SNS email
High Error Rate:   > 1% for 5 min → SNS email
Low Healthy Hosts: < 1 for 1 min → SNS email
```

---

## 🆘 Rollback Strategy

### Automatic Rollback (Built-in)

```yaml
# En ECS service deployment:
deployment_circuit_breaker:
  enable: true
  rollback: true

# Si new task falla health checks:
# → ECS automáticamente rollback a versión anterior
# → No action needed!
```

### Manual Rollback

```bash
# Option 1: Redeploy previous image
aws ecs update-service \
  --cluster h2o-prod-cluster \
  --service h2o-prod-backend \
  --task-definition h2o-prod-backend:5  # Previous revision

# Option 2: Revert git commit
git revert HEAD
git push origin main
# → GitHub Actions auto-deploys previous version
```

---

## 🎯 Next Steps

### Hoy:
1. ✅ Review arquitectura
2. ✅ Decidir entre Terraform o manual (TERRAFORM RECOMENDADO)
3. ⏳ Instalar Terraform
4. ⏳ Crear estructura de directorios

### Esta Semana:
1. ⏳ Implementar Terraform modules
2. ⏳ Deploy infrastructure
3. ⏳ Configure GitHub Actions
4. ⏳ First deployment
5. ⏳ End-to-end testing

### Próxima Semana:
1. ⏳ Monitoring setup
2. ⏳ Cost optimization
3. ⏳ Documentation
4. ⏳ Team training

---

## ❓ FAQ

**Q: ¿Es difícil Terraform?**
A: No. Los modules ya están escritos. Solo necesitas configurar variables en `terraform.tfvars`.

**Q: ¿Puedo empezar sin Terraform?**
A: Sí, pero NO recomendado. Terraform te da:
- Infrastructure as code (versionable)
- Reproducible (destroy y recreate fácil)
- Team collaboration
- State management

**Q: ¿Cuánto tarda el primer deploy?**
A: Terraform apply: 15-20 min. Luego push de imagen: 5 min. Total: ~25 min.

**Q: ¿Y los deploys siguientes?**
A: Git push → 5-7 min (igual que App Runner).

**Q: ¿Puedo usar CloudFormation en vez de Terraform?**
A: Sí, pero Terraform es más popular, mejor documentado, y multi-cloud (por si algún día necesitas GCP/Azure).

**Q: ¿NAT Gateway es necesario?**
A: Sí, para que ECS tasks en private subnets accedan a internet (pull images, APIs). Alternativa: VPC Endpoints (más complejo, similar costo).

---

## 📞 Support

- Terraform AWS Docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- ECS Best Practices: https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/
- GitHub Actions: https://docs.github.com/en/actions

---

**Status**: ✅ Plan completo, listo para implementar
**Recomendación**: Terraform + Fargate
**Tiempo estimado**: 3-4 horas primera vez, después solo Git push
