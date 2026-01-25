# Frontend Improvements - Phase 2 (A+B+C)

**Selected:** Performance + Error Handling + Accessibility (~4.5h)

---

## Phase A: Performance (2h)

### A1. CompanyCard - useMemo instead of useEffect+useState
**File:** `components/features/companies/company-card.tsx:46-55`
```typescript
// ❌ Before: O(n) filter on every render
useEffect(() => {
  const filtered = allProjects.filter(...).sort(...).slice(0, 2);
  setRecentAssessments(filtered);
}, [allProjects, company.name]);

// ✅ After: memoized computation
const recentAssessments = useMemo(() =>
  allProjects.filter(p => p.client === company.name)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 2),
  [allProjects, company.name]
);
```

### A2. OrgSwitcher - remove circular dependency
**File:** `components/features/admin/org-switcher.tsx:67-91`
- Remove `selectedOrgId` from `fetchOrganizations` dependency array
- It causes refetch loop when org changes

### A3. FlexibleDataCapture - lazy useState init
**File:** `components/features/technical-data/components/data-capture/flexible-data-capture.tsx:37-51`
- Move expensive filtering out of useState initializer
- Use arrow function to defer computation

---

## Phase B: Error Handling (1h)

### B1. Auth API - log silent errors
**File:** `lib/api/auth.ts`
- Lines ~141-143, ~226-228 have `catch (_error) { return; }`
- Add `logger.error("Auth operation failed", error)` before return

### B2. Dashboard - add error boundary
**File:** `app/dashboard/page.tsx`
- Wrap main content in `<SectionErrorBoundary sectionName="Dashboard">`
- Import from `@/components/features/proposals/overview/section-error-boundary`

---

## Phase C: Accessibility (1.5h)

### C1. Table count - aria-live
**File:** `app/admin/users/page.tsx:352-356`
```typescript
// ❌ Before
<p className="text-sm text-muted-foreground">
  Showing {filtered} of {total}
</p>

// ✅ After
<p className="text-sm text-muted-foreground" role="status" aria-live="polite">
  Showing {filtered} of {total}
</p>
```

### C2. Create Admin Dialog - focus management
**File:** `app/admin/users/components/create-admin-dialog.tsx`
- Add `useRef` for first input
- Add `useEffect` to focus on dialog open
- Use `onOpenAutoFocus` from Radix Dialog if available

### C3. Reset Password Dialog - aria-busy
**File:** `app/admin/users/components/reset-password-dialog.tsx:115-122`
```typescript
<Button aria-busy={submitting} disabled={submitting}>
```

---

## Files to Modify

1. `components/features/companies/company-card.tsx`
2. `components/features/admin/org-switcher.tsx`
3. `components/features/technical-data/components/data-capture/flexible-data-capture.tsx`
4. `lib/api/auth.ts`
5. `app/dashboard/page.tsx`
6. `app/admin/users/page.tsx`
7. `app/admin/users/components/create-admin-dialog.tsx`
8. `app/admin/users/components/reset-password-dialog.tsx`

---

## Verification

1. `bun run check:ci` - must pass
2. Manual: Filter users table → screen reader announces count
3. Manual: Open create admin dialog → first input auto-focused
4. Manual: CompanyCard renders without flicker
