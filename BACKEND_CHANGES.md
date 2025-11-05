# Backend Changes - Company & Location Structure

## ✅ Changes Applied

### 1. New Models
- `app/models/company.py` - Client organizations
- `app/models/location.py` - Physical sites/plants
- Updated `app/models/project.py` - Added `location_id` FK

### 2. New Schemas
- `app/schemas/company.py` - CompanyCreate, CompanyUpdate, CompanySummary, CompanyDetail
- `app/schemas/location.py` - LocationCreate, LocationUpdate, LocationSummary, LocationDetail

### 3. New API Endpoints
**Companies:**
- `GET /api/v1/companies` - List all companies
- `POST /api/v1/companies` - Create company
- `GET /api/v1/companies/{id}` - Get company details
- `PUT /api/v1/companies/{id}` - Update company
- `DELETE /api/v1/companies/{id}` - Delete company (cascades to locations/projects)

**Locations:**
- `GET /api/v1/companies/{company_id}/locations` - List company locations
- `POST /api/v1/companies/{company_id}/locations` - Create location
- `GET /api/v1/companies/locations/{id}` - Get location details
- `PUT /api/v1/companies/locations/{id}` - Update location
- `DELETE /api/v1/companies/locations/{id}` - Delete location (cascades to projects)

### 4. Database Migration
- `alembic/versions/20241104_1400-c1d2e3f4g5h6_add_company_location.py`

## 🚀 How to Apply

### Step 1: Run Migration

```bash
cd backend

# Run the migration
docker-compose exec app alembic upgrade head

# Or if running locally:
alembic upgrade head
```

### Step 2: Verify Tables

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d h2o_allegiant

# Check tables
\dt

# Should show:
#  companies
#  locations
#  projects (with new location_id column)
```

### Step 3: Test API

```bash
# Start backend (if not running)
cd backend && docker-compose up

# API docs available at:
# http://localhost:8000/api/v1/docs
```

## 🧪 Test Workflow

### 1. Create a Company

```bash
curl -X POST http://localhost:8000/api/v1/companies \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Honda Manufacturing",
    "industry": "Automotive",
    "contact_name": "Juan Pérez",
    "contact_email": "[email protected]",
    "contact_phone": "+52 33 1234 5678"
  }'
```

Response:
```json
{
  "id": "uuid-here",
  "name": "Honda Manufacturing",
  "industry": "Automotive",
  "location_count": 0,
  "created_at": "2024-11-04T14:00:00Z",
  ...
}
```

### 2. Create a Location

```bash
curl -X POST http://localhost:8000/api/v1/companies/{company_id}/locations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "uuid-from-step-1",
    "name": "Planta Guadalajara",
    "city": "Guadalajara",
    "state": "Jalisco",
    "address": "Av. Industrial 123"
  }'
```

### 3. Create a Project (Updated)

```bash
curl -X POST http://localhost:8000/api/v1/projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "location_id": "uuid-from-step-2",
    "name": "Evaluación Madera - Nov 2024",
    "sector": "Industrial",
    ...
  }'
```

## 📊 Data Structure

```
Company: Honda Manufacturing
  ├─ Location: Planta Guadalajara
  │    ├─ Project: Evaluación Madera
  │    └─ Project: Evaluación Plástico
  └─ Location: Planta Celaya
       └─ Project: Evaluación Metal
```

## 🔄 Backward Compatibility

The migration keeps `projects.client` and `projects.location` columns for backward compatibility:

- **Old projects**: Will continue working with legacy fields
- **New projects**: Should use `location_id` and get company/location via relationships
- **Properties added**: `project.company_name` and `project.location_name` work for both

## 🐛 Troubleshooting

### Migration Fails
```bash
# Check current migration
docker-compose exec app alembic current

# Rollback if needed
docker-compose exec app alembic downgrade -1

# Then try upgrade again
docker-compose exec app alembic upgrade head
```

### Import Errors
```bash
# Restart container to reload models
docker-compose restart app
```

### API Not Showing New Endpoints
- Check FastAPI docs: http://localhost:8000/api/v1/docs
- Look for "Companies & Locations" section
- Make sure `app/main.py` includes `companies.router`

## 📝 Next Steps

1. ✅ Backend models and APIs - DONE
2. ⏳ Frontend TypeScript types
3. ⏳ Frontend API clients
4. ⏳ Frontend UI components
5. ⏳ Update project creation flow

See `MIGRATION_PLAN.md` for full roadmap.
