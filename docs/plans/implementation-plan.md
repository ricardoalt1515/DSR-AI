# Bulk Waste Stream Ingestion - Plan Final v4.1

## 1) Resumen
Usuario sube archivo (`xlsx`, `xls`, `csv`, `pdf`, `docx`).
Sistema extrae locations + waste streams (waste stream = `Project`), clasifica, detecta duplicados, y presenta todo en revision humana.
Usuario decide `accept`, `amend`, `reject` por item.
Solo al `Finalize Import` se crean entidades reales.

## 2) Decisiones cerradas
- No crear `Company` desde documento.
- Entrypoints: Company page y Location page.
- `Accept` solo marca decision, no crea entidad.
- `Finalize` crea entidades (transaccional, con lock de estado).
- Duplicado: warning + confirmacion explicita para crear nuevo.
- Matching de Location: `normalize(name)` + `city/state` cuando existan.
- Si quedan items `pending_review`, `Finalize` bloquea.
- Si import inicia en Location y aparecen otras locations del documento, esas filas se marcan `invalid`.
- Si se rechaza una location, sus projects hijos se rechazan en cascada.
- Si falla un item en finalize, rollback total.
- Permisos: `org_admin` y `field_agent`.
- Sin feature flags, sin fallback paths; cambio completo.

## 2.1) Scope y out of scope

In scope:
- Import batch desde archivo y revision completa hasta finalize.
- Creacion de `Location` y `Project` finales desde items aceptados/amended.
- Deteccion de duplicados con confirmacion explicita.

Out of scope:
- Crear `Company` por import.
- Acciones batch de decision (`accept all`, `reject all`) en API.
- Fallback a pipelines legacy o dual-run.

## 3) Concepto clave: entrypoints

| Entrypoint | Boton | Que puede crear |
|---|---|---|
| Company page | `Import Waste Streams` | Locations nuevas + Projects nuevos bajo esa Company |
| Location page | `Import for this Location` | Solo Projects nuevos bajo esa Location |

Regla: si el run inicio desde Location, items tipo `location` quedan `invalid` automaticamente.

## 3.1) Worker model (decision final)

Si, **creamos un worker nuevo dedicado**: `bulk-import-worker`.

Razon:
- evita mezclar colas/estados con `intake-worker` actual;
- mantiene responsabilidad unica por worker;
- reduce riesgo de regresion en ingestion actual.

Implementacion:
- Nuevo script `backend/scripts/bulk_import_worker.py` con mismo patron de polling/lease/backoff del worker actual.
- Nuevo servicio `BulkImportService` con `claim_next_run()`, `process_run()`, `requeue_stale_runs()`, `fail_exhausted_runs()`.
- Nuevo servicio en `backend/docker-compose.yml`: `bulk-import-worker`.

## 4) UX/UI recomendado (wizard 4 pasos)

Ruta base: `/bulk-import`

URL state:
- `/bulk-import?entrypoint=company&id=<uuid>&step=1`
- luego de upload: agregar `run_id=<uuid>` y avanzar `step=2|3|4`
- refresh-safe: UI rehidrata por `run_id`

### Step 1 - Upload
- Drag and drop + boton browse.
- Mostrar formatos aceptados: `xlsx`, `xls`, `csv`, `pdf`, `docx`.
- Validacion inmediata de extension y size.
- Enviar `entrypoint_type` + `entrypoint_id`.
- Al crear run, avanzar a Processing.

### Step 2 - Processing
- Estado visual por fase:
  - `reading_file`
  - `identifying_locations`
  - `extracting_streams`
  - `categorizing`
- Polling de status.
- Si `no_data`: mensaje claro + CTA para subir otro archivo.
- Si `review_ready`: avanzar a Review.

### Step 3 - Review (core)
- Tabla agrupada por Location.
- Filtros rapidos: `All`, `Pending`, `Accepted`, `Rejected`, `Needs Review`.
- Cada fila muestra: nombre, categoria, campos extraidos, confianza, warnings.
- Acciones por fila: `Accept`, `Edit`, `Reject`, `Reset to Pending`.
- Edicion via drawer lateral (no inline), con formulario completo.
- Duplicados:
  - mostrar warning con candidato(s)
  - checkbox `confirm_create_new`
  - sin confirmacion, no permitir dejar ese item en `accepted/amended`
