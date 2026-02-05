"""Pydantic schemas for feedback."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import ConfigDict, Field

from app.schemas.common import BaseSchema

FeedbackType = Literal["bug", "incorrect_response", "feature_request", "general"]


class FeedbackUserRead(BaseSchema):
    id: UUID
    first_name: str
    last_name: str


class FeedbackCreate(BaseSchema):
    model_config = ConfigDict(extra="forbid")

    content: str = Field(..., min_length=1, max_length=4000)
    feedback_type: FeedbackType | None = None
    page_path: str | None = Field(None, max_length=512)


class FeedbackUpdate(BaseSchema):
    model_config = ConfigDict(extra="forbid")

    resolved: bool


class FeedbackPublicCreateResponse(BaseSchema):
    id: UUID
    created_at: datetime


class FeedbackAdminRead(BaseSchema):
    id: UUID
    content: str
    feedback_type: FeedbackType | None
    page_path: str | None
    user_id: UUID
    user: FeedbackUserRead
    resolved_at: datetime | None
    resolved_by_user_id: UUID | None
    created_at: datetime
    attachment_count: int = 0


class FeedbackAttachmentRead(BaseSchema):
    id: UUID
    original_filename: str
    size_bytes: int
    content_type: str | None
    is_previewable: bool
    created_at: datetime


class FeedbackAttachmentAdminRead(FeedbackAttachmentRead):
    download_url: str
    preview_url: str | None = None
