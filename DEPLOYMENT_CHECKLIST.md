# ✅ DSR Waste Platform - Deployment Checklist

## Pre-Deployment Checklist

### Verificar Requisitos
- [ ] AWS Account creado y activo
- [ ] AWS CLI instalado (`aws --version`)
- [ ] AWS CLI configurado (`aws configure`)
- [ ] Terraform >= 1.5.0 instalado (`terraform --version`)
- [ ] Docker instalado (`docker --version`)
- [ ] Git configurado (`git config user.name`)
- [ ] OpenAI API Key obtenida
- [ ] Editor de texto disponible (nano, vim, vscode)
- [ ] Terminal con bash disponible

### Credenciales & Secretos
- [ ] AWS credentials en `~/.aws/credentials`
- [ ] OpenAI API Key (sk-proj-...)
- [ ] JWT Secret Key será generado automáticamente
- [ ] DB Password será generado automáticamente

### Permisos AWS
- [ ] Permiso para crear VPC
- [ ] Permiso para crear RDS
- [ ] Permiso para crear ECS
- [ ] Permiso para crear ECR
- [ ] Permiso para crear S3
- [ ] Permiso para crear Secrets Manager
- [ ] Permiso para crear IAM roles
- [ ] Permiso para crear CloudWatch
- [ ] Permiso para crear ALB

---

## Step 1: Terraform Backend Setup

