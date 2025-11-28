"""Admin endpoints for managing users (list, create, update)."""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.api.dependencies import AsyncDB, CurrentSuperUser
from app.core.user_manager import UserManager, get_user_manager
from app.models.user import User
from app.schemas.user_fastapi import UserCreate, UserRead, UserUpdate

router = APIRouter()


@router.get("", response_model=List[UserRead], summary="List all users")
async def list_users(
    current_admin: CurrentSuperUser,
    db: AsyncDB,
):
    """Return all users ordered by most recent."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


class AdminCreateUserRequest(UserCreate):
    """Extend UserCreate to force role selection from UI."""

    is_superuser: bool = False


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: AdminCreateUserRequest,
    current_admin: CurrentSuperUser,
    user_manager: UserManager = Depends(get_user_manager),
):
    """Create a user with the provided credentials (admin only)."""
    return await user_manager.create(payload)


class AdminUpdateUserRequest(UserUpdate):
    """Allow partial updates plus role toggles."""

    is_superuser: Optional[bool] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
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

    update_data = updates.model_dump(exclude_unset=True)

    # Self-protection: admins cannot demote or deactivate themselves
    if user.id == current_admin.id:
        if update_data.get("is_superuser") is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admins cannot remove their own admin role",
            )
        if update_data.get("is_active") is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admins cannot deactivate their own account",
            )

    # Prevent leaving the system without at least one active admin
    removing_admin_role = user.is_superuser and update_data.get("is_superuser") is False
    deactivating_admin = user.is_superuser and update_data.get("is_active") is False

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
