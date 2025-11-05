# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DSR Inc.** is an AI-powered waste treatment engineering platform that generates technical proposals using Pydantic-AI agents. The system is architected as a **multi-repo workspace** with independent deployment pipelines:

- **Backend**: FastAPI + Python (independent Git repo in `backend/`)
- **Frontend**: Next.js + React (independent Git repo in `frontend/`)
- **Infrastructure**: Terraform + AWS deployment configs

Each component has its own CLAUDE.md with specific guidance - refer to `backend/CLAUDE.md` and `frontend/CLAUDE.md` for detailed instructions.

## Repository Structure

```
h2o-allegiant/
├── backend/              # FastAPI Python backend (separate Git repo)
├── frontend/             # Next.js React frontend (separate Git repo)
├── infrastructure/       # Terraform AWS deployment configs
└── _docs/               # Shared documentation and specifications
```

## Key Architecture Decisions

### 1. Dynamic Data Model (JSONB)

The `project.project_data` column stores flexible technical data as JSONB in PostgreSQL. This enables multi-sector support without schema migrations:

```python
# Backend: app/models/project.py
project_data = Column(JSONB, default={}, nullable=False)
```

**Why**: Water treatment projects vary significantly by sector (municipal, industrial, mining). Fixed schemas would require constant migrations.

### 2. Pydantic-AI with Deterministic Tools

The proposal generation system uses Pydantic-AI agents with **deterministic engineering tools** (not pure LLM estimation):

```python
# backend/app/agents/proposal_agent.py
@agent.tool
def calculate_reactor_volume(flow_rate: float, hrt_hours: float) -> float:
    """Standard engineering formula - not LLM guessing"""
    return flow_rate * hrt_hours
```

**Why**: Engineering calculations must be reproducible and comply with published standards (Metcalf & Eddy, WEF).

### 3. Independent Deployment Pipelines

Backend and frontend are separate Git repositories with independent CI/CD:

- **Backend**: Docker → ECR → ECS Fargate
- **Frontend**: Git push → AWS Amplify

**Why**: Decouples frontend UI iterations from critical backend API changes, enabling faster iteration cycles.

## Common Development Commands

### Full Stack Development

```bash
# Start backend services (FastAPI + PostgreSQL + Redis)
cd backend && docker-compose up

# Start frontend dev server (Turbopack hot reload)
cd frontend && npm run dev

# Run database migrations
cd backend && docker-compose exec app alembic upgrade head
```

### Backend Development

```bash
cd backend

# Run tests with coverage
pytest --cov=app --cov-report=html

# Run single test file
pytest -v tests/test_projects.py

# Check types
mypy app/

# Format code
black app/
ruff check app/
```

### Frontend Development

```bash
cd frontend

# Full code quality check (CI mode)
npm run check:ci

# Auto-fix lint issues
npm run lint:fix

# Format code
npm run format

# Production build
npm run build
```

### Infrastructure

```bash
cd infrastructure/terraform/environments/prod

# Plan infrastructure changes
terraform plan

# Apply changes
terraform apply

# Check current state
terraform show
```

## High-Level Architecture

### Request Flow: AI Proposal Generation

```
User clicks "Generate" in React UI
    ↓
POST /api/v1/ai/proposals/generate (returns jobId)
    ↓
Background FastAPI job (60-120s):
    1. Load project.project_data (JSONB) → FlexibleWaterProjectData
    2. Query proven cases (intelligent_case_filter tool)
    3. Calculate mass balances (deterministic formulas)
    4. Design treatment train (AI selects equipment)
    5. Size reactors (engineering_calculations tool)
    6. Validate against regulations
    7. Calculate CAPEX + OPEX (cost models)
    8. Generate ProposalOutput (Pydantic validation)
    ↓
Frontend polls GET /api/v1/ai/proposals/jobs/{jobId}
    ↓
Display proposal in React with cost charts (Recharts)
```

### Database Design Pattern

**Core models** (structured columns):

- User, Project (metadata), Proposal (versions), ProjectFile

**Dynamic data** (JSONB):

- `project.project_data` - Flexible technical sections/fields

**Key relationships**:

```
User ──1:N──> Project ──1:N──> Proposal
                      ├──1:N──> ProjectFile
                      └──1:N──> TimelineEvent
```

### Authentication Flow

```
POST /auth/register → User created with bcrypt hashed password
    ↓
POST /auth/jwt/login → JWT token returned (24h expiry)
    ↓
Frontend stores token in localStorage
    ↓
All API requests include: Authorization: Bearer <token>
    ↓
FastAPI Users middleware validates JWT
```

### State Management (Frontend)

**Zustand stores** with localStorage persistence:

- `project-store.ts` - Project CRUD, dashboard stats
- `technical-data-store.ts` - Dynamic form state

**API integration pattern**:

