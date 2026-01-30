# Intake Panel UI/UX Simplification Plan

> **Version**: 2.0 (Updated with subagent feedback)
> **Goal**: Simple, intuitive, scannable UI for non-technical users

## Philosophy

```
Simple > Feature-rich
Intuitive > Powerful  
Scannable > Dense
```

Target users: Non-technical, need to understand suggestions in <3 seconds.

---

## Core Principles

1. **Immediate clarity** - Each suggestion answers: What field? What value? From where?
2. **Minimal actions** - Only Skip / Apply per suggestion
3. **One batch CTA** - "Apply All High-Confidence" 
4. **Visual differentiation** - Notes vs Files obvious at glance (icon + color)
5. **Graceful expansion** - Long text expandable, not truncated

---

## Current Problems

| Problem | Severity | Root Cause |
|---------|----------|------------|
| 4 rows per suggestion | High | Too much info per item |
| Notes vs Files indistinguishable | High | Only small badge differentiates |
| Conflicts separate from suggestions | Medium | ConflictCards above suggestions list |
| 3 competing CTAs | Medium | SummaryBar + BatchToolbar + row actions |
| Flying animation unreliable | Medium | Depends on target element visibility |
| Long text truncated | Low | No expansion mechanism |
| Keyboard shortcuts unused | Low | Target users don't use shortcuts |

---

## Proposed Design

### Suggestion Card (Medium Size)

```
+---------------------------------------------------------------+
|  [icon] From notes                                        87% |
|---------------------------------------------------------------|
|                                                               |
|  Company Name                                                 |
|  +-----------------------------------------------------------+|
|  |  "Acme Corporation"                                       ||
|  +-----------------------------------------------------------+|
|                                                               |
|  -> General Information                                       |
|                                                               |
|                                        [Skip]    [Apply]      |
+---------------------------------------------------------------+
```

**Height: ~120px** - Sufficient breathing room without waste.

**Hierarchy:**
1. **Header**: Source icon + text + Confidence % (top-right)
2. **Field name**: Bold, prominent
3. **Value box**: The proposed value, visually distinct
4. **Target section**: Small, "-> Section Name"
5. **Actions**: Two buttons only

### Source Differentiation (Corrected)

| Source | Icon | Border | Background | Rationale |
|--------|------|--------|------------|-----------|
| Notes | StickyNote | `border-l-4 border-accent/40` | `bg-accent/5` | Teal = neutral, not "success" |
| Files | FileText | `border-l-4 border-info/40` | `bg-info/5` | Blue = documents association |

**Why not `--success` for Notes?** 
- Green implies "verified/completed" which confuses users
- `--accent` (teal) is neutral and distinct from files

Uses existing design tokens from globals.css:
- `--accent` (oklch 0.92 0.03 222) for Notes
- `--info` (oklch 0.55 0.15 235) for Files

### Confidence Display

Show percentage with colored dot indicator:

```tsx
<span className={cn(
  "text-sm font-medium tabular-nums flex items-center gap-1.5",
  confidence >= 85 ? "text-success" :
  confidence >= 60 ? "text-warning" : "text-destructive"
)}>
  <span className="inline-block h-2 w-2 rounded-full bg-current" />
  {confidence}%
</span>
```

Uses existing tokens:
- `--confidence-high` → `--success`
- `--confidence-medium` → `--warning`  
- `--confidence-low` → `--destructive`

### Long Text Handling

For values >80 characters:
```
+-----------------------------------------------------------+
|  "Industrial facility with 3 loading docks, hazardous..." |
|                                           [Show more v]   |
+-----------------------------------------------------------+
```

Click expands inline with AnimatePresence. No modal. Works on mobile (tap).

### Conflict Card (Inline)

```
+---------------------------------------------------------------+
|  [!] Choose a value for Company Name                          |
|---------------------------------------------------------------|
|                                                               |
|  ( ) "Acme Corporation"        [icon] Notes - 87%             |
|                                                               |
|  ( ) "Acme Corp Ltd"           [icon] quote.pdf - 92%         |
|                                                               |
|  -> General Information                                       |
|                                                               |
|                                [Skip]    [Use Selected]       |
+---------------------------------------------------------------+
```

