# Technical Debt: Remove `industry` Field

> **Status**: Pending removal  
> **Priority**: Low  
> **Created**: 2025-12-26

## Summary

The `industry` field in the Company model is **redundant** and should be removed in a future refactor. It duplicates information already captured by `sector` and `subsector` fields.

---

## Current State

### Database Schema
```python
# backend/app/models/company.py
industry = Column(String(100), nullable=False, comment="Automotive, Food & Beverage, etc.")
```

### How it's populated
```typescript
// frontend: auto-generated from subsector label
const industry = formatSubsector(formData.subsector)  // "Chemical Processing"
```

### Fields comparison
| Field | Example Value | Purpose |
|-------|---------------|---------|
| `sector` | `"industrial"` | High-level classification |
| `subsector` | `"chemical_processing"` | Specific category (slug) |
| `industry` | `"Chemical Processing"` | **Duplicate** - just formatted subsector |

---

## Where `industry` is used

| File | Usage |
|------|-------|
| `backend/app/models/company.py` | Database column |
| `backend/app/schemas/company.py` | Pydantic schema (required) |
| `backend/app/visualization/pdf_generator.py` | PDF client info display |
| `backend/app/api/v1/proposals.py` | Context for AI proposals |
| `frontend/lib/types/company.ts` | TypeScript types |

---

## Migration Plan

### Step 1: Backend
1. Create Alembic migration to:
   - Make `industry` column nullable
   - Remove `industry` from `CompanyCreate` schema (make optional)
2. Update PDF generator to use `formatSubsector(subsector)` instead
3. Update proposal context to use `sector/subsector` directly

### Step 2: Frontend
1. Remove `industry` from `CompanyFormData` type
2. Remove auto-generation in `create-company-dialog.tsx`
3. Update display components to use `formatSubsector()`

### Step 3: Database
1. Create migration to drop `industry` column
2. Deploy and verify

---

## Estimated Effort

- **Backend changes**: 2-3 hours
- **Frontend changes**: 30 minutes
- **Testing**: 1 hour
- **Total**: ~4 hours

---

## Notes

- The field was originally designed for free-text industry input
- Was made redundant when structured `sector/subsector` was added
- Currently auto-populated from subsector to maintain backend compatibility
