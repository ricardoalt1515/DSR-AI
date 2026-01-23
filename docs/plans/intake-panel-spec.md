# Questionnaire Intake Panel (Sketch + Spec)

Owner: Internal ops (field agents + analysts)
Date: 2026-01-22
Status: Draft (revised)

## Goal
Replace the right-side stats panel in the Questionnaire with a **Free‑form Intake Panel** that captures unstructured info (text + files) and produces **AI Suggestions** that can be reviewed and applied to questionnaire fields.

This is NOT a replacement for the Files tab. It is a **shortcut intake surface** tied to the questionnaire.

---

## Problem Statement
Field agents collect messy inputs (notes, lab PDFs, photos, SDS). Today they must manually map everything into fields; this is slow, inconsistent, and causes missing data. We need a guided intake experience that accepts raw inputs and proposes structured field updates with evidence.

---

## UX Summary (Option A – Recommended)

**Right Panel becomes:**
1) **Free‑form input** (text area)
2) **Quick upload** (drag & drop) for images/PDFs/docs
3) **AI Suggestions** list with Apply / Edit / Reject controls
4) **Evidence drawer** for each suggestion (source file + excerpt + thumbnail)
5) **Unmapped Notes** (low‑confidence leftovers)

The Files tab remains the master repository for all uploads.

---

## Sketch (Text Wireframe)

