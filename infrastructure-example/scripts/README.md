# 🚀 Deployment Scripts

Scripts profesionales para deployment de H2O Allegiant.

---

## 📋 Prerequisites

```bash
# Install required tools
brew install docker awscli jq

# Configure AWS credentials
aws configure
```

---

## 🎯 Quick Start

### **Full Deployment** (Recommended)
```bash
cd infrastructure/scripts
./deploy-backend.sh
```

### **Skip Docker Build** (if image already exists)
```bash
./deploy-backend.sh --skip-build
```

### **Skip Migrations** (if DB already migrated)
```bash
./deploy-backend.sh --skip-migrations
```

---

## 📊 What the Script Does

1. ✅ **Checks Prerequisites**
   - Verifies Docker, AWS CLI, jq are installed
   - Validates AWS credentials

2. 🔐 **Retrieves Secrets**
   - Gets DB password from AWS Secrets Manager
   - Sets up environment variables

3. 🏗️ **Builds Docker Image**
   - Builds for linux/amd64 (Fargate)
   - Tags with `latest` and git commit hash
   - Multi-platform support

4. 📤 **Pushes to ECR**
   - Authenticates with ECR
   - Pushes both tags
   - Verifies upload

5. 🗄️ **Runs Migrations**
   - Connects to RDS
   - Runs Alembic migrations
   - Validates schema

6. 👤 **Creates Admin User**
   - Creates default admin account
   - Email: `admin@h2o-allegiant.com`
   - Password: `ChangeMe123!`
   - ⚠️ **CHANGE IMMEDIATELY**

7. 🚀 **Deploys to ECS**
   - Forces new deployment
   - Waits for stability
   - Verifies running tasks

8. 🔍 **Verifies Deployment**
   - Checks task count
   - Tests health endpoint
   - Shows recent logs

---

## 🛠️ Manual Steps (if needed)

### **Build Only**
```bash
cd backend
docker build --platform linux/amd64 -t h2o-backend .
```

### **Push Only**
```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  882816896907.dkr.ecr.us-east-1.amazonaws.com

docker tag h2o-backend:latest \
  882816896907.dkr.ecr.us-east-1.amazonaws.com/h2o-allegiant-prod-backend:latest

docker push \
  882816896907.dkr.ecr.us-east-1.amazonaws.com/h2o-allegiant-prod-backend:latest
```

### **Migrations Only**
```bash
cd backend
export DATABASE_URL="postgresql://h2o_admin:PASSWORD@RDS_ENDPOINT:5432/h2o_allegiant"
alembic upgrade head
```

### **Force Deployment**
```bash
aws ecs update-service \
  --cluster h2o-allegiant-prod-cluster \
  --service h2o-allegiant-prod-backend \
  --force-new-deployment
```

---

## 📝 Monitoring

### **View Logs**
```bash
aws logs tail /ecs/h2o-allegiant-prod-backend --follow
```

### **Check Service Status**
```bash
aws ecs describe-services \
  --cluster h2o-allegiant-prod-cluster \
  --services h2o-allegiant-prod-backend \
  --query 'services[0].[status,runningCount,desiredCount]'
```

### **Check Task Health**
```bash
aws ecs list-tasks \
  --cluster h2o-allegiant-prod-cluster \
  --service-name h2o-allegiant-prod-backend
```

---

## 🔧 Troubleshooting

### **Tasks Not Starting**
```bash
# Check task logs
aws ecs describe-tasks \
  --cluster h2o-allegiant-prod-cluster \
  --tasks TASK_ARN \
  --query 'tasks[0].containers[0].reason'

# Check CloudWatch logs
aws logs tail /ecs/h2o-allegiant-prod-backend --since 10m
```

### **Health Check Failing**
```bash
# Test directly
curl http://ALB_DNS/health

# Check target health
aws elbv2 describe-target-health \
  --target-group-arn TARGET_GROUP_ARN
```

### **Database Connection Issues**
```bash
# Test from local
psql -h RDS_ENDPOINT -U h2o_admin -d h2o_allegiant

# Check security groups
aws ec2 describe-security-groups \
  --group-ids sg-xxx \
  --query 'SecurityGroups[0].IpPermissions'
```

---

## 🎯 Best Practices

### **Before Deployment**
- [ ] Test locally with `docker compose up`
- [ ] Run tests: `pytest`
- [ ] Check migrations: `alembic check`
- [ ] Review changes: `git diff`

### **During Deployment**
- [ ] Monitor CloudWatch logs
- [ ] Watch ECS service events
- [ ] Check ALB target health
- [ ] Verify health endpoint

### **After Deployment**
- [ ] Test critical endpoints
- [ ] Change admin password
- [ ] Set up monitoring alerts
- [ ] Document any issues

---

## 🔐 Security Checklist

- [x] Secrets in AWS Secrets Manager
- [x] No hardcoded credentials
- [x] HTTPS ready (certificate needed)
- [x] Database encrypted at rest
- [x] VPC with private subnets
- [x] Security groups configured
- [ ] Change default admin password
- [ ] Set up WAF (optional)
- [ ] Enable GuardDuty (optional)

---

## 📚 Additional Resources

- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [Docker Multi-platform Builds](https://docs.docker.com/build/building/multi-platform/)
- [Alembic Migrations](https://alembic.sqlalchemy.org/en/latest/tutorial.html)

---

## 🆘 Support

If you encounter issues:

1. Check logs: `aws logs tail /ecs/h2o-allegiant-prod-backend --follow`
2. Verify resources: `terraform show`
3. Review this README
4. Contact DevOps team

---

**Last Updated**: Oct 22, 2025  
**Version**: 1.0.0
