# Fix: Field ID Format Standardization (Dashes vs Underscores)

## Problem
AI agents are generating field_ids with underscores (waste_types) but the field catalog uses dashes (waste-types), causing all suggestions to be rejected by normalize_suggestions() and moved to unmapped.

## Root Cause
Recent prompt changes updated examples to use dashes, but the LLM still outputs underscores based on its training. The prompts need explicit instruction on field ID format.

## Solution
Add explicit "Field ID Format" section to both prompts with clear examples showing dashes vs underscores.

## Implementation

### Step 1: Update Notes Analysis Prompt

**File**: `backend/app/prompts/notes-analysis.md`

**Add after "## CRITICAL RULES" section (around line 16)**:

```markdown
## Field ID Format (CRITICAL)

Field IDs in the catalog use DASHES (-), not underscores (_).
Always match the exact format from the catalog:

✅ CORRECT: waste-types
❌ INCORRECT: waste_types

✅ CORRECT: current-practices  
❌ INCORRECT: current_practices

✅ CORRECT: volume-per-category
❌ INCORRECT: volume_per_category

Always use the exact field_id values from the Available Fields catalog.
```

**Also update the example output** to emphasize this (around line 67):

```markdown
## Example Output

```json
{
  "suggestions": [
    {"field_id": "waste-types", "value": "Plastics", "confidence": 95},
    {"field_id": "waste-description", "value": "Post-industrial plastic waste from injection molding", "confidence": 90},
    {"field_id": "volume-per-category", "value": "Plastics: ~500 kg/day", "confidence": 85},
    {"field_id": "current-practices", "value": "Landfilling", "confidence": 95},
    {"field_id": "pain-points", "value": "High disposal costs", "confidence": 90}
  ],
  "unmapped": []
}
```

Note: All field_ids use dashes (-) as shown in the catalog.
```

### Step 2: Update Document Analysis Prompt

**File**: `backend/app/prompts/document-analysis.md`

**Add after "## CRITICAL RULES" section (around line 18)**:

```markdown
## Field ID Format (CRITICAL)

Field IDs in the catalog use DASHES (-), not underscores (_).
Always match the exact format from the catalog:

✅ CORRECT: waste-types
❌ INCORRECT: waste_types

✅ CORRECT: current-practices  
❌ INCORRECT: current_practices

✅ CORRECT: volume-per-category
❌ INCORRECT: volume_per_category

Always use the exact field_id values from the Available Fields catalog.
```

**Also update the example outputs** (around line 154 and 195):

```markdown
## Example Output (Lab Report)

```json
{
  "summary": "Soil sample analysis showing elevated lead and arsenic levels...",
  "key_facts": [...],
  "suggestions": [
    {
      "field_id": "waste-types",
      "value": "Contaminated soil",
      "confidence": 90,
      "evidence": {
        "page": 1,
        "excerpt": "Sample Matrix: Soil"
      }
    }
  ],
  "unmapped": [...]
}
```

Note: All field_ids use dashes (-) as shown in the catalog.
```

### Step 3: Optional - Add Safety Net Logging

**File**: `backend/app/services/intake_field_catalog.py`

**In normalize_suggestions() function (around line 127-143)**, add warning log:

```python
# Normalizar field_id: convertir underscores a dashes
if "_" in field_id:
    logger.warning(
        "field_id_using_underscores",
        field_id=field_id,
        normalized=field_id.replace("_", "-"),
        source=source,
    )
    field_id = field_id.replace("_", "-")

registry_item = registry.get(field_id)
```

This helps monitor if the prompt fix is working - logs should decrease over time.

### Step 4: Test

1. Add test notes: "We generate 500 kg of plastic waste daily from injection molding"
2. Run analysis
3. Verify suggestions appear with correct field_ids (waste-types, volume-per-category, etc.)
4. Check logs - should see fewer "field_id_using_underscores" warnings

## Acceptance Criteria

- [ ] Notes analysis generates suggestions with correct field_ids (dashes)
- [ ] Suggestions appear in UI with proper field mapping
- [ ] Not all suggestions go to unmapped
- [ ] Both notes and document agents follow same format
- [ ] Warning logs show decreasing underscore usage over time

## Files Modified

- `backend/app/prompts/notes-analysis.md`
- `backend/app/prompts/document-analysis.md`
- `backend/app/services/intake_field_catalog.py` (optional logging)

## Rollback Plan

If prompt changes don't work:
1. Keep the underscore-to-dash normalization in intake_field_catalog.py
2. Remove the warning logs to avoid noise
3. Accept it as a permanent workaround
