"""
FastAPI Users User Manager.

Handles user lifecycle events: registration, password reset, email verification.
Integrates with EmailService for transactional emails.
"""

import uuid
import structlog
from typing import Any, AsyncGenerator, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi_users import BaseUserManager, UUIDIDMixin
from fastapi_users.db import SQLAlchemyUserDatabase

from app.models.user import User, UserRole
from app.core.config import settings
from app.core.auth_db import get_user_db
from app.services.email_service import email_service

logger = structlog.get_logger(__name__)


class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    """
    Custom user manager with email notifications and security validations.
    
    Features:
    - Password strength validation (8+ chars, 1 uppercase, 1 number)
    - Role/superuser sync (admin role ↔ is_superuser always in sync)
    - Lifecycle hooks for transactional emails via EmailService
    """
    
    reset_password_token_secret = settings.SECRET_KEY
    verification_token_secret = settings.SECRET_KEY

    def _normalize_role_superuser(
        self,
        data: Any,
        *,
        existing_user: User | None = None,
    ) -> None:
        role = getattr(data, "role", None)
        is_superuser = getattr(data, "is_superuser", None)

        if role is not None:
            setattr(data, "is_superuser", role == UserRole.ADMIN.value)
        
        if is_superuser is True:
            setattr(data, "role", UserRole.ADMIN.value)
        
        if (
            is_superuser is False
            and existing_user is not None
            and existing_user.role == UserRole.ADMIN.value
            and role is None
        ):
            setattr(data, "role", UserRole.FIELD_AGENT.value)

    def _validate_org_assignment(
        self,
        data: Any,
        *,
        existing_user: User | None = None,
    ) -> None:
        org_id = getattr(data, "organization_id", None)
        is_superuser = getattr(data, "is_superuser", None)
        role = getattr(data, "role", None)

        if existing_user is not None:
            if org_id is None:
                org_id = existing_user.organization_id
            if is_superuser is None:
                is_superuser = existing_user.is_superuser
            if role is None:
                role = existing_user.role

        if is_superuser is True:
            if org_id is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Superuser cannot belong to an organization",
                )
            return

        if org_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must belong to an organization",
            )

    async def create(self, user_create: Any, *args: Any, **kwargs: Any) -> User:
        self._normalize_role_superuser(user_create)
        self._validate_org_assignment(user_create)
        return await super().create(user_create, *args, **kwargs)

    async def update(self, user_update: Any, user: User, *args: Any, **kwargs: Any) -> User:
        self._normalize_role_superuser(user_update, existing_user=user)
        self._validate_org_assignment(user_update, existing_user=user)
        return await super().update(user_update, user, *args, **kwargs)

    async def validate_password(
        self,
        password: str,
        user: Optional[User] = None,
    ) -> None:
        """
        Validate password strength.
        
        This is called by FastAPI Users on:
        - User registration
        - Password reset
        - Password update via admin
        
        Raises:
            InvalidPasswordException: If password doesn't meet requirements
        """
        from fastapi_users.exceptions import InvalidPasswordException
        
        if len(password) < 8:
            raise InvalidPasswordException(
                reason="Password must be at least 8 characters long"
            )
        
        if not any(c.isupper() for c in password):
            raise InvalidPasswordException(
                reason="Password must contain at least 1 uppercase letter"
            )
        
        if not any(c.isdigit() for c in password):
            raise InvalidPasswordException(
                reason="Password must contain at least 1 number"
            )
        
        # Optional: Check password doesn't contain email
        if user and user.email:
            email_prefix = user.email.split("@")[0].lower()
            if len(email_prefix) >= 4 and email_prefix in password.lower():
                raise InvalidPasswordException(
                    reason="Password cannot contain your email address"
                )

    async def on_after_register(
        self, 
        user: User, 
        request: Optional[Request] = None
    ) -> None:
        """Send welcome email after registration."""
        logger.info("User registered: %s", user.email)
        
        # Send welcome email (non-blocking)
        login_url = f"{settings.FRONTEND_URL}/login"
        await email_service.send_welcome(
            to_email=user.email,
            first_name=user.first_name or "there",
            login_url=login_url
        )

    async def on_after_forgot_password(
        self, 
        user: User, 
        token: str, 
        request: Optional[Request] = None
    ) -> None:
        """Send password reset email with token."""
        logger.info("Password reset requested: %s", user.email)
        
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        await email_service.send_password_reset(
            to_email=user.email,
            reset_url=reset_url
        )

    async def on_after_request_verify(
        self, 
        user: User, 
        token: str, 
        request: Optional[Request] = None
    ) -> None:
        """Send email verification link."""
        logger.info("Email verification requested: %s", user.email)
        
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        await email_service.send_verification(
            to_email=user.email,
            verify_url=verify_url
        )

    async def on_after_verify(
        self, 
        user: User, 
        request: Optional[Request] = None
    ) -> None:
        """Log successful email verification."""
        logger.info("Email verified: %s", user.email)

    async def on_after_update(
        self,
        user: User,
        update_dict: dict,
        request: Optional[Request] = None
    ) -> None:
        """Log profile updates."""
        logger.info("Profile updated: %s, fields: %s", user.email, list(update_dict.keys()))


async def get_user_manager(
    user_db: SQLAlchemyUserDatabase = Depends(get_user_db)
) -> AsyncGenerator[UserManager, None]:
    """
    Dependency to get user manager instance.
    
    This is the main entry point for FastAPI Users to access user operations.
    
    Args:
        user_db: Database adapter from get_user_db dependency
        
    Yields:
        UserManager: Configured user manager instance
        
    Usage:
        Used internally by FastAPI Users routers
    """
    yield UserManager(user_db)
