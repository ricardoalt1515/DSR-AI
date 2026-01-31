# Incoming Materials Feature

Materials a location BUYS/CONSUMES for operations, independent from waste streams.

## Model: `IncomingMaterial`

Follow `LocationContact` pattern exactly.

**Fields:**
- `name` (str, required) - Material name
- `category` (enum, required) - chemicals|metals|wood|oil|packaging|plastics|glass|paper|textiles|other
- `volume_frequency` (str, required) - e.g., "500 kg/month", "weekly delivery"
- `quality_spec` (str, optional) - Grade, purity, specs
- `current_supplier` (str, optional)
- `notes` (str, optional)

**Relationships:** FK to Location (cascade delete), organization_id for multi-tenancy.

## Backend Files

| File | Action |
|------|--------|
| `backend/app/models/incoming_material.py` | Create model + enum |
| `backend/app/models/__init__.py` | Export new model |
| `backend/app/models/location.py` | Add `incoming_materials` relationship |
| `backend/app/schemas/incoming_material.py` | Create, Update, Read schemas |
| `backend/app/api/v1/companies.py` | Add CRUD endpoints (after contacts section) |
| `backend/app/api/dependencies.py` | Add permission dependencies |
| `backend/app/authz/policies.py` | Add permission functions |
| `alembic/versions/...` | Migration via `alembic revision --autogenerate` |

**API Endpoints:**
```
GET    /companies/locations/{id}/incoming-materials
POST   /companies/locations/{id}/incoming-materials
PUT    /companies/locations/{id}/incoming-materials/{material_id}
DELETE /companies/locations/{id}/incoming-materials/{material_id}
```

## Frontend Files

| File | Action |
|------|--------|
| `frontend/lib/types/company.ts` | Add types + category enum array |
| `frontend/lib/api/companies.ts` | Add API methods |
| `frontend/components/features/locations/incoming-material-dialog.tsx` | Create dialog (follow contact-dialog) |
| `frontend/components/features/locations/incoming-materials-card.tsx` | Create card (follow contacts-card) |
| `frontend/app/companies/[id]/locations/[locationId]/page.tsx` | Add IncomingMaterialsCard |

## Implementation Order

1. Backend model + migration
2. Backend schemas
3. Backend policies + dependencies
4. Backend API endpoints
5. Frontend types + API
6. Frontend components
7. Integrate into location page

## Verification

1. `cd backend && make check` - Linting/types pass
2. `cd frontend && bun run check:ci` - Linting/types pass
3. Manual test: Create/edit/delete materials via UI
4. Verify materials persist after page refresh
5. Verify cascade delete when location deleted

## Decisions Made

- **Hard delete** (not soft delete) - follows LocationContact pattern
- **Enum for categories** - fixed list, `other` for edge cases; can extend via migration
- **No bulk operations** - out of scope for MVP

## Unresolved Questions

None - requirements are clear. Ready to implement.
