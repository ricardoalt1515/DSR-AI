# UX Analysis: Yes/No Questions with AI Suggestions

## Executive Summary

**Recommendation: Pattern A (Yes/No + Conditional Details) with AI parsing layer**

The current implementation already uses this pattern. The issue is how to handle AI suggestions that contain nuanced answers like "Yes, through third-party recycling" when the field expects "yes"/"no".

---

## Current Implementation Analysis

### Existing Pattern (Already in Codebase)

The questionnaire at `backend/app/templates/assessment_questionnaire.py` uses **Pattern A**:

```python
# Example: Revenue Streams
{
    "id": "revenue-streams",
    "label": "Are any current waste streams generating revenue (resale)?",
    "type": "radio",
    "options": ["yes", "no"],
},
{
    "id": "revenue-description",
    "label": "Describe revenue-generating waste streams",
    "type": "textarea",
    "conditional": {"field": "revenue-streams", "value": "yes"},
}
```

This applies to all 4 problematic fields:

| Field | Yes/No Question | Conditional Detail Field |
|-------|----------------|-------------------------|
| `seasonal-variations` | "Seasonal Variations in Waste Volumes?" | `seasonal-description` |
| `segregation` | "Do you currently segregate your waste?" | `segregation-how` |
| `revenue-streams` | "Are any current waste streams generating revenue?" | `revenue-description` |
| `waste-audit` | "Waste Audit Documentation Available?" | *(no conditional field yet)* |

### Frontend Support

The `DynamicSection` component (`frontend/components/features/technical-data/components/data-capture/dynamic-section.tsx`) already handles conditional field visibility:

```typescript
const visibleFields = section.fields.filter((field) => {
  if (!field.conditional) return true;
  const dependsOnField = section.fields.find(
    (f) => f.id === field.conditional?.field,
  );
  // ... condition evaluation
});
```

---

## The Core Problem

### AI Suggestion Flow

1. User uploads document
2. AI extracts text and generates suggestions
3. Suggestions map to field IDs
4. **Problem**: AI returns "Yes, through third-party recycling" → field expects "yes"

### Current Data Model

```typescript
interface AISuggestion {
  fieldId: string;      // "revenue-streams"
  fieldLabel: string;   // "Are any current waste streams..."
  value: string | number; // "Yes, through third-party recycling" ❌
  // ...
}
```

The `value` field is typed as `string | number`, but radio fields expect specific enum values.

---

## UX Pattern Comparison

### Pattern A: Yes/No + Conditional Details (Current)

**How it works:**
- Radio buttons for Yes/No
- Textarea appears when "Yes" selected
- Detail field captures nuance

**Pros:**
- ✅ Binary data is clean for reporting/analytics
- ✅ Clear user mental model
- ✅ Progressive disclosure reduces cognitive load
- ✅ Already implemented

**Cons:**
- ⚠️ AI needs to parse binary + detail from text
- ⚠️ Two fields to populate from one AI suggestion

**Best for:** Fields where the binary answer has analytical value

---

### Pattern B: Combobox with Yes/No/Other

**How it works:**
- Single combobox with predefined options
- "Other" allows free text

**Pros:**
- ✅ Single field handles both
- ✅ Simple AI mapping

**Cons:**
- ❌ "Other" responses hard to analyze
- ❌ Loses binary data structure
- ❌ Users may type when they should select

**Best for:** Low-stakes fields where analytics matter less

---

### Pattern C: Yes/No + Always-Visible Notes

**How it works:**
- Radio buttons for Yes/No
- Notes field always visible below

**Pros:**
- ✅ Simple implementation
- ✅ Users can add context anytime

**Cons:**
- ❌ Cluttered UI when not needed
- ❌ No clear link between answer and notes
- ❌ AI still needs to parse two fields

**Best for:** Fields where context is always relevant

---

### Pattern D: Multi-Select with Options

**How it works:**
- Tags/checkboxes: ["Yes", "Partially", "No", "N/A"]

**Pros:**
- ✅ Captures nuance directly

**Cons:**
- ❌ "Yes" + "Partially" is contradictory
- ❌ Complex analytics
- ❌ Confusing UX (can select Yes AND No?)

**Best for:** Not recommended for binary questions

---

## Recommended Solution

### Keep Pattern A + Add AI Parsing Layer

The current implementation is correct. The fix belongs in the AI suggestion processing layer.

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  AI Response: "Yes, through third-party recycling"          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Parser Layer (backend/app/services/intake_ingestion_service)│
│  - Detect binary intent (yes/no)                            │
│  - Extract detail text                                      │
│  - Return structured suggestion                             │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌───────────────────────┐      ┌──────────────────────────┐
│  Suggestion 1         │      │  Suggestion 2            │
│  fieldId: revenue-streams    │      fieldId: revenue-description │
│  value: "yes"         │      │  value: "through third-  │
│  confidence: 0.92     │      │          party recycling"│
└───────────────────────┘      │  confidence: 0.85        │
                               └──────────────────────────┘
