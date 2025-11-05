# 🚀 Waste Platform - Setup Guide

## ⚠️ IMPORTANTE: Configuración de Puertos

Este proyecto usa **puertos diferentes** al proyecto de agua para evitar conflictos:

| Servicio | Proyecto Agua | Waste Platform |
|----------|---------------|----------------|
| Backend API | 8000 | **8001** |
| PostgreSQL | 5432 | **5433** |
| Redis | 6379 | **6380** |
| Frontend | 3000 | 3000 |

## 📋 Prerequisitos

- Docker Desktop instalado
- Node.js 18+ instalado
- Git

## 🔧 Setup Backend

### 1. Configurar Variables de Entorno

```bash
cd backend
cp .env.example .env

# Editar .env con tus valores
# Las credenciales de DB ya están configuradas en docker-compose.yml
```

### 2. Levantar Servicios con Docker

```bash
cd backend
docker compose up -d

# Verificar que los contenedores estén corriendo
docker compose ps

# Deberías ver:
# waste-platform-app       (puerto 8001)
# waste-platform-postgres  (puerto 5433)
# waste-platform-redis     (puerto 6380)
```

### 3. Aplicar Migraciones

```bash
docker compose exec app alembic upgrade head
```

### 4. Verificar API

Abrir en navegador: http://localhost:8001/api/v1/docs

Deberías ver la documentación de FastAPI con los endpoints de:
- Companies
- Locations
- Projects
- etc.

## 🎨 Setup Frontend

### 1. Instalar Dependencias

```bash
cd frontend
npm install
```

### 2. Configurar Variables de Entorno

```bash
cp .env.example .env.local

# Editar .env.local:
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001/api/v1
NEXT_PUBLIC_DISABLE_API=0
```

**⚠️ NOTA:** El puerto del backend es **8001**, no 8000.

### 3. Levantar Frontend

```bash
npm run dev
```

Abrir en navegador: http://localhost:3000

## 🧪 Probar el Sistema

### 1. Crear Usuario

```bash
# Ir a http://localhost:3000/auth/register
# O usar API docs: http://localhost:8001/api/v1/docs
```

### 2. Login

```bash
# Ir a http://localhost:3000/auth/login
```

### 3. Crear Company

```bash
# Ir a http://localhost:3000/companies
# Click "New Company"
# Llenar formulario:
#   - Name: Honda Manufacturing
#   - Industry: Automotive
#   - Contact: Juan Pérez
#   - Email: [email protected]
```

### 4. Crear Location

```bash
# Click en la company creada
# Click "New Location"
# Llenar formulario:
#   - Name: Planta Guadalajara
#   - City: Guadalajara
#   - State: Jalisco
#   - Address: Av. Industrial 123
```

### 5. Crear Project

```bash
# Click en la location creada
# Click "New Project Here"
# (Este flujo aún no está implementado completamente)
```

## 🔄 Comandos Útiles

### Backend

```bash
# Ver logs
docker compose logs -f app

# Reiniciar servicios
docker compose restart

# Parar servicios
docker compose down

# Parar y eliminar volúmenes (⚠️ BORRA LA BASE DE DATOS)
docker compose down -v

# Ejecutar comandos dentro del contenedor
docker compose exec app bash
docker compose exec app alembic current
docker compose exec app python -m pytest
```

### Frontend

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Iniciar producción
npm start

# Linting
npm run lint

# Format
npm run format
```

## 🐛 Troubleshooting

### Error: "Port 8001 already in use"

```bash
# Ver qué está usando el puerto
lsof -i :8001

# Matar el proceso
kill -9 <PID>
```

### Error: "Cannot connect to backend"

1. Verificar que el backend esté corriendo:
   ```bash
   docker compose ps
   ```

2. Verificar el puerto en `.env.local`:
   ```
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8001/api/v1
   ```

3. Verificar logs del backend:
   ```bash
   docker compose logs app
   ```

### Error: "Database connection failed"

```bash
# Verificar que PostgreSQL esté corriendo
docker compose ps postgres

# Ver logs de PostgreSQL
docker compose logs postgres

# Reiniciar PostgreSQL
docker compose restart postgres
```

### Frontend no carga datos

1. Abrir DevTools (F12)
2. Ver tab Network
3. Verificar que las requests vayan a `localhost:8001`
4. Ver errores en Console

## 📚 Estructura de Datos

```
Company (Honda Manufacturing)
  ├─ Location (Planta Guadalajara)
  │    ├─ Project (Evaluación Madera)
  │    └─ Project (Evaluación Plástico)
  └─ Location (Planta Celaya)
       └─ Project (Evaluación Metal)
```

## 🔐 Autenticación

El sistema usa JWT tokens:

1. Register/Login → Obtiene token
2. Token se guarda en localStorage
3. Todas las requests incluyen: `Authorization: Bearer <token>`
4. Token expira en 24h

## 📝 Siguiente Paso

Una vez que todo funcione:

1. ✅ Backend corriendo en puerto 8001
2. ✅ Frontend corriendo en puerto 3000
3. ✅ Puedes crear Companies y Locations
4. ⏳ Falta: Integrar Company/Location en creación de proyectos

Ver `FRONTEND_PROGRESS.md` para el roadmap completo.
