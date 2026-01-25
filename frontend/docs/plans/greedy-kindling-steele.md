# Files UI Cleanup: Post-Implementation Fixes

## Problem
Code review identified issues from the Files UI simplification:
1. Misleading "virtualization" comment (no virtualization exists)
2. Unused `containerRef` (dead code)
3. `toggleButtonRef` never assigned → focus-return broken
4. `setTimeout(..., 0)` for download revoke may fail in some browsers

## Changes Required

### 1. Fix `file-list.tsx`
**Remove misleading comment and dead code:**
```typescript
// Line 101-103: Change comment
- * Uses virtualization for performance with large lists.
+ * Supports filtering, sorting, and URL state sync.

// Line 119: Remove unused ref
- const containerRef = useRef<HTMLDivElement>(null);
```

### 2. Fix `file-list-item.tsx`
**Remove broken focus ref (chosen approach):**
```typescript
// Remove toggleButtonRef entirely - it's never assigned
- const toggleButtonRef = useRef<HTMLButtonElement>(null);

// Simplify handleCollapse - remove broken focus attempt
const handleCollapse = useCallback(() => {
  onToggleExpand(file.id);
}, [file.id, onToggleExpand]);
```

### 3. Fix `files-tab-enhanced.tsx`
**Safer blob URL revoke timeout:**
```typescript
// Line 99: Change timeout from 0 to 100ms for safer cleanup
- setTimeout(() => URL.revokeObjectURL(url), 0);
+ setTimeout(() => URL.revokeObjectURL(url), 100);
```

## Files to Modify
| File | Change |
|------|--------|
| `file-list.tsx` | Remove "virtualization" comment, delete `containerRef` |
| `file-list-item.tsx` | Remove broken `toggleButtonRef` and focus code |
| `files-tab-enhanced.tsx` | Change download revoke timeout 0→100 |

## Not Fixing (Rationale)
- **handleDownload/handleView duplication in file-actions-bar.tsx**: Only 2 instances, simple logic. Extraction would add indirection without significant benefit.
- **file-uploader-sections.tsx issues**: Out of scope (not touched in this PR)

## Verification
```bash
cd frontend && bun run check:ci
```
