# AWS Cleanup Plan - Hydrous Projects

## Objetivo
Eliminar proyectos hydrous y hydrous-staging para ahorrar aproximadamente $142/mes.

## Recursos Identificados

### Hydrous (Producción)
- VPC: `vpc-0e54fd5e53f389df7` (hydrous-vpc)
- ECS Cluster: `hydrous-cluster`
- ECS Service: `hydrous-backend-service`
- RDS: `hydrous-db` (db.t3.micro)
- ElastiCache: `hydrous-redis` (cache.t3.micro)
- ALB: `hydrous-alb-new`
- Target Groups: `hydrous-tg`, `hydrous-tg-new`
- NAT Gateways: 2 (nat-07956edb4bf6f1ad1, nat-01bd79ac9636668fe)
- Elastic IPs: 2 asociados a NAT Gateways
- S3: `hydrous-proposals-storage-882816896907`, `hydrous-terraform-state-882816896907`
- ECR: `hydrous-backend`

### Hydrous-Staging
- VPC: `vpc-0400da935e367fc88` (Default VPC - NO ELIMINAR)
- ECS Cluster: `hydrous-staging-cluster`
- ECS Service: `hydrous-staging-service`
- RDS: `hydrous-staging-database` (db.t3.micro)
- ElastiCache: `hydrous-staging-redis` (cache.t2.micro)
- ALB: `hydrous-staging-alb`
- Target Group: `hydrous-staging-app-tg`
- S3: `hydrous-staging-proposals-882816896907`, `hydrous-staging-alb-logs-882816896907`

## Orden de Eliminación

### Fase 1: Detener servicios activos

#### Hydrous
```bash
# 1. Escalar ECS service a 0
aws ecs update-service --cluster hydrous-cluster --service hydrous-backend-service --desired-count 0

# 2. Esperar a que las tareas se detengan (verificar)
aws ecs describe-services --cluster hydrous-cluster --services hydrous-backend-service --query 'services[0].runningCount'
```

#### Hydrous-Staging
```bash
# 1. Escalar ECS service a 0
aws ecs update-service --cluster hydrous-staging-cluster --service hydrous-staging-service --desired-count 0

# 2. Verificar
aws ecs describe-services --cluster hydrous-staging-cluster --services hydrous-staging-service --query 'services[0].runningCount'
```

### Fase 2: Eliminar servicios ECS

#### Hydrous
```bash
# Eliminar service
aws ecs delete-service --cluster hydrous-cluster --service hydrous-backend-service --force

# Eliminar cluster
aws ecs delete-cluster --cluster hydrous-cluster
```

#### Hydrous-Staging
```bash
# Eliminar service
aws ecs delete-service --cluster hydrous-staging-cluster --service hydrous-staging-service --force

# Eliminar cluster
aws ecs delete-cluster --cluster hydrous-staging-cluster
```

### Fase 3: Eliminar Load Balancers y Target Groups

#### Hydrous
```bash
# Obtener ARN del ALB
ALB_ARN=$(aws elbv2 describe-load-balancers --names hydrous-alb-new --query 'LoadBalancers[0].LoadBalancerArn' --output text)

# Listar listeners
aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --query 'Listeners[*].ListenerArn' --output text

# Eliminar listeners (obtener ARNs primero)
# aws elbv2 delete-listener --listener-arn <ARN>

# Eliminar ALB
aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN

# Esperar 30 segundos

# Eliminar Target Groups
aws elbv2 delete-target-group --target-group-arn arn:aws:elasticloadbalancing:us-east-1:882816896907:targetgroup/hydrous-tg/5157a5bc2b9a3ba1
aws elbv2 delete-target-group --target-group-arn arn:aws:elasticloadbalancing:us-east-1:882816896907:targetgroup/hydrous-tg-new/099b15527c073eea
```

#### Hydrous-Staging
```bash
# Obtener ARN del ALB
ALB_STAGING_ARN=$(aws elbv2 describe-load-balancers --names hydrous-staging-alb --query 'LoadBalancers[0].LoadBalancerArn' --output text)

# Eliminar listeners primero
# (obtener ARNs y eliminar uno por uno)

# Eliminar ALB
aws elbv2 delete-load-balancer --load-balancer-arn $ALB_STAGING_ARN

# Esperar 30 segundos

# Eliminar Target Group
aws elbv2 delete-target-group --target-group-arn arn:aws:elasticloadbalancing:us-east-1:882816896907:targetgroup/hydrous-staging-app-tg/b6eb4227266a9ccf
```

### Fase 4: Eliminar RDS (con snapshot final)

```bash
# Hydrous - Crear snapshot final antes de eliminar
aws rds delete-db-instance \
  --db-instance-identifier hydrous-db \
  --final-db-snapshot-identifier hydrous-db-final-snapshot-$(date +%Y%m%d) \
  --no-delete-automated-backups

# Hydrous-Staging - Crear snapshot final
aws rds delete-db-instance \
  --db-instance-identifier hydrous-staging-database \
  --final-db-snapshot-identifier hydrous-staging-db-final-snapshot-$(date +%Y%m%d) \
  --no-delete-automated-backups
```

### Fase 5: Eliminar ElastiCache

