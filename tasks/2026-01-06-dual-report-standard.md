# Dual Reports Standard (Internal vs External)

## Why (business requirement)
We need to split the AI deliverable into **two distinct reports**:
- **Internal (operator team):** operational + decision-making + commercial strategy, detailed economics, multiple valorization paths, buyer targeting guidance.
- **External (customer/end user):** executive and **sustainability-first**, with **no sensitive commercial info** and **no named buyers/contacts**.

This dual-report format should become the default standard for simulations going forward.

## Current state (what exists today)
- We generate a single AI output (`ProposalOutput`) rendered in the Proposal page and used for PDF export.
- The current `ProposalOutput` schema + prompt are designed for a **buyer pitch** (pathways + ROI headlines), not an operational internal report.
- The current PDF generator is misaligned with the current schema and includes hard-coded customer branding; it must be updated to be **audience-aware + white-label**.
- For a detailed mapping of what context reaches the agent (questionnaire + photo insights), see `tasks/2026-01-06-proposal-agent-context-audit.md`.

## Goal (v1)
Implement a dual-report pipeline where:
- **Internal report is the source of truth** (LLM structured output).
- **External report is derived deterministically** from the internal report (Python sanitization), so it cannot leak sensitive data.
- UI supports **Internal/Client toggle** and exports **two PDFs**.
- PDFs are **white-label** (no hard-coded customer branding).

## Constraints / guardrails (v1, locked)
- No customer-specific naming in code (avoid "DSR" in model names/fields/prompts/templates).
- Do not invent buyer names or contact data.
- All prices/costs/numbers in internal are **estimates unless sourced**.
- External report must not include: price ranges, cost breakdowns, named buyers/contacts, or any sensitive commercial details.
- Sustainability metrics:
  - CO₂ can be estimated if inputs exist.
  - Water savings + circularity can be placeholders, but must be explicit: `status="not_computed"` + `data_needed`.

## Architecture (v1)
**One LLM run + one deterministic derivation**
1) **LLM → InternalOpportunityReport** (structured, source of truth)
2) **Python → derive_external_report(internal) → ExternalOpportunityReport** (allowlist/denylist + redaction + aggregation)
3) **Renderers → markdown_internal / markdown_external** from structured data (do not rely on ad-hoc text filtering)
4) **PDF export** uses the corresponding markdown (internal vs external)

Optional: if you want nicer prose, add a **small "copywriter" model** that rewrites **only** `markdown_external` and sees **only** already-sanitized data.
Hard rule: copywriter is **stylistic only** (no new facts, no new numbers, no names/contacts, no $ pricing).

---

## Data Models (Pydantic)
### InternalOpportunityReport (internal audience; high-level shape)
Design goals: LLM-friendly; avoid dozens of rigid numeric fields; prefer strings/ranges + assumptions.
Minimum sections (v1):
- Decision: `recommendation`, `confidence`, `headline`, `key_rationale[]`
- Snapshot: company/location/sector/subsector/volume/current disposition/material profile
- Safety/handling: hazards + PPE + storage/transport + regulatory notes
- Sustainability: CO₂ + water + circularity with metric `status` + methodology + `data_needed`
- Economics: profitability band + drivers, cost line items (ranges), best/base/worst scenarios (as estimated strings)
- Pathways: recommended 5–10 ranked valorization options
- Go-to-market: buyer archetypes + geo targets + research checklist (named leads only if sourced)
- Risks/mitigations/next steps + `data_gaps[]` + `estimates_disclaimer`

### ExternalOpportunityReport (client audience; optimized v1 schema)
Design goals: sustainability-first and minimal.
- No sensitive commercial info (no pricing/cost breakdowns; no named buyers/contacts).
- Missing metrics must be explicit (`status="not_computed"` + `data_needed`).

Proposed schema fields (v1):
- `report_version`, `generated_at`
- `sustainability`:
  - `summary` (executive)
  - `co2e_reduction` metric: `status`, `value`, `basis`, `data_needed`
  - `water_savings` metric: `status`, `value`, `basis`, `data_needed`
  - `circularity[]` (named indicators, each a metric)
  - `overall_environmental_impact` (qualitative)
- `profitability_band` (High/Medium/Low/Unknown; no numbers)
- `end_use_industry_examples[]` (generic examples only)

---

## Implementation Checklist (ordered)
### Phase 0: Prep (read before coding)
- [x] Read `tasks/2026-01-06-proposal-agent-context-audit.md` to understand actual agent inputs.
- [x] Identify where `Proposal.ai_metadata["proposal"]` is written/read today (service, API, UI, PDF).
- [x] Inventory hard-coded customer branding and legacy schema assumptions in PDF templates.

