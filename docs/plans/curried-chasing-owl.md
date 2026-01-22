# Archive/Restore/Purge UI/UX Implementation Plan

## Overview
Implement complete UI/UX for archiving entities (Company, Location, Project) with filter toggles, read-only banners, and confirmation dialogs.

---

## 1. New Components

### 1.1 `ArchivedFilterSelect` - Filter Toggle
**File:** `frontend/components/ui/archived-filter-select.tsx`
- Select dropdown: Active (default) | Archived | All
- Reuses existing `Select` from shadcn/ui
- Props: `value`, `onChange`, `className?`

### 1.2 `ArchivedBanner` - Read-Only Banner
**File:** `frontend/components/shared/archived-banner.tsx`
- Warning-styled Alert with Archive icon
- Shows: "This [entity] was archived on [date]"
- Buttons: Restore (outline) + Purge (destructive) - RBAC-gated
- Props: `entityType`, `entityName`, `archivedAt`, `canRestore`, `canPurge`, `onRestore`, `onPurge`, `loading?`

### 1.3 `ConfirmArchiveDialog` - Simple Confirmation
**File:** `frontend/components/ui/confirm-archive-dialog.tsx`
- Pattern: Clone `ConfirmDeleteDialog` with warning styling
- Archive icon + amber/warning colors
- Props: `open`, `onOpenChange`, `onConfirm`, `entityType`, `entityName`, `loading?`

### 1.4 `ConfirmRestoreDialog` - Simple Confirmation
**File:** `frontend/components/ui/confirm-restore-dialog.tsx`
- Similar to archive dialog but with Undo icon + success styling
- Non-destructive action

### 1.5 `ConfirmPurgeDialog` - Strong Confirmation
**File:** `frontend/components/ui/confirm-purge-dialog.tsx`
- Destructive AlertDialog requiring exact name match
- Input field: "Type '[entityName]' to confirm"
- Delete button disabled until exact match
- Warning: "This will permanently delete [entityName] and ALL associated data. Cannot be undone."

---

## 2. UI Component Updates

### 2.1 Add `warning` variant to Alert
**File:** `frontend/components/ui/alert.tsx`
```tsx
warning: "border-warning/50 bg-warning/10 text-warning-foreground [&>svg]:text-warning"
```

---

## 3. Store Modifications

### 3.1 `project-store.ts`
- Add `archived?: ArchivedFilter` to `filters` type
- Update `setFilter` key union to include `"archived"`
- Pass `archived` filter to `projectsAPI.getProjects()`
- Update `loadDashboardStats(archived?)` to accept filter
- Add actions: `archiveProject`, `restoreProject`, `purgeProject`

### 3.2 `company-store.ts`
- Add `archivedFilter: ArchivedFilter` state
- Update `loadCompanies(archived?)` to pass filter
- Add `setArchivedFilter` action
- Add actions: `archiveCompany`, `restoreCompany`, `purgeCompany`

### 3.3 `location-store.ts`
- Update `loadAllLocations(archived?)` to accept filter
- Update `loadLocationsByCompany(companyId, archived?)` to accept filter
- Add actions: `archiveLocation`, `restoreLocation`, `purgeLocation`

---

## 4. Permission Hook Updates

**File:** `frontend/lib/hooks/use-permissions.ts`

Add methods:
```tsx
// Projects - owner + admin can archive/restore
canArchiveProject(project): boolean  // isAdmin || project.createdByUserId === user?.id
canRestoreProject(project): boolean  // same as archive
canPurgeProject(): boolean           // isAdmin only

// Companies/Locations - admin only
canArchiveCompany(): boolean         // isAdmin
canRestoreCompany(): boolean         // isAdmin
canPurgeCompany(): boolean           // isAdmin
canArchiveLocation(): boolean        // isAdmin
canRestoreLocation(): boolean        // isAdmin
canPurgeLocation(): boolean          // isAdmin
```

---

## 5. List Page Modifications

