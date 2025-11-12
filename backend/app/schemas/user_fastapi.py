"""
FastAPI Users schemas for authentication.

These schemas follow FastAPI Users conventions and best practices:
- BaseUser for read operations
- BaseUserCreate for registration
- BaseUserUpdate for profile updates

Best Practices:
    - Type-safe with Pydantic v2
    - Inherits from FastAPI Users base schemas
    - Includes custom H2O Allegiant fields
    - Clear validation and documentation
"""

import uuid
from typing import Optional
from fastapi_users import schemas
from pydantic import EmailStr, Field, ConfigDict


class UserRead(schemas.BaseUser[uuid.UUID]):
    """
    Schema for reading user data.
    
    Used in:
        - GET /auth/me
        - POST /auth/register (response)
        - GET /users/{id}
    
    Inherits from BaseUser:
        - id (UUID)
        - email (EmailStr)
        - is_active (bool)
        - is_superuser (bool)
        - is_verified (bool)
    """
    
    # Custom H2O Allegiant fields
    first_name: str = Field(..., description="User's first name")
    last_name: str = Field(..., description="User's last name")
    company_name: Optional[str] = Field(None, description="Company or organization name")
    location: Optional[str] = Field(None, description="User location")
    sector: Optional[str] = Field(None, description="Industry sector")
    subsector: Optional[str] = Field(None, description="Industry subsector")
    
    model_config = ConfigDict(from_attributes=True)


class UserCreate(schemas.BaseUserCreate):
    """
    Schema for creating a new user (registration).
    
    Used in:
        - POST /auth/register
    
    Inherits from BaseUserCreate:
        - email (EmailStr)
        - password (str)
        - is_active (bool, optional)
        - is_superuser (bool, optional)
        - is_verified (bool, optional)
    """
    
    # Required custom fields
    first_name: str = Field(
        ..., 
        min_length=1, 
        max_length=100,
        description="User's first name"
    )
    last_name: str = Field(
        ..., 
        min_length=1, 
        max_length=100,
        description="User's last name"
    )
    
    # Optional custom fields
    company_name: Optional[str] = Field(
        None, 
        max_length=255,
        description="Company or organization name"
    )
    location: Optional[str] = Field(
        None, 
        max_length=255,
        description="User location"
    )
    sector: Optional[str] = Field(
        None, 
        max_length=100,
        description="Industry sector (Municipal, Industrial, Commercial, Residential)"
    )
    subsector: Optional[str] = Field(
        None, 
        max_length=100,
        description="Industry subsector"
    )


class UserUpdate(schemas.BaseUserUpdate):
    """
    Schema for updating user profile.
    
    Used in:
        - PATCH /users/me
        - PATCH /users/{id}
    
    Inherits from BaseUserUpdate:
        - password (str, optional)
        - email (EmailStr, optional)
        - is_active (bool, optional)
        - is_superuser (bool, optional)
        - is_verified (bool, optional)
    
    Best Practice: All fields optional for partial updates
    """
    
    first_name: Optional[str] = Field(
        None, 
        min_length=1, 
        max_length=100,
        description="User's first name"
    )
    last_name: Optional[str] = Field(
        None, 
        min_length=1, 
        max_length=100,
        description="User's last name"
    )
    company_name: Optional[str] = Field(
        None, 
        max_length=255,
        description="Company or organization name"
    )
    location: Optional[str] = Field(
        None, 
        max_length=255,
        description="User location"
    )
    sector: Optional[str] = Field(
        None, 
        max_length=100,
        description="Industry sector"
    )
    subsector: Optional[str] = Field(
        None, 
        max_length=100,
        description="Industry subsector"
    )
