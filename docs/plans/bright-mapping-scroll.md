# UX Plan: Feedback Attachments

UI/UX only. No backend/API changes.

## Context

- Current user dialog: `sm:max-w-md`, 2 fields (type dropdown, textarea), simple submit
- Current admin: table with Date/Type/Content/Status/Action; expand chevron only if content > 80 chars
- Existing infra: `UploadDropZone` (too heavy for dialog), `UploadingFilesCard`, `FILE_TYPE_ICONS`, `formatFileSize`, react-dropzone dep
- Backend gives: `is_previewable`, `downloadUrl` always, `previewUrl` only if safe image

## Files to modify

- `frontend/components/features/feedback/feedback-dialog.tsx` — user attachment UX
- `frontend/app/admin/feedback/page.tsx` — admin attachment display
- `frontend/lib/api/feedback.ts` — add `uploadAttachments()`, `listAttachments()`

---

## Option A: Ultra Simple

### User Dialog

**What changes:**
- Below textarea: text button `📎 Attach files` (Paperclip icon + text, `variant="ghost" size="sm"`)
- Hidden `<input type="file" multiple>` — click triggers file picker
- No drag-drop
- Selected files: `<ul>` below button. Each item: filename (truncated) + size + X button. Max height with scroll if 5 files.
- Client validation messages inline below the list

**Submit flow (invisible 2-step):**
1. User clicks "Send Feedback" → single `LoadingButton` spinner
2. Step 1: `feedbackAPI.submit(payload)` → get `feedbackId`
3. Step 2 (if files): `feedbackAPI.uploadAttachments(feedbackId, files)`
4. Both succeed → toast "Thanks for your feedback!" + close
5. Step 2 fails → toast.warning "Feedback sent, but attachments failed to upload" + dialog stays open, form replaced with:
   - Message: "Your feedback was received. Attachments could not be uploaded."
   - File list still visible
   - "Retry Upload" button (re-calls step 2 with saved `feedbackId`)
   - "Close" button (dismiss; feedback already saved)
6. Step 1 fails → toast.error "Failed to send feedback" (same as today)

**State machine:**
```
idle → submitting → uploading → done (close)
                  ↘ uploadFailed → retrying → done (close)
                                            ↘ uploadFailed (loop)
```

**Pros:** Minimal new components. ~60 lines added to dialog. No new deps. Clear error recovery.
**Cons:** No drag-drop. No upload progress. File picker is basic. No file type icons.

### Admin Page

**What changes:**
- `AdminFeedbackItem` type adds `attachmentCount: number` (from list endpoint)
- Content column: show `📎 N` badge inline after content/pagePath text if `attachmentCount > 0`
- Expand chevron: show if `content.length > 80 OR attachmentCount > 0`
- Expanded area: below content text, a divider + "Attachments" heading + simple list
  - Each: filename + size + `<a>` download link
  - If `isPreviewable`: 48×48 `<img>` thumbnail inline before filename
  - If not previewable: generic file icon (from `FILE_TYPE_ICONS`)
- Fetch: `feedbackAPI.listAttachments(id)` on expand; cache in `Map<string, Attachment[]>` state
- Loading: `Loader2` spinner in attachment area while fetching
- Error: "Failed to load attachments" text + "Retry" link

**Pros:** Minimal table layout changes. Reuses expand pattern. Low complexity.
**Cons:** Thumbnails are small (48px). No lightbox. Inline list can feel cramped in table.

---

## Option B: Better UX (still simple)

### User Dialog

