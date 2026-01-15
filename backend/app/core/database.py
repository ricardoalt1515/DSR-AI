"""
Database session management.
Provides SQLAlchemy session factory and dependency injection.
"""

from collections.abc import AsyncGenerator, Generator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.core.config import settings

# Create declarative base for models
Base = declarative_base()

# Sync engine (for Alembic migrations)
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=False,  # Disable SQL query logging to reduce noise
)

# Async engine (for FastAPI endpoints)
async_engine = create_async_engine(
    settings.async_database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=False,  # Disable SQL query logging to reduce noise
)

# Session factories
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# Dependency for sync sessions (rarely used, mainly for migrations)
def get_db() -> Generator[Session, None, None]:
    """
    Dependency for getting sync database session.
    Use for Alembic migrations or special cases.
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# Dependency for async sessions (main usage)
async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for getting async database session.
    Use this for all FastAPI endpoints.

    Example:
        @router.get("/projects")
        async def get_projects(db: AsyncSession = Depends(get_async_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# Database utilities
async def init_db() -> None:
    """
    Initialize database.
    Creates all tables if they don't exist.
    Use only in development - in production use Alembic migrations.
    """
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Close database connections."""
    await async_engine.dispose()
