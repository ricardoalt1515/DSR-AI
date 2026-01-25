# UX/UI Redesign: Files Tab & Intake Panel

## Problem Statement

1. **Files Tab** feels heavy/image-focused; shows AI content that belongs in Intake Panel
2. **Intake Panel** lacks bulk actions; 50 suggestions = 50+ clicks; unmapped notes capped at 10

## Design Philosophy

**"AI proposes, human confirms"** - minimize user micromanagement while preserving control.

---

## Part 1: Files Tab Simplification

### Goal
Clean file repository: browse, preview, download. NO AI suggestions/mapping.

### Current Issues (from `file-row-collapsed.tsx`)
- Color-coded category badges (lab=blue, sds=amber, photo=violet)
- 12x12 thumbnails inline in collapsed view
- `AISummaryPreview` shows AI content
- Animated processing states (`motion-safe:animate-pulse`, animated borders)
- Expanded view shows `KeyFactsSection`, `UnmappedNotesSection`

### Changes

**Remove from collapsed row:**
- `FileCategoryBadge` → simple monochrome file-type icon
- `AISummaryPreview` → remove entirely
- Photo thumbnails → remove from list (show in preview only)
- Animated borders/pulses → simple "Processing..." text
- Confidence percentage → remove

**Remove from expanded view:**
- `KeyFactsSection` → belongs in Intake Panel
- `UnmappedNotesSection` → belongs in Intake Panel
- AI summary → remove (or move to quick peek Sheet)

**Keep:**
- Filename, file size, upload date
- Simple processing status text
- Download/View/Delete actions
- Expand for file preview (PDF/image viewer, NOT AI content)

### New File Row Wireframe
```
+------------------------------------------------------------------+
| [PDF icon]  water-analysis-report.pdf                    [...]   |
|             142 KB  |  Jan 24, 2026  |  Processing...            |
+------------------------------------------------------------------+
```

### Components to Simplify

| Current | Action |
|---------|--------|
| `file-row-collapsed.tsx` | Merge into single `file-row.tsx`, remove AI preview |
| `file-row-expanded.tsx` | Remove AI sections, keep preview/actions only |
| `file-category-badge.tsx` | Replace with `file-type-icon.tsx` (monochrome) |
| `ai-summary-preview.tsx` | Delete |
| `key-facts-section.tsx` | Delete |
| `unmapped-notes-section.tsx` | Delete (keep Intake Panel version) |

---

## Part 2: Intake Panel Enhancements

### Goal
Efficient batch triage. Power users process 50+ suggestions in seconds.

### Current Issues (from `suggestion-card.tsx`, `intake-store.ts`)
- Individual Apply/Reject per card
- No selection state in store
- No batch action methods
- Unmapped notes limit=10, no pagination
- Conflicts resolved one-by-one

### New Features

#### 2.1 Summary Bar
Show at-a-glance stats with primary CTA:
```
+------------------------------------------------------------------+
| AI Suggestions                                 [Apply all (32)]  |
| 47 pending | 32 high-conf | 12 medium | 3 conflicts             |
+------------------------------------------------------------------+
```

#### 2.2 Filters
```tsx
<Select>Confidence: All | High | Medium | Low</Select>
<Select>Section: All | Site Info | Waste Stream | ...</Select>
<Select>Source: All | lab-report.pdf | ...</Select>
```

#### 2.3 Multi-Select & Batch Actions
```
+------------------------------------------------------------------+
| [x] 12 selected                    [Apply (12)]  [Reject (12)]   |
+------------------------------------------------------------------+
| [ ] | pH Level           | 7.2      | 92%  | lab-report.pdf     |
| [x] | Total Dissolved... | 450 mg/L | 89%  | lab-report.pdf     |
| [x] | Temperature        | 25 C     | 76%  | site-photo.jpg     |
+------------------------------------------------------------------+
```

**Interactions:**
- Checkbox per suggestion row
- Shift+click for range selection
- Batch Apply/Reject buttons appear when selection > 0

#### 2.4 Smart Actions
| Action | One Click |
|--------|-----------|
| Apply all high-confidence | Apply all ≥85% |
| Auto-resolve conflicts | Pick highest confidence |
| Dismiss low-conf notes | Dismiss all <70% unmapped |

#### 2.5 Keyboard Shortcuts
- `a` = apply selected
- `r` = reject selected
- `Escape` = clear selection
- `Ctrl+a` = select all visible

