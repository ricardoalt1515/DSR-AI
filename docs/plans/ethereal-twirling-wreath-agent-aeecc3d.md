# Files Section Redesign - UX/UI Enhancement Plan

**Status**: Design Analysis & Specification
**Priority**: High - User Experience Improvement
**Scope**: Frontend only - No backend changes required

---

## 1. CURRENT STATE ANALYSIS

### Critical UX Issues Identified

**A. Poor Preview Interaction Pattern**
- Preview panel appears as side panel (desktop) or drawer (mobile)
- File selection feels disconnected from preview action
- Split layout takes up permanent horizontal space even when preview not needed
- No clear visual hierarchy between browsing and previewing

**B. Weak File Card Design**
- Basic card styling lacks polish
- Minimal visual feedback on interaction
- Thumbnail area underutilized (aspect-square with centered icon)
- Category dots are tiny (2px) - poor visual hierarchy
- No hover states that communicate interactivity

**C. Cognitive Load Issues**
- Users must scan left (files) then right (preview) repeatedly
- Preview metadata competes with file grid for attention
- No progressive disclosure - all UI elements visible at once
- Search/filter bar separated from results

**D. Desktop Real Estate Waste**
- Side panel takes 380px width permanently when file selected
- Forces main content to reflow on selection
- Grid shrinks from 4 columns to 3 on 1440px screens
- Breaks visual rhythm during browsing

**E. Mobile Drawer Limitations**
- Bottom drawer obscures file grid
- Users lose context of what they selected
- Cannot easily compare files or switch between them
- Drawer UI feels like an afterthought

---

## 2. DESIGN PRINCIPLES & SOLUTION

### Core Philosophy: Modal-First Preview Experience

**Why Modal Pattern Wins Here:**
1. **Focused Attention**: Full-screen preview removes distractions
2. **Spatial Consistency**: File grid never shifts or reflows
3. **Better Metaphor**: Clicking file = "open it" not "select it"
4. **Mobile Parity**: Same UX pattern works perfectly on mobile
5. **Progressive Disclosure**: Preview only when needed

### Visual Language: Glassmorphism + Water Theme

Platform already uses:
- `glass-liquid` - translucent blur effects
- `glass-liquid-subtle` - lighter variant
- `glass-liquid-strong` - stronger variant
- `aqua-panel` - water-inspired gradients
- Water-themed radial gradients throughout

Modal should feel like it's "floating" above the grid with aquatic depth.

---

## 3. DETAILED COMPONENT SPECIFICATIONS

### A. Enhanced File Cards (Grid View)

**Visual Hierarchy Improvements:**

```
┌─────────────────────────┐
│  [Thumbnail Area]       │  ← Larger, 16:10 aspect ratio
│  Category Badge ↗       │  ← Top-right corner, 12px badge
│  AI Sparkles ↗         │
│                         │
│  Filename              │  ← 14px semibold, truncate 2 lines
│  Category • Size • Date│  ← 11px muted, single line
└─────────────────────────┘
```

**Specifications:**
- **Dimensions**: Flexible width, 16:10 aspect thumbnail
- **Border**: 1px solid, rounded-xl (12px)
- **Background**: Card with glass-liquid-subtle on hover
- **Hover State**:
  - Scale 1.02 transform
  - Lift 4px (translateY)
  - Shadow-md-eng
  - Border changes to primary/30
  - Smooth 200ms ease-out
- **Category Badge**:
  - Top-right: top-3 right-3
  - Larger size: px-2 py-1 (vs current px-1.5 py-0)
  - Readable text-xs (11px) instead of text-[10px]
- **AI Indicator**:
  - Top-right but offset below badge: top-12 right-3
  - Background: primary/10 with backdrop blur
  - Icon: h-4 w-4 (larger, more prominent)
- **Thumbnail**:
  - Aspect-[16/10] instead of aspect-square
  - Better for PDFs and landscape photos
  - Gradient overlay on hover: linear-gradient(transparent 60%, primary/5)

**Interaction States:**
- Default: Subtle border, no shadow
- Hover: Lift + glow + border highlight
- Active/Pressed: Scale 0.98, no lift
- Focus-visible: Ring-2 ring-primary/50
- Selected: NOT shown - modal opens instead

**Accessibility:**
- Semantic button element (already correct)
- ARIA label: "Open {filename} preview"
- Keyboard: Enter/Space to open modal
- Focus trap in modal when open

---

