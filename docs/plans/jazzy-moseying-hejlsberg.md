# Feedback Admin UI/UX Improvements

## Problem
Superadmin can't see attachment presence without expanding each row. Secondary: delete button tied to filter instead of item state; search ignores user names.

## Changes

### Backend

**`backend/app/schemas/feedback.py`** - Add field to `FeedbackAdminRead`:
```python
attachment_count: int = 0
```

**`backend/app/api/v1/feedback.py`** - `list_feedback` (lines 329-350):
- Correlated subquery counts attachments per feedback (hits `ix_feedback_attachments_org_feedback` index)
- `select(Feedback, subq)` -> `result.all()` -> `model_validate().model_copy(update={"attachment_count": count})`
- Same pattern as `companies.py` LocationSummary

**`backend/app/api/v1/feedback.py`** - `update_feedback` (lines 496-502):
- After re-fetch, simple `SELECT COUNT(*)` for single item
- Return `model_validate().model_copy(update={"attachment_count": count})`

### Frontend

**`frontend/lib/api/feedback.ts`** - Add to `AdminFeedbackItem`:
```typescript
attachmentCount: number;
```

**`frontend/app/admin/feedback/page.tsx`** - 4 UI fixes:

1. **Attachment indicator** (lines 489-499): In content cell metadata line, after user name, show `· [paperclip] N` when `attachmentCount > 0`. Paperclip icon already imported.

2. **Delete button** (line 558): Change `statusFilter === "resolved"` to `isResolved`. Backend enforces 409 anyway.

3. **Search scope** (lines 269-275): Also match `${user.firstName} ${user.lastName}`. Update placeholder.

4. **Skip loading** (lines 217-228): Guard `loadAttachments` with `item.attachmentCount > 0`. When 0, expanded row shows "No attachments." immediately (no loading spinner). Add `feedback` to deps array.

### Tests

**`backend/tests/test_feedback.py`**:
- Assert `attachmentCount == 0` in existing `test_superuser_can_list_feedback_with_filters` and `test_superuser_can_resolve_and_reopen_feedback`
- New `test_list_feedback_attachment_count`: create feedback with 3 attachments + feedback without, verify counts in list response
- Import `FeedbackAttachment` model

## Performance
- Single SQL query with correlated subquery for list (no N+1)
- Subquery hits existing composite index `ix_feedback_attachments_org_feedback`
- PATCH: one extra `COUNT(*)` for single row

## Verification
```bash
cd backend && make check
cd frontend && bun run check:ci
```

## Files
- `backend/app/schemas/feedback.py`
- `backend/app/api/v1/feedback.py`
- `frontend/lib/api/feedback.ts`
- `frontend/app/admin/feedback/page.tsx`
- `backend/tests/test_feedback.py`
