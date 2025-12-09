#!/bin/bash
set -e

echo "=========================================="
echo "AWS Hydrous Cleanup Script"
echo "Estimated savings: $142/month"
echo "=========================================="
echo ""
echo "WARNING: This will DELETE the following projects:"
echo "  - hydrous (production)"
echo "  - hydrous-staging"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Starting cleanup process..."
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Phase 1: Scale down ECS services
echo "=========================================="
echo "Phase 1: Scaling down ECS services"
echo "=========================================="

echo "Scaling down hydrous-backend-service..."
aws ecs update-service --cluster hydrous-cluster --service hydrous-backend-service --desired-count 0 --no-cli-pager 2>/dev/null && print_status "Hydrous service scaled to 0" || print_error "Failed to scale hydrous service"

echo "Scaling down hydrous-staging-service..."
aws ecs update-service --cluster hydrous-staging-cluster --service hydrous-staging-service --desired-count 0 --no-cli-pager 2>/dev/null && print_status "Hydrous-staging service scaled to 0" || print_error "Failed to scale staging service"

echo "Waiting 30 seconds for tasks to stop..."
sleep 30

# Phase 2: Delete ECS services and clusters
echo ""
echo "=========================================="
echo "Phase 2: Deleting ECS services and clusters"
echo "=========================================="

echo "Deleting hydrous-backend-service..."
aws ecs delete-service --cluster hydrous-cluster --service hydrous-backend-service --force --no-cli-pager 2>/dev/null && print_status "Hydrous service deleted" || print_error "Failed to delete hydrous service"

echo "Deleting hydrous-staging-service..."
aws ecs delete-service --cluster hydrous-staging-cluster --service hydrous-staging-service --force --no-cli-pager 2>/dev/null && print_status "Hydrous-staging service deleted" || print_error "Failed to delete staging service"

echo "Waiting 20 seconds..."
sleep 20

echo "Deleting hydrous-cluster..."
aws ecs delete-cluster --cluster hydrous-cluster --no-cli-pager 2>/dev/null && print_status "Hydrous cluster deleted" || print_error "Failed to delete hydrous cluster"

echo "Deleting hydrous-staging-cluster..."
aws ecs delete-cluster --cluster hydrous-staging-cluster --no-cli-pager 2>/dev/null && print_status "Hydrous-staging cluster deleted" || print_error "Failed to delete staging cluster"

# Phase 3: Delete Load Balancers
echo ""
echo "=========================================="
echo "Phase 3: Deleting Load Balancers"
echo "=========================================="

echo "Getting hydrous ALB ARN..."
HYDROUS_ALB_ARN=$(aws elbv2 describe-load-balancers --names hydrous-alb-new --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null)
if [ -n "$HYDROUS_ALB_ARN" ]; then
    echo "Deleting hydrous-alb-new..."
    aws elbv2 delete-load-balancer --load-balancer-arn "$HYDROUS_ALB_ARN" --no-cli-pager && print_status "Hydrous ALB deleted"
else
    print_warning "Hydrous ALB not found"
fi

echo "Getting hydrous-staging ALB ARN..."
STAGING_ALB_ARN=$(aws elbv2 describe-load-balancers --names hydrous-staging-alb --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null)
if [ -n "$STAGING_ALB_ARN" ]; then
    echo "Deleting hydrous-staging-alb..."
    aws elbv2 delete-load-balancer --load-balancer-arn "$STAGING_ALB_ARN" --no-cli-pager && print_status "Hydrous-staging ALB deleted"
else
    print_warning "Hydrous-staging ALB not found"
fi

echo "Waiting 30 seconds for ALBs to be deleted..."
sleep 30

# Phase 4: Delete Target Groups
echo ""
echo "=========================================="
echo "Phase 4: Deleting Target Groups"
echo "=========================================="

aws elbv2 delete-target-group --target-group-arn arn:aws:elasticloadbalancing:us-east-1:882816896907:targetgroup/hydrous-tg/5157a5bc2b9a3ba1 --no-cli-pager 2>/dev/null && print_status "hydrous-tg deleted" || print_warning "Failed to delete hydrous-tg"

aws elbv2 delete-target-group --target-group-arn arn:aws:elasticloadbalancing:us-east-1:882816896907:targetgroup/hydrous-tg-new/099b15527c073eea --no-cli-pager 2>/dev/null && print_status "hydrous-tg-new deleted" || print_warning "Failed to delete hydrous-tg-new"

aws elbv2 delete-target-group --target-group-arn arn:aws:elasticloadbalancing:us-east-1:882816896907:targetgroup/hydrous-staging-app-tg/b6eb4227266a9ccf --no-cli-pager 2>/dev/null && print_status "hydrous-staging-app-tg deleted" || print_warning "Failed to delete hydrous-staging-app-tg"

# Phase 5: Delete RDS instances
echo ""
echo "=========================================="
echo "Phase 5: Deleting RDS instances (creating final snapshots)"
echo "=========================================="

SNAPSHOT_DATE=$(date +%Y%m%d-%H%M)

