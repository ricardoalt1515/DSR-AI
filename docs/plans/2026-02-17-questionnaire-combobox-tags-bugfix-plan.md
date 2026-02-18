# Plan: Questionnaire combobox/tags reliability + copy polish

## Goal
- Keep current model: `combobox` + `tags`.
- Apply small placeholder/helper copy polish only.
- Fix Enter/click selection persistence bug.

## Scope
- In: minimal frontend changes.
- Out: redesign, new field types, `Other` flow changes, autosave architecture changes.

## Changes
1. Preserve existing `combobox`/`tags` usage (no model changes).
2. Combobox copy polish:
   - Placeholder: `Search or type...`
   - Helper: `Can't find it? Type your own answer.`
3. Fix persistence conflict in field editor:
   - Parent Enter-save must not run for `combobox`, `tags`, `select`, `radio`.
   - Respect `event.defaultPrevented` and IME composition state.
   - Keep Enter-save behavior for single-line text/number fields.
4. Add focused interaction tests:
   - Enter create/select in combobox persists.
   - Enter add tag persists.
   - Click option selection persists after blur/click-outside.

## Expected files
- `frontend/components/features/technical-data/field-editor/field-editor.tsx`
- `frontend/components/ui/combobox.tsx`
- Existing questionnaire interaction tests under `frontend`.

## Acceptance
- Enter/click select/create always updates UI and persists.
- No Enter-save regression for text/number fields.
- Combobox placeholder/helper copy appears as specified.
- No `tags` behavior change beyond reliability.

## Sequence
1. Add/adjust failing interaction tests first.
2. Implement Enter handling fix in `FieldEditor`.
3. Apply combobox copy polish.
4. Run `cd frontend && bun run check:ci`.

## Unresolved questions
- None.