### Phase 1: Backend schemas
- [x] Create new Pydantic model for `ExternalOpportunityReport` in `backend/app/models/` (`backend/app/models/external_opportunity_report.py`).
- [x] Extend the internal schema (`ProposalOutput`) with compact fields for deeper internal value:
  - `economics_deep_dive` (profitability band + cost breakdown + scenarios + assumptions + data gaps)
  - richer `pathways[]` (feasibility + target locations + why it works)
- [x] Remove customer-specific naming from docstrings/field descriptions and internal markdown output (no "DSR" branding).
- [x] Keep internal numeric fields LLM-friendly (strings/ranges + assumptions; avoid strict numeric validations).
- [x] Keep external schema minimal (as specified above).
- [ ] (Optional) Rename `ProposalOutput` → `InternalOpportunityReport` (will require coordinated backend+frontend update).

### Phase 2: Agent output + prompt
- [x] Update the existing prompt (`backend/app/prompts/waste-upcycling-report.v3.md`) to be internal decision-making focused (economics deep dive + 5–10 pathways).
- [x] Remove customer-specific language from the prompt and explicitly disallow invented buyer/company/contact data.
- [x] Agent continues using `ProposalOutput` as `output_type`; it now produces the richer internal schema.
- [x] Ensure prompt rules:
  - never invent buyer names/contacts;
  - mark missing data as `not computed`/`data needed`;
  - treat all prices/costs/ROI as indicative estimates unless sourced.

### Phase 3: Derivation (external report)
- [x] Implement `derive_external_report(internal) -> ExternalOpportunityReport` in the service layer.
  - Allowlist what can flow into external.
  - Convert any sensitive info into safe summaries (profitability band only).
  - Buyers → generic end-use industry examples only.
  - Sustainability metrics: if missing, set `status="not_computed"` and populate `data_needed`.

### Phase 4: Persistence + renderers
- [x] Store both structured objects under `Proposal.ai_metadata`:
  - `proposal_internal`, `proposal_external`
  - `markdown_internal`, `markdown_external`
- [x] Implement deterministic markdown renderers from the structured schemas.
- [ ] (Optional) Add copywriter step to rewrite `markdown_external` only, from sanitized data only.

### Phase 5: API + UI
- [ ] Keep existing generate/poll endpoints stable (return both reports/markdowns as needed).
- [x] Add `?audience=internal|external` to the PDF endpoint and cache external PDF path in `ai_metadata.pdfPaths`.
- [ ] Update the Proposal page to toggle Internal vs Client view (render matching markdown).
- [ ] Add two PDF export actions: internal PDF and client PDF.

### Phase 6: PDF (white-label + audience-aware)
- [x] Replace/update PDF generator to be white-label (no hard-coded logos, names, emails, URLs).
- [x] Ensure internal PDF uses `markdown_internal`, external PDF uses `markdown_external`.
- [x] Ensure the client PDF visibly includes sustainability metrics sections: CO₂, water, circularity indicators (even if "not computed").
- [x] Remove legacy water-treatment rendering paths and emoji usage in PDF templates/logs.

### Phase 7: Tests (prevent leakage)
- [ ] Unit tests for `derive_external_report`:
  - External report must not contain any sensitive keys/fields.
  - External must not include price ranges/cost breakdowns/named buyers/contacts.
  - External must include sustainability metric statuses and data_needed when not computed.
- [ ] Schema validation tests for both outputs.
- [ ] (If copywriter enabled) tests enforcing external markdown safety (e.g., no `$`, no contact patterns, no company names).

### Phase 8: Documentation
- [ ] Update `agents_docs/architecture.md` to document the dual-report standard and the sanitization boundary.

---

## Acceptance Criteria (v1)
- Generation produces **two validated outputs** (internal + external) and persists both (+ markdowns).
- Client report is sustainability-first and includes: CO₂, water, circularity indicators, overall impact.
- Client report includes only `profitability_band` (no numbers) and only generic end-use industry examples.
- UI toggles internal vs client views; exports two PDFs.
- PDFs are white-label and audience-aware.
- Tests enforce that external cannot leak internal-only fields.

## Future Work (post-v1)
- Tenant branding configuration (org logo/name) for PDFs.
- Deterministic calculators for water savings and circularity once inputs and formulas are agreed.
- Integrate buyer/contact sources (CRM/partners) for internal `sourced_leads[]` only when sourced.
