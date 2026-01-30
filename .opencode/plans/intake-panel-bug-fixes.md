# Intake Panel Bug Fixes Plan

> **Status**: Ready for Implementation  
> **Priority**: High (Critical UX Issues)  
> **Estimated Time**: 3-4 hours  
> **Created**: 2026-01-28

---

## Overview

Three critical bugs in the intake panel need fixing:

1. **Field value clears when clicking after applying suggestion** - Users lose their applied data
2. **Flickering/scroll reset** - Panel constantly refreshes, poor UX
3. **Animation performance** - Layout shifts cause scroll jumps

All fixes have been validated by frontend architecture experts and follow React/Vercel best practices.

---

## Bug 1: Field Value Clears When Clicking + Infinite Loop Fix

### Problem
When a user applies a suggestion to a field, then clicks on that field to edit it, the value appears to clear or reset to the old value. **CRITICAL BUG**: Also causes infinite loop with "Maximum update depth exceeded" error and 429 Too Many Requests.

### Root Cause
The `useFieldEditor` hook has an auto-save useEffect that creates an infinite loop:
1. `onSave` is called and updates the field
2. This changes `field.value` (prop)
3. The useEffect re-executes because `field.value` is in dependencies
4. `debouncedValue !== field.value` is still true (async timing)
5. `onSave` is called again → **infinite loop**

### Solution: Fix Auto-Save Logic

**File**: `frontend/lib/hooks/use-field-editor.ts`

**Current (Broken - Lines 81-105):**
```typescript
useEffect(() => {
  if (!autoSave || !onSave) return;

  if (
    mode === "editing" &&
    (debouncedValue !== field.value || debouncedUnit !== field.unit) &&
    validationStatus !== "invalid"
  ) {
    onSave(debouncedValue ?? "", debouncedUnit ?? field.unit ?? "", notes);
  }
}, [
  autoSave,
  debouncedValue,
  debouncedUnit,
  validationStatus,
  mode,
  field.value,  // ← PROBLEM: Triggers re-run when onSave updates field
  field.unit,
  notes,
  onSave,
]);
```

**Fix:**
```typescript
useEffect(() => {
  if (!autoSave || !onSave) return;

  // ✅ FIX: Only auto-save if there's an active draft AND value changed
  // This prevents the loop when field.value updates from external source
  if (
    mode === "editing" &&
    draftValue !== null && // ← KEY: Only if user has started editing
    (debouncedValue !== field.value || debouncedUnit !== field.unit) &&
    validationStatus !== "invalid"
  ) {
    onSave(debouncedValue ?? "", debouncedUnit ?? field.unit ?? "", notes);
  }
}, [
  autoSave,
  debouncedValue,
  debouncedUnit,
  validationStatus,
  mode,
  draftValue, // ← Track draftValue instead of field.value
  field.value,
  field.unit,
  notes,
  onSave,
]);
```

**Alternative Fix (Simpler):**
```typescript
useEffect(() => {
  if (!autoSave || !onSave) return;
  if (mode !== "editing") return;
  if (validationStatus === "invalid") return;
  
  // ✅ Only save if debounced value differs from current field value
  const hasValueChanged = debouncedValue !== null && debouncedValue !== field.value;
  const hasUnitChanged = debouncedUnit !== null && debouncedUnit !== field.unit;
  
  if (hasValueChanged || hasUnitChanged) {
    onSave(debouncedValue ?? "", debouncedUnit ?? field.unit ?? "", notes);
  }
}, [autoSave, debouncedValue, debouncedUnit, field.value, field.unit, mode, notes, onSave, validationStatus]);
```

**Implementation Steps:**
1. Modify the useEffect in `use-field-editor.ts` (lines 81-105)
2. Add `draftValue !== null` check OR `hasValueChanged` logic
3. Test applying suggestions - should NOT cause infinite loop
4. Verify no 429 errors in console

**Files to Modify:**
- `frontend/lib/hooks/use-field-editor.ts` - Fix useEffect logic (lines 81-105)

---

## Bug 2: Flickering from Polling

