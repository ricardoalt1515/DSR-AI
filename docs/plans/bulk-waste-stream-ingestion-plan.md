# Bulk Waste Stream Ingestion — Implementation Plan

## Objetivo
Permitir importar desde archivo datos de locations + waste streams (waste stream = `Project`) con flujo humano de revision (`accept/amend/reject`) y materializacion final controlada.

## Decisiones cerradas
- No crear `Company` desde documento.
- Entry points: Company page + Location page.
- `Accept` solo marca decision; creacion real solo en `Finalize`.
- Duplicado: warning + confirmacion explicita para crear nuevo.
- Matching Location: nombre normalizado + city/state cuando existan.
- Formatos soportados: `xlsx`, `xls`, `pdf`, `docx`, `csv`.
- Si hay `pending_review`, `Finalize` bloquea.
- Si import inicia desde Location y archivo trae otras locations: marcar items invalidos.
- Si falla un item en `Finalize`: rollback total.
- Permisos: `org_admin` + `field_agent`.

## Alcance
- Desde Company import:
  - puede crear `Location` + `Project` (waste stream) dentro de esa company.
- Desde Location import:
  - crea solo `Project` en esa location fija.
- Flujo manual actual (crear Company/Location/Project) no se reemplaza.

## No objetivos (MVP)
- Crear Company via import.
- Auto-merge de duplicados en entidades existentes.
- Finalize parcial.

## Arquitectura recomendada (reusar infraestructura actual)
- Reusar upload + storage + worker async ya existentes.
- Agregar capa de staging de import:
  - `import_runs`
  - `import_items`
- Materializacion de entidades solo en endpoint `Finalize`.

## Modelo de datos

### `import_runs`
- `id` UUID PK
- `organization_id` UUID FK
- `entrypoint_type` TEXT CHECK (`company` | `location`)
- `entrypoint_id` UUID
- `source_file_id` UUID FK (`project_files.id`)
- `status` TEXT CHECK (`uploaded` | `processing` | `review_ready` | `finalizing` | `completed` | `failed` | `no_data`)
- `progress_step` TEXT NULL
- `processing_error` TEXT NULL
- counters:
  - `total_items` INT
  - `accepted_count` INT
  - `amended_count` INT
  - `rejected_count` INT
  - `invalid_count` INT
  - `duplicate_count` INT
- audit:
  - `created_by_user_id` UUID
  - `finalized_by_user_id` UUID NULL
  - `finalized_at` TIMESTAMPTZ NULL
- `created_at`, `updated_at`

Indexes:
- `(organization_id, status)`
- `(source_file_id)`
- `(entrypoint_type, entrypoint_id)`

### `import_items`
- `id` UUID PK
- `organization_id` UUID FK
- `run_id` UUID FK (`import_runs.id`)
- `item_type` TEXT CHECK (`location` | `project`)
- `status` TEXT CHECK (`pending_review` | `accepted` | `amended` | `rejected` | `invalid`)
- `needs_review` BOOL default false
- `confidence` INT CHECK 0..100
- `extracted_data` JSONB
- `normalized_data` JSONB
- `user_amendments` JSONB NULL
- `duplicate_candidates` JSONB NULL
- `confirm_create_new` BOOL default false
- `review_notes` TEXT NULL
- lineage/materialization:
  - `created_location_id` UUID NULL
  - `created_project_id` UUID NULL
- `created_at`, `updated_at`

Indexes:
- `(run_id, status)`
- `(organization_id, status)`
- `(item_type, status)`

## State machine

### Run
- `uploaded -> processing -> review_ready -> finalizing -> completed`
- `processing -> no_data`
- `processing|finalizing -> failed`

### Item
- `pending_review -> accepted|amended|rejected|invalid`

Reglas:
- No side effects de Company/Location/Project fuera de `Finalize`.
- `Finalize` solo permitido en `review_ready`.
- `Finalize` bloqueado si existe item `pending_review`.

## Permisos
- Crear/importar/revisar/finalizar: `org_admin`, `field_agent`.
- Enforzar server-side en todos endpoints bulk import.

## Matching y duplicados
- Location matching:
  - normalize(name) siempre
  - sumar city/state cuando existan
