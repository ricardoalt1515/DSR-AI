"""
API dependencies for authentication and authorization.

This module now uses FastAPI Users for authentication.
The custom get_current_user is replaced by FastAPI Users dependencies.

Best Practices:
    - Use FastAPI Users dependencies for authentication
    - Type-safe with Annotated
    - Clean and minimal
"""

from typing import Annotated
from fastapi import Depends

from app.models.user import User
from app.core.fastapi_users_instance import (
    current_active_user,
    current_superuser,
    current_verified_user,
    current_active_user_optional,
)

import structlog

logger = structlog.get_logger(__name__)

# ==============================================================================
# FastAPI Users Dependencies
# ==============================================================================
# These replace the custom JWT authentication logic with FastAPI Users
# ==============================================================================

# Type alias for current authenticated user (most common)
# Use in routes that require authentication
CurrentUser = Annotated[User, Depends(current_active_user)]

# Type alias for admin/superuser only routes
# Use in routes that require admin privileges
CurrentSuperUser = Annotated[User, Depends(current_superuser)]

# Type alias for verified users only
# Use in routes that require email verification
CurrentVerifiedUser = Annotated[User, Depends(current_verified_user)]

# Type alias for optional authentication
# Returns None if not authenticated, otherwise returns User
from typing import Optional
OptionalUser = Annotated[Optional[User], Depends(current_active_user_optional)]

# ==============================================================================
# Database Dependencies
# ==============================================================================
# Best Practice: Use Annotated for cleaner endpoint signatures
# ==============================================================================

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_db

# Type alias for async database session
AsyncDB = Annotated[AsyncSession, Depends(get_async_db)]

# ==============================================================================
# Pagination & Query Parameters
# ==============================================================================
# Standard pagination and search parameters with validation
# ==============================================================================

from fastapi import Query
from uuid import UUID

# Pagination
PageNumber = Annotated[
    int,
    Query(
        ge=1,
        le=1000,
        description="Page number (1-indexed)",
        examples=[1]
    )
]

PageSize = Annotated[
    int,
    Query(
        ge=1,
        le=100,
        alias="size",  # Frontend expects 'size' parameter
        description="Items per page (max 100 for performance)",
        examples=[10, 20, 50]
    )
]

# Search & Filters
SearchQuery = Annotated[
    str | None,
    Query(
        max_length=100,
        description="Search term for name or client (ILIKE search)",
        examples=["Water Treatment", "Municipal"]
    )
]

StatusFilter = Annotated[
    str | None,
    Query(
        description="Filter by project status",
        examples=["Active", "In Preparation", "Completed"]
    )
]

SectorFilter = Annotated[
    str | None,
    Query(
        description="Filter by sector",
        examples=["Municipal", "Industrial", "Commercial"]
    )
]

# ==============================================================================
# Project Access Dependency
# ==============================================================================
# Centralizes project loading + access check (replaces 22+ repeated patterns)
# ==============================================================================

from fastapi import Path, HTTPException, status
from sqlalchemy import select
from app.models.project import Project


async def get_accessible_project(
    project_id: UUID = Path(..., description="Project unique identifier"),
    current_user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_db),
) -> Project:
    """
    Load a project ensuring the user has access.
    
    Access rules:
    - Superusers can access ANY project
    - Regular users can only access their OWN projects
    
    Security:
    - Returns 404 for both "not found" AND "no access" (prevents info leakage)
    - Single query with WHERE clause (no separate existence check)
    
    Usage:
        @router.get("/{project_id}/data")
        async def get_data(project: ProjectDep):
            # project is guaranteed to exist and user has access
            return project.data
    """
    conditions = [Project.id == project_id]
    if not current_user.is_superuser:
        conditions.append(Project.user_id == current_user.id)
    
    result = await db.execute(select(Project).where(*conditions))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return project


# Type alias for project with access check
# Use in routes that need a validated project from path parameter
ProjectDep = Annotated[Project, Depends(get_accessible_project)]

# ==============================================================================
# Usage Examples
# ==============================================================================
# 
# @router.get("/protected")
# async def protected_route(user: CurrentUser):
#     return {"user_id": user.id}
#
# @router.get("/admin")
# async def admin_route(user: CurrentSuperUser):
#     return {"admin": user.email}
#
# @router.get("/verified-only")
# async def verified_route(user: CurrentVerifiedUser):
#     return {"verified": user.email}
#
# @router.get("/optional-auth")
# async def optional_route(user: OptionalUser):
#     if user:
#         return {"authenticated": True}
#     return {"authenticated": False}
# ==============================================================================
