"""
Email service for authentication flows.

Supports any SMTP provider (Gmail, AWS SES, SendGrid, etc.)
via standard SMTP protocol. Change provider by updating env vars only.

Usage:
    from app.services.email_service import email_service
    await email_service.send_password_reset(email, reset_url)
"""

import structlog
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.core.config import settings

logger = structlog.get_logger(__name__)


# =============================================================================
# Configuration
# =============================================================================

# Email templates - minimal HTML for maximum compatibility
PASSWORD_RESET_TEMPLATE = """
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1e40af;">Password Reset Request</h2>
    <p>Hi,</p>
    <p>You requested to reset your password. Click the button below to proceed:</p>
    <p style="text-align: center; margin: 30px 0;">
        <a href="{reset_url}" 
           style="background-color: #1e40af; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
        </a>
    </p>
    <p style="color: #666; font-size: 14px;">
        If you didn't request this, you can safely ignore this email.
    </p>
    <p style="color: #666; font-size: 14px;">
        This link expires in 1 hour.
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #999; font-size: 12px;">© {app_name}</p>
</body>
</html>
"""

WELCOME_TEMPLATE = """
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1e40af;">Welcome to {app_name}!</h2>
    <p>Hi {first_name},</p>
    <p>Your account has been created successfully. You can now log in and start using the platform.</p>
    <p style="text-align: center; margin: 30px 0;">
        <a href="{login_url}" 
           style="background-color: #1e40af; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; display: inline-block;">
            Go to Dashboard
        </a>
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #999; font-size: 12px;">© {app_name}</p>
</body>
</html>
"""

VERIFICATION_TEMPLATE = """
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1e40af;">Verify Your Email</h2>
    <p>Hi,</p>
    <p>Please verify your email address by clicking the button below:</p>
    <p style="text-align: center; margin: 30px 0;">
        <a href="{verify_url}" 
           style="background-color: #1e40af; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email
        </a>
    </p>
    <p style="color: #666; font-size: 14px;">
        If you didn't create an account, you can safely ignore this email.
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #999; font-size: 12px;">© {app_name}</p>
</body>
</html>
"""


# =============================================================================
# Email Service
# =============================================================================


class EmailService:
    """
    Async email service using SMTP.

    Works with any SMTP provider:
    - Gmail: smtp.gmail.com:587
    - AWS SES: email-smtp.{region}.amazonaws.com:587
    - SendGrid: smtp.sendgrid.net:587
    """

    def __init__(self) -> None:
        self._host = settings.SMTP_HOST
        self._port = settings.SMTP_PORT
        self._user = settings.SMTP_USER
        self._password = settings.SMTP_PASSWORD
        self._from_email = settings.SMTP_FROM or settings.SMTP_USER
        self._app_name = settings.APP_NAME

    @property
    def is_configured(self) -> bool:
        """Check if SMTP is properly configured."""
        return all([self._host, self._port, self._user, self._password])

    async def send_email(
        self, to_email: str, subject: str, html_content: str, text_content: str | None = None
    ) -> bool:
        """
        Send an email via SMTP.

        Returns True if sent successfully, False otherwise.
        Logs errors but doesn't raise - email failures shouldn't break auth flow.
        """
        if not self.is_configured:
            logger.warning("📧 Email not configured - skipping send to %s", to_email)
            return False

        try:
            # Build message
            message = MIMEMultipart("alternative")
            message["From"] = self._from_email
            message["To"] = to_email
            message["Subject"] = subject

            # Add text fallback if provided
            if text_content:
                message.attach(MIMEText(text_content, "plain"))

            # Add HTML content
            message.attach(MIMEText(html_content, "html"))

            # Send via SMTP with TLS
            await aiosmtplib.send(
                message,
                hostname=self._host,
                port=self._port,
                username=self._user,
                password=self._password,
                start_tls=True,
            )

            logger.info("📧 Email sent successfully to %s", to_email)
            return True

        except Exception as e:
            logger.error("📧 Failed to send email to %s: %s", to_email, str(e))
            return False

    async def send_password_reset(self, to_email: str, reset_url: str) -> bool:
        """Send password reset email."""
        html = PASSWORD_RESET_TEMPLATE.format(reset_url=reset_url, app_name=self._app_name)
        return await self.send_email(
            to_email=to_email,
            subject=f"Reset your {self._app_name} password",
            html_content=html,
            text_content=f"Reset your password: {reset_url}",
        )

    async def send_welcome(
        self, to_email: str, first_name: str, login_url: str | None = None
    ) -> bool:
        """Send welcome email after registration."""
        url = login_url or f"{settings.BACKEND_URL.replace('/api', '')}/login"
        html = WELCOME_TEMPLATE.format(
            first_name=first_name or "there", app_name=self._app_name, login_url=url
        )
        return await self.send_email(
            to_email=to_email, subject=f"Welcome to {self._app_name}!", html_content=html
        )

    async def send_verification(self, to_email: str, verify_url: str) -> bool:
        """Send email verification link."""
        html = VERIFICATION_TEMPLATE.format(verify_url=verify_url, app_name=self._app_name)
        return await self.send_email(
            to_email=to_email,
            subject=f"Verify your {self._app_name} email",
            html_content=html,
            text_content=f"Verify your email: {verify_url}",
        )


email_service = EmailService()
