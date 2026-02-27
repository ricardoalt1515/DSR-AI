"""Pydantic schemas for CompanyContact."""

from datetime import datetime
from uuid import UUID

from pydantic import Field, field_validator, model_validator

from app.schemas.common import BaseSchema


def _normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed if trimmed else None


def _validate_phone(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    if len(trimmed) < 3 or len(trimmed) > 50:
        raise ValueError("Phone must be 3-50 characters")
    if not any(char.isdigit() for char in trimmed):
        raise ValueError("Phone must include at least one digit")
    return trimmed


class CompanyContactBase(BaseSchema):
    name: str | None = Field(None, max_length=255)
    email: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=50)
    title: str | None = Field(None, max_length=255)
    notes: str | None = Field(None, max_length=1000)
    is_primary: bool = False

    @field_validator("name", "email", "title", "notes", mode="before")
    @classmethod
    def normalize_optional_fields(cls, value: object) -> object:
        if isinstance(value, str) or value is None:
            return _normalize_optional_text(value)
        return value

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, value: object) -> object:
        if isinstance(value, str) or value is None:
            return _validate_phone(value)
        return value


class CompanyContactCreate(CompanyContactBase):
    @model_validator(mode="after")
    def ensure_identity_present(self) -> "CompanyContactCreate":
        has_name = bool(self.name)
        has_email = bool(self.email)
        has_phone = bool(self.phone)
        if not (has_name or has_email or has_phone):
            raise ValueError("At least one of name, email, or phone is required")
        return self


class CompanyContactUpdate(BaseSchema):
    name: str | None = Field(None, max_length=255)
    email: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=50)
    title: str | None = Field(None, max_length=255)
    notes: str | None = Field(None, max_length=1000)
    is_primary: bool | None = None

    @field_validator("name", "email", "title", "notes", mode="before")
    @classmethod
    def normalize_optional_fields(cls, value: object) -> object:
        if isinstance(value, str) or value is None:
            return _normalize_optional_text(value)
        return value

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, value: object) -> object:
        if isinstance(value, str) or value is None:
            return _validate_phone(value)
        return value


class CompanyContactRead(CompanyContactBase):
    id: UUID
    company_id: UUID
    created_at: datetime
    updated_at: datetime
