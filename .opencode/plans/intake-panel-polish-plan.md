# Plan: Intake Panel Polish — Silent Refresh (No Skeleton Flash) + "Magic Apply" (Focus + Optional Fly Animation)

> **Status**: Ready for Implementation  
> **Priority**: Medium (UX Polish)  
> **Estimated Time**: 1-2 days  
> **Last Updated**: 2026-01-28

---

## Goal & Success Criteria

- **No "page refresh" feel** when applying suggestions (single, batch, conflict-resolve): the questionnaire UI must not switch to `<TechnicalFormSkeleton />` if it already has data.
- **Magic apply feedback**: when user clicks Apply, the UI reliably shows where the value went:
  - Opens the correct section (if collapsed)
  - Scrolls to the exact field `field-${sectionId}-${fieldId}`
  - Highlights it (`animate-apply-burst`)
  - Optionally animates a "value chip" flying to that field
- **Robustness**: silent refresh does not introduce stale-data races; older refresh responses must not overwrite newer data
- **Quality gates**: `cd frontend && bun run check:ci` passes

---

## Non-goals / Out of Scope

- No backend changes
- No AI agent/prompt changes
- No new persistence layer beyond what already exists
- No redesign of intake panel UX beyond apply polish

---

## What's Already True in Code (Repo Evidence)

- ✅ Accordion "rehydration" on sections load exists in `flexible-data-capture.tsx` (useEffect on `[sections]`) and sets fixed + top incomplete custom sections
- ✅ Field DOM targets exist: `DynamicSection` assigns `id="field-${sectionId}-${fieldId}"`
- ✅ `focusField()` exists and already applies `animate-apply-burst`
- ✅ Apply flow already performs optimistic field updates via `updateFieldOptimistic()` in `intake-panel-content.tsx`
- ✅ The "refresh feel" is caused by technical data load setting `loading=true`, and `TechnicalDataSheet` rendering `<TechnicalFormSkeleton />` for any loading

---

## Proposed Solution (Decision Complete)

### 1) Implement "Silent Refresh" in Technical Data Store (Backwards Compatible)

**Files:**
- `frontend/lib/stores/technical-data-store.ts`

**Changes:**

Update `loadTechnicalData` signature to support both old and new call styles:
- Existing: `loadTechnicalData(projectId, true)`
- New: `loadTechnicalData(projectId, { force: true, silent: true })`

**Exact behavior:**

1. **Normalize the second argument:**
   - If boolean → `{ force: boolean, silent: false }`
   - If object → `{ force?: false, silent?: false }`

2. **Compute:** `hasExistingData = (technicalData[projectId]?.length ?? 0) > 0`

3. **If `silent === true && hasExistingData === true`**, do not set `loading=true` at start

4. **Add a per-project "request sequence" guard** to avoid stale overwrites:
   - Maintain `loadSeqByProject: Record<string, number>` in store state (or a module-level Map)
   - Increment sequence when a load begins; only apply results if seq still matches at completion

5. **Ensure loading is only set back to false** if this call set it to true (avoid flicker)

**Why:**
- Removes the skeleton flash during post-apply refreshes while still syncing from server
- The seq guard prevents "silent refresh overlaps" from writing old data last

---

### 2) Gate Skeleton Rendering on "No Existing Data"

**Files:**
- `frontend/components/features/projects/technical-data-sheet.tsx`

**Changes:**

Replace:
```typescript
if (loading) return <TechnicalFormSkeleton />;
```

With:
```typescript
if (loading && sections.length === 0) return <TechnicalFormSkeleton />;
```

**Why:**
- Even if some path accidentally toggles `loading=true`, we won't blank the entire UI if we already have sections

---

### 3) Update Intake Apply Paths to Use Silent Refresh

**Files:**
- `frontend/components/features/projects/intake-panel/intake-panel-content.tsx`

**Changes:**

Replace all `await loadTechnicalData(projectId, true);` calls in:
- `performApplySuggestion`
- Conflict resolution handler
- `performBatchApply`
- Error paths that re-sync UI

With:
```typescript
await loadTechnicalData(projectId, { force: true, silent: true });
```

**Note:**
- Keep the existing `updateFieldOptimistic(...)` calls
- Keep existing "409 conflict" behavior, but use silent refresh there too