**Style**: `border-l-4 border-warning/40 bg-warning/5`

Uses `--warning` token (oklch 0.72 0.15 85).

---

## Summary Bar (Sticky)

```
+---------------------------------------------------------------+
|  12 suggestions - 8 high-confidence    [Apply All High-Conf]  |
+---------------------------------------------------------------+
```

- Sticky at top of suggestions section
- Shows count + high-conf count
- Single primary CTA
- Threshold: 85% confidence
- Uses `sticky top-0 z-10 bg-background/95 backdrop-blur-sm`

---

## Filter (Minimal)

```
+---------------------------------------------------------------+
|  Showing: All (12)  [v]                                       |
+---------------------------------------------------------------+
```

Single dropdown with options:
- All suggestions
- High confidence (>=85%)
- From notes only  
- From files only

No chips, no multiple dropdowns, no compact/inline modes.

---

## UI States (New Section)

### Loading State (during AI analysis)

```tsx
<div className="space-y-3">
  {[1, 2, 3].map((i) => (
    <div key={i} className="animate-shimmer rounded-lg p-4 bg-muted/50">
      <div className="h-4 w-24 bg-muted rounded" />
      <div className="h-6 w-48 bg-muted rounded mt-2" />
    </div>
  ))}
</div>
```

Uses existing `.animate-shimmer` from globals.css (line 905).

### Empty State (no suggestions)

```tsx
<div className="empty-state-bg text-center py-12">
  <Sparkles className="h-12 w-12 text-muted-foreground/40 mx-auto" />
  <p className="text-muted-foreground mt-4">
    No AI suggestions yet
  </p>
  <p className="text-sm text-muted-foreground/60 mt-1">
    Add notes or upload files to get started
  </p>
</div>
```

Uses existing `.empty-state-bg` from globals.css (line 1914).

### Error State (apply failed)

Show toast with retry option:
```tsx
toast.error("Failed to apply suggestion", {
  action: {
    label: "Retry",
    onClick: () => handleApply(suggestion.id),
  },
});
```

### All Reviewed State (completion)

Keep existing celebration animation when all suggestions processed.

---

## Confirm Replace Dialog

**Keep as-is.** Already well-implemented (`confirm-replace-dialog.tsx`).

Minor improvement: Add `max-h-[60vh] overflow-y-auto` for very long values.

---

## Apply Animation: Scroll + Highlight

Replace flying animation with more reliable approach:

1. **Scroll** to target field (smooth)
2. **Highlight** field with pulse animation
3. **Update** value with subtle fade

```tsx
const handleApply = async () => {
  // 1. Scroll to field (opens section if collapsed)
  await scrollToField(sectionId, fieldId, onOpenSection);
  
  // 2. Apply value (triggers highlight)
  await onApply(suggestion.id);
};
```

**Highlight animation** (use existing globals.css line 1960-1973):
```css
@keyframes field-apply-burst {
  0% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.6); }
  40% { box-shadow: 0 0 0 16px hsl(var(--primary) / 0.2); }
  100% { box-shadow: 0 0 0 24px transparent; }
}
```

---

## File Upload Section

**Keep as-is** (`quick-upload-section.tsx`). Already has:
- Drag & drop
- Progress bar
- Category selector

**One improvement**: After AI analysis completes, show toast:
```
"3 suggestions found from quote.pdf"
```

---

## Component Changes

### Delete Completely
- `batch-action-toolbar.tsx` - Consolidated into summary bar
- `confidence-badge.tsx` - Replace with inline percentage + dot
- `evidence-drawer.tsx` - Filename+page in header is sufficient
- `keyboard-shortcuts-dialog.tsx` - Users don't use shortcuts
- `use-intake-keyboard-shortcuts.ts` - Users don't use shortcuts
- `confirm-batch-replace-dialog.tsx` - No batch selection anymore

### Simplify  
- `suggestion-row.tsx` → `suggestion-card.tsx` (new design, ~100 lines)
- `suggestion-filters.tsx` → Single dropdown (~50 lines)
- `intake-summary-bar.tsx` → Simpler stats + 1 CTA (~60 lines)
- `flying-value-target.tsx` → Just highlight animation, no flying

