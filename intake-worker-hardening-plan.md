# Plan: Intake Worker Hardening (DB-Polling, ECS) + OCR/Textract-Ready Boundaries
**Generated**: 2026-01-30
**Complexity**: Medium

## Overview
Harden the existing `intake-worker` (DB-polling) so it is production-safe on AWS ECS: retries actually work, stuck `processing` rows recover, polling load is bounded, and the design is ready to plug in OCR/AWS Textract later without rewriting ingestion/persistence logic.

This plan intentionally keeps the current “no new infra” MVP choice (DB polling + row-claiming) already documented in `docs/plans/intake-backend-spec.md`.

## Prerequisites
- **Docs**: Context7 tool is currently unavailable (quota exceeded), so external best-practice citations are not pulled; plan is derived from repo docs + standard AWS/ECS worker patterns.
- Local dev DB: tests require `cd backend && docker-compose up` (per `docs/agents/development-commands.md`).
- Rollout note: prefer DB-time (`CURRENT_TIMESTAMP`) for claim/backoff to avoid clock skew across ECS tasks.

## Dependency Graph
```
T1 ──┬── T3 ──┬── T5
     │        └── T6
     └── T4 ───────┘
T2 ──┘
T7 ────────────────┘
```

## Tasks

### T1: Lock Worker Semantics (state machine, retry taxonomy)
- **depends_on**: []
- **location**:
  - `docs/plans/intake-backend-spec.md`
- **description**:
  - Update the spec to explicitly define:
    - **Lease semantics**: `processing` is a lease, not a terminal state; if a worker dies, the job must be recoverable.
    - **Retry semantics**:
      - `processing_attempts` increments **only on claim**.
      - On failure:
        - retryable → `queued` + `processing_available_at` set to backoff time
        - non-retryable or attempts exhausted → `failed` + `processed_at` set
    - **Fair claiming**: claim oldest eligible work first to avoid starvation (define ordering).
  - Keep states exactly: `queued|processing|completed|failed`.
- **validation**:
  - Spec includes explicit transitions + “stuck processing” rule; no ambiguity remains.

### T2: Add DB Columns + Indexes for Leasing/Backoff
- **depends_on**: []
- **location**:
  - `backend/alembic/versions/` (new migration)
  - `backend/app/models/file.py`
- **description**:
  - Add columns to `project_files`:
    - `processing_started_at TIMESTAMPTZ NULL` (set at claim)
    - `processing_available_at TIMESTAMPTZ NULL` (next eligible time; default `now()` for existing rows)
  - Migration backfill (DB-time):
    - For existing `queued` rows: set `processing_available_at = CURRENT_TIMESTAMP` when NULL.
    - For existing `processing` rows: set `processing_started_at = CURRENT_TIMESTAMP` when NULL (prevents immediate “stale” requeues after deploy).
  - Add indexes tuned for hot paths:
    - Partial index for claim query: `project_files(processing_available_at, created_at)` WHERE `processing_status='queued'`
    - Optional supporting index for stuck scan: `project_files(processing_started_at)` WHERE `processing_status='processing'`
  - Update `ProjectFile` model with:
    - `processing_started_at: Mapped[datetime | None]`
    - `processing_available_at: Mapped[datetime | None]`
- **validation**:
  - `cd backend && docker-compose exec app alembic upgrade head` succeeds.
  - New columns present; existing rows continue working (no NOT NULL).

### T3: Introduce Explicit Retryable Errors (avoid string matching)
- **depends_on**: []
- **location**:
  - `backend/app/agents/document_analysis_agent.py`
  - `backend/app/agents/image_analysis_agent.py`
- **description**:
  - Create a shared minimal taxonomy (single source of truth):
    - New module `backend/app/services/retryable_errors.py`:
      - `class RetryableError(Exception): retryable: bool; code: str`
      - `class PermanentError(RetryableError): retryable = False`
      - `class TransientError(RetryableError): retryable = True`
  - Update document/image agents to raise these (or wrap into these) while keeping their public exception types stable:
    - `DocumentAnalysisError` / `ImageAnalysisError` become thin wrappers around `RetryableError` (carry `retryable` + `code`).
  - In agents:
    - Empty bytes / size limit violations raise `*PermanentError`.
    - Unknown exceptions are wrapped as `*TransientError` and preserve cause (`raise ... from exc`).
- **validation**:
  - Unit-level behavior: calling agent with empty bytes yields `retryable=False`.
  - No other call sites break (they only catch base type).

### T4: Make IntakeIngestionService Retry/Lease Correct
- **depends_on**: [T2, T3]
- **location**:
  - `backend/app/services/intake_ingestion_service.py`
