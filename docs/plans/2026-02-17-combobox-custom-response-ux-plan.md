# Plan: Combobox custom response UX (no hard "Other")

## Objective
- Make custom answers obvious, fast, and low-friction.
- Keep data quality high for analytics/AI.
- Avoid noisy `Other` when creatable combobox already solves the need.

## Decisions
- Keep creatable combobox as the default pattern.
- Do not hard-remove backend `Other` in PR-1.
- Deprecate `Other` in phases; remove only after usage + quality thresholds hold.

## Scope
- In scope: combobox UX/discoverability, copy, create guardrails, telemetry.
- Out of scope (this PR): TagInput redesign, onboarding tooltip experiments.

## Phase 1 (PR-1, 1-2h)
1. **Input-like trigger (visual only)**
   - File: `frontend/components/ui/combobox.tsx`
   - Replace button visuals with input-like styling (text cursor, input border/focus, smaller chevron).
   - Preserve semantics and behavior: `role="combobox"`, `aria-expanded`, keyboard flow.

2. **Short action copy**
   - File: `frontend/components/ui/combobox.tsx`
   - Trigger placeholder: `Search or type...`
   - Inner search placeholder: `Type to filter or create...`
   - Use contextual placeholder overrides per field where needed.

3. **Clear create action (`+ Add`)**
   - File: `frontend/components/ui/combobox.tsx`
   - Add `CommandSeparator` + plus-icon row: `Add "{query}"`.
   - Use safe internal cmdk value: `create-${query}`.
   - Show only when no exact match (trimmed, case-insensitive).
   - Block invalid creates (empty/whitespace, too short).

4. **Backend `Other` deprecation setup**
   - File: `backend/.../assessment_questionnaire.py`
   - Keep accepting legacy `Other` values.
   - Mark `Other` as deprecated in constants/comments.
   - Do not show `Other` in active UI options once thresholds are met.

## Telemetry (in PR-1)
Emit:
- `combobox_opened`
- `combobox_typed`
- `combobox_selected_existing`
- `combobox_created_new`
- `combobox_abandoned`

Payload keys:
- `field_id`
- `query_length`
- `input_method`
- `had_exact_match`

## Success metrics (2-4 weeks)
- Task success (find/create answer): >= 95%
- Time to complete field: p50 < 5s, p90 < 10s
- Field abandonment: < 10%
- Created values later normalized/merged: >= 85%
- Legacy `Other` usage: < 5% sustained

## Rollout and deprecation gate
- Week 0: ship PR-1 + telemetry.
- Week 1-2: monitor dashboards + support feedback.
- Week 2-4: if thresholds hold, remove `Other` from backend constants.

## Risks and mitigations
- A11y regression from custom trigger
  - Mitigation: keyboard + screen-reader checklist before merge.
- Data fragmentation from free text
  - Mitigation: exact-match checks, normalization pipeline, usage monitoring.
- Accidental create on Enter
  - Mitigation: clear active option highlight; show create row only for valid query.

## Acceptance checklist
- Full keyboard flow works (`Tab`, arrows, `Enter`, `Esc`).
- Screen reader announces expanded/collapsed state correctly.
- Create row appears only for valid, non-duplicate query.
- Existing selection remains one-click fast.
- Telemetry events arrive with expected payload keys.

## Follow-up (next PR)
- Apply same discoverability pattern to `TagInput`.
- If discoverability remains low, add dismissible first-use hint.

## Unresolved questions
- Final deprecation threshold for `Other`: keep 5% or relax to 10%?
- Decision window: 2 weeks or 4 weeks?
