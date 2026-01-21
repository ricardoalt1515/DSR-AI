# Color System Standardization - Full Light/Dark Theme

## Status: 📋 PLANNING

## Problem
- 30+ components use hardcoded Tailwind palette colors (`green-500`, `yellow-50`)
- `--warning` contrast ~4.2:1 (borderline WCAG AA)
- `--destructive` dark mode ~4.1:1 (fails WCAG AA)
- Domain tokens (`--treatment-*`, `--compliance-*`) underutilized

---

## Phase 1: Token Fixes in globals.css

### 1.1 Accessibility Fixes
```css
/* :root - darken warning for better contrast */
--warning: oklch(0.72 0.15 85);  /* was 0.86 */

/* .dark - lighten destructive for contrast */
--destructive: oklch(0.55 0.16 25);  /* was 0.4 */
```

### 1.2 Add Decision State Tokens
```css
:root {
  --decision-go-bg: color-mix(in srgb, var(--success) 8%, var(--card));
  --decision-go-border: color-mix(in srgb, var(--success) 25%, transparent);
  --decision-nogo-bg: color-mix(in srgb, var(--destructive) 8%, var(--card));
  --decision-nogo-border: color-mix(in srgb, var(--destructive) 25%, transparent);
  --decision-investigate-bg: color-mix(in srgb, var(--warning) 8%, var(--card));
  --decision-investigate-border: color-mix(in srgb, var(--warning) 25%, transparent);
}
```

### 1.3 Add Avatar Palette (8 colors)
```css
--avatar-1: var(--primary);
--avatar-2: var(--success);
--avatar-3: oklch(0.6 0.14 320);   /* violet */
--avatar-4: var(--warning);
--avatar-5: var(--destructive);
--avatar-6: var(--info);
--avatar-7: oklch(0.55 0.12 270);  /* indigo */
--avatar-8: oklch(0.65 0.13 175);  /* teal */
```

### 1.4 Add Password Strength Tokens
```css
--strength-weak: var(--destructive);
--strength-fair: var(--warning);
--strength-good: var(--info);
--strength-strong: var(--success);
```

### 1.5 Add Gradient Token
```css
--gradient-primary: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 80%, var(--info)));
```

---

## Phase 2: High-Priority Migrations

| File | Current | Migration |
|------|---------|-----------|
| `compact-decision-header.tsx` | `bg-green-50 dark:bg-green-950` | `bg-decision-go-bg` |
| `decision-recommendation-card.tsx` | Same pattern | Same fix |
| `business-risks-card.tsx` | `border-l-yellow-500 bg-yellow-50/30` | `border-l-warning bg-state-warning-bg` |
| `resource-considerations-card.tsx` | `border-green-200 bg-green-50/30` | `border-success/25 bg-state-success-bg` |
| `proposal-economics.tsx` | 20+ hardcoded colors | Map to semantic equivalents |

---

## Phase 3: Lower-Priority Migrations

| File | Change |
|------|--------|
| `org-card.tsx` | `bg-green-500/10` → `bg-success/10` |
| `org-avatar.tsx` | `bg-blue-500` → `bg-avatar-1` |
| `users-table.tsx` | Use avatar tokens |
| `add-user-modal.tsx` | Use strength tokens |
| `loading-states.tsx` | `from-blue-500` → `bg-primary` |
| `project-card.tsx` | Use gradient token |

---

## Critical Files

1. `frontend/app/globals.css` - Token definitions
2. `frontend/components/features/proposals/compact-decision-header.tsx` - 16 hardcoded
3. `frontend/components/features/proposals/proposal-economics.tsx` - 20+ hardcoded
4. `frontend/components/features/proposals/proposal-technical/business-risks-card.tsx`
5. `frontend/components/features/proposals/proposal-technical/resource-considerations-card.tsx`

---

## Verification

```bash
cd frontend && bun run check:ci
bunx tsc --noEmit
```

Manual: Toggle dark mode, check contrast on warning/destructive text.

---

## Decisions Made

1. **Adjust token values** - Yes, for WCAG AA compliance
2. **Use `color-mix()`** - For muted backgrounds instead of new tokens
3. **Gradient token** - Single `--gradient-primary` for CTAs
4. **Avatar tokens** - 8 dedicated tokens mapped to semantics where possible
