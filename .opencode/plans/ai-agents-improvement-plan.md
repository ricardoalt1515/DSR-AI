# Plan: Improve Notes + Document Agents (Intake Panel)

## Context
Waste-opportunity platform with intake panel for notes, file uploads, and AI suggestions mapping to questionnaire fields.

## Guardrails (Locked Decisions)

- **Scope**: Notes agent + Document agent only
- **Schema-stable**: Keep output/API contracts unchanged
  - Notes agent: `NotesAnalysisOutput = { suggestions, unmapped }`
  - Document agent: `DocumentAnalysisOutput = { summary, key_facts, suggestions, unmapped }`
- **Language**: English-only notes (explicit in prompts)
- **Success metric**: Higher % of correct field mappings, fewer low-quality unmapped items

## Current State

### Notes Pipeline
1. UI triggers `POST /api/v1/projects/{id}/intake/notes/analyze`
2. Calls `IntakeIngestionService.analyze_notes_text()`
3. Agent: `notes_analysis_agent.py` using `notes-analysis.md`

### Document Pipeline
1. `IntakeIngestionService._process_document()` → `analyze_document()`
2. Agent: `document_analysis_agent.py` using `document-analysis.md`
3. Persists via `_persist_document_analysis()`

### Biggest Problem
Field catalog is too thin: `"field_id: section > label"` - missing type/options/usage guidance.

## Proposed Changes

### 1. Field Catalog Module (New)

**File**: `backend/app/services/intake_field_catalog.py`

**Dataclass**:
```python
@dataclass
class FieldRegistryItem:
    section_id: str
    section_title: str
    field_id: str
    field_label: str
    field_type: str  # from questionnaire: "text" | "tags" | "textarea" | "combobox" | "number"
```

**Functions**:
- `build_questionnaire_registry() -> dict[str, FieldRegistryItem]` (move from IntakeIngestionService)
- `format_catalog_for_prompt(registry: dict) -> str` (simple string format)
- `normalize_suggestions(output, registry)` - clean, dedupe, validate field_ids
- `apply_suggestion(field_type, value)` - parse tags, type conversion

**Output format**:
```
CATALOG_VERSION=1
LANGUAGE=EN

- field_id: waste-types
  section: "1. Waste Generation Details" (waste-generation)
  label: "Type of Waste Generated"
  type: combobox

- field_id: volume-per-category
  section: "1. Waste Generation Details" (waste-generation)
  label: "Volume per Category"
  type: textarea
```

### 2. Multi-Value Fields Constant

**File**: `backend/app/services/intake_field_catalog.py`

```python
MULTI_VALUE_FIELDS = {
    "waste-types",
    "current-practices",
    "storage-infrastructure",
    "constraints",
    "primary-objectives",
    "volume-per-category"
}
```

**Dedupe policy**:
- Single-value fields: keep highest confidence per field_id
- Multi-value fields: collect all values, let user decide

### 3. Prompt Rewrites

#### Notes Analysis Prompt
- English-only instruction
- Field mapping rubric with type-aware guidance
- Value formatting rules (strings vs numbers, units)
- Tags fields: comma-separated values
- Conflict resolution: keep most recent/specific
- Examples with real field_ids

#### Document Analysis Prompt
- Doc-type specific priorities:
  - **lab**: analytes + units + sample context
  - **sds**: hazards, PPE, storage, transport
  - **general**: operational facts
- Evidence rules: page + excerpt when available
- Strict field_id list mapping
- Unmapped hygiene: cap 10, no boilerplate

### 4. Tags Parsing

**Location**: `intake_service.py` in `_apply_to_project_data()`

**Logic**:
- If target field type == "tags" and value is string:
  - Split by comma
  - Trim tokens
  - Drop empties
  - Assign as list

### 5. Output Validation

**Skip**: `extra="forbid"` - unnecessary risk

**Keep**: Validation via normalization layer (unknown field_ids moved to unmapped)

### 6. Tests

**Extend existing**: `backend/tests/test_intake.py`

**Test cases**:
1. Field catalog includes field_type metadata
2. Normalization drops unknown field_id
3. Dedupe keeps best suggestion per field (single-value)
4. Multi-value fields collect all suggestions
5. Tags apply parsing works correctly

## Files to Change/Add

### New Files
- `backend/app/services/intake_field_catalog.py`

### Modified Files
- `backend/app/services/intake_ingestion_service.py`
- `backend/app/services/intake_service.py`
- `backend/app/prompts/notes-analysis.md`
- `backend/app/prompts/document-analysis.md`
- `backend/tests/test_intake.py` (extend)

## Implementation Steps

### Step 1: Field Catalog Module
1. Create `intake_field_catalog.py`
2. Define `FieldRegistryItem` dataclass with `field_type`
3. Implement `build_questionnaire_registry()` (move from ingestion service)
4. Implement `format_catalog_for_prompt()`
5. Add `MULTI_VALUE_FIELDS` constant
6. Implement `normalize_suggestions()` with dedupe logic
7. Implement `apply_suggestion()` with tags parsing

### Step 2: Update Ingestion Service
1. Import from `intake_field_catalog`
2. Remove local `FieldRegistryItem` and `build_questionnaire_registry()`
3. Update `_build_field_catalog()` to use new formatter
4. Call `normalize_suggestions()` after agent output

### Step 3: Update Intake Service
1. Import field type lookup from catalog
2. Update `_apply_to_project_data()` to parse tags for tags fields

### Step 4: Rewrite Prompts
1. Update `notes-analysis.md` with field type guidance and examples
2. Update `document-analysis.md` with doc-type priorities

### Step 5: Tests
1. Extend `test_intake.py` with new test cases
2. Run `cd backend && make check`

## Acceptance Criteria

- [ ] Field catalog includes field_type for all fields
- [ ] Manual smoke: 60%+ suggestions map correctly, unmapped ≤10 relevant items
- [ ] Automated: All tests pass under `cd backend && make check`
- [ ] No breaking changes to API or DB schema
- [ ] English-only notes processing

## Key Decisions

1. **Single module**: `intake_field_catalog.py` contains registry, formatting, normalization, and apply logic
2. **Minimal metadata**: Only add `field_type` to registry (not options/description)
3. **Multi-value handling**: Explicit list of fields that accept multiple values
4. **No extra="forbid"**: Skip high-risk validation, rely on normalization
5. **Extend existing tests**: Don't create new test files