### B. Enhanced File Rows (List View)

**Visual Improvements:**

```
┌──────────────────────────────────────────────────────┐
│ [📄] Filename.pdf    [LAB] 2.4MB  2d ago  ✨  →     │
└──────────────────────────────────────────────────────┘
```

**Specifications:**
- **Height**: py-3 (48px min - touch-friendly)
- **Hover**:
  - bg-accent/5
  - border-primary/20
  - Arrow slides right 2px
- **Icons**:
  - Thumbnail: h-10 w-10 (larger)
  - AI sparkles: h-4 w-4 (more visible)
  - Arrow: h-5 w-5 (better affordance)
- **Typography**:
  - Filename: text-sm font-medium (14px semibold)
  - Metadata: text-xs text-muted-foreground (11px)
- **Spacing**:
  - gap-4 between elements (better breathability)
  - Proper responsive hiding (badge always visible, size/date hide on mobile)

---

### C. Glassmorphism Preview Modal

**THE HERO COMPONENT - This is where magic happens**

#### Layout Structure:

```
┌────────────────────────────────────────────────────────┐
│  MODAL OVERLAY (backdrop-blur-md bg-background/80)    │
│  ┌──────────────────────────────────────────────────┐ │
│  │  [X Close]                                       │ │
│  │                                                  │ │
│  │  ┌─────────────────┬──────────────────────────┐ │ │
│  │  │                 │  AI SUMMARY              │ │ │
│  │  │                 │  ──────────────────      │ │ │
│  │  │   PREVIEW       │  "This lab report..."    │ │ │
│  │  │   AREA          │                          │ │ │
│  │  │                 │  KEY FACTS               │ │ │
│  │  │   (PDF/Image)   │  • pH: 7.2               │ │ │
│  │  │                 │  • TSS: 120 mg/L         │ │ │
│  │  │                 │  • Date: Jan 15          │ │ │
│  │  │                 │                          │ │ │
│  │  │                 │  METADATA                │ │ │
│  │  │                 │  ──────────────────      │ │ │
│  │  │                 │  Category: Lab Report    │ │ │
│  │  │                 │  Size: 2.4 MB            │ │ │
│  │  │                 │  Uploaded: 2 days ago    │ │ │
│  │  │                 │                          │ │ │
│  │  │                 │  [Download] [View] [Delete]│
│  │  └─────────────────┴──────────────────────────┘ │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

#### Modal Container Specs:

**Desktop (≥1024px):**
- Width: 90vw (max 1400px)
- Height: 85vh (max 900px)
- Centered: fixed with transform translate(-50%, -50%)
- Border-radius: 24px (radius-xl)
- Class: `glass-liquid-strong`
- Shadow: shadow-2xl with aqua glow

**Tablet (768px - 1023px):**
- Width: 95vw
- Height: 90vh
- Same glassmorphism treatment

**Mobile (<768px):**
- Width: 100vw
- Height: 100vh (full screen)
- Border-radius: 0 (edge-to-edge)
- Slide up animation from bottom

#### Split Layout (Desktop/Tablet):

**LEFT PANE - Preview Area (60%)**
- Background: muted/10 (subtle tint)
- Padding: p-8
- Flex: items-center justify-center
- Max height with scroll if needed

**PDF Preview:**
- Use iframe or react-pdf
- Width: 100%
- Height: 100%
- Border: 1px solid border
- Border-radius: radius-lg
- Box-shadow: shadow-md

**Image Preview:**
- object-contain
- max-h-full max-w-full
- Rounded corners: radius-lg
- Optional: Zoom on click (stretch goal)

**Fallback (non-previewable):**
- Large file type icon (h-24 w-24)
- Filename below
- "Click Download to view" helper text

**RIGHT PANE - Metadata Sidebar (40%)**
- Padding: p-6
- Background: gradient from card to primary/3
- Border-left: 1px solid border/50
- Overflow-y: auto with custom scrollbar
- Sticky action buttons at bottom

#### Metadata Sidebar Structure:

**1. Header Section:**
```tsx
<div className="space-y-4">
  {/* Filename */}
  <h2 className="text-xl font-semibold leading-tight break-words">
    {filename}
  </h2>

  {/* Category Badge + Size + Date */}
  <div className="flex flex-wrap items-center gap-2">
    <Badge className="category-badge">{category}</Badge>
    <span className="text-sm text-muted-foreground">
      {size} • Uploaded {date}
    </span>
  </div>
