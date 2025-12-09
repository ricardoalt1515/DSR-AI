# Resumen de Recursos AWS - Análisis Completo

Fecha: 2025-12-07

## 📊 Proyectos Identificados

### 1. dsr-waste-platform (Proyecto actual - PROD)
**Estado**: ⚠️ Parcialmente operativo (servicio ECS sin tareas corriendo)

**Recursos**:
- VPC: `vpc-02bd0cbaa39bb6a22` (10.0.0.0/16)
- ECS Cluster: `dsr-waste-platform-prod-cluster`
- ECS Service: `dsr-waste-platform-prod-backend` (0/2 tareas)
- RDS: `dsr-waste-platform-prod-db` (db.t4g.micro) - PostgreSQL 14.15
- ElastiCache: `dsr-waste-platform-prod-redis` (cache.t4g.micro) - Redis 6.2
- ALB: `dsr-wa20251208060138981000000018`
- S3: `dsr-waste-platform-prod-storage`, `dsr-waste-terraform-state-prod`
- ECR: `dsr-waste-platform-prod-backend`
- Elastic IP: `52.207.77.9` (NO ASOCIADO - cobrando $3.65/mes)

**Problema**: NAT Gateways definidos en Terraform pero no desplegados → ECS no puede pull imágenes

**Costo mensual**: ~$42.65/mes (sin NAT) | ~$106.65/mes (con NAT)

---

### 2. h2o-allegiant-prod
**Estado**: ✅ Completamente operativo

**Recursos**:
- VPC: `vpc-0817e2448a2e533b7` (10.0.0.0/16)
- ECS Cluster: `h2o-allegiant-prod-cluster`
- RDS: `h2o-allegiant-prod-db` (db.t4g.micro)
- ElastiCache: `h2o-allegiant-prod-redis` (cache.t4g.micro)
- ALB: `h2o-al20251022215841820100000019`
- NAT Gateways: 2 (us-east-1a, us-east-1b)
- S3: `h2o-allegiant-prod-storage`, `h2o-terraform-state-prod`
- ECR: `h2o-allegiant-prod-backend`

**Costo mensual**: ~$103/mes

**Acción**: ✅ MANTENER (según usuario)

---

### 3. hydrous (Producción antigua)
**Estado**: ✅ Operativo pero probablemente obsoleto

**Recursos**:
- VPC: `vpc-0e54fd5e53f389df7` (10.0.0.0/16)
- ECS Cluster: `hydrous-cluster`
- ECS Service: `hydrous-backend-service`
- RDS: `hydrous-db` (db.t3.micro)
- ElastiCache: `hydrous-redis` (cache.t3.micro)
- ALB: `hydrous-alb-new`
- NAT Gateways: 2
- S3: `hydrous-proposals-storage-882816896907`, `hydrous-terraform-state-882816896907`
- ECR: `hydrous-backend`

**Costo mensual**: ~$103/mes

**Acción**: 🗑️ ELIMINAR (ahorro: $103/mes)

---

### 4. hydrous-staging
**Estado**: ✅ Operativo pero probablemente obsoleto

**Recursos**:
- VPC: `vpc-0400da935e367fc88` (Default VPC - compartida)
- ECS Cluster: `hydrous-staging-cluster`
- ECS Service: `hydrous-staging-service`
- RDS: `hydrous-staging-database` (db.t3.micro)
- ElastiCache: `hydrous-staging-redis` (cache.t2.micro)
- ALB: `hydrous-staging-alb`
- S3: `hydrous-staging-proposals-882816896907`, `hydrous-staging-alb-logs-882816896907`

**Costo mensual**: ~$39/mes

**Acción**: 🗑️ ELIMINAR (ahorro: $39/mes)

---

## 💰 Análisis de Costos

### Costos Actuales
| Proyecto | Costo Mensual | Estado |
|----------|---------------|--------|
| dsr-waste-platform | $42.65 | Activo (sin NAT) |
| h2o-allegiant-prod | $103.00 | Activo |
| hydrous | $103.00 | A eliminar |
| hydrous-staging | $39.00 | A eliminar |
| **TOTAL** | **$287.65** | |

### Después de Limpieza
| Proyecto | Costo Mensual |
|----------|---------------|
| dsr-waste-platform | $42.65 (sin NAT) |
| h2o-allegiant-prod | $103.00 |
| **TOTAL** | **$145.65** |

### Ahorro
- **Ahorro mensual**: $142/mes
- **Ahorro anual**: $1,704/año

---

## 🚨 Problemas Detectados

### 1. Elastic IP no asociado en dsr-waste-platform
- IP: `52.207.77.9` (eipalloc-0c2d36d8327c15dad)
- Costo: $3.65/mes
- **Solución**: Liberar con `aws ec2 release-address --allocation-id eipalloc-0c2d36d8327c15dad`

### 2. NAT Gateways faltantes en dsr-waste-platform
- Definidos en Terraform pero no desplegados
- ECS Service muestra 0/2 tareas corriendo
- **Problema**: Fargate no puede pull imágenes de ECR sin NAT o VPC Endpoints

**Opciones**:
1. **NAT Gateways** ($64/mes):
   - Solucion estándar
   - Mejor para producción con alto tráfico
   - Comando: `cd infrastructure/terraform/prod && terraform apply`

