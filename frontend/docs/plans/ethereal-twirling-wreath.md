# Intake Panel - Apply Button Page Refresh Fix

## Status: Ready for implementation

---

## Problem

Clicking "Apply" on a suggestion causes a **full browser page reload**.

### Investigation Summary

- **No `<form>` element** found in the component tree (checked Card, Drawer, IntakePanel, FlexibleDataCapture, QuickUploadSection)
- The shadcn Button component does **NOT** set a default `type="button"` - it just spreads props
- In HTML, `<button>` defaults to `type="submit"` which can trigger form submission

### Root Cause Hypothesis

The Apply button lacks an explicit `type="button"`. While no form ancestor was found in the code, something is causing the browser to treat the click as a form submission. This could be:
1. A form injected by browser extension
2. A deeply nested form not visible in our code search
3. Browser default behavior treating button clicks unexpectedly

---

## Fix

### Add `type="button"` to Apply and Reject buttons

**File:** `suggestion-row.tsx` (lines 277-306)

```tsx
// Before
<Button
  variant="ghost"
  size="sm"
  className={...}
  onClick={() => {...}}
  disabled={disabled}
  aria-label={`Apply ${suggestion.fieldLabel}`}
>

// After
<Button
  type="button"
  variant="ghost"
  size="sm"
  className={...}
  onClick={() => {...}}
  disabled={disabled}
  aria-label={`Apply ${suggestion.fieldLabel}`}
>
```

Apply the same `type="button"` to the Reject button as well (line 307).

---

## Files Modified

| File | Change |
|------|--------|
| `suggestion-row.tsx` | Add `type="button"` to Apply and Reject buttons |

---

## Verification

1. Click Apply on any suggestion
2. Verify the animation plays and the suggestion is applied
3. Verify **NO page refresh** occurs
4. Check Reject button also works without refresh

---

## Why This Works

`★ HTML Button Insight`
- `<button>` defaults to `type="submit"` when unspecified
- `type="submit"` triggers form submission if the button is inside a `<form>`
- `type="button"` explicitly makes the button do nothing on its own
- Always use `type="button"` for buttons that should only trigger their `onClick` handler