echo "Deleting hydrous-db (with final snapshot)..."
aws rds delete-db-instance \
  --db-instance-identifier hydrous-db \
  --final-db-snapshot-identifier hydrous-db-final-${SNAPSHOT_DATE} \
  --no-delete-automated-backups \
  --no-cli-pager 2>/dev/null && print_status "Hydrous RDS deletion initiated (snapshot: hydrous-db-final-${SNAPSHOT_DATE})" || print_error "Failed to delete hydrous RDS"

echo "Deleting hydrous-staging-database (with final snapshot)..."
aws rds delete-db-instance \
  --db-instance-identifier hydrous-staging-database \
  --final-db-snapshot-identifier hydrous-staging-db-final-${SNAPSHOT_DATE} \
  --no-delete-automated-backups \
  --no-cli-pager 2>/dev/null && print_status "Hydrous-staging RDS deletion initiated (snapshot: hydrous-staging-db-final-${SNAPSHOT_DATE})" || print_error "Failed to delete staging RDS"

print_warning "RDS deletion takes 5-15 minutes. Continuing with other resources..."

# Phase 6: Delete ElastiCache
echo ""
echo "=========================================="
echo "Phase 6: Deleting ElastiCache clusters"
echo "=========================================="

echo "Deleting hydrous-redis..."
aws elasticache delete-cache-cluster --cache-cluster-id hydrous-redis --no-cli-pager 2>/dev/null && print_status "Hydrous Redis deleted" || print_error "Failed to delete hydrous Redis"

echo "Deleting hydrous-staging-redis..."
aws elasticache delete-cache-cluster --cache-cluster-id hydrous-staging-redis --no-cli-pager 2>/dev/null && print_status "Hydrous-staging Redis deleted" || print_error "Failed to delete staging Redis"

# Phase 7: Delete NAT Gateways
echo ""
echo "=========================================="
echo "Phase 7: Deleting NAT Gateways"
echo "=========================================="

echo "Deleting NAT Gateway nat-07956edb4bf6f1ad1..."
aws ec2 delete-nat-gateway --nat-gateway-id nat-07956edb4bf6f1ad1 --no-cli-pager 2>/dev/null && print_status "NAT Gateway 1 deletion initiated" || print_warning "Failed to delete NAT Gateway 1"

echo "Deleting NAT Gateway nat-01bd79ac9636668fe..."
aws ec2 delete-nat-gateway --nat-gateway-id nat-01bd79ac9636668fe --no-cli-pager 2>/dev/null && print_status "NAT Gateway 2 deletion initiated" || print_warning "Failed to delete NAT Gateway 2"

print_warning "NAT Gateway deletion takes 3-5 minutes. Waiting 60 seconds before continuing..."
sleep 60

# Phase 8: Clean S3 buckets
echo ""
echo "=========================================="
echo "Phase 8: Cleaning and deleting S3 buckets"
echo "=========================================="

echo "Emptying hydrous-proposals-storage-882816896907..."
aws s3 rm s3://hydrous-proposals-storage-882816896907 --recursive --no-cli-pager 2>/dev/null && print_status "Bucket emptied" || print_warning "Failed to empty bucket"
aws s3 rb s3://hydrous-proposals-storage-882816896907 --no-cli-pager 2>/dev/null && print_status "hydrous-proposals-storage deleted" || print_warning "Failed to delete bucket"

echo "Emptying hydrous-terraform-state-882816896907..."
aws s3 rm s3://hydrous-terraform-state-882816896907 --recursive --no-cli-pager 2>/dev/null && print_status "Bucket emptied" || print_warning "Failed to empty bucket"
aws s3 rb s3://hydrous-terraform-state-882816896907 --no-cli-pager 2>/dev/null && print_status "hydrous-terraform-state deleted" || print_warning "Failed to delete bucket"

echo "Emptying hydrous-staging-proposals-882816896907..."
aws s3 rm s3://hydrous-staging-proposals-882816896907 --recursive --no-cli-pager 2>/dev/null && print_status "Bucket emptied" || print_warning "Failed to empty bucket"
aws s3 rb s3://hydrous-staging-proposals-882816896907 --no-cli-pager 2>/dev/null && print_status "hydrous-staging-proposals deleted" || print_warning "Failed to delete bucket"

echo "Emptying hydrous-staging-alb-logs-882816896907..."
aws s3 rm s3://hydrous-staging-alb-logs-882816896907 --recursive --no-cli-pager 2>/dev/null && print_status "Bucket emptied" || print_warning "Failed to empty bucket"
aws s3 rb s3://hydrous-staging-alb-logs-882816896907 --no-cli-pager 2>/dev/null && print_status "hydrous-staging-alb-logs deleted" || print_warning "Failed to delete bucket"

# Phase 9: Delete ECR repository
echo ""
echo "=========================================="
echo "Phase 9: Deleting ECR repository"
echo "=========================================="

echo "Deleting hydrous-backend ECR repository..."
aws ecr delete-repository --repository-name hydrous-backend --force --no-cli-pager 2>/dev/null && print_status "Hydrous ECR repository deleted" || print_warning "Failed to delete ECR repository"

