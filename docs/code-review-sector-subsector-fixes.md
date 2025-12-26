# Code Review Document: Sector/Subsector Selection Fixes

> **Date**: 2025-12-26  
> **Context**: Company creation form with sector/subsector classification  
> **Stack**: Next.js 15 (React), Radix UI components (shadcn/ui), FastAPI backend

---

## Overview

This document summarizes all bugs fixed and changes made to the sector/subsector selection system. The goal was to:
1. Fix non-functional sector dropdown
2. Fix subsector not updating after sector selection
3. Improve UX with creatable combobox for custom subsectors
4. Remove redundant `industry` field from UI
5. Fix backend routing error for locations API

---

## Bug #1: Sector Select Not Registering Selections

### Symptoms
- User clicks on a sector option in the dropdown
- Dropdown closes but selected value doesn't appear
- Component stays showing "Select sector..."

### Root Cause
Radix UI `Select` component has a known issue with empty string values. When using a controlled Select with `value=""`, the component ignores `onValueChange` calls.

### Original Code
```tsx
// compact-sector-select.tsx
<Select
    value={sector || ""}  // ❌ Empty string causes issues
    onValueChange={handleSectorChange}
    disabled={disabled}
>
```

### Solution
Use conditional spread to omit the `value` prop entirely when there's no selection:

```tsx
<Select
    {...(sector ? { value: sector } : {})}  // ✅ No value prop when empty
    onValueChange={handleSectorChange}
    disabled={disabled}
>
```

### Rationale
When `value` prop is omitted, Radix UI Select works in a semi-controlled mode that properly handles the initial empty state while still respecting `onValueChange` for updates.

---

## Bug #2: Subsector Shows "Select sector first..." After Sector Selection

### Symptoms
- User selects a sector (e.g., "Industrial")
- Sector dropdown correctly shows "Industrial"
- Subsector dropdown remains disabled, showing "Select sector first..."

### Root Cause
React closure issue in `create-company-dialog.tsx`. The `handleSectorChange` function in `CompactSectorSelect` calls both `onSectorChange` and `onSubsectorChange` in sequence:

```tsx
// compact-sector-select.tsx
const handleSectorChange = (newSector: string) => {
    onSectorChange(newSector);           // Call #1: Updates sector
    onSubsectorChange(newSubsectors[0]); // Call #2: Updates subsector
};
```

In the dialog, these callbacks used spread syntax:

```tsx
// create-company-dialog.tsx (BEFORE)
<CompactSectorSelect
    onSectorChange={(sector) => setFormData({ ...formData, sector })}
    onSubsectorChange={(subsector) => setFormData({ ...formData, subsector })}
/>
```

**Problem**: Both callbacks capture `formData` in their closure at render time. When `onSectorChange` is called, React batches the state update. Before React re-renders, `onSubsectorChange` runs with the OLD `formData` (still has old sector), effectively losing the sector update.

### Solution
Use functional setState to always get the latest state:

```tsx
// create-company-dialog.tsx (AFTER)
<CompactSectorSelect
    onSectorChange={(sector) => 
        setFormData((prev) => ({ ...prev, sector }))  // ✅ Uses latest state
    }
    onSubsectorChange={(subsector) => 
        setFormData((prev) => ({ ...prev, subsector }))  // ✅ Uses latest state
    }
/>
```

### Rationale
The functional form `setState(prev => ...)` receives the current state as an argument, avoiding closure staleness issues when multiple state updates occur in sequence.

---

## Bug #3: Backend Returns 422 for `/companies/locations`

### Symptoms
- Console shows: `Validation error: invalid UUID, found 'l' at 1, input: 'locations'`
- Frontend calls `GET /api/v1/companies/locations`
- Backend tries to parse "locations" as a company UUID

### Root Cause
FastAPI route order issue in `companies.py`:

```python
# Original order (PROBLEMATIC)
@router.get("/{company_id}")      # Line 72 - matches ANY path segment
async def get_company(...)

# ... many lines later ...

@router.get("/locations")         # Line 309 - never reached!
async def list_all_locations(...)
```

FastAPI matches routes in order. The `/{company_id}` route matches first, treating "locations" as a `company_id` parameter.

