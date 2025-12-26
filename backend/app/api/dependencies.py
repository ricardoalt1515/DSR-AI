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


# ==============================================================================
# Rate Limiting Dependency (User-Based)
# ==============================================================================
# Uses Redis INCR/EXPIRE pattern (same as auth middleware in main.py)
# Each authenticated user gets their own rate limit bucket
# ==============================================================================

from fastapi import Request
from typing import Callable

# Valid period suffixes and their TTL in seconds
_PERIOD_SECONDS = {
    "minute": 60,
    "hour": 3600,
}


def rate_limit_user(limit: str = "60/minute") -> Callable:
    """
    User-based rate limiting dependency using Redis.
    
    Args:
        limit: Rate limit string like "60/minute" or "100/hour"
        
    Usage:
        @router.get("/projects")
        async def list_projects(
            user: CurrentUser,
            _rate_check: None = Depends(rate_limit_user("60/minute"))
        ):
            ...
            
    Key: rate_limit:<route>:user:<user_id>
    
    Benefits over IP-based:
        - Each user gets their own quota
        - No shared pool behind load balancer
        - Works correctly in ECS/ALB environments
    """
    # Fail-fast: validate limit format
    try:
        count_str, period = limit.split("/")
        max_requests = int(count_str)
        ttl_seconds = _PERIOD_SECONDS[period]
    except (ValueError, KeyError) as e:
        raise ValueError(
            f"Invalid rate limit format '{limit}'. "
            f"Expected format: '<count>/<period>' where period is 'minute' or 'hour'. "
            f"Example: '60/minute'"
        ) from e
    
    async def _rate_limit_check(
        request: Request,
        current_user: User = Depends(current_active_user),
    ) -> None:
        from app.services.cache_service import cache_service
        
        # Use route template (e.g., /projects/{project_id}) not actual URL path
        # This ensures /projects/abc and /projects/xyz share the same bucket
        route = request.scope.get("route")
        route_template = route.path if route else request.url.path
        cache_key = f"rate_limit:{route_template}:user:{current_user.id}"
        
        if cache_service._redis:
            try:
                current_count = await cache_service._redis.incr(cache_key)
                
                # Set TTL on first request
                if current_count == 1:
                    await cache_service._redis.expire(cache_key, ttl_seconds)
                
                if current_count > max_requests:
                    logger.warning(
                        "User rate limit exceeded",
                        user_id=str(current_user.id),
                        path=route_template,
                        count=current_count,
                        limit=max_requests,
                    )
                    raise HTTPException(
                        status_code=429,
                        detail={
                            "message": "Too many requests. Please try again later.",
                            "code": "RATE_LIMITED",
                        },
                        headers={"Retry-After": str(ttl_seconds)},
                    )
            except HTTPException:
                raise  # Re-raise rate limit error
            except Exception as e:
                # Fail open: don't block if Redis fails
                logger.warning(f"Rate limit check failed, allowing request: {e}")
        else:
            # No Redis: fail open (allow request)
            pass
    
    return _rate_limit_check


# Type aliases for rate-limited dependencies (DRY: reuse in endpoint signatures)
# Reads: 60/min, Writes: 30/min, Expensive: 10/min
RateLimitUser60 = Annotated[None, Depends(rate_limit_user("60/minute"))]
RateLimitUser30 = Annotated[None, Depends(rate_limit_user("30/minute"))]
RateLimitUser10 = Annotated[None, Depends(rate_limit_user("10/minute"))]
