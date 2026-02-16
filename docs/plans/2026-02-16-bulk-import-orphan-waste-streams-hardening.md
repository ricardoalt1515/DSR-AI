# Plan/Spec: Bulk Import Orphan Waste Streams (Company Entrypoint)  Hardening

**Generated**: 2026-02-16
**Goal**: keep code simple/prod; remove orphan UX edge cases; make backend semantics explicit; avoid tech debt.

## Context
- Bulk import (company entrypoint) can extract projects (waste streams) without location context.
- Today these are encoded as `ImportItem(item_type="project", status="invalid")` with `review_notes="Project row missing location context"`.
- New UX requirement: user picks an existing Location, selects orphan waste streams, imports instantly (no AI re-analysis, no progress polling, no second review screen).
- Persistence bug root cause: run stayed `review_ready`, so `GET /bulk-import/runs/pending` kept returning it.

## Already fixed (do not redo)
- Unknown `item_ids` are rejected (validate `len(items) != len(item_ids)` -> 404 + list missing IDs).
- Duplicate guard query no longer uses `scalar_one_or_none()`; uses a safe pattern (ex: `.scalars().first()`).

## Scope
- Add explicit discriminator for invalid items (so "orphan-resolvable" is not overloaded onto `status="invalid"`).
- FE: show orphan section even when there are normal grouped items.
- FE: remove unsafe casts for `normalizedData` (no `as Record<...>`).
- Backend: transaction consistency + typed return for orphan import endpoint.
- Tests: lock in behavior to prevent regressions.

## Non-goals
- No reprocess/re-analysis flow.
- No new infra/worker changes.
- No big UI redesign; keep the existing OrphanLocationPicker shape.

## Design decisions (defaults)
1) Add `invalid_reason` to `import_items`.
   - Prefer `TEXT` + app-level enum (optionally DB CHECK constraint) for minimal migration friction.
2) Define orphan-resolvable items as:
   - `item_type == "project"`
   - `status == "invalid"`
   - `invalid_reason == "missing_location_context"`
   - `created_project_id IS NULL`
3) Run completion rule:
   - Recommended: only auto-complete runs that are "orphan-only" (see completion section).
   - Mixed runs should stay `review_ready` so normal review/finalize remains intact.

## Backend implementation plan

### 1) DB + models + schemas (M)
Add `invalid_reason` to `ImportItem` and expose it in API.

Tasks
- Migration: add nullable `import_items.invalid_reason TEXT`.
- Model: add `ImportItem.invalid_reason: str | None`.
- Schema: add `invalid_reason: str | None` to `BulkImportItemResponse`.
- Ensure JSON is camelCased as `invalidReason`.

Backfill
- Decide one:
  - Option A (recommended): keep NULL for existing rows; orphan predicate requires explicit `missing_location_context`.
  - Option B: set `invalid_reason="unknown"` for existing invalid rows.

Acceptance
- `GET /bulk-import/runs/{runId}/items` includes `invalidReason` for new invalid items.
- No consumer breaks (field is additive).

### 2) Set invalid_reason at ingestion boundary (S)
Update item builder logic to set stable reasons.

Targets
- `backend/app/services/bulk_import_service.py`
  - `_build_company_entrypoint_items`: if project has no `parent_item`, set:
    - `status="invalid"`, `invalid_reason="missing_location_context"`
  - `_build_location_entrypoint_items`:
    - invalid location items: `invalid_reason="location_not_allowed_for_location_entrypoint"`
    - external location referenced: `invalid_reason="external_location_reference"`

Acceptance
- No more FE/BE logic that relies on parsing `review_notes` to infer invalid semantics.

### 3) Orphan import endpoint semantics + typing (S/M)
Ensure endpoint only operates on true orphan-resolvable items and stays type-safe.

Targets
- `backend/app/api/v1/bulk_import.py`
  - Use `_execute_in_transaction` wrapper (avoid manual `db.commit()` pattern drift).
- `backend/app/services/bulk_import_service.py`
  - Validate items satisfy orphan predicate (including `invalid_reason`).
  - Service returns a typed result (preferred: `AssignOrphansResponse`), not `dict[str, object]`.
  - Keep idempotency: items with `created_project_id != NULL` are skipped and counted.

