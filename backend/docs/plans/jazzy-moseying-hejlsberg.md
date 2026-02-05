# Feedback Admin UX Improvements (Phase 1)

Scope: high-impact, low-complexity UX fixes. No backend changes.

## Files
- `frontend/app/admin/feedback/page.tsx` — all UI changes
- `frontend/lib/api/feedback.ts` — fix `incorrect_response` badge variant

## Changes

### 1. Summary stats cards (3)

Add `AdminStatsCard` row between header and search — same pattern as organizations page.

```
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
  Total (MessageSquare, default) | Open (AlertCircle, warning) | Resolved (CheckCircle, success)
</div>
```

Stats derived from `feedback` array via `useMemo`:
```ts
const stats = useMemo(() => {
  const open = feedback.filter(f => !f.resolvedAt).length;
  return { total: feedback.length, open, resolved: feedback.length - open };
}, [feedback]);
```

Imports: `AdminStatsCard` from `@/components/features/admin`, icons `MessageSquare`, `AlertCircle`, `CheckCircle2`.

### 2. Tooltips on action buttons

Wrap each action button (resolve/reopen, delete) in `Tooltip` + `TooltipTrigger` + `TooltipContent`.

Labels:
- Resolve button: `"Mark as resolved"` / `"Reopen"`
- Delete button: `"Delete feedback"`

Wrap full page in `<TooltipProvider delayDuration={200}>` — matches users page.

Imports: `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` from `@/components/ui/tooltip`.

### 3. Fix status badge colors

Current: Open = `outline` + custom amber classes, Resolved = `secondary`.
New: Open = `warning`, Resolved = `success`.

Before:
```tsx
<Badge variant={isResolved ? "secondary" : "outline"}
  className={cn(!isResolved && "border-amber-500/50 text-amber-600")}>
```

After:
```tsx
<Badge variant={isResolved ? "success" : "warning"}>
```

Removes manual amber className hack — uses design system properly.

### 4. Fix `incorrect_response` badge variant

In `frontend/lib/api/feedback.ts`, `FEEDBACK_TYPE_CONFIG`:
```
incorrect_response: variant "secondary" → "warning"
```

AI accuracy issues deserve urgency color, not gray.

### 5. Result count + clear filters

Below filter row in `CardHeader`, add:
```tsx
<div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
  <span>Showing {filteredFeedback.length} of {feedback.length}</span>
  {hasActiveFilters && (
    <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>
  )}
</div>
```

Computed:
```ts
const hasActiveFilters = daysFilter !== "all" || statusFilter !== "all" || typeFilter !== "all" || searchQuery.trim() !== "";

const clearFilters = useCallback(() => {
  setDaysFilter("all");
  setStatusFilter("all");
  setTypeFilter("all");
  setSearchQuery("");
}, []);
```

Only shows "Clear filters" when at least one filter/search is active.

### 6. Rich empty state

Replace plain text empty states with `EmptyState` component.

- No feedback at all: icon=`MessageSquare`, title="No feedback yet", description="Feedback submitted by users will appear here.", action=Refresh
- Search no match: icon=`Search`, title="No matches", description="Try a different search term or clear your filters.", action=Clear filters

Import `EmptyState` from `@/components/ui/empty-state`.

## What stays the same
- Table structure, expand/collapse, attachment display
- Delete confirmation dialog
- Search input position and behavior
- Filter dropdowns
- All backend code (attachment_count changes from previous plan remain)

## Verification
```bash
cd frontend && bun run check:ci
```
Manual: open page, verify stats update on resolve/reopen, tooltips appear on hover, badge colors correct, result count updates on filter/search, clear filters resets all.
