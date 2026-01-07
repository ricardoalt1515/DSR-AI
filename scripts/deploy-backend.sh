#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Backend Deploy Script - DSR Waste Platform
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Usage:
#   ./scripts/deploy-backend.sh          # Deploy only
#   ./scripts/deploy-backend.sh migrate  # Deploy + run migrations
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -e  # Exit on error

# ─────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="882816896907"
ECR_REPO="dsr-waste-platform-prod-backend"
ECS_CLUSTER="dsr-waste-platform-prod-cluster"
ECS_SERVICE="dsr-waste-platform-prod-backend"
IMAGE_NAME="dsr-waste-platform-backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─────────────────────────────────────────────────────
# Helper functions
# ─────────────────────────────────────────────────────
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# ─────────────────────────────────────────────────────
# Step 1: ECR Login
# ─────────────────────────────────────────────────────
log_info "Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | \
    docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
log_success "ECR login successful"

# ─────────────────────────────────────────────────────
# Step 2: Build Docker image
# ─────────────────────────────────────────────────────
log_info "Building Docker image..."
cd "$(dirname "$0")/../backend"
docker build --platform linux/amd64 -t ${IMAGE_NAME}:latest .
log_success "Docker build successful"

# ─────────────────────────────────────────────────────
# Step 3: Tag and push to ECR
# ─────────────────────────────────────────────────────
log_info "Pushing to ECR..."
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest"
docker tag ${IMAGE_NAME}:latest ${ECR_URI}
docker push ${ECR_URI}
log_success "Image pushed to ECR"

# ─────────────────────────────────────────────────────
# Step 4: Run migrations (if requested)
# ─────────────────────────────────────────────────────
if [ "$1" == "migrate" ]; then
    log_info "Running database migrations..."
    
    # Get network config from existing service
    NETWORK_CONFIG=$(aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --services $ECS_SERVICE \
        --region $AWS_REGION \
        --query 'services[0].networkConfiguration.awsvpcConfiguration' \
        --output json)
    
    SUBNETS=$(echo $NETWORK_CONFIG | jq -r '.subnets | join(",")')
    SECURITY_GROUPS=$(echo $NETWORK_CONFIG | jq -r '.securityGroups | join(",")')
    
    # Run migration task
    TASK_ARN=$(aws ecs run-task \
        --cluster $ECS_CLUSTER \
        --task-definition $ECS_SERVICE \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SECURITY_GROUPS],assignPublicIp=DISABLED}" \
        --overrides '{"containerOverrides":[{"name":"backend","command":["alembic","upgrade","head"]}]}' \
        --region $AWS_REGION \
        --query 'tasks[0].taskArn' \
        --output text)
    
    log_info "Migration task started: $TASK_ARN"
    
    # Wait for task to complete
    TASK_ID=$(echo $TASK_ARN | awk -F'/' '{print $NF}')
    log_info "Waiting for migration to complete..."
    
    while true; do
        STATUS=$(aws ecs describe-tasks \
            --cluster $ECS_CLUSTER \
            --tasks $TASK_ID \
            --region $AWS_REGION \
            --query 'tasks[0].lastStatus' \
            --output text)
        
        if [ "$STATUS" == "STOPPED" ]; then
            EXIT_CODE=$(aws ecs describe-tasks \
                --cluster $ECS_CLUSTER \
                --tasks $TASK_ID \
                --region $AWS_REGION \
                --query 'tasks[0].containers[0].exitCode' \
                --output text)
            
            if [ "$EXIT_CODE" == "0" ]; then
                log_success "Migrations completed successfully"
            else
                log_error "Migrations failed with exit code: $EXIT_CODE"
                exit 1
            fi
            break
        fi
        
        echo -n "."
        sleep 5
    done
fi

# ─────────────────────────────────────────────────────
# Step 5: Force new ECS deployment
# ─────────────────────────────────────────────────────
log_info "Triggering ECS deployment..."
aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service $ECS_SERVICE \
    --force-new-deployment \
    --region $AWS_REGION \
    --output json > /dev/null

log_success "ECS deployment triggered"

# ─────────────────────────────────────────────────────
# Step 6: Wait for deployment to complete
# ─────────────────────────────────────────────────────
log_info "Waiting for deployment to complete..."

while true; do
    DEPLOYMENTS=$(aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --services $ECS_SERVICE \
        --region $AWS_REGION \
        --query 'services[0].deployments' \
        --output json)
    
    PRIMARY_STATE=$(echo $DEPLOYMENTS | jq -r '.[] | select(.status=="PRIMARY") | .rolloutState')
    PRIMARY_RUNNING=$(echo $DEPLOYMENTS | jq -r '.[] | select(.status=="PRIMARY") | .runningCount')
    
    if [ "$PRIMARY_STATE" == "COMPLETED" ]; then
        log_success "Deployment completed! Running tasks: $PRIMARY_RUNNING"
        break
    fi
    
    echo -n "."
    sleep 10
done

# ─────────────────────────────────────────────────────
# Done!
# ─────────────────────────────────────────────────────
echo ""
log_success "🚀 Backend deployed successfully!"
echo ""