2. **VPC Endpoints** ($7/mes):
   - Más económico
   - Suficiente para MVP/desarrollo
   - Requiere agregar a Terraform:
     - VPC Endpoint para com.amazonaws.us-east-1.ecr.api
     - VPC Endpoint para com.amazonaws.us-east-1.ecr.dkr
     - VPC Endpoint para com.amazonaws.us-east-1.s3 (gateway, gratis)

3. **Subnets públicas** (gratis):
   - Solo para desarrollo/testing
   - Menos seguro
   - No recomendado para producción

---

## 📋 Plan de Acción Ejecutado

### ✅ Completado
1. Análisis completo de recursos AWS
2. Identificación de proyectos y costos
3. Creación de documentación detallada
4. Creación de script automatizado de limpieza

### 🎯 Siguiente Paso
**Ejecutar script de limpieza para proyectos hydrous**:

```bash
cd /Users/ricardoaltamirano/Developer/waste-platform/_docs
./cleanup-hydrous.sh
```

Este script:
- ✅ Pide confirmación antes de eliminar
- ✅ Crea snapshots finales de RDS antes de eliminar
- ✅ Muestra progreso con colores
- ✅ Maneja errores gracefully
- ✅ Espera tiempos apropiados entre pasos
- ✅ Solo elimina hydrous-vpc, preserva default VPC
- ✅ Libera Elastic IPs automáticamente

**Tiempo estimado**: 20-30 minutos

---

## 📝 Tareas Pendientes Post-Limpieza

### Para dsr-waste-platform
1. **Decisión sobre networking**:
   - [ ] Implementar NAT Gateways ($64/mes) OR
   - [ ] Implementar VPC Endpoints ($7/mes) OR
   - [ ] Postponer hasta tener más claridad

2. **Liberar Elastic IP no asociado**:
   ```bash
   aws ec2 release-address --allocation-id eipalloc-0c2d36d8327c15dad
   ```
   Ahorro: $3.65/mes

3. **Optimizaciones adicionales**:
   - [ ] Considerar Aurora Serverless v2 para RDS (paga por uso)
   - [ ] Evaluar si Redis es necesario en esta etapa
   - [ ] Configurar lifecycle policies en ECR
   - [ ] Configurar CloudWatch Alarms

---

## 🔍 Comandos de Verificación

### Verificar que hydrous fue eliminado
```bash
# ECS Clusters
aws ecs list-clusters | grep hydrous

# RDS
aws rds describe-db-instances --query 'DBInstances[*].DBInstanceIdentifier' | grep hydrous

# ElastiCache
aws elasticache describe-cache-clusters --query 'CacheClusters[*].CacheClusterId' | grep hydrous

# Load Balancers
aws elbv2 describe-load-balancers --query 'LoadBalancers[*].LoadBalancerName' | grep hydrous

# S3 Buckets
aws s3 ls | grep hydrous

# VPC
aws ec2 describe-vpcs --query 'Vpcs[*].[VpcId,Tags[?Key==`Name`].Value|[0]]' | grep hydrous

# NAT Gateways
aws ec2 describe-nat-gateways --filter "Name=state,Values=available" --query 'NatGateways[*].[NatGatewayId,Tags[?Key==`Name`].Value|[0]]' | grep hydrous
```

### Verificar snapshots finales creados
```bash
aws rds describe-db-snapshots --query 'DBSnapshots[?contains(DBSnapshotIdentifier,`hydrous`)].{ID:DBSnapshotIdentifier,Status:Status,Created:SnapshotCreateTime}' --output table
```

---

## 📚 Archivos Generados

1. **aws-cleanup-plan.md**: Plan detallado de eliminación paso a paso
2. **cleanup-hydrous.sh**: Script automatizado de limpieza
3. **aws-resources-summary.md**: Este documento (resumen ejecutivo)

---

## ⚠️ Notas Importantes

1. **Snapshots RDS**: Los snapshots finales se conservarán indefinidamente (cobran por almacenamiento ~$0.095/GB-mes). Si no los necesitas, elimínalos después de 30 días.

2. **Terraform State S3**: El bucket `hydrous-terraform-state-882816896907` será eliminado. Si contiene estados importantes, haz backup antes.

3. **Default VPC**: El script NO toca la VPC por defecto (vpc-0400da935e367fc88) que usa hydrous-staging.

4. **Tiempos de espera**:
   - NAT Gateways: 3-5 minutos
   - RDS: 5-15 minutos
   - Total: 20-30 minutos

5. **Costos durante eliminación**: Los recursos siguen cobrando hasta estar completamente eliminados.

---

## 🎓 Lecciones Aprendidas

`★ Insight ─────────────────────────────────────`
**Optimizaciones recomendadas para futuros proyectos:**
1. Usar VPC Endpoints en lugar de NAT Gateways para tráfico AWS interno (ahorro: $57/mes)
2. Implementar auto-stop para ambientes de desarrollo (ahorro: ~60% en RDS/Redis)
3. Usar Aurora Serverless v2 para cargas de trabajo variables
4. Configurar alarmas de costos en CloudWatch
5. Revisar recursos mensualmente con AWS Cost Explorer
`─────────────────────────────────────────────────`
