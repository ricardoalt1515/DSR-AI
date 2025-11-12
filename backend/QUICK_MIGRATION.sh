#!/bin/bash
# FastAPI Users - Quick Migration Script
# Sin backup (solo cuentas de testing)

set -e  # Exit on error

echo "🚀 Iniciando migración a FastAPI Users..."
echo ""

# Paso 1: Reconstruir imagen
echo "📦 Paso 1/4: Reconstruyendo imagen Docker..."
docker-compose down
docker-compose build app

# Paso 2: Iniciar contenedores
echo "🐳 Paso 2/4: Iniciando contenedores..."
docker-compose up -d

# Esperar a que servicios estén listos
echo "⏳ Esperando a que servicios estén listos..."
sleep 10

# Paso 3: Ejecutar migración
echo "🔄 Paso 3/4: Ejecutando migración Alembic..."
docker-compose exec -T app alembic upgrade head

# Paso 4: Verificar
echo "✅ Paso 4/4: Verificando migración..."
docker-compose exec -T app alembic current

echo ""
echo "🎉 ¡Migración completada!"
echo ""
echo "📋 Verifica los cambios:"
echo "   docker-compose exec postgres psql -U h2o_user -d h2o_allegiant -c '\d users'"
echo ""
echo "🧪 Prueba el nuevo endpoint:"
echo "   curl http://localhost:8000/api/v1/docs"
echo ""
echo "📝 Ver logs:"
echo "   docker-compose logs -f app"
