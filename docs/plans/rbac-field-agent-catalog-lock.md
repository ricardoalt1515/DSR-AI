# RBAC plan: field agent + contractor, client catalog, lock

## Goals (why)
- Field agent/contractor: do 90% ops work; unblock creating projects by allowing company/location create + edit.
- Keep multi-tenant safe: never leak across orgs.
- Avoid future permission whack-a-mole: rules centralized, deny-by-default, tests.
- Protect “official” client catalog used for reports/sync: add lock.

## Current state (what exists)
- Multi-tenant org context: `organization_id` scoping is consistent.
- Projects (“wastestreams”): owner-only (`user_id`) unless `org_admin/superuser`.
- Companies/locations:
  - Read: org-wide (everyone in org).
  - Write: `CurrentClientDataWriter` = only `org_admin/superuser` (blocks field agent from creating catalog entries).
- Location contacts: field agent can CRUD (already implemented + tested).
- Gap: `POST /projects` currently doesn’t enforce role capability (any authenticated user can create if they know a valid `location_id`).

## Target model (simple + maintainable)
### Roles
- Keep both `field_agent` and `contractor` labels.
- Treat both as same capability group: `is_agent = role in {field_agent, contractor}`.

### Resource policies (by action)
**Projects (wastestreams)**
- list/get/update/delete/generate/upload: owner OR `org_admin/superuser`.
- create: `is_agent` OR `org_admin/superuser`.

**Companies**
- list/get: any org member.
- create/update: `is_agent` OR `org_admin/superuser`, unless locked (see below).
- delete: `org_admin/superuser` only.

**Locations**
- list/get: any org member.
- create/update: `is_agent` OR `org_admin/superuser`, unless locked.
- delete: `org_admin/superuser` only.

**Location contacts**
- CRUD: `is_agent` OR `org_admin/superuser` (keep as-is).

**Team members (org users)**
- View/list/create/update team members: `org_admin` only within their org; platform admins manage via admin console.
- Any non-admin (agents, compliance, sales): cannot view or create org team members.
- Hardening: do not expose a user directory endpoint under `/auth/*`; only `/auth/me` profile endpoints.

### Lock semantics (catalog protection)
Lock is per company/location record.
- If `locked_at != NULL`:
  - agents cannot update (reject with 409 or 403; pick one and standardize).
  - org_admin/superuser can update + unlock.
- org_admin/superuser can lock/unlock anytime.
- Purpose: freeze “approved/synced” catalog rows to prevent accidental edits that break reporting/CRM mapping.

## Implementation plan (phased, minimal risk)
### Phase 0 — Align on behavior (no code)
- Locked edit response: **409 Conflict** (resource state blocks the action).
- org_admin/superuser can edit even while locked (no unlock required).
- Lock/unlock: org_admin+superuser only.
- Lock propagation: none (company and locations lock independently).

### Phase 1 — Centralize authz (small refactor)
- Create `backend/app/authz/policies.py`:
  - `is_agent(user)`
  - `can_create_project(user)`
  - `can_create_company(user)`, `can_update_company(user, company)`, `can_delete_company(user)`
  - same for locations
  - `is_locked(record)` helper
- Create dependencies in `backend/app/api/dependencies.py` that call policy functions:
  - `CurrentProjectCreator`
  - `CurrentCompanyCreator`, `CurrentCompanyEditor`, `CurrentCompanyDeleter`
  - `CurrentLocationCreator`, `CurrentLocationEditor`, `CurrentLocationDeleter`
- Rule: endpoints must depend on explicit permission dependency (no “naked CurrentUser” for writes).

### Phase 2 — Unblock agents: company/location writes
- Update endpoints in `backend/app/api/v1/companies.py`:
  - `POST /companies`: allow agent (Creator).
  - `POST /companies/{company_id}/locations`: allow agent (Creator).
  - `PUT /companies/{company_id}` and `PUT /companies/locations/{location_id}`: allow agent (Editor) but block if locked.
  - `DELETE ...`: keep org_admin/superuser only (Deleter).

### Phase 3 — Fix project create capability
- Update `backend/app/api/v1/projects.py`:
  - `POST /projects`: require `CurrentProjectCreator` (agent/admin only).
  - Keep ownership rules for update/delete/get as-is.

### Phase 4 — Add lock fields + endpoints (catalog control)
- DB migration:
  - MVP add to `companies` and `locations`:
    - `created_by_user_id` (nullable FK users)
    - `locked_at` (nullable datetime)
    - `locked_by_user_id` (nullable FK users)
    - `lock_reason` (nullable text/varchar)
- Server behavior:
  - On create: set `created_by_user_id = current_user.id`.
  - Enforce “locked => agents cannot update” (admins can).
- Endpoints (admin only):
  - `POST /companies/{company_id}/lock`, `/unlock`
  - `POST /companies/locations/{location_id}/lock`, `/unlock`
- Optional: include lock state in response models so UI can show “Locked”.

### Phase 5 — Tests (must-have, prevents regressions)
Add `backend/tests/test_company_location_permissions.py`:
- agent can create company + create location.
- agent can update company/location when unlocked.
- agent cannot update company/location when locked.
- agent cannot delete company/location.
- compliance/sales cannot create/update/delete company/location.
- project create: compliance/sales rejected; agent allowed.
- team members: agents cannot list/create; `/auth/*` exposes no user directory.

### Phase 6 — Operational checklist
- Run `cd backend && make check` + tests.
- Deploy migration first, then app code (or use backward-compatible nullable fields).
- Confirm UI flows:
  - agent can create company/location inline before creating project.
  - lock badge + admin-only lock/unlock actions.

## Unresolved questions
- None (decided in Phase 0).
