Feedback Attachments (Any File) - 2-step, prod-safe, no breaking changes

## Summary
- Keep existing feedback submit API: `POST /api/v1/feedback` JSON unchanged
- Add attachments via: `POST /api/v1/feedback/{feedback_id}/attachments` (multipart)
- Allow any file upload/download; **never** render non-images inline
- Admin UI lazy-loads attachments only when expanding a feedback row (on-demand presigned URLs)

## Goals
- User can submit feedback with **0–5 attachments total** per feedback
- Server enforces **max 5 total** and **max 10MB per file** (stream enforced)
- Attachments stored in S3 (prod) / local storage (dev)
- Admin can preview safe images + download any attachment
- Strong multi-tenant safety (org scoped) + auth correctness
- Errors are explicit + stable for UI/tests

## Non-goals
- AV scanning/quarantine, OCR, presigned PUT, background jobs, public access
- User self-service download/list/delete attachments
- Deletion API/UI (can add later)

## Locked decisions
- Do not change `POST /api/v1/feedback` request/response (compat)
- 2-step UX: create feedback then upload attachments
- Upload request is all-or-nothing per request:
  - If any file fails, no attachment rows committed
  - Best-effort cleanup deletes already-uploaded blobs
  - Feedback remains created; user can retry upload
- Preview only if server-side sniff confirms **JPEG/PNG/WebP** (never SVG)
- Storage key does not include filename (privacy): `feedback/{org_id}/{feedback_id}/{attachment_id}{suffix}`
  - `suffix` rules:
    - if sniff says JPEG/PNG/WebP, force suffix from sniff (`.jpg`/`.png`/`.webp`) even if original has no suffix
    - else use original suffix if present, else empty

## Backend

### Data model
- New table: `feedback_attachments` (model uses `BaseModel` for consistency)
  - `id` UUID PK
  - `organization_id` UUID NOT NULL
  - `feedback_id` UUID NOT NULL
  - `storage_key` TEXT UNIQUE NOT NULL
  - `original_filename` TEXT NOT NULL (sanitized + truncated)
  - `content_type` TEXT NULL (client-provided, untrusted; display/debug only)
  - `size_bytes` BIGINT NOT NULL (>= 0)
  - `is_previewable` BOOLEAN NOT NULL default false
  - optional: `uploaded_by_user_id` UUID NULL (FK users.id SET NULL)

Notes:
- Do not store or expose `storage_key` outside backend (treat as secret-ish)
- Do not trust client `content_type`

### Tenant integrity (DB enforced)
- Add `UNIQUE (id, organization_id)` to `feedback`
- Add composite FK on attachments:
  - `ForeignKeyConstraint([feedback_id, organization_id], [feedback.id, feedback.organization_id], ondelete='CASCADE')`
- Indexes:
  - `(organization_id, feedback_id)`
  - `(organization_id, created_at)`

### Storage allowlists
- Add prefix `feedback/` to:
  - `backend/app/services/s3_service.py` `_ALLOWED_LOCAL_PREFIXES`
  - `backend/app/services/storage_delete_service.py` `_ALLOWED_PREFIXES`

Recommended (not required for MVP): orphan cleanup support
- `backend/scripts/cleanup_orphaned_storage.py`
  - include `feedback/` in `_ALLOWED_PREFIXES`
  - collect referenced keys from `feedback_attachments.storage_key`
  - include local scan target `storage_root / 'feedback'`

### API

#### 1) Upload attachments (user)
- `POST /api/v1/feedback/{feedback_id}/attachments`
  - Auth: `CurrentUser` + `CurrentUserOrganization`
  - Rate limit: use existing `RateLimitUser10` (or stricter if added later)
  - Input: multipart `attachments: list[UploadFile]`
  - Load + lock feedback row:
    - `WHERE id=:feedback_id AND organization_id=:org_id AND user_id=:user_id`
    - `FOR UPDATE`
  - Enforce total cap:
    - `existing_attachments + len(incoming) <= 5` else 400
  - Per file:
    - filename required
    - sanitize for DB display only (strip dirs/control chars; truncate 200)
    - stream to temp path; enforce `<= settings.MAX_UPLOAD_SIZE` while streaming
    - sniff magic bytes to set `is_previewable` (jpeg/png/webp only)
    - compute storage key using suffix rules above
    - upload to S3/local using existing storage service
    - insert attachment row referencing `(feedback_id, organization_id)`
  - Commit
  - On exception: rollback; best-effort `delete_storage_keys(uploaded_keys)`
  - Response (no URLs): list metadata
    - `{id, originalFilename, sizeBytes, contentType, isPreviewable, createdAt}`