**What changes:**
- Widen dialog to `sm:max-w-lg` to accommodate file list
- Below textarea: `📎 Attach files (N/5)` ghost button — same hidden input approach
- Additionally: accept drag-drop onto the dialog body (use react-dropzone's `useDropzone` on DialogContent div, lightweight — no visible drop zone unless dragging)
  - On drag-over: subtle `ring-2 ring-primary/50` outline on dialog
  - On drop: add files to list
- Selected files: compact card per file (rounded border, `p-2`):
  - File type icon (reuse `FILE_TYPE_ICONS`) + filename (truncated) + size text + X button
  - Layout: vertical stack, max-height 160px with overflow scroll
- Client validation: per-file inline error (red text under offending card if > 10MB), count error below list ("Maximum 5 files")

**Submit flow (same 2-step, better feedback):**
1. "Send Feedback" clicked → button shows "Sending..."
2. Step 1 succeeds → if files, button changes to "Uploading files..." with simple text progress ("Uploading 2/3...")
3. Both succeed → toast "Thanks for your feedback!" + close
4. Step 2 fails → dialog body transitions to recovery state:
   - Subtle `bg-amber-50 dark:bg-amber-950/20` banner at top: "Feedback received. Attachments failed."
   - File list still visible with error status
   - "Retry Upload" primary button + "Close" outline button
   - On retry: "Uploading..." state again
5. Step 1 fails → same as today

**State management:** Same state machine as Option A, but `uploading` state shows progress text.

**Pros:** Drag-drop for power users. File type icons improve scannability. Upload progress text reduces anxiety. Inline recovery state is clearer than toast-only.
**Cons:** ~120 lines added. `useDropzone` on dialog needs careful z-index. Wider dialog is a minor layout change.

### Admin Page

**What changes:**
- Same `📎 N` badge on rows (same as A)
- Same expand chevron logic (same as A)
- Expanded area gets a styled "Attachments" section:
  - Horizontal flex-wrap layout (not vertical list)
  - Each attachment as a compact card (`w-28`, `rounded-lg border p-2`):
    - Previewable: 80×80 thumbnail (`object-cover rounded`), filename below (truncated, `text-xs`), download icon button
    - Non-previewable: centered file icon (from `FILE_TYPE_ICONS`, `h-8 w-8`), filename below, "No preview" subtle text, download icon button
  - Max 1 row visible; if > ~4, horizontal scroll or wrap to second row
- Fetch + cache: same as A (`Map<string, Attachment[]>`)
- Loading: skeleton cards (3 × `Skeleton className="h-24 w-28"`) while fetching
- Error: same as A but inside card area

**Pros:** Visual attachment cards are scannable. Thumbnails are bigger (80px). Horizontal layout doesn't push table content down much. Feels intentional.
**Cons:** Slightly more complex CSS (flex-wrap in table cell). Cards need min-width handling. ~40 more lines than A.

---

## Copy / Error Strings

### User dialog
| Key | String |
|-----|--------|
| attach_label | "Attach files" |
| attach_count | "Attach files (N/5)" (Option B) |
| too_many | "Maximum 5 files allowed" |
| too_large | "File exceeds 10 MB limit" |
| submit_sending | "Sending..." |
| submit_uploading | "Uploading files..." (B) / same spinner (A) |
| upload_progress | "Uploading N/M..." (B only) |
| success | "Thanks for your feedback!" |
| partial_fail_toast | "Feedback sent, but attachments failed to upload" (A) |
| partial_fail_banner | "Your feedback was received. Attachments could not be uploaded." |
| retry_label | "Retry Upload" |
| submit_fail | "Failed to send feedback" |

### Admin page
| Key | String |
|-----|--------|
| badge | "📎 N" (or Paperclip icon + count) |
| loading | spinner / skeleton |
| error | "Failed to load attachments" |
| retry | "Retry" |
| no_preview | "No preview" (B only, on non-previewable cards) |
| download | "Download" (sr-only on icon button) |

---

## Recommendation: Option B

**Why B over A:**
1. Drag-drop costs ~15 extra lines (react-dropzone already a dep) and matches user expectations for file attach
2. File type icons from existing `FILE_TYPE_ICONS` map make the file list scannable vs raw filenames
3. Upload progress text ("Uploading 2/3...") significantly reduces user anxiety on slow connections — nearly free to implement (just a counter)
4. Admin thumbnail cards at 80px are the minimum usable size for image preview; 48px (Option A) is too small to be useful — you'd squint and click download anyway
5. Inline recovery state (amber banner + retry) is more discoverable than a toast that disappears

**Why still simple:**
- No progress bars per file (single batch upload, all-or-nothing)
- No lightbox/modal for previews (admin clicks download or opens in new tab)
- No drag-reorder, no file rename, no edit
- Cache is a simple `Map` (no SWR/react-query)
- State machine has only 5 states

**Use `frontend-design` skill for implementation:**
The dialog recovery state (amber banner, file cards, retry flow) and admin attachment cards (thumbnail grid with download overlays) are the two areas where visual polish matters. The skill ensures:
- Consistent spacing/radius with existing shadcn components
- Proper dark mode handling on amber warning states
- Accessible contrast ratios on file type icon backgrounds
- The attachment cards avoid "generic AI aesthetic" — important since this is a user-facing component

---

## Unresolved

- Should "Attach files" button be visible by default, or behind a "+" icon that reveals it? (Recommend: visible by default — discovery > minimalism for feedback)
- Should admin attachment fetch happen on expand, or prefetch on hover? (Recommend: on expand — simpler, no wasted requests)
