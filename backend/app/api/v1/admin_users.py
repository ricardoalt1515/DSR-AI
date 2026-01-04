"""Admin endpoints for managing users (list, create, update)."""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select

from app.api.dependencies import AsyncDB, CurrentSuperUser
from app.core.user_manager import UserManager, get_user_manager
from app.models.user import User
from app.schemas.user_fastapi import UserCreate, UserRead, UserUpdate

router = APIRouter()

# Import rate limiter
from app.main import limiter


@router.get("", response_model=List[UserRead], summary="List platform admins")
@limiter.limit("60/minute")
async def list_platform_admins(
    request: Request,
    current_admin: CurrentSuperUser,
    db: AsyncDB,
):
    """Return platform admins (superusers without organization) ordered by most recent."""
    result = await db.execute(
        select(User)
        .where(User.is_superuser.is_(True))
        .where(User.organization_id.is_(None))
        .order_by(User.created_at.desc())
    )
    return result.scalars().all()


class AdminCreateUserRequest(UserCreate):
    """Extend UserCreate for admin user creation."""
    is_superuser: bool = True
    role: str = "admin"  # Platform admin role


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_user(
    request: Request,
    payload: AdminCreateUserRequest,
    current_admin: CurrentSuperUser,
    user_manager: UserManager = Depends(get_user_manager),
):
    """Create a user with the provided credentials (admin only)."""
    if payload.is_superuser is not True or payload.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Platform admins must be created with role=admin and is_superuser=true",
        )
    return await user_manager.create(payload)


class AdminUpdateUserRequest(UserUpdate):
    """Allow partial updates including role changes."""
    is_superuser: Optional[bool] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    role: Optional[str] = None


@router.patch("/{user_id}", response_model=UserRead)
@limiter.limit("20/minute")
async def update_user(
    request: Request,
    user_id: UUID,
    updates: AdminUpdateUserRequest,
    current_admin: CurrentSuperUser,
    db: AsyncDB,
    user_manager: UserManager = Depends(get_user_manager),
):
    """Update user fields (role, status, password)."""
    user = await user_manager.get(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use organization provisioning endpoint for tenant users",
        )

    update_data = updates.model_dump(exclude_unset=True)
    requested_role = update_data.get("role")
    requested_is_superuser = update_data.get("is_superuser")
    will_be_active = update_data.get("is_active", user.is_active)

    if requested_is_superuser is False or (requested_role is not None and requested_role != "admin"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Platform admins cannot be demoted via admin endpoint",
        )

    will_be_superuser = user.is_superuser
    if requested_role is not None:
        will_be_superuser = requested_role == "admin"
    elif requested_is_superuser is not None:
        will_be_superuser = requested_is_superuser is True
    if requested_is_superuser is False:
        will_be_superuser = False

    # Self-protection: admins cannot demote or deactivate themselves
    if user.id == current_admin.id:
        if requested_is_superuser is False or (requested_role is not None and requested_role != "admin"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admins cannot remove their own admin role",
            )
        if will_be_active is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admins cannot deactivate their own account",
            )

    # Prevent leaving the system without at least one active admin
    removing_admin_role = user.is_superuser and will_be_superuser is False
    deactivating_admin = user.is_superuser and user.is_active and will_be_active is False

    if removing_admin_role or deactivating_admin:
        result = await db.execute(
            select(User.id)
            .where(User.is_superuser.is_(True))
            .where(User.id != user.id)
            .where(User.is_active.is_(True))
            .limit(1)
        )
        other_admin_exists = result.first() is not None
        if not other_admin_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one other active admin is required",
            )

    # FastAPI Users expects a UserUpdate Pydantic model as first argument
    # and the existing User instance as second argument
    return await user_manager.update(updates, user)
