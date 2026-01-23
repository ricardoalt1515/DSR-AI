"""
API dependencies for authentication and authorization.

This module now uses FastAPI Users for authentication.
The custom get_current_user is replaced by FastAPI Users dependencies.

Best Practices:
    - Use FastAPI Users dependencies for authentication
    - Type-safe with Annotated
    - Clean and minimal
"""

from datetime import datetime
from typing import Annotated, Literal, Protocol, TypeVar

import structlog
from fastapi import Depends, Header, HTTPException
from sqlalchemy import select

from app.authz import policies
from app.core.fastapi_users_instance import (
    current_active_user,
    current_active_user_optional,
    current_superuser,
    current_verified_user,
)
from app.models.company import Company
from app.models.location import Location
from app.models.organization import Organization
from app.models.user import User

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

OptionalUser = Annotated[User | None, Depends(current_active_user_optional)]

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

from uuid import UUID

from fastapi import Query

# Pagination
PageNumber = Annotated[
    int, Query(ge=1, le=1000, description="Page number (1-indexed)", examples=[1])
]

PageSize = Annotated[
    int,
    Query(
        ge=1,
        le=100,
        alias="size",  # Frontend expects 'size' parameter
        description="Items per page (max 100 for performance)",
        examples=[10, 20, 50],
    ),
]

# Search & Filters
SearchQuery = Annotated[
    str | None,
    Query(
        max_length=100,
        description="Search term for name or client (ILIKE search)",
        examples=["Water Treatment", "Municipal"],
    ),
]

StatusFilter = Annotated[
    str | None,
    Query(
        description="Filter by project status", examples=["Active", "In Preparation", "Completed"]
    ),
]

SectorFilter = Annotated[
    str | None,
    Query(description="Filter by sector", examples=["Municipal", "Industrial", "Commercial"]),
]

ArchivedFilter = Annotated[
    Literal["active", "archived", "all"],
    Query(
        description="Filter by archived status",
        examples=["active", "archived", "all"],
    ),
]

# ==============================================================================
# Project Access Dependency
# ==============================================================================
# Centralizes project loading + access check (replaces 22+ repeated patterns)
# ==============================================================================

from fastapi import Path, status

from app.models.project import Project

# ==============================================================================
# Organization Context Dependency (Multi-tenant)
# ==============================================================================


async def get_organization_context(
    current_user: User = Depends(current_active_user),
    x_organization_id: UUID | None = Header(None, alias="X-Organization-Id"),
    db: AsyncSession = Depends(get_async_db),
) -> Organization:
    """
    Resolve organization context for the request.

    - Regular users: use their organization_id (ignore header)
    - Super admins: must provide X-Organization-Id header
    """
    if not current_user.is_superuser:
        if not current_user.organization_id:
            raise HTTPException(status_code=403, detail="User not assigned to any organization")
        org = await db.get(Organization, current_user.organization_id)
        if not org or not org.is_active:
            raise HTTPException(status_code=403, detail="User's organization is inactive")
        return org

    if current_user.organization_id is not None:
        raise HTTPException(
            status_code=500,
            detail="Invalid admin state: superuser has organization_id",
        )

    if x_organization_id is None:
        raise HTTPException(
            status_code=400,
            detail="Super admin must select organization via X-Organization-Id header",
        )

    org = await db.get(Organization, x_organization_id)
    if not org or not org.is_active:
        raise HTTPException(status_code=404, detail="Organization not found")

    return org


OrganizationContext = Annotated[Organization, Depends(get_organization_context)]


def apply_organization_filter(query, model, org: Organization):
    """Filter query by organization_id."""
    return query.where(model.organization_id == org.id)


class Archivable(Protocol):
    archived_at: datetime | None


ArchivableT = TypeVar("ArchivableT", bound=Archivable)


def require_not_archived(entity: ArchivableT) -> ArchivableT:
    if entity.archived_at is not None:
        raise HTTPException(status_code=409, detail=f"{type(entity).__name__} is archived")
    return entity


def apply_archived_filter(query, model, archived: Literal["active", "archived", "all"]):
    if archived == "active":
        return query.where(model.archived_at.is_(None))
    if archived == "archived":
        return query.where(model.archived_at.isnot(None))
    return query


async def get_super_admin_only(
    current_user: User = Depends(current_active_user),
) -> User:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Super admin only")
    if current_user.organization_id is not None:
        raise HTTPException(
            status_code=500, detail="Invalid admin state: superuser has organization_id"
        )
    return current_user