- Badges de confianza:
  - alta: `>= 80`
  - media: `50-79`
  - baja: `< 50`
- Mensaje fijo: "Accept no crea aun. Se crea en Finalize Import."
- Boton `Finalize Import` deshabilitado si existe `pending_review`.

### Step 4 - Summary
- Mostrar conteos finales:
  - locations creadas
  - projects creados
  - rechazados
  - invalidos
  - duplicados resueltos
- Links para navegar a Company/Location.
- CTA para nuevo import.

## 5) Modelo de datos

### `import_runs`
- `id` UUID PK
- `organization_id` UUID FK
- `entrypoint_type` TEXT CHECK (`company`, `location`)
- `entrypoint_id` UUID
- `source_file_path` TEXT
- `source_filename` TEXT
- `status` TEXT CHECK (`uploaded`, `processing`, `review_ready`, `finalizing`, `completed`, `failed`, `no_data`)
- `progress_step` TEXT NULL
- `processing_error` TEXT NULL
- `processing_attempts` INT DEFAULT 0
- `processing_started_at` TIMESTAMPTZ NULL
- `processing_available_at` TIMESTAMPTZ NULL
- counters:
  - `total_items`, `accepted_count`, `rejected_count`, `amended_count`, `invalid_count`, `duplicate_count`
- audit:
  - `created_by_user_id`, `finalized_by_user_id`, `finalized_at`
- `created_at`, `updated_at`

Indexes:
- `(organization_id, status)`
- `(entrypoint_type, entrypoint_id)`
- `(status, created_at)`

### `import_items`
- `id` UUID PK
- `organization_id` UUID FK
- `run_id` UUID FK
- `item_type` TEXT CHECK (`location`, `project`)
- `status` TEXT CHECK (`pending_review`, `accepted`, `amended`, `rejected`, `invalid`)
- `needs_review` BOOL
- `confidence` INT CHECK (0..100)
- `extracted_data` JSONB
- `normalized_data` JSONB
- `user_amendments` JSONB NULL
- `review_notes` TEXT NULL
- `duplicate_candidates` JSONB NULL
- `confirm_create_new` BOOL default false
- `parent_item_id` UUID NULL (project -> location item)
- `created_location_id` UUID NULL
- `created_project_id` UUID NULL
- `created_at`, `updated_at`

Indexes:
- `(run_id, status)`
- `(organization_id, status)`
- `(item_type, status)`

### `normalized_data` contract (v1)

For `item_type=location`:
```json
{
  "name": "Planta Guadalajara",
  "city": "Guadalajara",
  "state": "Jalisco",
  "address": "Av. Industrial 123"
}
```

For `item_type=project`:
```json
{
  "name": "Residuos plasticos PET",
  "category": "plastics",
  "project_type": "Assessment",
  "description": "PET bottles from production line",
  "sector": "Industrial",
  "subsector": "Manufacturing",
  "estimated_volume": "5 tons/month"
}
```

Validation rules:
- Location requires `name`, `city`, `state`.
- Project requires `name`; `project_type` defaults to `Assessment` if missing.
- Project `category` required; missing `category` => `needs_review=true`.
- Missing required fields => `needs_review=true` and cannot finalize until fixed.

## 6) State machine e invariantes

### Run
`uploaded -> processing -> review_ready -> finalizing -> completed`

Excepciones:
- `processing -> no_data`
- `processing|finalizing -> failed`

### Item (editable pre-finalize)
- `pending_review <-> accepted`
- `pending_review <-> amended`
- `pending_review <-> rejected`
- `accepted <-> amended`
- `accepted <-> rejected`
- `amended <-> rejected`
- `invalid` es terminal (system-set)

