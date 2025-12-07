# AGENTS.md

Use this file to onboard the agent quickly; everything else lives in `agents_docs/` (progressive disclosure). Keep instructions universal and concise.

## Purpose (WHY)
AI waste-opportunity platform: ingest opportunities (direct/partners), capture waste data (manual now; SDS/photos later), have the AI Waste Expert generate a conceptual proposal, run compliance + logistics gates, validate the sale, then sync to CRM (HubSpot) and the Marketplace for fulfillment.

## General Rules
- Early development, no users. No backwards compatibility concerns. Do THINGS RIGHT: clean, organized, zero tech debt. Never create  compatibility shims.
- prefer clear function/variable names over inline comments.
- avoid helper functions when a simple inline expression would suffice
- use 'knip' to remove unused code if making large changes.
- Don't Use emojis 

## React
- avoid massive jsx blocks and compose smaller components.
- Avoid 'useEffect' unless abolutely necessary.

## Typescript
- Don't unnecesaruly add 'try' / 'catch'
- Don't cast to 'any'

## Map (WHAT)
- Monorepo: backend (FastAPI/Python), frontend (Next.js/React), infrastructure (Terraform/AWS), docs in `_docs/`.
- Tree:
  - `backend/` FastAPI app, agents, models, services
  - `frontend/` App Router + shadcn/ui + Zustand
  - `infrastructure/` Terraform configs

## How to work (HOW)
- Start services: `cd backend && docker-compose up`
- Frontend dev: `cd frontend && npm run dev`
- Backend tests: `cd backend && pytest`
- Frontend checks: `cd frontend && npm run check:ci`
- Need more? Read the relevant doc in `agents_docs/` before proceeding.

## Architecture essentials
- Dynamic data: `project.project_data` is JSONB (flexible sectors without migrations).
- Deterministic tools: Pydantic-AI agent uses explicit calculators (e.g., reactor sizing) in `backend/app/agents/proposal_agent.py`.
- Opportunity flow (business): capture → AI Waste Expert produces conceptual proposal (technical/business/logistics outputs) → compliance + logistics reviews → sale validation → sync to CRM (HubSpot) and Marketplace.
- Request flow (tech): POST generate → background job (case filter, mass balances, treatment train, reactor sizing, CAPEX/OPEX, Pydantic validation) → frontend polls job → renders proposal.

## Key files
- Backend: `backend/app/core/config.py`, `backend/app/models/project.py`, `backend/app/agents/proposal_agent.py`, `backend/app/services/proposal_service.py`, `backend/app/api/v1/`
- Frontend: `frontend/lib/api/client.ts`, `frontend/lib/stores/project-store.ts`, `frontend/lib/stores/technical-data-store.ts`, `frontend/app/`, `frontend/components/features/`
- Infra: `infrastructure/terraform/environments/prod/main.tf`, `backend/docker-compose.yml`, `backend/Dockerfile`

## Agent workflow
- **Before starting any task**, determine which docs are relevant and read them:
  - Adding features/fixing bugs? → `workflows.md`
  - Running commands? → `development-commands.md`
  - Performance/deployment/debugging? → Read the matching doc
- Prefer pointers and existing code patterns; avoid duplicating snippets.
- Use linters/formatters instead of style instructions.

## Agent docs (read as needed)
- `agents_docs/development-commands.md` — full dev/test/build/infra commands.
- `agents_docs/workflows.md` — how to add backend endpoints, frontend features, migrations.
- `agents_docs/debugging.md` — troubleshooting for backend/frontend.
- `agents_docs/deployment.md` — deployment steps and notes.
- `agents_docs/environment-setup.md` — env vars for backend/frontend.
- `agents_docs/performance.md` — optimization notes.
- `agents_docs/architecture.md` — detailed flows, auth, state, data model.
- `_docs/dsr-ai-platform.md` — full business workflow (opportunity → validation → CRM/Marketplace).

## Maintenance
Keep these docs in sync with code changes. When refactoring, update the relevant `agents_docs/` file.
