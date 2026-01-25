"""Intake notes model."""

from uuid import UUID

from sqlalchemy import ForeignKey, ForeignKeyConstraint, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class IntakeNote(BaseModel):
    """Single editable intake note per project."""

    __tablename__ = "intake_notes"

    __table_args__ = (
        ForeignKeyConstraint(
            ["project_id", "organization_id"],
            ["projects.id", "projects.organization_id"],
            name="fk_intake_notes_project_org",
            ondelete="CASCADE",
        ),
        UniqueConstraint("project_id", "organization_id", name="uq_intake_notes_project_org"),
    )

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[UUID] = mapped_column(nullable=False)

    text: Mapped[str] = mapped_column(Text, nullable=False)

    created_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    project = relationship("Project")
    created_by = relationship("User")
