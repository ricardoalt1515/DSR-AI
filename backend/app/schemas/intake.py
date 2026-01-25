"""Schemas for intake panel APIs."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import ConfigDict, Field, field_validator, model_validator

from app.schemas.common import BaseSchema


class IntakeEvidence(BaseSchema):
    model_config = ConfigDict(extra="forbid")

    file_id: UUID
    filename: str
    page: int | None = Field(default=None, ge=1)
    excerpt: str | None = Field(default=None, max_length=500)


class IntakeSuggestionItem(BaseSchema):
    id: UUID
    field_id: str
    field_label: str
    section_id: str
    section_title: str
    value: str | float
    unit: str | None
    confidence: int
    status: Literal["pending", "applied", "rejected"]
    source_file_id: UUID | None = None
    evidence: IntakeEvidence | None = None

    @field_validator("confidence")
    @classmethod
    def validate_confidence(cls, value: int) -> int:
        if value < 0 or value > 100:
            raise ValueError("confidence must be between 0 and 100")
        return value


class IntakeUnmappedNoteItem(BaseSchema):
    id: UUID
    extracted_text: str
    confidence: int
    source_file: str | None
    source_file_id: UUID | None


class IntakeHydrateResponse(BaseSchema):
    intake_notes: str | None
    notes_updated_at: datetime | None
    suggestions: list[IntakeSuggestionItem]
    unmapped_notes: list[IntakeUnmappedNoteItem]
    unmapped_notes_count: int
    processing_documents_count: int


class IntakeNotesUpdateRequest(BaseSchema):
    text: str


class IntakeNotesUpdateResponse(BaseSchema):
    text: str
    updated_at: datetime


class IntakeSuggestionStatusRequest(BaseSchema):
    status: Literal["applied", "rejected"]


class IntakeSuggestionStatusResponse(BaseSchema):
    id: UUID
    status: Literal["applied", "rejected"]
    updated_at: datetime


class IntakeMapUnmappedRequest(BaseSchema):
    field_id: str
    section_id: str
    field_label: str
    section_title: str


class IntakeMapUnmappedResponse(BaseSchema):
    unmapped_note_id: UUID
    suggestion: IntakeSuggestionItem
    mapped_to_suggestion_id: UUID


class IntakeDismissUnmappedResponse(BaseSchema):
    id: UUID
    status: Literal["dismissed"]


class IntakeDismissUnmappedScope(BaseSchema):
    scope: Literal["all", "low_confidence", "file"]
    max_confidence: int | None = None
    source_file_id: UUID | None = None

    @field_validator("max_confidence")
    @classmethod
    def validate_max_confidence(cls, value: int | None) -> int | None:
        if value is None:
            return None
        if value < 0 or value > 100:
            raise ValueError("max_confidence must be between 0 and 100")
        return value

    @model_validator(mode="after")
    def validate_scope(self) -> "IntakeDismissUnmappedScope":
        fields_set = self.model_fields_set
        if self.scope == "all":
            if "max_confidence" in fields_set or "source_file_id" in fields_set:
                raise ValueError("scope='all' cannot include max_confidence or source_file_id")
        if self.scope == "low_confidence":
            if "max_confidence" not in fields_set or self.max_confidence is None:
                raise ValueError("max_confidence is required for scope='low_confidence'")
            if "source_file_id" in fields_set:
                raise ValueError("scope='low_confidence' cannot include source_file_id")
        if self.scope == "file":
            if "source_file_id" not in fields_set:
                raise ValueError("source_file_id is required for scope='file'")
            if "max_confidence" in fields_set:
                raise ValueError("scope='file' cannot include max_confidence")
        return self


class IntakeDismissUnmappedBulkRequest(IntakeDismissUnmappedScope):
    pass


class IntakeDismissUnmappedBulkResponse(BaseSchema):
    dismissed_count: int


# Batch suggestion operations
class IntakeSuggestionBatchRequest(BaseSchema):
    """Request to batch apply or reject multiple suggestions."""

    suggestion_ids: list[UUID] = Field(..., min_length=1, max_length=100)
    status: Literal["applied", "rejected"]


class IntakeSuggestionBatchResultItem(BaseSchema):
    """Result for a single suggestion in a batch operation."""

    id: UUID
    success: bool
    status: Literal["applied", "rejected"] | None = None
    error: str | None = None


class IntakeSuggestionBatchResponse(BaseSchema):
    """Response from batch suggestion operation."""

    results: list[IntakeSuggestionBatchResultItem]
    applied_count: int
    rejected_count: int
    error_count: int
