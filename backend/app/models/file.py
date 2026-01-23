"""
Project file model.
Represents uploaded files associated with projects.
"""

from uuid import UUID

from sqlalchemy import ForeignKey, ForeignKeyConstraint, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class ProjectFile(BaseModel):
    """
    Project file model representing uploaded documents.

    Stores file metadata, processed content, and AI analysis results.

    Attributes:
        project_id: Parent project
        filename: Original filename
        file_path: Storage path (S3 key or local path)
        file_size: File size in bytes
        mime_type: MIME type (e.g., application/pdf)
        category: File category (technical, regulatory, financial, other)
        description: Optional file description
        processed_text: Extracted text content
        ai_analysis: AI analysis results (JSON)
        file_metadata: Additional file metadata (JSON)
    """

    __tablename__ = "project_files"

    __table_args__ = (
        ForeignKeyConstraint(
            ["project_id", "organization_id"],
            ["projects.id", "projects.organization_id"],
            name="fk_file_project_org",
            ondelete="CASCADE",
        ),
        Index("ix_project_files_project_org", "project_id", "organization_id"),
    )

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id"),
        nullable=False,
        index=True,
    )

    project_id: Mapped[UUID] = mapped_column(
        nullable=False,
        index=True,
    )

    # File Information
    filename: Mapped[str] = mapped_column(String(255), nullable=False)

    file_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        comment="Storage path (S3 key or local path)",
    )

    file_size: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="File size in bytes",
    )

    file_type: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        comment="File extension without dot (pdf, docx, xlsx)",
    )

    mime_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="MIME type (e.g., application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document)",
    )

    uploaded_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="User who uploaded the file",
    )

    # Classification
    category: Mapped[str] = mapped_column(
        String(50),
        default="other",
        comment="technical, regulatory, financial, other",
    )

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Processing Results
    processed_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Extracted text content from document",
    )

    ai_analysis: Mapped[dict[str, object] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="AI analysis results and insights",
    )

    # Metadata (renamed to avoid SQLAlchemy reserved name conflict)
    file_metadata: Mapped[dict[str, object] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Additional metadata (page count, dimensions, etc.)",
    )

    # Relationships
    project = relationship("Project", back_populates="files")

    def __repr__(self) -> str:
        return f"<ProjectFile {self.filename}>"
