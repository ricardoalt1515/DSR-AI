# Plan: Intake Panel UI/UX Improvements

## Goal
Modernize intake-panel with better visual design, enhanced animations, and improved usability.

## Key Changes

### 1. Suggestion Card Redesign
**File:** `frontend/components/features/projects/intake-panel/suggestion-card.tsx`

- [ ] Glassmorphic background: `glass-liquid-subtle` + subtle gradient border
- [ ] Better spacing: increase padding, add visual breathing room
- [ ] Hover microinteraction: slight lift + glow effect
- [ ] Keyboard support: Enter to apply, Backspace to skip
- [ ] Entry animation: fade-in + slide-up with stagger for list

### 2. Enhanced Flying Chip Animation
**File:** `suggestion-card.tsx` (lines 152-193)

- [ ] Gradient background instead of solid `bg-primary`
- [ ] Add icon prefix (Sparkles) to chip
- [ ] Bounce easing: `cubic-bezier(0.34, 1.56, 0.64, 1)` for playful arrival
- [ ] Scale effect: start at 1, end at 0.9 with opacity fade

### 3. Staggered Batch Apply Animation
**Files:** `suggestion-card.tsx`, `ai-suggestions-section.tsx`

- [ ] New `staggeredFlyAnimation()` utility function
- [ ] When batch applying, each chip flies with 150ms delay
- [ ] Progress indicator showing "Applying 3/8..."
- [ ] Celebration confetti on completion (all suggestions reviewed)

### 4. Improved Burst Effect
**File:** `frontend/app/globals.css` (lines 1960-1977)

- [ ] Multi-ring ripple: 2 concentric rings expanding outward
- [ ] Add subtle scale transform (1.02 → 1) on field
- [ ] Softer colors: primary/40 opacity instead of /60

### 5. Confidence Indicator Badge
**File:** `frontend/components/features/projects/intake-panel/confidence-indicator.tsx`

- [ ] Badge-style with background (not just dot + text)
- [ ] High: `bg-success/15 text-success border-success/30`
- [ ] Medium: `bg-warning/15 text-warning border-warning/30`
- [ ] Low: `bg-destructive/15 text-destructive border-destructive/30`
- [ ] Add pulse animation for high-confidence (subtle attention)

### 6. Filter Pills (Replace Dropdown)
**File:** `frontend/components/features/projects/intake-panel/suggestion-filters.tsx`

- [ ] Horizontal pill buttons instead of dropdown
- [ ] Active state: filled background, inactive: ghost
- [ ] Show count badge on each pill (e.g., "High (5)")

### 7. Processing Banner Enhancement
**File:** `frontend/components/features/projects/intake-panel/intake-panel-content.tsx` (lines 570-602)

- [ ] Animated Sparkles icon with pulse rings
- [ ] Shimmer effect on progress bar
- [ ] Add estimated time or document names

### 8. Mobile FAB Polish
**File:** `frontend/components/features/projects/intake-panel/intake-panel.tsx`

- [ ] Pulse ring animation when pending > 0
- [ ] Subtle wiggle every 10s to draw attention
- [ ] Badge with pending count (already exists, enhance styling)

### 9. Empty/Completion States
**File:** `ai-suggestions-section.tsx` (lines 179-238)

- [ ] Professional completion: checkmark with ring pulse + subtle scale
- [ ] Success glow effect (not confetti - too playful for engineers)
- [ ] Spring bounce on icon, subtle and satisfying
- [ ] Softer colors for upload prompt state

## Files to Modify
1. `suggestion-card.tsx` - Card redesign + fly animation
2. `confidence-indicator.tsx` - Badge style
3. `suggestion-filters.tsx` - Pill buttons
4. `ai-suggestions-section.tsx` - Stagger logic + completion
5. `intake-panel-content.tsx` - Processing banner
6. `intake-panel.tsx` - Mobile FAB
7. `globals.css` - Keyframes + utility classes

## Dependencies
- Existing: Framer Motion, Tailwind, Radix (no new deps needed)

## Decisions
- **Celebration:** Professional ring pulse + scale (no confetti)
- **Chip icon:** Sparkles ✨ (consistent with AI branding)
- **Mobile filters:** Horizontal scroll pills

## Verification
1. Apply single suggestion → fly animation with Sparkles + burst visible
2. Apply batch (3+) → staggered chips with 150ms delay + progress
3. Complete all → ring pulse celebration (professional)
4. Mobile: FAB pulses, pills scroll horizontally
5. Reduced motion: all animations disabled gracefully
6. Run `bun run check:ci` passes

---

## Best Practices Review (Multi-Stage Highlight Implementation)

### ✅ Tailwind 4 Compliance

| Rule | Status | Notes |
|------|--------|-------|
| No `var()` in className | ✅ | CSS variables used in globals.css keyframes only (correct place) |
| No hex colors | ✅ | Using `hsl(var(--primary) / opacity)` theme tokens |
| No barrel imports | ✅ | `focus-field.ts` exports directly, no index barrel |
| Static classes | ✅ | `.animate-apply-burst` applied via DOM, not cn() |

**globals.css keyframes are the correct place for CSS variables** - Tailwind's rule against `var()` in className applies to React components, not CSS files where `@keyframes` and custom utilities live.

### ✅ Vercel React Best Practices

| Rule | Status | Notes |
|------|--------|-------|
| `js-batch-dom-css` | ✅ | Single `classList.add()` call with both classes |
| `rendering-no-flicker` | ✅ | `void target.offsetWidth` forces reflow before adding class |
| `rerender-*` | N/A | Pure DOM utility, no React state involved |
| `bundle-*` | ✅ | Utility is tree-shakeable, only imported where used |

### ✅ Animation Performance

| Aspect | Implementation | Best Practice |
|--------|----------------|---------------|
| GPU acceleration | `transform: scale()` | ✅ Triggers compositor-only layer |
| Avoid layout thrash | `box-shadow` + `background-color` only | ✅ No width/height changes |
| Reduced motion | `@media (prefers-reduced-motion)` | ✅ Falls back to static background |
| Cleanup | `setTimeout` removes classes | ✅ Prevents class accumulation |

### ⚠️ Minor Consideration

**setTimeout cleanup (2800ms)**: Works fine for one-shot animations. For high-frequency calls (rare in this use case), could consider:
- AbortController pattern
- WeakMap to track active animations

**Verdict**: Current implementation is appropriate for the use case (user-triggered suggestion applies, not high-frequency).
