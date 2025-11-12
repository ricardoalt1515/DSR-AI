"""
FastAPI Users User Manager.

The UserManager handles user lifecycle events and business logic:
- Registration
- Password reset
- Email verification
- Custom user operations

Best Practices:
    - Extends FastAPI Users BaseUserManager
    - Uses UUID for type-safe IDs
    - Implements lifecycle hooks for extensibility
    - Follows async/await patterns
    - Proper logging for audit trail
"""

import uuid
import logging
from typing import Optional, AsyncGenerator

from fastapi import Depends, Request
from fastapi_users import BaseUserManager, UUIDIDMixin
from fastapi_users.db import SQLAlchemyUserDatabase

from app.models.user import User
from app.core.config import settings
from app.core.auth_db import get_user_db

logger = logging.getLogger(__name__)


class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    """
    Custom user manager for H2O Allegiant.
    
    Handles user lifecycle events and implements custom business logic.
    
    Best Practices:
        - UUIDIDMixin for type-safe UUID handling
        - Logging for audit trail
        - Hooks for extensibility (email sending, etc.)
        - Clean separation from routes
    """
    
    # Token secrets (use same SECRET_KEY as JWT for consistency)
    reset_password_token_secret = settings.SECRET_KEY
    verification_token_secret = settings.SECRET_KEY

    async def on_after_register(
        self, 
        user: User, 
        request: Optional[Request] = None
    ) -> None:
        """
        Called after a user successfully registers.
        
        Use this hook to:
        - Send welcome email
        - Log registration event
        - Trigger analytics
        - Initialize user resources
        
        Args:
            user: The newly registered user
            request: Optional request object for context
        """
        logger.info(
            f"✅ User registered successfully",
            extra={
                "user_id": str(user.id),
                "email": user.email,
                "full_name": user.full_name
            }
        )
        
        # TODO: Send welcome email
        # await send_welcome_email(user.email, user.first_name)

    async def on_after_forgot_password(
        self, 
        user: User, 
        token: str, 
        request: Optional[Request] = None
    ) -> None:
        """
        Called after a user requests password reset.
        
        Use this hook to:
        - Send password reset email
        - Log reset request
        - Monitor for abuse
        
        Args:
            user: User requesting password reset
            token: Reset token to include in email
            request: Optional request object for context
        """
        logger.info(
            f"🔑 Password reset requested",
            extra={
                "user_id": str(user.id),
                "email": user.email
            }
        )
        
        # TODO: Send password reset email
        # reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        # await send_reset_password_email(user.email, reset_url)

    async def on_after_request_verify(
        self, 
        user: User, 
        token: str, 
        request: Optional[Request] = None
    ) -> None:
        """
        Called after a user requests email verification.
        
        Use this hook to:
        - Send verification email
        - Log verification request
        
        Args:
            user: User requesting verification
            token: Verification token to include in email
            request: Optional request object for context
        """
        logger.info(
            f"📧 Email verification requested",
            extra={
                "user_id": str(user.id),
                "email": user.email
            }
        )
        
        # TODO: Send verification email
        # verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        # await send_verification_email(user.email, verify_url)

    async def on_after_verify(
        self, 
        user: User, 
        request: Optional[Request] = None
    ) -> None:
        """
        Called after a user successfully verifies their email.
        
        Args:
            user: User who verified their email
            request: Optional request object for context
        """
        logger.info(
            f"✅ Email verified successfully",
            extra={
                "user_id": str(user.id),
                "email": user.email
            }
        )

    async def on_after_update(
        self,
        user: User,
        update_dict: dict,
        request: Optional[Request] = None
    ) -> None:
        """
        Called after a user successfully updates their profile.
        
        Args:
            user: User who updated their profile
            update_dict: Dictionary of updated fields
            request: Optional request object for context
        """
        logger.info(
            f"✏️ User profile updated",
            extra={
                "user_id": str(user.id),
                "email": user.email,
                "updated_fields": list(update_dict.keys())
            }
        )


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