### Problem
The intake panel flickers every 5 seconds due to aggressive polling. Loading skeletons appear/disappear rapidly.

### Root Cause
`hydrateIntake` sets `isLoadingSuggestions=true` on every poll, causing skeleton loaders to flash.

### Solution: Silent Background Refresh

**File**: `frontend/components/features/projects/intake-panel/intake-panel.tsx`

**Current:**
```typescript
const hydrateIntake = useCallback(async () => {
  setIsLoadingSuggestions(true);  // ← Shows skeleton every time!
  // ... fetch data
  setIsLoadingSuggestions(false);
}, [/* deps */]);

// Polling
setInterval(() => hydrateIntake(), 5000);
```

**New:**
```typescript
const hydrateIntake = useCallback(async (options?: { silent?: boolean }) => {
  // Only show loading UI for explicit refreshes, not background polling
  if (!options?.silent) {
    setIsLoadingSuggestions(true);
  }
  
  try {
    const response = await intakeAPI.hydrate(projectId);
    
    // Update store (always do this)
    setSuggestions(response.suggestions);
    setUnmappedNotes(response.unmapped_notes);
    // ... other updates
    
    return true;
  } catch (error) {
    if (!options?.silent) {
      toast.error("Failed to refresh suggestions");
    }
    return false;
  } finally {
    if (!options?.silent) {
      setIsLoadingSuggestions(false);
    }
  }
}, [projectId, /* other deps */]);

// Polling uses silent mode
useEffect(() => {
  if (processingDocumentsCount > 0 && !pollingRef.current) {
    pollingRef.current = setInterval(() => {
      void hydrateIntake({ silent: true });  // ← Background refresh
    }, 5000);
  }
  // ... cleanup
}, [hydrateIntake, processingDocumentsCount]);
```

**Implementation Steps:**
1. Add optional `silent` parameter to `hydrateIntake`
2. Conditionally set loading state based on `silent` flag
3. Update polling interval to pass `{ silent: true }`
4. Keep explicit refreshes (user-initiated) with loading UI

---

## Bug 3: Scroll Reset & Animation Performance

### Problem
When scrolling the suggestions list, the position jumps back. Layout animations cause performance issues.

### Root Cause
1. `AnimatePresence mode="popLayout"` causes layout recalculations
2. `useFilteredPendingSuggestions` returns new array on every render
3. No scroll position preservation

### Solution: Simplify Animations + Stable References

**File**: `frontend/components/features/projects/intake-panel/ai-suggestions-section.tsx`

**Current:**
```tsx
<AnimatePresence mode="popLayout">
  {filteredSuggestions.map((suggestion) => (
    <motion.div key={suggestion.id} layout>
      <SuggestionCard ... />
    </motion.div>
  ))}
</AnimatePresence>
```

**New:**
```tsx
// Use CSS transitions instead of Framer Motion layout animations
<div className="space-y-3">
  {filteredSuggestions.map((suggestion) => (
    <SuggestionCard 
      key={suggestion.id} 
      suggestion={suggestion}
      onApply={handleApply}
      onReject={handleReject}
      disabled={disabled}
    />
  ))}
</div>
```

**File**: `frontend/components/features/projects/intake-panel/suggestion-card.tsx`

**Add React.memo:**
```typescript
// Wrap component with React.memo to prevent unnecessary re-renders
export const SuggestionCard = React.memo(function SuggestionCard({
  suggestion,
  onApply,
  onReject,
  disabled,
}: SuggestionCardProps) {
  // ... existing code
});
```

**File**: `frontend/lib/stores/intake-store.ts`

