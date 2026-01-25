# Files UI Redesign: Document-Centric with AI Insights

## Executive Summary

Transform Files tab from image-centric file cards into document-focused list view surfacing AI analysis, processing status, and file categorization. Professional internal tool aesthetic prioritizing scannability and quick insight access.

---

## 1. UI/UX PROPOSAL

### Visual Hierarchy & Layout

**List View Pattern (Recommended)** - Optimized for rapid scanning, information density, and professional audit trail use case.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Icon] [Category Badge] Filename.pdf                    [AI Badge] [↓]  │
│        Summary: "Lab analysis showing elevated mercury levels..."        │
│        12.4 MB • Uploaded Jan 23, 2026 3:42 PM                          │
│        • 3 suggestions mapped • 2 key facts • Processing: Complete      │
└─────────────────────────────────────────────────────────────────────────┘
```

**Design Rationale:**
- **List over cards**: Audit trail context demands chronological scanning + metadata comparison
- **Expandable rows**: Preserve compact view while allowing drill-down into AI insights
- **Left-to-right hierarchy**: Document type → Status → Insights → Actions
- **Inline summary preview**: Surface AI value immediately without interaction

---

## 2. PATTERN RECOMMENDATION

### Expandable List with Inline Insights

**Why this pattern:**
- **Scannable at scale**: Users can process 20+ files visually in 2 seconds
- **Progressive disclosure**: Summary visible by default, full AI output on expand
- **Consistent with intake panel**: Mirrors suggestion card + evidence drawer pattern
- **Responsive friendly**: Collapses gracefully to mobile (stack vertically)

**User Flow:**
1. **Collapsed state (default)**: Shows category, filename, AI summary (1 line), status badges
2. **Hover state**: Elevate card, show actions (Download, View Details)
3. **Expanded state**: Full AI insights (suggestions mapped, key facts, unmapped notes)

---

## 3. FIELD SPECIFICATION

### Minimal Data Per File Type

#### All Files (Base Fields)
- **Category badge**: Lab | SDS | Photo | General (color-coded)
- **Filename**: Truncate at 60 chars with tooltip
- **File size + Upload timestamp**: Muted secondary text
- **Processing status**: Badge (Processing/Complete/Failed)

#### Documents (PDF/DOCX) - Additional Fields
- **AI Summary**: 1-2 sentence summary from `ai_analysis.summary` (max 120 chars collapsed)
- **Suggestions count**: "3 suggestions mapped" with confidence indicator
- **Key facts preview**: First 2 facts from `ai_analysis.key_facts`

#### Images (JPG/PNG) - Additional Fields
- **Thumbnail preview**: 48x48px rounded thumbnail (left side)
- **Visual insights summary**: Material/condition observations
- **Image metadata**: Dimensions, file format details

#### When Expanded (All File Types with AI)
- **Full summary**: Complete AI analysis summary
- **Mapped suggestions**: List of field_id suggestions with confidence badges
- **Key facts**: All extracted facts as bullet list
- **Unmapped notes**: Count + expandable drawer (like evidence drawer)
- **Actions**: Download, View Full Analysis, Delete

---

## 4. INTERACTION DESIGN

### AI Insights Display Strategy

**Primary Pattern: Inline Expansion**
```tsx
// Default state: Collapsed row
<FileRow>
  <CategoryBadge /> <Filename /> <AISummary />
  <ExpandButton />
</FileRow>

// On click: Expand inline
<FileRow expanded>
  <FileHeader />
  <AIInsightsPanel>
    <SummarySection />
    <SuggestionsGrid /> // Like suggestion cards
    <KeyFactsList />
    <UnmappedNotesDrawer /> // Collapsible like evidence drawer
  </AIInsightsPanel>
