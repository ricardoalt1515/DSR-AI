"""Structured AI output contract for bulk import extraction."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class BulkImportAILocationOutput(BaseModel):
    """Single location extracted by AI."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=255)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    address: str | None = Field(default=None, max_length=500)
    confidence: int = Field(ge=0, le=100)
    evidence: list[str] = Field(min_length=1, max_length=10)


class BulkImportAIWasteStreamOutput(BaseModel):
    """Single waste stream extracted by AI."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=100)
    location_ref: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=4000)
    metadata: dict[str, Any] | None = None
    confidence: int = Field(ge=0, le=100)
    evidence: list[str] = Field(min_length=1, max_length=10)


class BulkImportAIOutput(BaseModel):
    """Top-level AI output for bulk import extraction."""

    model_config = ConfigDict(extra="forbid")

    locations: list[BulkImportAILocationOutput] = Field(default_factory=list)
    waste_streams: list[BulkImportAIWasteStreamOutput] = Field(default_factory=list)
