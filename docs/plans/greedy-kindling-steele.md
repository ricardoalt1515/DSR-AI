# Files UI Redesign: Document-Centric with AI Insights

## Problem
Current Files UI too image-centric. Shows generic cards with badges but no document insights (SDS, lab reports). Need: category differentiation, AI value visibility, quick preview.

## Design Direction: Industrial Precision
**Aesthetic**: Utilitarian/data-forward with subtle refinement. Think: Bloomberg Terminal meets Linear. High information density, purposeful hierarchy, zero decorative fluff. Professional internal tool that feels fast and trustworthy.

## Solution: Expandable List Pattern

**Why list over cards:**
- Audit trail demands chronological scanning
- Higher info density per file
- Professional internal tool aesthetic
- Multi-file comparison (expand multiple)

### Visual Hierarchy (Collapsed)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAB  [◈] Lab-Report-Mercury-2026.pdf                         [AI ✓] [▼]   │
│      ┊  "Elevated mercury levels detected at 0.42 ppm..."                   │
│      ┊  12.4 MB · Jan 23, 2026 · 3 mapped · 92% conf                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Expanded View
```
┌───────────────────────────────────────────────────────────────────────────┐
│ ▲ Collapse                                                                 │
├───────────────────────────────────────────────────────────────────────────┤
│ AI SUMMARY                                                                │
│ Laboratory analysis reveals elevated mercury contamination at 0.42 ppm,   │
│ exceeding EPA threshold by 2.1x. Recommend immediate remediation...       │
├───────────────────────────────────────────────────────────────────────────┤
│ MAPPED SUGGESTIONS                                        Avg: 92% conf   │
│ ┌─────────────────────┐ ┌─────────────────────┐                           │
│ │ Mercury Level       │ │ Contamination Type  │                           │
│ │ 0.42 ppm    [Apply] │ │ Heavy Metal [Apply] │                           │
│ └─────────────────────┘ └─────────────────────┘                           │
├───────────────────────────────────────────────────────────────────────────┤
│ KEY FACTS                                                                 │
│ • Sample collected: Site B, depth 2m                                      │
│ • Testing method: EPA 7471B                                               │
├───────────────────────────────────────────────────────────────────────────┤
│ ▸ 2 unmapped notes                                                        │
├───────────────────────────────────────────────────────────────────────────┤
│ [Download]  [View Original]  [Delete]                                     │
└───────────────────────────────────────────────────────────────────────────┘
```

## Category Badges (Distinctive Design)

**Visual Treatment**: Uppercase, tight tracking, subtle left border accent
```tsx
// NOT generic rounded pills - use sharp, industrial badges
<span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold
  tracking-widest uppercase border-l-2 bg-opacity-10">
```

| Category | Colors | Icon |
|----------|--------|------|
| **LAB** | `border-l-blue-500 bg-blue-500/10 text-blue-600` | Beaker (◈) |
| **SDS** | `border-l-amber-500 bg-amber-500/10 text-amber-600` | Shield (⚠) |
| **PHOTO** | `border-l-violet-500 bg-violet-500/10 text-violet-600` | Image (◻) |
| **GENERAL** | `border-l-slate-400 bg-slate-500/10 text-slate-500` | File (◇) |

**Dark mode**: Invert to darker backgrounds with lighter text (auto via Tailwind dark:)

## Fields Per File Type

### All Files (Base)
- Category badge, filename, size, timestamp, processing status

### Documents (PDF/DOCX) Additional
- AI summary (1-line collapsed, full expanded)
- Suggestions count + confidence
- Key facts preview (first 2)

### Images (JPG/PNG) Additional
- 48x48 thumbnail
- Visual insights summary

## Component Structure

### New Components
```
frontend/components/features/projects/files-tab-enhanced/
├── file-list.tsx
├── file-list-item.tsx
├── file-row-collapsed.tsx
├── file-row-expanded.tsx
├── file-category-badge.tsx
├── ai-insights-panel.tsx
├── ai-summary-preview.tsx
├── suggestions-section.tsx
├── key-facts-section.tsx
├── unmapped-notes-section.tsx
├── file-actions-bar.tsx
└── types.ts
```

### Reused from Intake Panel
- `suggestion-card.tsx`
- `evidence-drawer.tsx`
- Confidence badge utilities from `intake.ts`

## Key Interactions

### States & Transitions
| State | Visual Treatment | Animation |
|-------|------------------|-----------|
| **Default** | Subtle border, muted summary | — |
| **Hover** | Elevated shadow, actions visible | `transition-shadow 150ms` |
| **Focused** | Ring outline (focus-visible only) | — |
| **Expanded** | Full height reveal, dividers | `height auto, opacity 300ms` |
| **Processing** | Pulsing border, spinner badge | `animate-pulse on border` |
| **Failed** | Red left border, retry button | — |

### Interaction Flow
1. **Collapsed**: Category badge → filename → 1-line summary → status badges
2. **Hover**: Reveal Download/View actions (opacity transition)
3. **Click expand**:
   - Smooth height animation (300ms ease-out)
   - Staggered reveal for sections (50ms delay each)
   - Focus moves to first interactive element
4. **Click collapse**:
   - Reverse animation
   - Focus returns to toggle button
5. **Apply suggestion**: Same pattern as intake panel (optimistic UI)

### URL State Sync (Deep Linking)
```tsx
// Sync expanded files to URL for sharing
?expanded=file-123,file-456
// Sync filters
?category=lab&status=completed&sort=date
```

## State Management
```ts
interface FileListState {
  expandedFileIds: Set<string>
  sortBy: 'date' | 'name' | 'ai-confidence'
  filterStatus: 'all' | 'processing' | 'completed' | 'failed'
  filterCategory: 'all' | 'lab' | 'sds' | 'photo' | 'general'
  searchTerm: string
}
```

