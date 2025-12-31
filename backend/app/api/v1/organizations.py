"""
Organization (tenant) endpoints.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.api.dependencies import AsyncDB, CurrentUser, OrganizationContext, SuperAdminOnly
from app.core.user_manager import UserManager, get_user_manager
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.schemas.organization import OrganizationCreate, OrganizationRead
from app.schemas.org_user import OrgUserCreateRequest, OrgUserCreate
from app.schemas.user_fastapi import UserRead

router = APIRouter()


@router.get("", response_model=List[OrganizationRead])
async def list_organizations(
    admin: SuperAdminOnly,
    db: AsyncDB,
):
    result = await db.execute(select(Organization).order_by(Organization.name))
    return result.scalars().all()


@router.post("", response_model=OrganizationRead, status_code=status.HTTP_201_CREATED)
async def create_organization(
    data: OrganizationCreate,
    admin: SuperAdminOnly,
    db: AsyncDB,
):
    org = Organization(**data.model_dump())
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return org


@router.get("/current", response_model=OrganizationRead)
async def get_current_organization(
    org: OrganizationContext,
):
    return org


@router.get("/current/users", response_model=List[UserRead])
async def list_my_org_users(
    org: OrganizationContext,
    current_user: CurrentUser,
    db: AsyncDB,
):
    """List users in my organization. Org Admin or Platform Admin only."""
    if not current_user.can_manage_org_users():
        raise HTTPException(status_code=403, detail="Not authorized to manage users")

    query = select(User).where(User.organization_id == org.id).order_by(User.email)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/current/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user_in_my_org(
    data: OrgUserCreateRequest,
    org: OrganizationContext,
    current_user: CurrentUser,
    db: AsyncDB,
    user_manager: UserManager = Depends(get_user_manager),
):
    """Create user in my organization. Org Admin or Platform Admin only."""
    if not current_user.can_manage_org_users():
        raise HTTPException(status_code=403, detail="Not authorized to manage users")

    # Block creating platform admins from this endpoint
    if data.role == UserRole.ADMIN.value:
        raise HTTPException(
            status_code=400,
            detail="Cannot create platform admin from this endpoint. Use /admin/users instead.",
        )

    user_create = OrgUserCreate(
        **data.model_dump(),
        organization_id=org.id,
        is_superuser=False,
    )
    return await user_manager.create(user_create)


@router.get("/{org_id}", response_model=OrganizationRead)
async def get_organization(
    org_id: UUID,
    admin: SuperAdminOnly,
    db: AsyncDB,
):
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.get("/{org_id}/users", response_model=List[UserRead])
async def list_org_users(
    org_id: UUID,
    admin: SuperAdminOnly,
    db: AsyncDB,
):
    """List users of a specific organization. Platform Admin only."""
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    query = select(User).where(User.organization_id == org_id).order_by(User.email)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/{org_id}/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_org_user(
    org_id: UUID,
    data: OrgUserCreateRequest,
    admin: SuperAdminOnly,
    db: AsyncDB,
    user_manager: UserManager = Depends(get_user_manager),
):
    """Create user in a specific organization. Platform Admin only."""
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Block creating platform admins from this endpoint
    if data.role == UserRole.ADMIN.value:
        raise HTTPException(
            status_code=400,
            detail="Cannot create platform admin from this endpoint. Use /admin/users instead.",
        )

    user_create = OrgUserCreate(
        **data.model_dump(),
        organization_id=org.id,
        is_superuser=False,
    )
    user = await user_manager.create(user_create)
    return user
