#!/bin/bash
# ============================================================================
# H2O Allegiant - Backend Deployment Script
# ============================================================================
# Best practices deployment script for production
# Usage: ./deploy-backend.sh [--skip-build] [--skip-migrations]
# ============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="882816896907"
ECR_REPOSITORY="h2o-allegiant-prod-backend"
ECS_CLUSTER="h2o-allegiant-prod-cluster"
ECS_SERVICE="h2o-allegiant-prod-backend"
RDS_ENDPOINT="h2o-allegiant-prod-db.cuj8q6augwwx.us-east-1.rds.amazonaws.com"
DB_NAME="h2o_allegiant"

# Get absolute paths once at the start
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../../backend"

# Parse arguments
SKIP_BUILD=false
SKIP_MIGRATIONS=false
for arg in "$@"; do
  case $arg in
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --skip-migrations)
      SKIP_MIGRATIONS=true
      shift
      ;;
  esac
done

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    log_step "🔍 Checking Prerequisites"
    
    local missing_tools=()
    
    command -v docker >/dev/null 2>&1 || missing_tools+=("docker")
    command -v aws >/dev/null 2>&1 || missing_tools+=("aws-cli")
    command -v jq >/dev/null 2>&1 || missing_tools+=("jq")
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    log_success "All prerequisites met"
}

# Get secrets from AWS Secrets Manager
get_secrets() {
    log_step "🔐 Retrieving Secrets from AWS Secrets Manager"
    
    # Get DB password
    DB_PASSWORD_SECRET=$(aws secretsmanager list-secrets \
        --query "SecretList[?contains(Name, 'h2o-allegiant-prod-db-password')].Name" \
        --output text | head -1)
    
    if [ -z "$DB_PASSWORD_SECRET" ]; then
        log_error "Could not find DB password secret"
        exit 1
    fi
    
    DB_PASSWORD=$(aws secretsmanager get-secret-value \
        --secret-id "$DB_PASSWORD_SECRET" \
        --query SecretString \
        --output text)
    
    log_success "Secrets retrieved successfully"
}

# Build Docker image
build_image() {
    if [ "$SKIP_BUILD" = true ]; then
        log_warning "Skipping Docker build (--skip-build flag)"
        return
    fi
    
    log_step "🏗️  Building Docker Image"
    
    cd "$BACKEND_DIR"
    
    log_info "Building image..."
    docker build \
        --platform linux/amd64 \
        --tag "${ECR_REPOSITORY}:latest" \
        --tag "${ECR_REPOSITORY}:$(git rev-parse --short HEAD)" \
        --file Dockerfile \
        .
    
    log_success "Docker image built successfully"
}

# Push to ECR
push_to_ecr() {
    log_step "📤 Pushing Image to ECR"
    
    log_info "Logging in to ECR..."
    aws ecr get-login-password --region ${AWS_REGION} | \
        docker login --username AWS --password-stdin \
        ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
    
    log_info "Tagging image..."
    docker tag ${ECR_REPOSITORY}:latest \
        ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:latest
    
    docker tag ${ECR_REPOSITORY}:latest \
        ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:$(git rev-parse --short HEAD)
    
    log_info "Pushing image to ECR..."
    docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:latest
    docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:$(git rev-parse --short HEAD)
    
    log_success "Image pushed to ECR successfully"
}

# Run database migrations
run_migrations() {
    if [ "$SKIP_MIGRATIONS" = true ]; then
        log_warning "Skipping migrations (--skip-migrations flag)"
        return
    fi
    
    log_step "🗄️  Running Database Migrations"
    
    cd "$BACKEND_DIR"
    
    # Build DATABASE_URL for production RDS
    DATABASE_URL="postgresql://h2o_admin:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/${DB_NAME}"
    
    log_info "Running Alembic migrations against production RDS..."
    log_info "Target: ${RDS_ENDPOINT}"
    
    # Check if docker compose is running
    if docker compose ps app 2>/dev/null | grep -q "Up"; then
        log_info "Using running docker compose app container..."
        docker compose exec -T app sh -c "DATABASE_URL='$DATABASE_URL' alembic upgrade head"
    else
        log_info "Starting temporary container for migrations..."
        docker compose run --rm \
            -e DATABASE_URL="$DATABASE_URL" \
            app \
            alembic upgrade head
    fi
    
    log_success "Migrations completed successfully"
}

# Deploy to ECS
deploy_to_ecs() {
    log_step "🚀 Deploying to ECS"
    
    log_info "Forcing new deployment..."
    aws ecs update-service \
        --cluster ${ECS_CLUSTER} \
        --service ${ECS_SERVICE} \
        --force-new-deployment \
        --region ${AWS_REGION} \
        > /dev/null
    
    log_success "Deployment triggered"
    
    log_info "Waiting for deployment to stabilize..."
    aws ecs wait services-stable \
        --cluster ${ECS_CLUSTER} \
        --services ${ECS_SERVICE} \
        --region ${AWS_REGION}
    
    log_success "Deployment completed successfully"
}

# Verify deployment
verify_deployment() {
    log_step "🔍 Verifying Deployment"
    
    # Get service status
    SERVICE_STATUS=$(aws ecs describe-services \
        --cluster ${ECS_CLUSTER} \
        --services ${ECS_SERVICE} \
        --region ${AWS_REGION} \
        --query 'services[0].[runningCount,desiredCount]' \
        --output text)
    
    RUNNING=$(echo $SERVICE_STATUS | awk '{print $1}')
    DESIRED=$(echo $SERVICE_STATUS | awk '{print $2}')
    
    log_info "ECS Service Status:"
    log_info "  Running tasks: ${RUNNING}"
    log_info "  Desired tasks: ${DESIRED}"
    
    if [ "$RUNNING" -eq "$DESIRED" ]; then
        log_success "All tasks are running"
    else
        log_warning "Not all tasks are running yet"
    fi
    
    # Get ALB URL
    ALB_DNS=$(aws elbv2 describe-load-balancers \
        --region ${AWS_REGION} \
        --query "LoadBalancers[?contains(LoadBalancerName, 'h2o-al')].DNSName" \
        --output text | head -1)
    
    log_info "Backend URL: http://${ALB_DNS}"
    
    # Test health endpoint
    log_info "Testing health endpoint..."
    sleep 10  # Wait for ALB to register targets
    
    if curl -s -f "http://${ALB_DNS}/health" > /dev/null 2>&1; then
        log_success "Health check passed"
    else
        log_warning "Health check failed (may take a few minutes for targets to be healthy)"
    fi
}

# Show logs
show_logs() {
    log_step "📋 Recent Logs"
    
    log_info "Fetching recent logs..."
    aws logs tail /ecs/h2o-allegiant-prod-backend \
        --since 5m \
        --format short \
        --region ${AWS_REGION} \
        2>/dev/null || log_warning "No logs available yet"
}

# Main deployment flow
main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                                                                ║"
    echo "║         H2O Allegiant - Backend Deployment Script              ║"
    echo "║                                                                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    
    check_prerequisites
    get_secrets
    build_image
    push_to_ecr
    run_migrations
    deploy_to_ecs
    verify_deployment
    show_logs
    
    echo ""
    log_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_success "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
    log_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    log_info "Next steps:"
    log_info "  1. Test API: curl http://${ALB_DNS}/health"
    log_info "  2. Monitor logs: aws logs tail /ecs/h2o-allegiant-prod-backend --follow"
    log_info "  3. Check service status: aws ecs describe-services --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE}"
    echo ""
}

# Run main function
main "$@"
