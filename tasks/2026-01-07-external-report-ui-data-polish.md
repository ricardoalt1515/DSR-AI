# Plan: External Report UI + Data Polish (Simple v1)

## Context (why)
We now generate **two reports**:
- **Internal report**: operational + decision-making (detailed economics, pathways, risks).
- **External report (client-facing)**: **sustainability-first**, executive, and **no sensitive commercial info**.

Feedback to address (boss):
- External report/PDF needs **more material context** up front so it’s clear what’s being assessed.
- Avoid showing raw placeholders like **`N/A` / `NA` / `not_computed`** in the external UI/PDF.
- Keep the solution **simple, maintainable, and producible** (no over-engineering).

## Goals (v1)
- External UI + PDF feel “complete” even when metrics can’t be computed.
- External content remains safe: no pricing/cost breakdowns, no named buyers/contacts.
- Code stays minimal: prefer small targeted changes over new subsystems.

## Guardrails
- External report must not contain sensitive commercial details (prices, cost breakdowns, named buyers/contacts).
- No hard-coded customer branding in PDFs.
- Keep API/UI casing consistent (camelCase as the contract).
- Do not invent metrics; if not computable, show **what data is needed**.

---

## Proposed solution (simplest)
1) **Add/ensure “Material & Scope”** appears at the start of the external report (UI + PDF).
2) **Replace “N/A/not_computed” display with a friendly pending state**:
   - Show “Pending (needs data)” + a short checklist from `dataNeeded`.
   - Hide empty `basis/value` lines entirely when not computed.
3) Improve external narrative without adding complexity:
   - Ensure external `summary` + `overallEnvironmentalImpact` are descriptive and purely environmental.
   - Keep financial info as a single `profitabilityBand`.

---

## Checklist (implementation tasks)

### A) External data: Material & Scope
- [ ] Decide the minimal external “Material & Scope” fields to display (v1):
  - `material` (short description)
  - `volume` (with units/range if available)
  - `location` (city/region)
  - `baselineDisposal` (optional; only if the questionnaire already captures it)
- [ ] Source of truth (keep it simple):
  - Prefer reading these fields from the internal report (`ProposalOutput`) and/or project questionnaire (`project.project_data`) at generation time.
  - Do not compute new derived fields unless trivial string formatting.
- [ ] Make Material & Scope reliably available to the external PDF renderer:
  - Pass a minimal `context` object to the PDF generator for `audience=external`, or
  - Add a small `materialScope` block into the external report schema (only if passing `context` feels too ad-hoc).

### B) External UI: remove “N/A/not_computed” noise
- [ ] Update external UI cards to avoid rendering raw placeholders:
  - If metric is not computed: show “Pending” + `dataNeeded` bullets.
  - If computed: show `value` and optionally `basis` (only if present).
- [ ] Add a compact “Data needed to finalize metrics” section:
  - Aggregate `dataNeeded` across CO2/water/circularity (dedupe) and show as a checklist.
  - This makes the report actionable and “richer” without inventing numbers.

### C) External PDF: match UI and avoid placeholders
- [ ] Ensure the external PDF includes “Material & Scope” before sustainability sections.
- [ ] In external PDF rendering:
  - Never print `Status: not_computed` as text.
  - Never print `Value: N/A` / `Basis: N/A`.
  - Instead: render “Pending (needs data)” + bullet list of `dataNeeded`.
- [ ] Keep layout simple:
  - One executive page feel: Material & Scope + Summary + 2–3 key blocks.
  - Avoid repeating the same summary again in a “details” section.

### D) External text quality (minimal)
- [ ] Make sure the internal agent prompt produces environmental-only text for:
  - `environment.esgHeadline`
  - `environment.currentHarm`
  - (so the external sanitizer doesn’t have to blank them when it detects `$`/USD)
- [ ] Keep the sanitizer strict; only allow safe content through.

### E) Regression checks (small but high value)
- [ ] Add tests for external rendering rules:
  - External report must not include `$`, price ranges, cost breakdown keys, named buyers/contacts.
  - External UI/PDF renderers do not output “N/A/NA/not_computed” strings.
- [ ] Add a single integration check (API response):
  - Generated proposals always include `aiMetadata.proposalExternal` + `aiMetadata.markdownExternal`.

---

## Acceptance criteria (v1)
- External UI begins with Material & Scope and reads well without extra clicks.
- External UI/PDF never shows raw placeholder tokens (`N/A`, `NA`, `not_computed`).
- External report remains sustainability-first and safe (no sensitive commercial leakage).
- Implementation is small and localized (schema + renderer + UI), with minimal new abstractions.