- Duplicado detectado => item marcado `needs_review` + `duplicate_candidates`.
- Para aceptar/amendar item con duplicado: requerir `confirm_create_new=true`.
- Re-check de duplicados en `Finalize`.

## API contract (MVP)

### `POST /api/v1/bulk-import/upload`
- Input: archivo + contexto (`entrypoint_type`, `entrypoint_id`)
- Output: `run_id`, `status=uploaded`

### `GET /api/v1/bulk-import/jobs/{run_id}`
- Output: estado de run, progreso, counters, errores

### `GET /api/v1/bulk-import/jobs/{run_id}/items`
- Output: lista paginada de items para review

### `PATCH /api/v1/bulk-import/items/{item_id}`
- Input:
  - `action`: `accept | amend | reject`
  - `user_amendments` (si `amend`)
  - `confirm_create_new` (si hay duplicado)
- Output: item actualizado

### `POST /api/v1/bulk-import/jobs/{run_id}/finalize`
- Requiere `Idempotency-Key` header
- Semantica:
  - lock run row
  - validar no `pending_review`
  - crear solo `accepted|amended`
  - transaccion unica, rollback total en error
  - segundo request con misma key devuelve mismo resultado

### `GET /api/v1/bulk-import/jobs/{run_id}/summary`
- Output: creados/rechazados/invalidos/errores

## UI/UX (Wizard 4 pasos)

### Entry points
- Company page: boton `Import Waste Streams`
- Location page: boton `Import for this location`

### Ruta
- `frontend/app/(dashboard)/bulk-import/page.tsx`

### Steps
1. Upload
2. Processing
3. Review
4. Summary

Review:
- Tabla agrupada por location.
- Acciones por item: `Accept`, `Edit`, `Reject`.
- Badge confianza + warning duplicado.
- Copy explicita: `Accept` no crea; se crea en `Finalize`.

## Implementacion por fases

### F1 — DB + modelos + permisos (M)
- Crear migracion `import_runs` + `import_items`.
- Crear modelos SQLAlchemy.
- Crear schemas Pydantic.
- Nueva policy import (`org_admin`, `field_agent`).

### F2 — parsing + ingestion staging (L)
- Extender worker existente para `xlsx/xls/pdf/docx/csv`.
- Extraer/categorizar y persistir `import_items`.
- Marcar `no_data` si no hay waste streams detectables.

### F3 — review API + estado (M)
- Endpoints status/items/patch decision.
- Validar state transitions.
- Validar duplicate override (`confirm_create_new`).

### F4 — finalize (M)
- Endpoint finalize con lock + idempotency.
- Materializacion transaccional.
- Re-check duplicados.
- Rollback total en fallo.

### F5 — frontend wizard (L)
- UI 4 pasos + polling status.
- Review editable + warnings + summary.
- Integrar botones entrypoint.

### F6 — hardening + tests (L)
- Tests unitarios, API, integracion, concurrencia, idempotencia.
- Auditoria basica de eventos import.

## Acceptance criteria mapping
- Upload y confirmacion: `POST /upload` + feedback UI.
- Archivo almacenado y disponible: run referencia `source_file_id`.
- Identificar locations + waste streams: ingestion parsing + extraction.
- Si no hay waste stream data: run `no_data` + notificacion.
- Categorizar cada waste stream: `normalized_data.category`.
- No categorizable: `needs_review`.
- Mostrar todo para review: Step 3 lista completa.
- Amend: editar y guardar item.
- Accept: marcar item para finalize.
- Reject: no materializar.
- Al terminar: solo accepted/amended creados.

## Riesgos y mitigacion
- Duplicados por retry/finalize doble:
  - lock row + `Idempotency-Key` + replay safe response.
- Datos incompletos location:
  - marcar `invalid` y bloquear finalize hasta resolver.
- Drift permisos UI/backend:
  - policy central server-side y tests por rol.

## Criterios de salida (Definition of Ready to Build)
- Estados y transiciones definidos sin TBD.
- Contrato de finalize idempotente definido.
- Matching/duplicados definido per-item.
- Permisos cerrados (`org_admin`, `field_agent`).
- Matriz de formatos cerrada (`xlsx`, `xls`, `pdf`, `docx`, `csv`).
- Plan de pruebas cubre concurrencia, retry, no_data, seguridad multi-tenant.