Acceptance
- Backend typecheck passes (no `dict[str, object]` to `AssignOrphansResponse(**result)` conversions).
- Endpoint rejects non-orphan invalid items with explicit error.

### 4) Run completion rule (S)
Make completion correct for orphan-only runs and safe for mixed runs.

Recommended rule
- Compute `orphan_total` = count of items where `item_type="project" AND invalid_reason="missing_location_context"` (regardless of created_project_id).
- Compute `total_items` = count of all items in run.
- Auto-complete only if:
  - `total_items == orphan_total` (run is orphan-only)
  - AND `unresolved_orphans == 0` (no orphan items left with `created_project_id IS NULL`).

Acceptance
- Orphan-only run: after import, `GET /bulk-import/runs/pending` does not return it.
- Mixed run: after importing orphans, run remains `review_ready` and review UI still works for other items.

### 5) Concurrency/idempotency (M)
Prevent duplicate project creation under retries or concurrent clicks.

Tasks
- Keep `SELECT ImportRun ... FOR UPDATE` and `SELECT ImportItem ... FOR UPDATE` (already present).
- Ensure the orphan predicate is enforced under the same lock scope.
- Add a backend test: calling orphan import twice with same item_ids creates projects only once.

Acceptance
- Repeat request is safe (no duplicate projects, deterministic counts).

## Frontend implementation plan

### 6) Render orphan section independent of groups (S)
Do not hide orphans behind the "empty state".

Targets
- `frontend/components/features/bulk-import/import-review-section.tsx`

Tasks
- Render an "Unassigned waste streams" section/card whenever `orphanProjects.length > 0`.
- This section should appear even when there are valid location groups.

Acceptance
- Mixed file (some locations + some orphans) shows both grouped items and orphan section.

### 7) Orphan filter uses explicit invalidReason (S)
Align FE with BE semantics.

Tasks
- Update `BulkImportItem` type to include `invalidReason: string | null`.
- Filter orphans by:
  - `itemType === "project"`
  - `status === "invalid"`
  - `invalidReason === "missing_location_context"`
  - `createdProjectId == null`

Acceptance
- Other invalids (external location, etc) never show in orphan picker.

### 8) Remove unsafe casts for normalizedData (S)
Avoid `as Record<string, string>`.

Tasks
- Add a tiny helper (local to component or shared util) that reads fields from `Record<string, unknown>` using runtime guards:
  - `name?: string`, `category?: string`, `estimatedVolume?: string` (from `estimated_volume`).
- Update OrphanLocationPicker rendering to use helper output.

Acceptance
- No new casts.
- UI renders safely if normalizedData values are missing or not strings.

### 9) localStorage dismissed runs cleanup (S)
Keep this logic small, testable, and hook-safe.

Targets
- `frontend/app/companies/[id]/page.tsx`

Tasks
- Extract `loadDismissedRunIds(key): Set<string>` and `saveDismissedRunIds(key, set)`.
- Ensure `useEffect` deps include key (avoid stale closure warnings).
- Ensure callbacks do not depend on captured `activeImportRun` when the run id is available as an argument.

Acceptance
- No exhaustive-deps warnings.
- Dismiss persists per company.

## Tests / verification

### Backend tests (M)
- Ingestion assigns `invalid_reason` for each invalid case.
- Orphan import accepts only orphan predicate items.
- Orphan-only completion occurs; mixed run does not auto-complete.
- `/runs/{runId}/items` includes `createdProjectId` and `invalidReason`.

### Frontend checks (S)
- `bun run check:ci` passes.
- Manual flows:
  - Orphan-only: picker -> import -> reload -> no picker.
  - Mixed: orphan section visible; importing orphans does not hide remaining review work.

## Open questions (must decide)
1) Backfill choice for existing invalid items: keep NULL vs set "unknown".
2) Should orphan import change item.status away from "invalid" after successful creation, or keep `status="invalid"` but with `createdProjectId` set?
   - Recommended: keep status as-is for minimal churn; predicate excludes created items via `createdProjectId != null`.
