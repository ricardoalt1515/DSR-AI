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
4) **Evidence drawer** for each suggestion (source file + excerpt + thumbnail when available)
5) **Unmapped Notes** (low‑confidence leftovers, bulk actions)

The Files tab remains the master repository for all uploads, but **mapping only happens in Intake Panel**.

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
   - Document `key_facts` are included as proposal context alongside photo insights.

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
  - **MVP AI processing**: only JPG/PNG + PDF generate suggestions; other types are stored only.
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

### 4) Unmapped Notes
- Shows **top 10** open items with a total count (e.g., “Showing 10 of 42”).
- Bulk actions:
  - **Dismiss all**
  - **Dismiss low‑confidence** (threshold 70)
  - **Dismiss by file** (includes “Notes (sin archivo)” for items with no source file)
- Warning text: “Estos no se pueden mapear a campos existentes.”

### 5) Conflict Handling
- If multiple values map to the same field, show both and require manual selection.

### 6) Additional Info (Final Question)
- Add fixed question at end of questionnaire:
  - Label: **“Additional Info”**
  - Free‑text field (multiline)
  - This is part of the questionnaire data and is used by the proposal agent.
- Do NOT auto‑populate this field.
- Low‑confidence leftovers are shown in **Unmapped Notes**, not injected into this field.

---

## Data Model (Proposed)

### A) Intake Notes
- Store in dedicated table `intake_notes` (single editable row per project):
  - `id`, `project_id`, `organization_id`, `text`, `created_at`, `updated_at`

### B) Field Suggestions
- Store in dedicated table `intake_suggestions`:
  - `id`, `project_id`, `organization_id`, `section_id`, `field_id`, `value`, `unit`,
    `confidence`, `status`, `source`, `source_file_id`, `evidence`

### C) Evidence Linking
- Each suggestion references:
  - `ProjectFile.id`
  - `page` (for PDFs)
  - `snippet` (text excerpt)
  - `thumbnail` (page preview or image crop, **future**)

---

## AI Ingestion Pipeline (Recommended)

**Step 1: Extraction**
- Images → multimodal model (LLM-only MVP)
- PDFs → LLM-only MVP (no OCR/table extraction yet)
- Text input → optional LLM extraction (MVP)

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

## Clarification: Photos in Intake (MVP)
- Intake panel allows **quick photo upload** for convenience.
- **Photos do not generate suggestions** in MVP.
- Image analysis outputs are stored on the file and visible in **Files tab** only.
- Showing photo analysis outputs inside the Intake Panel is **future work**.

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

## Future Improvement: Wastewater Characterization Section (Post‑MVP)
Purpose: capture lab/SDS data without inflating the questionnaire. This section is **not** in MVP.

### Minimal Essential Fields (recommended)
Add a new section **"3. Wastewater Stream Characterization"** with **8 fields**:
1. `stream-description` (textarea) — brief description of stream/process origin.
2. `ph-range` (text) — pH min/avg/max in a single field.
3. `flow-rate` (text) — avg/peak flow with units.
4. `key-metals` (textarea) — list of metals + concentrations + units.
5. `key-organics` (textarea) — organics/solvents + concentrations + units.
6. `general-water-quality` (textarea) — COD/BOD/TSS/TDS + units.
7. `current-treatment` (textarea) — existing treatment steps.
8. `discharge-pathway` (textarea) — sewer/POTW/direct discharge + permit limits.

These 8 fields are the minimum needed for ROI/compliance reasoning without over‑structuring.

### Full Section Definition (exact spec)
```
{
  "id": "wastewater-characterization",
  "order": 3,
  "title": "3. Wastewater Stream Characterization",
  "description": "Key lab/SDS details for wastewater streams",
  "fields": [
    {
      "id": "stream-description",
      "label": "Describe the wastewater stream and its origin",
      "value": "",
      "type": "textarea",
      "multiline": true,
      "placeholder": "Example: Acidic nickel-bearing rinse water from plating line...",
      "source": "manual"
    },
    {
      "id": "ph-range",
      "label": "pH range (min / avg / max)",
      "value": "",
      "type": "text",
      "placeholder": "Example: min 2.1, avg 2.4, max 2.7",
      "source": "manual"
    },
    {
      "id": "flow-rate",
      "label": "Flow rate (avg / peak + units)",
      "value": "",
      "type": "text",
      "placeholder": "Example: avg 340,000 gal/yr; peak 1,200 gal/day",
      "source": "manual"
    },
    {
      "id": "key-metals",
      "label": "Key metals + concentrations (with units)",
      "value": "",
      "type": "textarea",
      "multiline": true,
      "placeholder": "Example: Nickel 11,400,000 ug/L; Cobalt 5,040 ug/L",
      "source": "manual"
    },
    {
      "id": "key-organics",
      "label": "Key organics/solvents + concentrations (with units)",
      "value": "",
      "type": "textarea",
      "multiline": true,
      "placeholder": "Example: Acetone 400 mg/L; 2-Butanone 35 mg/L",
      "source": "manual"
    },
    {
      "id": "general-water-quality",
      "label": "General water quality metrics (COD/BOD/TSS/TDS)",
      "value": "",
      "type": "textarea",
      "multiline": true,
      "placeholder": "Example: COD 1,200 mg/L; TSS 300 mg/L",
      "source": "manual"
    },
    {
      "id": "current-treatment",
      "label": "Current treatment steps",
      "value": "",
      "type": "textarea",
      "multiline": true,
      "placeholder": "Example: Neutralization + filtration + holding tank",
      "source": "manual"
    },
    {
      "id": "discharge-pathway",
      "label": "Discharge pathway / permit limits",
      "value": "",
      "type": "textarea",
      "multiline": true,
      "placeholder": "Example: POTW discharge, permit pH 6-9, Ni < 2 mg/L",
      "source": "manual"
    }
  ]
}
```

### AI Mapping Rules (for later)
- pH values -> `ph-range` (if only one value, store as avg).
- Flow/volume -> `flow-rate`.
- Metals list -> `key-metals` (single field, newline‑separated).
- Organics/solvents -> `key-organics`.
- COD/BOD/TSS/TDS -> `general-water-quality`.
- Treatment steps -> `current-treatment`.
- Discharge/permit -> `discharge-pathway`.
- If data does not map cleanly, route to **Unmapped Notes** instead of creating new fields.

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
