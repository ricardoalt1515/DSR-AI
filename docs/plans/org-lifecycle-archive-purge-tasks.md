# Tasks: Organization Lifecycle (Archive, Restore, Purge-Force)

Source spec: `docs/plans/org-lifecycle-archive-purge-spec.md`
Target: implementation-ready atomic tasks for implementer handoff.

## Sprint 1 - Backend Model + Migration

### T1.1 Add org archive metadata columns
- Files:
  - `backend/app/models/organization.py`
  - `backend/alembic/versions/<new_revision>.py`
- Change:
  - add `archived_at`, `archived_by_user_id`
  - add indexes needed for active/inactive listing
- Acceptance:
  - migration applies/rolls back cleanly
  - model loads without typing/lint errors
- Validation:
  - `cd backend && make check-ci`

### T1.2 Add lifecycle invariant DB constraint
- Files:
  - `backend/alembic/versions/<same_or_new_revision>.py`
- Change:
  - run mandatory backfill first to satisfy invariant on existing rows
  - add check constraint:
    - active: `is_active=true` => `archived_at is null`
    - archived: `is_active=false` => `archived_at is not null`
- Acceptance:
  - backfill leaves zero rows violating invariant before constraint creation
  - generic org update path is lifecycle-safe before/with constraint rollout
  - invalid state insert/update fails at DB layer
- Validation:
  - migration test in local DB + `cd backend && make check-ci`

## Sprint 2 - Backend API Lifecycle Endpoints

### T2.1 Extract org lifecycle service
- Files:
  - `backend/app/services/organization_lifecycle_service.py` (new)
- Change:
  - implement pure service functions:
    - `archive_organization(...)`
    - `restore_organization(...)`
    - `purge_force_organization(...)`
- Acceptance:
  - endpoints call service; no heavy business logic in router

### T2.2 Add archive endpoint
- Files:
  - `backend/app/api/v1/organizations.py`
  - `backend/app/schemas/organization.py` (if response/contracts needed)
- Change:
  - add `POST /api/v1/organizations/{org_id}/archive`
  - superadmin-only
  - idempotent behavior
  - block archive if org has active users
- Acceptance:
  - archived org has `is_active=false`, metadata set

### T2.3 Add restore endpoint
- Files:
  - `backend/app/api/v1/organizations.py`
- Change:
  - add `POST /api/v1/organizations/{org_id}/restore`
  - superadmin-only
  - idempotent behavior
  - clears archive metadata
- Acceptance:
  - restored org has `is_active=true`, archive metadata null

### T2.5 Add list filtering defaults
- Files:
  - `backend/app/api/v1/organizations.py`
- Change:
  - `GET /api/v1/organizations` default active only
  - `include_inactive=true` supported only for superadmin
- Acceptance:
  - default response excludes archived orgs
  - non-superadmin with include flag gets 403

### T2.6 Enforce lifecycle field immutability on generic updates
- Files:
  - `backend/app/schemas/organization.py`
  - `backend/app/api/v1/organizations.py`
- Change:
  - remove/ignore direct `is_active` writes from generic org update payloads
  - return typed error `ORG_LIFECYCLE_FIELD_IMMUTABLE` on direct mutation attempts
- Acceptance:
  - `PATCH /api/v1/organizations/{org_id}` cannot toggle lifecycle state directly
  - lifecycle state only changes through archive/restore/purge endpoints

## Sprint 3 - Backend Purge-Force

### T3.1 Define purge-force request contract
- Files:
  - `backend/app/schemas/organization.py` (or new `organization_lifecycle.py`)
- Change:
  - request fields:
    - `confirm_name`
    - `confirm_phrase`
    - `reason`
    - `ticket_id`
  - enforce validation constraints (length/exact phrase format)
  - lock exact matching contract:
    - `confirm_name` trimmed + case-sensitive exact organization name
    - `confirm_phrase` exact `PURGE <current_org_slug>`
  - lock retention clock contract: DB timestamp (`CURRENT_TIMESTAMP`), not app clock

### T3.2 Add purge-force endpoint
- Files:
  - `backend/app/api/v1/organizations.py`
  - auth dependency file if needed (`backend/app/api/dependencies.py`)