### Modify
- `conflict-card.tsx` → Same visual pattern as suggestion cards
- `ai-suggestions-section.tsx` → Remove selection/batch logic (~280 lines)

### Keep As-Is
- `intake-notes-section.tsx`
- `quick-upload-section.tsx`
- `confirm-replace-dialog.tsx` (single item confirm)
- `unmapped-notes-section.tsx`
- `focus-field.ts`
- `format-suggestion-value.ts`

---

## Store Cleanup (New Section)

### Remove from `intake-store.ts`

```ts
// State to remove
- selectedSuggestionIds: Set<string>
- lastSelectedId: string | null

// Actions to remove
- toggleSuggestionSelection()
- toggleRangeSelection()
- selectAllVisible()
- clearSelection()

// Selectors to remove
- useIsSuggestionSelected()
- useSelectedCount()
- useSelectedSuggestionIds()
```

### Simplify Filter State

```ts
// Before: 3 separate filters
confidenceFilter: ConfidenceFilter;
sectionFilter: string | null;
sourceFileFilter: string | null;

// After: Single discriminated filter
activeFilter: "all" | "high" | "notes" | "files";
```

### Update `useFilteredPendingSuggestions`

Sort conflicts to top of list:
```ts
const useFilteredPendingSuggestions = () => {
  // ... existing filter logic
  
  // Sort: conflicts first, then by confidence desc
  return filtered.sort((a, b) => {
    const aConflict = isConflicting(a);
    const bConflict = isConflicting(b);
    if (aConflict && !bConflict) return -1;
    if (!aConflict && bConflict) return 1;
    return b.confidence - a.confidence;
  });
};
```

### Estimated Store Reduction
- Before: ~788 lines
- After: ~500 lines
- Reduction: ~288 lines (~37%)

---

## Design Tokens Usage

Leverage existing globals.css tokens:

| Purpose | Token/Class | Location |
|---------|-------------|----------|
| Notes source | `--accent` | line 19 |
| Files source | `--info` | line 27 |
| Conflicts | `--warning` | line 25 |
| Confidence high | `--success` | line 23 |
| Confidence medium | `--warning` | line 25 |
| Confidence low | `--destructive` | line 21 |
| Card base | `.surface-engineering` | line 566 |
| Card hover | `.card-hover` | line 690 |
| Transitions | `.transition-base` | line 536 |
| Loading shimmer | `.animate-shimmer` | line 905 |
| Empty state | `.empty-state-bg` | line 1914 |
| Touch targets | `.touch-target` | line 1948 |
| Apply burst | `.animate-apply-burst` | line 1975 |

---

## Code Reduction Summary

| Component | Before | After | Reduction |
|-----------|--------|-------|-----------|
| `suggestion-row.tsx` | 320 | DELETE | -320 |
| `suggestion-card.tsx` | 135 | 100 | -35 |
| `suggestion-filters.tsx` | 351 | 50 | -301 |
| `batch-action-toolbar.tsx` | 103 | DELETE | -103 |
| `intake-summary-bar.tsx` | 128 | 60 | -68 |
| `ai-suggestions-section.tsx` | 407 | 280 | -127 |
| `intake-store.ts` | 788 | 500 | -288 |
| `confidence-badge.tsx` | 40 | DELETE | -40 |
| `evidence-drawer.tsx` | 67 | DELETE | -67 |
| `keyboard-shortcuts-dialog.tsx` | ~80 | DELETE | -80 |
| `use-intake-keyboard-shortcuts.ts` | ~60 | DELETE | -60 |
| `confirm-batch-replace-dialog.tsx` | ~100 | DELETE | -100 |
| **TOTAL** | ~2,579 | ~990 | **~1,589 (-62%)** |

---

## Layout

