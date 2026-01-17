# Location Contacts per Company Location (Phase 1)

## Context
- Today, contacts are stored only at the Company level (`Company.contact_*`).
- Multi-location companies need separate contacts per Location (e.g., GE Vernova: each plant has its own contact).
- The current system provides no way to add/assign contacts at the Location level.

## Goal
Add the ability to create, view, edit, and delete **location-specific contacts** while keeping existing company-level contacts unchanged.

## Non-goals
- No “primary contact” per location (phase 2).
- No CRM/HubSpot sync changes (phase 2).
- No backfill/migration of existing company contacts into locations.

## Acceptance Criteria
- Users can add **one or more** contacts to an individual location.
- Contacts assigned to one location **do not** apply to other locations.
- Users can view and edit location contacts from the **Location Details** page.
- Existing company-level contacts remain unaffected.

## Design Principles
- DRY: centralize permission checks in dependencies.
- Fail fast: validate org/location/contact ownership early; return 404/403 consistently.
- No magic strings: avoid inline role strings in frontend.
- Keep scope tight: no special-case paths; reuse existing patterns.

## Implementation Reminders (avoid regressions)
- Backend: in `GET /companies/locations/{location_id}`, use `selectinload(Location.contacts)` (avoid async lazy-load issues).
- Frontend: expose `canWriteLocationContacts` from `useAuth()` (don’t hardcode `"field_agent"` in pages/components).
- Frontend: after contact create/update/delete, refresh via `loadLocation(locationId)` (keep state consistent without a new store).

---

## Backend

### Data Model
Create a new table/model: `LocationContact` (1 Location → many contacts).

Suggested fields:
- `id: UUID` (PK)
- `organization_id: UUID` (tenant scope)
- `location_id: UUID` (FK to locations, scoped by org)
- `name: str` (required)
- `email: str | None`
- `phone: str | None`
- `title: str | None`
- `notes: str | None`
- timestamps via `BaseModel` (`created_at`, `updated_at`)

Constraints:
- Composite FK: (`location_id`, `organization_id`) → `locations(id, organization_id)` with `ondelete="CASCADE"`.
- Index: (`organization_id`, `location_id`).

SQLAlchemy:
- Add `Location.contacts` relationship: `cascade="all, delete-orphan"`, `lazy="selectin"`, stable ordering.

### Schemas
Add `backend/app/schemas/location_contact.py`:
- `LocationContactCreate`
- `LocationContactUpdate` (all optional)
- `LocationContactRead` (includes `id`, timestamps)

Update `backend/app/schemas/location.py`:
- Extend `LocationDetail` with `contacts: list[LocationContactRead] = Field(default_factory=list)`

### API
Read:
- `GET /api/v1/companies/locations/{location_id}`
  - Include `contacts` in `LocationDetail`.
  - Ensure `selectinload(Location.contacts)` is included to avoid lazy-load issues in async.

Write:
- `POST /api/v1/companies/locations/{location_id}/contacts`
- `PUT /api/v1/companies/locations/{location_id}/contacts/{contact_id}`
- `DELETE /api/v1/companies/locations/{location_id}/contacts/{contact_id}`

Validation rules (fail fast):
- Always scope by `organization_id == org.id`.
- Update/delete must ensure the contact belongs to the location and org (otherwise 404).

### Permissions (Capability-based naming)
We want Field Agents to capture contacts during intake.

Add capability-focused dependencies in `backend/app/api/dependencies.py`:

1) `CurrentClientDataWriter`
- For writing Companies/Locations (master client data).
- Policy (current): `ORG_ADMIN` or `is_superuser`.

2) `CurrentLocationContactsWriter`
- For writing Location Contacts.
- Policy (current): `FIELD_AGENT` or `ORG_ADMIN` or `is_superuser`.

Notes:
- The dependency names intentionally avoid embedding specific roles in the name (roles may evolve).
- Keep the permission logic in one place; endpoints only reference the capability dependency.

### Migration
Add Alembic migration to create `location_contacts`.
- Ensure FK + index.
- No backfill needed.

### Tests
Add backend tests that cover:
- `FIELD_AGENT` can create/update/delete a location contact in their org.
- A non-writer role (e.g., `COMPLIANCE`) receives 403 on contact writes.
- `GET /companies/locations/{id}` returns `contacts: []` when none exist and includes contacts when present.

---

## Frontend

### Types
Update `frontend/lib/types/company.ts`:
- Add `LocationContact` interface.
- Extend `LocationDetail` with `contacts?: LocationContact[]`.

### Auth (avoid magic strings)
Update `useAuth()` (or a small helper) to expose role-derived capabilities:
- `canWriteClientData`
- `canWriteLocationContacts`

These are computed once from `user.role`/`user.isSuperuser` and reused across pages.

### API Client
Update `frontend/lib/api/companies.ts`:
- `LocationsAPI.createContact(locationId, data)`
- `LocationsAPI.updateContact(locationId, contactId, data)`
- `LocationsAPI.deleteContact(locationId, contactId)`

### UI (Location Details)
File: `frontend/app/companies/[id]/locations/[locationId]/page.tsx`
- Add a “Contacts” card:
  - list contacts (Name, Title, Email, Phone, Notes)
  - “Add contact” button (only if `canWriteLocationContacts`)
  - per-contact “Edit/Delete” actions (only if `canWriteLocationContacts`)
- Avoid massive JSX: extract `LocationContactsCard` + `LocationContactDialog` components.
- After create/update/delete: call `loadLocation(locationId)` to refresh (no new store required).

---

## Definition of Done
- Backend:
  - Migration applied.
  - Location detail includes `contacts`.
  - Contact CRUD endpoints enforce org scoping + RBAC.
- Frontend:
  - Location Details page shows contacts.
  - Users with permission can add/edit/delete; others can view.
- Quality:
  - `cd backend && pytest` passes.
  - `cd frontend && bun run check:ci` passes.

## Unresolved Questions
- Confirm which roles should be read-only vs write for contacts beyond phase 1.