# Phase 10: Delete VPC resources (only hydrous-vpc, NOT default)
echo ""
echo "=========================================="
echo "Phase 10: Deleting VPC resources (hydrous-vpc only)"
echo "=========================================="

VPC_ID="vpc-0e54fd5e53f389df7"

print_warning "Waiting for NAT Gateways to finish deleting before VPC cleanup..."
echo "Checking NAT Gateway status..."
for i in {1..12}; do
    NAT_STATUS=$(aws ec2 describe-nat-gateways --nat-gateway-ids nat-07956edb4bf6f1ad1 nat-01bd79ac9636668fe --query 'NatGateways[*].State' --output text 2>/dev/null || echo "deleted")
    if [[ "$NAT_STATUS" == *"deleted"* ]] || [[ "$NAT_STATUS" == "deleted" ]]; then
        print_status "NAT Gateways deleted"
        break
    fi
    echo "NAT Gateways still deleting... (attempt $i/12)"
    sleep 30
done

echo "Getting Elastic IPs from NAT Gateways..."
EIP1=$(aws ec2 describe-addresses --filters "Name=tag:Name,Values=hydrous-vpc-nat-1b" --query 'Addresses[0].AllocationId' --output text 2>/dev/null)
EIP2=$(aws ec2 describe-addresses --filters "Name=tag:Name,Values=hydrous-vpc-nat-1a" --query 'Addresses[0].AllocationId' --output text 2>/dev/null)

if [ -n "$EIP1" ] && [ "$EIP1" != "None" ]; then
    echo "Releasing Elastic IP $EIP1..."
    aws ec2 release-address --allocation-id "$EIP1" --no-cli-pager 2>/dev/null && print_status "EIP 1 released" || print_warning "Failed to release EIP 1"
fi

if [ -n "$EIP2" ] && [ "$EIP2" != "None" ]; then
    echo "Releasing Elastic IP $EIP2..."
    aws ec2 release-address --allocation-id "$EIP2" --no-cli-pager 2>/dev/null && print_status "EIP 2 released" || print_warning "Failed to release EIP 2"
fi

echo "Deleting Security Groups (except default)..."
SG_IDS=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" --query 'SecurityGroups[?GroupName!=`default`].GroupId' --output text 2>/dev/null)
for SG_ID in $SG_IDS; do
    aws ec2 delete-security-group --group-id "$SG_ID" --no-cli-pager 2>/dev/null && print_status "Security Group $SG_ID deleted" || print_warning "Failed to delete SG $SG_ID (may have dependencies)"
done

echo "Deleting Subnets..."
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[*].SubnetId' --output text 2>/dev/null)
for SUBNET_ID in $SUBNET_IDS; do
    aws ec2 delete-subnet --subnet-id "$SUBNET_ID" --no-cli-pager 2>/dev/null && print_status "Subnet $SUBNET_ID deleted" || print_warning "Failed to delete subnet $SUBNET_ID"
done

echo "Deleting Route Tables (except main)..."
RT_IDS=$(aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$VPC_ID" --query 'RouteTables[?Associations[0].Main!=`true`].RouteTableId' --output text 2>/dev/null)
for RT_ID in $RT_IDS; do
    aws ec2 delete-route-table --route-table-id "$RT_ID" --no-cli-pager 2>/dev/null && print_status "Route Table $RT_ID deleted" || print_warning "Failed to delete RT $RT_ID"
done

echo "Detaching and deleting Internet Gateway..."
IGW_ID=$(aws ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=$VPC_ID" --query 'InternetGateways[0].InternetGatewayId' --output text 2>/dev/null)
if [ -n "$IGW_ID" ] && [ "$IGW_ID" != "None" ]; then
    aws ec2 detach-internet-gateway --internet-gateway-id "$IGW_ID" --vpc-id "$VPC_ID" --no-cli-pager 2>/dev/null && print_status "IGW detached"
    aws ec2 delete-internet-gateway --internet-gateway-id "$IGW_ID" --no-cli-pager 2>/dev/null && print_status "IGW deleted"
fi

echo "Deleting VPC..."
aws ec2 delete-vpc --vpc-id "$VPC_ID" --no-cli-pager 2>/dev/null && print_status "VPC $VPC_ID deleted" || print_error "Failed to delete VPC (may have remaining dependencies)"

# Summary
echo ""
echo "=========================================="
echo "Cleanup Complete!"
echo "=========================================="
echo ""
print_status "Estimated monthly savings: \$142"
echo ""
echo "Final snapshots created:"
echo "  - hydrous-db-final-${SNAPSHOT_DATE}"
echo "  - hydrous-staging-db-final-${SNAPSHOT_DATE}"
echo ""
print_warning "Note: RDS instances may still be deleting. Check AWS Console."
print_warning "Note: Some resources may take up to 15 minutes to fully delete."
echo ""
echo "Run verification commands:"
echo "  aws ecs list-clusters | grep hydrous"
echo "  aws rds describe-db-instances --query 'DBInstances[*].DBInstanceIdentifier' | grep hydrous"
echo "  aws ec2 describe-vpcs --query 'Vpcs[*].[VpcId,Tags[?Key==\`Name\`].Value|[0]]' | grep hydrous"
echo ""
print_status "Done!"
