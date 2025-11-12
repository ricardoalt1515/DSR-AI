#!/bin/bash

echo "🔍 Diagnóstico del Endpoint de Polling"
echo "======================================"
echo ""

# 1. Verificar que el backend esté corriendo
echo "1. Verificando backend..."
HEALTH_CHECK=$(curl -s http://localhost:8000/health)
if [ $? -eq 0 ]; then
    echo "   ✅ Backend está corriendo"
else
    echo "   ❌ Backend NO está corriendo"
    exit 1
fi

# 2. Verificar endpoints de proposals
echo ""
echo "2. Verificando rutas de proposals..."
echo "   Ruta esperada: /api/v1/ai/proposals/jobs/{job_id}"

# 3. Probar generar una propuesta (necesitas token)
echo ""
echo "3. Para probar completo, necesitas:"
echo "   a) Login para obtener token"
echo "   b) Generar propuesta"
echo "   c) Polling del job"
echo ""

# 4. Ver qué rutas están registradas
echo "4. Verificando OpenAPI docs..."
echo "   Abre: http://localhost:8000/docs"
echo "   Busca: GET /api/v1/ai/proposals/jobs/{job_id}"
echo ""

# 5. Verificar Redis
echo "5. Verificando Redis..."
REDIS_CHECK=$(docker exec $(docker ps -q -f name=redis) redis-cli ping 2>/dev/null)
if [ "$REDIS_CHECK" = "PONG" ]; then
    echo "   ✅ Redis está corriendo"
    echo ""
    echo "   Ver jobs en Redis:"
    echo "   docker exec -it \$(docker ps -q -f name=redis) redis-cli KEYS 'job:*'"
else
    echo "   ❌ Redis NO está accesible"
fi

echo ""
echo "======================================"
echo "📋 Prueba Manual:"
echo "======================================"
echo ""
echo "# 1. Login y obtén token"
echo "curl -X POST http://localhost:8000/api/v1/auth/login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"username\":\"test@example.com\",\"password\":\"password123\"}'"
echo ""
echo "# 2. Guarda el access_token"
echo ""
echo "# 3. Genera propuesta"
echo "curl -X POST http://localhost:8000/api/v1/ai/proposals/generate \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"project_id\":\"YOUR_PROJECT_ID\",\"proposal_type\":\"Technical\"}'"
echo ""
echo "# 4. Copia el job_id de la respuesta"
echo ""
echo "# 5. Polling (reemplaza JOB_ID y TOKEN)"
echo "curl -X GET http://localhost:8000/api/v1/ai/proposals/jobs/JOB_ID \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN'"
echo ""
