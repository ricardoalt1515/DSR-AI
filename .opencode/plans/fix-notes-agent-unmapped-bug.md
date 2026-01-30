# Fix: Notes Agent Bug - Suggestions Going to Unmapped

## Problem
All notes analysis suggestions end up in "unmapped" instead of being properly mapped to questionnaire fields, despite having high confidence (>95%).

## Root Cause
In `intake_field_catalog.py:normalize_suggestions()`:
1. The function normalizes field_id (replaces "_" with "-") to look up in registry
2. BUT it never writes the normalized field_id back to the suggestion dict
3. Later in `intake_ingestion_service.py:analyze_notes_text()`, the code does `registry.get(field_id)` again with the original (underscore) value
4. This fails silently, so the suggestion is discarded
5. Only items explicitly marked as "unknown" end up in unmapped

## Evidence
- Logs show suggestions are generated but don't appear in UI
- All items end up in unmapped notes section
- The normalization code exists but is incomplete

## Fix Implementation

### Step 1: Update normalize_suggestions() in intake_field_catalog.py

**File**: `backend/app/services/intake_field_catalog.py`

**Location**: Inside `normalize_suggestions()` function, around line 127-168

**Current buggy code**:
```python
# Normalizar field_id: convertir underscores a dashes
normalized_field_id = field_id.replace("_", "-")

registry_item = registry.get(normalized_field_id)

# Unknown field_id - move to unmapped
if not registry_item:
    unmapped_items.append({...})
    continue

# Multi-value field: collect all
if field_id in MULTI_VALUE_FIELDS:  # BUG: using original field_id
    valid_suggestions.append(suggestion)  # BUG: suggestion still has old field_id
    continue
```

**Fixed code**:
```python
# Normalizar field_id: convertir underscores a dashes
normalized_field_id = field_id.replace("_", "-")

# Log warning for debugging (keep existing)
if "_" in field_id:
    logger.warning(
        "field_id_using_underscores",
        field_id=field_id,
        normalized=normalized_field_id,
        source=source,
    )

registry_item = registry.get(normalized_field_id)

# Unknown field_id - move to unmapped
if not registry_item:
    unmapped_items.append({
        "extracted_text": suggestion.get("value", ""),
        "reason": f"Unknown field_id: {field_id}",
        "confidence": suggestion.get("confidence", 50),
    })
    continue

# CRITICAL FIX: Update the suggestion dict with normalized field_id
suggestion["field_id"] = normalized_field_id

# Multi-value field: collect all (use normalized_field_id)
if normalized_field_id in MULTI_VALUE_FIELDS:
    valid_suggestions.append(suggestion)
    continue

# Single-value field: keep best confidence (use normalized_field_id as key)
confidence = suggestion.get("confidence", 0)
if normalized_field_id not in best_by_field:
    best_by_field[normalized_field_id] = suggestion
elif confidence > best_by_field[normalized_field_id].get("confidence", 0):
    # Move previous to unmapped
    prev = best_by_field[normalized_field_id]
    unmapped_items.append({
        "extracted_text": prev.get("value", ""),
        "reason": f"Lower confidence ({prev.get('confidence', 0)}) than alternative ({confidence})",
        "confidence": prev.get("confidence", 50),
    })
    best_by_field[normalized_field_id] = suggestion
else:
    # Current is worse - move to unmapped
    unmapped_items.append({
        "extracted_text": suggestion.get("value", ""),
        "reason": f"Lower confidence ({confidence}) than alternative ({best_by_field[normalized_field_id].get('confidence', 0)})",
        "confidence": confidence,
    })
```

**Key changes**:
1. After `registry.get(normalized_field_id)` succeeds, immediately do: `suggestion["field_id"] = normalized_field_id`
2. Use `normalized_field_id` (not original `field_id`) for:
   - Checking `MULTI_VALUE_FIELDS` membership
   - Keys in `best_by_field` dict
   - All subsequent logic

### Step 2: Regression Test

**File**: `backend/tests/test_intake.py` (add to existing test file)

**Add new test**:
```python
def test_normalize_suggestions_updates_field_id():
    """Regression test: field_id with underscores should be normalized in output."""
    from app.services.intake_field_catalog import normalize_suggestions, FieldRegistryItem
    
    # Setup: registry with dash-based field_ids
    registry = {
        "waste-types": FieldRegistryItem(
            section_id="waste-generation",
            section_title="Waste Generation",
            field_id="waste-types",
            field_label="Type of Waste",
            field_type="combobox"
        ),
        "volume-per-category": FieldRegistryItem(
            section_id="waste-generation", 
            section_title="Waste Generation",
            field_id="volume-per-category",
            field_label="Volume per Category",
            field_type="textarea"
        )
    }
    
    # Input: suggestions with underscore field_ids (as AI might output)
    suggestions = [
        {"field_id": "waste_types", "value": "Plastics", "confidence": 95},
        {"field_id": "volume_per_category", "value": "500 kg/day", "confidence": 90}
    ]
    
    # Execute
    valid_suggestions, extra_unmapped = normalize_suggestions(
        suggestions, registry, source="test"
    )
    
    # Assert: field_ids normalized in output
    assert len(valid_suggestions) == 2
    assert valid_suggestions[0]["field_id"] == "waste-types"
    assert valid_suggestions[1]["field_id"] == "volume-per-category"
    assert len(extra_unmapped) == 0
```

### Step 3: Verification Log (Optional but Recommended)

**File**: `backend/app/services/intake_ingestion_service.py`

**Location**: In `analyze_notes_text()`, after calling `normalize_suggestions()` (around line 186)

**Add log**:
```python
# After: valid_suggestions, extra_unmapped = normalize_suggestions(...)
logger.info(
    "notes_normalized",
    valid_count=len(valid_suggestions),
    unmapped_count=len(extra_unmapped),
    field_ids=[s.get("field_id") for s in valid_suggestions[:5]]  # First 5 for debugging
)
```

This helps verify the fix is working without exposing note content.

## Acceptance Criteria

- [ ] Analyzing notes creates IntakeSuggestion records (not just unmapped)
- [ ] Suggestions appear in Intake Panel with correct field mapping
- [ ] field_ids with underscores are normalized to dashes in persisted data
- [ ] Regression test passes
- [ ] Existing tests still pass

## Files Modified

1. `backend/app/services/intake_field_catalog.py` - Fix normalize_suggestions()
2. `backend/tests/test_intake.py` - Add regression test
3. `backend/app/services/intake_ingestion_service.py` - Optional debug log

## Rollback

If issues arise:
1. Revert changes to intake_field_catalog.py
2. The underscore normalization was already present but incomplete, so reverting just removes the fix

## Notes

- The prompt improvements (field ID format guidance) are still valuable but not sufficient
- This code fix addresses the root cause regardless of what format the AI outputs
- The normalization acts as a safety net for any future prompt changes or model variations