</div>
```

**2. AI Summary Section (if available):**
```tsx
<div className="glass-liquid-subtle rounded-xl p-4 space-y-2">
  <div className="flex items-center gap-2">
    <Sparkles className="h-5 w-5 text-primary" />
    <h3 className="font-semibold text-sm">AI Summary</h3>
  </div>
  <p className="text-sm text-muted-foreground leading-relaxed">
    {aiAnalysis.summary}
  </p>
</div>
```

**3. Key Facts Section:**
```tsx
<div className="space-y-3">
  <h3 className="text-sm font-semibold flex items-center gap-2">
    <span>Key Facts</span>
  </h3>
  <ul className="space-y-2">
    {keyFacts.map(fact => (
      <li className="flex items-start gap-3">
        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
        <div>
          <span className="font-medium text-sm">{fact.label}</span>
          <span className="text-sm text-muted-foreground">: {fact.value}</span>
        </div>
      </li>
    ))}
  </ul>
</div>
```

**4. Action Buttons (Sticky Footer):**
```tsx
<div className="sticky bottom-0 bg-gradient-to-t from-card to-transparent pt-6 pb-2">
  <div className="flex gap-2">
    <Button variant="outline" onClick={onDownload} className="flex-1">
      <Download className="h-4 w-4 mr-2" />
      Download
    </Button>
    <Button variant="outline" onClick={onView}>
      <ExternalLink className="h-4 w-4" />
    </Button>
    <Button
      variant="ghost"
      onClick={onDelete}
      className="text-destructive hover:bg-destructive/10"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
