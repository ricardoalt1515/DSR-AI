#!/bin/bash
set -e

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para esperar a que un servicio esté disponible
wait_for() {
    local host=$1
    local port=$2
    local service_name=$3
    
    echo -e "${YELLOW}⏳ Esperando a que $service_name ($host:$port) esté disponible...${NC}"
    
    local max_attempts=30
    local attempt=0
    
    until nc -z -v -w30 "$host" "$port" > /dev/null 2>&1; do
        attempt=$((attempt + 1))
        
        if [ $attempt -ge $max_attempts ]; then
            echo -e "❌ Error: $service_name no está disponible después de $max_attempts intentos"
            exit 1
        fi
        
        echo "⏳ Reintentando conexión a $service_name en 2 segundos... (intento $attempt/$max_attempts)"
        sleep 2
    done
    
    echo -e "${GREEN}✅ $service_name está disponible!${NC}"
}

# Banner
echo "=================================="
echo "🌊 H2O Allegiant Backend"
echo "=================================="

# Verificar variables de entorno críticas
echo -e "\n${YELLOW}🔍 Verificando configuración...${NC}"
echo "POSTGRES_SERVER=${POSTGRES_SERVER:-postgres}"
echo "POSTGRES_PORT=${POSTGRES_PORT:-5432}"
echo "POSTGRES_DB=${POSTGRES_DB}"
echo "REDIS_HOST=${REDIS_HOST:-redis}"
echo "REDIS_PORT=${REDIS_PORT:-6379}"
echo "ENVIRONMENT=${ENVIRONMENT}"

# Esperar por PostgreSQL
wait_for "${POSTGRES_SERVER:-postgres}" "${POSTGRES_PORT:-5432}" "PostgreSQL"

# Esperar por Redis
wait_for "${REDIS_HOST:-redis}" "${REDIS_PORT:-6379}" "Redis"

echo -e "\n${GREEN}✅ Todos los servicios están listos${NC}"

# Ejecutar migraciones en desarrollo si está habilitado
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo -e "\n${YELLOW}🔄 Ejecutando migraciones de base de datos...${NC}"
    alembic upgrade head || echo "⚠️  Migraciones fallaron o no hay cambios"
fi

# Iniciar aplicación
echo -e "\n${GREEN}🚀 Iniciando H2O Allegiant Backend...${NC}"
echo "Comando: $@"
echo "=================================="

exec "$@"
