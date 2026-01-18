# Agent-Native Architecture Audit

**Date:** January 17, 2026  
**Project:** Waste Platform  
**Overall Score:** 45%

---

## Executive Summary

This audit evaluates the waste-platform codebase against 8 core agent-native architecture principles. The platform excels at shared workspace (100%) and UI integration (85%), but has critical gaps in action parity (3.6%) and CRUD completeness (0%) - agents cannot perform most user actions.

---

## Overall Score Summary

| Core Principle | Score | Percentage | Status |
|----------------|-------|------------|--------|
| Action Parity | 2/55 | 3.6% | ❌ |
| Tools as Primitives | N/A (0 tools) | N/A | ⚠️ |
| Context Injection | 4/10 | 40% | ❌ |
| Shared Workspace | 9/9 | 100% | ✅ |
| CRUD Completeness | 0/9 entities | 0% | ❌ |
| UI Integration | 11/13 | 85% | ✅ |
| Capability Discovery | 5.5/7 | 79% | ⚠️ |
| Prompt-Native Features | 14/25 | 56% | ⚠️ |

### Status Legend
- ✅ Excellent (80%+)
- ⚠️ Partial (50-79%)
- ❌ Needs Work (<50%)

---

## What's Working Excellently

### 1. Shared Workspace (100%)
Agents write to same tables users see. No shadow tables, no sandbox isolation. Proposals, file analysis, timeline events all flow to user-visible data.

**Evidence:**
- `proposals` table: Agent creates, user views - same table
- `project_files.ai_analysis`: Image agent writes, user sees results
- `timeline_events`: Agent actions appear in user's timeline

### 2. UI Integration (85%)
Multi-layered proposal generation feedback: navbar badge, progress toasts, auto-navigation. Optimistic updates for technical data. Zustand stores propagate changes immediately.

**Mechanisms:**
- HTTP Polling (2.5s intervals, exponential backoff to 10s)
- Zustand global state propagation
- Optimistic updates with rollback
- Progress toasts with cancel/minimize

### 3. Prompt-Native Core
Main agent behaviors (waste analysis, pathways, ESG) defined in markdown prompts, not code. Role, methodology, output format all prompt-defined.

**Prompt files:**
- `waste-upcycling-report.v3.md` - Proposal generation
- `image-analysis.md` - Image analysis

### 4. Capability Discovery (79%)
Onboarding checklist, guided tour, empty state guidance, AI badge tooltips. Users learn what platform does progressively.

**Discovery mechanisms found:**
- Onboarding flow (4-step checklist)
- Guided tour (5-step project walkthrough)
- Empty state guidance
- AI badge with tooltips
- Command palette (Cmd+K)

### 5. Clean Agent Architecture
Pydantic-AI agents with structured output, context injection via decorators, separation of concerns between agents and services.

---

## Detailed Principle Audits

### 1. Action Parity (3.6%) ❌

**Principle:** "Whatever the user can do, the agent can do."

**Finding:** Only 2 of 55 user actions have corresponding agent capabilities:
- `generate_proposal()` - AI proposal generation
- `analyze_image()` - AI image analysis

**Missing Agent Capabilities:**

| Category | User Actions | Agent Tools |
|----------|--------------|-------------|
| Projects | 7 (list, get, create, update, delete, timeline, stats) | 0 |
| Project Data | 7 (get, update, quality params, sections) | 0 |
| Files | 5 (list, upload, delete, get detail, download) | 0 |
| Proposals | 6 (list, get, delete, PDF, AI metadata, job status) | 0 |
| Companies | 5 (full CRUD) | 0 |
| Locations | 5 (full CRUD) | 0 |
| Location Contacts | 3 (full CRUD) | 0 |
| Organizations | 9 (full CRUD + user management) | 0 |
| Admin Users | 3 (list, create, update) | 0 |
| Auth/User | 11 (auth flows, profile management) | 0 |

---

### 2. Tools as Primitives (N/A) ⚠️

**Principle:** "Tools provide capability, not behavior."

**Finding:** The agents have **zero registered tools**. They are "tool-less" agents that rely entirely on:
1. Prompt instructions (loaded from external markdown files)
2. Dynamic context injection via `@agent.instructions` decorators
3. Structured output parsing via Pydantic models

