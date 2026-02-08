# Plan/Spec: Organization Lifecycle (Archive, Restore, Purge-Force)

Goal: keep org management clean in UI, preserve safe default archive flow, allow superadmin-only hard delete for hygiene after retention.

## Overview

- Keep archive/restore as normal lifecycle for organizations.
- Hide archived orgs by default in superadmin UI/API lists.
- Add superadmin-only `purge-force` for irreversible cleanup after 30-day retention.
- Require strong confirmation, strict RBAC, full audit trail.

## Scope

In scope
- Organization lifecycle endpoints and policy.
- Organization archive metadata.
- Superadmin list filtering behavior.
- Purge-force orchestration and guardrails.
- Audit logging and operational runbook updates.

Out of scope (v1)
- Two-person approval workflows.
- Async purge jobs/state machine.
- Complex legal/compliance subsystem.
- Step-up auth flow.

## Domain Model Changes

Target file: `backend/app/models/organization.py`

- Add nullable fields:
  - `archived_at: datetime | None`
  - `archived_by_user_id: UUID | None` (FK `users.id`, `ondelete=SET NULL`)
- Keep existing `is_active` for compatibility.
- `is_active` is lifecycle-managed only (archive/restore/purge), not writable from generic org update endpoints.
- Lifecycle invariant:
  - active org: `is_active=true`, `archived_at is null`
  - archived org: `is_active=false`, `archived_at not null`
- Restore must clear `archived_at`, `archived_by_user_id`.

DB invariant (required)
- Add check constraint to prevent drift:
  - `(is_active = true AND archived_at IS NULL) OR (is_active = false AND archived_at IS NOT NULL)`

Migration
- Add columns + indexes (`archived_at`, optionally compound with `is_active`).
- Backfill consistency is mandatory before enabling check constraint.

## API Contract

Base: `backend/app/api/v1/organizations.py`

### 1) Archive

- `POST /api/v1/organizations/{org_id}/archive`
- Auth: `SuperAdminOnly`
- Behavior:
  - Idempotent; returns `200` + `OrganizationRead` current state.
  - Block archive if organization has active users (`users.organization_id = org_id AND users.is_active = true`).
  - Set `is_active=false`, set archive metadata.
  - Block if org not found (404).

### 2) Restore

- `POST /api/v1/organizations/{org_id}/restore`
- Auth: `SuperAdminOnly`
- Behavior:
  - Idempotent; returns `200` + `OrganizationRead` current state.
  - Set `is_active=true`, clear archive metadata.
  - If restore violates constraints/business invariants, return 409 with typed code.

### 3) Purge-Force (irreversible)

- `POST /api/v1/organizations/{org_id}/purge-force`
- Auth: `SuperAdminOnly`.
- Request body required:
  - `confirm_name: string`
  - `confirm_phrase: "PURGE <org_slug>"` (exact match)
  - `reason: string` (min 20, max 500)
  - `ticket_id: string` (min 3, max 100)
- Preconditions:
  - org exists and archived.
  - `archived_at <= (CURRENT_TIMESTAMP - INTERVAL '30 days')` using DB clock.
- Execution:
  - Single DB transaction.
  - `SELECT organization ... FOR UPDATE`.
  - Revalidate preconditions in-transaction.
  - Delete in dependency order (deep children first).
  - Commit.
  - Then external object-storage cleanup with retry logging.
- Response:
  - 204 on success.
  - 404 when org does not exist.
  - Typed error responses for guard failures.

Validation contract (required)
- `confirm_name`: compare to `organization.name` after trim; case-sensitive exact match.
- `confirm_phrase`: exact `PURGE <current_org_slug>` at request time.
- retention check uses DB timestamp (`CURRENT_TIMESTAMP`), never app server clock.

Typed error code contract (required)
- Error envelope uses platform standard: `{"error":{"code":"...","message":"...","details":{...}}}`.
- `ORG_NOT_FOUND` -> 404
- `ORG_ACTIVE_USERS_BLOCKED` -> 409
- `ORG_NOT_ARCHIVED` -> 409
- `ORG_RETENTION_NOT_MET` -> 409
- `PURGE_CONFIRM_NAME_MISMATCH` -> 400
- `PURGE_CONFIRM_PHRASE_MISMATCH` -> 400
- `FORBIDDEN_SUPERADMIN_REQUIRED` -> 403
- `ORG_LIFECYCLE_FIELD_IMMUTABLE` -> 400

