# Intake Backend Spec (Implementation Guide)

Owner: Internal ops (field agents + analysts)
Date: 2026-01-23
Status: Draft (MVP locked)

## Objective
Implement backend support for the Intake Panel (notes + uploads + AI suggestions) with human review. The backend must persist notes and suggestions, provide hydration endpoints, and integrate with existing project_data and proposal generation.

---

## Design Principles
- **Human-in-the-loop**: suggestions are drafts; nothing auto‑applies.
- **Auditability**: every applied value traces to evidence.
- **Simplicity**: MVP uses LLM‑only document analysis (no external OCR).
- **No tech debt**: use normalized tables for suggestions/notes.
- **Postgres best practices**: index FKs, use composite + partial indexes for common filters.

---

## Data Model (Recommended)

> Use new tables (not JSONB) for notes/suggestions. JSONB is great for flexible questionnaire sections, but notes/suggestions need auditing, status, and queryability.

### Table: `intake_notes`
Single editable note per project (upsert). No history in MVP.
- `id` UUID PK
- `organization_id` UUID FK → organizations.id (indexed)
- `project_id` UUID FK → projects.id (composite FK with org, unique)
- `text` TEXT NOT NULL
- `created_by_user_id` UUID FK → users.id (nullable)
- `created_at`, `updated_at` timestamps

Indexes:
- Composite: `(project_id, organization_id)`
- Unique: `(project_id, organization_id)`

### Table: `intake_suggestions`
- `id` UUID PK
- `organization_id` UUID FK → organizations.id
- `project_id` UUID FK → projects.id
- `source_file_id` UUID NULL (required when source != 'notes')
- `field_id` TEXT
- `field_label` TEXT
- `section_id` TEXT
- `section_title` TEXT
- `value` TEXT (store as string; keep `value_type` optional)
- `value_type` TEXT NULL (`string|number`)
- `unit` TEXT NULL
- `confidence` INTEGER (0–100)
- `status` TEXT (`pending` | `applied` | `rejected`)
- `source` TEXT (`notes` | `file` | `image` | `sds` | `lab`)
- `evidence` JSONB (validated minimum schema, **single object**):
  - `file_id` (UUID, required)
  - `filename` (string, required; must match stored ProjectFile filename at write time)
  - `page` (int, 1-based, optional)
  - `excerpt` (string, optional, max length 500)
  - **No extra keys in MVP** (validate in Pydantic before persist)
- `created_by_user_id` UUID NULL (NULL = system ingestion)
- `created_at`, `updated_at`

Constraints:
- `confidence` between 0 and 100
- `status` limited to allowed values
- `evidence` is **required** when `source != 'notes'`
- `evidence` may be NULL when `source = 'notes'`
- `source_file_id` is **required** when `source != 'notes'`

Indexes:
- Composite: `(project_id, organization_id)`
- Composite for common filters: `(project_id, section_id, field_id, status)`
- **Partial index (NON-UNIQUE)** for pending: `(project_id, section_id, field_id)` WHERE status = 'pending'

### Table: `intake_unmapped_notes` (required)
- `id` UUID PK
- `organization_id` UUID
- `project_id` UUID
- `extracted_text` TEXT
- `confidence` INTEGER (0–100)
- `source_file_id` UUID NULL
- `source_file` TEXT NULL
- `status` TEXT (`open` | `mapped` | `dismissed`)
- `mapped_to_suggestion_id` UUID NULL (set on map for audit trail)
- `created_at` timestamp

Indexes:
- Composite: `(project_id, organization_id)`

---

## ProjectFile Processing State (Required)
Persist processing state for async ingestion.
Add columns to `project_files`:
- `processing_status` TEXT (`queued|processing|completed|failed`)
- `processing_error` TEXT NULL
- `processed_at` timestamp NULL
- `processing_attempts` INTEGER default 0
- `file_hash` TEXT NULL (SHA-256 of stored file bytes)

**Transition rules**:
- `queued → processing → completed|failed`
- Retry increments `processing_attempts` and resets to `processing`
**Idempotency rule (MVP)**:
- Compute `file_hash` as SHA-256 of stored file bytes (at upload).
- If `(file_id, file_hash)` is already processed and `processing_status = completed`, **do not reprocess**.
- No pipeline versioning in MVP (explicitly out of scope).
**Claiming rule**:
- Processing workers must atomically claim work by updating `queued → processing` in a single statement (or `SELECT ... FOR UPDATE SKIP LOCKED`) before calling any agent.

---

## API Contract (MVP)

### 1) Hydrate intake panel
`GET /api/v1/projects/{projectId}/intake`

