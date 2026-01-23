# AGENTS.md

AI waste-opportunity platform: opportunities -> AI proposals -> compliance gates -> CRM/Marketplace sync.

## Stack

- Monorepo: `backend/` (FastAPI), `frontend/` (Next.js), `infrastructure/` (Terraform)
- Package managers: `bun` (frontend), `uv` (backend)
- Early development, no users. Do things right: zero tech debt, no compatibility shims.

## Commands

- Backend: `cd backend && make check`
- Frontend: `cd frontend && bun run check:ci`

## Plan mode

- Keep plans extremely concise. Sacrifice grammar for concision.
- End each plan with unresolved questions, if any.

## Subagents
- ALWAYS wait for all subagents to complete before yielding.
- Spawn subagents automatically when:
- Parallelizable work (e.g., install + verify, npm test + typecheck, multiple tasks from plan)
- Long-running or blocking tasks where a worker can run independently.
Isolation for risky changes or checks

## Before starting

Read the relevant doc in `docs/agents/`:

- [development-commands.md](docs/agents/development-commands.md) - all commands
- [workflows.md](docs/agents/workflows.md) - adding endpoints, features, migrations
- [architecture.md](docs/agents/architecture.md) - data model, flows, key files
- [code-style.md](docs/agents/code-style.md) - coding principles
- [debugging.md](docs/agents/debugging.md) - troubleshooting
- [environment-setup.md](docs/agents/environment-setup.md) - env vars