```
┌────────────────────────────────────────────────────────────────┐
│ Questionnaire (left)                 Intake Panel (right)       │
│                                                                │
│ [Field sections]                     ┌──────────────────────┐  │
│                                      │ Intake Notes          │  │
│                                      │ [Text area…]           │  │
│                                      │ [Paste or type here]   │  │
│                                      └──────────────────────┘  │
│                                      ┌──────────────────────┐  │
│                                      │ Upload for extraction  │
│                                      │ [Drop files] [Browse]  │
│                                      │ JPG, PNG, PDF, DOCX     │
│                                      └──────────────────────┘  │
│                                                                │
│                                      ┌──────────────────────┐  │
│                                      │ AI Suggestions (7)    │  │
│                                      │ - pH: 2.7 (ALS 2019)  │  │
│                                      │   [Apply] [Edit] [×]  │  │
│                                      │   Evidence ▸           │  │
│                                      │ - Nickel: 11,400 mg/L │  │
│                                      │   [Apply] [Edit] [×]  │  │
│                                      └──────────────────────┘  │
│                                      ┌──────────────────────┐  │
│                                      │ Unmapped Notes        │  │
│                                      │ “...raw text...”      │  │
│                                      └──────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## End-to-End Flow (Detailed)

1) **Agent inputs data**
   - Completes questionnaire fields.
   - Adds free‑form notes.
   - Uploads files (lab reports, SDS, photos, spreadsheets).

2) **Ingestion pipeline runs (async)**
   - Extract text/tables from documents.
   - OCR images and extract visible hazards.
   - Normalize units and detect qualifiers.
   - Large PDFs / multiple files are queued.

3) **Mapping to suggestions**
   - System creates `FieldSuggestion` objects for relevant fields.
   - Each suggestion includes evidence (file + excerpt + confidence).
   - If conflicts exist, show both and require manual selection.

4) **Human review**
   - Agent can Apply / Edit / Reject each suggestion.

5) **Questionnaire is updated**
   - Only applied suggestions become official field values.

6) **Proposal generation**
   - Proposal agent consumes the validated questionnaire + additional info + photo insights.

---

## Functional Spec

### 1) Intake Notes
- Multiline text input.
- Accepts free text in any order.
- Autosave to project as an **intake note** (not a questionnaire field).
- Intake notes are processed by the same extraction pipeline to produce suggestions.

### 2) Intake Upload
- Drag & drop / Browse.
- Supported types: JPG/PNG, PDF, DOCX, CSV/XLSX.
- Files are stored in standard `ProjectFile` storage (so they appear in Files tab).
- User can tag an upload as “lab report”, “SDS”, or “photo” to guide parsing.

### 3) AI Suggestions
- After notes or file upload, system produces **suggestions**.
- A suggestion is a **draft update** (not applied automatically).
- Each suggestion shows:
  - Field label + value + unit
  - Confidence score
  - Evidence link (file + excerpt + thumbnail)

Actions per suggestion:
- **Apply** → writes into questionnaire field
- **Edit** → opens inline edit before apply
- **Reject** → dismiss suggestion

### 4) Conflict Handling
- If multiple values map to the same field, show both and require manual selection.

### 5) Additional Info (Final Question)
- Add fixed question at end of questionnaire:
  - Label: **“Additional Info”**
  - Free‑text field (multiline)
  - This is part of the questionnaire data and is used by the proposal agent.
- Do NOT auto‑populate this field.
- Low‑confidence leftovers are shown in **Unmapped Notes**, not injected into this field.

---

## Data Model (Proposed)

### A) Intake Notes
- Store in `project.project_data.intake_notes` (list of entries):
  - `id`, `text`, `created_at`, `created_by`

### B) Field Suggestions
- New entity (or JSONB in project_data):
  - `id`, `field_id`, `value`, `unit`, `confidence`, `source`
  - `source` contains: file_id, page/line, excerpt

### C) Evidence Linking
- Each suggestion references:
  - `ProjectFile.id`
  - `page` (for PDFs)
  - `snippet` (text excerpt)
  - `thumbnail` (page preview or image crop)

---

## AI Ingestion Pipeline (Recommended)

**Step 1: Extraction**
- Images → OCR + multimodal model for visible hazards/materials
- PDFs → table extraction (lab reports)
- Text input → NLP entity extraction

**Step 2: Normalization**
- Units converted to canonical units
- Detect qualifiers (ND, LOD)

**Step 3: Mapping**
- Map extracted items to questionnaire fields
- Produce suggestions with confidence

**Step 4: Human Review**
- User applies edits manually

---

## Confidence & Filtering
- Default thresholds (configurable):
  - ≥85%: show normally
  - 70–85%: show with warning
  - <70%: do not suggest, move to Unmapped Notes
- Confidence thresholds should be configurable by org or document type.

---

## Async Processing & User Feedback
- PDFs >10 pages or multi‑file uploads go into a queue.
- UI shows status: **Processing…**
- Notify user when suggestions are ready.

---

## Extraction Technologies (2026 best‑practice approach)

### Recommended architecture (simple + maintainable)
- **Document parsing layer** (deterministic)
  - Extract text + tables + layout.
  - This layer should NOT invent values.
- **LLM mapping layer** (semantic)
  - Map extracted facts to questionnaire fields.
  - Create suggestions with evidence and confidence.

### Options

**Option 1: Internal parsing + LLM mapping (lowest vendor lock‑in)**
- Use local parsers for PDFs/XLSX/CSV + OCR.
- Pros: control, lower variable cost.
- Cons: more engineering, lower accuracy on messy PDFs.

**Option 2: External doc AI + LLM mapping (recommended for production)**
- Use a managed OCR/document AI for PDFs/SDS/lab reports.
- Pros: high accuracy, less maintenance.
- Cons: per‑page cost, vendor dependency.

**Option 3: LLM‑only extraction (MVP‑only option)**
- Send PDF/text to a multimodal LLM and ask it to extract structured facts.
- Pros: fast prototype, low integration effort.
- Cons: higher error risk, weaker auditability, not suitable for compliance‑critical data.

### Best‑practice rules
- Always produce **structured extraction** first; LLM maps, not invents.
- Suggestions must carry evidence (file + excerpt + confidence).
- Any compliance/ROI‑critical field requires human approval.
- Keep raw files in Files tab for audit.

---

## Operational UX Decisions (Final)

### A) Suggestions visible in the panel
- Show **max 20** most recent suggestions.
- Provide **“View all”** link to open a modal/drawer with full history and filters.

### B) File role and history
- **Files tab is the source of truth** (full repository and audit trail).
- Intake panel is a **shortcut** + suggestions preview.
- In Files tab, show badge “AI suggestions pending” per file.

### C) Many documents at once
- Use async queue; show per-file status.
- Do not block data entry; allow agents to keep filling the questionnaire.

### D) User pastes all info in text
- Always accept free text.
- Extract suggestions from notes.
- Anything not mapped goes to **Unmapped Notes**, not Additional Info.

---

## Acceptance Criteria (Mapped)
- Stats panel replaced by Intake Panel.
- Intake supports free text + file uploads.
- AI suggestions are **reviewable** before applying.
- “Additional Info” field exists at end of questionnaire.
- Files are stored and visible in Files tab.
- UX style matches existing questionnaire UI.

---

## Edge Cases
- Unstructured text → suggestions low confidence.
- Multiple conflicting values → show both, force user pick.
- Large PDF → queue processing, show status.
- No suggestions → show “No mappable data detected.”

---

## Phases of Implementation

### MVP
- LLM‑only extraction is allowed for speed.
- PDFs + images only.
- Basic suggestions with confidence + evidence.

### Production
- Async queue + status feedback.
- Conflict handling + thresholds.
- Thumbnails + evidence highlighting.
- Add deterministic parsing layer (managed OCR/doc AI).

### Scale
- Batch processing + caching.
- Fallback to open‑source parsers for cost control.
- Multi‑model routing by document type.

---

## Risks & Mitigations
- **Hallucinations** → deterministic parsers + evidence required (MVP uses manual review for critical fields).
- **Cost** → caching + routing + fallback parsers.
- **Latency** → async queue + progress UI.
- **Compliance** → audit trail from file → suggestion → applied value.

---

## Implementation Notes (Tech)
- Reuse existing upload service; do NOT build a parallel file store.
- Add AI processing for PDFs (currently image‑only).
- Add suggestion storage + apply endpoint.

---

## Open Questions
- Should intake notes feed proposal directly if never applied? (default: no)
- Confidence thresholds by org or document type? (default: global)
- Which external parser should be used (managed OCR vs internal)?
