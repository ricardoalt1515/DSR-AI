## Wireframe: Assessment / Project Intake (Multi-sector)

Goal: Guided, modular intake that adapts by sector pack, shows readiness, and links evidence in-context.

### Layout (Desktop)
```
┌───────────────────────────────────────────────────────────┐
│ Header                                                    │
│ [Project Name]   [Sector Pack: Waste ▼]   [Status badge] │
│ [Client · Location]                                  [CTA Generate (disabled until must-have)] │
└───────────────────────────────────────────────────────────┘
┌───────────────────────┬───────────────────────────────────┐
│ Left Sidebar (Sticky) │ Main Canvas                      │
│                       │                                   │
│ Readiness card        │ Stepper (only first time / collapsible) │
│ - Progress %          │ 1) Basics (Org, Site)            │
│ - Must-have checklist │ 2) Sector Pack & Goal            │
│ - Top 3 gaps (links)  │ 3) Critical Data (must-have)     │
│ CTA: Generate/Preview │ 4) Attachments                    │
│                       │                                   │
│ What this unlocks     │ ────────── Assessment Sections ───────── │
│ - e.g. Pathways, BOM  │ [Accordion] Section A (must) (3/5)       │
│ - e.g. Cost rough     │   • Field rows with helper/unit/state    │
│                       │   • Inline dropzone for related files    │
│ Pack Switch           │ [Accordion] Section B (should) (1/4)     │
│ - Change pack (warn)  │ [Accordion] Optional Blocks (catalog)    │
│ - View pack info      │   “+ Add Site Photos block”              │
└───────────────────────┴───────────────────────────────────┘
```

### Component Behaviors
- **Readiness card**: shows %; list of must-have items with checkmarks; “Top gaps” are links to specific fields.
- **Pack selector**: drop-down; warning dialog if switching with data filled; loads schema (sections/fields) per pack.
- **Accordion Sections**:
  - Header: title, must/should badge, completion X/Y, tooltip.
  - Body: fields as cards or rows with label, helper, unit, source badge (AI/Manual/Import), validation icon, last updated.
  - Attachments: dropzone + previews for photos/labs/specs; thumbnails inline.
- **Optional Blocks catalog**: list of blocks with short description; clicking adds a section to the accordion.
- **What this unlocks**: small panel showing which outputs improve when must-haves are done (pathways, BOM, costs).
- **CTA Generate**: disabled until must-haves complete; hovering shows checklist.

### Mobile/Small
- Collapsible sidebar content into top cards (Readiness, CTA).
- Accordions stay; fewer items visible at once; pack selector in header sheet.

### Visual Notes
- Typography: modern sans (e.g., Manrope/Space Grotesk), clear hierarchy.
- Accent by sector (green waste / blue water) but consistent components.
- Cards with generous padding; subtle shadows; badges for status/priorities.

### Data Model Hooks (for schema-driven UI)
- Section: { id, label, priority: must|should|optional, description, fields[], attachments[], visibility: [packs], order }
- Field: { id, label, type, unit, helper, example, options, priority, source, validated, lastUpdated, dependsOn }
- Block catalog: predefined sections that can be added dynamically.
