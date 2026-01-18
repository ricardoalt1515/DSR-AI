import asyncio
import uuid

import pytest
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.database import get_async_db
from app.core.fastapi_users_instance import current_active_user
from app.main import app
from app.models.company import Company
from app.models.file import ProjectFile
from app.models.location import Location
from app.models.organization import Organization
from app.models.project import Project
from app.models.proposal import Proposal
from app.models.timeline import TimelineEvent
from app.models.user import User, UserRole
from app.services.cache_service import cache_service


class FakeRedis:
    def __init__(self) -> None:
        self.store: dict[str, str] = {}

    async def setex(self, key: str, _ttl: int, value: str) -> None:
        self.store[key] = value

    async def get(self, key: str) -> str | None:
        return self.store.get(key)

    async def incr(self, key: str) -> int:
        value = int(self.store.get(key, "0")) + 1
        self.store[key] = str(value)
        return value

    async def expire(self, _key: str, _ttl: int) -> None:
        return None


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        follow_redirects=True,
    ) as client:
        yield client


@pytest.fixture
async def test_engine():
    engine = create_async_engine(
        settings.async_database_url,
        poolclass=NullPool,
    )
    yield engine
    await engine.dispose()


@pytest.fixture
async def db_session(test_engine):
    session_maker = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    async with session_maker() as session:
        yield session


@pytest.fixture(autouse=True)
async def override_get_async_db(test_engine):
    session_maker = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    async def _override():
        async with session_maker() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_async_db] = _override
    yield
    app.dependency_overrides.pop(get_async_db, None)


@pytest.fixture
def set_current_user():
    def _set(user: User) -> None:
        async def _override():
            return user

        app.dependency_overrides[current_active_user] = _override

    yield _set
    app.dependency_overrides.clear()


async def create_org(session, name: str, slug: str) -> Organization:
    unique_slug = f"{slug}-{uuid.uuid4().hex[:8]}"
    org = Organization(name=name, slug=unique_slug, settings={}, is_active=True)
    session.add(org)
    await session.commit()
    await session.refresh(org)
    return org


