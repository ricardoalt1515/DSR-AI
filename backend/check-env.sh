#!/bin/bash

# H2O Allegiant - Environment Variables Checker
# Verifica que todas las variables requeridas estén configuradas

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 H2O Allegiant - Environment Variables Checker${NC}"
echo "=================================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo ""
    echo "Run: cp .env.example .env"
    echo "Then edit .env and add your secrets"
    exit 1
fi

echo -e "${GREEN}✓ .env file exists${NC}"
echo ""

# Load .env
export $(cat .env | grep -v '^#' | xargs)

# Required variables
REQUIRED_VARS=(
    "OPENAI_API_KEY"
    "SECRET_KEY"
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "POSTGRES_SERVER"
    "POSTGRES_DB"
)

# Check each variable
ERRORS=0

echo "Checking required variables:"
echo ""

for VAR in "${REQUIRED_VARS[@]}"; do
    VALUE="${!VAR}"
    
    if [ -z "$VALUE" ]; then
        echo -e "${RED}❌ $VAR is not set${NC}"
        ERRORS=$((ERRORS + 1))
    elif [[ "$VALUE" == *"your-"* || "$VALUE" == *"sk-your-"* ]]; then
        echo -e "${YELLOW}⚠️  $VAR still has placeholder value${NC}"
        ERRORS=$((ERRORS + 1))
    else
        # Show masked value for secrets
        if [[ "$VAR" == *"KEY"* || "$VAR" == *"PASSWORD"* || "$VAR" == *"SECRET"* ]]; then
            MASKED="${VALUE:0:10}***"
            echo -e "${GREEN}✓ $VAR = $MASKED${NC}"
        else
            echo -e "${GREEN}✓ $VAR = $VALUE${NC}"
        fi
    fi
done

echo ""

# Summary
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All required variables are configured!${NC}"
    echo ""
    echo "You can now run:"
    echo "  docker-compose up"
    exit 0
else
    echo -e "${RED}❌ Found $ERRORS error(s)${NC}"
    echo ""
    echo "Please update your .env file with actual values:"
    echo "  nano .env"
    echo ""
    echo "To generate SECRET_KEY:"
    echo "  openssl rand -hex 32"
    exit 1
fi
