"""Proposal rating model."""

from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    SmallInteger,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class ProposalRating(BaseModel):
    """One user rating for one proposal inside one organization."""

    __tablename__ = "proposal_ratings"

    __table_args__ = (
        CheckConstraint(
            "coverage_needs_score >= 1 AND coverage_needs_score <= 5",
            name="ck_proposal_ratings_coverage_needs_score",
        ),
        CheckConstraint(
            "quality_info_score >= 1 AND quality_info_score <= 5",
            name="ck_proposal_ratings_quality_info_score",
        ),
        CheckConstraint(
            "business_data_score >= 1 AND business_data_score <= 5",
            name="ck_proposal_ratings_business_data_score",
        ),
        CheckConstraint(
            "comment IS NULL OR char_length(comment) <= 1000",
            name="ck_proposal_ratings_comment_length",
        ),
        UniqueConstraint(
            "organization_id",
            "proposal_id",
            "user_id",
            name="uq_proposal_ratings_org_proposal_user",
        ),
        ForeignKeyConstraint(
            ["proposal_id", "organization_id"],
            ["proposals.id", "proposals.organization_id"],
            name="fk_proposal_ratings_proposal_org",
            ondelete="CASCADE",
        ),
        Index("ix_proposal_ratings_org_user", "organization_id", "user_id"),
        Index("ix_proposal_ratings_org_updated_at", "organization_id", "updated_at"),
    )

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )

    proposal_id: Mapped[UUID] = mapped_column(nullable=False)

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    coverage_needs_score: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    quality_info_score: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    business_data_score: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
