# Frontend Improvements Plan

## Executive Summary

Comprehensive analysis identified **23 improvement opportunities** across 3 categories:
- Code Quality (React best practices, state management)
- UI/UX (consistency, accessibility, user experience)
- Performance (data fetching, rendering, bundle optimization)

---

## 1. HIGH PRIORITY (Immediate Impact)

### 1.1 🔴 Parallelize Data Fetching in Proposal Page
**File:** `app/project/[id]/proposals/[proposalId]/page.tsx:89-175`
**Problem:** Project + proposal fetched sequentially (waterfall)
**Fix:** Use `Promise.all()` like admin pages do
```typescript
useEffect(() => {
  void Promise.all([loadProjectData(), loadProposalData()]);
}, [loadProjectData, loadProposalData]);
```
**Impact:** ~50% faster proposal page load

---

### 1.2 🔴 Optimize Store Selectors (Prevent Re-renders)

#### IntakePanelContent - 9 separate selectors → 1
**File:** `components/features/projects/intake-panel/intake-panel-content.tsx:33-52`
```typescript
// ❌ Current: 9 separate subscriptions
const unmappedNotes = useIntakePanelStore((state) => state.unmappedNotes);
const isLoadingSuggestions = useIntakePanelStore(...);
// ... 7 more

// ✅ Fix: Single subscription with useShallow
const {
  unmappedNotes,
  isLoadingSuggestions,
  isProcessingDocuments,
  processingDocumentsCount,
} = useIntakePanelStore(
  useShallow((state) => ({
    unmappedNotes: state.unmappedNotes,
    isLoadingSuggestions: state.isLoadingSuggestions,
    isProcessingDocuments: state.isProcessingDocuments,
    processingDocumentsCount: state.processingDocumentsCount,
  }))
);

// Actions stay separate (stable references)
const applySuggestion = useIntakePanelStore((s) => s.applySuggestion);
```

#### TechnicalDataSheet - 6 separate selectors → 1
**File:** `components/features/projects/technical-data-sheet.tsx:74-79`
Same pattern - combine `loading`, `saving`, `lastSaved`, `error`, `syncError`

---

### 1.3 🔴 Add Component Memoization
4 components that should be wrapped with `memo()`:

| Component | File | Reason |
|-----------|------|--------|
| `FlexibleDataCapture` | `data-capture/flexible-data-capture.tsx` | Receives static props |
| `IntakePanelContent` | `intake-panel/intake-panel-content.tsx` | Multiple store selectors |
| `ProposalPage` | `proposals/proposal-page.tsx` | Props include large objects |
| `ProjectTabs` | `projects/project-tabs.tsx` | Receives `project` prop |

```typescript
// Example fix
export const FlexibleDataCapture = memo(function FlexibleDataCapture({
  sections,
  onFieldChange,
  ...
}: Props) {
  // component body
});
```

---

### 1.4 🔴 Add Error Boundaries
**Missing in:**
- `intake-panel/intake-panel-content.tsx` - Multiple data sources
- `data-capture/flexible-data-capture.tsx` - Dynamic sections
- `proposals/proposal-page.tsx` - PDF generation

**Reuse:** `SectionErrorBoundary` from `proposals/overview/`

---

## 2. MEDIUM PRIORITY (UI/UX & Consistency)

### 2.1 🟡 Accessibility Quick Fixes

| Issue | Files | Fix |
|-------|-------|-----|
| Missing `aria-label` on icon buttons | `project-card.tsx`, `navbar.tsx` | Add descriptive labels |
| Form fields missing `aria-invalid` | `auth-form-field.tsx:99-107` | Add `aria-invalid={!!error}` |
| No `aria-describedby` linking errors | `auth-form-field.tsx` | Connect field to error msg |
| Badge counts not announced | `notification-dropdown.tsx:50-52` | Add `aria-label` with count |

### 2.2 🟡 Standardize Border Radius
**Issue:** Button uses `rounded-md`, Cards use `rounded-xl`
**Fix:** Create design tokens in `tailwind.config.ts`:
```typescript
borderRadius: {
  DEFAULT: 'var(--radius)',
  'component': 'var(--radius-component)', // For buttons, inputs
  'container': 'var(--radius-container)', // For cards, dialogs
}
```

### 2.3 🟡 Add Tooltips to Disabled Buttons
**File:** `intelligent-proposal-generator.tsx:261-267`
**Issue:** Disabled button with no explanation
**Fix:** Wrap with `Tooltip` explaining why disabled

### 2.4 🟡 Missing Loading States
| Location | Issue |
|----------|-------|
| `notification-dropdown.tsx:30-38` | Dropdown shows empty while loading |
| `proposal-page.tsx` | No skeleton during project fetch |

---

## 3. LOW PRIORITY (Performance Optimization)

### 3.1 🟢 Virtualize Engineering Data Table
**File:** `engineering-data-table.tsx:451-470`
**Issue:** Renders all rows without virtualization
**Fix:** Add `@tanstack/react-virtual` for large datasets (100+ fields)

### 3.2 🟢 Memoize parsePhotoInsights
**File:** `proposal-overview.tsx:149-154`
```typescript
const resourceInsights = useMemo(
  () => parsePhotoInsights(proposal.aiMetadata.transparency.clientMetadata),
  [proposal.aiMetadata.transparency.clientMetadata]
);
```

### 3.3 🟢 Replace Fetch+Update with PATCH
**File:** `lib/api/project-data.ts:129-143`
**Issue:** `deleteQualityParameter()` fetches all data before update
**Fix:** Backend PATCH endpoint for delta updates

---

## 4. IMPLEMENTATION ORDER

| Phase | Tasks | Effort |
|-------|-------|--------|
| **Phase 1** | 1.1 Parallelize fetching, 1.2 Optimize selectors | 2h |
| **Phase 2** | 1.3 Add memo(), 1.4 Error boundaries | 1.5h |
| **Phase 3** | 2.1 Accessibility fixes, 2.3 Tooltips | 1h |
| **Phase 4** | 2.2 Design tokens, 2.4 Loading states | 1h |
| **Phase 5** | 3.1-3.3 Performance (optional) | 3h |

**Total estimated:** ~5.5h (excluding optional Phase 5)

---

## 5. Verification

1. `bun run check:ci` - must pass
2. Lighthouse accessibility audit > 90
3. React DevTools Profiler - verify reduced re-renders
4. Test proposal page load time improvement
5. Manual test: intake panel, technical data, proposals

---

## Questions

None - plan ready for review.