```

### Parser Logic

```python
def parse_boolean_with_detail(text: str) -> tuple[str | None, str | None]:
    """
    Parse AI text into boolean value and detail.
    
    Returns:
        (boolean_value, detail_text) or (None, None) if not parseable
    """
    text_lower = text.lower().strip()
    
    # Explicit yes patterns
    yes_patterns = [
        r'^yes[.,;]\s*(.+)',           # "Yes, through third-party"
        r'^yes\s*-\s*(.+)',            # "Yes - through third-party"
        r'^partially[.,;]?\s*(.+)',    # "Partially, some streams only"
    ]
    
    # Explicit no patterns  
    no_patterns = [
        r'^no[.,;]?\s*(.+)?',          # "No" or "No, we don't"
        r'^none[.,;]?\s*(.+)?',        # "None"
    ]
    
    for pattern in yes_patterns:
        match = re.match(pattern, text_lower)
        if match:
            detail = match.group(1).strip()
            return ("yes", detail)
    
    for pattern in no_patterns:
        match = re.match(pattern, text_lower)
        if match:
            detail = match.group(1).strip() if match.group(1) else ""
            return ("no", detail)
    
    # Single word answers
    if text_lower in ["yes", "yeah", "yep", "true"]:
        return ("yes", "")
    if text_lower in ["no", "nope", "none", "false"]:
        return ("no", "")
    
    # Uncertain - return as detail only
    return (None, text)
```

### Suggestion Generation

When parser returns a boolean match:

```python
# Generate TWO suggestions from ONE AI extraction
suggestions = []

boolean_value, detail = parse_boolean_with_detail(ai_text)

if boolean_value:
    # Suggestion for the radio field
    suggestions.append(IntakeSuggestion(
        field_id="revenue-streams",
        value=boolean_value,
        confidence=confidence,
        # ...
    ))
    
    # Suggestion for the detail field (if detail exists)
    if detail:
        suggestions.append(IntakeSuggestion(
            field_id="revenue-description", 
            value=detail,
            confidence=confidence * 0.9,  # Slightly lower confidence
            # ...
        ))
else:
    # No clear boolean - suggest as detail only, let user decide
    suggestions.append(IntakeSuggestion(
        field_id="revenue-description",
        value=ai_text,
        confidence=confidence * 0.7,
        # ...
    ))
```

---

## UI Behavior

### When AI Suggests Binary + Detail

```
┌────────────────────────────────────────────────────────────┐
│  Are any current waste streams generating revenue?         │
│                                                            │
│  ○ Yes  ● No                                               │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 🤖 AI Suggestion: "Yes, through third-party"       │    │
│  │                                                    │    │
│  │ [Apply Yes] [Skip]                                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│  Describe revenue-generating waste streams                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 🤖 AI Suggestion: "through third-party recycling"  │    │
│  │                                                    │    │
│  │ [Apply Detail] [Skip]                              │    │
│  └────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────┘
```

### User Flow

1. User sees two related suggestions
2. Can apply Yes/No independently from detail
3. Applying "Yes" automatically shows the detail field (conditional logic)
4. User can edit detail before applying

---

## Analytics & Reporting

### Database Schema

```sql
-- Binary answers enable clean aggregation
SELECT 
  revenue_streams,
  COUNT(*) as project_count
FROM project_data
GROUP BY revenue_streams;

-- Detail text available for qualitative analysis
SELECT 
  revenue_streams,
  revenue_description
FROM project_data
WHERE revenue_streams = 'yes';
```

### Reporting Benefits

| Metric | Binary Field | Detail Field |
|--------|-------------|--------------|
| % with revenue | ✅ Easy COUNT | ❌ Text parsing |
| Avg revenue methods | ❌ N/A | ✅ Text analysis |
| Trend over time | ✅ Simple GROUP BY | ❌ Complex |

---

## Implementation Checklist

### Backend Changes

- [ ] Add `parse_boolean_with_detail()` utility function
- [ ] Modify `intake_ingestion_service.py` to generate dual suggestions
- [ ] Add tests for parsing edge cases
- [ ] Update AI prompt to encourage "Yes/No, [detail]" format

### Frontend Changes

- [ ] None required - conditional fields already work
- [ ] Optional: Show related suggestions grouped visually

### Edge Cases to Handle

| Input | Parsed Boolean | Detail | Notes |
|-------|---------------|--------|-------|
| "Yes" | yes | "" | Simple case |
| "Yes, through third-party" | yes | "through third-party" | Standard format |
| "Partially - some streams" | yes | "some streams" | Treat partial as yes |
| "No, we don't" | no | "we don't" | With explanation |
| "Seasonal for ag only" | null | "Seasonal for ag only" | Ambiguous - detail only |
| "N/A" | null | "N/A" | Unclear intent |

---

## Industry Research Summary

### Survey Tools (Typeform, SurveyMonkey)

- **Pattern**: Yes/No + conditional follow-up is standard
- **Rationale**: Clean data for analytics, natural conversation flow
- **AI Integration**: Parse binary intent, store verbatim as detail

### Assessment Platforms (BREEAM, LEED)

- **Pattern**: Strict binary with evidence upload
- **Rationale**: Compliance requires clear yes/no for scoring
- **Detail**: Handled in separate documentation fields

### Medical Intake Forms

- **Pattern**: Yes/No + conditional details
- **Rationale**: Clinical decisions need binary, but context matters
- **Example**: "Do you smoke? Yes → How many per day?"

### Compliance Tools

- **Pattern**: Binary with required justification for "Yes"
- **Rationale**: Audit trails need both answer and reasoning

---

## Conclusion

**The current Pattern A implementation is correct.**

The UX challenge is not the field structure—it's the AI suggestion processing. By adding a parsing layer that extracts binary intent + detail from AI responses, we:

1. ✅ Keep clean data for analytics
2. ✅ Maintain intuitive user experience
3. ✅ Support nuanced AI suggestions
4. ✅ Follow industry best practices
5. ✅ Require minimal code changes

**Next Step**: Implement the parser layer in `intake_ingestion_service.py` to generate dual suggestions for boolean+detail fields.