#### 2.6 Unmapped Notes Pagination
Backend: `GET /intake/unmapped-notes?cursor=X&limit=20`
Frontend: "Load more" button or infinite scroll

### Store Additions (`intake-store.ts`)
```typescript
// Selection state
selectedSuggestionIds: Set<string>;
toggleSuggestionSelection: (id: string) => void;
selectAllVisible: () => void;
clearSelection: () => void;

// Batch actions
applySelectedSuggestions: () => Promise<void>;
rejectSelectedSuggestions: () => Promise<void>;
applyHighConfidenceSuggestions: () => Promise<void>;
```

### New Components

| Component | Purpose |
|-----------|---------|
| `intake-summary-bar.tsx` | Stats + primary CTA |
| `suggestion-filters.tsx` | Confidence/section/source dropdowns |
| `suggestion-row.tsx` | Compact row with checkbox (replaces card) |
| `batch-action-toolbar.tsx` | Floating bar when items selected |
| `batch-conflict-resolver.tsx` | "Auto-resolve all conflicts" |

---

## Part 3: Agentic UI Patterns

### Trust Indicators
- Confidence as colored number: High=green, Medium=amber, Low=gray
- Source file always visible
- Undo toast after batch operations

### Visual Hierarchy (top to bottom)
1. Summary stats (most prominent)
2. Primary CTA: "Apply all high-confidence"
3. Filters (secondary)
4. Suggestion list (scrollable)
5. Evidence (on-demand popover)

### Progressive Disclosure
- Level 1: Summary bar + batch actions
- Level 2: Suggestion list (expand)
- Level 3: Evidence (hover/click row → popover)

---

## Implementation Phases

### Phase 1: Files Simplification (Frontend only)
1. Create `file-type-icon.tsx`
2. Simplify `file-row-collapsed.tsx` → remove AI preview, badges, animations
3. Remove `key-facts-section.tsx`, `unmapped-notes-section.tsx` from expanded
4. Update file list filtering (remove AI-related options)

### Phase 2: Intake Selection State
1. Add selection state to `intake-store.ts`
2. Create `suggestion-row.tsx` with checkbox
3. Create `batch-action-toolbar.tsx`

### Phase 3: Batch Operations
1. Backend: `POST /intake/suggestions/batch` endpoint
2. Frontend: Implement batch apply/reject
3. Add undo toast

### Phase 4: Summary & Filters
1. Create `intake-summary-bar.tsx`
2. Create `suggestion-filters.tsx`
3. Add `applyHighConfidenceSuggestions` action

### Phase 5: Scale & Polish
1. Backend: Cursor pagination for unmapped notes
2. Frontend: Keyboard shortcuts
3. "Auto-resolve conflicts" feature

---

## Critical Files

**Files Tab:**
- `frontend/components/features/projects/files-tab-enhanced/file-row-collapsed.tsx`
- `frontend/components/features/projects/files-tab-enhanced/file-row-expanded.tsx`
- `frontend/components/features/projects/files-tab-enhanced/file-category-badge.tsx`

**Intake Panel:**
- `frontend/lib/stores/intake-store.ts`
- `frontend/components/features/projects/intake-panel/suggestion-card.tsx`
- `frontend/components/features/projects/intake-panel/intake-panel-content.tsx`
- `frontend/lib/api/intake.ts`

**Backend (if batch endpoints needed):**
- `backend/app/api/v1/intake.py`
- `backend/app/services/intake_service.py`

---

## Verification

1. **Files Tab:** Upload files, verify no AI content visible in list or expanded view
2. **Intake Panel:** Generate 20+ suggestions, verify batch select/apply works
3. **Performance:** Test with 100+ suggestions, ensure no lag
4. **Accessibility:** Keyboard navigation works, focus management correct

---

## Decisions Made

1. **File Preview:** Keep lightweight Preview Sheet (slide-out panel) for in-context viewing
2. **Batch API:** Create new backend batch endpoints (atomic, faster, proper error handling)
3. **Approach:** Incremental enhancement (add features to existing components, lower risk)
4. **Priority:** Both Files Tab and Intake Panel in parallel

## Open Items

1. **Undo duration:** How long to keep undo history? (suggest: local only, 30 seconds)
2. **Virtualization:** Use `@tanstack/react-virtual` for large lists?
3. **Mobile:** Touch-friendly batch selection patterns (long-press to select?)