SuperAdminOnly = Annotated[User, Depends(get_super_admin_only)]


async def get_current_project_creator(
    current_user: User = Depends(current_active_user),
) -> User:
    if not policies.can_create_project(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to create projects",
        )
    return current_user


CurrentProjectCreator = Annotated[User, Depends(get_current_project_creator)]


async def get_current_project_deleter(
    current_user: User = Depends(current_active_user),
) -> User:
    if not policies.can_delete_project(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to delete projects",
        )
    return current_user


CurrentProjectDeleter = Annotated[User, Depends(get_current_project_deleter)]


async def get_current_company_creator(
    current_user: User = Depends(current_active_user),
) -> User:
    if not policies.can_create_company(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to create companies",
        )
    return current_user


CurrentCompanyCreator = Annotated[User, Depends(get_current_company_creator)]


async def get_current_company_editor(
    company_id: UUID,
    current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> tuple[User, Company]:
    result = await db.execute(
        select(Company).where(Company.id == company_id, Company.organization_id == org.id)
    )
    company = result.scalar_one_or_none()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company {company_id} not found",
        )

    if not policies.can_update_company(current_user, company):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to update company",
        )

    return current_user, company


CurrentCompanyEditor = Annotated[tuple[User, Company], Depends(get_current_company_editor)]


async def get_active_company_editor(
    company_id: UUID,
    current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> tuple[User, Company]:
    current_user, company = await get_current_company_editor(
        company_id=company_id,
        current_user=current_user,
        org=org,
        db=db,
    )
    return current_user, require_not_archived(company)


ActiveCompanyEditor = Annotated[tuple[User, Company], Depends(get_active_company_editor)]


async def get_current_company_deleter(
    current_user: User = Depends(current_active_user),
) -> User:
    if not policies.can_delete_company(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to delete company",
        )
    return current_user


CurrentCompanyDeleter = Annotated[User, Depends(get_current_company_deleter)]


async def get_current_location_creator(
    current_user: User = Depends(current_active_user),
) -> User:
    if not policies.can_create_location(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to create locations",
        )
    return current_user


CurrentLocationCreator = Annotated[User, Depends(get_current_location_creator)]


async def get_current_company_location_creator(
    company_id: UUID,
    current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> tuple[User, Company]:
    result = await db.execute(
        select(Company).where(Company.id == company_id, Company.organization_id == org.id)
    )
    company = result.scalar_one_or_none()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company {company_id} not found",
        )

    if not policies.can_create_location_for_company(current_user, company):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to create location",
        )

    return current_user, company


CurrentCompanyLocationCreator = Annotated[
    tuple[User, Company], Depends(get_current_company_location_creator)
]


async def get_active_company_location_creator(
    company_id: UUID,
    current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> tuple[User, Company]:
    current_user, company = await get_current_company_location_creator(
        company_id=company_id,
        current_user=current_user,
        org=org,
        db=db,
    )
    return current_user, require_not_archived(company)


ActiveCompanyLocationCreator = Annotated[
    tuple[User, Company], Depends(get_active_company_location_creator)
]


async def get_current_location_editor(
    location_id: UUID,
    current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> tuple[User, Location]:
    result = await db.execute(
        select(Location).where(
            Location.id == location_id,
            Location.organization_id == org.id,
        )
    )
    location = result.scalar_one_or_none()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {location_id} not found",
        )

    if not policies.can_update_location(current_user, location):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to update location",
        )

    return current_user, location


CurrentLocationEditor = Annotated[tuple[User, Location], Depends(get_current_location_editor)]


