# 2026-02-26 Questionnaire localStorage Quota Remediation Plan

## Goal
Fix questionnaire quota failures in prod with minimal-risk changes and no new architecture.

## Final decisions
- Canonical persisted key name: `technical-data-store`.
- Legacy key kept for migration-read only: `h2o-technical-data-store`.
- Global technical clear scope: `technical-data-store`, `h2o-technical-data-store`, all `technical-sheet-data:*`.
- Persist only `technicalData`.
- `versions` runtime-only, capped `MAX_VERSIONS = 20` (FIFO).

## Root cause
- `h2o-technical-data-store` persisted heavy payload (`technicalData` + `versions` snapshots).
- `versions` grew unbounded.
- Duplicate writes existed under `technical-sheet-data:${projectId}`.
- Quota exceptions could break save/load and leave empty questionnaire UI.

## Constraints
- Client-only storage access.
- Single technical draft write path.
- Fail-soft behavior on storage errors.
- No destructive server writes from cache-clear/migration flows.

## Phase 1 (mandatory) - Stabilize + migrate + shrink

### 1) Safe storage wrapper
- Wrap persist storage `getItem/setItem/removeItem` with quota-safe handling.
- Never throw from storage path into render/save/load flows.

### 2) Key rename migration (explicit algorithm)
- Hydration read order:
  1. Read `technical-data-store`.
  2. If missing/invalid, read `h2o-technical-data-store`.
- If legacy key used:
  - parse safely,
  - transform to new shape (`technicalData` only),
  - write to `technical-data-store`,
  - delete legacy key only after successful new-key write.
- Post-deploy writes: only `technical-data-store`.
- Migration idempotent across reloads.

### 3) Payload reduction
- Remove `versions` from persisted payload.
- Keep `versions` in memory with cap `MAX_VERSIONS = 20`.
- Remove duplicate backup write path to `technical-sheet-data:${projectId}`.

### 4) Error behavior hardening
- On storage/load transient failure, preserve last-known sections.
- Never force sections to `[]` on transient failure path.

### 5) Global technical clear
- Add/keep one action to clear only technical keys globally:
  - `technical-data-store`
  - `h2o-technical-data-store`
  - all `technical-sheet-data:*`
- Clear action is local-only and must not trigger backend reset/update actions.

### 6) Auth/session cleanup updates
- Update login/logout/401 cleanup paths to include new key and legacy key during migration window.

### 7) Tests and telemetry
- Tests:
  - legacy key migrates to new key without data loss in `technicalData`
  - migration idempotent
  - quota/storage errors do not blank questionnaire state
  - global clear removes only technical keys
- Telemetry:
  - `quota_exceeded`, `storage_read_failed`, `storage_write_failed`
  - `migration_read_legacy`, `migration_write_new`, `migration_cleanup_legacy`, `migration_parse_failed`

Acceptance
- `0` questionnaire crashes from storage/quota path in smoke + staging simulation.
- Legacy users with only `h2o-technical-data-store` keep technical data after first load.
- `0` new writes to `technical-sheet-data:${projectId}`.
- p95 persisted payload reduced >=70% on sampled large projects.

Release gate
- 24h monitor after Phase 1; continue rollout only if:
  - storage-path fatal errors = `0`
  - questionnaire save success >= `99.0%`
  - questionnaire load success >= `99.0%`
  - migration error rate <= `0.1%` sessions

## Phase 2 (optional, only if metrics still bad)
- Add stronger UX recovery banner/CTA messaging.
- Expand telemetry dashboards/alerts.
- Evaluate IndexedDB only if quota events remain high after Phase 1.

## Rollback/safety
- Feature flags:
  - `safe_persist_mode`
  - `disable_versions_persist`
  - `disable_technical_backup_key`
- Keep legacy read-compat for one release window; then remove legacy key support if migration success is healthy.
- Rate-limit user warnings and telemetry.

## Unresolved questions
- None.