---

### 4) "Magic Apply": SuggestionCard → Focus + Optional Fly Animation

Your current plan's highlight step duplicates what `focusField()` already does. We'll centralize all highlight behavior in `focusField()` and add the optional fly animation without coupling it to core state transitions.

**Files:**
- `frontend/components/features/projects/intake-panel/ai-suggestions-section.tsx`
- `frontend/components/features/projects/intake-panel/suggestion-card.tsx`
- `frontend/components/features/projects/intake-panel/focus-field.ts` (minor: only if we need a "prepare-only" mode; otherwise no change)

**Changes:**

#### 4.1 Pass onOpenSection down to SuggestionCard
- `AISuggestionsSection` already accepts `onOpenSection?: (sectionId) => void`
- Update `SuggestionCardProps` to accept `onOpenSection?: (sectionId: string) => void`
- When rendering `SuggestionCard`, pass `onOpenSection={onOpenSection}`

#### 4.2 Implement optional fly animation inside SuggestionCard

Add a small helper (local to `suggestion-card.tsx`):

1. **Capture Apply button rect**
2. **Create a fixed-position chip** showing the formatted value
3. **Call `focusField({ sectionId, fieldId, onOpenSection })`** (await it)
4. **After focusField succeeds**, query the target element (`field-*` fallback `section-*`) and animate the chip to that rect
5. **Remove chip** on transition end

**Respect reduced-motion:**
- If `prefers-reduced-motion`, skip chip; just call `focusField(...)`

#### 4.3 Avoid animation being killed by re-render
- The chip is appended to `document.body`, so it survives component unmount
- Capture the source rect **before** calling `onApply(...)` (because onApply will mark suggestion applied and likely unmount this card)

#### 4.4 Apply ordering

In `SuggestionCard.handleApply`:
1. If disabled/isApplying/isRejecting, return
2. **Capture source rect** and start chip (if enabled)
3. **Kick off `onApply(suggestion.id)`** immediately (don't block on animation)
4. In parallel, **await `focusField(...)`** then animate chip to target

This keeps the system responsive and still "feels magic".

**Feature flag:**

Add a local constant in `suggestion-card.tsx`:
```typescript
const ENABLE_FLY_ANIMATION = true;
```
Easy to disable quickly if it's visually noisy.

---

### 5) Defensive: Ensure Apply Buttons Never Submit Forms

Even if you don't currently wrap intake UI in `<form>`, this prevents future regressions.

**Files:**
- `frontend/components/features/projects/intake-panel/suggestion-card.tsx`
- Any other intake buttons that might be inside forms later

**Changes:**

Ensure Apply/Skip Buttons explicitly use `type="button"` if the underlying UI button supports it (or ensure your shared Button component defaults to `type="button"` when rendering a `<button>`).

---

## Testing & Verification

### Manual QA

**Apply single suggestion:**
- [ ] No skeleton flash
- [ ] Field value appears immediately (already optimistic)
- [ ] Scroll + highlight occurs reliably
- [ ] Fly animation ends on the correct field (when enabled)

**Apply batch:**
- [ ] No skeleton flash

**Resolve conflict:**
- [ ] No skeleton flash

**Reduced motion:**
- [ ] No fly, still scroll+highlight

### Automated

```bash
cd frontend && bun run check:ci
```

(If you have Playwright/Cypress later: add a regression test asserting skeleton is not rendered during apply refresh, but this is optional for now.)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Silent refresh hides errors | Keep toast errors in existing catch blocks; silent only avoids skeleton, not error surfacing |
| Overlapping refresh calls | Sequence guard ensures "last response wins" |
| FocusField fails if target not mounted | onOpenSection improves mounting; still fallback to section id; focusField already waits up to 1500ms |
| Fly animation distracts | Feature flag allows quick disable |

---

## Implementation Order

1. **Silent Refresh** (Part 1-3): 4-6 hours
   - Update store signature
   - Add sequence guard
   - Gate skeleton rendering
   - Update apply paths

2. **Magic Apply** (Part 4): 3-4 hours
   - Pass onOpenSection
   - Implement fly animation
   - Add feature flag
   - Test reduced motion

3. **Defensive** (Part 5): 30 min
   - Add type="button"

**Total**: 1.5-2 days