### 4) List Organizations default behavior

- `GET /api/v1/organizations`
- Default: return active orgs only.
- Optional query: `include_inactive=true` allowed only for superadmins.
- Non-superadmin using `include_inactive=true` -> 403.

### 5) Lifecycle write guard

- `PATCH /api/v1/organizations/{org_id}` rejects direct `is_active` mutation (`ORG_LIFECYCLE_FIELD_IMMUTABLE`).

## Purge Execution Contract (v1)

Implement in service layer (new file suggested: `backend/app/services/organization_lifecycle_service.py`).

- lock org row
- revalidate archive + retention + auth guards in-transaction
- delete dependent rows in strict order with explicit table list owned by service
- all deletes constrained by tenant scope (`organization_id = org_id`) where column exists
- commit once, then run object storage cleanup (best-effort + retry logging)
- purge implementation must fail tests if any table in FK closure from `Organization` or `User` roots is neither explicitly deleted nor covered by FK cascade

Initial explicit delete set (must be validated in tests)
- `TimelineEvent`
- `ProjectFile`
- `Proposal`
- `Project`
- `Location`
- `Company`
- `User`
- `Organization`

Notes
- prefer explicit delete order in service for predictability.
- keep operation idempotent at API level.
- apply lock/statement timeout to reduce contention blast radius.

## Security + Policy

- Purge-force is restricted to superadmins.
- Purge-force requires `reason` + `ticket_id` + confirm fields.
- Emit audit event for every attempt (success/failure).
- Rate limits: archive/restore `10/min` per user, purge-force `5/min` per user.

## Observability / Audit

Event names (structured logs):
- `organization_archive_attempt`
- `organization_restore_attempt`
- `organization_purge_force_attempt`

Fields (minimum):
- `actor_user_id`, `org_id`, `org_slug`, `request_id`, `result`, `error_code`
- `reason`, `ticket_id` (for purge-force)
- `retention_days`, `archived_at`, `duration_ms`, `deleted_counts`

## Frontend UX (Superadmin)

Targets:
- `frontend/app/admin/organizations/[id]/page.tsx`
- org list page component/API client

Behavior:
- org list default excludes archived.
- toggle: `Show archived` (superadmin only).
- org detail actions:
  - Archive
  - Restore
  - Purge-force (danger dialog; confirm_name + confirm_phrase + reason + ticket_id)
- clear warnings: purge-force irreversible.

## Testing Strategy

Backend tests (`backend/tests/`)
- archive success/idempotent/not-found/authz
- restore success/idempotent/conflict/authz
- list default active-only + include_inactive gating
- purge-force success path after 30 days
- purge-force rejects:
  - not archived
  - retention not met
  - bad confirmation fields
  - non-superadmin
- transaction atomicity on purge failure
- purge-force org not found returns 404

Frontend checks
- form validation for archive/purge-force
- render/mapping typed errors
- active-only default + archived toggle behavior

## Rollout Plan

Phase 1 (backend)
- migration + model updates
- lifecycle service + endpoints
- audit logs
- tests green (`cd backend && make check-ci`)

Phase 2 (frontend)
- list filtering + toggle
- archive/restore/purge-force dialogs
- error handling
- checks green (`cd frontend && bun run check:ci`)

Phase 3 (ops)
- update `docs/agents/workflows.md` runbook
- deploy to staging; run manual smoke scenarios
- deploy prod

## Acceptance Criteria

- Archived orgs no longer clutter default superadmin lists.
- Superadmins can archive/restore orgs safely.
- Superadmins can purge-force archived orgs only after 30 days.
- Purge-force requires explicit confirmations + reason + ticket.
- Purge-force deletes tenant data predictably and atomically (DB), with audited storage cleanup attempts.
- Full audit trail exists for archive/restore/purge-force attempts.

## Unresolved Questions

- None.
