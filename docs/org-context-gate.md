# Organization Context Gate (Super Admin)

## Summary
Super admins can view and manage data across multiple organizations. Before this change, a super admin could navigate to org-scoped pages (Dashboard, Companies, Locations, etc.) without selecting an organization context, which caused backend `400` errors and a broken UX.

This work introduces a **blocking organization context gate** that requires super admins to select an organization before org-scoped UI is allowed to render. It also adds a lightweight org switching UX in the navbar and hardens the codebase for maintainability (DRY, no magic strings, consistent store APIs).

## Problem
### User-facing symptoms
- Navigating as a super admin to data pages without an organization selected resulted in:
  - Empty lists/spinners
  - Console/network spam
  - “Unexpected error” states

### Root cause
- The backend requires super admins to specify the organization via `X-Organization-Id`.
- The frontend only attaches that header when `selected_org_id` exists in localStorage.
- Some layout components (notably `NavBar`) auto-load data on mount (e.g. projects/stats), so even “admin-only” routes could trigger org-scoped calls and fail.

## Solution (High-level)
### 1) Blocking guard (prevents bad requests)
- Added an `OrgContextGuard` that **blocks rendering** of protected content for super admins until an organization is selected.
- When org context is missing, it renders a full-page `OrgRequiredScreen` instead of the normal layout.
- This is intentionally **not** an overlay/modal: blocking prevents the `NavBar` and its data-loading hooks from mounting and firing requests without org context.

### 2) Org switching (good UX)
- Added a subtle `OrgContextBadge` in the navbar for super admins with an org selected.
- Clicking the badge opens a `OrgSelectionModal` to switch organizations.

### 3) Prevent 400 spam on exempt routes
- `NavBar` previously ran `useEnsureProjectsLoaded()` unconditionally.
- Updated to mount that hook only when:
  - the user is not a super admin, or
  - the super admin has selected an org.

### 4) Maintainability improvements
- Centralized the org storage key (no magic strings).
- Refactored organization store to be more DRY and explicit.
- Removed direct UI mutation of Zustand state in favor of store actions.

## What changed (Implementation Notes)
### Org context selection flow
- **Super admin visits org-scoped route without org selected** → `OrgRequiredScreen` is shown.
- **User selects org** → store persists selection, dependent stores reset, normal layout renders.

### Key frontend building blocks
- `OrgContextGuard`: route + role checks, blocks render when org is required.
- `OrgRequiredScreen`: full-page org picker.
- `OrgContextBadge`: shows active org in navbar.
- `OrgSelectionModal`: switches org context.

### Store + constants
- Added `SELECTED_ORG_STORAGE_KEY` constant and used it across the app.
- `useOrganizationStore` improvements:
  - `resetScopedStores()` helper to avoid duplication.
  - `isOrgSwitchModalOpen` + `openOrgSwitchModal()` / `closeOrgSwitchModal()`.
  - `upsertOrganization(org)` to keep store updates inside store actions.

## Files changed (key)
Frontend:
- `frontend/components/features/org-context/org-context-guard.tsx`
- `frontend/components/features/org-context/org-required-screen.tsx`
- `frontend/components/features/org-context/org-selection-modal.tsx`
- `frontend/components/features/org-context/org-context-badge.tsx`
- `frontend/components/features/org-context/org-selector-content.tsx`
- `frontend/components/shared/layout/navbar.tsx`
- `frontend/components/providers/client-layout.tsx`
- `frontend/lib/stores/organization-store.ts`
- `frontend/lib/api/client.ts`
- `frontend/lib/contexts/auth-context.tsx`
- `frontend/lib/constants/storage.ts`
- `frontend/components/features/admin/org-switcher.tsx`

Documentation / plan tracking:
- `tasks/2026-01-10-org-context-gate-simplification-pr-tasks.md`

## Verification
### Automated checks
- `cd frontend && npm run check:ci`

### Manual QA checklist
1) Super admin with no org selected:
   - Go to `/dashboard` → should see `OrgRequiredScreen` (no navbar).
2) Select an org:
   - Should see toast confirming selection.
   - Page should render normally with data.
3) Switch org:
   - Click navbar org badge → switch org → dependent stores reset and data reloads.
4) Exempt routes:
   - Clear org context, go to `/admin/organizations`.
   - Should not spam 400 requests for org-scoped endpoints.

## Why this approach
- **Fail fast / prevent errors:** block rendering before any org-scoped requests fire.
- **Clean separation of concerns:** selection UI is isolated; header attachment is centralized.
- **DRY + consistency:** single storage key constant, store actions own store updates.
- **Scales with product growth:** adding new org-scoped pages is safe by default.

## Follow-ups (optional)
- UX polish: confirm empty-state visuals when there are no organizations.
- Add recent orgs / pinning if super admins commonly manage many orgs.
- Consider analytics/telemetry for org-switch events (if needed for audit).
