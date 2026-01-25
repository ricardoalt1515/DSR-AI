"""Intake suggestion model."""

from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, ForeignKeyConstraint, Index, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class IntakeSuggestion(BaseModel):
    """AI suggestion extracted from notes or files."""

    __tablename__ = "intake_suggestions"

    __table_args__ = (
        ForeignKeyConstraint(
            ["project_id", "organization_id"],
            ["projects.id", "projects.organization_id"],
            name="fk_intake_suggestions_project_org",
            ondelete="CASCADE",
        ),
        CheckConstraint(
            "confidence >= 0 AND confidence <= 100",
            name="ck_intake_suggestions_confidence",
        ),
        CheckConstraint(
            "status IN ('pending', 'applied', 'rejected')",
            name="ck_intake_suggestions_status",
        ),
        CheckConstraint(
            "source IN ('notes', 'file', 'image', 'sds', 'lab')",
            name="ck_intake_suggestions_source",
        ),
        CheckConstraint(
            "value_type IS NULL OR value_type IN ('string', 'number')",
            name="ck_intake_suggestions_value_type",
        ),
        CheckConstraint(
            "(source = 'notes' AND evidence IS NULL AND source_file_id IS NULL) OR "
            "(source != 'notes' AND evidence IS NOT NULL AND source_file_id IS NOT NULL)",
            name="ck_intake_suggestions_evidence_source",
        ),
        Index("ix_intake_suggestions_project_org", "project_id", "organization_id"),
        Index(
            "ix_intake_suggestions_project_section_field_status",
            "project_id",
            "section_id",
            "field_id",
            "status",
        ),
        Index(
            "ix_intake_suggestions_pending",
            "project_id",
            "section_id",
            "field_id",
            postgresql_where="status = 'pending'",
        ),
        Index(
            "uq_intake_suggestions_applied_field",
            "project_id",
            "section_id",
            "field_id",
            unique=True,
            postgresql_where="status = 'applied'",
        ),
    )

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[UUID] = mapped_column(nullable=False)

    source_file_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("project_files.id", ondelete="CASCADE"),
        nullable=True,
    )

    field_id: Mapped[str] = mapped_column(Text, nullable=False)
    field_label: Mapped[str] = mapped_column(Text, nullable=False)
    section_id: Mapped[str] = mapped_column(Text, nullable=False)
    section_title: Mapped[str] = mapped_column(Text, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    value_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    unit: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    evidence: Mapped[dict[str, object] | None] = mapped_column(JSONB, nullable=True)
    created_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    project = relationship("Project")
    source_file = relationship("ProjectFile")
    created_by = relationship("User")
