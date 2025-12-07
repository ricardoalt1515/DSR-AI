## Development Commands

Prefer these references instead of copying commands into `AGENTS.md`.

### Full stack
- Start backend services (FastAPI + PostgreSQL + Redis): `cd backend && docker-compose up`
- Start frontend dev server (Turbopack hot reload): `cd frontend && npm run dev`
- Run database migrations: `cd backend && docker-compose exec app alembic upgrade head`

### Backend
- Tests with coverage: `cd backend && pytest --cov=app --cov-report=html`
- Single test file: `cd backend && pytest -v tests/test_projects.py`
- Type checks: `cd backend && mypy app/`
- Format/lint: `cd backend && black app/ && ruff check app/`

### Frontend
- Full code quality (CI mode): `cd frontend && npm run check:ci`
- Auto-fix lint issues: `cd frontend && npm run lint:fix`
- Format: `cd frontend && npm run format`
- Production build: `cd frontend && npm run build`

### Infrastructure
- Work from `infrastructure/terraform/environments/prod`
- Plan: `terraform plan`
- Apply: `terraform apply`
- Show state: `terraform show`
