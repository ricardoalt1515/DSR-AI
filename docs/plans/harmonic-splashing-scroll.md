# Feedback System (MVP)

## Summary
Navbar button → modal → save to Postgres → superadmin list with filters + resolve action.

## Scope
- **In**: Submit feedback (type + text + page path), store in DB, superadmin list at `/admin/feedback` with filters, mark as resolved
- **Out**: External ticketing, file uploads, comments, delete

---

## Data Model

Notes:
- `BaseModel` provides `id`, `created_at`, and `updated_at`. `updated_at` becomes useful once triage fields (resolve/reopen) exist.
- Always derive `organization_id` server-side from `OrganizationContext` (never accept it from the client payload).
- Sanitize `page_path` server-side (strip query/hash) as a defense-in-depth fallback.

```python
class Feedback(BaseModel):
    __tablename__ = "feedback"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False, index=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)  # max 4000 (schema + DB constraint)
    feedback_type: Mapped[str | None] = mapped_column(String(50))  # bug|incorrect_response|feature_request|general
    page_path: Mapped[str | None] = mapped_column(String(512))  # store pathname only (no query/hash)

    # Admin triage (only mutable fields in MVP)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    # Optional (skip if you want ultra-minimal):
    # resolution_note: Mapped[str | None] = mapped_column(String(500), nullable=True)
```

---

## Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/feedback` | CurrentUser | Submit feedback |
| GET | `/api/v1/admin/feedback` | CurrentSuperUser | List with filters (org-scoped) |
| PATCH | `/api/v1/admin/feedback/{id}` | CurrentSuperUser | Resolve / reopen feedback |

### Query params (GET)
- `days`: 7 \| 30 \| null (all)
- `resolved`: true \| false \| null (all)
- `feedback_type`: bug \| incorrect_response \| feature_request \| general \| null
- `limit`: default 50, max 200

---

## Schemas

```python
FeedbackType = Literal["bug", "incorrect_response", "feature_request", "general"]

class FeedbackCreate(BaseSchema):
    content: str = Field(..., min_length=1, max_length=4000)
    feedback_type: FeedbackType | None = None
    page_path: str | None = Field(None, max_length=512)

class FeedbackUpdate(BaseSchema):
    resolved: bool
    # Optional:
    # resolution_note: str | None = Field(None, max_length=500)

class FeedbackRead(BaseSchema):
    id: UUID
    content: str
    feedback_type: str | None
    page_path: str | None
    user_id: UUID
    resolved_at: datetime | None
    resolved_by_user_id: UUID | None
    created_at: datetime
```

---

## Files

**Backend (create):**
- `backend/app/models/feedback.py`
- `backend/app/schemas/feedback.py`
- `backend/app/api/v1/feedback.py`
- `backend/alembic/versions/xxx_add_feedback.py`
- `backend/tests/test_feedback.py`

**Backend (modify):**
- `backend/app/main.py` (register routers)
- `backend/alembic/env.py` (import Feedback for autogenerate)

**Frontend (create):**
- `frontend/components/features/feedback/feedback-button.tsx`
- `frontend/components/features/feedback/feedback-dialog.tsx`
- `frontend/lib/api/feedback.ts`
- `frontend/app/admin/feedback/page.tsx`

**Frontend (modify):**
- `frontend/components/shared/layout/navbar.tsx` (mount FeedbackButton)
- `frontend/components/features/admin/admin-sidebar.tsx` (add nav item)

---

## Frontend Implementation

### Files to Create
- `frontend/lib/api/feedback.ts` — API client
- `frontend/components/features/feedback/feedback-button.tsx` — Icon button + dialog trigger
- `frontend/components/features/feedback/feedback-dialog.tsx` — Modal form
- `frontend/app/admin/feedback/page.tsx` — Admin list page

### Files to Modify
- `frontend/components/shared/layout/navbar.tsx` — Add FeedbackButton next to NotificationDropdown
- `frontend/components/features/admin/admin-sidebar.tsx` — Add nav item

### API Client (`feedback.ts`)
```typescript
export interface FeedbackPayload {
  content: string;
  feedbackType?: "bug" | "incorrect_response" | "feature_request" | "general";
  pagePath?: string;
}

export interface FeedbackItem {
  id: string;
  content: string;
  feedbackType: string | null;
  pagePath: string | null;
  userId: string;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  createdAt: string;
}

// POST /api/v1/feedback
// GET /api/v1/admin/feedback?days=7&resolved=false&feedback_type=bug&limit=50
// PATCH /api/v1/admin/feedback/{id}
```

### FeedbackButton
- MessageSquarePlus icon in navbar (next to NotificationDropdown)
- Opens FeedbackDialog on click

### FeedbackDialog
- Textarea for content (required, max 4000)
- Select for type: Bug | Incorrect response | Feature request | General (optional)
- Sends: `{ content, feedbackType, pagePath: window.location.pathname }`
- Toast success: "Thanks for your feedback!"
- Pattern: Follow `create-company-dialog.tsx`

### Admin Page
- Filters: Days (Select: 7/30/All), Status (Select: Open/Resolved/All), Type (Select)
- Table columns: Date, Type, Content (truncated 100 chars), Status badge, Action button
- Action: ✓ button to resolve, ↺ button to reopen
- Pattern: Follow `admin/users/page.tsx` with TanStack Table
- If no org selected: show "Select an organization" prompt

---

## Tests

1. User can create feedback (201)
2. Superuser can list feedback with filters (200)
3. Non-superuser cannot list (403)
4. Superuser can resolve + reopen (200)

---

## Time

| Task | Time |
|------|------|
| Model + migration | 15min |
| Schemas | 10min |
| Endpoints (POST, GET, PATCH) | 30min |
| Tests | 25min |
| Frontend button + dialog | 40min |
| Admin page + filters | 50min |
| **Total** | **~3h** |

---

## Acceptance Criteria

1. User submits feedback → toast success
2. Admin sees list at `/admin/feedback` with working filters
3. Admin resolves/reopens feedback → state updates
4. `make check` and `bun run check:ci` pass
