"""
FastAPI Users User Manager.

Handles user lifecycle events: registration, password reset, email verification.
Integrates with EmailService for transactional emails.
"""

import uuid
import structlog
from typing import Optional, AsyncGenerator

from fastapi import Depends, Request
from fastapi_users import BaseUserManager, UUIDIDMixin
from fastapi_users.db import SQLAlchemyUserDatabase

from app.models.user import User
from app.core.config import settings
from app.core.auth_db import get_user_db
from app.services.email_service import email_service

logger = structlog.get_logger(__name__)


class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    """
    Custom user manager with email notifications.
    
    Lifecycle hooks send transactional emails via EmailService.
    Email failures are logged but don't break auth flow.
    """
    
    reset_password_token_secret = settings.SECRET_KEY
    verification_token_secret = settings.SECRET_KEY

    async def on_after_register(
        self, 
        user: User, 
        request: Optional[Request] = None
    ) -> None:
        """Send welcome email after registration."""
        logger.info("✅ User registered: %s", user.email)
        
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
        logger.info("🔑 Password reset requested: %s", user.email)
        
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
        logger.info("📧 Verification requested: %s", user.email)
        
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
        logger.info("✅ Email verified: %s", user.email)

    async def on_after_update(
        self,
        user: User,
        update_dict: dict,
        request: Optional[Request] = None
    ) -> None:
        """Log profile updates."""
        logger.info("✏️ Profile updated: %s, fields: %s", user.email, list(update_dict.keys()))


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
