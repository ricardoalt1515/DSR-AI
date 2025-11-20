#!/bin/bash
# ============================================================================
# H2O Allegiant - Database Migrations Runner (AWS Best Practice)
# ============================================================================
# Runs migrations as a one-time ECS task
# This is the standard AWS approach for database migrations
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# Configuration
AWS_REGION="us-east-1"
CLUSTER="h2o-allegiant-prod-cluster"
TASK_DEFINITION="h2o-allegiant-prod-backend"
SUBNETS=$(aws ec2 describe-subnets \
  --filters "Name=tag:Name,Values=*h2o-allegiant-prod-private*" \
  --query 'Subnets[*].SubnetId' \
  --output text | tr '\t' ',')
SECURITY_GROUP=$(aws ec2 describe-security-groups \
  --filters "Name=tag:Name,Values=*h2o-allegiant-prod-ecs*" \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

log_info "Running database migrations as ECS task..."
log_info "Cluster: $CLUSTER"
log_info "Task Definition: $TASK_DEFINITION"

# Run migration task
TASK_ARN=$(aws ecs run-task \
  --cluster "$CLUSTER" \
  --task-definition "$TASK_DEFINITION" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SECURITY_GROUP],assignPublicIp=DISABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "backend",
      "command": ["alembic", "upgrade", "head"]
    }]
  }' \
  --query 'tasks[0].taskArn' \
  --output text)

if [ -z "$TASK_ARN" ]; then
  log_error "Failed to start migration task"
  exit 1
fi

log_success "Migration task started: $TASK_ARN"
log_info "Waiting for task to complete..."

# Wait for task to complete
aws ecs wait tasks-stopped \
  --cluster "$CLUSTER" \
  --tasks "$TASK_ARN"

# Check exit code
EXIT_CODE=$(aws ecs describe-tasks \
  --cluster "$CLUSTER" \
  --tasks "$TASK_ARN" \
  --query 'tasks[0].containers[0].exitCode' \
  --output text)

if [ "$EXIT_CODE" = "0" ]; then
  log_success "Migrations completed successfully!"
else
  log_error "Migrations failed with exit code: $EXIT_CODE"
  log_info "Check logs with:"
  echo "  aws logs tail /ecs/h2o-allegiant-prod-backend --since 10m"
  exit 1
fi
