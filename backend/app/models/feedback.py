"""Feedback model."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Feedback(BaseModel):
    """User feedback submitted from the product UI."""

    __tablename__ = "feedback"

    __table_args__ = (
        CheckConstraint("char_length(content) <= 4000", name="ck_feedback_content_length"),
        CheckConstraint(
            "(resolved_at IS NOT NULL) OR (resolved_by_user_id IS NULL)",
            name="ck_feedback_resolved_fields_consistent",
        ),
        CheckConstraint(
            "feedback_type IS NULL OR feedback_type IN "
            "('bug', 'incorrect_response', 'feature_request', 'general')",
            name="ck_feedback_type",
        ),
        UniqueConstraint("id", "organization_id", name="uq_feedback_id_org"),
        Index("ix_feedback_org_created_at", "organization_id", "created_at"),
        Index("ix_feedback_org_resolved_at", "organization_id", "resolved_at"),
    )

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    feedback_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    page_path: Mapped[str | None] = mapped_column(String(512), nullable=True)

    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Keep triage fields nullable independently so resolved history remains
    # even if the resolver user is deleted (ondelete=SET NULL).
    resolved_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    organization = relationship("Organization")
    user = relationship("User", foreign_keys=[user_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_user_id])