Response:
```json
{
  "intakeNotes": "string",
  "notesUpdatedAt": "ISO-8601 or null",
  "suggestions": [
    {
      "id": "uuid",
      "fieldId": "string",
      "fieldLabel": "string",
      "sectionId": "string",
      "sectionTitle": "string",
      "value": "string | number",
      "unit": "string | null",
      "confidence": 0,
      "status": "pending | applied | rejected",
      "sourceFileId": "uuid | null",
      "evidence": {
        "fileId": "uuid",
        "filename": "string",
        "page": 1,
        "excerpt": "string | null"
      }
    }
  ],
  "unmappedNotes": [
    {
      "id": "uuid",
      "extractedText": "string",
      "confidence": 0,
      "sourceFile": "string",
      "sourceFileId": "uuid"
    }
  ],
  "unmappedNotesCount": 42,
  "processingDocumentsCount": 2
}
```
Notes:
- `evidence` and `sourceFileId` are **null** for `source='notes'` suggestions.
- `unmappedNotes` is capped to **top 10** open items; `unmappedNotesCount` is total open count.

### 2) Save intake notes
`PATCH /api/v1/projects/{projectId}/intake/notes`

Request:
```json
{ "text": "..." }
```

Response:
```json
{ "text": "...", "updatedAt": "ISO-8601" }
```

### 3) Apply / reject suggestion
`PATCH /api/v1/projects/{projectId}/intake/suggestions/{suggestionId}`

Request:
```json
{ "status": "applied" | "rejected" }
```

Response:
```json
{ "id": "uuid", "status": "applied|rejected", "updatedAt": "ISO-8601" }
```

**Transition rule**:
- `pending → applied|rejected`
 - If status is not `pending`, return **409 Conflict** (no-op)
 - Update must be CAS-style: `WHERE id = ? AND status = 'pending'`

### 4) Map unmapped note → suggestion
`POST /api/v1/projects/{projectId}/intake/unmapped-notes/{noteId}/map`

Request:
```json
{
  "fieldId": "string",
  "sectionId": "string",
  "fieldLabel": "string",
  "sectionTitle": "string"
}
```

Response:
```json
{ "unmappedNoteId": "uuid", "suggestion": { ...AISuggestion }, "mappedToSuggestionId": "uuid" }
```

**Transition rule**:
- `open → mapped`
 - Set `mapped_to_suggestion_id` on the unmapped note.

### 5) Dismiss unmapped note
`POST /api/v1/projects/{projectId}/intake/unmapped-notes/{noteId}/dismiss`

Response:
```json
{ "id": "uuid", "status": "dismissed" }
```

### 6) Bulk dismiss unmapped notes
`POST /api/v1/projects/{projectId}/intake/unmapped-notes/dismiss`

Request:
```json
{ "scope": "all" }
```
```json
{ "scope": "low_confidence", "max_confidence": 70 }
```
```json
{ "scope": "file", "sourceFileId": "uuid | null" }
```

Response:
```json
{ "dismissedCount": 12 }
```

**Transition rule**:
- `open → dismissed`

### 6) File upload (reuse)
`POST /api/v1/projects/{projectId}/files`
- Must accept PDF + image for ingestion
- `process_with_ai=true` allowed for PDFs in MVP
 - Other doc types may be stored, but **not AI-processed** in MVP

---

## AI Routing + Agents

### Routing rules
- **Images (material photos)** → `image_analysis_agent`
- **Images of documents / scans** → `document_analysis_agent` (LLM‑only for MVP)
- **PDF** → `document_analysis_agent`
 - **DOCX/XLSX/CSV**: accept upload but **skip AI processing** in MVP

### Agents

#### `image_analysis_agent` (already exists)
- Use for material photos (quality, hazards visible, lifecycle, etc.)
- Output always stored in `ProjectFile.ai_analysis.summary/key_facts` for proposal context.
- For suggestions: only map fields that exist in the questionnaire registry; otherwise store as `intake_unmapped_notes`.
 - `unmapped` is filtered for metadata/noise and capped to **10** items.

#### `document_analysis_agent` (new)
- Handles: SDS, lab reports, general notes, scanned documents
- Input: full document (LLM‑only MVP) + doc type
- Output format (standardized):
```json
{
  "summary": "string",
  "key_facts": ["string", "string"],
  "suggestions": [
    { "field_id": "...", "value": "...", "unit": "...", "confidence": 0, "evidence": {"page": 1, "excerpt": "..."} }
  ],
  "unmapped": [
    { "extracted_text": "...", "confidence": 0 }
  ]
}
```
**Enrichment layer (required)**:
- Ingestion service **must** attach `file_id` + `filename` to evidence before persisting.
- Ingestion service resolves `field_label`, `section_title` from the canonical questionnaire registry.
- If `field_id` is unknown, store as `unmapped` instead of persisting a suggestion.

### Document types
- `sds`: extract hazards, PPE, transport, storage
- `lab`: extract analytes + values + qualifiers
- `general`: extract entities from free‑text notes

### Proposal Context Use
- Persist `summary` + `key_facts` in `ProjectFile.ai_analysis` as **unverified context**
- `proposal_agent` can consume these alongside questionnaire data

