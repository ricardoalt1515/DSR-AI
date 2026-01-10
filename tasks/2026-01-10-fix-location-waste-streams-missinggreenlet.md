# Plan: Fix Locations waste streams (500 MissingGreenlet)

## Context
**User-facing bug**
- When a user navigates to a Location detail screen, the UI shows an unexpected error and no waste streams (projects) render.

**Frontend signals**
- Browser shows request failures for `GET /companies/locations/{locationId}`.
- Sometimes reported as CORS errors because the backend is returning 500.

**Backend error (root cause signal)**
- FastAPI returns 500 with a `ResponseValidationError` caused by SQLAlchemy async `MissingGreenlet`.
- The validation errors point to fields on `ProjectSummary`:
  - `response.projects[N].company_name`
  - `response.projects[N].location_name`

**Why this matters**
- This blocks a core workflow: Location → view / interact with waste streams.
- It will get worse as the API grows if we keep serializing ORM objects that can trigger lazy-load I/O during response building.

---

## Root cause analysis
- `LocationDetail` schema (backend) currently exposes `projects` as a list of `ProjectSummary`.
  - File: `backend/app/schemas/location.py`
- `ProjectSummary` includes computed fields `company_name` and `location_name`.
  - File: `backend/app/schemas/project.py`
- Those fields are implemented as `@property` on the ORM `Project` model and access relationship attributes:
  - `Project.company_name` reads `self.location_rel.company.name`
  - `Project.location_name` reads `self.location_rel.name`
  - File: `backend/app/models/project.py`
- In the async SQLAlchemy stack, if `location_rel` (and `location_rel.company`) aren’t eagerly loaded, accessing them triggers a lazy-load (I/O) while FastAPI/Pydantic is serializing the response.
- Lazy-load I/O during serialization happens outside the `greenlet_spawn` context → `MissingGreenlet` → FastAPI raises `ResponseValidationError` → 500.

Key point: this is not a “Locations page bug”; it’s an API serialization design issue.

---

## Goals
- `GET /companies/locations/{locationId}` returns 200 reliably.
- Location detail can always render its waste streams list.
- Avoid future `MissingGreenlet` surprises by preventing relationship I/O during serialization.
- Keep the solution minimal, readable, and reusable.

## Guardrails
- Do not “fix” by disabling validation or hiding errors.
- Avoid endpoint-specific hacks that will break again when another endpoint serializes `ProjectSummary`.
- Keep schemas purpose-specific (DRY but not over-generic).

---

## Proposed solution (recommended)

### A) Make Location’s embedded waste-stream list purpose-specific
**Change `LocationDetail.projects` to a minimal project schema** used only for Location detail.

1) Create a new schema in `backend/app/schemas/location.py` (or a small new file if preferred):
   - `LocationProjectSummary` (or `WasteStreamSummary`)
   - Fields required by the UI today:
     - `id: UUID`
     - `name: str`
     - `status: str`
     - `created_at: datetime`
     - (Optional) `progress: int` if needed

2) Update `LocationDetail`:
   - `projects: list[LocationProjectSummary] = Field(default_factory=list)`

Why this is best:
- The Location detail page already has Location + Company context, so per-project `company_name/location_name` is redundant.
- Keeps schemas “one purpose each” and reduces coupling.
- Prevents accidental introduction of relationship-dependent computed fields in embedded lists.


### B) Add a general safety belt: never lazy-load inside `Project.company_name/location_name`
Even with (A), it’s wise to make these properties safe, because `ProjectSummary` is used elsewhere.

Update `backend/app/models/project.py`:
- For `company_name`:
  - If `location_rel` is not loaded → return `self.client` (legacy fallback) without touching relationships.
  - If `location_rel` is loaded but `location_rel.company` is not loaded → return `self.client`.
- For `location_name`:
  - If `location_rel` is not loaded → return `self.location`.

Implementation approach:
- Use `sa_inspect(obj).unloaded` (already imported as `sa_inspect` in the model) to detect unloaded attributes.
- Do not call `self.location_rel` / `self.location_rel.company` unless the relationship is already loaded.

This prevents `MissingGreenlet` across the API whenever someone serializes a `Project` without eager-loading.


### C) (Optional) Eager-load only where you truly need the pretty names
Where an endpoint really wants `ProjectSummary.company_name/location_name` to be accurate (not just legacy fallback), ensure the query options eager-load:
- `selectinload(Project.location_rel).selectinload(Location.company)`

Keep this targeted to endpoints that need it.

---

## Implementation checklist

### Backend
- [ ] Add `LocationProjectSummary` schema.
- [ ] Switch `LocationDetail.projects` to `LocationProjectSummary`.
- [ ] Ensure `GET /companies/locations/{location_id}` returns `LocationDetail` with the new embedded projects shape.
- [ ] Ensure `PUT /companies/locations/{location_id}` also returns `LocationDetail` correctly (same issue).
- [ ] Harden `Project.company_name` and `Project.location_name` to avoid lazy-load.

### Frontend
- [ ] Confirm the Location detail UI only relies on `project.id/name/status/createdAt`.
- [ ] If a TS type exists for `LocationDetail.projects`, update it to match the minimal schema.

---

## Validation steps
1) Backend:
- Call `GET /companies/locations/{location_id}` for a location with multiple projects.
- Confirm 200 response, and response contains `projects` with minimal fields.
- Confirm no `MissingGreenlet` / `ResponseValidationError` in logs.

2) Frontend:
- Navigate to company → location detail.
- Confirm waste streams list renders and links work.

3) Regression:
- Confirm other endpoints using `ProjectSummary` still work (dashboard, project list).

---

## Notes / follow-ups (separate issue)
- Separate from this bug, super-admin flows require `X-Organization-Id` (from `localStorage.selected_org_id`). If org isn’t selected, many API calls return 400. Consider adding a global “organization selected” guard to avoid confusing failures.
