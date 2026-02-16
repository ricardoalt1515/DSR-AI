"""Schemas for bulk import APIs."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, model_validator

from app.schemas.common import BaseSchema

RunStatus = Literal[
    "uploaded",
    "processing",
    "review_ready",
    "finalizing",
    "completed",
    "failed",
    "no_data",
]
ItemStatus = Literal["pending_review", "accepted", "amended", "rejected", "invalid"]
ItemType = Literal["location", "project"]


class BulkImportUploadResponse(BaseSchema):
    run_id: UUID
    status: RunStatus


class BulkImportRunResponse(BaseSchema):
    id: UUID
    entrypoint_type: Literal["company", "location"]
    entrypoint_id: UUID
    source_filename: str
    status: RunStatus
    progress_step: str | None = None
    processing_error: str | None = None
    total_items: int
    accepted_count: int
    rejected_count: int
    amended_count: int
    invalid_count: int
    duplicate_count: int
    created_by_user_id: UUID | None = None
    finalized_by_user_id: UUID | None = None
    finalized_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class BulkImportItemResponse(BaseSchema):
    id: UUID
    run_id: UUID
    item_type: ItemType
    status: ItemStatus
    needs_review: bool
    confidence: int | None
    extracted_data: dict[str, object]
    normalized_data: dict[str, object]
    user_amendments: dict[str, object] | None = None
    review_notes: str | None = None
    duplicate_candidates: list[dict[str, object]] | None = None
    confirm_create_new: bool
    parent_item_id: UUID | None = None
    created_location_id: UUID | None = None
    created_project_id: UUID | None = None
    created_at: datetime
    updated_at: datetime


class BulkImportItemPatchRequest(BaseSchema):
    action: Literal["accept", "amend", "reject", "reset"]
    normalized_data: dict[str, object] | None = None
    review_notes: str | None = Field(default=None, max_length=1000)
    confirm_create_new: bool | None = None

    @model_validator(mode="after")
    def validate_amend_payload(self) -> BulkImportItemPatchRequest:
        if self.action == "amend" and self.normalized_data is None:
            raise ValueError("normalized_data required for amend")
        return self


class BulkImportFinalizeSummary(BaseSchema):
    run_id: UUID
    locations_created: int
    projects_created: int
    rejected: int
    invalid: int
    duplicates_resolved: int


class BulkImportFinalizeResponse(BaseSchema):
    status: RunStatus
    summary: BulkImportFinalizeSummary


class BulkImportSummaryResponse(BaseSchema):
    summary: BulkImportFinalizeSummary


class AssignOrphansRequest(BaseSchema):
    location_id: UUID
    item_ids: list[UUID]


class AssignOrphansResponse(BaseSchema):
    projects_created: int
    created_project_ids: dict[str, str]  # item_id → project_id
    skipped: int = 0