---

## Services

### `IntakeService`
- `get_intake(project_id)`
- `save_notes(project_id, text, user_id)` (upsert single row)
- `apply_suggestion(suggestion_id)` → mark status + merge into `project.project_data`
- `reject_suggestion(suggestion_id)`
- `map_unmapped_note(note_id, field_id, section_id, labels)`
- `dismiss_unmapped_note(note_id)`
- **Add timeline event** on apply/reject (auditability)

### `IntakeIngestionService`
- `enqueue_ingestion(project_id, file_id, file_type)`
- `extract_from_text(notes)` (MVP optional; only allowed if `source='notes'` and evidence NULL)
- `extract_from_pdf(file)` (LLM‑only MVP)
- `extract_from_image(file)` (LLM‑only MVP)
- `normalize_units()`
- `detect_conflicts()`
- `persist_suggestions()`
- **Idempotency rule**: do not re‑create suggestions if the same file_id + hash already processed
- **Duplicate prevention**: before inserting new suggestions/unmapped for a file, delete any **pending** suggestions/unmapped for the same `source_file_id` (same project)
- **On failure**: mark `ProjectFile.processing_status = failed` + `processing_error`

---

## Apply Merge Semantics (Explicit)
Use `ProjectDataService.update_project_data` to merge:
- Target: `project_data.technical_sections` for `section_id` + `field_id`
- Update only the specific field value + unit
- Apply/reject must be in a single DB transaction with timeline event

---

## Conflict Definition (Explicit)
- A conflict exists when **multiple pending suggestions share the same `(section_id, field_id)`**.
- On apply: **auto‑reject other pending suggestions** for the same `(section_id, field_id)`.

---

## Integration with Proposal Agent
- ProposalAgent continues to use `project.project_data` as canonical.
- Optional: include `intake_notes` as **unverified** context if desired.

---

## Processing State
- Use persisted `ProjectFile.processing_status`.
- `processingDocumentsCount` = count of `queued|processing`.
 - Worker runs as a simple background process (same codebase) polling DB with row-claiming; no new infra in MVP.

---

## In Scope vs Out of Scope

### In Scope (MVP)
- Intake notes (single row per project)
- Suggestions CRUD + apply/reject
- Unmapped notes map/dismiss
- LLM‑only extraction
- Persisted processing_status

### Out of Scope (explicit)
- OCR/Document AI parsing
- Evidence thumbnails
- Server‑side confidence thresholds
- Full note history / versions

---

## Future Enhancements (Not implemented now)

### A) Intake Notes History
- Add `intake_notes_history` table (append‑only) to capture every saved version.
- On each save: update `intake_notes` + insert history row.

### B) Server‑side Confidence Thresholds
- Store thresholds in org settings (e.g., high=85, low=70).
- Filter suggestions in ingestion before persistence.

### C) Evidence Thumbnails
- Render PDF page snippets as images.
- Store URL in `evidence.thumbnail_url`.
- UI already supports fallback if absent.

### D) Evidence Anchors + Fact IDs
- Require per‑fact anchors (page + excerpt + span hash)
- Suggestions must reference fact IDs to prevent hallucinations

---

## Tasks Checklist (Implementation Order)

1) **DB migration**: add `intake_notes`, `intake_suggestions`, `intake_unmapped_notes` with indexes + constraints; add `processing_status`, `processing_error`, `processed_at`, `processing_attempts`, `file_hash` to `project_files`.
2) **Models**: SQLAlchemy models + Pydantic schemas.
3) **Agents**: add `document_analysis_agent` (prompt + schema + output).
4) **Services**: `IntakeService`, `IntakeIngestionService` skeleton.
5) **API routes**: `/projects/{id}/intake` endpoints.
6) **Integrate uploads**: allow PDF ingestion + queue jobs.
7) **Apply/reject**: update `project_data` merge + timeline event.
8) **Tests**: CRUD, apply/reject, map note.
9) **Frontend wiring**: connect notes, suggestions, upload.

---

## Notes
- Confidence scale must be **0–100** (frontend expects that).
- Evidence `page` should be **1‑based** (UI ignores 0).
- Values must be scalar (string|number), not objects/arrays.
- Use composite indexes for multi‑column filters and partial indexes for status = 'pending'.
- **Multi-tenant scoping**: every intake table includes `organization_id` and every endpoint must validate `(organization_id, project_id)` ownership for suggestion/note IDs.

## Frontend Contract Alignment (Must Match)
- `AISuggestion.evidence` is **nullable** when `source='notes'`.
- Add `sourceFileId` to suggestion payloads (nullable for notes).
- `processingDocumentsCount` is the only field; frontend derives `isProcessingDocuments = count > 0`.
- Conflict grouping must use `(sectionId, fieldId)` (not just `fieldId`).
- Apply/Reject returns **409** when suggestion is not `pending`; frontend must revert optimistic state on error.