</FileRow>
```

**Interaction Flows:**

1. **Quick Preview (No Click)**
   - Hover shows: Download button, timestamp tooltip, full filename
   - AI badge indicates analysis availability

2. **View AI Insights (1 Click)**
   - Row expands to show full AI panel
   - Smooth height animation (300ms ease-out)
   - Focus management for accessibility

3. **Apply Suggestion (From Expanded View)**
   - Same pattern as intake panel suggestion cards
   - Apply/Reject actions with loading states
   - Optimistic UI updates

4. **View Evidence (2 Clicks)**
   - Suggestion cards in expanded view have evidence drawers
   - Collapsible pattern from intake panel

**Why Inline Over Modal/Drawer:**
- Users often compare insights across multiple files
- Maintains context of file list (audit trail)
- Faster interaction (no overlay dismissal)
- Accessible keyboard navigation (Tab through list)

---

## 5. COMPONENT STRUCTURE

### React Component Hierarchy

```tsx
<FilesTabEnhanced>
  <FileUploader />
  <FileFilters>
    <SearchInput />
    <CategorySelect />
    <StatusSelect /> // NEW: Filter by processing status
  </FileFilters>

  <FileList>
    <FileListItem> // Each file
      <FileRowCollapsed>
        <FileCategoryBadge />
        <FileIcon />
        <FileMetadata>
          <FilenameTruncated />
          <AISummaryPreview /> // NEW: 1-line summary
          <FileStats /> // Size, date, counts
        </FileMetadata>
        <FileStatusBadges>
          <ProcessingStatusBadge />
          <AIAvailableBadge />
        </FileStatusBadges>
        <ExpandToggleButton />
      </FileRowCollapsed>

      <Collapsible> // shadcn/ui Collapsible
        <FileRowExpanded>
          <AIInsightsPanel>
            <AISummaryFull />
            <SuggestionsSection>
              <SuggestionCard /> // REUSE from intake-panel
            </SuggestionsSection>
            <KeyFactsSection>
              <KeyFactItem />
            </KeyFactsSection>
            <UnmappedNotesSection>
              <UnmappedNoteDrawer /> // Collapsible
            </UnmappedNotesSection>
          </AIInsightsPanel>
          <FileActionsBar>
            <DownloadButton />
            <ViewFullAnalysisButton />
            <DeleteButton />
          </FileActionsBar>
        </FileRowExpanded>
      </Collapsible>
    </FileListItem>
  </FileList>
</FilesTabEnhanced>
```

### Component Reuse Strategy
- **SuggestionCard**: Direct reuse from `intake-panel/suggestion-card.tsx`
- **EvidenceDrawer**: Direct reuse from `intake-panel/evidence-drawer.tsx`
- **ConfidenceBadge**: Direct reuse from `intake-panel/confidence-badge.tsx`
- **Collapsible**: shadcn/ui `collapsible.tsx`
- **Badge**: shadcn/ui `badge.tsx`

---

## 6. TECHNICAL SPECIFICATIONS

### Spacing & Typography

```tsx
// File Row Collapsed
<div className="p-4 rounded-lg border border-border hover:border-primary/20 transition-all">
  // Icon: 40x40px container with 20x20px icon
  <div className="p-2.5 rounded-lg bg-muted">
    <Icon className="h-5 w-5" />
  </div>

  // Filename: 14px medium
  <p className="text-sm font-medium truncate">

  // AI Summary: 13px regular, muted
  <p className="text-xs text-muted-foreground line-clamp-1">

  // File stats: 12px muted
  <div className="text-xs text-muted-foreground gap-3">
</div>

// File Row Expanded
<div className="px-4 pb-4 space-y-4"> // 16px padding, 16px vertical gaps
  // AI Summary Full: 14px regular
  <p className="text-sm text-foreground">

  // Section Headers: 13px semibold
  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">

  // Key Facts: 13px regular, 8px gap
  <ul className="space-y-2 text-sm">
