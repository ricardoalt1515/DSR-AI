# Delete/Archive/Purge policy (multi-tenant)

## Decision summary (final)
- Replace user-facing “delete” with **Archive** (reversible).
- Add **Restore** for archived entities.
- Add **Purge** (hard delete) only for `org_admin/superuser`, UI-confirmed, **requires archived first**.
- Archive is **read-only** (no edits, no new children, no AI runs, no file ops).
- Archive cascades:
  - `Company` archive → archive all `Locations` + all `Projects` under them.
  - `Location` archive → archive all `Projects` in it.
- Default lists/stats **exclude archived**; UI has toggle “Show archived”.
- Scope (minimal): lifecycle only for `Company`, `Location`, `Project`. `Proposal`/`ProjectFile` remain tied to `Project` and are deleted on purge.

## Data model (DB)
- Add archive fields to `companies` and `locations`:
  - `is_archived boolean not null default false`
  - `archived_at timestamptz null`
  - `archived_by_user_id uuid null` (FK users, `ondelete=SET NULL`)
  - `archived_reason varchar(50) null` (`manual|company_archived|location_archived`)
  - Index: `(organization_id, is_archived)`, plus single-column `is_archived` if needed.
- Align `projects` with existing migration `20251114_0907_add_project_lifecycle_archiving.py`:
  - Ensure ORM model includes existing `is_archived`, `archived_at` (and `lifecycle_state` if kept).
  - Add `archived_by_user_id`, `archived_reason` (same semantics as above).
  - Ensure queries/stats filter `is_archived=false` by default.
- Update computed counts to exclude archived by default:
  - `Company.location_count` should count only `Location.is_archived=false`.
  - Location project counts should count only `Project.is_archived=false`.

## Backend API changes (FastAPI)

### Behavior change (important)
- Convert existing DELETE endpoints into **Archive**:
  - `DELETE /companies/{company_id}` → archive company (not purge).
  - `DELETE /companies/locations/{location_id}` → archive location (not purge).
  - `DELETE /projects/{project_id}` → archive project (not purge).
- Update response message strings (“archived” not “deleted”).

### New endpoints
- Restore:
  - `POST /companies/{company_id}/restore`
  - `POST /companies/locations/{location_id}/restore`
  - `POST /projects/{project_id}/restore`
- Purge (hard delete, irreversible; requires archived):
  - `DELETE /companies/{company_id}/purge`
  - `DELETE /companies/locations/{location_id}/purge`
  - `DELETE /projects/{project_id}/purge`
- Purge confirmation (server-side):
  - Request body: `{ "confirm_name": "<exact entity name>" }`
  - Backend validates exact match + permissions + `is_archived=true`.

### List/query filters (default exclude archived)
- Companies:
  - `GET /companies?include_archived=true|false` (default false)
  - `GET /companies/{id}` should return archived too (frontend shows banner).
- Locations:
  - `GET /companies/locations?company_id=...&include_archived=...`
  - `GET /companies/{company_id}` locations list should exclude archived by default (or provide option).
- Projects:
  - `GET /projects?...&include_archived=...` (default false)
  - `GET /projects/stats?include_archived=...` (default false)
  - `GET /projects/{id}` returns archived too (frontend banner + read-only UX).

### Read-only enforcement (server-side)
- Block write operations when target is archived (return 409):
  - Company: update company, create location under company.
  - Location: update location, manage contacts, create project under location.
  - Project: update project, project_data mutations, upload/delete files, generate proposals, delete proposal/file.
- Minimal implementation pattern:
  - Add small guard helpers (e.g., `require_not_archived_company/location/project`) used at top of write endpoints.
  - Prefer fail-fast before doing heavy work (AI jobs, file processing).

### Archive/restore cascade rules (minimal + safe)
- On archive:
  - Set entity `is_archived=true`, `archived_at=now`, `archived_by_user_id=current_user.id`.
  - For cascade, set children archived with `archived_reason`:
    - Company archive sets location `archived_reason="company_archived"`, project `archived_reason="company_archived"`.
    - Location archive sets project `archived_reason="location_archived"`.
- On restore:
  - Restore only children with matching `archived_reason` (prevents resurrecting items archived manually for other reasons).
  - Restore sets `is_archived=false`, clears `archived_at/by/reason`.

### Purge storage cleanup (S3/local)
- Purge must delete physical artifacts:
  - `project_files.file_path`
  - `proposals.pdf_path` and any extra pdf paths stored in `proposal.ai_metadata.pdfPaths` (if present)
- Minimal approach:
  - In purge handler, query and collect all storage keys first.
  - Hard delete DB entity (cascade), commit.
  - Delete storage keys (best-effort) and log failures.
- Add follow-up ops script (optional, not required for MVP):
  - `backend/scripts/cleanup_orphan_storage.py` to scan DB vs bucket and remove orphans (safe guard).

## Frontend (Next.js) changes
- Types:
  - Add `isArchived`, `archivedAt`, `archivedByUserId`, `archivedReason` to company/location/project types.
- UI semantics:
  - Replace “Delete” with “Archive” (copy: reversible; not counted).
  - Add “Show archived” toggle in:
    - Companies list
    - Company detail (locations list)
    - Projects dashboard/list
  - For archived items:
    - Show `Archived` badge + banner on detail pages.
    - Actions: `Restore`, `Permanently delete` (purge).
    - Disable edits + create buttons (read-only).
- Purge confirmation:
  - Modal shows counts (projects/files/proposals) + requires typing exact name.

## Migration & rollout
- Alembic:
  - 1 revision: add company/location archive columns + indexes.
  - 1 revision (if needed): add missing project archive columns + indexes (and update ORM to match existing columns).
  - Backfill defaults: all existing rows `is_archived=false`.
- Deploy order:
  - Backend first (supports include_archived + archive semantics).
  - Frontend next (updates wording + toggles + purge endpoints).

## Tests (minimal, high value)
- Backend:
  - Archiving hides items from list endpoints by default.
  - `include_archived=true` returns them.
  - Restore restores and reappears in default lists.
  - Purge requires archived + confirm_name; deletes DB records and attempts storage cleanup.
  - Write endpoints return 409 when entity is archived (project_data, proposals, files).
- Frontend:
  - Toggle shows archived.
  - Archived banner renders; edit buttons disabled.

## Unresolved questions
- None (policy locked). Optional later: add “Trash/restore window” if users demand it.
