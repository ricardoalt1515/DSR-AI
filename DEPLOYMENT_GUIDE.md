# 🚀 DSR Waste Platform - AWS Deployment Guide

## Status: ✅ Ready for Deployment

Este documento es tu guía completa para desplegar el backend de waste-platform a AWS.

## 📋 Checklist Pre-Deployment

Antes de empezar, verifica que tienes:

- [ ] Cuenta de AWS configurada
- [ ] AWS CLI instalado y configurado (`aws configure`)
- [ ] Terraform >= 1.5.0 instalado
- [ ] Docker instalado
- [ ] OpenAI API Key disponible
- [ ] Git configurado

## ⏱️ Tiempo Total Estimado: ~75 minutos

- Backend setup: 5 min
- Configuración: 10 min
- Setup de secretos: 5 min
- Deploy infraestructura: 20 min
- Build y push Docker: 10 min
- Deploy aplicación: 15 min
- Verificación: 5 min

## 🚀 Paso 1: Setup del Backend de Terraform (5 min)

Crea el S3 bucket y tabla DynamoDB para almacenar el estado de Terraform:

```bash
cd infrastructure/scripts
./setup-backend.sh
```

**Esperado:**
- S3 bucket: `dsr-waste-terraform-state-prod` ✅
- DynamoDB table: `dsr-waste-terraform-locks` ✅

## ⚙️ Paso 2: Configurar Variables (10 min)

```bash
cd infrastructure/terraform/prod

# Copiar archivos de ejemplo
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl

# Editar configuración
nano terraform.tfvars
```

**Valores que DEBES actualizar:**

```hcl
owner_email = "tu-email@empresa.com"  # Tu email
alarm_email = "alerts@empresa.com"    # Para alertas
cors_origins = "http://localhost:3000" # Tu frontend URL (después)
```

**Valores que PUEDES cambiar (opcional):**
- `ecs_task_cpu` / `ecs_task_memory`: Recursos de ECS (actual: 1vCPU, 2GB)
- `db_instance_class`: Tipo de instancia RDS (actual: db.t4g.micro)
- `redis_node_type`: Tipo de nodo Redis (actual: cache.t4g.micro)
- `db_multi_az`: Multi-AZ para RDS (actual: true para prod)

## 🔐 Paso 3: Setup de Secretos (5 min)

Crea los secretos en AWS Secrets Manager:

```bash
# Establece variables de entorno
export TF_VAR_openai_api_key="sk-proj-TU-KEY-AQUI"
export TF_VAR_jwt_secret_key="$(openssl rand -hex 32)"

# Verifica que están seteadas
echo $TF_VAR_openai_api_key   # Should show sk-proj-...
echo $TF_VAR_jwt_secret_key   # Should show a long hex string

# Crea los secretos
cd infrastructure/scripts
./setup-secrets.sh
```

**Esperado:**
```
✅ OpenAI API key secret created
✅ JWT secret key secret created
✅ Database password secret created
```

## 🏗️ Paso 4: Deploy de Infraestructura (20 min)

Inicia Terraform y crea todos los recursos AWS:

```bash
cd infrastructure/terraform/prod

# Inicializa Terraform
terraform init -backend-config=backend.hcl

# Valida la configuración
terraform validate

# Revisa el plan (opcional pero recomendado)
terraform plan

# ✅ Aplica los cambios (esto tarda ~15-20 minutos)
terraform apply
```

Durante este paso se crean:
- VPC con subnets públicas y privadas
- RDS PostgreSQL
- ElastiCache Redis
- S3 bucket
- ECR repository
- ECS cluster
- Application Load Balancer
- Security groups e IAM roles
- CloudWatch logs

**Esperado al final:**
```
Apply complete! Resources have been created [ok]
Outputs:
  alb_dns_name = "dsr-waste-...elb.amazonaws.com"
  ecr_repository_url = "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/..."
  ...
```

Guarda los outputs:
```bash
terraform output > outputs.txt
```

## 🐳 Paso 5: Build y Push de Docker Image (10 min)

Construye la imagen del backend y sube a ECR:

```bash
# Obtén la URL del ECR
ECR_URL=$(terraform output -raw ecr_repository_url)
echo $ECR_URL  # Verifica que se vea bien

# Login a ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_URL

# Build de la imagen (especifica plataforma Linux)
cd backend
docker build --platform linux/amd64 -t waste-platform-backend .

# Tag la imagen
docker tag waste-platform-backend:latest $ECR_URL:latest

# Push a ECR
docker push $ECR_URL:latest
```

**Esperado:**
```
latest: digest: sha256:abc123... size: 45678
```

Verifica que la imagen está en ECR:
```bash
aws ecr describe-images --repository-name dsr-waste-platform-prod-backend
```