**Assessment:** Current state is acceptable for tool-less agents that produce structured outputs. The agents don't need tools because they:
- Receive all context upfront via `inject_context`
- Output structured data that the calling code interprets

**If tools are added, ensure primitives:**
- Good: `get_material_prices(material_type)`, `list_treatment_options(waste_type)`
- Bad: `determine_best_treatment(waste_data)`, `evaluate_and_recommend(project)`

---

### 3. Context Injection (40%) ❌

**Principle:** "System prompt includes dynamic context about app state."

| Context Type | Injected? | Location | Notes |
|--------------|-----------|----------|-------|
| Project Data | ✅ | `proposal_agent.py` | Full technical sections |
| Technical Sheet | ✅ | `proposal_agent.py` | Via `to_ai_context()` |
| Photo Insights | ✅ | `proposal_agent.py` | When available |
| Industry Sector | ✅ | `image_analysis_agent.py` | Project sector context |
| User Preferences | ⚠️ Partial | `proposal_service.py` | In request but NOT injected to prompt |
| Available Resources | ❌ | N/A | Only photos, not other files |
| Recent Activity | ❌ | N/A | No session history |
| Capabilities List | ❌ | N/A | Not enumerated |
| Session History | ❌ | N/A | Stateless calls |
| Workspace State | ❌ | N/A | No org context |

---

### 4. Shared Workspace (100%) ✅

**Principle:** "Agent and user work in the same data space."

| Data Store | User Access | Agent Access | Shared? |
|------------|-------------|--------------|---------|
| `projects` | Full CRUD | Reads `project_data` | ✅ |
| `proposals` | Views/deletes | Writes generated | ✅ |
| `project_files` | Uploads/views | Writes `ai_analysis` | ✅ |
| `timeline_events` | Views | Creates events | ✅ |
| `companies` | Full CRUD | Reads for context | ✅ |
| `locations` | Full CRUD | Reads for context | ✅ |

**No anti-patterns found:** No shadow tables, no sandbox isolation, no agent-specific data stores.

---

### 5. CRUD Completeness (0%) ❌

**Principle:** "Every entity has full CRUD for agents."

| Entity | API CRUD | Agent CRUD | Score |
|--------|----------|------------|-------|
| Project | ✅ Full | ❌ None | 0/4 |
| Proposal | ✅ CRD | ❌ None | 0/4 |
| Company | ✅ Full | ❌ None | 0/4 |
| Location | ✅ Full | ❌ None | 0/4 |
| LocationContact | ✅ Full | ❌ None | 0/4 |
| ProjectFile | ✅ CRD | ❌ None | 0/4 |
| User | ✅ CRU | ❌ None | 0/4 |
| Organization | ✅ Full | ❌ None | 0/4 |
| TimelineEvent | ✅ CR | ❌ None | 0/4 |

**All 9 entities have 0/4 agent CRUD operations.**

---

### 6. UI Integration (85%) ✅

**Principle:** "Agent actions immediately reflected in UI."

| Agent Action | UI Mechanism | Immediate? |
|-------------|--------------|------------|
| Proposal Start | Zustand + Toast | ✅ |
| Proposal Progress | HTTP Polling (2.5s) | ✅ Near-RT |
| Proposal Complete | Callback + Navigation | ✅ |
| Proposal Error | Toast + Retry | ✅ |
| Technical Data Update | Optimistic + Sync | ✅ |
| File Upload | Progress UI | ✅ |
| File Analysis | 5s Polling | ⚠️ Delayed |

**Minor gaps:**
- File AI processing uses 5s polling (no push notification)
- Dashboard stats not invalidated after project changes

---

### 7. Capability Discovery (79%) ⚠️

**Principle:** "Users can discover what the agent can do."

| Mechanism | Status | Quality |
|-----------|--------|---------|
| Onboarding flow | ✅ | Good - 4-step progressive checklist |
| Guided Tour | ✅ | Good - 5-step project walkthrough |
| Help documentation | ❌ | Button exists, not functional |
| Capability hints | ✅ | Good - AI badge tooltips |
| Agent self-describes | ⚠️ | Shows steps, not full capabilities |
| Empty state guidance | ✅ | Good - Explains next actions |
| Command palette | ✅ | Moderate - No /help command |

