# Plan: Frontend Code Simplification — Round 2 (Adjusted)

## Context
- Round 1 already landed (dead code removed, deps removed, type-safety fixes, store/hydration cleanup, etc.).
- Goal for this round: **frontend-only**, small/safe simplifications that improve readability and maintainability **without changing behavior**.

## Guardrails (must-haves)
- Preserve exact UX/behavior.
- Avoid `any`, avoid new dependencies.
- Avoid nested ternaries (use lookup objects / if-else).
- Prefer clear naming over cleverness.
- Keep JSX readable (extract small helpers when it makes the JSX clearer).

---

## Scope (files to touch)
1) `frontend/components/features/dashboard/components/premium-project-wizard.tsx`
2) `frontend/components/features/proposals/proposal-overview.tsx`
3) `frontend/components/features/dashboard/components/project-card.tsx`
4) `frontend/app/dashboard/page.tsx`
5) `frontend/components/features/technical-data/components/data-capture/flexible-data-capture.tsx`
6) `frontend/components/features/projects/intelligent-proposal-generator.tsx`

---

## Tasks

### 1) Premium Project Wizard — remove dead code + nested ternary
File: `frontend/components/features/dashboard/components/premium-project-wizard.tsx`

**Problems**
- Nested ternary for sector colors exists in a block of code that appears unused.
- Dead/unreferenced declarations (verify with `rg` + TypeScript): `SECTORS`, `Sector` interface, `SECTOR_ICONS`, `getSectorColors`.
- Unused imports: `RadioGroup`, `RadioGroupItem`.

**Steps**
1. Confirm the following symbols are unused (search usages):
   - `SECTORS`
   - `Sector`
   - `SECTOR_ICONS`
   - `getSectorColors`
   - `RadioGroup` / `RadioGroupItem`
2. Remove the unused imports and unused declarations.
3. If any color mapping is actually used, replace the ternary with a lookup object (no nested ternary).

**Done when**
- File compiles and no unused exports/imports remain.
- No behavior change in the wizard UI.

---

### 2) Proposal Overview — replace inline assertions with a typed helper (type guards)
File: `frontend/components/features/proposals/proposal-overview.tsx`

**Problems**
- Inline casting of `clientMetadata` / `attachmentsSummary` / `photoInsights` is noisy and brittle.
- Magic numbers exist (photo insights limit + confidence mapping).
- `Math.random()` is used for `id` fallback (keep as-is unless a safe deterministic alternative is chosen).

**Steps**
1. Introduce small, local helpers in the same file:
   - `function isRecord(value: unknown): value is Record<string, unknown>`
   - `function parsePhotoInsights(clientMetadata: unknown): ResourceInsight[]`
2. Keep output behavior identical:
   - Read from `proposal.aiMetadata.transparency.clientMetadata.attachmentsSummary.photoInsights`.
   - Only accept entries that are objects with an `analysis` object.
   - Limit to the first `6` items.
   - Keep the same defaults:
     - `material`: `"Unknown"`
     - `quality`: `"Medium"` when missing/invalid
     - `priceHint`: `"TBD"`
     - `insight`: `"AI analyzed this material"`
     - `confidence`: `"High" -> 92`, `"Low" -> 75`, otherwise `85`
     - `fileId`/`imageUrl`: `undefined` when absent
3. Replace the inline parsing block with:
   - `const resourceInsights = parsePhotoInsights(proposal.aiMetadata.transparency.clientMetadata);`
4. Replace magic numbers with named constants (keep values the same):
   - `const PHOTO_INSIGHTS_LIMIT = 6;`
   - `const CONFIDENCE_SCORES = { High: 92, Medium: 85, Low: 75 } as const;`

**Done when**
- No `as ResourceInsight` cast is needed.
- The `TopResources` section renders exactly the same insights as before.

---

### 3) Project Card — remove unused `progress` prop (and update call site)
Files:
- `frontend/components/features/dashboard/components/project-card.tsx`
- `frontend/app/dashboard/page.tsx`

**Problem**
- `ProjectCardProps.progress` is passed but intentionally unused (`progress: _progress`).

**Steps**
1. Remove `progress` from `ProjectCardProps`.
2. Remove `progress: _progress` from destructuring.
3. Update `frontend/app/dashboard/page.tsx` to stop passing `progress={project.progress}`.
4. Ensure no other call sites exist (`rg "<ProjectCard"` should only return the dashboard page).

**Done when**
- `ProjectCard` uses only the computed completion percentage as it already does.
- No TypeScript errors and no behavior change.

---

### 4) Flexible Data Capture — remove dead memoized calculations + unused imports
File: `frontend/components/features/technical-data/components/data-capture/flexible-data-capture.tsx`

**Problem**
- `completedFields`, `totalFields`, `completionPercentage` are computed but never rendered.

**Steps**
1. Remove the unused calculations.
2. Remove now-unused imports (likely `useMemo`, `Save`, `Badge`, `Separator`, and any unused type imports like `Sector/Subsector/TableField` — verify).
3. Keep the `focusSectionId` behavior and accordion logic unchanged.

**Done when**
- Component renders identically (minus the removed unused work).
- No lint/type issues from unused imports.

---

### 5) Intelligent Proposal Generator — remove redundant fragment wrapper
File: `frontend/components/features/projects/intelligent-proposal-generator.tsx`

**Problem**
- Non-generating render path returns `<> <Card .../> </>` with a single child.

**Steps**
1. Replace the fragment with a direct `return (<Card ... />);`.

**Done when**
- No behavior change; JSX is simpler.

---

### 6) Optional: dead code check (only if tooling is available)
Command: `bunx knip`

**Note**
- `knip` is not in `frontend/package.json` today. Running via `bunx` may require network access.
- If this environment can’t fetch packages, skip this step or do it in a separate PR that adds `knip` as a dev dependency.

---

## Verification
1. `cd frontend && bun run check:ci`
2. `cd frontend && npx tsc --noEmit`
3. (Optional) `cd frontend && bun run build`

## Manual QA (quick)
1. Open Dashboard → ensure project cards render and delete still works.
2. Open a Proposal Overview → ensure “Photo Evidence” behaves the same (0–6 cards).
3. Open Technical Data capture → ensure accordions, focus scroll, and field editing still work.
4. Open Project page → ensure proposal generator card still renders correctly.

