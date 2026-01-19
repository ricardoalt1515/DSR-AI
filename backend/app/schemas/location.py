"""
Pydantic schemas for Location model.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from pydantic import Field

from app.schemas.common import BaseSchema
from app.schemas.location_contact import LocationContactRead

if TYPE_CHECKING:
    from app.schemas.company import CompanySummary


class LocationProjectSummary(BaseSchema):
    """Minimal project summary for location detail views."""

    id: UUID
    name: str
    status: str
    created_at: datetime


class LocationBase(BaseSchema):
    """Base location schema with common fields."""

    name: str = Field(..., min_length=1, max_length=255)
    city: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=1, max_length=100)
    address: str | None = Field(None, max_length=500)
    latitude: float | None = None
    longitude: float | None = None
    notes: str | None = Field(None, max_length=1000)


class LocationCreate(LocationBase):
    """Schema for creating a new location."""

    company_id: UUID


class LocationUpdate(BaseSchema):
    """Schema for updating a location (all fields optional)."""

    name: str | None = Field(None, min_length=1, max_length=255)
    city: str | None = Field(None, min_length=1, max_length=100)
    state: str | None = Field(None, min_length=1, max_length=100)
    address: str | None = Field(None, max_length=500)
    latitude: float | None = None
    longitude: float | None = None
    notes: str | None = Field(None, max_length=1000)


class LocationSummary(LocationBase):
    """Location summary (list view)."""

    # Inherits from_attributes=True from BaseSchema

    id: UUID
    company_id: UUID
    full_address: str
    project_count: int = 0
    created_at: datetime
    updated_at: datetime
    created_by_user_id: UUID | None = None


class LocationDetail(LocationSummary):
    """Location detail with company info and projects."""

    company: CompanySummary | None = None
    projects: list[LocationProjectSummary] = Field(default_factory=list)
    contacts: list[LocationContactRead] = Field(default_factory=list)
