"""
Proposal model.
Represents AI-generated technical proposals for projects.
"""

from uuid import UUID

from sqlalchemy import Float, ForeignKey, ForeignKeyConstraint, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Proposal(BaseModel):
    """
    Proposal model representing an AI-generated technical proposal.

    Single source of truth: All technical data stored in ai_metadata JSONB field.

    Structure:
        ai_metadata = {
            "proposal": {
                "technicalData": {
                    "mainEquipment": [...],
                    "treatmentEfficiency": {...},
                    "capexBreakdown": {...},
                    "opexBreakdown": {...},
                    "operationalData": {...},
                    ...
                },
                "markdownContent": "...",
                "confidenceLevel": "High|Medium|Low",
                "recommendations": [...]
            },
            "transparency": {
                "provenCases": [...],
                "userSector": "...",
                "clientMetadata": {...},
                "generatedAt": "ISO timestamp",
                "generationTimeSeconds": 28.5
            }
        }

    Attributes:
        project_id: Parent project UUID
        version: Proposal version (e.g., "v1.0", "v2.1")
        title: Proposal title
        proposal_type: Type (Conceptual, Technical, Detailed)
        status: Status (Draft, Current, Archived)
        author: Author name (usually "H2O Allegiant AI")
        capex: Capital expenditure estimate (USD)
        opex: Annual operational expenditure estimate (USD)
        executive_summary: Executive summary text (extracted from markdown)
        technical_approach: Full technical approach markdown
        ai_metadata: Complete AI output + transparency metadata (JSONB)
        pdf_path: Path to generated PDF file
    """

    __tablename__ = "proposals"

    __table_args__ = (
        ForeignKeyConstraint(
            ["project_id", "organization_id"],
            ["projects.id", "projects.organization_id"],
            name="fk_proposal_project_org",
            ondelete="CASCADE",
        ),
        Index("ix_proposals_project_org", "project_id", "organization_id"),
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

    # Metadata
    version: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="Proposal version (e.g., v1.0, v2.1)",
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)

    proposal_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="Conceptual, Technical, or Detailed",
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default="Draft",
        nullable=False,
        comment="Draft, Current, or Archived",
    )

    author: Mapped[str] = mapped_column(
        String(255),
        default="H2O Allegiant AI",
        nullable=False,
    )

    # Financial Summary
    capex: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        comment="Capital expenditure estimate in USD",
    )

    opex: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        comment="Annual operational expenditure estimate in USD",
    )

    # Content Sections (kept for summary/display)
    executive_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    technical_approach: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Generated Files
    pdf_path: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        comment="Path to generated PDF file (S3 URL or local path)",
    )

    # Single source of truth for all technical data ✅
    ai_metadata: Mapped[dict[str, object] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="Complete AI output + transparency: {proposal: {technicalData, markdownContent, confidenceLevel}, transparency: {provenCases, generatedAt, generationTimeSeconds}}",
    )

    # Relationships
    project = relationship("Project", back_populates="proposals")

    def __repr__(self) -> str:
        return f"<Proposal {self.version} for Project {self.project_id}>"
