# Accordion State Persistence Patterns Analysis

## Executive Summary

**Recommendation: Use localStorage with project-scoped keys via Zustand + persist middleware**

This aligns with your existing architecture (already using Zustand with localStorage persistence in `project-store.ts` and `technical-data-store.ts`) and provides the best balance of simplicity, user expectations, and maintainability.

---

## Pattern Comparison

### 1. localStorage (Recommended)

**When to use:** User expects form to "remember" their view across sessions

**Pros:**
- Persists across browser sessions (survives restarts)
- Simple implementation with Zustand's persist middleware
- No URL pollution
- Works offline
- Aligns with existing store patterns in codebase

**Cons:**
- Not shareable via URL
- Data persists until explicitly cleared
- Per-browser (not synced across devices)

**Implementation:**
```typescript
// lib/stores/accordion-store.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

interface AccordionState {
  // Map of projectId -> expanded section IDs
  expandedSections: Record<string, string[]>;
  toggleSection: (projectId: string, sectionId: string) => void;
  expandSection: (projectId: string, sectionId: string) => void;
  collapseSection: (projectId: string, sectionId: string) => void;
  expandAll: (projectId: string, sectionIds: string[]) => void;
  collapseAll: (projectId: string) => void;
}

export const useAccordionStore = create<AccordionState>()(
  persist(
    immer((set) => ({
      expandedSections: {},

      toggleSection: (projectId, sectionId) => {
        set((state) => {
          const current = state.expandedSections[projectId] ?? [];
          const isExpanded = current.includes(sectionId);
          state.expandedSections[projectId] = isExpanded
            ? current.filter((id) => id !== sectionId)
            : [...current, sectionId];
        });
      },

      expandSection: (projectId, sectionId) => {
        set((state) => {
          const current = state.expandedSections[projectId] ?? [];
          if (!current.includes(sectionId)) {
            state.expandedSections[projectId] = [...current, sectionId];
          }
        });
      },

      collapseSection: (projectId, sectionId) => {
        set((state) => {
          const current = state.expandedSections[projectId] ?? [];
          state.expandedSections[projectId] = current.filter(
            (id) => id !== sectionId
          );
        });
      },

      expandAll: (projectId, sectionIds) => {
        set((state) => {
          state.expandedSections[projectId] = sectionIds;
        });
      },

      collapseAll: (projectId) => {
        set((state) => {
          state.expandedSections[projectId] = [];
        });
      },
    })),
    {
      name: "h2o-accordion-state",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Hook for project-specific accordion state
export function useProjectAccordion(projectId: string) {
  const expandedSections = useAccordionStore(
    (state) => state.expandedSections[projectId] ?? []
  );
  const { toggleSection, expandAll, collapseAll } = useAccordionStore();

  return {
    expandedSections,
    toggleSection: (sectionId: string) => toggleSection(projectId, sectionId),
    expandAll: (sectionIds: string[]) => expandAll(projectId, sectionIds),
    collapseAll: () => collapseAll(projectId),
  };
}
```

**Usage in component:**
```typescript
// components/features/technical-data/flexible-data-capture.tsx
function FlexibleDataCapture({ sections, projectId }: Props) {
  const { expandedSections, toggleSection, expandAll, collapseAll } = 
    useProjectAccordion(projectId);

  return (
    <Accordion
      type="multiple"
      value={expandedSections}
      onValueChange={(values) => {
        // Sync with store when accordion changes
        const currentSet = new Set(expandedSections);
        const newSet = new Set(values);
        
        // Find what changed
        for (const id of values) {
          if (!currentSet.has(id)) {
            toggleSection(id);
          }
        }
        for (const id of expandedSections) {
          if (!newSet.has(id)) {
            toggleSection(id);
          }
        }
      }}
    >
      {sections.map((section) => (
        <SectionAccordionItem
          key={section.id}
          section={section}
          onToggle={() => toggleSection(section.id)}
        />
      ))}
    </Accordion>
  );
}
```

---

### 2. sessionStorage

**When to use:** Temporary form state that should reset when tab closes

**Pros:**
- Auto-cleanup when tab closes
- No long-term storage concerns
- Good for sensitive data

**Cons:**
- Lost on browser restart
- Surprising UX (user expects persistence)

**Verdict:** Not recommended for accordion state - users expect UI preferences to persist.

---

### 3. URL Query Params

**When to use:** Shareable views, deep-linking to specific form states

**Pros:**
- Shareable URLs
- Back button navigation works
- Self-documenting state

**Cons:**
- URL pollution
- Complex to sync with accordion state
- Limited by URL length
- Requires router integration

**Implementation:**
```typescript
// lib/hooks/use-accordion-params.ts
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export function useAccordionParams(paramName = "expanded") {
  const router = useRouter();
  const searchParams = useSearchParams();

  const expandedSections = useMemo(() => {
    const value = searchParams.get(paramName);
    return value ? value.split(",") : [];
  }, [searchParams, paramName]);

  const setExpandedSections = useCallback(
    (sectionIds: string[]) => {
      const params = new URLSearchParams(searchParams);
      if (sectionIds.length > 0) {
        params.set(paramName, sectionIds.join(","));
      } else {
        params.delete(paramName);
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, paramName]
  );

  const toggleSection = useCallback(
    (sectionId: string) => {
      const isExpanded = expandedSections.includes(sectionId);
      const newSections = isExpanded
        ? expandedSections.filter((id) => id !== sectionId)
        : [...expandedSections, sectionId];
      setExpandedSections(newSections);
    },
    [expandedSections, setExpandedSections]
  );

  return { expandedSections, toggleSection, setExpandedSections };
}
```

**Verdict:** Use only if sharing specific form views is a requirement. Adds complexity for marginal benefit.

---

