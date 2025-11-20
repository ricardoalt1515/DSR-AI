#!/bin/bash
# ============================================================================
# DSR Waste Platform - Terraform Backend Setup
# ============================================================================
# Creates S3 bucket and DynamoDB table for Terraform state management
# Usage: ./setup-backend.sh
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

# Configuration
BUCKET_NAME="dsr-waste-terraform-state-prod"
DYNAMODB_TABLE="dsr-waste-terraform-locks"
REGION="us-east-1"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 DSR Waste Platform - Terraform Backend Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check prerequisites
log_info "Checking prerequisites..."
command -v aws >/dev/null 2>&1 || { log_error "aws-cli not found"; exit 1; }
log_success "AWS CLI found"

# Verify AWS credentials
log_info "Verifying AWS credentials..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
log_success "Using AWS Account: $ACCOUNT_ID"

# Create S3 bucket
echo ""
log_info "Creating S3 bucket: $BUCKET_NAME"
if aws s3 ls "s3://$BUCKET_NAME" 2>/dev/null; then
    log_success "Bucket already exists"
else
    aws s3 mb "s3://$BUCKET_NAME" --region "$REGION"
    log_success "Bucket created"
fi

# Enable versioning
log_info "Enabling versioning on S3 bucket..."
aws s3api put-bucket-versioning \
    --bucket "$BUCKET_NAME" \
    --versioning-configuration Status=Enabled
log_success "Versioning enabled"

# Enable encryption
log_info "Enabling encryption on S3 bucket..."
aws s3api put-bucket-encryption \
    --bucket "$BUCKET_NAME" \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            }
        }]
    }'
log_success "Encryption enabled"

# Block public access
log_info "Blocking public access to S3 bucket..."
aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration \
        "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
log_success "Public access blocked"

# Create DynamoDB table
echo ""
log_info "Creating DynamoDB table: $DYNAMODB_TABLE"
if aws dynamodb describe-table \
    --table-name "$DYNAMODB_TABLE" \
    --region "$REGION" 2>/dev/null | grep -q "TableStatus"; then
    log_success "Table already exists"
else
    aws dynamodb create-table \
        --table-name "$DYNAMODB_TABLE" \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region "$REGION"

    # Wait for table to be created
    log_info "Waiting for DynamoDB table to be active..."
    aws dynamodb wait table-exists \
        --table-name "$DYNAMODB_TABLE" \
        --region "$REGION"
    log_success "DynamoDB table created and active"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Backend setup complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Next steps:"
echo "1. Copy backend.hcl.example to backend.hcl"
echo "2. Copy terraform.tfvars.example to terraform.tfvars"
echo "3. Update values in terraform.tfvars"
echo "4. Run: terraform init -backend-config=backend.hcl"
echo "5. Run: terraform plan"
echo "6. Run: terraform apply"
echo ""
