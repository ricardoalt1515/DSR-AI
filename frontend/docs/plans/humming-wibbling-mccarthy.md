# UX: Duplicate Upload Feedback

## Problem
When user uploads duplicate PDF, backend detects `file_hash` match and reuses cached analysis.
User sees "uploading" for 1-2s then nothing — no feedback that it was a duplicate.

## Solution (MVP)

### 1. Backend: Return `deduplicated` flag

**File: `backend/app/schemas/file.py`**
```python
class FileUploadResponse(BaseModel):
    # ... existing fields ...
    deduplicated: bool = False  # ← ADD
```

**File: `backend/app/api/v1/files.py`**

After creating ProjectFile with file_hash, check for existing completed file:
```python
# After file record created, before returning response
deduplicated = False
if file_hash:
    existing = await db.execute(
        select(ProjectFile.id)
        .where(ProjectFile.file_hash == file_hash)
        .where(ProjectFile.project_id == project.id)
        .where(ProjectFile.processing_status == "completed")
        .where(ProjectFile.id != new_file.id)
        .limit(1)
    )
    deduplicated = existing.scalar_one_or_none() is not None

return FileUploadResponse(
    ...,
    deduplicated=deduplicated,
)
```

---

### 2. Frontend: Show duplicate toast

**File: `frontend/lib/api/projects.ts`**
Update `ProjectFileUploadResponse` type:
```typescript
export interface ProjectFileUploadResponse {
  // ... existing fields ...
  deduplicated?: boolean;
}
```

**File: `frontend/components/shared/common/file-uploader.tsx`**
```typescript
// In uploadFile callback, after successful upload:
const response = await projectsAPI.uploadFile(projectId, file, { ... });

if (response.deduplicated) {
    toast.info(`${file.name} — duplicate detected, reusing previous analysis`);
} else {
    toast.success(`${file.name} uploaded successfully`);
}
```

**File: `frontend/components/features/projects/intake-panel/quick-upload-section.tsx`**
Same pattern — check `deduplicated` flag for appropriate toast.

---

### 3. Optional: "Duplicate" badge in Files tab

**File: `frontend/components/features/projects/files-tab-enhanced/file-row-collapsed.tsx`**

Add badge next to processing status:
```tsx
{file.deduplicated && (
  <Badge variant="secondary" className="text-xs">
    Duplicate
  </Badge>
)}
```

**Requires:** Adding `deduplicated` to `EnhancedProjectFile` type and backend `FileInfo` schema.

---

## Files to Modify

| Layer | File | Change |
|-------|------|--------|
| Backend | `app/schemas/file.py` | Add `deduplicated: bool = False` to `FileUploadResponse` |
| Backend | `app/api/v1/files.py` | Check for existing completed file with same hash before response |
| Frontend | `lib/api/projects.ts` | Add `deduplicated?: boolean` to response type |
| Frontend | `components/shared/common/file-uploader.tsx` | Show different toast based on flag |
| Frontend | `components/features/projects/intake-panel/quick-upload-section.tsx` | Same toast logic |
| Optional | `file-row-collapsed.tsx`, `types.ts`, `FileInfo` schema | Add "Duplicate" badge |

---

## Verification

1. Upload a PDF → toast: "uploaded successfully"
2. Upload same PDF again → toast: "duplicate detected, reusing previous analysis"
3. Refresh page → suggestions persist (hydrated from backend)
4. (If badge implemented) Files tab shows "Duplicate" badge on second file

```bash
cd backend && make check
cd frontend && bun run check:ci
```

---

## Notes
- File is NOT blocked/deleted (audit trail + consistency)
- Worker already handles dedup logic; this just adds UX feedback
- Badge is optional — toast is the primary feedback mechanism
