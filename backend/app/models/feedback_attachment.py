"""Feedback attachment model."""

from uuid import UUID

from sqlalchemy import (
    BigInteger,
    Boolean,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class FeedbackAttachment(BaseModel):
    """File attachment associated with feedback."""

    __tablename__ = "feedback_attachments"

    __table_args__ = (
        ForeignKeyConstraint(
            ["feedback_id", "organization_id"],
            ["feedback.id", "feedback.organization_id"],
            name="fk_feedback_attachments_feedback_org",
            ondelete="CASCADE",
        ),
        Index("ix_feedback_attachments_org_feedback", "organization_id", "feedback_id"),
        Index("ix_feedback_attachments_org_created_at", "organization_id", "created_at"),
    )

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    feedback_id: Mapped[UUID] = mapped_column(nullable=False, index=True)

    storage_key: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    original_filename: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    is_previewable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    uploaded_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    feedback = relationship("Feedback")
    uploaded_by = relationship("User")
