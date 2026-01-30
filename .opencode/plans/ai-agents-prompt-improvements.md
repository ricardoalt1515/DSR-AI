# Plan: AI Agent Prompt & Architecture Improvements

## Context
Waste-opportunity platform with AI agents for notes and document analysis. Previous implementation completed but expert review identified improvements.

## Current State
- Notes agent: Extracts facts from free-form notes → maps to questionnaire fields
- Document agent: Analyzes documents (PDFs, SDS, lab reports) with evidence
- Both use pydantic-ai with temperature=0.2, retries=2
- Field catalog injection via @instructions decorator
- Prompts have field type guidelines and examples

## Issues Identified by Expert Review

### 1. Invalid JSON Schema in Prompts - HIGH
**Files**: `backend/app/prompts/notes-analysis.md`, `backend/app/prompts/document-analysis.md`

**Problem**: `"confidence": "number 0-100"` is not valid JSON schema syntax

**Fix**: Replace with simple description or remove schema section entirely (pydantic validates anyway)

```markdown
# Before (invalid):
"confidence": "number 0-100"

# After (option A - simple description):
confidence: integer between 0 and 100 inclusive

# After (option B - remove schema section entirely):
# pydantic-ai validates output against NotesAnalysisOutput schema
```

### 2. Missing Input Validation - HIGH
**Files**: `backend/app/agents/notes_analysis_agent.py`, `backend/app/agents/document_analysis_agent.py`

**Problem**: No length limits for notes/documents, risk of context window overflow

**Fix**: Add truncation before sending to agent

```python
# In analyze_notes()
MAX_NOTES_CHARS = 8000  # Approximate token limit
if len(text) > MAX_NOTES_CHARS:
    logger.info("notes_truncated", original_chars=len(text), kept_chars=MAX_NOTES_CHARS)
    text = text[-MAX_NOTES_CHARS:]  # Keep most recent (per prompt instructions)

# In analyze_document() - already handled by BinaryContent, but add size check
MAX_DOC_BYTES = 10 * 1024 * 1024  # 10MB
if len(document_bytes) > MAX_DOC_BYTES:
    raise DocumentAnalysisError(f"Document too large: {len(document_bytes)} bytes (max {MAX_DOC_BYTES})")
```

### 3. Document Type Sections Too Verbose - MEDIUM
**File**: `backend/app/prompts/document-analysis.md`

**Problem**: 40 lines for 3 document types, buries key information

**Fix**: Condense to table format

```markdown
## Document Type Priorities

| Type | Extract First | Ignore |
|------|--------------|--------|
| lab | Analytes with values/units, detection limits, exceedances | Method details, lab contact info |
| sds | Hazards, storage conditions, incompatibilities | First aid, manufacturer details |
| general | Waste quantities, practices, constraints | Boilerplate, headers/footers |
```

### 4. Missing Negative Examples - MEDIUM
**Files**: `backend/app/prompts/notes-analysis.md`, `backend/app/prompts/document-analysis.md`

**Problem**: Only positive examples, model may not know what to avoid

**Fix**: Add "Common Mistakes to Avoid" section

```markdown
## Common Mistakes to Avoid

- ❌ Inventing values not stated in the source
- ❌ Including suggestions with confidence < 50
- ❌ Using field_ids not in the Available Fields catalog
- ❌ Splitting multi-value tags into separate suggestions
- ❌ Including page numbers or metadata in unmapped
```

### 5. Field Catalog Injection Position - LOW
**Files**: `backend/app/agents/notes_analysis_agent.py`, `backend/app/agents/document_analysis_agent.py`

**Problem**: Catalog injected at end of prompt via @instructions, may push examples out of context

**Fix**: Move to @system_prompt (injected earlier)

```python
# Before:
@notes_analysis_agent.instructions
def inject_field_catalog(ctx: RunContext[NotesContext]) -> str:
    return f"Allowed fields (use exact field_id values):\n{ctx.deps.field_catalog}"

# After:
@notes_analysis_agent.system_prompt
def inject_field_catalog(ctx: RunContext[NotesContext]) -> str:
    return f"## Available Fields\n{ctx.deps.field_catalog}"
```

### 6. "English-only" Ambiguity - LOW
**File**: `backend/app/prompts/notes-analysis.md`

**Problem**: "English-only processing (notes may be in English only)" is contradictory

**Fix**: Clarify language handling

```markdown
## Language Handling

- Process text as-is without translation
- Do not interpret non-English terms unless explicitly defined in notes
- Field values should match the language of the source text
```

## Implementation Order

### Phase 1: Critical Fixes (HIGH priority)
1. Fix invalid JSON schema in both prompts
2. Add input validation (length limits) to both agents

### Phase 2: Prompt Improvements (MEDIUM priority)
3. Condense document type sections to table format
4. Add "Common Mistakes to Avoid" section to both prompts
5. Clarify language handling in notes prompt

### Phase 3: Architecture Refinement (LOW priority)
6. Move field catalog injection from @instructions to @system_prompt

## Files to Modify

### Phase 1
- `backend/app/prompts/notes-analysis.md` - Fix schema
- `backend/app/prompts/document-analysis.md` - Fix schema
- `backend/app/agents/notes_analysis_agent.py` - Add length validation
- `backend/app/agents/document_analysis_agent.py` - Add size validation

### Phase 2
- `backend/app/prompts/document-analysis.md` - Condense doc types, add mistakes section
- `backend/app/prompts/notes-analysis.md` - Add mistakes section, clarify language

### Phase 3
- `backend/app/agents/notes_analysis_agent.py` - Move to system_prompt
- `backend/app/agents/document_analysis_agent.py` - Move to system_prompt

## Acceptance Criteria

- [ ] No invalid JSON schema syntax in prompts
- [ ] Notes truncated to MAX_NOTES_CHARS (8000) when exceeded
- [ ] Documents rejected if > MAX_DOC_BYTES (10MB)
- [ ] Document type sections condensed to table format
- [ ] "Common Mistakes to Avoid" section in both prompts
- [ ] All tests pass: `cd backend && make check`

## Notes

- These are improvements, not bug fixes (previous implementation works)
- Phase 1 is recommended before production use
- Phase 2-3 can be deferred if needed
- No breaking changes to API or schema
