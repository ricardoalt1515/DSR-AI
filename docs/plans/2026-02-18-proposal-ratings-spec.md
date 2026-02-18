# 2026-02-18 Proposal Ratings Spec

Goal
- Let users rate AI proposals on 3 criteria + optional comment.
- Show useful aggregate signal to regular users.
- Give superadmin detailed breakdown + filters to find low-quality proposals fast.
- Keep v1 simple, secure, maintainable.

Scope (v1)
- Backend: DB model + migration + user rating APIs + admin aggregate/detail APIs.
- Frontend: proposal rating card, proposal aggregate display, admin ratings page (minimal filters/sorts only).
- Tests: backend first (TDD), frontend type/api coverage.

Out of scope (v1)
- Auto retraining loops.
- Materialized views/background aggregate jobs.
- Cross-org analytics dashboards.

Domain model
- New table: `proposal_ratings`
  - `id` UUID PK
  - `organization_id` UUID FK `organizations.id` (cascade delete)
  - `proposal_id` UUID
  - `user_id` UUID FK `users.id` (cascade delete)
  - `coverage_needs_score` SMALLINT NOT NULL CHECK 1..5
  - `quality_info_score` SMALLINT NOT NULL CHECK 1..5
  - `business_data_score` SMALLINT NOT NULL CHECK 1..5
  - `comment` TEXT NULL CHECK `char_length(comment) <= 1000`
  - `created_at`, `updated_at` (BaseModel)
- DB safety
  - Composite FK `(proposal_id, organization_id) -> proposals(id, organization_id)` ON DELETE CASCADE.
  - Unique `(organization_id, proposal_id, user_id)` to enforce one rating per user/proposal/org.
  - Precheck `proposals` FK target uniqueness in migration; add `UNIQUE (id, organization_id)` if missing before creating composite FK.
- Indexes
  - `(organization_id, proposal_id)`
  - `(organization_id, user_id)`
  - `(organization_id, updated_at)` for admin recent sorting/filtering

API contract
- User endpoints (auth: `CurrentUser`, org: `OrganizationContext` via project path access)
  - `PUT /api/v1/ai/proposals/{project_id}/proposals/{proposal_id}/rating`
    - Upsert own rating (idempotent)
    - Body: `{ coverageNeedsScore, qualityInfoScore, businessDataScore, comment? }`
    - Validation: scores must be integers `1..5`; `0` is invalid and never persisted.
    - Rate limit: `RateLimitUser30`
  - `GET /api/v1/ai/proposals/{project_id}/proposals/{proposal_id}/rating`
    - Return current user rating.
    - If user never rated: `200` with `{ rating: null }`.
  - `GET /api/v1/ai/proposals/{project_id}/proposals/{proposal_id}/rating/stats`
    - Return aggregate visibility + stats.
    - If `ratingCount < 3`: return `200` with hidden payload:
      `{ visible: false, ratingCount, minimumRequiredCount: 3, overallAvg: null, criteriaAvg: null }`.
    - If `ratingCount >= 3`: return `200` with visible payload:
      `{ visible: true, ratingCount, overallAvg, criteriaAvg }`.
- Superadmin endpoints (auth: `SuperAdminOnly`, requires `X-Organization-Id`)
  - `GET /api/v1/admin/proposal-ratings`
    - List proposals with aggregates + filter/sort
    - Filters (v1): min overall, has comments, date range
    - Sorting: highest, lowest, most-rated, recently-rated
    - Pagination: `limit` default `50`, max `100`; optional `offset`.
  - `GET /api/v1/admin/proposal-ratings/{proposal_id}`
    - Detailed breakdown for one proposal
    - Includes criterion distribution + comments (no per-user identity fields in v1)

Auth/privacy/security rules
- Never accept `user_id`/`organization_id` from payload.
- Always resolve project/proposal access from existing org-scoped deps.
- User rating endpoints are for non-superusers only.
- Regular users never see other users individual ratings/comments.
- Superadmin-only detail endpoint for comments/breakdown.
- Every admin query must filter by org from `X-Organization-Id`; cross-org IDs return 404.
- Public stats visible only when `ratingCount >= 3`.
- Comment input must reject whitespace-only strings.
- Treat comments as untrusted text; escape on output and avoid raw comment logging.
- Archived policy: rating writes blocked for archived project/proposal; reads allowed.

Aggregation rules
- SQL on read (no MV now).
- `overall_avg = (avg(coverage_needs_score) + avg(quality_info_score) + avg(business_data_score)) / 3`
- Round averages server-side to 2 decimals.
- Admin "recent" uses max `updated_at` in rating set.

Backend implementation plan
1. Add model `backend/app/models/proposal_rating.py` + export in `backend/app/models/__init__.py`.
2. Add migration in `backend/alembic/versions/` (table, constraints, indexes, proposals unique if needed).
3. Add schemas `backend/app/schemas/proposal_rating.py` (create/update/read/stats/admin read).
4. Add endpoints in:
   - `backend/app/api/v1/proposals.py` (user endpoints)
   - new `backend/app/api/v1/admin_proposal_ratings.py` (superadmin endpoints)
   - wire router in `backend/app/main.py`

Frontend implementation plan
1. Add API client: `frontend/lib/api/proposal-ratings.ts`.
2. Add types: `frontend/lib/types/proposal-rating.ts`.
3. User UI
   - Add rating card in `frontend/components/features/proposals/proposal-page.tsx`
   - 3 criteria star inputs + optional comment + save/update state
   - Show aggregate badges near proposal header (`overall`, `count`, criterion tooltip)
4. Admin UI
   - Add page `frontend/app/admin/proposal-ratings/page.tsx`
   - Reuse admin table/filter patterns from `frontend/app/admin/feedback/page.tsx`
   - Add nav item in `frontend/components/features/admin/admin-sidebar.tsx`

Testing (TDD-first backend)
- Add tests before implementation in `backend/tests/test_proposal_ratings.py`.
- Required cases
  - user can create rating
  - same user updates rating (upsert, no duplicate row)
  - cross-org rating blocked (404/forbidden semantics by existing patterns)
  - regular user cannot access admin endpoints
  - aggregate math correct (count + averages + overall)
  - admin filters/sorts correct (minimal set)
  - stats hidden for `ratingCount < 3`

Rollout
- 2 PRs preferred (smaller blast radius).
  - PR-1: migration + backend APIs + backend tests
  - PR-2: frontend user/admin UI
- Order: migration -> tests -> backend -> frontend -> checks.
- Verify
  - `cd backend && make check`
  - `cd frontend && bun run check:ci`

Must-have vs later
- Must-have
  - one-row-per-user rating
  - 3 criteria + comment
  - editable rating
  - regular user aggregate visibility
  - superadmin aggregate list + detail breakdown/comments
- Later
  - monthly exports
  - model-retraining automation
  - advanced trend analytics

Unresolved questions
- None.
