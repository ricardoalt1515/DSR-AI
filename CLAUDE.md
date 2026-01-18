# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Before starting
Read the relevant doc in `docs/agents/`:
- [development-commands.md](docs/agents/development-commands.md) - all commands
- [workflows.md](docs/agents/workflows.md) - adding endpoints, features, migrations
- [architecture.md](docs/agents/architecture.md) - data model, flows, key files
- [code-style.md](docs/agents/code-style.md) - coding principles
- [debugging.md](docs/agents/debugging.md) - troubleshooting
- [environment-setup.md](docs/agents/environment-setup.md) - env vars