</div>
```

### Color Tokens (Tailwind/shadcn)

**Category Badges:**
```tsx
const categoryColors = {
  lab: "bg-blue-100 text-blue-700 border-blue-200",
  sds: "bg-amber-100 text-amber-700 border-amber-200",
  photo: "bg-purple-100 text-purple-700 border-purple-200",
  general: "bg-slate-100 text-slate-700 border-slate-200",
}
```

**Processing Status Badges:**
```tsx
const statusColors = {
  queued: "bg-muted text-muted-foreground", // gray
  processing: "border-primary/30 animate-pulse", // blue pulsing
  completed: "bg-success/10 text-success", // green
  failed: "bg-destructive/10 text-destructive", // red
}
```

**AI Insights Panel:**
```tsx
// Background: subtle muted with border
<div className="mt-3 rounded-xl bg-muted/30 border border-border p-4">

// Suggestions grid (2 columns desktop, 1 mobile)
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
```

### Responsive Breakpoints

```tsx
// Mobile (< 640px)
- Single column list
- Stack metadata vertically
- Hide secondary badges, show on expand
- 12px base spacing

// Tablet (640px - 1024px)
- Single column list
- Full metadata inline
- All badges visible
- 16px base spacing

// Desktop (> 1024px)
- Single column list (optimal for scanning)
- 2-column suggestions grid in expanded view
- Full spacing (16px)
```

---

## 7. COMPONENT DETAILS

### FileCategoryBadge Component

**Visual Treatment:**
```tsx
<Badge
  variant="outline"
  className={cn(
    "text-[10px] font-semibold uppercase tracking-wide",
    "px-2 py-0.5 rounded-md",
    categoryColors[category]
  )}
>
  {category}
</Badge>
```

**Position:** Left-most element, before file icon

### AISummaryPreview Component

**Collapsed State:**
```tsx
<p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
  {aiAnalysis.summary}
</p>
```

**Expanded State:**
```tsx
<div className="space-y-1">
  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
    AI Summary
  </h4>
  <p className="text-sm text-foreground leading-relaxed">
    {aiAnalysis.summary}
  </p>
</div>
```

### SuggestionsSection Component

**Grid Layout (Expanded):**
```tsx
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      Mapped Suggestions
      <span className="ml-2 text-muted-foreground/70">
        ({suggestions.length})
      </span>
    </h4>
    <ConfidenceBadge confidence={avgConfidence} />
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {suggestions.map(s => (
      <SuggestionCard
        key={s.field_id}
        suggestion={s}
        onApply={handleApply}
        onReject={handleReject}
      />
    ))}
  </div>
</div>
```

### KeyFactsSection Component

```tsx
<div className="space-y-2">
  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
    Key Facts
  </h4>
  <ul className="space-y-1.5 text-sm">
    {keyFacts.map((fact, i) => (
      <li key={i} className="flex items-start gap-2">
        <span className="text-primary mt-0.5">•</span>
        <span className="text-foreground">{fact}</span>
      </li>
    ))}
  </ul>
</div>
```

### UnmappedNotesSection Component

**Collapsible Pattern (Like Evidence Drawer):**
```tsx
<Collapsible>
  <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
    <ChevronDown className="h-3 w-3 transition-transform [[data-state=open]>svg]:rotate-180" />
    {unmapped.length} unmapped notes
  </CollapsibleTrigger>
  <CollapsibleContent>
    <div className="mt-2 space-y-2">
      {unmapped.map(note => (
        <div key={note.id} className="rounded-lg bg-muted/40 p-2.5">
          <p className="text-xs text-foreground">{note.extracted_text}</p>
          <ConfidenceBadge
            confidence={note.confidence}
            className="mt-1.5"
          />
        </div>
      ))}
    </div>
  </CollapsibleContent>
