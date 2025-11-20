#!/bin/bash
# ============================================================================
# DSR Waste Platform - AWS Secrets Manager Setup
# ============================================================================
# Creates and stores secrets in AWS Secrets Manager
# Usage: ./setup-secrets.sh
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔐 DSR Waste Platform - Secrets Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Configuration
REGION="us-east-1"
ENVIRONMENT="prod"
PROJECT_NAME="dsr-waste-platform"

# Check prerequisites
log_info "Checking prerequisites..."
command -v aws >/dev/null 2>&1 || { log_error "aws-cli not found"; exit 1; }
command -v openssl >/dev/null 2>&1 || { log_error "openssl not found"; exit 1; }
log_success "Prerequisites met"

echo ""
echo "This script will create the following secrets in AWS Secrets Manager:"
echo "  1. OPENAI_API_KEY"
echo "  2. SECRET_KEY (JWT)"
echo "  3. POSTGRES_PASSWORD (Auto-generated)"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_error "Cancelled"
    exit 1
fi

# Check if OpenAI API key is set
echo ""
if [ -z "${TF_VAR_openai_api_key:-}" ]; then
    log_error "TF_VAR_openai_api_key is not set!"
    echo "Please set your OpenAI API key:"
    echo "  export TF_VAR_openai_api_key='sk-proj-xxxxx'"
    exit 1
fi
log_success "OpenAI API key found"

# Check if JWT secret is set
if [ -z "${TF_VAR_jwt_secret_key:-}" ]; then
    log_warning "TF_VAR_jwt_secret_key not set. Generating a new one..."
    export TF_VAR_jwt_secret_key=$(openssl rand -hex 32)
    echo "Generated JWT secret: ${TF_VAR_jwt_secret_key:0:10}..."
else
    log_success "JWT secret key found"
fi

# Generate database password
DB_PASSWORD=$(openssl rand -hex 32)
echo "Generated database password"

# Create secrets in Secrets Manager
echo ""
log_info "Creating secrets in AWS Secrets Manager..."

# OpenAI API Key
SECRET_NAME="${PROJECT_NAME}-${ENVIRONMENT}-openai-key"
log_info "Creating $SECRET_NAME..."
if aws secretsmanager describe-secret \
    --secret-id "$SECRET_NAME" \
    --region "$REGION" 2>/dev/null | grep -q "ARN"; then
    log_warning "Secret already exists, updating..."
    aws secretsmanager put-secret-value \
        --secret-id "$SECRET_NAME" \
        --secret-string "$TF_VAR_openai_api_key" \
        --region "$REGION" > /dev/null
else
    aws secretsmanager create-secret \
        --name "$SECRET_NAME" \
        --description "OpenAI API Key for DSR Waste Platform" \
        --secret-string "$TF_VAR_openai_api_key" \
        --region "$REGION" > /dev/null
fi
log_success "OpenAI API key secret created"

# JWT Secret Key
SECRET_NAME="${PROJECT_NAME}-${ENVIRONMENT}-jwt-secret"
log_info "Creating $SECRET_NAME..."
if aws secretsmanager describe-secret \
    --secret-id "$SECRET_NAME" \
    --region "$REGION" 2>/dev/null | grep -q "ARN"; then
    log_warning "Secret already exists, updating..."
    aws secretsmanager put-secret-value \
        --secret-id "$SECRET_NAME" \
        --secret-string "$TF_VAR_jwt_secret_key" \
        --region "$REGION" > /dev/null
else
    aws secretsmanager create-secret \
        --name "$SECRET_NAME" \
        --description "JWT Secret Key for DSR Waste Platform" \
        --secret-string "$TF_VAR_jwt_secret_key" \
        --region "$REGION" > /dev/null
fi
log_success "JWT secret key secret created"

# Database Password
SECRET_NAME="${PROJECT_NAME}-${ENVIRONMENT}-db-password"
log_info "Creating $SECRET_NAME..."
if aws secretsmanager describe-secret \
    --secret-id "$SECRET_NAME" \
    --region "$REGION" 2>/dev/null | grep -q "ARN"; then
    log_warning "Secret already exists, updating..."
    aws secretsmanager put-secret-value \
        --secret-id "$SECRET_NAME" \
        --secret-string "$DB_PASSWORD" \
        --region "$REGION" > /dev/null
else
    aws secretsmanager create-secret \
        --name "$SECRET_NAME" \
        --description "PostgreSQL Master Password for DSR Waste Platform" \
        --secret-string "$DB_PASSWORD" \
        --region "$REGION" > /dev/null
fi
log_success "Database password secret created"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Secrets setup complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Next steps:"
echo "1. Run: cd infrastructure/terraform/prod"
echo "2. Run: terraform init -backend-config=backend.hcl"
echo "3. Run: terraform plan"
echo "4. Run: terraform apply"
echo ""