### 5.1 Companies List (`frontend/app/companies/page.tsx`)
- Add `archivedFilter` state (default: "active")
- Add `ArchivedFilterSelect` next to search bar
- Update `loadCompanies(archivedFilter)` in useEffect

### 5.2 Dashboard Projects (`frontend/app/dashboard/page.tsx`)
- Add `archived` to project filters
- Add `ArchivedFilterSelect` to filter bar
- Update `loadDashboardStats(archived)` to respect filter

### 5.3 Company Detail - Locations (`frontend/app/companies/[id]/page.tsx`)
- Add `archivedFilter` state for locations section
- Add `ArchivedFilterSelect` to locations header
- Pass filter to `loadLocationsByCompany()`

---

## 6. Detail Page Modifications

### 6.1 Project Header (`frontend/components/features/projects/project-header.tsx`)
- Check `project.archivedAt` for archived state
- Render `ArchivedBanner` above header if archived
- Wrap Edit/Delete buttons with disabled state + tooltip when archived
- Add "Archive" to dropdown menu (when not archived)
- RBAC-gate Restore/Purge in banner

### 6.2 Project Tabs (`frontend/components/features/projects/project-tabs.tsx`)
- Pass `isArchived` prop to child components
- Disable: file uploads, proposal generation, edits

### 6.3 Company Detail (`frontend/app/companies/[id]/page.tsx`)
- Check `currentCompany.archivedAt`
- Render `ArchivedBanner` if archived
- Disable Edit button when archived
- Add Archive action (admin only, when not archived)

### 6.4 Location Detail (`frontend/app/companies/[id]/locations/[locationId]/page.tsx`)
- Check `currentLocation.archivedAt`
- Render `ArchivedBanner` if archived
- Disable contact editing, project creation when archived
- Add Archive action (admin only)

---

## 7. Disabled Button Pattern

Use Tooltip wrapper for disabled buttons:
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <span tabIndex={isArchived ? 0 : undefined}>
      <Button disabled={isArchived} ...>Edit</Button>
    </span>
  </TooltipTrigger>
  {isArchived && <TooltipContent>Project is archived</TooltipContent>}
</Tooltip>
```

---

## 8. Implementation Order

1. **Core Components** - alert variant, filter select, banner, dialogs
2. **Permissions** - add archive/restore/purge checks to use-permissions
3. **Stores** - add archived filter + archive/restore/purge actions
4. **Project Flow** - header banner, disabled actions, dropdown menu
5. **Company/Location Flow** - detail pages + list filters
6. **Dashboard** - filter integration + stats

---

## 9. Critical Files

| Category | File |
|----------|------|
| New Components | `components/ui/archived-filter-select.tsx` |
| | `components/shared/archived-banner.tsx` |
| | `components/ui/confirm-archive-dialog.tsx` |
| | `components/ui/confirm-restore-dialog.tsx` |
| | `components/ui/confirm-purge-dialog.tsx` |
| Modified UI | `components/ui/alert.tsx` |
| Stores | `lib/stores/project-store.ts` |
| | `lib/stores/company-store.ts` |
| | `lib/stores/location-store.ts` |
| Hooks | `lib/hooks/use-permissions.ts` |
| Pages | `components/features/projects/project-header.tsx` |
| | `components/features/projects/project-tabs.tsx` |
| | `app/companies/[id]/page.tsx` |
| | `app/companies/[id]/locations/[locationId]/page.tsx` |
| | `app/companies/page.tsx` |
| | `app/dashboard/page.tsx` |

---

## 10. Verification

1. **Filter toggles**: Switch between Active/Archived/All on each list, verify correct items shown
2. **Stats**: Verify dashboard stats reflect current filter
3. **Banners**: Archive an entity, navigate to detail, verify banner appears
4. **Disabled state**: Verify edit/delete buttons disabled on archived entities with tooltip
5. **Restore**: Click Restore on archived entity, verify returns to active list
6. **Purge**: Verify confirmation requires exact name match, entity permanently deleted
7. **RBAC**: Verify non-admin cannot archive companies/locations, owner can archive own projects
8. Run `bun run check:ci` - all lint/type checks pass
