"""
Pydantic schemas for IncomingMaterial.
"""

from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.models.incoming_material import IncomingMaterialCategory
from app.schemas.common import BaseSchema


class IncomingMaterialBase(BaseSchema):
    """Base schema for incoming materials."""

    name: str = Field(..., min_length=1, max_length=255)
    category: IncomingMaterialCategory
    volume_frequency: str = Field(..., min_length=1, max_length=255)
    quality_spec: str | None = Field(None, max_length=500)
    current_supplier: str | None = Field(None, max_length=255)
    notes: str | None = Field(None, max_length=1000)


class IncomingMaterialCreate(IncomingMaterialBase):
    """Schema for creating an incoming material."""

    pass


class IncomingMaterialUpdate(BaseSchema):
    """Schema for updating an incoming material."""

    name: str | None = Field(None, min_length=1, max_length=255)
    category: IncomingMaterialCategory | None = None
    volume_frequency: str | None = Field(None, min_length=1, max_length=255)
    quality_spec: str | None = Field(None, max_length=500)
    current_supplier: str | None = Field(None, max_length=255)
    notes: str | None = Field(None, max_length=1000)


class IncomingMaterialRead(IncomingMaterialBase):
    """Schema for reading an incoming material."""

    id: UUID
    location_id: UUID
    created_at: datetime
    updated_at: datetime
