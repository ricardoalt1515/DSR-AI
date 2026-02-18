# 2026-02-17 Questionnaire Post-Fix Hardening Plan

## Objective
Stabilize questionnaire completion/validation behavior after Enter/click fix, remove logic drift, reduce regression risk with minimal-scope refactor.

## Findings
1. Completion logic duplicated/inconsistent across UI/data modules; progress drift risk.
2. Required validation diverges from display semantics (`trim` mismatch); whitespace-only can pass.
3. `sourceBreakdown` truthy check misclassifies numeric `0` as empty.
4. `FieldEditor` has too many concerns; regression surface high, testability lower.
5. `TagInput` suggestions are non-semantic; blur timeout is fragile for keyboard/screen readers.
6. Tech-data copy still mixed EN/ES in UI/comments.

## Plan by Phase

### PR-1 (P0 + P1 + P4) - Hardening + consistency
- Add shared helper `hasFieldValue(value)` (trim strings, arrays length > 0, numeric `0` valid).
- Replace ad-hoc checks with helper in:
  - `sectionCompletion`
  - `sourceBreakdown`
  - `section-accordion-item` completion
  - `flexible-data-capture` incomplete expansion logic
  - `use-field-editor` required checks
  - `field-editor` display `hasValue`
  - `engineering-data-table` completed count
- Add unit tests for helper truth-table (`""`, whitespace, arrays, `0`, `false`, `null`, `undefined`, non-empty values).
- Extract `shouldSaveOnEnter({ fieldType, multiline, defaultPrevented, isComposing })`.
- Replace inline Enter-save branching with function call.
- Add matrix tests to lock current behavior.
- Normalize textarea model to canonical frontend contract:
  - Canonical: `type: "text"` + `multiline: true`
  - Frontend boundary tolerates legacy `type: "textarea"`
  - Backend questionnaire template emits canonical model
- Normalize mixed EN/ES copy in questionnaire core (`technical-data` scope only).

### PR-2 (P3) - TagInput a11y/interaction hardening
- Make suggestions semantic interactive items (button/listbox option pattern).
- Add keyboard navigation: `ArrowUp`, `ArrowDown`, `Enter`.
- Remove timeout-based blur close if feasible without behavior regressions.
- Keep visual behavior equivalent unless accessibility requires minor interaction adjustments.

### Backlog (deferred)
- FieldEditor render split (`ComboboxFieldInput`, `TagsFieldInput`, `UnitFieldInput`) only if reuse/complexity justifies it.

## Acceptance
- Completion/progress totals match across questionnaire views for identical fixture data.
- Required fields with whitespace-only fail validation.
- Numeric `0` counts as valid in completion/source metrics.
- Enter-save behavior remains unchanged after extraction.
- Legacy `textarea` payload still works; new payload uses `text + multiline`.
- Copy is English-only in questionnaire core scope.
- Frontend checks/build pass.

## Risks
- Broad replacement of value checks can introduce subtle regressions if a path intentionally relied on truthiness.
- Keyboard extraction can alter IME/composition handling if tests are incomplete.
- TagInput a11y updates can shift focus/blur timing behavior; needs interaction regression checks.

## Delivery shape
- PR-1: P0 + P1 + P4 together (strict scope, no UX redesign).
- PR-2: TagInput a11y hardening.

## Unresolved Questions
- None.
