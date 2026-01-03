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
from app.schemas.organization import OrganizationCreate, OrganizationRead, OrganizationUpdate
from app.schemas.org_user import OrgUserCreateRequest, OrgUserCreate, OrgUserUpdate
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


@router.patch("/{org_id}", response_model=OrganizationRead)
async def update_organization(
    org_id: UUID,
    data: OrganizationUpdate,
    admin: SuperAdminOnly,
    db: AsyncDB,
):
    """Update an organization. Platform Admin only."""
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(org, field, value)

    await db.commit()
    await db.refresh(org)
    return org


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(
    org_id: UUID,
    admin: SuperAdminOnly,
    db: AsyncDB,
):
    """Soft-delete an organization. Platform Admin only. Fails if org has active users."""
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Check for active users
    query = select(User).where(User.organization_id == org_id, User.is_active == True)
    result = await db.execute(query)
    active_users = result.scalars().all()

    if active_users:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete organization with {len(active_users)} active user(s). Deactivate users first.",
        )

    org.is_active = False
    await db.commit()
    return None


@router.patch("/{org_id}/users/{user_id}", response_model=UserRead)
async def update_org_user(
    org_id: UUID,
    user_id: UUID,
    data: OrgUserUpdate,
    admin: SuperAdminOnly,
    db: AsyncDB,
):
    """Update user role or status in a specific organization. Platform Admin only."""
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    user = await db.get(User, user_id)
    if not user or user.organization_id != org_id:
        raise HTTPException(status_code=404, detail="User not found in this organization")

    # Block changing to platform admin role
    if data.role == UserRole.ADMIN.value:
        raise HTTPException(
            status_code=400,
            detail="Cannot promote to platform admin from this endpoint.",
        )

    update_data = data.model_dump(exclude_unset=True)
    is_demoting_org_admin = (
        user.role == UserRole.ORG_ADMIN
        and update_data.get("role")
        and update_data["role"] != UserRole.ORG_ADMIN
    )
    is_deactivating_org_admin = (
        user.role == UserRole.ORG_ADMIN and update_data.get("is_active") is False
    )

    if is_demoting_org_admin or is_deactivating_org_admin:
        query = select(User.id).where(
            User.organization_id == org_id,
            User.is_active == True,
            User.role == UserRole.ORG_ADMIN,
            User.id != user.id,
        )
        result = await db.execute(query)
        if result.first() is None:
            raise HTTPException(
                status_code=400,
                detail="Cannot remove the last active org admin.",
            )

    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/current/users/{user_id}", response_model=UserRead)
async def update_my_org_user(
    user_id: UUID,
    data: OrgUserUpdate,
    org: OrganizationContext,
    current_user: CurrentUser,
    db: AsyncDB,
):
    """Update user role or status in my organization. Org Admin or Platform Admin only."""
    if not current_user.can_manage_org_users():
        raise HTTPException(status_code=403, detail="Not authorized to manage users")

    user = await db.get(User, user_id)
    if not user or user.organization_id != org.id:
        raise HTTPException(status_code=404, detail="User not found in this organization")

    # Prevent self-demotion for org admins
    if user.id == current_user.id and data.role and data.role != current_user.role:
        raise HTTPException(
            status_code=400,
            detail="Cannot change your own role.",
        )

    if user.id == current_user.id and data.is_active is False:
        raise HTTPException(
            status_code=400,
            detail="Cannot deactivate your own account.",
        )

    # Block changing to platform admin role
    if data.role == UserRole.ADMIN.value:
        raise HTTPException(
            status_code=400,
            detail="Cannot promote to platform admin from this endpoint.",
        )

    update_data = data.model_dump(exclude_unset=True)
    is_demoting_org_admin = (
        user.role == UserRole.ORG_ADMIN
        and update_data.get("role")
        and update_data["role"] != UserRole.ORG_ADMIN
    )
    is_deactivating_org_admin = (
        user.role == UserRole.ORG_ADMIN and update_data.get("is_active") is False
    )

    if is_demoting_org_admin or is_deactivating_org_admin:
        query = select(User.id).where(
            User.organization_id == org.id,
            User.is_active == True,
            User.role == UserRole.ORG_ADMIN,
            User.id != user.id,
        )
        result = await db.execute(query)
        if result.first() is None:
            raise HTTPException(
                status_code=400,
                detail="Cannot remove the last active org admin.",
            )

    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    return user