</Collapsible>
```

---

## 8. STATE MANAGEMENT

### File List State

```tsx
interface FileListState {
  expandedFileIds: Set<string>; // Track which files are expanded
  sortBy: 'date' | 'name' | 'ai-confidence'; // NEW: Sort options
  filterStatus: 'all' | 'processing' | 'completed' | 'failed';
  filterCategory: 'all' | 'lab' | 'sds' | 'photo' | 'general';
  searchTerm: string;
}
```

### AI Analysis Data Shape

```tsx
// From backend ai_analysis field
interface AIAnalysis {
  summary: string;
  key_facts: string[];
  suggestions: Array<{
    field_id: string;
    value: string;
    unit?: string;
    confidence: number;
    evidence?: {
      page?: number;
      excerpt?: string;
    };
  }>;
  unmapped: Array<{
    extracted_text: string;
    confidence: number;
  }>;
}
```

---

## 9. ACCESSIBILITY REQUIREMENTS

### Keyboard Navigation
- **Tab**: Navigate between file rows
- **Enter/Space**: Toggle expand/collapse
- **Arrow Down/Up**: Navigate list (roving tabindex)
- **Escape**: Collapse expanded row

### ARIA Labels
```tsx
<div
  role="article"
  aria-expanded={isExpanded}
  aria-label={`File: ${filename}, ${category}, ${processingStatus}`}
>
  <button
    aria-label={isExpanded ? "Collapse file details" : "Expand file details"}
    aria-controls={`file-content-${fileId}`}
  />

  <div
    id={`file-content-${fileId}`}
    role="region"
    aria-labelledby={`file-header-${fileId}`}
  />
</div>
```

### Screen Reader Considerations
- Announce processing status changes
- Announce AI analysis availability
- Provide context for confidence levels ("High confidence: 92%")
- Skip to content links for long file lists

### Focus Management
- Maintain focus on expand button when collapsing
- Focus first interactive element when expanding
- Visible focus indicators (2px outline with offset)

---

## 10. LOADING & ERROR STATES

### Processing State (Animated)

```tsx
{file.processing_status === 'processing' && (
  <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-3 animate-pulse">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      AI is analyzing this document...
    </div>
    <Progress value={processingProgress} className="mt-2 h-1" />
  </div>
)}
```

### Failed State (Actionable)

```tsx
{file.processing_status === 'failed' && (
  <div className="mt-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs text-destructive">
        <AlertCircle className="h-3.5 w-3.5" />
        Processing failed
      </div>
      <Button size="sm" variant="outline" onClick={retryProcessing}>
        Retry
      </Button>
    </div>
    {processingError && (
      <p className="mt-1.5 text-xs text-muted-foreground">
        {processingError}
      </p>
    )}
  </div>
)}
```

### Skeleton State (Initial Load)

```tsx
<div className="space-y-3">
  {[...Array(3)].map((_, i) => (
    <div key={i} className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  ))}
</div>
```

---

## 11. PERFORMANCE CONSIDERATIONS

### Virtualization (For Large File Lists)

**If > 50 files:**
- Use `@tanstack/react-virtual` for windowed list rendering
- Maintain only 10-15 DOM nodes at a time
- Preserve scroll position on expand/collapse

### Lazy Loading AI Insights

```tsx
// Only fetch full ai_analysis when expanding
const expandFile = async (fileId: string) => {
  if (!fullAnalysisCache.has(fileId)) {
    const analysis = await fetchFileAnalysis(fileId);
    fullAnalysisCache.set(fileId, analysis);
  }
  setExpandedFileIds(prev => new Set(prev).add(fileId));
};
```

### Image Optimization

```tsx
// Use Next.js Image with blur placeholder
<Image
  src={thumbnailUrl}
  alt={filename}
  width={48}
  height={48}
  className="rounded-lg object-cover"
  placeholder="blur"
  blurDataURL={generateBlurDataURL()}
