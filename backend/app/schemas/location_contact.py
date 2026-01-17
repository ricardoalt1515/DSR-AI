"""
Pydantic schemas for LocationContact.
"""

from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.common import BaseSchema


class LocationContactBase(BaseSchema):
    """Base schema for location contacts."""

    name: str = Field(..., min_length=1, max_length=255)
    email: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=50)
    title: str | None = Field(None, max_length=255)
    notes: str | None = Field(None, max_length=1000)


class LocationContactCreate(LocationContactBase):
    """Schema for creating a location contact."""

    pass


class LocationContactUpdate(BaseSchema):
    """Schema for updating a location contact."""

    name: str | None = Field(None, min_length=1, max_length=255)
    email: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=50)
    title: str | None = Field(None, max_length=255)
    notes: str | None = Field(None, max_length=1000)


class LocationContactRead(LocationContactBase):
    """Schema for reading a location contact."""

    id: UUID
    location_id: UUID
    created_at: datetime
    updated_at: datetime
