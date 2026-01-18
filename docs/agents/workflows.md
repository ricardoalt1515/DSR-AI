## Common Workflows

### Adding a backend API endpoint
1) Add route: `backend/app/api/v1/<feature>.py`
2) Add service logic: `backend/app/services/<feature>_service.py`
3) Update models if needed: `backend/app/models/`
4) Add Pydantic schemas: `backend/app/schemas/`
5) Add tests: `backend/tests/test_<feature>.py`

### Adding a frontend feature
1) Page: `frontend/app/<feature>/page.tsx`
2) Components: `frontend/components/features/<feature>/`
3) API client: `frontend/lib/api/<feature>.ts`
4) State (if needed): `frontend/lib/stores/`
5) Types: `frontend/lib/types/<feature>.ts`

### Database migrations
1) `cd backend`
2) Autogenerate: `alembic revision --autogenerate -m "<message>"`
3) Review: `backend/alembic/versions/`
4) Apply: `alembic upgrade head`
5) Rollback: `alembic downgrade -1`
