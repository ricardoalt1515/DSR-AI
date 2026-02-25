# Voice Review: Orphan UX Fix

**Problem**: When AI extracts streams but finds 0 valid locations, orphan groups render as normal LocationGroupCards with misleading titles ("Location — Acme"). Users see "Import 0 streams" (disabled), don't understand why. The orphan picker (actual fix) is buried below in a Collapsible.

**Constraint**: No backend changes. Orphan groups are all-or-nothing per backend grouping.

## Tasks

| # | Task | Files |
|---|------|-------|
| T1 | Split `pendingGroups` → `actionableGroups` (exclude orphan-only groups) using `orphanItemIds` set. Update `resolvedGroupIds`, `totalGroups`, `importableStreamCount` to use `actionableGroups`. Derive `orphanGroupNames` for mention card. | `voice-review-workspace.tsx` |
| T2 | Add `"orphans_need_location"` to `FinalizeDisabledReason` + `orphanCount` param. Logic: `groupsCount === 0 && orphanCount > 0 → "orphans_need_location"` | `voice-review-guards.ts` |
| T3 | Hide finalize bar when `actionableGroups=0 && orphanItems=0 && importedGroups>0` (run effectively complete, prevents 422) | `voice-review-workspace.tsx` |
| T4 | Promote orphan picker inline (no Collapsible). Remove `showOrphanCta` state + amber CTA banner. Add lightweight mention card showing detected location names below picker. | `voice-review-workspace.tsx` |
| T5 | Copy: `_statusLabel` "Needs mapping"→"Needs location". Header badge "unmapped"→"need location". Banner: differentiate all-orphan vs mixed. Button: "Assign locations first" when `orphans_need_location`. | `voice-review-workspace.tsx` |
| T6 | Tests: `getFinalizeDisabledReason` with orphan cases. `bun run check:ci` + `bun test`. | `voice-review-workspace.test.ts` |