## Performance

### Virtualization (>50 files)
```tsx
// Use @tanstack/react-virtual for windowed rendering
import { useVirtualizer } from '@tanstack/react-virtual'
// Maintain only ~15 DOM nodes at a time
// Handle variable row heights (collapsed vs expanded)
```

### Lazy Loading
- Full AI analysis: Fetch on expand, cache in state
- Thumbnails: Next.js `<Image>` with `loading="lazy"` + blur placeholder
- Suggestions: Load on expand, not in list query

### Animation Performance
```tsx
// Only animate transform and opacity (GPU-accelerated)
// Explicit transition properties (never `transition: all`)
className="transition-[height,opacity] duration-300"
```

### Avoid Layout Thrash
- No layout reads in render (getBoundingClientRect, offsetHeight)
- Use CSS `contain: layout` on file rows for paint optimization

## Accessibility (WCAG 2.1 AA + Vercel Guidelines)

### Semantic HTML
- Use `<button>` for expand toggle (NOT div onClick)
- Use `<article>` for each file row with `aria-labelledby`
- Icon-only buttons need `aria-label` (e.g., "Expand file details")

### Focus Management
```tsx
// Visible focus ring on keyboard navigation
className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
// Maintain focus on toggle button after collapse
// Focus first interactive element in expanded panel on expand
```

### Keyboard Navigation
- **Tab**: Navigate between file rows
- **Enter/Space**: Toggle expand/collapse
- **Escape**: Collapse current expanded row
- **Arrow Up/Down**: Navigate list (roving tabindex pattern)

### ARIA Attributes
```tsx
<article aria-labelledby={`file-${id}-name`}>
  <button
    aria-expanded={isExpanded}
    aria-controls={`file-${id}-content`}
    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${filename}`}
  />
  <div id={`file-${id}-content`} role="region" hidden={!isExpanded} />
</article>
```

### Dynamic Content
- Processing status changes: `aria-live="polite"` on status badge container
- Error messages: `aria-live="assertive"` for failed processing alerts
- Loading states: Text ends with "…" ("Processing…")

### Motion
```tsx
// Honor reduced motion preference
className="motion-safe:transition-all motion-safe:duration-300"
// Or in CSS: @media (prefers-reduced-motion: reduce) { transition: none }
```

### Text Handling
- Filename truncation: `truncate` with full name in `title` attribute
- Long AI summaries: `line-clamp-2` in collapsed, full in expanded
- Flex children: Add `min-w-0` to allow text truncation

## Files to Modify
- `frontend/components/features/projects/files-tab-enhanced.tsx` → refactor to use new components
- Export suggestion-card, evidence-drawer for reuse

## Future Enhancements
- **Phase 2**: Bulk actions, advanced filtering, AI feedback
- **Phase 3**: AI chat interface, smart suggestions, timeline integration

## Verification
1. Run `cd frontend && bun run check:ci` after implementation
2. Manual test: upload PDF → verify category badge, AI summary preview
3. Expand file → verify suggestions grid, key facts render
4. Test keyboard navigation (Tab, Enter, Escape)
5. Test with 50+ files for performance

## Loading & Error States

### Processing State
```tsx
<div className="border-l-2 border-primary animate-pulse bg-primary/5 p-3">
  <div className="flex items-center gap-2 text-xs text-muted-foreground">
    <Loader2 className="h-3.5 w-3.5 animate-spin" />
    <span aria-live="polite">Processing…</span>
  </div>
  <Progress value={progress} className="mt-2 h-1" />
</div>
```

### Failed State (Actionable)
```tsx
<div className="border-l-2 border-destructive bg-destructive/5 p-3">
  <div className="flex items-center justify-between">
    <span className="text-xs text-destructive flex items-center gap-1.5">
      <AlertCircle className="h-3.5 w-3.5" />
      Processing failed
    </span>
    <Button size="sm" variant="outline" onClick={retry}>
      Retry
    </Button>
  </div>
</div>
```

### Skeleton State
```tsx
// 3 skeleton rows on initial load
<div className="space-y-2">
  {[1,2,3].map(i => (
    <div key={i} className="flex items-center gap-3 p-4 border rounded-lg">
      <Skeleton className="h-10 w-16" /> {/* badge */}
      <Skeleton className="h-5 w-1/3" /> {/* filename */}
      <Skeleton className="h-4 w-2/3" /> {/* summary */}
    </div>
  ))}
</div>
```

### Empty State
```tsx
<div className="text-center py-16">
  <Upload className="h-12 w-12 mx-auto text-muted-foreground/50" />
  <h3 className="mt-4 font-medium">No files yet</h3>
  <p className="text-muted-foreground text-sm">
    Upload lab reports, SDS sheets, or photos to begin
  </p>
</div>
```

## Delete Confirmation (Required)
```tsx
// Destructive actions need confirmation (Vercel Guidelines)
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="ghost" size="sm">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete {filename}?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. AI analysis will be permanently removed.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete} className="bg-destructive">
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## Responsive Behavior

| Breakpoint | Layout Changes |
|------------|----------------|
| **< 640px** | Stack metadata vertically, hide secondary badges, single-col suggestions |
| **640-1024px** | Full inline metadata, all badges, single-col suggestions |
| **> 1024px** | Full layout, 2-col suggestions grid in expanded |

```tsx
// Responsive grid for suggestions
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
```

## Confirmed Decisions
- **Default sort**: Date descending (most recent first)
- **File deletion**: Confirm dialog before delete (AlertDialog)
- **Failed processing**: Manual retry button
- **Multi-expand**: Unlimited (users can expand as many as needed)
- **URL sync**: Expanded files + filters synced to query params
