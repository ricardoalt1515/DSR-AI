# Proposal Agent Context Audit (UI/DB → Backend → `proposal_agent.py`)

## Purpose
Document exactly what data the proposal agent actually receives today, what is omitted, and where those decisions happen in the code. This is the reference for deciding what to add/remove before implementing the dual-report standard.

## Scope
- Proposal agent: `backend/app/agents/proposal_agent.py`
- Questionnaire template + UI capture: `project.project_data["technical_sections"]`
- Attachments/photos pipeline: `ProjectFile` uploads + image analysis
- Proposal generation orchestration: `backend/app/services/proposal_service.py`

---

## End-to-end flow (high level)
1) Project creation applies a default questionnaire template into JSONB.
   - `backend/app/api/v1/projects.py:360`
   - Template source of truth: `backend/app/templates/assessment_questionnaire.py:1`

2) UI edits the questionnaire and syncs it back to backend under `project_data.technical_sections`.
   - UI stores sections as `TableSection[]` and PATCHes them:
     - `frontend/lib/technical-sheet-data.ts:88`
     - `frontend/lib/api/project-data.ts:54`

3) Photos upload triggers AI analysis in background and stores structured results on each `ProjectFile`.
   - Upload route: `backend/app/api/v1/files.py:55`
   - Background processing: `backend/app/api/v1/files.py:456`
   - Delegation to image agent: `backend/app/services/document_processor.py:44`
   - Image analysis output schema: `backend/app/models/image_analysis_output.py:32`

4) Proposal generation loads:
   - Project metadata (company/sector/subsector/location)
   - Technical data (from `project_data.technical_sections`)
   - Attachments summary (up to 5 photos with `ai_analysis`)
   and runs the proposal agent.
   - Orchestrator: `backend/app/services/proposal_service.py:340`

---

## What the proposal agent receives (actual prompt injection)
The agent uses a single injected context function:
- `backend/app/agents/proposal_agent.py:69`

It concatenates these sections:

### 1) PROJECT (metadata)
Injected keys (from `client_metadata`):
- `company_name`
- `selected_sector`
- `selected_subsector`
- `user_location`

Where `client_metadata` comes from:
- Built in `backend/app/services/proposal_service.py:401`

Important: the prompt injection only prints the four keys above.
- `backend/app/agents/proposal_agent.py:83`

### 2) WASTE ASSESSMENT (questionnaire)
Source:
- `project.project_data["technical_sections"]` (JSONB)

Serialization path:
- DB JSONB → `FlexibleWaterProjectData` (backend model)
  - `backend/app/services/proposal_service.py:156`
  - `backend/app/models/project_input.py:145`
- Clean AI context:
  - `backend/app/models/project_input.py:260`
- Formatted string:
  - `backend/app/models/project_input.py:360`

What the agent actually sees:
- Project overview fields (name/client/sector/location/budget if present)
- A list of sections where each section is:
  - `SECTION_TITLE.upper()`
  - `- Field Label: value [unit] (note: ...)`
- Empty values are skipped.

### 3) PHOTO ANALYSIS (optional)
Source:
- Up to 5 `ProjectFile` records in category `photos` with non-null `ai_analysis`.
  - `backend/app/services/proposal_service.py:229`

Important: the proposal agent receives only the `analysis` dicts from photo insights.
- `backend/app/services/proposal_service.py:469`

Fields injected into the prompt per photo (current state):
- `material_type`, `quality_grade`, `lifecycle_status`, `confidence`
- `co2_savings`, `esg_statement`, `lca_assumptions`
- `storage_requirements`, `ppe_requirements`, `visible_hazards`
- `backend/app/agents/proposal_agent.py:103`

---

## Data that exists but does not influence the proposal agent today

### A) Preferences are sent by UI but not injected
- UI sends `preferences` when calling generate:
  - `frontend/components/features/projects/intelligent-proposal-generator.tsx:159`
- Backend includes it in `client_metadata["preferences"]`:
  - `backend/app/services/proposal_service.py:434`
- Proposal agent does not inject `preferences` into the prompt:
  - `backend/app/agents/proposal_agent.py:83`

Net effect: preferences do not guide the report generation today.

### B) `project_type` exists but is not injected
- UI creates projects with `projectType: "Assessment"`:
  - `frontend/lib/stores/project-store.ts:309`
- Backend includes it in `client_metadata["project_type"]`:
  - `backend/app/services/proposal_service.py:401`
- Proposal agent does not inject it:
  - `backend/app/agents/proposal_agent.py:83`

Net effect: `project_type` does not guide the report generation today.

### C) Questionnaire metadata is intentionally removed
The questionnaire template includes rich metadata (type/options/required/description/conditional/etc.), but the agent does not receive it because `to_ai_context()` strips UI/structure concerns.

Omitted (not passed to the agent):
- field IDs
- field types
- options lists
- placeholder/description text
- required/importance
- conditional visibility rules
- source

This is by design for token efficiency, but it also removes potential semantic guidance.

### D) Section-level notes are not passed
`DynamicSection` supports `section.notes`, but the current AI serialization only adds:
- field-level notes (as `(nota: ...)`)
- top-level `project.notes` if populated

Section notes are not injected.
- `backend/app/models/project_input.py:260`

### E) Photo analysis is truncated
The stored `ImageAnalysisOutput` contains more fields than the proposal agent injects. For example, these exist but are not injected today:
- `current_disposal_pathway`
- `co2_if_disposed`, `co2_if_diverted`
- `degradation_risks`
- `estimated_composition`
- `summary`

Schema reference:
- `backend/app/models/image_analysis_output.py:32`

Prompt injection reference:
- `backend/app/agents/proposal_agent.py:103`

### F) Photo timing and selection effects
- Only photos with completed `ai_analysis` are included.
- Only the most recent 5 are loaded for the agent.

Net effect: generating a report too quickly after upload may produce a report with no photo context.

### G) Non-image files do not add context today
AI processing is only supported for images (jpg/jpeg/png) in the upload flow.
- `backend/app/api/v1/files.py:55`

PDF/Excel analysis is not implemented in the document processor yet.
- `backend/app/services/document_processor.py:1`

---

## Current questionnaire (inputs the agent can rely on)
The default questionnaire is currently two sections:

1) Waste Generation Details:
- waste type, description, volume (free text), seasonality, current practices, segregation, storage infra, revenue streams, audit availability, pain points

2) Objectives & Constraints:
- objectives, context, constraints, regulatory drivers, capex interest + budget band, timeframe

Source of truth:
- `backend/app/templates/assessment_questionnaire.py:79`
- `backend/app/templates/assessment_questionnaire.py:199`

---

## Implications for external (customer) sustainability report
- CO2 is most reliable when photos are present because the image analysis explicitly calculates CO2 fields.
- The questionnaire does not provide structured inputs for water savings or circularity metrics today.
- External report should default to:
  - CO2: computed when photo analysis exists; otherwise clearly "not computed" or qualitative.
  - Water/circularity: placeholders with explicit "data needed" until metrics and inputs are defined.

---

## Candidate changes to consider (later)
These are not implementation decisions yet; they are shortlist items to evaluate:

- Inject `preferences` into agent context so generation can prioritize sustainability vs commercial detail.
- Decide whether to inject more of the photo analysis fields (e.g., `co2_if_disposed`, `co2_if_diverted`, `current_disposal_pathway`, `degradation_risks`) to strengthen sustainability sections.
- Add structured questionnaire fields for sustainability computations (water/circularity) if needed.
- Ensure prompt/markdown/PDF templates are tenant-configurable (no hard-coded customer names).