## 📝 Paso 6: Actualizar Terraform con Image URL (5 min)

Ahora que la imagen está en ECR, actualiza Terraform para usar esa imagen:

```bash
cd infrastructure/terraform/prod

# Edita terraform.tfvars
nano terraform.tfvars

# Encuentra la línea container_image y actualízala:
# container_image = "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/dsr-waste-platform-prod-backend:latest"

# Reemplaza ACCOUNT_ID con tu AWS Account ID:
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo $ACCOUNT_ID

# Ahora sí, aplica los cambios
terraform apply -auto-approve

# ECS hace un rolling deployment automático (sin downtime)
```

**Esperado:**
- ECS service se actualiza
- Rolling deployment (100% → 200% → 100%)
- ~3-5 minutos para completar

Monitorea el deployment:
```bash
aws ecs describe-services \
  --cluster dsr-waste-platform-prod-cluster \
  --services dsr-waste-platform-prod-backend \
  --query 'services[0].{desiredCount:desiredCount, runningCount:runningCount}'
```

## 🗄️ Paso 7: Ejecutar Migraciones de Base de Datos (5 min)

Aplica las migraciones Alembic en la base de datos:

```bash
cd infrastructure/terraform/prod

# Obtén IDs necesarios
SUBNET_ID=$(terraform output -json private_subnet_ids | jq -r '.[0]')
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=tag:Name,Values=*ecs-tasks*" \
  --query 'SecurityGroups[0].GroupId' --output text)

echo "Subnet: $SUBNET_ID"
echo "Security Group: $SG_ID"

# Ejecuta la migración
aws ecs run-task \
  --cluster dsr-waste-platform-prod-cluster \
  --task-definition dsr-waste-platform-prod-backend \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SG_ID],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides": [{"name": "backend", "command": ["alembic", "upgrade", "head"]}]}'

# Observa los logs
aws logs tail /ecs/dsr-waste-platform-prod-backend --follow

# Espera a que termine (busca "SUCCESS" o "REVISION" en los logs)
```

**Esperado:**
```
INFO  [alembic.runtime.migration] Running upgrade  -> 0001, add initial tables
...
INFO  [alembic.runtime.migration] Running upgrade 0XXX -> 0YYY, ...
```

## ✅ Paso 8: Verificar Deployment (5 min)

Valida que todo está funcionando:

```bash
cd infrastructure/terraform/prod

# Obtén el DNS del load balancer
ALB_DNS=$(terraform output -raw alb_dns_name)
echo "ALB URL: http://$ALB_DNS"

# Test del health endpoint
curl http://$ALB_DNS/health

# Esperado:
# {
#   "status": "healthy",
#   "database": "ok",
#   "redis": "ok",
#   "environment": "prod"
# }

# Abre API docs
echo "API Docs: http://$ALB_DNS/api/v1/docs"

# Test de un endpoint
curl http://$ALB_DNS/api/v1/auth/register \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}'
```

**Esperado:**
- Health endpoint: 200 OK
- API docs: UI de Swagger cargado
- Register: 200 OK o error de validación

## 🎉 ¡Deployment Completado!

Tu backend está ahora en producción en AWS.

### Información Importante

**URL del Backend:**
```
http://ALB_DNS_NAME
```

**Para actualizar CORS en el frontend:**
```bash
terraform output -raw alb_dns_name
```

Copia este valor al `NEXT_PUBLIC_API_BASE_URL` en tu frontend.

### Próximos Pasos

1. **Configura el frontend:**
   - Actualiza `NEXT_PUBLIC_API_BASE_URL` en `frontend/.env.local`
   - Deploy el frontend a AWS Amplify (separado)

2. **Configura SSL/HTTPS (opcional pero recomendado):**
   - Crea certificado en AWS ACM
   - Actualiza `acm_certificate_arn` en terraform.tfvars
   - Configura dominio personalizado

3. **Monitorea en producción:**
   ```bash
   # Ver logs en tiempo real
   aws logs tail /ecs/dsr-waste-platform-prod-backend --follow

   # Ver métricas
   open "https://console.aws.amazon.com/cloudwatch/"
   ```

4. **Configura CI/CD (GitHub Actions):**
   - Próximo paso: crear workflows de GitHub Actions
   - Para auto-deploy al hacer push a main

## 📊 Monitoreo

### Ver Logs

```bash
# Logs en tiempo real
aws logs tail /ecs/dsr-waste-platform-prod-backend --follow

# Filtrar errores
aws logs tail /ecs/dsr-waste-platform-prod-backend \
  --follow \
  --filter-pattern "ERROR"

# Últimas 100 líneas
aws logs tail /ecs/dsr-waste-platform-prod-backend --since 1h
```

### CloudWatch Dashboards

