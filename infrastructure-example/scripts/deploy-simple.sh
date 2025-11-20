#!/bin/bash
# ============================================================================
# H2O Allegiant - Simple Production Deployment
# ============================================================================
# Best practice deployment workflow for AWS ECS
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         H2O Allegiant - Production Deployment                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Build and Push
log_info "Step 1/4: Building and pushing Docker image..."
cd "$(dirname "$0")/../../backend"

AWS_ACCOUNT_ID="882816896907"
AWS_REGION="us-east-1"
ECR_REPO="h2o-allegiant-prod-backend"
IMAGE_TAG=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")

log_info "Building image..."
docker build --platform linux/amd64 -t ${ECR_REPO}:${IMAGE_TAG} .

log_info "Logging in to ECR..."
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

log_info "Tagging and pushing..."
docker tag ${ECR_REPO}:${IMAGE_TAG} \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest

docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest

log_success "Image pushed successfully"

# Step 2: Run Migrations
log_info "Step 2/4: Running database migrations..."
cd "$(dirname "$0")"
./run-migrations.sh

# Step 3: Create Admin (if needed)
log_info "Step 3/4: Setting up admin user..."
./create-admin.sh || log_info "Admin user already exists"

# Step 4: Deploy to ECS
log_info "Step 4/4: Deploying to ECS..."
aws ecs update-service \
  --cluster h2o-allegiant-prod-cluster \
  --service h2o-allegiant-prod-backend \
  --force-new-deployment \
  --region ${AWS_REGION} \
  > /dev/null

log_success "Deployment triggered"

log_info "Waiting for service to stabilize..."
aws ecs wait services-stable \
  --cluster h2o-allegiant-prod-cluster \
  --services h2o-allegiant-prod-backend \
  --region ${AWS_REGION}

# Verify
log_info "Verifying deployment..."
RUNNING=$(aws ecs describe-services \
  --cluster h2o-allegiant-prod-cluster \
  --services h2o-allegiant-prod-backend \
  --query 'services[0].runningCount' \
  --output text)

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --query "LoadBalancers[?contains(LoadBalancerName, 'h2o-al')].DNSName" \
  --output text | head -1)

echo ""
log_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_success "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
log_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
log_info "Backend URL: http://${ALB_DNS}"
log_info "Running tasks: ${RUNNING}"
log_info "Admin login: admin@h2o-allegiant.com / ChangeMe123!"
echo ""
log_info "Test health: curl http://${ALB_DNS}/health"
log_info "View logs: aws logs tail /ecs/h2o-allegiant-prod-backend --follow"
echo ""