Invariantes:
- Nunca crear `Company`, `Location`, `Project` antes de finalize.
- `Finalize` solo corre si run esta `review_ready`.
- `Finalize` bloquea si existe item `pending_review`.
- Si location pasa a `rejected`, todos sus projects hijos pasan a `rejected` automaticamente.

## 7) Duplicados y matching

Matching location:
- calcular `normalized_name`
- si hay `city/state`, incluirlos en match

Si hay candidatos duplicados:
- guardar en `duplicate_candidates` con `reason_codes`
- marcar `needs_review=true`

Para dejar item en `accepted` o `amended` con duplicado:
- obligatorio `confirm_create_new=true`

Sin confirmacion:
- item no puede quedar listo para finalize.

## 8) Finalize (transaccional, simplificado MVP)

Contrato MVP:
- No requiere header `Idempotency-Key`.
- Lock de run (`SELECT ... FOR UPDATE`).
- Si `status != review_ready`, devolver `409 Conflict`.
- Revalidar pendientes + duplicados + consistencia parent/child.
- Crear solo items `accepted|amended`.
- Error en cualquier item => rollback total.

Pseudocode base:
```python
run = await db.execute(
    select(ImportRun).where(ImportRun.id == run_id).with_for_update()
)
if run.status != "review_ready":
    raise HTTPException(status_code=409, detail="Already finalizing or completed")
run.status = "finalizing"
await db.flush()
```

Post-finalize replay:
- si `status == completed`, endpoint devuelve `200` con summary persistido.
- si `status == finalizing`, endpoint devuelve `409`.

## 9) API endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/bulk-import/upload` | Subir archivo + crear run |
| GET | `/api/v1/bulk-import/runs/{id}` | Status del run (polling) |
| GET | `/api/v1/bulk-import/runs/{id}/items?page=1&size=50&status=` | Items para revision (paginado) |
| PATCH | `/api/v1/bulk-import/items/{id}` | Accept/amend/reject/reset item |
| POST | `/api/v1/bulk-import/runs/{id}/finalize` | Crear entidades reales |
| GET | `/api/v1/bulk-import/runs/{id}/summary` | Resumen post-finalize |

PATCH reject cascade rule:
```python
if item.item_type == "location" and action == "reject":
    await db.execute(
        update(ImportItem)
        .where(ImportItem.parent_item_id == item.id)
        .values(status="rejected")
    )
```

## 10) Permisos y seguridad
- Roles permitidos: `org_admin`, `field_agent`.
- Validacion cross-org server-side en todos endpoints.
- `entrypoint_type` y `entrypoint_id` inmutables despues de crear run.

Guardrails seguridad:
- Limites parser por formato (tamano archivo, filas max, celdas max, timeout parse).
- Sanitizacion y truncado de texto extraido antes de persistir.
- Hard cap de items por run para evitar abuso.

## 10.1) Privacidad y retencion
- `source_file_path`, `extracted_data`, `user_amendments` se conservan solo para auditoria operativa de import.
- Retencion MVP: 90 dias para artefactos de import no finalizados; luego purge.
- Runs finalizados conservan solo resumen + referencias de entidades creadas.

## 10.2) Performance
- `GET /runs/{id}/items` paginado por defecto (`size=50`, max `size=100`).
- Indices por `run_id,status` y `organization_id,status` obligatorios.
- Polling UI con backoff (2s -> 5s) para reducir carga.

## 11) Archivos nuevos/modificados

### Backend
- `[NEW]` `backend/app/models/bulk_import.py`
- `[NEW]` `backend/app/models/bulk_import_output.py`
- `[NEW]` `backend/app/agents/bulk_import_agent.py`
- `[NEW]` `backend/app/prompts/bulk-import-extraction.md`
- `[NEW]` `backend/app/services/bulk_import_service.py`
- `[NEW]` `backend/scripts/bulk_import_worker.py`
- `[NEW]` `backend/app/api/v1/bulk_import.py`
- `[NEW]` `backend/app/schemas/bulk_import.py`
- `[NEW]` `backend/alembic/versions/*_add_bulk_import.py`
- `[MOD]` `backend/app/main.py` (register router)
- `[MOD]` `backend/app/core/config.py` (confirm csv allowlist)
- `[MOD]` `backend/app/authz/policies.py` (policy import)
- `[MOD]` `backend/docker-compose.yml` (add `bulk-import-worker` service)

