"""Schemas for proposal ratings."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import ConfigDict, Field, field_validator

from app.schemas.common import BaseSchema


class ProposalRatingUpsert(BaseSchema):
    """Payload for rating create/update."""

    model_config = ConfigDict(extra="forbid")

    coverage_needs_score: int = Field(..., ge=1, le=5)
    quality_info_score: int = Field(..., ge=1, le=5)
    business_data_score: int = Field(..., ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)

    @field_validator("comment")
    @classmethod
    def validate_comment_whitespace(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if value != "" and value.strip() == "":
            raise ValueError("Comment cannot be whitespace-only")
        return value


class ProposalRatingRead(BaseSchema):
    coverage_needs_score: int
    quality_info_score: int
    business_data_score: int
    comment: str | None
    updated_at: datetime


class ProposalRatingEnvelope(BaseSchema):
    rating: ProposalRatingRead | None


class ProposalRatingCriteriaAvg(BaseSchema):
    coverage_needs_avg: float
    quality_info_avg: float
    business_data_avg: float


class ProposalRatingStatsRead(BaseSchema):
    visible: bool
    rating_count: int
    minimum_required_count: int = 3
    overall_avg: float | None
    criteria_avg: ProposalRatingCriteriaAvg | None


class AdminProposalRatingListItem(BaseSchema):
    proposal_id: UUID
    project_id: UUID
    rating_count: int
    overall_avg: float
    criteria_avg: ProposalRatingCriteriaAvg
    latest_rating_at: datetime
    comment_count: int


class AdminProposalRatingListResponse(BaseSchema):
    items: list[AdminProposalRatingListItem]
    limit: int
    offset: int
    total: int


class ProposalRatingDistribution(BaseSchema):
    one: int = Field(alias="1")
    two: int = Field(alias="2")
    three: int = Field(alias="3")
    four: int = Field(alias="4")
    five: int = Field(alias="5")


class ProposalRatingDistributions(BaseSchema):
    coverage_needs_score: ProposalRatingDistribution
    quality_info_score: ProposalRatingDistribution
    business_data_score: ProposalRatingDistribution


class AdminProposalRatingComment(BaseSchema):
    comment: str
    updated_at: datetime


class AdminProposalRatingDetailResponse(BaseSchema):
    proposal_id: UUID
    project_id: UUID
    rating_count: int
    overall_avg: float
    criteria_avg: ProposalRatingCriteriaAvg
    distributions: ProposalRatingDistributions
    comments: list[AdminProposalRatingComment]


ProposalRatingsAdminHasComments = Literal["true", "false", "any"]
ProposalRatingsAdminSort = Literal["highest", "lowest", "mostRated", "recentlyRated"]
