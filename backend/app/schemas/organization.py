"""
Pydantic schemas for Organization model.
"""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas.common import BaseSchema


class OrganizationCreate(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=100)
    contact_email: str | None = None
    contact_phone: str | None = None
    settings: dict[str, Any] = Field(default_factory=dict)


class OrganizationRead(BaseSchema):
    id: UUID
    name: str
    slug: str
    contact_email: str | None = None
    contact_phone: str | None = None
    settings: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True
    archived_at: datetime | None = None
    archived_by_user_id: UUID | None = None


class OrganizationArchiveRequest(BaseSchema):
    force_deactivate_users: bool = False


class OrganizationArchiveRead(OrganizationRead):
    deactivated_users_count: int = 0


class OrganizationUpdate(BaseSchema):
    """Schema for updating an organization. All fields optional."""

    name: str | None = Field(None, min_length=1, max_length=255)
    contact_email: str | None = None
    contact_phone: str | None = None


class OrganizationPurgeForceRequest(BaseSchema):
    confirm_name: str = Field(..., min_length=1, max_length=255)
    confirm_phrase: str = Field(..., min_length=7, max_length=200)
    reason: str = Field(..., min_length=20, max_length=500)
    ticket_id: str = Field(..., min_length=3, max_length=100)

    @field_validator("confirm_phrase")
    @classmethod
    def validate_confirm_phrase_format(cls, value: str) -> str:
        if not value.startswith("PURGE "):
            raise ValueError("confirm_phrase must start with 'PURGE '")
        slug = value.removeprefix("PURGE ")
        if not slug:
            raise ValueError("confirm_phrase must include an organization slug")
        return value