**Fix selector to return stable reference:**
```typescript
// Current: Returns new array every time due to .sort()
export const useFilteredPendingSuggestions = () =>
  useIntakePanelStore(
    useShallow((state) => {
      const pending = state.suggestions.filter((s) => s.status === "pending");
      // ... filtering
      return filtered.sort((a, b) => b.confidence - a.confidence);  // ← New array!
    }),
  );

// New: Memoize the result
export const useFilteredPendingSuggestions = () => {
  const { suggestions, activeFilter } = useIntakePanelStore(
    useShallow((state) => ({
      suggestions: state.suggestions,
      activeFilter: state.activeFilter,
    })),
  );
  
  return useMemo(() => {
    let filtered = suggestions.filter((s) => s.status === "pending");
    
    // Apply filters
    if (activeFilter === "high") {
      filtered = filtered.filter((s) => s.confidence >= 85);
    } else if (activeFilter === "notes") {
      filtered = filtered.filter((s) => s.source === "notes");
    } else if (activeFilter === "files") {
      filtered = filtered.filter((s) => s.source !== "notes");
    }
    
    // Sort: conflicts first, then by confidence
    return [...filtered].sort((a, b) => {
      const aConflict = /* conflict detection */;
      const bConflict = /* conflict detection */;
      if (aConflict && !bConflict) return -1;
      if (!aConflict && bConflict) return 1;
      return b.confidence - a.confidence;
    });
  }, [suggestions, activeFilter]);
};
```

**Implementation Steps:**
1. Remove `AnimatePresence` and `motion.div` wrapper from suggestion list
2. Add `React.memo` to `SuggestionCard`
3. Refactor selector to use `useMemo` and return stable reference
4. Add simple CSS transitions if needed (optional)

---

## Implementation Order

### Phase 1: Fix Auto-Save Infinite Loop (URGENT - 30 min)
1. **CRITICAL**: Fix useEffect in `use-field-editor.ts` (lines 81-105)
2. Add `draftValue !== null` check to prevent infinite loop
3. Test applying suggestions - verify no "Maximum update depth exceeded" error
4. Verify no 429 Too Many Requests errors

**The Hook Already Uses Controlled Pattern** - The implementation is correct, the bug is only in the auto-save useEffect dependencies/logic.

### Phase 2: Silent Refresh (30 minutes)
1. Add `silent` option to `hydrateIntake`
2. Update polling to use silent mode
3. Verify no flickering during background refresh

### Phase 3: Animation Cleanup (1 hour)
1. Remove Framer Motion layout animations
2. Add React.memo to SuggestionCard
3. Fix selector memoization
4. Test scroll stability

---

## Testing Checklist

### Bug 1: Field Value
- [ ] Apply suggestion to a field
- [ ] Click on the field to edit
- [ ] Verify value is present and editable
- [ ] Save changes
- [ ] Verify changes persist

### Bug 2: Flickering
- [ ] Open intake panel
- [ ] Wait 30 seconds (multiple poll cycles)
- [ ] Verify no skeleton flashing
- [ ] Upload a file
- [ ] Verify background refresh works (data updates without loading UI)

### Bug 3: Scroll
- [ ] Generate 20+ suggestions
- [ ] Scroll down the list
- [ ] Wait for poll cycle
- [ ] Verify scroll position is preserved
- [ ] Apply a suggestion
- [ ] Verify scroll doesn't jump

---

## Files to Modify

```
frontend/lib/hooks/use-field-editor.ts                    # Complete refactor
frontend/components/features/projects/intake-panel/intake-panel.tsx  # Silent refresh
frontend/components/features/projects/intake-panel/ai-suggestions-section.tsx  # Remove animations
frontend/components/features/projects/intake-panel/suggestion-card.tsx  # Add React.memo
frontend/lib/stores/intake-store.ts                       # Fix selector
```

---

## Bug 5: AI Suggestions Not Working for Yes/No Fields (SIMPLIFIED SOLUTION)

### Problem
AI suggests nuanced answers like "Yes, but only for metals" but Yes/No radio fields can't display them. Fields appear empty after applying suggestion.

**Affected Fields (4 pairs to merge):**
1. `seasonal-variations` + `seasonal-description`
2. `segregation` + `segregation-how`
3. `revenue-streams` + `revenue-description`
4. `waste-audit` (standalone, convert to textarea)

**Current Behavior:**
```
AI suggests: "Yes, but only for metals"
Field type: radio (options: ["yes", "no"])
Result: Field shows empty ❌
Conditional field (description) doesn't appear ❌
```

### ✅ FINAL RECOMMENDATION: Merge into Single Textarea Fields

