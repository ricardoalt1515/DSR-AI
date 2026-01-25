# Intake Backend Implementation Map (By File)

This file maps tasks to concrete locations so an implementer can execute without guessing.

---

## Backend: Models
- `backend/app/models/intake_note.py` (new)
- `backend/app/models/intake_suggestion.py` (new)
- `backend/app/models/intake_unmapped_note.py` (new)
- `backend/app/models/file.py` (update: add processing_status, processing_error, processed_at)

## Backend: Schemas
- `backend/app/schemas/intake.py` (new)
- Ensure `BaseSchema` is used for camelCase responses

## Backend: Services
- `backend/app/services/intake_service.py` (new)
- `backend/app/services/intake_ingestion_service.py` (new)

## Backend: Agents
- `backend/app/agents/document_analysis_agent.py` (new)
- `backend/app/prompts/document-analysis.md` (new prompt, from docs/plans/document-analysis-agent-prompt.md)
- `backend/app/models/document_analysis_output.py` (new Pydantic output schema)

## Backend: API
- `backend/app/api/v1/intake.py` (new router)
- `backend/app/main.py` (mount new router)
- `backend/app/api/v1/files.py` (allow PDF process_with_ai=true in MVP)

## Backend: Migrations
- `backend/alembic/versions/*_add_intake_tables.py`
- `backend/alembic/versions/*_add_file_processing_status.py`

## Backend: Tests
- `backend/tests/test_intake_api.py` (new)
- `backend/tests/test_intake_service.py` (new)

---

## Frontend Integration (already implemented UI)
- `frontend/lib/api/intake.ts` (new client)
- `frontend/lib/stores/intake-store.ts` (wire to API)
- `frontend/components/features/projects/intake-panel/*` (wire actions to API)

---

## Minimal Implementer Checklist
1. Migration files + models
2. Schemas + service layer
3. Agent + prompt + output schema
4. API routes + main router mount
5. Files API update for PDF ingest
6. Tests
7. Frontend wiring
