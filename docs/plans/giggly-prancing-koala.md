# Plan: UX Improvements for Duplicate Uploads

## Problem
- Backend detects file_hash duplicates in worker, but user sees generic "uploaded" toast
- No visual indicator that file was deduplicated
- User confused: did it process? is it stuck?
- Suggestions from duplicate files have no visual distinction

## Solution Overview
Multi-layered feedback: Toast (immediate) + Badge (Files + Suggestions) + clear processing states

---

## Phase 1: Backend — Persist Deduplicated Flag

### 1.1 Model (`backend/app/models/file.py`)
Add `is_deduplicated` to ProjectFile:
```python
is_deduplicated: Mapped[bool] = mapped_column(Boolean, default=False)
```

### 1.2 Schema (`backend/app/schemas/file.py`)
```python
class FileUploadResponse(BaseModel):
    # ... existing ...
    is_deduplicated: bool = False
    cached_from_date: datetime | None = None
```

### 1.3 Endpoint (`backend/app/api/v1/files.py`)
After computing `file_hash`, before creating ProjectFile (~line 265):
```python
is_deduplicated = False
cached_from_date = None

if file_hash:
    existing = await db.execute(
        select(ProjectFile)
        .where(ProjectFile.file_hash == file_hash)
        .where(ProjectFile.project_id == project.id)
        .where(ProjectFile.processing_status == "completed")
        .where((ProjectFile.ai_analysis.isnot(None)) | (ProjectFile.processed_text.isnot(None)))
        .order_by(ProjectFile.processed_at.desc())
        .limit(1)
    )
    cached = existing.scalar_one_or_none()
    if cached:
        is_deduplicated = True
        cached_from_date = cached.processed_at
```

Create ProjectFile with `is_deduplicated=is_deduplicated`.
Return in response: `is_deduplicated=is_deduplicated, cached_from_date=cached_from_date`

### 1.4 Migration
```python
# Add column is_deduplicated BOOLEAN DEFAULT FALSE
op.add_column('project_files', sa.Column('is_deduplicated', sa.Boolean(), default=False))
```

---

## Phase 2: Frontend — Toast Feedback

### 2.1 Type update (`frontend/lib/api/projects.ts`)
```typescript
export interface ProjectFileUploadResponse {
  // ... existing ...
  is_deduplicated?: boolean;
  cached_from_date?: string;
}
```

### 2.2 Handler returns response (`intake-panel-content.tsx` ~line 303)
```typescript
const handleUpload = useCallback(async (file, category) => {
  // ... existing validation ...
  const response = await projectsAPI.uploadFile(projectId, file, { ... });
  onUploadComplete?.();
  return response;  // ← Return for toast logic
}, [...]);
```

### 2.3 Update callback type (`quick-upload-section.tsx`)
```typescript
interface QuickUploadSectionProps {
  onUpload?: (file: File, category: string) => Promise<ProjectFileUploadResponse | void>;
}
```

### 2.4 Toast logic (`quick-upload-section.tsx` ~line 85)
```typescript
const response = await onUpload?.(file, category);

if (response?.is_deduplicated) {
  const date = response.cached_from_date
    ? new Date(response.cached_from_date).toLocaleDateString()
    : '';
  toast.info(`Duplicate detected — reused analysis${date ? ` from ${date}` : ''}`);
} else {
  toast.success(`${file.name} queued for processing`);
}
```

**Toast design:**
- Type: `toast.info()` (blue) — duplicates save time, not errors
- Duration: 4s default
- Icon: Copy or Info icon

---

## Phase 3: Badge in Files Tab

### 3.1 Files response includes flag
Ensure `/projects/{id}/files` response includes `is_deduplicated` per file.

### 3.2 Badge component (`files-tab-enhanced.tsx`)
In file row, next to processing status badge:
```tsx
{file.is_deduplicated && (
  <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-400 text-[10px]">
    <Copy className="h-3 w-3 mr-1" />
    Cached
  </Badge>
)}
```

---

## Phase 4: Badge in Intake Suggestions