```
+---------------------------------------------------------------+
|  Intake Notes Section                                         |
+---------------------------------------------------------------+
|  Quick Upload Section                                         |
+---------------------------------------------------------------+
|  AI Suggestions                                               |
|  +-----------------------------------------------------------+|
|  | Summary Bar (sticky)                                      ||
|  | 12 suggestions - 8 high-conf      [Apply All High-Conf]   ||
|  +-----------------------------------------------------------+|
|  | Filter: All (12) v                                        ||
|  +-----------------------------------------------------------+|
|  |                                                           ||
|  | [Conflict Card - sorted to top]                           ||
|  | [Conflict Card]                                           ||
|  |                                                           ||
|  | [Suggestion Card 1]                                       ||
|  | [Suggestion Card 2]                                       ||
|  | [Suggestion Card 3]                                       ||
|  | ...                                                       ||
|  +-----------------------------------------------------------+|
+---------------------------------------------------------------+
|  Unmapped Notes Section (collapsible)                         |
+---------------------------------------------------------------+
```

---

## Implementation Phases

### Phase 1: Store Cleanup (1 day)
- [ ] Remove selection state from `intake-store.ts`
- [ ] Simplify filter state to single enum
- [ ] Update `useFilteredPendingSuggestions` to sort conflicts first
- [ ] Remove selection-related hooks and selectors

### Phase 2: Component Deletion (0.5 day)
- [ ] Delete `batch-action-toolbar.tsx`
- [ ] Delete `confidence-badge.tsx`
- [ ] Delete `evidence-drawer.tsx`
- [ ] Delete `keyboard-shortcuts-dialog.tsx`
- [ ] Delete `use-intake-keyboard-shortcuts.ts`
- [ ] Delete `confirm-batch-replace-dialog.tsx`
- [ ] Delete `suggestion-row.tsx` (after card is ready)

### Phase 3: Card Redesign (2 days)
- [ ] Create new `suggestion-card.tsx` with simplified design
- [ ] Add source differentiation (icon + accent/info colors)
- [ ] Implement confidence display (% + colored dot)
- [ ] Implement expandable long text ("Show more")
- [ ] Remove checkbox, simplify actions to Skip/Apply only

### Phase 4: Conflicts & Summary (1 day)
- [ ] Refactor `conflict-card.tsx` to match suggestion card style
- [ ] Conflicts rendered inline (sorted to top by store)
- [ ] Simplify `intake-summary-bar.tsx` (stats + single CTA)

### Phase 5: Filters & Section (1 day)
- [ ] Rewrite `suggestion-filters.tsx` as single dropdown (~50 lines)
- [ ] Update `ai-suggestions-section.tsx` (remove batch/selection logic)
- [ ] Add loading/empty/error states

### Phase 6: Animation & Polish (0.5 day)
- [ ] Replace flying animation with scroll + highlight
- [ ] Add feedback toast after file analysis
- [ ] Test on mobile
- [ ] Verify dark mode

**Total: ~6 days**

---

## Accessibility

- Touch targets: min 44x44px (use `.touch-target` class)
- Color + icon for source differentiation (never color alone)
- `aria-live="polite"` for suggestion count updates
- `role="status"` for screen reader announcements
- `prefers-reduced-motion` respected (existing in globals.css)
- Focus visible states (existing `--focus-ring` token)
- Radio group in conflicts: `aria-label="Choose value for {fieldName}"`

---

## Mobile Considerations

- Cards stack vertically (already responsive)
- Actions always visible (no hover-reveal)
- Expandable text works with tap
- Summary bar stays sticky
- Filter dropdown touch-friendly
- Use existing `@media (hover: none)` rule (globals.css line 1987)

---

## Decisions Made

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Long text | Expandable inline | No modal needed |
| Confirm replace | Keep existing modal | Already works well |
| Flying animation | Replace with scroll+highlight | More reliable |
| File upload | Keep simple + toast | Sufficient feedback |
| Grouping | Not needed | 8-20 suggestions is manageable |
| Batch actions | Single CTA only | Reduce complexity |
| Keyboard shortcuts | Remove completely | Users won't use them |
| EvidenceDrawer | Remove | Filename+page in header sufficient |
| Notes color | `--accent` not `--success` | Avoid "verified" confusion |
| Selection/checkboxes | Remove | Simplifies everything |

---

## Success Metrics

- User understands suggestion in <3 seconds
- Source (Notes/Files) identifiable at glance
- Zero confusion about what field will be updated
- Reduced cognitive load (fewer elements per card)
- Works equally well on desktop and mobile
- ~62% code reduction (~1,589 lines removed)
