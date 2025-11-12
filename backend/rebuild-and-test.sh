#!/bin/bash

# Rebuild and Test Script for Token Optimization (Opción C)
# Author: Ricardo Altamirano
# Date: Oct 19, 2025

set -e  # Exit on error

echo "════════════════════════════════════════════════════════════"
echo "🚀 REBUILD DOCKER - Token Optimization (Opción C)"
echo "════════════════════════════════════════════════════════════"
echo ""

# Step 1: Stop containers
echo "📦 Step 1/5: Stopping Docker containers..."
docker-compose down
echo "✅ Containers stopped"
echo ""

# Step 2: Remove volumes (optional, uncomment if needed)
# echo "🗑️  Step 2/5: Removing Docker volumes..."
# docker volume prune -f
# echo "✅ Volumes removed"
# echo ""

# Step 3: Rebuild without cache
echo "🔨 Step 2/5: Rebuilding app container (no cache)..."
docker-compose build --no-cache app
echo "✅ Container rebuilt"
echo ""

# Step 4: Start containers
echo "🚀 Step 3/5: Starting containers..."
docker-compose up -d
echo "✅ Containers started"
echo ""

# Step 5: Wait for services
echo "⏳ Step 4/5: Waiting for services to be ready..."
echo "   Waiting 15 seconds for backend initialization..."
sleep 15
echo "✅ Services should be ready"
echo ""

# Step 6: Show logs
echo "📋 Step 5/5: Showing recent logs (Ctrl+C to exit)..."
echo "════════════════════════════════════════════════════════════"
docker-compose logs -f --tail=50 app

# Note: User can press Ctrl+C to exit logs and continue testing
