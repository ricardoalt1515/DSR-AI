"""Intake unmapped note model."""

from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, ForeignKeyConstraint, Index, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class IntakeUnmappedNote(BaseModel):
    """Unmapped extracted note awaiting manual mapping or dismissal."""

    __tablename__ = "intake_unmapped_notes"

    __table_args__ = (
        ForeignKeyConstraint(
            ["project_id", "organization_id"],
            ["projects.id", "projects.organization_id"],
            name="fk_intake_unmapped_notes_project_org",
            ondelete="CASCADE",
        ),
        CheckConstraint(
            "confidence >= 0 AND confidence <= 100",
            name="ck_intake_unmapped_notes_confidence",
        ),
        CheckConstraint(
            "status IN ('open', 'mapped', 'dismissed')",
            name="ck_intake_unmapped_notes_status",
        ),
        Index("ix_intake_unmapped_notes_project_org", "project_id", "organization_id"),
    )

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[UUID] = mapped_column(nullable=False)

    extracted_text: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[int] = mapped_column(Integer, nullable=False)

    source_file_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("project_files.id", ondelete="SET NULL"),
        nullable=True,
    )
    source_file: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(Text, nullable=False)
    mapped_to_suggestion_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("intake_suggestions.id", ondelete="SET NULL"),
        nullable=True,
    )

    project = relationship("Project")
    mapped_to_suggestion = relationship("IntakeSuggestion")
    source_file_rel = relationship("ProjectFile")