**After 9 subagent validations, the simplest solution wins:**

Merge Yes/No + conditional detail fields into single textarea fields.

**Why this is best:**
- ✅ **Simplest**: No new data model, no conditional logic
- ✅ **Works with AI**: Free text accepts any AI suggestion
- ✅ **5 minutes**: Just change type from "radio" to "textarea"
- ✅ **No migration risk**: Existing data becomes placeholder text
- ✅ **Best UX**: One field, clear what to write

### Implementation (30 minutes)

**Step 1: Update Questionnaire Template (5 min)**

```python
# backend/app/templates/assessment_questionnaire.py

# BEFORE (8 fields with conditionals)
{
    "id": "seasonal-variations",
    "type": "radio",
    "options": ["yes", "no"]
},
{
    "id": "seasonal-description",
    "type": "textarea",
    "conditional": {"field": "seasonal-variations", "value": "yes"}
}

# AFTER (4 merged fields)
{
    "id": "seasonal-variations",
    "type": "textarea",
    "label": "Seasonal Variations in Waste Volumes",
    "placeholder": "Describe any seasonal variations (e.g., higher volumes in summer) or write 'No significant seasonal variations'",
    "description": "Explain how waste volumes change throughout the year"
}
```

**Step 2: Remove Conditional Logic (10 min)**

```typescript
// frontend/components/features/technical-data/components/data-capture/dynamic-section.tsx
// REMOVE lines 67-84 (conditional field filtering)
// All fields now display unconditionally
```

**Step 3: Update 4 Field Pairs**

| Old Radio Field | Old Detail Field | New Merged Field |
|----------------|------------------|------------------|
| `seasonal-variations` | `seasonal-description` | `seasonal-variations` (textarea) |
| `segregation` | `segregation-how` | `segregation` (textarea) |
| `revenue-streams` | `revenue-description` | `revenue-streams` (textarea) |
| `waste-audit` | (none) | `waste-audit` (textarea) |

### Data Migration (Automatic)

**No manual migration needed** - existing data works as-is:
- Radio value "yes" → becomes text "yes" in textarea
- Description content → user can copy/paste if needed
- Empty fields → user fills with AI suggestion

### Benefits

| Aspect | Merged Textarea | Hybrid Field | Combobox |
|--------|----------------|--------------|----------|
| **Implementation** | ✅ 30 min | ❌ 2-3 hours | ❌ 1 hour |
| **Code Changes** | ✅ 2 files | ❌ 5+ files | ❌ 3 files |
| **Data Model** | ✅ No changes | ❌ Add 2 fields | ❌ Type change |
| **AI Compatibility** | ✅ Perfect | ✅ Good | ⚠️ OK |
| **UX Simplicity** | ✅ One field | ⚠️ Two fields | ⚠️ Confusing |
| **Maintenance** | ✅ Zero debt | ⚠️ Complex | ⚠️ Edge cases |

### Files to Modify

```
backend/app/templates/assessment_questionnaire.py     # Merge fields
frontend/components/technical-data/dynamic-section.tsx # Remove conditionals
```

### Testing

- [ ] Create new waste stream
- [ ] Verify 4 merged fields show as textarea (not radio)
- [ ] Apply AI suggestion - should appear in field
- [ ] Edit field manually
- [ ] Save and verify persistence
- [ ] Check mobile display

---

## Implementation Order (Updated)

### Phase 1: Fix Auto-Save Infinite Loop (URGENT - 30 min)
1. Fix useEffect in `use-field-editor.ts` (lines 81-105)
2. Add `draftValue !== null` check
3. Test - verify no infinite loop

### Phase 2: Silent Refresh (30 minutes)
1. Add `silent` option to `hydrateIntake`
2. Update polling to use silent mode

### Phase 3: Animation Cleanup (1 hour)
1. Remove Framer Motion layout animations
2. Add React.memo to SuggestionCard
3. Fix selector memoization

### Phase 4: Hybrid Field Implementation (2-3 hours) ⭐ NEW
**RECOMMENDED SOLUTION** per 6-subagent analysis (UX + Code experts)

