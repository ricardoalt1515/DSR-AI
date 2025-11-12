"""
Pydantic schemas for Company model.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.common import BaseSchema

if TYPE_CHECKING:
    from app.schemas.location import LocationSummary


class CompanyBase(BaseSchema):
    """Base company schema with common fields."""
    name: str = Field(..., min_length=1, max_length=255)
    industry: str = Field(..., min_length=1, max_length=100)
    sector: str = Field(
        ..., 
        min_length=1, 
        max_length=50,
        description="Sector: commercial, industrial, residential, municipal, other"
    )
    subsector: str = Field(
        ..., 
        min_length=1, 
        max_length=100,
        description="Specific subsector within sector (e.g., food_processing, hotel)"
    )
    contact_name: Optional[str] = Field(None, max_length=255)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None
    tags: list[str] = Field(default_factory=list)


class CompanyCreate(CompanyBase):
    """Schema for creating a new company."""
    pass


class CompanyUpdate(BaseSchema):
    """Schema for updating a company (all fields optional)."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    industry: Optional[str] = Field(None, min_length=1, max_length=100)
    sector: Optional[str] = Field(None, min_length=1, max_length=50)
    subsector: Optional[str] = Field(None, min_length=1, max_length=100)
    contact_name: Optional[str] = Field(None, max_length=255)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None
    tags: Optional[list[str]] = None


class CompanySummary(CompanyBase):
    """Company summary (list view)."""
    # Inherits from_attributes=True from BaseSchema
    
    id: UUID
    location_count: int = 0
    created_at: datetime
    updated_at: datetime


class CompanyDetail(CompanySummary):
    """Company detail with locations."""
    locations: list["LocationSummary"] = Field(default_factory=list)
