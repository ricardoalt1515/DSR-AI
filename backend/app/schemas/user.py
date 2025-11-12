"""
User schemas for authentication and profile management.
"""

from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime

from app.schemas.common import BaseSchema


class UserCreate(BaseModel):
    """Schema for user registration."""
    
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="Password (min 8 characters)")
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    company_name: Optional[str] = Field(None, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
    sector: Optional[str] = Field(None, max_length=100)
    subsector: Optional[str] = Field(None, max_length=100)
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "engineer@company.com",
                "password": "SecurePass123",
                "first_name": "John",
                "last_name": "Doe",
                "company_name": "ACME Water Solutions",
                "location": "Los Angeles, CA",
                "sector": "Industrial",
                "subsector": "Food & Beverage",
            }
        }


class UserLogin(BaseModel):
    """Schema for user login."""
    
    email: EmailStr
    password: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "engineer@company.com",
                "password": "SecurePass123",
            }
        }


class UserResponse(BaseSchema):
    """
    Schema for user data in responses.

    Note: Inherits from BaseSchema for automatic camelCase serialization.
    Fields like first_name, created_at will serialize as firstName, createdAt.
    """

    id: UUID
    email: EmailStr
    first_name: str
    last_name: str
    company_name: Optional[str] = None
    location: Optional[str] = None
    sector: Optional[str] = None
    subsector: Optional[str] = None
    is_active: bool
    is_admin: bool
    created_at: datetime


class TokenResponse(BaseSchema):
    """
    Schema for JWT token response.

    Note: Inherits from BaseSchema for automatic camelCase serialization.
    Fields like access_token, refresh_token, expires_in will serialize as
    accessToken, refreshToken, expiresIn.
    """

    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Access token expiration time in seconds")
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    """Schema for refresh token request."""

    refresh_token: str = Field(..., description="JWT refresh token")


class UserUpdate(BaseModel):
    """Schema for updating user profile."""

    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    company_name: Optional[str] = Field(None, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