### Frontend
- `[NEW]` `frontend/app/bulk-import/page.tsx`
- `[NEW]` `frontend/components/features/bulk-import/upload-step.tsx`
- `[NEW]` `frontend/components/features/bulk-import/processing-step.tsx`
- `[NEW]` `frontend/components/features/bulk-import/review-step.tsx`
- `[NEW]` `frontend/components/features/bulk-import/summary-step.tsx`
- `[NEW]` `frontend/components/features/bulk-import/edit-item-drawer.tsx`
- `[NEW]` `frontend/components/features/bulk-import/review-filters.tsx`
- `[NEW]` `frontend/lib/api/bulk-import.ts`
- `[MOD]` `frontend/app/companies/[id]/page.tsx` (boton import)
- `[MOD]` `frontend/app/companies/[id]/locations/[locationId]/page.tsx` (boton import)

## 12) Acceptance criteria vs implementacion

| # | Requisito cliente | Como se cumple |
|---|---|---|
| 1 | Upload file + confirmacion | Step 1 + `POST /upload` + respuesta run |
| 2 | File stored for processing | `source_file_path` + `source_filename` en `import_runs` |
| 3 | Identify locations + waste streams | Worker + agent + parser por formato |
| 4 | Extract relevant info | `extracted_data` + `normalized_data` |
| 5 | No data found -> notify | `status=no_data` + mensaje UI |
| 6 | Categorize each stream | `normalized_data.category/project_type` |
| 7 | Can't categorize -> flag | `needs_review=true` |
| 8 | Auto-create for review | staging en `import_items` |
| 9 | Present all for review | Step 3 tabla agrupada + filtros |
| 10 | Amend and save | drawer edit + `PATCH item` action `amend` |
| 11 | Accept and approve | `PATCH item` action `accept` |
| 12 | Reject not retained | `PATCH item` action `reject` |
| 13 | Only accepted/amended available | `Finalize` procesa solo `accepted|amended` |

## 13) Plan de implementacion por fases

### Fase 1 - DB + Models + RBAC (M)
- migracion tablas
- modelos/schemas
- policies import

### Fase 2 - Processing + staging (L)
- parser `xlsx/xls/csv/pdf/docx`
- extraction/categorization
- persist `import_items`

### Fase 3 - Review API (M)
- list/status
- patch decisions + reset to pending
- duplicate confirmation rules
- reject cascade para children

### Fase 4 - Finalize engine (M)
- transaction + row lock + status guard
- materializacion de locations/projects
- replay de summary cuando run ya esta `completed`

### Fase 5 - Wizard UI (L)
- 4 steps
- review table + filtros
- edit drawer
- URL query params (`entrypoint`, `id`, `run_id`, `step`)

### Fase 6 - Testing + hardening (L)
- unit + API + integration + concurrency
- parser limits + retention tests

## 14) Testing minimo obligatorio
- No crear entidades antes de finalize.
- Bloquear finalize con `pending_review`.
- Duplicado requiere `confirm_create_new`.
- Run desde Location invalida items location externos.
- Reject location hace cascade reject de hijos.
- Rollback total si falla un item en finalize.
- Segundo finalize sobre run no `review_ready` devuelve `409`.
- Finalize sobre run `completed` devuelve summary (idempotent replay UX).
- RBAC correcto (`org_admin` y `field_agent`).
- Cross-org tampering bloqueado.
- Refresh en Step 3 recupera estado via `run_id` en URL.
- `GET /items` respeta paginacion/filtros y no rompe en lotes grandes.

## 15) Estimacion
- Models + migration: 0.5 dia
- Agent + service + parsing: 1.0-1.5 dias
- API endpoints: 0.5 dia
- Frontend wizard: 1.0-1.5 dias
- Testing + polish: 0.5 dia
- Total: 3.0-4.0 dias efectivos
