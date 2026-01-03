"""
Pydantic schemas for Organization model.
"""

from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import Field

from app.schemas.common import BaseSchema


class OrganizationCreate(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=100)
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    settings: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True


class OrganizationRead(BaseSchema):
    id: UUID
    name: str
    slug: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    settings: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True


class OrganizationUpdate(BaseSchema):
    """Schema for updating an organization. All fields optional."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: Optional[bool] = None