**Why Hybrid Field (Radio + Detail) wins:**
- ✅ 44/60 score (highest of all solutions)
- ✅ Validated by Airtable, Linear, Notion patterns
- ✅ Clean data (yes/no) + captures nuance
- ✅ Zero breaking changes
- ✅ Follows existing code patterns

**Implementation:**

**Step 1: Extend Data Model (15 min)**
- Add `detail?: string` and `suggestedDetail?: string` to TableField type
- Update backend DynamicField model

**Step 2: Update AI Agents (30 min)**
- Modify document_analysis_agent.py to return `{value, detail}`
- Modify notes_analysis_agent.py similarly

**Step 3: Update Field Editor (1 hour)**
- Modify radio case to show detail input below
- Show "Use AI suggestion" button when suggestedDetail exists
- Include detail in save action

**Step 4: Update 6 Yes/No Fields**
Fields to verify/update:
1. `revenue-streams` - "Are any current waste streams generating revenue?"
2. `waste-audit` - "Waste Audit Documentation Available?"
3. `segregation` - "Do you currently segregate your waste?"
4. `seasonal-variations` - "Seasonal Variations in Waste Volumes?"
5. `timeframe` - "Timeframe for implementation"
6. `capex-interest` - "Interested in CapEx investments"

**Alternative (if Hybrid Field too complex):**
Use **AI Suggestion Display Only** pattern (42/60 score):
- Show AI suggestion as banner below field
- User manually selects Yes/No
- Keeps existing schema, minimal changes

---

## Testing Checklist

### Bug 1: Field Value + Infinite Loop
- [ ] Apply suggestion to a field
- [ ] Verify no "Maximum update depth exceeded" error
- [ ] Verify no 429 Too Many Requests
- [ ] Click field to edit - value should be present

### Bug 2: Flickering
- [ ] Open intake panel, wait 30 seconds
- [ ] Verify no skeleton flashing
- [ ] Upload file, verify background refresh works

### Bug 3: Scroll
- [ ] Generate 20+ suggestions, scroll down
- [ ] Wait for poll cycle
- [ ] Verify scroll position preserved

### Bug 5: AI Suggestions in Yes/No Fields (Simplified Solution)
- [ ] Apply AI suggestion to merged textarea field (e.g., seasonal-variations)
- [ ] Verify AI suggestion appears correctly (e.g., "Higher volumes in summer")
- [ ] Verify user can edit the suggestion
- [ ] Verify field saves correctly
- [ ] Test all 4 merged fields:
  - [ ] seasonal-variations (merged with seasonal-description)
  - [ ] segregation (merged with segregation-how)
  - [ ] revenue-streams (merged with revenue-description)
  - [ ] waste-audit (standalone, converted to textarea)

---

## Files to Modify

```
# Bug 1 - Infinite Loop
frontend/lib/hooks/use-field-editor.ts

# Bug 2 - Flickering
frontend/components/features/projects/intake-panel/intake-panel.tsx

# Bug 3 - Scroll/Animations
frontend/components/features/projects/intake-panel/ai-suggestions-section.tsx
frontend/components/features/projects/intake-panel/suggestion-card.tsx
frontend/lib/stores/intake-store.ts

# Bug 4 - Select Fields
schema/field-definitions.ts (or backend field config)
# Optional: frontend/components/ui/combobox.tsx (add AI badge)

# Bug 5 - Merge Yes/No Fields (SIMPLIFIED)
backend/app/templates/assessment_questionnaire.py     # Merge 8 fields into 4
frontend/components/features/technical-data/components/data-capture/dynamic-section.tsx  # Remove conditionals
```

---

## Success Criteria

- [ ] No infinite loop when applying suggestions
- [ ] No flickering during background polling
- [ ] Scroll position stable during updates
- [ ] AI suggestions visible in all field types
- [ ] All existing tests pass
- [ ] No regression in functionality

---

## Notes

- **Bug 1-3**: React performance fixes (useEffect, memoization, animations)
- **Bug 4**: Schema change - simplest solution per UX research
- All changes align with code-style.md principles
- Combobox approach validated by industry best practices (Linear, Notion)