```typescript
// lib/api/projects.ts
export class ProjectsAPI {
  static async create(data: ProjectCreate): Promise<ProjectDetail> {
    return apiClient.post("/projects", data);
  }
}

// components/features/projects/CreateProject.tsx
const handleSubmit = async (data) => {
  const project = await ProjectsAPI.create(data);
  projectStore.addProject(project);
};
```

## Critical Files to Understand

### Backend Core

- `backend/app/core/config.py` - Environment configuration (Pydantic Settings)
- `backend/app/models/project.py` - Project model with JSONB project_data
- `backend/app/agents/proposal_agent.py` - Main AI agent with tools
- `backend/app/services/proposal_service.py` - Proposal generation workflow
- `backend/app/api/v1/` - All API endpoints

### Frontend Core

- `frontend/lib/api/client.ts` - Fetch wrapper with JWT auth
- `frontend/lib/stores/project-store.ts` - Zustand project state
- `frontend/app/` - Next.js App Router pages
- `frontend/components/features/` - Feature-specific components
- `frontend/components/ui/` - shadcn/ui component library

### Infrastructure

- `infrastructure/terraform/environments/prod/main.tf` - AWS resources
- `backend/Dockerfile` - Multi-stage Docker build
- `backend/docker-compose.yml` - Local development services

## Working with the Codebase

### Adding a New API Endpoint

1. Create route in `backend/app/api/v1/your_feature.py`
2. Add business logic in `backend/app/services/your_feature_service.py`
3. Update models in `backend/app/models/` if needed
4. Add Pydantic schemas in `backend/app/schemas/`
5. Write tests in `backend/tests/test_your_feature.py`

### Adding a New Frontend Feature

1. Create page in `frontend/app/your-feature/page.tsx`
2. Add components in `frontend/components/features/your-feature/`
3. Create API service in `frontend/lib/api/your-feature.ts`
4. Add Zustand store if needed in `frontend/lib/stores/`
5. Define types in `frontend/lib/types/your-feature.ts`

````

### Database Migrations

```bash
cd backend

# Auto-generate migration from model changes
alembic revision --autogenerate -m "add new column"

# Review the generated migration in alembic/versions/

# Apply migration
alembic upgrade head

# Rollback if needed
alembic downgrade -1
````

## Performance Considerations

### Backend Optimization

- **Database**: Use `selectinload()` for eager loading relationships to avoid N+1 queries
- **Caching**: Redis cache service available in `app/services/cache_service.py`
- **Long-running tasks**: AI generation uses async workers (6 per Gunicorn instance)
- **Rate limiting**: Redis-backed middleware prevents abuse

### Frontend Optimization

- **Code splitting**: Next.js automatically splits routes
- **Image optimization**: Use `next/image` component
- **State persistence**: Zustand stores persist to localStorage (check size limits)
- **API caching**: Consider React Query for future optimizations

## Environment Configuration

### Backend Required Variables

```bash
# AI
OPENAI_API_KEY=sk-...

# Security
SECRET_KEY=<32+ char random string>

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<secure password>
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DB=h2o_allegiant

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Storage (dev)
USE_LOCAL_STORAGE=true
LOCAL_STORAGE_PATH=./storage
```

### Frontend Required Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Debugging

### Backend Issues

```bash
# Check logs
docker-compose logs app

# Access container shell
docker-compose exec app bash

# Connect to database
docker-compose exec postgres psql -U postgres -d h2o_allegiant

# Check Redis cache
docker-compose exec redis redis-cli
```

### Frontend Issues

```bash
# Check build errors
npm run build

# Lint check
npm run check:ci

# Check TypeScript types
npx tsc --noEmit
```

### Common Issues

**"Module not found"** (Backend): Check `pyproject.toml` dependencies, rebuild Docker image
**"Type error"** (Frontend): Check `lib/types/` definitions match API responses
**"Database connection failed"**: Verify PostgreSQL is running and env vars are correct
**"AI generation timeout"**: Check OpenAI API key and quota limits

# View coverage

````

### Frontend Tests
Currently using Biome for code quality. Consider adding:

## Deployment

### Backend Deployment
```bash
# Build Docker image
cd backend
docker build -t h2o-allegiant-backend .

# Tag and push to ECR (production)
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-west-2.amazonaws.com
docker tag h2o-allegiant-backend:latest <account>.dkr.ecr.us-west-2.amazonaws.com/h2o-allegiant:latest
docker push <account>.dkr.ecr.us-west-2.amazonaws.com/h2o-allegiant:latest

# ECS will auto-deploy with rolling update
````

- Remember following principles:

Don’t repeat yourself (DRY)

Comment where needed

Fail fast (code should reveal its bugs as early as possible)

Avoid magic numbers

One purpose for each variable

Use good names

Use whitespace and punctuation to help the reader

Don’t use global variables

Functions should return results, not print them

Avoid special-case code