</div>
```

#### Modal Animations:

**Open Animation:**
```css
@keyframes modal-fade-in {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
```
- Duration: 250ms
- Easing: cubic-bezier(0.4, 0, 0.2, 1)
- Backdrop fades in simultaneously

**Close Animation:**
- Reverse of open
- Duration: 200ms
- Scale down to 0.98

**Content Stagger:**
- Preview area: fade-in delay 50ms
- Metadata sidebar: fade-in delay 100ms
- Creates pleasant reveal sequence

---

## 4. RESPONSIVE BEHAVIOR

### Desktop (≥1024px)
- Modal: 90vw × 85vh, centered
- Split layout: 60/40
- All metadata visible
- Hover states fully enabled

### Tablet (768-1023px)
- Modal: 95vw × 90vh
- Split layout: 55/45 (more metadata)
- Reduce padding: p-6 → p-4
- Smaller preview max-height

### Mobile (<768px)
- Full-screen modal (100vw × 100vh)
- **Stacked layout** (not split):
  ```
  ┌─────────────────┐
  │  [X Close]      │
  ├─────────────────┤
  │  PREVIEW        │
  │  (40vh)         │
  ├─────────────────┤
  │  METADATA       │
  │  (scroll)       │
  │  ─────          │
  │  AI Summary     │
  │  Key Facts      │
  │  Actions        │
  └─────────────────┘
  ```
- Preview: 40vh fixed height
- Metadata: Remaining space with scroll
- Slide-up animation from bottom
- Swipe-down to close gesture (stretch goal)

---

## 5. INTERACTION PATTERNS

### Opening Modal
1. User clicks file card/row
2. Backdrop fades in (200ms)
3. Modal scales up from center (250ms)
4. Content staggers in (50ms delay between sections)
5. Focus trap activates
6. Body scroll locked

### Closing Modal
1. Click backdrop OR
2. Click X button OR
3. Press Escape key OR
4. Complete action (download/delete)
5. Modal scales down (200ms)
6. Backdrop fades out
7. Focus returns to clicked file card
8. Body scroll restored

### Keyboard Navigation
- **Tab**: Move through interactive elements
- **Shift+Tab**: Reverse
- **Escape**: Close modal
- **Enter**: Activate focused button
- **Arrow keys**: Scroll metadata (when focused)

### Loading States
- Preview loading: Skeleton placeholder in left pane
- Metadata loading: Shimmer effect in right pane
- Download: Button shows spinner + "Downloading..."
- Delete: Button disabled + spinner

---

## 6. ACCESSIBILITY REQUIREMENTS

### ARIA Implementation
```tsx
<Dialog
  open={isOpen}
  onOpenChange={onClose}
  aria-labelledby="file-preview-title"
  aria-describedby="file-preview-description"
>
  <DialogContent className="file-preview-modal">
    <DialogHeader>
      <DialogTitle id="file-preview-title">
        {filename}
      </DialogTitle>
      <DialogDescription id="file-preview-description">
        File preview and metadata
      </DialogDescription>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

### Keyboard Support
- Focus trap within modal
- Return focus to trigger element on close
- All buttons keyboard accessible
- Escape key closes modal

### Screen Reader Experience
- Announce modal opening: "File preview dialog opened"
- File metadata read in logical order
- Action buttons clearly labeled
- Loading states announced
- Success/error feedback via live region

### Color Contrast
- All text meets WCAG AA (4.5:1 for body, 3:1 for large)
- Category badges use configured colors (already AA compliant)
- Focus indicators: 3:1 contrast minimum
- Glassmorphism doesn't reduce readability below 4.5:1

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  .file-preview-modal {
    animation: none;
    transition: opacity 0.2s ease;
  }
}
```

---

## 7. TECHNICAL IMPLEMENTATION NOTES

### Component Structure

**New Files to Create:**
```
frontend/components/features/projects/files-section/
├── file-preview-modal.tsx          ← Main modal component
├── file-preview-content.tsx        ← Left pane content
├── file-preview-metadata.tsx       ← Right pane sidebar
├── file-preview-actions.tsx        ← Action buttons
└── file-preview-pdf-viewer.tsx     ← PDF rendering (if needed)
```

**Files to Modify:**
```
files-section.tsx     ← Change handleSelectFile to open modal
file-card.tsx         ← Enhance hover states, remove selected state
file-row.tsx          ← Same improvements
files-preview-panel.tsx  ← DELETE (replaced by modal)
files-preview-drawer.tsx ← DELETE (modal works for mobile)
```

### State Management

**Modal State:**
```tsx
const [modalOpen, setModalOpen] = useState(false);
const [selectedFile, setSelectedFile] = useState<EnhancedProjectFile | null>(null);
const [previewUrl, setPreviewUrl] = useState<string | null>(null);
const [isLoadingPreview, setIsLoadingPreview] = useState(false);
```

**No changes to files-section.tsx data fetching** - same API calls, same logic

### Glassmorphism Classes to Use

From globals.css:
- `glass-liquid` - Base modal container
- `glass-liquid-strong` - For modal backdrop overlay
- `glass-liquid-subtle` - AI summary card
- `shadow-2xl` - Modal shadow
- `backdrop-blur-md` - Overlay blur

### Dependencies

Already available:
- `@radix-ui/react-dialog` - Modal primitives (already used)
- `lucide-react` - Icons
- `sonner` - Toasts for success/error
- Tailwind CSS with custom config

Potentially needed:
- `react-pdf` - If PDF preview needed (currently just showing placeholder)
- Could also use `<iframe>` with blob URLs

---

## 8. EDGE CASES & ERROR HANDLING

### Preview Loading Failures
- Show friendly error in preview pane
- "Preview unavailable" message
- Offer Download button as fallback
- Don't block modal from opening

### Large Files
- Show file size warning in metadata
- "Large file - preview may be slow"
- Offer direct download instead

### Processing Status
- File still processing: Show spinner + "Processing..."
- Failed processing: Warning badge + message
- No AI analysis: Hide AI summary section gracefully

### Network Errors
- Retry button in preview pane
- Toast notification: "Failed to load preview"
- Metadata still visible from cached list data

### Concurrent Actions
- Disable action buttons during operations
- Show loading state on active button
- Prevent double-clicks
- Queue operations if needed

---

## 9. PERFORMANCE OPTIMIZATIONS

### Lazy Loading
- Only fetch file detail + preview when modal opens
- Preload on card hover (debounced 300ms)
- Cache blob URLs in Map with file ID key

### Image Optimization
- Use Next.js Image for thumbnails (wait - blob URLs, can't use)
- Lazy load images in preview
- Progressive JPEG rendering if applicable

### Animation Performance
- Use `transform` and `opacity` only (GPU accelerated)
- `will-change: transform` on modal
- Disable animations on low-end devices

### Memory Management
- Revoke blob URLs on modal close: `URL.revokeObjectURL()`
- Clear preview cache on file deletion
- Limit cache size to 10 most recent

### Bundle Size
- Modal component code-split if >50KB
- Lazy load PDF viewer only when needed
- Tree-shake unused Dialog sub-components

---

## 10. TESTING STRATEGY

### Visual Regression
- Screenshot tests for modal states:
  - Default open
  - Loading state
  - With AI summary
  - Without AI summary
  - Error state
- Compare against baseline images

### Interaction Testing
- Click file → modal opens
- Escape key → modal closes
- Backdrop click → modal closes
- Download button → file downloads
- Delete → confirmation dialog

### Accessibility Audit
- Run axe-core automated tests
- Manual keyboard navigation test
- Screen reader testing (VoiceOver/NVDA)
- Color contrast verification
- Focus trap validation

### Responsive Testing
- Desktop (1920×1080, 1440×900)
- Tablet (iPad 1024×768)
- Mobile (iPhone 14 Pro 393×852)
- Edge cases: 1366×768, ultrawide

### Cross-browser
- Chrome (90%+ users)
- Safari (macOS + iOS)
- Firefox
- Edge

---

## 11. MIGRATION PLAN

### Phase 1: Create Modal Component
1. Build `file-preview-modal.tsx` with basic structure
2. Implement glassmorphism styling
3. Add open/close animations
4. Test accessibility

### Phase 2: Enhance File Cards
1. Update hover states in `file-card.tsx`
2. Improve category badge visibility
3. Adjust thumbnail aspect ratio
4. Add better focus states

### Phase 3: Wire Up Modal
1. Modify `files-section.tsx` to use modal instead of side panel
2. Remove split layout logic
3. Delete old preview panel components
4. Test state management

### Phase 4: Polish & Optimize
1. Add loading states
2. Error handling
3. Performance optimizations
4. Final accessibility pass

### Phase 5: QA & Launch
1. Full testing suite
2. Cross-browser validation
3. Deploy behind feature flag (optional)
4. Monitor for issues

---

## 12. SUCCESS METRICS

### Quantitative
- **Time to preview**: <500ms (target)
- **Modal open animation**: 250ms smooth 60fps
- **Lighthouse Accessibility**: 100/100
- **Bundle size increase**: <30KB gzipped

### Qualitative
- Users describe experience as "modern" and "polished"
- File browsing feels faster (no layout shift)
- Preview experience is "focused" and "clear"
- Mobile experience on par with desktop

### Before/After Comparison
- **Before**: Side panel, layout shift, disconnected feeling
- **After**: Modal, stable layout, focused experience

---

## 13. VISUAL DESIGN TOKENS

### Colors (from globals.css)
- Primary: `oklch(0.63 0.12 256)` - Blue
- Success: `oklch(0.73 0.14 154)` - Green
- Muted: `oklch(0.96 0.01 250)` - Light gray
- Border: `oklch(0.92 0.01 250)` - Subtle border

### Spacing Scale
- xs: 6px (gap between small elements)
- sm: 12px (card padding)
- md: 16px (section spacing)
- lg: 24px (modal padding)
- xl: 32px (modal outer margins)

### Shadows
- `shadow-sm-eng`: Subtle elevation
- `shadow-md-eng`: Medium elevation
- `shadow-2xl`: Maximum elevation (modal)
- Custom: `0 0 60px oklch(0.63 0.12 256 / 0.15)` for aqua glow

### Border Radius
- sm: 10px (buttons)
- lg: 16px (cards)
- xl: 24px (modal)
- full: 9999px (badges)

### Typography
- Filename (modal): 20px semibold
- Section headers: 14px semibold
- Body: 14px regular
- Metadata: 11px medium
- Font: var(--font-sans) - Geist Sans

---

## 14. OPEN QUESTIONS

1. **PDF Rendering**: Use `react-pdf` library or simple iframe?
   - Recommendation: Start with iframe (simpler), add react-pdf if needed

2. **Image Zoom**: Should preview images be zoomable?
   - Recommendation: Nice-to-have, implement in v2

3. **Multi-file Selection**: Future need to compare multiple files?
   - Recommendation: Out of scope for v1, keep single-select

4. **File Navigation**: Previous/Next buttons in modal to browse files?
   - Recommendation: Great UX addition - include in v1

5. **Keyboard Shortcuts**: Should we add Cmd+D for download, etc?
   - Recommendation: Yes, document in help tooltip

---

## 15. DESIGN RATIONALE SUMMARY

### Why Modal Over Side Panel?

**User Goals:**
- Quickly browse many files
- Deeply inspect individual files
- Not interrupt browsing flow

**Modal Advantages:**
1. **Spatial Stability**: File grid never shifts, maintaining user's mental map
2. **Focus**: Full attention on one file when previewing
3. **Flexibility**: More space for preview + metadata without compromise
4. **Mobile Parity**: Same pattern works beautifully on mobile
5. **Modern Conventions**: Matches patterns from Drive, Dropbox, Figma

**Side Panel Weaknesses:**
1. Permanent width reservation wasteful
2. Forces grid reflow (jarring)
3. Split attention between browsing and preview
4. Mobile drawer is second-class experience
5. Feels like "selection" not "opening"

### Why Glassmorphism?

**Brand Consistency:**
- Platform already uses glass effects throughout
- Aqua/water theme is established visual language
- Creates premium, modern feel

**Functional Benefits:**
- Depth perception (modal floats above content)
- Maintains context (can still see grid beneath)
- Subtle, not gimmicky when done right
- Works in light and dark mode

### Why 60/40 Split?

**User Research Pattern:**
- Preview is primary task (60%)
- Metadata is supporting context (40%)
- Allows comfortable PDF reading width
- Sidebar doesn't feel cramped

**Flexibility:**
- Could adjust to 70/30 for image-heavy files
- Could adjust to 50/50 for data-heavy files
- Starting conservative with 60/40

---

## 16. IMPLEMENTATION CHECKLIST

### Component Development
- [ ] Create `file-preview-modal.tsx` base component
- [ ] Build split layout structure (desktop)
- [ ] Build stacked layout (mobile)
- [ ] Implement preview content pane
- [ ] Implement metadata sidebar
- [ ] Add action buttons with loading states
- [ ] Wire up file detail API call
- [ ] Handle image preview rendering
- [ ] Handle PDF preview (iframe)
- [ ] Handle fallback for other file types

### Styling & Animation
- [ ] Apply `glass-liquid-strong` to modal
- [ ] Configure backdrop blur overlay
- [ ] Implement open animation (scale + fade)
- [ ] Implement close animation
- [ ] Add content stagger effect
- [ ] Enhance file card hover states
- [ ] Update category badge sizing
- [ ] Improve AI indicator prominence
- [ ] Add focus states for accessibility
- [ ] Test reduced motion preferences

### Integration
- [ ] Modify `handleSelectFile` in files-section.tsx
- [ ] Remove side panel layout logic
- [ ] Delete `files-preview-panel.tsx`
- [ ] Delete `files-preview-drawer.tsx`
- [ ] Update state management for modal
- [ ] Clean up unused CSS
- [ ] Update component exports

### Accessibility
- [ ] Add proper ARIA labels
- [ ] Implement focus trap
- [ ] Test keyboard navigation
- [ ] Verify color contrast (AA minimum)
- [ ] Test screen reader announcements
- [ ] Add loading state announcements
- [ ] Handle focus return on close
- [ ] Test with VoiceOver/NVDA

### Testing
- [ ] Write unit tests for modal component
- [ ] Test open/close interactions
- [ ] Test download functionality
- [ ] Test delete confirmation flow
- [ ] Visual regression tests
- [ ] Responsive breakpoint tests
- [ ] Cross-browser compatibility
- [ ] Performance profiling

### Documentation
- [ ] Update component README
- [ ] Document glassmorphism usage
- [ ] Add interaction patterns guide
- [ ] Create accessibility notes
- [ ] Document keyboard shortcuts

---

## 17. ESTIMATED EFFORT

**Component Development**: 8-12 hours
- Modal structure: 3h
- Preview rendering: 2h
- Metadata sidebar: 2h
- Integration: 2h
- Polish: 2h

**Styling & Animation**: 4-6 hours
- Glassmorphism: 2h
- Animations: 1h
- Responsive: 2h
- Card enhancements: 1h

**Testing & QA**: 4-6 hours
- Accessibility: 2h
- Cross-browser: 1h
- Visual regression: 1h
- Bug fixes: 1h

**Total**: 16-24 hours (2-3 days)

---

## FINAL NOTES

This redesign transforms the files section from "functional but basic" to "polished and delightful." The modal pattern is proven, the glassmorphism aligns with brand, and the implementation is straightforward given existing infrastructure.

Key success factors:
1. **Maintain spatial stability** - grid never shifts
2. **Focus when needed** - modal for deep inspection
3. **Accessible by default** - WCAG AA compliance
4. **Mobile-first responsive** - same UX across devices
5. **Performance conscious** - smooth 60fps animations

This will be 1000x better. Ready to implement.
