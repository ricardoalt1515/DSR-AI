"""
FastAPI Users database adapter.

This module provides the database adapter dependency for FastAPI Users,
connecting the SQLAlchemy session to the User model.

Best Practices:
    - Uses existing async database session
    - Type-safe dependency injection
    - Follows FastAPI Users conventions
    - Clean separation of concerns
"""

from typing import AsyncGenerator
from fastapi import Depends
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.models.user import User


async def get_user_db(
    session: AsyncSession = Depends(get_async_db)
) -> AsyncGenerator[SQLAlchemyUserDatabase, None]:
    """
    Dependency to get FastAPI Users database adapter.
    
    This connects FastAPI Users to our SQLAlchemy async session and User model.
    
    Args:
        session: Async database session from existing dependency
        
    Yields:
        SQLAlchemyUserDatabase: FastAPI Users database adapter
        
    Usage:
        @router.get("/example")
        async def example(user_db = Depends(get_user_db)):
            # Use user_db here
            pass
    """
    yield SQLAlchemyUserDatabase(session, User)
