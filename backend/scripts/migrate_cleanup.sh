#!/bin/bash
# Migration script to clean up legacy proposal columns
# Safe for Docker Compose (local) and AWS ECS (production)

set -e  # Exit on error

echo "🗄️  H2O Allegiant - Database Cleanup Migration"
echo "=============================================="
echo ""

# Check if running in Docker
if [ -f /.dockerenv ]; then
    echo "✅ Running inside Docker container"
    DB_HOST="postgres"
else
    echo "⚠️  Running on host machine"
    DB_HOST="localhost"
fi

echo ""
echo "📋 Migration Details:"
echo "   - Remove legacy JSONB columns from proposals table"
echo "   - Columns to drop: equipment_list, treatment_efficiency, cost_breakdown, risks, implementation_plan"
echo "   - Data preserved in: ai_metadata"
echo ""

# Confirm before proceeding
read -p "⚠️  This will modify the database schema. Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration cancelled"
    exit 1
fi

echo ""
echo "🔄 Running Alembic migration..."
echo ""

# Run migration
alembic upgrade head

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "📊 Verification:"
    echo "   Run: SELECT column_name FROM information_schema.columns WHERE table_name='proposals';"
    echo "   Should NOT see: equipment_list, treatment_efficiency, cost_breakdown, risks, implementation_plan"
    echo ""
else
    echo ""
    echo "❌ Migration failed!"
    echo "   To rollback: alembic downgrade -1"
    exit 1
fi
