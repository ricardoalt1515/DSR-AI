"""
Shared pytest fixtures for all tests.

This file is automatically discovered by pytest and makes fixtures
available to all test files without explicit imports.
"""

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
from app.models.bulk_import import ImportItem, ImportRun
from app.models.company import Company
from app.models.file import ProjectFile
from app.models.intake_note import IntakeNote
from app.models.intake_suggestion import IntakeSuggestion
from app.models.intake_unmapped_note import IntakeUnmappedNote
from app.models.location import Location
from app.models.organization import Organization
from app.models.project import Project
from app.models.proposal import Proposal
from app.models.timeline import TimelineEvent
from app.models.user import User
from app.services.cache_service import RedisClient


class FakeRedis(RedisClient):
    """In-memory Redis mock for testing cache operations."""

    def __init__(self) -> None:
        self.store: dict[str, str] = {}

    async def setex(self, name: str, time: int, value: str) -> object:
        self.store[name] = value
        return True

    async def get(self, name: str) -> str | None:
        return self.store.get(name)

    async def set(self, name: str, value: str) -> object:
        self.store[name] = value
        return True

    async def delete(self, *names: str) -> int:
        removed = 0
        for name in names:
            if self.store.pop(name, None) is not None:
                removed += 1
        return removed

    async def exists(self, *names: str) -> int:
        return sum(1 for name in names if name in self.store)

    async def incr(self, name: str) -> int:
        value = int(self.store.get(name, "0")) + 1
        self.store[name] = str(value)
        return value

    async def expire(self, name: str, time: int) -> object:
        return True

    async def ping(self) -> object:
        return True

    async def close(self) -> None:
        return None


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def client():
    """Async HTTP client for testing FastAPI endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        follow_redirects=True,
    ) as c:
        yield c


@pytest.fixture
async def test_engine():
    """SQLAlchemy async engine for tests."""
    engine = create_async_engine(
        settings.async_database_url,
        poolclass=NullPool,
    )
    yield engine
    await engine.dispose()


@pytest.fixture
async def db_session(test_engine):
    """Async database session for direct DB operations in tests."""
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
    """Override FastAPI's DB dependency with test session."""
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
    """
    Fixture to override current_active_user dependency.

    Usage:
        set_current_user(user)
        response = await client.get("/api/v1/...")
    """

    def _set(user: User) -> None:
        async def _override():
            return user

        app.dependency_overrides[current_active_user] = _override

    yield _set
    app.dependency_overrides.clear()


async def create_org(session: AsyncSession, name: str, slug: str) -> Organization:
    """Create a test organization."""
    unique_slug = f"{slug}-{uuid.uuid4().hex[:8]}"
    org = Organization(name=name, slug=unique_slug, settings={}, is_active=True)
    session.add(org)
    await session.commit()
    await session.refresh(org)
    return org


async def create_user(
    session: AsyncSession,
    *,
    email: str,
    org_id: uuid.UUID | None,
    role: str,
    is_superuser: bool,
) -> User:
    """Create a test user with hashed password."""
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


async def create_company(
    session: AsyncSession,
    *,
    org_id: uuid.UUID,
    name: str,
    created_by_user_id: uuid.UUID | None = None,
) -> Company:
    """Create a test company."""
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
        created_by_user_id=created_by_user_id,
    )
    session.add(company)
    await session.commit()
    await session.refresh(company)
    return company


async def create_location(
    session: AsyncSession,
    *,
    org_id: uuid.UUID,
    company_id: uuid.UUID,
    name: str,
    created_by_user_id: uuid.UUID | None = None,
) -> Location:
    """Create a test location."""
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
        created_by_user_id=created_by_user_id,
    )
    session.add(location)
    await session.commit()
    await session.refresh(location)
    return location


async def create_project(
    session: AsyncSession,
    *,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    location_id: uuid.UUID,
    name: str,
) -> Project:
    """Create a test project."""
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


async def cleanup_org(session: AsyncSession, org_id: uuid.UUID) -> None:
    """Clean up all data for an organization (use at end of tests)."""
    await session.execute(delete(TimelineEvent).where(TimelineEvent.organization_id == org_id))
    await session.execute(delete(ImportItem).where(ImportItem.organization_id == org_id))
    await session.execute(delete(ImportRun).where(ImportRun.organization_id == org_id))
    await session.execute(
        delete(IntakeSuggestion).where(IntakeSuggestion.organization_id == org_id)
    )
    await session.execute(
        delete(IntakeUnmappedNote).where(IntakeUnmappedNote.organization_id == org_id)
    )
    await session.execute(delete(IntakeNote).where(IntakeNote.organization_id == org_id))
    await session.execute(delete(ProjectFile).where(ProjectFile.organization_id == org_id))
    await session.execute(delete(Proposal).where(Proposal.organization_id == org_id))
    await session.execute(delete(Project).where(Project.organization_id == org_id))
    await session.execute(delete(Location).where(Location.organization_id == org_id))
    await session.execute(delete(Company).where(Company.organization_id == org_id))
    await session.execute(delete(User).where(User.organization_id == org_id))
    await session.execute(delete(Organization).where(Organization.id == org_id))
    await session.commit()