async def create_user(
    session,
    *,
    email: str,
    org_id: uuid.UUID | None,
    role: str,
    is_superuser: bool,
) -> User:
    password_helper = PasswordHelper()
    user = User(
        email=email,
        hashed_password=password_helper.hash("Password1"),
        is_active=True,
        is_superuser=is_superuser,
        is_verified=True,
        role=role,
        organization_id=org_id,
        first_name="Test",
        last_name="User",
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def create_company(session, *, org_id: uuid.UUID, name: str) -> Company:
    company = Company(
        organization_id=org_id,
        name=name,
        industry="Manufacturing",
        sector="industrial",
        subsector="other",
        contact_name=None,
        contact_email=None,
        contact_phone=None,
        notes=None,
        tags=[],
    )
    session.add(company)
    await session.commit()
    await session.refresh(company)
    return company


async def create_location(
    session, *, org_id: uuid.UUID, company_id: uuid.UUID, name: str
) -> Location:
    location = Location(
        organization_id=org_id,
        company_id=company_id,
        name=name,
        city="City",
        state="State",
        address="Address",
        latitude=None,
        longitude=None,
        notes=None,
    )
    session.add(location)
    await session.commit()
    await session.refresh(location)
    return location


async def create_project(
    session,
    *,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    location_id: uuid.UUID,
    name: str,
) -> Project:
    project = Project(
        organization_id=org_id,
        user_id=user_id,
        location_id=location_id,
        name=name,
        client="Client",
        sector="industrial",
        subsector="other",
        location="City, State",
        project_type="Assessment",
        description="Test project",
        budget=0.0,
        schedule_summary="N/A",
        tags=[],
        status="In Preparation",
        progress=0,
        project_data={},
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project


async def cleanup_org(session, org_id: uuid.UUID) -> None:
    await session.execute(delete(TimelineEvent).where(TimelineEvent.organization_id == org_id))
    await session.execute(delete(ProjectFile).where(ProjectFile.organization_id == org_id))
    await session.execute(delete(Proposal).where(Proposal.organization_id == org_id))
    await session.execute(delete(Project).where(Project.organization_id == org_id))
    await session.execute(delete(Location).where(Location.organization_id == org_id))
    await session.execute(delete(Company).where(Company.organization_id == org_id))
    await session.execute(delete(User).where(User.organization_id == org_id))
    await session.execute(delete(Organization).where(Organization.id == org_id))
    await session.commit()


@pytest.mark.asyncio
async def test_user_org_a_cannot_see_companies_org_b(client, db_session, set_current_user):
    org_a = await create_org(db_session, "Org A", "org-a")
    org_b = await create_org(db_session, "Org B", "org-b")
    user_a = await create_user(
        db_session,
        email="usera@example.com",
        org_id=org_a.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    await create_company(db_session, org_id=org_a.id, name="Company A")
    await create_company(db_session, org_id=org_b.id, name="Company B")

    set_current_user(user_a)
    response = await client.get("/api/v1/companies")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Company A"

    await cleanup_org(db_session, org_a.id)


@pytest.mark.asyncio
async def test_field_agent_location_detail_only_shows_own_projects_same_org(
    client, db_session, set_current_user
):
    org = await create_org(db_session, "Org A8", "org-a8")
    user_a = await create_user(
        db_session,
        email="usera8@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    user_b = await create_user(
        db_session,
        email="userb8@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Company A8")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Location A8"
    )
    project_a = await create_project(
        db_session,
        org_id=org.id,
        user_id=user_a.id,
        location_id=location.id,
        name="Project A8",
    )
    await create_project(
        db_session,
        org_id=org.id,
        user_id=user_b.id,
        location_id=location.id,
        name="Project B8",
    )

    set_current_user(user_a)
    response = await client.get(f"/api/v1/companies/locations/{location.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["projectCount"] == 1
    assert len(data.get("projects") or []) == 1
    assert data["projects"][0]["id"] == str(project_a.id)

    await cleanup_org(db_session, org.id)


@pytest.mark.asyncio
async def test_field_agent_locations_list_scopes_project_count_same_org(
    client, db_session, set_current_user
):
    org = await create_org(db_session, "Org A9", "org-a9")
    user_a = await create_user(
        db_session,
        email="usera9@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    user_b = await create_user(
        db_session,
        email="userb9@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Company A9")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Location A9"
    )
    await create_project(
        db_session,
        org_id=org.id,
        user_id=user_a.id,
        location_id=location.id,
        name="Project A9",
    )
    await create_project(
        db_session,
        org_id=org.id,
        user_id=user_b.id,
        location_id=location.id,
        name="Project B9",
    )

    set_current_user(user_a)
    response = await client.get(f"/api/v1/companies/locations?company_id={company.id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == str(location.id)
    assert data[0]["projectCount"] == 1

    await cleanup_org(db_session, org.id)


@pytest.mark.asyncio
async def test_org_admin_location_detail_shows_all_projects_same_org(
    client, db_session, set_current_user
):
    org = await create_org(db_session, "Org A10", "org-a10")
    org_admin = await create_user(
        db_session,
        email="orgadmin10@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    user_a = await create_user(
        db_session,
        email="usera10@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    user_b = await create_user(
        db_session,
        email="userb10@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Company A10")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Location A10"
    )
    await create_project(
        db_session,
        org_id=org.id,
        user_id=user_a.id,
        location_id=location.id,
        name="Project A10",
    )
    await create_project(
        db_session,
        org_id=org.id,
        user_id=user_b.id,
        location_id=location.id,
        name="Project B10",
    )

    set_current_user(org_admin)
    response = await client.get(f"/api/v1/companies/locations/{location.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["projectCount"] == 2
    assert len(data.get("projects") or []) == 2

    await cleanup_org(db_session, org.id)


@pytest.mark.asyncio
async def test_user_org_a_cannot_see_locations_org_b(client, db_session, set_current_user):
    org_a = await create_org(db_session, "Org A2", "org-a2")
    org_b = await create_org(db_session, "Org B2", "org-b2")
    user_a = await create_user(
        db_session,
        email="usera2@example.com",
        org_id=org_a.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company_a = await create_company(db_session, org_id=org_a.id, name="Company A2")
    company_b = await create_company(db_session, org_id=org_b.id, name="Company B2")
    await create_location(db_session, org_id=org_a.id, company_id=company_a.id, name="Location A")
    await create_location(db_session, org_id=org_b.id, company_id=company_b.id, name="Location B")

    set_current_user(user_a)
    response = await client.get("/api/v1/companies/locations")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Location A"

    await cleanup_org(db_session, org_a.id)
    await cleanup_org(db_session, org_b.id)


@pytest.mark.asyncio
async def test_user_org_a_cannot_see_projects_org_b(client, db_session, set_current_user):
    org_a = await create_org(db_session, "Org A3", "org-a3")
    org_b = await create_org(db_session, "Org B3", "org-b3")
    user_a = await create_user(
        db_session,
        email="usera3@example.com",
        org_id=org_a.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    user_b = await create_user(
        db_session,
        email="userb3@example.com",
        org_id=org_b.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company_a = await create_company(db_session, org_id=org_a.id, name="Company A3")
    company_b = await create_company(db_session, org_id=org_b.id, name="Company B3")
    location_a = await create_location(
        db_session, org_id=org_a.id, company_id=company_a.id, name="Location A3"
    )
    location_b = await create_location(
        db_session, org_id=org_b.id, company_id=company_b.id, name="Location B3"
    )
    await create_project(
        db_session, org_id=org_a.id, user_id=user_a.id, location_id=location_a.id, name="Project A"
    )
    await create_project(
        db_session, org_id=org_b.id, user_id=user_b.id, location_id=location_b.id, name="Project B"
    )

    set_current_user(user_a)
    response = await client.get("/api/v1/projects")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Project A"

    await cleanup_org(db_session, org_a.id)
    await cleanup_org(db_session, org_b.id)


@pytest.mark.asyncio
async def test_org_admin_sees_all_projects_in_org(client, db_session, set_current_user):
    org_a = await create_org(db_session, "Org A4", "org-a4")
    org_admin = await create_user(
        db_session,
        email="orgadmin@example.com",
        org_id=org_a.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    user_a = await create_user(
        db_session,
        email="usera4@example.com",
        org_id=org_a.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company_a = await create_company(db_session, org_id=org_a.id, name="Company A4")
    location_a = await create_location(
        db_session, org_id=org_a.id, company_id=company_a.id, name="Location A4"
    )
    await create_project(
        db_session, org_id=org_a.id, user_id=user_a.id, location_id=location_a.id, name="Project A4"
    )

    set_current_user(org_admin)
    response = await client.get("/api/v1/projects")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Project A4"

    await cleanup_org(db_session, org_a.id)


@pytest.mark.asyncio
async def test_superadmin_without_header_gets_400(client, db_session, set_current_user):
    superuser = await create_user(
        db_session,
        email=f"superadmin-{uuid.uuid4().hex[:8]}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    set_current_user(superuser)
    response = await client.get("/api/v1/companies")
    assert response.status_code == 400
    assert "select organization" in response.json()["error"]["message"].lower()

    await db_session.execute(delete(User).where(User.id == superuser.id))
    await db_session.commit()


@pytest.mark.asyncio
async def test_job_status_not_leaked_cross_org(client, db_session, set_current_user):
    org_a = await create_org(db_session, "Org A5", "org-a5")
    org_b = await create_org(db_session, "Org B5", "org-b5")
    user_a = await create_user(
        db_session,
        email="usera5@example.com",
        org_id=org_a.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    user_b = await create_user(
        db_session,
        email="userb5@example.com",
        org_id=org_b.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    cache_service._redis = FakeRedis()
    job_id = "job_test_123"
    await cache_service.set_job_status_scoped(
        org_id=org_b.id,
        user_id=user_b.id,
        job_id=job_id,
        status={
            "job_id": job_id,
            "status": "queued",
            "progress": 0,
            "current_step": "Queued",
        },
    )

    set_current_user(user_a)
    response = await client.get(f"/api/v1/ai/proposals/jobs/{job_id}")
    assert response.status_code == 404

    cache_service._redis = None
    await cleanup_org(db_session, org_a.id)
    await cleanup_org(db_session, org_b.id)


@pytest.mark.asyncio
async def test_create_project_with_location_from_other_org(client, db_session, set_current_user):
    org_a = await create_org(db_session, "Org A6", "org-a6")
    org_b = await create_org(db_session, "Org B6", "org-b6")
    user_a = await create_user(
        db_session,
        email="usera6@example.com",
        org_id=org_a.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company_b = await create_company(db_session, org_id=org_b.id, name="Company B6")
    location_b = await create_location(
        db_session, org_id=org_b.id, company_id=company_b.id, name="Location B6"
    )

    set_current_user(user_a)
    response = await client.post(
        "/api/v1/projects",
        json={"location_id": str(location_b.id), "name": "Cross Org Project"},
    )
    assert response.status_code == 404

    await cleanup_org(db_session, org_a.id)
    await cleanup_org(db_session, org_b.id)


@pytest.mark.asyncio
async def test_create_location_with_company_from_other_org(client, db_session, set_current_user):
    org_a = await create_org(db_session, "Org A7", "org-a7")
    org_b = await create_org(db_session, "Org B7", "org-b7")
    user_a = await create_user(
        db_session,
        email="usera7@example.com",
        org_id=org_a.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company_b = await create_company(db_session, org_id=org_b.id, name="Company B7")

    set_current_user(user_a)
    response = await client.post(
        f"/api/v1/companies/{company_b.id}/locations",
        json={
            "company_id": str(company_b.id),
            "name": "Cross Org Location",
            "city": "City",
            "state": "State",
        },
    )
    assert response.status_code == 404

    await cleanup_org(db_session, org_a.id)
    await cleanup_org(db_session, org_b.id)