```bash
# Abre CloudWatch
open "https://console.aws.amazon.com/cloudwatch/home?region=us-east-1"

# Dashboards → dsr-waste-platform-prod
```

### Alertas

Recibirás emails en `alarm_email` si:
- CPU de ECS > 80%
- Memoria de ECS > 85%
- CPU de RDS > 75%
- Almacenamiento RDS < 5GB
- Errores 5xx en ALB

## 🆘 Troubleshooting

### ECS Tasks no inician

```bash
# Ver tareas paradas
aws ecs describe-tasks \
  --cluster dsr-waste-platform-prod-cluster \
  --tasks $(aws ecs list-tasks --cluster dsr-waste-platform-prod-cluster --desired-status STOPPED --query 'taskArns[0]' --output text)

# Ver logs
aws logs tail /ecs/dsr-waste-platform-prod-backend --follow

# Problemas comunes:
# - Image pull error: Verifica ECR y Docker image
# - Health check failing: Verifica /health endpoint
# - Database connection: Verifica security groups
```

### No puedo conectarme a la base de datos

```bash
# Verifica que ECS puede acceder a RDS
aws ec2 describe-security-groups \
  --filters "Name=tag:Name,Values=*rds*"

# Debería tener regla para PostgreSQL (5432) desde ECS security group
```

### Alto costo

Revisa:
1. **NAT Gateways**: $64/mes (el costo más alto)
   - Alternativa: VPC Endpoints (más complejo, ahorra $32/mes)

2. **ECS tasks**:
   - Reduce CPU/memoria si no los necesitas

3. **RDS**:
   - Si es dev, usa Single-AZ (ahorra $15/mes)

## 💾 Backups & Disaster Recovery

### Backup de Base de Datos

RDS tiene backups automáticos:
- Retención: 7 días
- Frecuencia: Diaria
- Punto de recuperación: Últimas 7 días

Para recuperar desde un backup:
```bash
# En AWS Console: RDS → Databases → dsr-waste-platform-prod-db
# Click "Restore from backup"
```

### Backup de Terraform State

Tu state está en S3 (dsr-waste-terraform-state-prod):
- Versioning: Habilitado
- Encryption: Habilitado
- Puede recuperarse de cualquier versión anterior

## 🔐 Seguridad

Cosas que ya están configuradas:
- ✅ VPC privada para backend
- ✅ Secrets en AWS Secrets Manager
- ✅ RDS encryption at rest
- ✅ S3 encryption + versioning
- ✅ IAM roles con minimal permissions
- ✅ Security groups restrictivos

Lo que deberías hacer:
- [ ] Configurar HTTPS con ACM certificate
- [ ] Usar dominio personalizado
- [ ] Habilitar WAF en ALB
- [ ] Configurar autenticación MFA en AWS
- [ ] Revisar periódicamente los logs

## 📞 Soporte

Para problemas:

1. **Verificar logs:**
   ```bash
   aws logs tail /ecs/dsr-waste-platform-prod-backend --follow
   ```

2. **Revisar Terraform:**
   ```bash
   cd infrastructure/terraform/prod
   terraform state list
   terraform state show aws_ecs_service.main
   ```

3. **AWS Console:**
   - ECS: https://console.aws.amazon.com/ecs/v2/
   - RDS: https://console.aws.amazon.com/rds/
   - CloudWatch: https://console.aws.amazon.com/cloudwatch/

4. **Documentación:**
   - `infrastructure/README.md`: Overview de infraestructura
   - `infrastructure/terraform/prod/README.md`: Guía detallada
   - `infrastructure/scripts/`: Scripts de deployment

---

## ✨ Resumen Rápido

```bash
# 1. Setup backend
cd infrastructure/scripts && ./setup-backend.sh

# 2. Configurar variables
cd ../terraform/prod && nano terraform.tfvars

# 3. Setup secrets
export TF_VAR_openai_api_key="sk-proj-..."
export TF_VAR_jwt_secret_key="$(openssl rand -hex 32)"
cd ../../scripts && ./setup-secrets.sh

# 4. Deploy infraestructura
cd ../terraform/prod && terraform init -backend-config=backend.hcl && terraform apply

# 5. Build y push Docker
cd backend && docker build --platform linux/amd64 -t backend . && docker tag backend:latest $ECR_URL:latest && docker push $ECR_URL:latest

# 6. Deploy app
cd ../infrastructure/terraform/prod && terraform apply

# 7. Migraciones
aws ecs run-task --cluster ... [comando arriba]

# 8. Verificar
curl http://$(terraform output -raw alb_dns_name)/health
```

---

**Última actualización**: 2025-01-17
**Estado**: ✅ Listo para desplegar
**Tiempo estimado**: ~75 minutos
**Costo mensual**: ~$249-399

¡Buena suerte con el deployment! 🚀
