Feedback System (MVP) — Simplified
Summary
Authenticated users can submit feedback (type + text + current page path). Superadmins can view feedback for the selected org in /admin/feedback. Feedback is immutable (no updates, no deletes in MVP).

Data model
Table feedback with:
id (UUID PK)
organization_id (FK organizations.id, indexed)
user_id (FK users.id, indexed)
feedback_type (optional enum: bug | incorrect_response | feature_request | general)
content (required, max 4000; enforce via Pydantic + DB check)
page_path (optional, max 512; store window.location.pathname only)
Timestamps:
Implement via BaseModel (keeps repo consistency; updated_at exists but unused)
Backend endpoints
POST /api/v1/feedback
Auth: CurrentUser
Org: OrganizationContext (derived, never from payload)
Rate limit: RateLimitUser30
Body: {content, feedbackType?, pagePath?} (camelCase via BaseSchema)
Response: {id, createdAt} (or 204)
GET /api/v1/admin/feedback
Auth: CurrentSuperUser
Org: OrganizationContext (requires X-Organization-Id)
Rate limit: RateLimitUser300
Response: newest-first list, server-limited (e.g., limit=50 query param, default 50, max 200)
Frontend
Navbar: add a single FeedbackWidget (icon button + modal) that submits feedback and toasts success/failure.
Admin: add page.tsx rendering a simple list (no table lib, no filters in v1).
If org not selected, show “Select an organization” prompt instead of fetching.
Tests (backend only, minimal)
Auth required for POST.
Superadmin can list when X-Organization-Id provided.
Non-superadmin gets 403 on list.
Cross-org safety: listing scoped to selected org; create scoped to user/org.
Assumptions / defaults
No updates and no deletions in MVP (append-only).
page_path only (no query/hash), and request bodies not logged.