- Change:
  - add `POST /api/v1/organizations/{org_id}/purge-force`
  - require `SuperAdminOnly`
  - retention check 30 days from `archived_at` using DB time
  - org not found returns 404

### T3.3 Implement transactional deletion contract
- Files:
  - `backend/app/services/organization_lifecycle_service.py`
- Change:
  - lock org row `FOR UPDATE`
  - recheck preconditions in transaction
  - delete tenant data in explicit order
  - commit once
  - run storage cleanup best-effort with retry logs
- Acceptance:
  - no partial DB state on failure pre-commit
  - purge succeeds cleanly when preconditions pass

### T3.4 Add typed errors + rate limits + audit logs
- Files:
  - `backend/app/api/v1/organizations.py`
  - service + logger usage
- Change:
  - stable error codes for guard failures
  - include explicit codes in contract (`ORG_NOT_FOUND`, `ORG_ACTIVE_USERS_BLOCKED`, `ORG_NOT_ARCHIVED`, `ORG_RETENTION_NOT_MET`, `PURGE_CONFIRM_NAME_MISMATCH`, `PURGE_CONFIRM_PHRASE_MISMATCH`, `FORBIDDEN_SUPERADMIN_REQUIRED`)
  - rate limits on archive/restore/purge-force
  - structured logs: attempt/success/failure

## Sprint 4 - Frontend Admin UX

### T4.1 Update org API client
- Files:
  - `frontend/lib/api/organizations.ts`
- Change:
  - add methods:
    - `archiveOrganization(orgId)`
    - `restoreOrganization(orgId)`
    - `purgeForceOrganization(orgId, payload)`
    - `listOrganizations({ includeInactive })`

### T4.2 Default list hides archived + toggle
- Files:
  - org admin page(s) where organizations are listed
- Change:
  - default call without `includeInactive`
  - toggle for superadmin to show archived
- Acceptance:
  - archived orgs hidden by default

### T4.3 Add archive/restore actions
- Files:
  - `frontend/app/admin/organizations/[id]/page.tsx`
  - related components
- Change:
  - add Archive and Restore actions
  - optimistic or refetch-based refresh after success

### T4.4 Add purge-force danger dialog
- Files:
  - admin org components (new modal component if needed)
- Change:
  - required inputs:
    - confirm_name
    - confirm_phrase
    - reason
    - ticket_id
  - clear irreversible warning
  - map backend typed errors to actionable messages

## Sprint 5 - Tests + Docs + Rollout

### T5.1 Backend tests
- Files:
  - `backend/tests/test_organizations_lifecycle.py` (new)
- Cases:
  - archive success/idempotent/active-user-block
  - restore success/idempotent
  - list default active-only + include_inactive auth
  - purge-force success after 30 days
  - purge-force rejects (not archived, retention, bad confirm, auth)
  - purge-force org not found returns 404
  - confirm_name/confirm_phrase exact matching contract
  - purge coverage guard: fail if any table in FK closure from Organization/User is not explicitly deleted or FK-cascaded
  - atomicity checks

### T5.2 Frontend checks
- Files:
  - relevant UI tests if present; otherwise smoke/manual test checklist
- Cases:
  - toggle archived visibility
  - purge-force form validation + error rendering

### T5.3 Runbook update
- Files:
  - `docs/agents/workflows.md`
- Change:
  - archive/restore standard path
  - purge-force guarded path
  - SQL break-glass note

### T5.4 Final verification
- Commands:
  - `cd backend && make check-ci`
  - `cd frontend && bun run check:ci`

## Dependency Order

- T1.1 -> T2.1
- T2.1 -> (T2.2, T2.3, T2.5, T2.6)
- T2.6 -> T1.2
- T3.1 -> T3.2 -> T3.3 -> T3.4
- T2.x + T3.x -> T4.x
- all -> T5.x

## Merge Strategy

- PR1: DB/model + archive/restore + list filtering + tests
- PR2: purge-force backend + tests + audit/rate-limit
- PR3: frontend admin UX + docs + final checks
