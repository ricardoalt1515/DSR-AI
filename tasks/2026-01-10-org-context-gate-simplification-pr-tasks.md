# PR Tasks: Org Context Gate - Simplification Pass

## Context
- Super admins can navigate to org-scoped pages without selecting an organization, causing backend 400 errors:
  - "Super admin must select organization via X-Organization-Id header"
- A blocking org-context gate was implemented to prevent these failures:
  - `OrgContextGuard` (blocks render when org is required + missing)
  - `OrgRequiredScreen` (full-page selection UI)
  - `OrgContextBadge` + `OrgSelectionModal` (switching orgs)
  - Route allowlist `ORG_EXEMPT_ROUTES` via `isOrgExemptRoute()`

This PR is a **cleanup/refactor pass** focused on clarity + maintainability.

## Goal
Make the org-context implementation simpler and more consistent **without changing user-facing behavior**.

## Non-goals
- No new features (recent orgs, pinning, virtualized lists, keyboard shortcuts, etc.)
- No API contract changes.
- No UX redesign.

## Guardrails (must-haves)
- Keep the core behavior: **when org is required and missing, children must not render** (no overlay approach).
- Keep existing copy and toast behavior.
- No `any` casts.
- Avoid adding `try/catch` unless it changes control flow meaningfully.
- Avoid adding new `useEffect` unless necessary; prefer fewer effects.
- Avoid nested ternary operators.

---

## Scope (files recently touched)
Frontend:
- `frontend/lib/constants/org-routes.ts`
- `frontend/lib/stores/organization-store.ts`
- `frontend/components/features/org-context/*`
- `frontend/components/features/admin/org-switcher.tsx` (only cleanup as needed)
- `frontend/components/shared/layout/navbar.tsx`
- `frontend/components/providers/client-layout.tsx`

Backend (do not change behavior):
- `backend/app/schemas/location.py`
- `backend/app/models/project.py`

---

## PR Tasks

**Status (2026-01-10):** Completed #3 and #7. Remaining: #1, #2, #4, #5, #6, plus Definition of Done / QA.

### 1) Mechanical cleanup (low risk)
- [ ] Fix formatting in `frontend/components/providers/client-layout.tsx` (indentation + long lines).
- [ ] Ensure consistent import ordering in org-context files:
  - Next/React → third-party → internal `@/...` → relative `./...`
- [ ] Remove comments that restate obvious code.

### 2) Organization store: DRY + no magic strings
File: `frontend/lib/stores/organization-store.ts`
- [ ] Introduce `SELECTED_ORG_STORAGE_KEY` constant (avoid repeating `"selected_org_id"`).
- [ ] Extract `resetScopedStores()` helper used by both `selectOrganization` and `clearSelection`.
- [ ] Simplify modal state:
  - If the only supported reason is switching, replace `modalReason` with a boolean and rename APIs to something explicit:
    - `isOrgSwitchModalOpen`, `openOrgSwitchModal()`, `closeOrgSwitchModal()`
  - If you keep a reason, make it a real discriminated union (no `null`-everywhere) and keep naming explicit.

### 3) `OrgContextGuard`: reduce state + effects
File: `frontend/components/features/org-context/org-context-guard.tsx`
- [x] Replace `orgsLoading/orgsLoaded/invalidOrgDetected` with:
  - a single status (e.g. `orgsStatus: "idle" | "loading" | "loaded"`)
  - a single `requiredErrorMessage: string | null`
- [x] Collapse the multi-effect flow into one effect that:
  - loads organizations when the guard applies (super admin + authenticated + non-exempt route)
  - after load, validates `selectedOrgId` against `organizations` and clears invalid selection
- [ ] Remove conditional prop spreads; pass `errorMessage={requiredErrorMessage ?? undefined}` explicitly.
- [x] Make selection handling explicit:
  - clear any `requiredErrorMessage` on successful selection
  - keep existing toast copy

### 4) `OrgSelectorContent`: remove redundant empty handling
File: `frontend/components/features/org-context/org-selector-content.tsx`
- [ ] Remove duplicate empty rendering.
  - Use `CommandEmpty` as the single empty-state source.
  - Do not separately render an empty message inside a `CommandGroup` when `organizations.length === 0`.
- [ ] Replace skeleton magic numbers with a constant (e.g. `const SKELETON_ROWS = 3`).
- [ ] Improve readability by computing `title/description` variables instead of ternaries in JSX.

### 5) `OrgRequiredScreen`: clarity pass
File: `frontend/components/features/org-context/org-required-screen.tsx`
- [ ] Extract `title` and `description` variables (avoid inline ternaries).
- [ ] Make `handleSelect()` a named function with explicit return type.
- [ ] Avoid passing props that equal the default unless it helps comprehension.

### 6) Switching modal + badge: align names + keep behavior
Files:
- `frontend/components/features/org-context/org-selection-modal.tsx`
- `frontend/components/features/org-context/org-context-badge.tsx`
- [ ] If store APIs were renamed in task #2, update call sites.
- [ ] Keep modal dismiss behavior exactly the same.
- [ ] Keep toast copy exactly the same.

### 7) NavBar: avoid 400 spam on exempt routes (no hooks rule violations)
Problem: `NavBar` always calls `useEnsureProjectsLoaded()`, even when super admin has no org selected.

File: `frontend/components/shared/layout/navbar.tsx`
- [x] Add a small component:
  - `function EnsureProjectsLoaded(): null { useEnsureProjectsLoaded(); return null; }`
- [x] Render it conditionally without calling hooks conditionally:
  - `const shouldAutoLoadProjects = !isSuperAdmin || Boolean(selectedOrgId);`
  - `{shouldAutoLoadProjects ? <EnsureProjectsLoaded /> : null}`

This should not change visible UI - it only prevents failing API calls when org context is missing.

---

## Definition of Done
- [ ] `cd frontend && npm run check:ci` passes.
- [ ] No behavior regressions:
  - Super admin on protected routes without org sees blocking `OrgRequiredScreen`.
  - Selecting org loads normal app and shows org badge.
  - Switching org resets scoped stores and refreshes data.
  - Exempt routes remain accessible.
- [ ] Console/network: no repeated 400 spam when super admin has no org selected (especially on `/admin/*`).
- [ ] Code quality: no `any`, minimal `useEffect`, no nested ternaries, clear naming.

## Manual QA checklist
1) Super admin without org → visit `/dashboard` → see `OrgRequiredScreen` and **no navbar**.
2) Click an org → verify toast → page loads normally.
3) Click org badge → switch org → verify stores reset + data reload.
4) Clear org context (if UI supports it) and visit `/admin/organizations` → ensure no 400 spam.
