# Fix: Notes Agent - Suggestions Going to Unmapped

## Problem
All notes analysis suggestions with high confidence (>95%) are ending up in "unmapped" instead of being properly mapped to questionnaire fields.

## Root Cause
The `normalize_suggestions()` function in `intake_field_catalog.py` normalizes field_ids (converts underscores to dashes) to look up in the registry, BUT it never writes the normalized value back to the suggestion dictionary.

Later, when `analyze_notes_text()` tries to persist the suggestions, it does another `registry.get(field_id)` with the ORIGINAL underscore value, fails silently, and skips the suggestion.

## Fix (Minimal Change)

### File: backend/app/services/intake_field_catalog.py

**Function**: `normalize_suggestions()` around line 127-168

**Current code (buggy)**:
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

# Single-value field: keep best confidence
if field_id not in best_by_field:  # BUG: using original as key
    best_by_field[field_id] = suggestion  # BUG: storing with old field_id
```

**Fixed code**:
```python
# Normalizar field_id: convertir underscores a dashes
normalized_field_id = field_id.replace("_", "-")

# Log warning if using underscores (optional but helpful)
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

**Key changes** (only 3 lines added, rest is using normalized_field_id):
1. After `registry.get(normalized_field_id)` succeeds, add: `suggestion["field_id"] = normalized_field_id`
2. Change `field_id in MULTI_VALUE_FIELDS` to `normalized_field_id in MULTI_VALUE_FIELDS`
3. Change all `best_by_field[field_id]` to `best_by_field[normalized_field_id]`

## Test (Optional but Recommended)

Add to `backend/tests/test_intake.py`:

```python
def test_normalize_suggestions_normalizes_field_id():
    """field_id with underscores should be normalized in output."""
    from app.services.intake_field_catalog import normalize_suggestions, FieldRegistryItem
    
    registry = {
        "waste-types": FieldRegistryItem(
            section_id="waste-generation",
            section_title="Waste Generation",
            field_id="waste-types",
            field_label="Type of Waste",
            field_type="combobox"
        )
    }
    
    suggestions = [{"field_id": "waste_types", "value": "Plastics", "confidence": 95}]
    valid, unmapped = normalize_suggestions(suggestions, registry, "test")
    
    assert valid[0]["field_id"] == "waste-types"  # Should be normalized
    assert len(unmapped) == 0
```

## Verification

1. Run notes analysis in UI
2. Check that suggestions appear with correct field mapping (not all in unmapped)
3. Verify `field_id` values use dashes (waste-types) not underscores (waste_types)

## Why This Fix

- **Minimal**: Only changes normalize_suggestions()
- **Root cause**: Ensures normalized value is persisted
- **Backward compatible**: Works with any field_id format the AI outputs
- **Best practice**: Mutation is acceptable in a "normalize" function

## Files Changed

- `backend/app/services/intake_field_catalog.py` (only file that needs modification)