### 4. Global State (Zustand without persistence)

**When to use:** State only needed while app is open

**Pros:**
- Fast, in-memory access
- No storage overhead
- Simple implementation

**Cons:**
- Lost on page refresh
- Violates user expectation of persistence

**Verdict:** Not recommended - accordion state should persist across reloads.

---

### 5. React Key Prop (No persistence)

**When to use:** Fresh state on every mount is desired

**Pros:**
- Simplest implementation
- No state management needed
- Predictable behavior

**Cons:**
- State lost on every unmount
- Poor UX for forms

**Verdict:** Not recommended for accordion state.

---

## Decision Matrix

| Criteria | localStorage | sessionStorage | URL Params | Global State | Key Prop |
|----------|-------------|----------------|------------|--------------|----------|
| Persists across reloads | ✅ | ❌ | ✅ | ❌ | ❌ |
| Persists across sessions | ✅ | ❌ | ✅* | ❌ | ❌ |
| Shareable URL | ❌ | ❌ | ✅ | ❌ | ❌ |
| Simple implementation | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| No URL pollution | ✅ | ✅ | ❌ | ✅ | ✅ |
| Aligns with existing code | ✅ | ⚠️ | ⚠️ | ✅ | ✅ |
| User expectation match | ✅ | ⚠️ | ⚠️ | ❌ | ❌ |

*URL persists but requires bookmarking

---

## Implementation Recommendation

### Option A: Simple localStorage (Recommended for most cases)

Use when:
- User wants form to remember their view
- No need to share specific views
- Simplest solution preferred

See implementation in Pattern 1 above.

### Option B: Hybrid (localStorage + URL override)

Use when:
- User wants default persistence
- Occasional need to share specific views
- Accepting added complexity

```typescript
// lib/stores/accordion-store.ts (hybrid version)
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

interface AccordionState {
  expandedSections: Record<string, string[]>;
  setSections: (projectId: string, sectionIds: string[]) => void;
  toggleSection: (projectId: string, sectionId: string) => void;
}

const STORAGE_KEY = "h2o-accordion-state";

export const useAccordionStore = create<AccordionState>()(
  persist(
    immer((set) => ({
      expandedSections: {},
      
      setSections: (projectId, sectionIds) => {
        set((state) => {
          state.expandedSections[projectId] = sectionIds;
        });
      },
      
      toggleSection: (projectId, sectionId) => {
        set((state) => {
          const current = state.expandedSections[projectId] ?? [];
          const isExpanded = current.includes(sectionId);
          state.expandedSections[projectId] = isExpanded
            ? current.filter((id) => id !== sectionId)
            : [...current, sectionId];
        });
      },
    })),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Hook that respects URL params over localStorage
export function useProjectAccordion(projectId: string, allSectionIds: string[]) {
  const searchParams = useSearchParams();
  const store = useAccordionStore();
  
  // Check for URL override
  const urlExpanded = searchParams.get("expanded");
  
  // Use URL if present, otherwise fall back to store
  const expandedSections = useMemo(() => {
    if (urlExpanded) {
      return urlExpanded.split(",").filter((id) => allSectionIds.includes(id));
    }
    return store.expandedSections[projectId] ?? [];
  }, [urlExpanded, store.expandedSections, projectId, allSectionIds]);

  return {
    expandedSections,
    toggleSection: (sectionId: string) => {
      store.toggleSection(projectId, sectionId);
    },
    expandAll: () => {
      store.setSections(projectId, allSectionIds);
    },
    collapseAll: () => {
      store.setSections(projectId, []);
    },
  };
}
```

---

## Migration Path for Existing Code

Current `flexible-data-capture.tsx` uses local `useState`. To migrate:

1. **Create store** (see Pattern 1 implementation)
2. **Update component**:

```typescript
// Before
const [accordionValue, setAccordionValue] = useState<string[]>(...);

// After
const { expandedSections, toggleSection, expandAll, collapseAll } = 
  useProjectAccordion(projectId);
```

3. **Update Accordion component**:

```typescript
<Accordion
  type="multiple"
  value={expandedSections}
  onValueChange={(values) => {
    // Determine what changed and toggle accordingly
    const current = new Set(expandedSections);
    const next = new Set(values);
    
    for (const id of allSectionIds) {
      const wasExpanded = current.has(id);
      const isExpanded = next.has(id);
      if (wasExpanded !== isExpanded) {
        toggleSection(id);
      }
    }
  }}
>
```

---

## Key Questions Answered

### 1. What does "navigate away" mean?

Based on context, this means:
- Different route in same app (e.g., project list → project detail)
- Page refresh/reload
- NOT different website (that would clear all state anyway)

### 2. How long should state persist?

**Recommendation:** Until user clears browser data or explicitly resets.

Rationale:
- UI preferences are user data
- No security concerns with accordion state
- Aligns with principle of least surprise

### 3. Per-project or global?

**Answer:** Per-project, keyed by `projectId`.

Different projects have different sections. Expanding "Wastewater Characteristics" in Project A doesn't mean user wants it expanded in Project B.

### 4. User's mental model?

Most likely: **"I want the form to remember my view"**

Not: "I want to share this view" (unless explicitly requested)
Not: "I want this to reset every time"

---

## Final Recommendation

**Use Pattern 1 (localStorage with Zustand)** because:

1. ✅ Aligns with existing store patterns in codebase
2. ✅ Simple implementation (~50 lines)
3. ✅ Meets user expectations
4. ✅ No URL pollution
5. ✅ Survives reloads and browser restarts
6. ✅ Per-project scoping prevents cross-contamination
7. ✅ Easy to extend later (add URL params, sessionStorage fallback, etc.)

Start simple. Add complexity (URL params, hybrid approach) only when user feedback demands it.