**Tiempo: 5 min | Ubicación: infrastructure/scripts/**

```bash
cd infrastructure/scripts
./setup-backend.sh
```

### Checklist
- [ ] Script ejecutado sin errores
- [ ] S3 bucket creado: `dsr-waste-terraform-state-prod`
- [ ] DynamoDB table creada: `dsr-waste-terraform-locks`
- [ ] Versioning habilitado en S3
- [ ] Encryption habilitado en S3
- [ ] Public access bloqueado en S3

### Verificación
```bash
aws s3 ls | grep dsr-waste-terraform-state-prod
aws dynamodb list-tables | grep dsr-waste-terraform-locks
```

---

## Step 2: Configure Terraform Variables

**Tiempo: 10 min | Ubicación: infrastructure/terraform/prod/**

```bash
cd infrastructure/terraform/prod
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars
```

### Valores a Actualizar (REQUERIDO)
- [ ] `owner_email` = tu email (ejemplo: `tu-email@empresa.com`)
- [ ] `alarm_email` = email para alertas (mismo o diferente)
- [ ] `environment` = "prod"
- [ ] `project_name` = "dsr-waste-platform" (ya está, solo verifica)

### Valores a Revisar (OPCIONAL)
- [ ] `aws_region` = "us-east-1" (cambiar si quieres otra región)
- [ ] `vpc_cidr` = "10.0.0.0/16" (cambiar si conflicto)
- [ ] `ecs_task_cpu` = 1024 (1 vCPU, OK para MVP)
- [ ] `ecs_task_memory` = 2048 (2 GB, OK para MVP)
- [ ] `ecs_desired_count` = 2 (2 tareas, OK para HA)
- [ ] `db_instance_class` = "db.t4g.micro" (OK para MVP)
- [ ] `db_multi_az` = true (HA para prod, recomendado)

### Verificación
```bash
grep "owner_email\|alarm_email" terraform.tfvars
# Debería mostrar los emails que ingresaste
```

---

## Step 3: Setup AWS Secrets

**Tiempo: 5 min | Ubicación: infrastructure/scripts/**

```bash
# Set environment variables
export TF_VAR_openai_api_key="sk-proj-YOUR-ACTUAL-KEY-HERE"
export TF_VAR_jwt_secret_key="$(openssl rand -hex 32)"

# Verify they're set
echo $TF_VAR_openai_api_key    # Should show sk-proj-...
echo $TF_VAR_jwt_secret_key    # Should show long hex

# Create secrets
cd infrastructure/scripts
./setup-secrets.sh
```

### Checklist
- [ ] OpenAI API key correctly copied (check first 10 chars)
- [ ] JWT secret generated (32 chars hex)
- [ ] Script ran without errors
- [ ] Saw "Secrets setup complete!"

### Verificación
```bash
aws secretsmanager list-secrets --query 'SecretList[?contains(Name, `dsr-waste-platform`)]'
# Debería mostrar 3 secretos:
# - dsr-waste-platform-prod-openai-key
# - dsr-waste-platform-prod-jwt-secret
# - dsr-waste-platform-prod-db-password
```

---

## Step 4: Initialize & Plan Terraform

**Tiempo: 5 min | Ubicación: infrastructure/terraform/prod/**

```bash
cd infrastructure/terraform/prod

# Copy backend config
cp backend.hcl.example backend.hcl

# Initialize Terraform
terraform init -backend-config=backend.hcl

# Validate configuration
terraform validate

# Plan infrastructure
terraform plan -out=tfplan
```

### Checklist
- [ ] `terraform init` completó sin errores
- [ ] Backend inicializado (S3)
- [ ] Plugins descargados
- [ ] `terraform validate` pasó
- [ ] `terraform plan` completó sin errores
- [ ] Plan muestra ~30 resources para crear

### Verificación
```bash
terraform plan -json | jq '.resource_changes | length'
# Debería mostrar ~30
```

---

## Step 5: Deploy Infrastructure

**Tiempo: 20 min | Ubicación: infrastructure/terraform/prod/**

```bash
terraform apply tfplan
```

⏱️ **Espera 15-20 minutos. NO interrumpas este paso.**

### Checklist
- [ ] ECS cluster creado
- [ ] RDS PostgreSQL iniciando (toma más tiempo)
- [ ] ElastiCache Redis creado
- [ ] S3 bucket creado
- [ ] ECR repository creado
- [ ] Security groups creados
- [ ] ALB creado
- [ ] CloudWatch logs creados
- [ ] IAM roles creados
- [ ] Terraform output completó

### Verificación
```bash
terraform output  # Debería mostrar ~20 outputs

# Especialmente:
terraform output -raw alb_dns_name  # Get ALB URL
terraform output -raw ecr_repository_url  # Get ECR URL
```

### Guardar Información
```bash
terraform output > outputs.txt
cat outputs.txt

# Copiar estos valores:
ALB_DNS=$(terraform output -raw alb_dns_name)
ECR_URL=$(terraform output -raw ecr_repository_url)
echo "ALB: $ALB_DNS"
echo "ECR: $ECR_URL"
```

---

## Step 6: Build & Push Docker Image

**Tiempo: 10 min | Ubicación: backend/**

```bash
# Get ECR URL
ECR_URL=$(cd ../infrastructure/terraform/prod && terraform output -raw ecr_repository_url)
echo "ECR URL: $ECR_URL"

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_URL

# Navigate to backend
cd backend

# Build image (IMPORTANT: specify platform for Fargate)
docker build --platform linux/amd64 -t waste-platform-backend .

# Tag image
docker tag waste-platform-backend:latest $ECR_URL:latest

# Push to ECR
docker push $ECR_URL:latest
```

### Checklist
- [ ] ECR login exitoso
- [ ] Docker build completó sin errores
- [ ] Image tagueada correctamente
- [ ] Docker push completó
- [ ] Última línea mostró: `latest: digest: sha256:...`

### Verificación
```bash
aws ecr describe-images \
  --repository-name dsr-waste-platform-prod-backend \
  --query 'imageDetails[0].{pushed:imagePushedAt,size:imageSizeBytes}'
```

---

## Step 7: Update Terraform with Image

**Tiempo: 5 min | Ubicación: infrastructure/terraform/prod/**

```bash
cd infrastructure/terraform/prod

# Get Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Account ID: $ACCOUNT_ID"

# Edit terraform.tfvars
nano terraform.tfvars

# Find the line: container_image = "public.ecr..."
# Replace with: container_image = "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/dsr-waste-platform-prod-backend:latest"
# Replace ACCOUNT_ID with the actual ID from above

# Apply changes
terraform apply -auto-approve
```

### Checklist
- [ ] terraform.tfvars editado correctamente
- [ ] Account ID insertado en container_image
- [ ] No hay comillas faltantes
- [ ] `terraform apply` completó sin errores
- [ ] ECS service actualizado
- [ ] Rolling deployment inició

### Verificación
```bash
# Check ECS service status
aws ecs describe-services \
  --cluster dsr-waste-platform-prod-cluster \
  --services dsr-waste-platform-prod-backend \
  --query 'services[0].{desiredCount:desiredCount,runningCount:runningCount}'

# Should show: desiredCount: 2, runningCount: 1-2 (transitioning)
# Wait 3-5 minutes for rolling deployment to complete
```

---

## Step 8: Run Database Migrations

**Tiempo: 5 min | Ubicación: infrastructure/terraform/prod/**

```bash
# Get IDs needed
SUBNET_ID=$(terraform output -json private_subnet_ids | jq -r '.[0]')
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=tag:Name,Values=*ecs-tasks*" \
  --query 'SecurityGroups[0].GroupId' --output text)

echo "Subnet: $SUBNET_ID"
echo "Security Group: $SG_ID"

# Run migration task
aws ecs run-task \
  --cluster dsr-waste-platform-prod-cluster \
  --task-definition dsr-waste-platform-prod-backend \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SG_ID],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides": [{"name": "backend", "command": ["alembic", "upgrade", "head"]}]}'

# Watch logs
aws logs tail /ecs/dsr-waste-platform-prod-backend --follow

# Look for:
# "Running upgrade ... "
# "Upgrading complete" or similar success message
```

### Checklist
- [ ] Subnet ID obtenido correctamente
- [ ] Security Group ID obtenido correctamente
- [ ] Task launched exitosamente
- [ ] Logs showing "Running upgrade"
- [ ] No errores en migration
- [ ] Logs showing task completado

### Esperado
```
INFO  [alembic.runtime.migration] Running upgrade ...
INFO  [alembic.runtime.migration] Running upgrade 001 -> ...
...
INFO  [alembic.runtime.migration] Running upgrade XXX -> YYY
DONE: All migrations complete
```

---

## Step 9: Verify Deployment

**Tiempo: 5 min | Ubicación: infrastructure/terraform/prod/**

```bash
# Get ALB DNS
ALB_DNS=$(terraform output -raw alb_dns_name)
echo "ALB URL: http://$ALB_DNS"

# Test health endpoint
curl http://$ALB_DNS/health

# Open API docs in browser
echo "API Docs: http://$ALB_DNS/api/v1/docs"

# Test registration endpoint
curl -X POST http://$ALB_DNS/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'
```

### Checklist
- [ ] ALB DNS obtenido
- [ ] Health endpoint responde 200 OK
- [ ] Respuesta contiene `"status": "healthy"`
- [ ] Respuesta contiene `"database": "ok"`
- [ ] Respuesta contiene `"redis": "ok"`
- [ ] API docs URL abre en navegador
- [ ] API docs muestra endpoints
- [ ] Register endpoint responde (201 o validación)

### Esperado
```json
{
  "status": "healthy",
  "database": "ok",
  "redis": "ok",
  "environment": "prod"
}
```

---

## 🎉 Post-Deployment

### Información Importante

```bash
# Guarda estos valores para el futuro:
terraform output > deployment_outputs.txt
cat deployment_outputs.txt

# Especialmente:
ALB_DNS=$(terraform output -raw alb_dns_name)
echo "Backend URL: http://$ALB_DNS"

# Para frontend, usar:
echo "API_BASE_URL=http://$ALB_DNS/api/v1"
```

### Siguientes Pasos

- [ ] Configurar CORS en el frontend
- [ ] Deploy del frontend (Amplify o similar)
- [ ] Testear flujos end-to-end
- [ ] Configurar SSL/HTTPS (opcional)
- [ ] Configurar dominio personalizado (opcional)
- [ ] Revisar CloudWatch logs y dashboards
- [ ] Pruebas de carga
- [ ] Backup del state de Terraform

---

## 🆘 Troubleshooting Quick Guide

### Problema: "terraform init" falla
**Solución:**
```bash
# Verifica backend.hcl existe
ls backend.hcl

# Verifica S3 bucket existe
aws s3 ls | grep dsr-waste-terraform-state

# Intenta init de nuevo
terraform init -backend-config=backend.hcl
```

### Problema: "Error: InvalidParameterException" en RDS
**Solución:**
- RDS tarda tiempo en crear (puede ser normal)
- Espera 5 minutos
- Chequea logs: `aws rds describe-events`

### Problema: "Docker login failed"
**Solución:**
```bash
# Verifica AWS credentials
aws sts get-caller-identity

# Re-login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_URL
```

### Problema: "ECS tasks not running"
**Solución:**
```bash
# Check task status
aws ecs list-tasks --cluster dsr-waste-platform-prod-cluster
aws ecs describe-tasks --cluster dsr-waste-platform-prod-cluster --tasks <TASK_ARN>

# Check logs
aws logs tail /ecs/dsr-waste-platform-prod-backend --follow

# Common issues:
# - Image not found: Push image again
# - Database not available: Wait for RDS to be ready
# - Secret not found: Verify secrets in Secrets Manager
```

### Problema: "Health check failing"
**Solución:**
```bash
# Verify backend is running locally first
cd backend && python -m uvicorn app.main:app --reload

# Check logs for errors
aws logs tail /ecs/dsr-waste-platform-prod-backend --filter-pattern "ERROR"

# Verify container image works
docker run -it $ECR_URL:latest /bin/bash
```

---

## 📊 Success Criteria

Deployment es **exitoso** si:

- [ ] ✅ ALB health endpoint responde 200 OK
- [ ] ✅ Database connectivity verificado
- [ ] ✅ Redis connectivity verificado
- [ ] ✅ CloudWatch logs mostran actividad normal
- [ ] ✅ ECS tasks en estado RUNNING
- [ ] ✅ No errores en migrations
- [ ] ✅ API docs carga sin errores
- [ ] ✅ Puedes registrar un usuario nuevo

---

## 📞 Help & Support

**Si algo falla:**

1. **Chequea los logs:**
   ```bash
   aws logs tail /ecs/dsr-waste-platform-prod-backend --follow
   ```

2. **Revisa la documentación:**
   - DEPLOYMENT_GUIDE.md
   - infrastructure/terraform/prod/README.md

3. **Verifica AWS Console:**
   - ECS: https://console.aws.amazon.com/ecs/v2/
   - CloudWatch: https://console.aws.amazon.com/cloudwatch/
   - RDS: https://console.aws.amazon.com/rds/

---

**Deployment Status**: ✅ Ready
**Estimated Time**: 75 minutes
**Difficulty Level**: Beginner (just follow steps)

¡Buena suerte! 🚀