Error contract (stable codes):
- `TOO_MANY_ATTACHMENTS`
- `FILE_TOO_LARGE`
- `INVALID_FILENAME`
- `UPLOAD_FAILED`

Shape: `HTTPException(detail={"message": "...", "code": "...", "details": {...}})`

#### 2) List attachments (admin; metadata + URLs)
- `GET /api/v1/admin/feedback/{feedback_id}/attachments`
  - Auth: `SuperAdminOnly` + `OrganizationContext` (requires `X-Organization-Id`)
  - Return list items:
    - `{id, originalFilename, sizeBytes, contentType, isPreviewable, createdAt, downloadUrl, previewUrl?}`
  - URLs generated only for the selected org
    - S3/prod: presigned, short-lived
    - local/dev: direct `/uploads/...` (dev-only)
  - `downloadUrl` is always forced download
  - `previewUrl` only provided when `is_previewable=true`

### Presigned URL helper
- Add helper in `backend/app/services/s3_service.py` to generate presigned GET with:
  - `ResponseContentDisposition`:
    - download: `attachment; filename="<ascii_safe>"`
    - preview: `inline; filename="<ascii_safe>"`
  - `ResponseContentType` only for previewable images
  - TTL 10–15 minutes

Filename policy (simple + robust):
- DB keeps Unicode (sanitized, no control chars)
- Headers use ASCII-safe fallback filename (sanitize + truncate); UI displays original filename

### Local dev note
- `backend/app/main.py` mounts `/uploads` when `USE_S3=false`; any object under that root is reachable if the path is known
- Mitigations:
  - never return `storage_key` from API; only admin receives URLs
  - keys include UUIDs and are practically unguessable

## Frontend

### User feedback dialog
- `frontend/components/features/feedback/feedback-dialog.tsx`
  - Add attach button + hidden `<input type="file" multiple>`
  - Selected file list with remove
  - Client validation (UX only): max 5 files, max 10MB each (any type allowed)
  - Submit flow:
    1) `feedbackAPI.submit(payload)` -> `feedbackId`
    2) If files: `feedbackAPI.uploadAttachments(feedbackId, files)` (single request)
    3) Success: toast + close
    4) Upload fails: toast "Feedback sent; attachments failed" + keep dialog open with Retry

### Frontend API client
- `frontend/lib/api/feedback.ts`
  - add `uploadAttachments(feedbackId, files)` (FormData; append "attachments" per file)
  - add admin `listAttachments(feedbackId)`

### Admin feedback UI
- `frontend/app/admin/feedback/page.tsx`
  - show expand chevron for every row
  - on expand: fetch attachments list (cache per feedbackId)
  - render:
    - previewable: thumbnail via `<img src={previewUrl}>` + download
    - non-previewable: file icon + filename + download
  - loading: skeleton; error: inline + retry
  - keep feedback content primary; attachments secondary

## Testing

### Backend
- Existing feedback tests remain valid (POST JSON unchanged)
- New tests:
  - creator can upload 1 file; row exists; org/user scoping
  - total cap: existing 4 + incoming 2 => 400 (`TOO_MANY_ATTACHMENTS`)
  - >10MB file => 400 (`FILE_TOO_LARGE`)
  - non-creator cannot upload to others (404/403)
  - admin list requires org header; tenant isolation under wrong org
  - URL generation: downloadUrl always present; previewUrl only for sniffed-safe images
  - cleanup called on mid-way failure (mock upload; code `UPLOAD_FAILED`)

### Frontend
- `cd frontend && bun run check:ci`
- manual smoke:
  - feedback + 2 files; kill backend during upload -> retry works
  - admin expand shows thumbnails for images; downloads work

## Commands
- Backend checks: `cd backend && make check`
- Backend tests: `cd backend && make test`
- Frontend checks: `cd frontend && bun run check:ci`

## Migration / rollout
- Alembic migration: add `feedback_attachments` + add `UNIQUE (id, organization_id)` on `feedback`
- Deploy backend
- Deploy frontend
- Prod smoke: upload PNG + random binary; admin preview/download ok

## Open questions
- None (decisions locked above)