### Solution
Move static routes before parameterized routes:

```python
# Fixed order
@router.get("/")                  # List companies
async def list_companies(...)

@router.post("/")                 # Create company
async def create_company(...)

# NOTE: This route MUST be before /{company_id}
@router.get("/locations")         # ✅ Now matches first
async def list_all_locations(...)

@router.get("/{company_id}")      # Now only matches UUIDs
async def get_company(...)
```

### Rationale
In FastAPI/Starlette routing, more specific routes must come before parameterized routes. `/locations` is a literal path, while `/{company_id}` is a catch-all pattern.

---

## UX Improvement: Creatable Subsector Combobox

### Previous Behavior
1. User opens subsector dropdown
2. Sees list of predefined options
3. To add custom value: click "+ Type custom subsector..."
4. Separate input field appears with Cancel button
5. Type value and it saves

### New Behavior
1. User opens subsector dropdown
2. Can type to filter existing options
3. If typed value doesn't match any option, shows "Create 'X'" option
4. Press Enter or click to save custom value

### Key Code Changes

```tsx
// compact-sector-select.tsx

// Track search input
const [searchValue, setSearchValue] = useState("");

// Check for exact match with existing options
const hasExactMatch = availableSubsectors.some(
    (s) => s.label.toLowerCase() === searchValue.toLowerCase()
);

// Create custom subsector
const handleCreateCustom = () => {
    if (!searchValue.trim()) return;
    // Convert to slug: "Aerospace" → "aerospace"
    const slug = searchValue.toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
    onSubsectorChange(slug || searchValue);
    setSearchValue("");
    setSubsectorOpen(false);
};

// In JSX: Show create option when typing non-matching text
{searchValue && !hasExactMatch && (
    <CommandItem
        value={`create-${searchValue}`}
        onSelect={handleCreateCustom}
    >
        <span className="text-primary">Create "{searchValue}"</span>
    </CommandItem>
)}
```

### Rationale
- Reduces clicks from 4+ to 2 for custom values
- More intuitive pattern (similar to tag inputs)
- Existing options still visible and selectable
- Keyboard-friendly (Enter to create)

---

## Refactor: Industry Field Removal from UI

### Context
The company model has three classification fields:
- `sector`: "commercial", "industrial", "residential", "municipal", "other"
- `subsector`: more specific category (e.g., "food_processing", "hotel")
- `industry`: string like "Food & Beverage", "Automotive"

### Problem
`industry` was essentially a duplicate of `subsector` in human-readable form. Having user input both violated DRY principle.

### Solution
1. Remove `industry` input from UI
2. Auto-generate on submit:

```tsx
// create-company-dialog.tsx
const handleSubmit = async () => {
    // Auto-generate industry from subsector for backend compatibility
    const industry = formData.subsector
        ? formatSubsector(formData.subsector)  // "food_processing" → "Food Processing"
        : formData.sector || "Other";

    const dataToSubmit = {
        ...formData,
        industry,  // Backend still receives industry field
    };
};
```

### Rationale
- Simplifies UI
- Backend compatibility maintained
- Single source of truth (subsector)
- Documented as technical debt for future removal

---

## Files Modified

| File | Changes |
|------|---------|
| `frontend/components/shared/forms/compact-sector-select.tsx` | Fixed Select controlled mode, creatable combobox |
| `frontend/components/features/companies/create-company-dialog.tsx` | Functional setState, industry auto-generation |
| `backend/app/api/v1/companies.py` | Route order fix for `/locations` |
| `docs/technical-debt-remove-industry-field.md` | Documentation for future industry removal |

---

## Known Remaining Issues

1. **Console Warning**: "Select is changing from uncontrolled to controlled"
   - Cosmetic only, doesn't affect functionality
   - Caused by conditional spread for value prop
   - Low priority fix

2. **Industry field still in backend**
   - Documented as technical debt
   - Requires migration to remove

---

## Code Review Checklist

Please verify:
- [ ] Sector selection works on first click
- [ ] Subsector updates immediately after sector change
- [ ] Custom subsector can be created by typing + Enter
- [ ] Custom subsectors persist after save
- [ ] Backend `/companies/locations` returns 200, not 422
- [ ] Form validation still works (name + sector required)
