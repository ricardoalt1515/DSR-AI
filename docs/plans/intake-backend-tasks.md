# Intake Backend Tasks (Checklist)

Owner: Backend implementer
Date: 2026-01-23
Status: Draft

Use this checklist to implement the backend described in `docs/plans/intake-backend-spec.md`.

---

## 1) Database Migration
- [ ] Create `intake_notes` table (single row per project)
- [ ] Create `intake_suggestions` table with indexes + constraints
- [ ] Create `intake_unmapped_notes` table with status + mapped_to_suggestion_id
- [ ] Add columns to `project_files`: `processing_status`, `processing_error`, `processed_at`, `processing_attempts`, `file_hash`
- [ ] Add `source_file_id` column to `intake_suggestions` (nullable)
- [ ] Add composite + partial indexes as specified

## 2) SQLAlchemy Models
- [ ] Add `IntakeNote` model
- [ ] Add `IntakeSuggestion` model
- [ ] Add `IntakeUnmappedNote` model
- [ ] Update `ProjectFile` model with processing fields

## 3) Pydantic Schemas
- [ ] Add schemas for intake hydrate response
- [ ] Add schemas for notes save, apply/reject, map/dismiss
- [ ] Ensure camelCase output via BaseSchema

## 4) Agents
- [ ] Implement `document_analysis_agent.py` (prompt + output schema)
- [ ] Route document inputs through this agent in ingestion service

## 5) Services
- [ ] Implement `IntakeService` (get_intake, save_notes, apply/reject, map/dismiss)
- [ ] Implement `IntakeIngestionService` (enqueue + extract + normalize + persist)
- [ ] Persist `summary` + `key_facts` to ProjectFile.ai_analysis
- [ ] Enrich suggestions with `file_id` + `filename` and resolve labels/titles from questionnaire registry
- [ ] Set `source_file_id` for file-based suggestions; null for notes

## 6) API Routes
- [ ] Add `/api/v1/projects/{id}/intake` GET
- [ ] Add `/api/v1/projects/{id}/intake/notes` PATCH
- [ ] Add `/api/v1/projects/{id}/intake/suggestions/{id}` PATCH
- [ ] Add `/api/v1/projects/{id}/intake/unmapped-notes/{id}/map` POST
- [ ] Add `/api/v1/projects/{id}/intake/unmapped-notes/{id}/dismiss` POST

## 7) Upload Integration
- [ ] Allow `process_with_ai=true` for PDFs in files upload
- [ ] Mark `processing_status` queued/processing/completed/failed
- [ ] Compute and persist `file_hash` on upload
- [ ] Queue ingestion jobs for PDFs/images
- [ ] Skip AI processing for non-PDF documents in MVP

## 8) Apply/Reject Flow
- [ ] Apply suggestion updates `project_data.technical_sections` using ProjectDataService
- [ ] Create timeline event on apply/reject
- [ ] Ensure conflict definition is enforced (multiple pending with same section_id + field_id)
- [ ] Enforce org scoping on all intake queries (suggestion/note IDs must match project+org)

## 9) Tests
- [ ] Intake notes upsert works
- [ ] Suggestions apply/reject works
- [ ] Apply twice returns 409 and does not duplicate timeline events
- [ ] Unmapped map/dismiss works
- [ ] Processing state persisted
- [ ] Idempotency skip works (same file_id + hash)
- [ ] Auto-reject siblings on apply (same section_id + field_id)
- [ ] Cross-org access is denied (404/403)
- [ ] Evidence validation enforced (single-object schema, no extra keys)

## 10) Frontend Wiring (Integration)
- [ ] Connect intake notes autosave to PATCH endpoint
- [ ] Hydrate intake store from GET endpoint (parse notesUpdatedAt → Date)
- [ ] Make `evidence` optional in UI when source='notes'
- [ ] Add `sourceFileId` to suggestion type + hydration
- [ ] Derive `isProcessingDocuments = processingDocumentsCount > 0`
- [ ] Conflict grouping key = sectionId + fieldId
- [ ] Wire apply/reject to PATCH endpoint (revert optimistic on 409)
- [ ] Wire map/dismiss to POST endpoints (remove local-only stubs)
- [ ] QuickUpload uses files upload endpoint
