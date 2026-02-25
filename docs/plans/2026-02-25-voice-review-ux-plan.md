# Voice Review UX Improvement Plan

Source docs:
- `docs/plans/2026-02-23-voice-interview-prd.md`
- `docs/plans/2026-02-23-voice-interview-implementation-checklist.md`
- `docs/plans/2026-02-21-voice-intake-technical-spec.md`

Target: fix state confusion, prevent empty finalizations, surface orphans, reduce cognitive load.

## Decisions

- Orphan re-mapping allowed before AND after partial finalize (backend already supports via `import_orphan_projects`).
- Amended items show "Approved" as primary state + subtle "Edited" indicator (small chip/icon). Not a separate state.
- No keyboard shortcuts — users won't use them.
- Phases sequential: 1 → 2 → 3 → 4. Low-risk tasks (copy, tests, instrumentation) parallelizable within phases.

## Problems (prioritized)

| # | Pri | Problem | Impact |
|---|-----|---------|--------|
| 1 | P0 | "Finalize resolved groups" silently creates 0 streams when all items rejected/invalid | Users think import succeeded, data never arrives |
| 2 | P0 | Orphan picker buried below scroll area + finalize bar; permanent dismiss | Unmapped streams = lost data |
| 3 | P1 | 5 backend statuses × 3 hidden sub-types via string matching = 7+ visual states | Cognitive overload, "resolved" ≠ "will import" |
| 4 | P1 | No pre-finalize summary or confirmation | No chance to catch mistakes before irreversible action |
| 5 | P1 | No guided flow — user lands in split-panel with no orientation | "What do I do first?" paralysis |
| 6 | P2 | Confidence % without context (is 72% good?) | Users can't make informed accept/reject decisions |
| 7 | P2 | Mobile tab-switching loses review context | Transcript ↔ review requires mental state juggling |
| 8 | P2 | All-rejected groups show as "resolved" with green checkmark | False progress signal |

## State model

### Current (developer-facing)

```
pending_review → accepted | amended | rejected | invalid
                                                   ↳ "Needs mapping" | "Wrong location" | "Needs review"
```

### Proposed (user-facing, 3 states)

Stream states:

| State | Badge | Meaning |
|---|---|---|
| Needs review | `yellow` | Untouched, pending user decision |
| Approved | `green` | Will be imported (accepted or amended) |
| Approved (edited) | `green` + subtle edit icon | User modified AI-extracted value; will be imported |
| Skipped | `muted` | Won't be imported (rejected) |

Group states:

| State | Indicator | Meaning |
|---|---|---|
| Review needed | `●` yellow | Has pending items |
| Ready to import | `✓` green | All items decided, ≥1 approved |
| Empty | `○` muted | All items skipped — nothing to import |
| Imported | `✓✓` | Already finalized |

Items with missing location mapping → surfaced in orphan section (not hidden behind substring match on `reviewNotes`).

## Flow

### Happy path

```
Upload audio → Processing stepper → Review workspace
                                        │
                                        ├─ Context banner: "{n} streams extracted. Review each group, then import."
                                        ├─ Step indicator: Review (●) → Import (○)
                                        │
                                        ├─ Groups with items (accept/amend/reject)
                                        ├─ Orphan section (ABOVE finalize bar, collapsible, always accessible)
                                        │
                                        ├─ Bottom bar: "Import {n} streams from {m} groups" (disabled if 0 importable)
                                        │      ↓ click
                                        ├─ Pre-finalize dialog:
                                        │     "You're about to create {n} waste streams across {m} locations.
                                        │      {k} items will be skipped. [Cancel] [Import {n} streams]"
                                        │      ↓ confirm
                                        └─ Success screen with counts
```

### Error paths

```
All items skipped in selection:
  → Button disabled: "No streams to import"
  → Tooltip: "Approve at least 1 stream to import"

Orphans exist at finalize:
  → Dialog warns: "{n} streams couldn't be mapped to a location.
     Import anyway? They won't be included."
  → After partial finalize, orphan section remains accessible for later assignment

Finalize with 0 importable streams:
  → Blocked entirely. Button stays disabled.
```

## Wireframes