/>
```

---

## 12. FUTURE ENHANCEMENTS

### Phase 2 (Post-MVP)

1. **Bulk Actions**
   - Select multiple files (checkbox column)
   - Bulk delete, download, re-process
   - Bulk tag/categorize

2. **Advanced Filtering**
   - Filter by confidence level (High/Medium/Low AI confidence)
   - Filter by mapped vs unmapped
   - Date range picker

3. **AI Insights Actions**
   - Edit suggestion before applying
   - Provide feedback (thumbs up/down on AI quality)
   - Manual field mapping UI

4. **File Comparison Mode**
   - Select 2 files to compare AI insights side-by-side
   - Highlight conflicts/overlaps
   - Merge suggestions

5. **File Preview Modal**
   - Quick preview of PDF/image without download
   - Highlight AI evidence excerpts in document
   - Annotation layer showing suggestion sources

6. **Enhanced Evidence**
   - Click evidence excerpt to jump to source location
   - Visual highlighting of extracted regions in image files
   - Page thumbnail previews for multi-page docs

### Phase 3 (Advanced)

1. **AI Chat Interface**
   - Ask questions about specific file
   - "Show me all mentions of mercury"
   - Conversational data extraction

2. **Smart Suggestions**
   - "Files with similar content"
   - "Related lab reports"
   - Duplicate detection

3. **Timeline Integration**
   - Show file processing in project timeline
   - Link suggestions to when they were applied
   - Audit trail visualization

---

## 13. COMPONENT FILE STRUCTURE

### New Files to Create

```
frontend/components/features/projects/files-tab-enhanced/
├── file-list.tsx                    # Main list container
├── file-list-item.tsx               # Individual file row
├── file-row-collapsed.tsx           # Collapsed state view
├── file-row-expanded.tsx            # Expanded state view
├── file-category-badge.tsx          # Category badge component
├── ai-insights-panel.tsx            # Expanded AI content
├── ai-summary-preview.tsx           # 1-line summary
├── suggestions-section.tsx          # Grid of suggestion cards
├── key-facts-section.tsx            # Bullet list of facts
├── unmapped-notes-section.tsx       # Collapsible unmapped
├── file-actions-bar.tsx             # Download/Delete buttons
└── types.ts                         # Local type definitions
```

### Files to Modify

```
frontend/components/features/projects/
├── files-tab-enhanced.tsx           # Refactor to use new components
└── intake-panel/
    ├── suggestion-card.tsx          # Export for reuse (no changes)
    ├── evidence-drawer.tsx          # Export for reuse (no changes)
    └── confidence-badge.tsx         # Export for reuse (no changes)
```

---

## DESIGN RATIONALE SUMMARY

### Why List Over Cards?

1. **Audit trail context**: Files tab is source of truth, users need chronological scanning
2. **Information density**: More metadata visible per file without interaction
3. **Comparison capability**: Easier to compare file details side-by-side
4. **Professional aesthetic**: Internal tools benefit from data-table familiarity

### Why Inline Expansion Over Modal/Drawer?

1. **Context preservation**: User maintains position in file list
2. **Multi-file comparison**: Can expand multiple files simultaneously
3. **Faster interaction**: No overlay dismissal, direct keyboard nav
4. **Accessibility**: Simpler focus management, no modal traps

### Why Reuse Intake Panel Components?

1. **Consistency**: Users learn one interaction pattern
2. **Maintenance**: Single source of truth for suggestion/evidence UI
3. **Quality**: Intake panel components already refined
4. **Development speed**: No component duplication

---

## OPEN QUESTIONS

1. **File deletion permissions**: Who can delete? Confirm modal needed?
2. **Re-processing trigger**: Should users manually retry failed processing?
3. **Unmapped notes workflow**: What happens to unmapped notes long-term?
4. **Thumbnail generation**: Server-side or client-side? Storage strategy?
5. **AI analysis caching**: Cache full analysis or fetch on demand?
6. **Sorting default**: Date descending or AI confidence descending?

---

## NEXT STEPS

1. Review design with stakeholders
2. Confirm data structure matches backend `ai_analysis` field
3. Create visual mockups (Figma/screenshot) if needed
4. Implement core components (file-list-item, ai-insights-panel)
5. Test with real AI analysis data
6. Accessibility audit with screen reader
7. Performance test with 100+ files