async def get_active_location_editor(
    location_id: UUID,
    current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> tuple[User, Location]:
    current_user, location = await get_current_location_editor(
        location_id=location_id,
        current_user=current_user,
        org=org,
        db=db,
    )
    return current_user, require_not_archived(location)


ActiveLocationEditor = Annotated[tuple[User, Location], Depends(get_active_location_editor)]


async def get_current_location_deleter(
    current_user: User = Depends(current_active_user),
) -> User:
    if not policies.can_delete_location(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to delete location",
        )
    return current_user


CurrentLocationDeleter = Annotated[User, Depends(get_current_location_deleter)]


async def get_current_location_contacts_creator(
    current_user: User = Depends(current_active_user),
) -> User:
    if not policies.can_create_location_contact(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to create location contacts",
        )
    return current_user


CurrentLocationContactsCreator = Annotated[User, Depends(get_current_location_contacts_creator)]


async def get_current_location_contacts_editor(
    current_user: User = Depends(current_active_user),
) -> User:
    if not policies.can_update_location_contact(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to update location contacts",
        )
    return current_user


CurrentLocationContactsEditor = Annotated[User, Depends(get_current_location_contacts_editor)]


async def get_current_location_contacts_deleter(
    current_user: User = Depends(current_active_user),
) -> User:
    if not policies.can_delete_location_contact(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to delete location contacts",
        )
    return current_user


CurrentLocationContactsDeleter = Annotated[User, Depends(get_current_location_contacts_deleter)]


async def get_active_location(
    location_id: UUID,
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> Location:
    result = await db.execute(
        select(Location).where(
            Location.id == location_id,
            Location.organization_id == org.id,
        )
    )
    location = result.scalar_one_or_none()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {location_id} not found",
        )

    return require_not_archived(location)


ActiveLocationDep = Annotated[Location, Depends(get_active_location)]


def require_org_admin(user: User) -> None:
    if not (user.is_superuser or user.is_org_admin()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for admin action",
        )


async def get_company_admin_action(
    company_id: UUID,
    current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> Company:
    require_org_admin(current_user)

    result = await db.execute(
        select(Company).where(Company.id == company_id, Company.organization_id == org.id)
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company {company_id} not found",
        )

    return company


CompanyAdminActionDep = Annotated[Company, Depends(get_company_admin_action)]


async def get_location_admin_action(
    location_id: UUID,
    current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> Location:
    require_org_admin(current_user)

    result = await db.execute(
        select(Location).where(
            Location.id == location_id,
            Location.organization_id == org.id,
        )
    )
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {location_id} not found",
        )

    return location


LocationAdminActionDep = Annotated[Location, Depends(get_location_admin_action)]


async def get_project_archive_action(
    project_id: UUID = Path(..., description="Project unique identifier"),
    current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> Project:
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.organization_id == org.id,
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if not (
        current_user.is_superuser
        or current_user.is_org_admin()
        or project.user_id == current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to archive project",
        )

    return project


ProjectArchiveActionDep = Annotated[Project, Depends(get_project_archive_action)]


async def get_project_purge_action(
    project_id: UUID = Path(..., description="Project unique identifier"),
    current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> Project:
    require_org_admin(current_user)

    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.organization_id == org.id,
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    return project


ProjectPurgeActionDep = Annotated[Project, Depends(get_project_purge_action)]


async def get_accessible_project(
    project_id: UUID = Path(..., description="Project unique identifier"),
    current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
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
    project = await _load_project_with_access(
        project_id=project_id,
        current_user=current_user,
        org=org,
        db=db,
    )

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    return project


async def _load_project_with_access(
    project_id: UUID,
    current_user: User,
    org: Organization,
    db: AsyncSession,
) -> Project | None:
    conditions = [
        Project.id == project_id,
        Project.organization_id == org.id,
    ]
    if not current_user.can_see_all_org_projects():
        conditions.append(Project.user_id == current_user.id)

    result = await db.execute(select(Project).where(*conditions))
    return result.scalar_one_or_none()


# Type alias for project with access check
# Use in routes that need a validated project from path parameter
ProjectDep = Annotated[Project, Depends(get_accessible_project)]


async def get_active_project(
    project_id: UUID = Path(..., description="Project unique identifier"),
    current_user: User = Depends(current_active_user),
    org: Organization = Depends(get_organization_context),
    db: AsyncSession = Depends(get_async_db),
) -> Project:
    project = await _load_project_with_access(
        project_id=project_id,
        current_user=current_user,
        org=org,
        db=db,
    )

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    return require_not_archived(project)


ActiveProjectDep = Annotated[Project, Depends(get_active_project)]

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

from collections.abc import Callable

from fastapi import Request

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
                current_count_value = int(current_count)

                # Set TTL on first request
                if current_count_value == 1:
                    await cache_service._redis.expire(cache_key, ttl_seconds)

                if current_count_value > max_requests:
                    logger.warning(
                        "User rate limit exceeded",
                        user_id=str(current_user.id),
                        path=route_template,
                        count=current_count_value,
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
# Reads: 300/min, Writes: 30/min, Expensive: 10/min
RateLimitUser300 = Annotated[None, Depends(rate_limit_user("300/minute"))]
RateLimitUser60 = Annotated[None, Depends(rate_limit_user("60/minute"))]
RateLimitUser30 = Annotated[None, Depends(rate_limit_user("30/minute"))]
RateLimitUser10 = Annotated[None, Depends(rate_limit_user("10/minute"))]