```bash
# Hydrous
aws elasticache delete-cache-cluster --cache-cluster-id hydrous-redis

# Hydrous-Staging
aws elasticache delete-cache-cluster --cache-cluster-id hydrous-staging-redis
```

### Fase 6: Eliminar NAT Gateways (solo hydrous tiene)

```bash
# Eliminar NAT Gateways
aws ec2 delete-nat-gateway --nat-gateway-id nat-07956edb4bf6f1ad1
aws ec2 delete-nat-gateway --nat-gateway-id nat-01bd79ac9636668fe

# Esperar a que se eliminen (toma unos minutos)
# Verificar estado:
aws ec2 describe-nat-gateways --nat-gateway-ids nat-07956edb4bf6f1ad1 nat-01bd79ac9636668fe --query 'NatGateways[*].State'

# Obtener Elastic IPs asociados a estos NAT Gateways
# (los obtuvimos antes: verificar cuáles son)
# Liberar Elastic IPs después de eliminar NAT
# aws ec2 release-address --allocation-id <eipalloc-xxx>
```

### Fase 7: Eliminar VPC de Hydrous (NO tocar default VPC de staging)

**IMPORTANTE**: Solo eliminar vpc-0e54fd5e53f389df7 (hydrous-vpc), NO tocar vpc-0400da935e367fc88 (default)

```bash
# Obtener todos los recursos en la VPC primero
VPC_ID="vpc-0e54fd5e53f389df7"

# Eliminar Security Groups (excepto default)
aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" --query 'SecurityGroups[?GroupName!=`default`].GroupId' --output text | xargs -n 1 aws ec2 delete-security-group --group-id

# Eliminar Subnets
aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[*].SubnetId' --output text | xargs -n 1 aws ec2 delete-subnet --subnet-id

# Eliminar Route Tables (excepto main)
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$VPC_ID" --query 'RouteTables[?Associations[0].Main==`false`].RouteTableId' --output text | xargs -n 1 aws ec2 delete-route-table --route-table-id

# Detach y eliminar Internet Gateway
IGW_ID=$(aws ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=$VPC_ID" --query 'InternetGateways[0].InternetGatewayId' --output text)
aws ec2 detach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID
aws ec2 delete-internet-gateway --internet-gateway-id $IGW_ID

# Finalmente, eliminar VPC
aws ec2 delete-vpc --vpc-id $VPC_ID
```

### Fase 8: Limpiar S3

```bash
# Vaciar y eliminar buckets (requiere vaciarlos primero)
aws s3 rm s3://hydrous-proposals-storage-882816896907 --recursive
aws s3 rb s3://hydrous-proposals-storage-882816896907

aws s3 rm s3://hydrous-terraform-state-882816896907 --recursive
aws s3 rb s3://hydrous-terraform-state-882816896907

aws s3 rm s3://hydrous-staging-proposals-882816896907 --recursive
aws s3 rb s3://hydrous-staging-proposals-882816896907

aws s3 rm s3://hydrous-staging-alb-logs-882816896907 --recursive
aws s3 rb s3://hydrous-staging-alb-logs-882816896907
```

### Fase 9: Eliminar ECR

```bash
# Eliminar repositorio ECR
aws ecr delete-repository --repository-name hydrous-backend --force
```

## Ahorro Estimado
- **Hydrous**: ~$103/mes
- **Hydrous-Staging**: ~$39/mes
- **Total**: ~$142/mes

## Verificación Final

Después de la eliminación, verificar que no queden recursos:

```bash
# Verificar ECS
aws ecs list-clusters | grep hydrous

# Verificar RDS
aws rds describe-db-instances --query 'DBInstances[*].DBInstanceIdentifier' | grep hydrous

# Verificar ElastiCache
aws elasticache describe-cache-clusters --query 'CacheClusters[*].CacheClusterId' | grep hydrous

# Verificar ALBs
aws elbv2 describe-load-balancers --query 'LoadBalancers[*].LoadBalancerName' | grep hydrous

# Verificar S3
aws s3 ls | grep hydrous

# Verificar VPC (solo debe quedar default)
aws ec2 describe-vpcs --query 'Vpcs[*].[VpcId,Tags[?Key==`Name`].Value|[0]]' | grep hydrous

# Verificar NAT Gateways
aws ec2 describe-nat-gateways --filter "Name=state,Values=available" --query 'NatGateways[*].[NatGatewayId,Tags[?Key==`Name`].Value|[0]]' | grep hydrous
```

## Notas Importantes

1. **Snapshots RDS**: Los snapshots finales de las bases de datos se conservarán por si necesitas recuperar datos
2. **Tiempos de espera**: Algunos recursos (NAT Gateways, RDS) tardan varios minutos en eliminarse
3. **Dependencias**: Debes seguir el orden indicado para evitar errores de dependencias
4. **Default VPC**: NO eliminar vpc-0400da935e367fc88 (es la VPC por defecto de AWS)
5. **Backups S3**: Considera hacer backup de los buckets S3 antes de eliminarlos si hay datos importantes

## Costos Durante Eliminación

- Los recursos seguirán cobrando hasta que estén completamente eliminados
- NAT Gateways y RDS son los que más tardan (5-15 minutos)
- Estimación: proceso completo toma 20-30 minutos