- **description**:
  - Claiming:
    - Update `claim_next_file(db)` to:
      - filter `processing_status='queued'`
      - filter `processing_attempts < MAX_PROCESSING_ATTEMPTS`
      - filter `(processing_available_at IS NULL OR processing_available_at <= now)`
      - `ORDER BY processing_available_at NULLS FIRST, created_at` (deterministic)
      - set fields atomically in the claim transaction (prefer one-statement claim via CTE `UPDATE … RETURNING`):
        - `processing_status='processing'`
        - `processing_attempts += 1`
        - `processing_started_at = CURRENT_TIMESTAMP`
        - `processing_error = NULL`
  - Stuck processing reaper:
    - Add `requeue_stale_processing_files(db, stale_after_seconds: int, limit: int) -> int`
      - Find `processing` rows with `processing_started_at < now - stale_after` and attempts remaining
      - Requeue them (`queued`, set `processing_available_at=now`, set `processing_error='stale_processing_requeued'`)
      - If attempts exhausted, mark `failed` with `processing_error='stale_processing_max_attempts'`.
  - Failure handling:
    - Centralize in `_handle_ingestion_failure(...)`:
      - If `exc.retryable is True` and attempts remaining:
        - set `queued`
        - set `processing_available_at = CURRENT_TIMESTAMP + backoff_seconds(attempt)` where:
          - `backoff_seconds = min(30 * (2 ** (attempt - 1)), 600)`  (30s, 60s, 120s, … max 10m)
        - set `processing_error` (truncate to safe length) and keep a stable `processing_error_code` in-memory for logs (DB column out-of-scope)
      - Else: mark `failed` and set `processed_at=now`.
    - Classify storage failures too:
      - Missing object / permission errors → permanent
      - Network/timeouts → transient
  - Remove local “mark failed and return” branches in `_process_document()` and `_process_image()`; let exceptions bubble to `process_file()` and be handled once.
  - Dedupe key:
    - Keep existing `(organization_id, project_id, file_hash)` reuse logic (already implemented).
- **validation**:
  - A transient analyzer/storage failure results in `queued` and a future `processing_available_at`.
  - A permanent failure results in `failed` and `processed_at` set.
  - No duplicates: pending suggestions/unmapped for the same `source_file_id` are cleared before re-insert (existing behavior).

### T5: Simplify Worker Loop + Add Backoff on Empty Queue
- **depends_on**: [T4]
- **location**:
  - `backend/scripts/intake_ingestion_worker.py`
  - `backend/app/core/config.py`
  - `infrastructure/terraform/prod/ecs.tf` (env vars for tuning)
- **description**:
  - Loop ordering per tick:
    1) Periodically run `requeue_stale_processing_files(...)` (e.g., every 60s) then commit
    2) claim next eligible file
    3) if none: sleep with exponential backoff up to `INTAKE_WORKER_POLL_MAX_SECONDS` (add jitter)
    4) if file: reset poll interval, `process_file(...)`, commit
  - Remove “double commit” patterns and “commit inside except”; keep a single commit/rollback policy per loop iteration.
  - Config:
    - Read from `settings.INTAKE_WORKER_POLL_BASE_SECONDS`, `...MAX...`, `...STALE...`.
- **validation**:
  - With no queued jobs, worker sleeps and does not hammer DB.
  - With queued jobs, worker processes continuously.
  - If the worker is SIGTERM’d, it exits cleanly.

### T6: Update/Add Tests for Retry + Stale Recovery
- **depends_on**: [T4, T5]
- **location**:
  - `backend/tests/test_intake.py`
- **description**:
  - Update existing test to reflect new semantics:
    - `test_ingestion_download_failure_marks_failed` becomes `..._requeues_when_attempts_remaining`
  - Add tests:
    - `..._marks_failed_when_attempts_exhausted`
    - `test_requeue_stale_processing_files_requeues_processing_rows`
    - `test_claim_next_file_respects_processing_available_at`
- **validation**:
  - `cd backend && make test-file FILE=tests/test_intake.py` passes.

### T7: Add a Minimal OCR/Textract Boundary (no behavior change today)
- **depends_on**: [T4]
- **location**:
  - `backend/app/services/intake_document_pipeline.py` (new)
  - `backend/app/services/intake_ingestion_service.py`
- **description**:
  - Introduce a single internal seam so future OCR/Textract does not rewrite ingestion:
    - `async def analyze_project_file_document(*, file_bytes: bytes, filename: str, doc_type: str, field_catalog: str, media_type: str) -> DocumentAnalysisOutput`
  - Current implementation delegates to `app.agents.document_analysis_agent.analyze_document` (LLM-only).
  - `IntakeIngestionService._process_document()` calls this function instead of calling the agent directly.
  - Future Textract plan (explicitly out-of-scope now):
    - Replace `analyze_project_file_document()` implementation with:
      - Textract extraction (async job) → normalized per-page text
      - LLM mapping step (text-only) → `DocumentAnalysisOutput` with evidence.
- **validation**:
  - No functional behavior change (same agent call path); only one extra function boundary.

## Parallel Execution Groups
| Wave | Tasks | Can Start When |
|------|-------|----------------|
| 1 | T1, T2, T3 | Immediately |
| 2 | T4 | T2 + T3 complete |
| 3 | T5, T7 | T4 complete |
| 4 | T6 | T5 complete |

## Testing Strategy
- Fast feedback: `cd backend && make test-file FILE=tests/test_intake.py`
- Full backend checks (CI mode): `cd backend && make check-ci`

## Risks & Mitigations
- **Extra retries increase OpenAI spend**: keep `MAX_PROCESSING_ATTEMPTS=3`, add backoff, and preserve dedupe by `file_hash`.
- **User applies suggestions while file reprocesses**: document/ensure UI discourages applying file-derived suggestions while `processingDocumentsCount > 0`; backend already uses optimistic 409 on status conflicts.
- **Schema change rollout**: deploy migration first, then worker code; columns are nullable so old worker remains functional until updated.