### Desktop (split-panel)

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to imports    Voice Interview: "Site visit Jun 12"   │
│                                                             │
│ ┌─ Step: [① Review ●]─────[② Import ○] ──────────────────┐ │
│ │  12 streams extracted · 8 approved · 1 needs mapping     │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌──────────────────────┬────────────────────────────────────┐│
│ │ TRANSCRIPT           │ REVIEW                             ││
│ │                      │                                    ││
│ │ [▶ 0:00/12:34]      │ ┌─ Main St Facility ──── ✓ Ready ┐││
│ │                      │ │ ☑ Cardboard    [Approved]  ▸   │││
│ │ "We've got about     │ │ ☑ Mixed paper  [Approved]  ▸   │││
│ │  three tons of       │ │ ☐ Glass        [Skipped]   ▸   │││
│ │  cardboard..."       │ └────────────────────────────────┘││
│ │                      │                                    ││
│ │ "And there's some    │ ┌─ Oak Ave Site ───── ● Review ──┐││
│ │  mixed paper too"    │ │ ☐ Plastic     [Needs review] ▸ │││
│ │                      │ └────────────────────────────────┘││
│ │                      │                                    ││
│ │                      │ ┌─ ⚠ 1 unmapped stream ──────────┐││
│ │                      │ │ "Elm Street" → [Select location▾]│
│ │                      │ └────────────────────────────────┘││
│ │                      │                                    ││
│ └──────────────────────┴────────────────────────────────────┘│
│ ┌───────────────────────────────────────────────────────────┐│
│ │ ☑ 2 groups selected    [Import 5 streams from 2 groups]  ││
│ └───────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Mobile (tabs)

```
┌───────────────────────┐
│ ← Voice Interview     │
│                       │
│ [① Review ●][② Import]│
│ 12 streams · 8 approved│
│                       │
│ [Transcript] [Review] │
│              ^^^^^^^^  │
│                       │
│ ┌─ Main St ── ✓ Ready┐│
│ │ Cardboard [Approved]││
│ │ Paper     [Approved]││
│ │ Glass     [Skipped] ││
│ └─────────────────────┘│
│                       │
│ ⚠ 1 unmapped stream   │
│ [Assign location]     │
│                       │
│┌─────────────────────┐│
││ [Import 5 streams]  ││
│└─────────────────────┘│
└───────────────────────┘
```

## Microcopy

| Element | Current | Proposed |
|---|---|---|
| Finalize button | "Finalize resolved groups" | "Import {n} streams from {m} groups" |
| Button disabled tooltip | *(none)* | "Approve at least 1 stream to enable import" |
| Empty group badge | "Resolved" (green) | "Empty — all skipped" (muted) |
| Context banner | *(none)* | "{n} streams extracted from your recording. Review each group, then import." |
| Pre-finalize dialog title | *(none)* | "Import {n} waste streams?" |
| Pre-finalize dialog body | *(none)* | "This will create {n} streams across {m} locations. {k} skipped items won't be imported." |
| Confirm button | *(none)* | "Import {n} streams" |
| Orphan section header | "Unmatched streams" | "⚠ {n} streams need a location" |
| Orphan dismiss | "Dismiss" (permanent) | *(removed — section collapsible, always accessible)* |
| Success toast | "Finalized" | "✓ {n} streams imported to {m} locations" |
| Confidence | "72%" | "72% match · AI-suggested" |
| Amended item | *(same as accepted)* | "Approved" badge + small pencil icon |

## Implementation

### Phase 1 — Quick wins (1-2 days)

Fixes P0-1, P0-2, P2-6. Minimal code changes, maximum safety improvement.

| Task | File(s) | Change |
|---|---|---|
| T1.1 Rename finalize button | `voice-review-workspace.tsx` | Dynamic label: "Import {n} streams from {m} groups" |
| T1.2 Move orphan picker above finalize bar | `voice-review-workspace.tsx` | Move `OrphanStreamPicker` render from line ~591 to before bottom bar |
| T1.3 Remove permanent orphan dismiss | `voice-review-workspace.tsx`, `orphan-stream-picker.tsx` | Replace dismiss with `Collapsible`; remove `setOrphansDismissed` |
| T1.4 Block empty finalize | `voice-review-guards.ts` | New guard: `hasImportableStreams` — check ≥1 accepted/amended in selected groups |
| T1.5 Tooltip on disabled button | `voice-review-workspace.tsx` | Wrap in `Tooltip`: "Approve at least 1 stream to import" |
| T1.6 Confidence context | `stream-card.tsx` | Append "· AI-suggested" to confidence badge |

### Phase 2 — Pre-finalize dialog (1 day)

Fixes P1-4. Prevents irreversible mistakes.

