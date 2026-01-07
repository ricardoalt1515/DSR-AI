# Fix UI Freeze After Closing Dialogs (Radix pointer-events lock)

## Context / Symptoms
- After closing certain dialogs (Edit Project, Delete Location, Edit Company), the UI becomes unclickable until a page refresh.
- Debugging shows `document.body.style.pointerEvents = "none"` even when no dialog/menu is visible.
- This is a known Radix `DismissableLayer` edge case when nested overlays (Dialog + Select/Popover/Dropdown) unmount out of order.

## Goal
Restore consistent interactivity after closing any modal while keeping the fix **minimal, maintainable, and aligned with Radix/shadcn best practices**.

## Root Cause Hypothesis (Observed)
- The global pointer-events release logic never triggers because the selector includes `[data-radix-popper-content-wrapper]`, which is **always present** due to `forceMount` in the navbar dropdown.
- Nested overlays (Select/Popover inside Dialog) can remain "open" for a tick after the dialog closes, leaving `pointer-events` locked on `body`.

---

## Plan (Checklist + Why)

### ✅ 1) Re-audit nested overlays and dialog triggers
- [ ] Identify dialogs that contain **Select/Popover/Dropdown** (Edit Project, Edit Company, Delete Location).
- [ ] Identify dropdown menu items that open dialogs (e.g., Project card actions).

**Why:** This bug only appears when **nested overlays** or **menu → dialog** transitions are involved.

---

### ✅ 2) Fix the pointer-events release selector (minimal + reliable)
- [ ] Remove `[data-radix-popper-content-wrapper]` from the “open layer” selector.
- [ ] Keep only selectors that *actually indicate open overlays*:
  - `role="dialog"[data-state="open"]`
  - `role="alertdialog"[data-state="open"]`
  - `role="menu"[data-state="open"]`
  - `role="listbox"[data-state="open"]`
  - `data-slot="dialog-overlay" | sheet-overlay | alert-dialog-overlay`

**Why:** `data-radix-popper-content-wrapper` exists even when nothing is open (due to `forceMount`). It blocks cleanup forever.

---

### ✅ 3) Ensure nested overlays close before the dialog closes
- [ ] Make nested Select/Popover components **controlled** (open state in parent).
- [ ] In the dialog `onOpenChange`, if closing → **close nested overlays first**.

Example pattern:
```ts
const [statusOpen, setStatusOpen] = useState(false);

<Dialog open={open} onOpenChange={(next) => {
  if (!next) setStatusOpen(false);
  setOpen(next);
}}>
  <Select open={statusOpen} onOpenChange={setStatusOpen} />
</Dialog>
```

**Why:** This matches Radix’s best practice: parent closes should not leave nested overlays open.

---

### ✅ 4) When a dialog is opened from a dropdown, close the menu first
- [ ] In `DropdownMenuItem` handlers, close the menu before opening dialog.
- [ ] Open dialog on the next frame (RAF or `setTimeout(0)`).

Example:
```ts
onSelect={(e) => {
  e.preventDefault();
  setMenuOpen(false);
  requestAnimationFrame(() => setDialogOpen(true));
}}
```

**Why:** Prevents overlay unmount race conditions (menu unmounting after dialog mounts).

---

### ✅ 5) Validate with a focused manual repro
- [ ] Open dialog → open nested Select → close dialog without closing Select.
- [ ] Verify `document.body.style.pointerEvents` resets to empty and UI stays interactive.

**Why:** This confirms the fix is real and not just cosmetic.

---

## Notes / Non-goals
- Avoid global “hacks” unless necessary. Local, predictable fixes are more maintainable.
- Do **not** add long cleanup timers unless truly required.
- Keep changes minimal and scoped to overlays that trigger the freeze.

---

## Expected Outcome
- All dialogs close cleanly without freezing the UI.
- No global pointer-events lock remains on `body`.
- Changes are small, explicit, and follow Radix/shadcn best practices.