**Missing:**
- Functional help documentation
- Keyboard shortcut hints (Cmd+K)
- Agent capability summary

---

### 8. Prompt-Native Features (56%) ⚠️

**Principle:** "Features are prompts defining outcomes, not code."

**Prompt-defined (14):**
- Waste analyst role and methodology
- Business pathway generation
- ESG pitch format
- Material summary requirements
- Economics deep dive structure
- ROI summary format
- CO2 calculation methodology
- Circularity assessment criteria
- Image analysis role
- LCA methodology
- Lifecycle status categories

**Code-defined (11):**
- External report derivation logic
- Profitability thresholds (`_ROI_HIGH_THRESHOLD`)
- Buyer type allowlist (`_END_USE_ALLOWLIST`)
- Sensitive data redaction patterns
- Annual impact band logic
- Narrative composition templates
- Markdown report generation

---

## Top 10 Recommendations by Impact

| Priority | Action | Principle | Effort | Impact |
|----------|--------|-----------|--------|--------|
| 1 | Add CRUD tools to agents (Projects, Companies, Locations, Files) | Action Parity, CRUD | High | Critical |
| 2 | Inject user preferences into system prompt | Context Injection | Low | High |
| 3 | Move allowlists/thresholds to prompts | Prompt-Native | Medium | Medium |
| 4 | Add previous proposals context to agent | Context Injection | Medium | Medium |
| 5 | Create Help Center page | Capability Discovery | Medium | Medium |
| 6 | Add SSE for file processing status | UI Integration | Medium | Low |
| 7 | Enumerate agent capabilities in prompt | Context Injection | Low | Medium |
| 8 | Add dual-output prompt (internal + external) | Prompt-Native | Medium | Medium |
| 9 | Add keyboard shortcut hints in navbar | Capability Discovery | Low | Low |
| 10 | Move narrative composition to prompt | Prompt-Native | Medium | Low |

---

## Implementation Roadmap

### Phase 1: Quick Wins (1-2 weeks)
- [ ] Inject user preferences into system prompt
- [ ] Enumerate agent capabilities in prompt
- [ ] Add keyboard shortcut hints (Cmd+K)
- [ ] Wire up "View Documentation" button

### Phase 2: Context Enhancement (2-3 weeks)
- [ ] Add previous proposals context
- [ ] Create Help Center page
- [ ] Move allowlists to prompts (buyer types, ROI bands)

### Phase 3: Agent CRUD Tools (4-6 weeks)
- [ ] Create `tools/crud_tools.py` module
- [ ] Add Project CRUD tools
- [ ] Add Company/Location CRUD tools
- [ ] Add File management tools
- [ ] Add Proposal query tools

### Phase 4: Advanced (Future)
- [ ] SSE for real-time file processing status
- [ ] Dual-output prompts (internal + external)
- [ ] Move narrative composition to prompts
- [ ] Conversation/session history

---

## Architecture Strengths to Preserve

1. **Tool-less agents work well for current scope** - Pure generation/analysis without CRUD is valid for analytical agents
2. **Context injection pattern** - `@agent.instructions` decorator is extensible
3. **Shared workspace pattern** - Continue storing agent results in user-visible tables
4. **Polling with exponential backoff** - Pragmatic until SSE/WebSocket needed
5. **Markdown prompt files** - Easy to iterate on agent behavior without code changes

---

## Appendix: File Locations

### Agent Files
- `backend/app/agents/proposal_agent.py`
- `backend/app/agents/image_analysis_agent.py`
- `backend/app/agents/prompts/waste-upcycling-report.v3.md`
- `backend/app/agents/prompts/image-analysis.md`

### Services
- `backend/app/services/proposal_service.py`

### Frontend Stores
- `frontend/lib/stores/project-store.ts`
- `frontend/lib/stores/proposal-generation-store.ts`
- `frontend/lib/stores/technical-data-store.ts`

### API Files
- `frontend/lib/api/projects.ts`
- `frontend/lib/api/proposals.ts`
- `frontend/lib/api/companies.ts`
- `frontend/lib/api/organizations.ts`