### 4.1 Hydrate endpoint returns deduplicated info
Option A (simple): Add `is_deduplicated` to suggestion response via JOIN with source file:
```python
# In IntakeService.get_intake or IntakeHydrateResponse
# Each suggestion includes source_file.is_deduplicated
```

Option B (derive client-side): Frontend fetches file list and cross-references `sourceFileId`.

**Recommendation:** Option A — cleaner, single source of truth.

### 4.2 Schema update (`backend/app/schemas/intake.py`)
```python
class IntakeSuggestionResponse(BaseModel):
    # ... existing ...
    is_from_cached_file: bool = False  # True if source file was deduplicated
```

### 4.3 Suggestion row badge (`suggestion-row.tsx`)
In the source file popover or inline:
```tsx
{suggestion.isFromCachedFile && (
  <span className="text-[10px] text-blue-400 ml-1">(cached)</span>
)}
```

---

## Phase 5: Edge Cases

### 5.1 Batch uploads with mixed duplicates
```typescript
// After all uploads complete
const duplicates = results.filter(r => r.is_deduplicated);
if (duplicates.length > 1) {
  toast.info(`${duplicates.length} duplicates — reused previous analyses`);
} else if (duplicates.length === 1) {
  // Individual toast already shown
}
```

### 5.2 Worker still handles edge cases
Worker in `intake_ingestion_service.py` continues to handle:
- Files uploaded before this change (no `is_deduplicated` flag)
- Race conditions where file completes processing after upload check

---

## Files to Modify

| Layer | File | Change |
|-------|------|--------|
| **Backend** | `backend/app/models/file.py` | Add `is_deduplicated` column |
| **Backend** | `backend/app/schemas/file.py` | Add to `FileUploadResponse` |
| **Backend** | `backend/app/api/v1/files.py` | Detection + set flag at upload |
| **Backend** | `backend/app/schemas/intake.py` | Add `is_from_cached_file` to suggestion |
| **Backend** | `backend/app/services/intake_service.py` | Include flag in hydrate |
| **Backend** | `alembic/versions/` | New migration for column |
| **Frontend** | `frontend/lib/api/projects.ts` | Type update |
| **Frontend** | `frontend/.../intake-panel-content.tsx` | Return response |
| **Frontend** | `frontend/.../quick-upload-section.tsx` | Toast + type update |
| **Frontend** | `frontend/.../files-tab-enhanced.tsx` | Badge for files |
| **Frontend** | `frontend/lib/types/intake.ts` | Add `isFromCachedFile` |
| **Frontend** | `frontend/.../suggestion-row.tsx` | Badge/indicator |

---

## User Flow After Implementation

```
1. User uploads PDF in Intake Panel
   └─ Upload progress shows

2. Backend checks file_hash
   ├─ NEW FILE: Returns { is_deduplicated: false }
   │   └─ Toast: "report.pdf queued for processing"
   │   └─ "Analyzing 1 document..." appears
   │   └─ Suggestions appear after ~5-15s
   │
   └─ DUPLICATE: Returns { is_deduplicated: true, cached_from_date: "..." }
       └─ Toast: "Duplicate detected — reused analysis from Jan 20"
       └─ File marked "completed" immediately
       └─ Suggestions cloned instantly
       └─ User sees suggestions within 1-2s

3. In Files tab
   └─ File shows "Cached" badge if deduplicated

4. In Intake suggestions
   └─ Source file popover shows "(cached)" if from duplicate
```

---

## Verification

1. Upload new PDF → toast "queued for processing" → suggestions appear after worker
2. Upload same PDF → toast "Duplicate detected — reused analysis from [date]" → suggestions appear instantly
3. Files tab → "Cached" badge on duplicate file
4. Suggestion popover → shows "(cached)" for suggestions from duplicate
5. Refresh page → all state persists (hydration works)
6. `cd backend && make check` passes
7. `cd frontend && bun run check:ci` passes

---

## Decisions Made
- **Language:** English only (add i18n later if needed)
- **Re-process:** No forced re-analysis button (user can rename file if needed)
- **Badge text:** "Cached" instead of "Duplicate" (more positive framing)
- **Toast type:** `info` (blue) not `warning` — duplicates are helpful