| Task | File(s) | Change |
|---|---|---|
| T2.1 Create `ConfirmImportDialog` | New component (reuse `AlertDialog` pattern from `ConfirmDeleteDialog`) | Show counts: importing, skipping, locations |
| T2.2 Wire dialog to finalize flow | `voice-review-workspace.tsx` | `finalizeSelected()` → open dialog → confirm → call API |
| T2.3 Empty group visual state | `location-group-card.tsx` | All items rejected: muted badge "Empty — all skipped", muted card style |
| T2.4 Orphan warning in dialog | `ConfirmImportDialog` | If orphans exist: "{n} streams couldn't be mapped. They won't be included." |

### Phase 3 — State model + orientation (2-3 days)

Fixes P1-3, P1-5, P2-8. Core UX improvement.

| Task | File(s) | Change |
|---|---|---|
| T3.1 Simplify state taxonomy | `stream-card.tsx`, `location-group-card.tsx` | 3 user-facing states: Needs review / Approved / Skipped. Amended → Approved + edit icon |
| T3.2 Context banner | `voice-review-workspace.tsx` | `Alert` component top: "{n} streams extracted. Review each group, then import." |
| T3.3 Step indicator | `voice-review-workspace.tsx` | 2-step indicator (Review → Import); reuse pattern from `project-progress-indicator.tsx` |
| T3.4 Group auto-expand | `voice-review-workspace.tsx` | Auto-expand first group with pending items; collapse fully-resolved |
| T3.5 Derive group status from contents | `location-group-card.tsx` | "Ready" (≥1 approved), "Review" (has pending), "Empty" (all skipped) |
| T3.6 Orphan count in step indicator | `voice-review-workspace.tsx` | Badge on step indicator when orphans exist: "{n} unmapped" |

### Phase 4 — Mobile + polish (1-2 days)

Fixes P2-7. Quality-of-life improvements.

| Task | File(s) | Change |
|---|---|---|
| T4.1 Auto-switch to review tab | `voice-review-workspace.tsx` | When transcript finishes, switch active tab |
| T4.2 Staggered card animations | `location-group-card.tsx` | Reuse pattern from `import-review-section.tsx` |
| T4.3 Success screen with counts | `voice-success-screen.tsx` | "{n} streams imported to {m} locations" with `SuccessAnimation` |
| T4.4 Orphan post-finalize flow | `voice-review-workspace.tsx`, `orphan-stream-picker.tsx` | After partial finalize, orphan section stays visible with "Assign remaining streams" CTA |

## Metrics

| Metric | What to measure | Target |
|---|---|---|
| Empty finalize rate | Finalizations that create 0 streams / total finalizations | → 0% |
| Orphan assignment rate | Orphans assigned to location / total orphans surfaced | +50% vs baseline |
| Time to first finalize | Seconds from workspace load to first finalize click | -30% vs baseline |
| Support tickets | "Nothing imported" / "streams missing" tickets | → 0 |
| Finalize abandonment | Users who open workspace but never finalize | -20% vs baseline |

## Key files

| File | Lines | Role |
|---|---|---|
| `frontend/components/features/voice-interview/voice-review-workspace.tsx` | 830 | Main workspace — primary target |
| `frontend/components/features/voice-interview/location-group-card.tsx` | 192 | Group card |
| `frontend/components/features/voice-interview/stream-card.tsx` | 183 | Stream item card |
| `frontend/components/features/voice-interview/voice-review-guards.ts` | 45 | Finalize/map guards |
| `frontend/components/features/shared/orphan-stream-picker.tsx` | 200 | Orphan assignment |
| `frontend/components/features/voice-interview/transcript-panel.tsx` | 217 | Transcript + audio |
| `frontend/components/features/voice-interview/voice-success-screen.tsx` | 108 | Success screen |
| `frontend/components/features/bulk-import/import-review-section.tsx` | 1216 | Reusable patterns: AnimatedCount, SuccessAnimation, staggered cards |
| `backend/app/services/bulk_import_service.py` | 2596+ | Finalize logic, orphan import |

## Reuse targets

- `AlertDialog` from shadcn → `ConfirmImportDialog`
- `ConfirmDeleteDialog` pattern → dialog structure, button layout, loading state
- `project-progress-indicator.tsx` → step indicator pattern
- `import-review-section.tsx` → `AnimatedCount`, `SuccessAnimation`, staggered animation, bottom bar with progress
- `Badge` (7 variants) → state badges
- `Tooltip` → disabled button explanation
- `Collapsible` → orphan section toggle
- `Alert` → context banner
- `EmptyState` → empty group state
