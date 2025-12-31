"""
Project model.
Represents waste assessment projects at client locations.
"""

from typing import Optional
from sqlalchemy import Column, Float, ForeignKey, ForeignKeyConstraint, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSON, JSONB, UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Project(BaseModel):
    """
    Project model representing a waste assessment at a specific location.
    
    NEW: Projects now belong to Locations (which belong to Companies)
    LEGACY: client and location columns kept for backward compatibility
    
    Attributes:
        location_id: NEW - FK to Location (company site)
        user_id: Owner of the project (sales agent)
        name: Project name
        client: LEGACY - Use location.company.name instead
        sector: Industry sector
        subsector: Industry subsector
        location: LEGACY - Use location.name instead
        project_type: Type of waste stream
        description: Project description
        budget: Estimated budget in USD
        schedule_summary: Schedule summary text
        status: Current project status
        progress: Project completion percentage (0-100)
        tags: Optional tags for categorization
    """
    
    __tablename__ = "projects"

    __table_args__ = (
        Index('ix_project_data_gin', 'project_data', postgresql_using='gin'),
        UniqueConstraint("id", "organization_id", name="uq_projects_id_org"),
        ForeignKeyConstraint(
            ["location_id", "organization_id"],
            ["locations.id", "locations.organization_id"],
            name="fk_project_location_org",
            ondelete="CASCADE",
        ),
        Index("ix_projects_location_org", "location_id", "organization_id"),
    )

    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id"),
        nullable=False,
        index=True,
    )
    
    # ═══════════════════════════════════════════════════════════
    # NEW: LOCATION RELATIONSHIP
    # ═══════════════════════════════════════════════════════════
    location_id = Column(
        UUID(as_uuid=True),
        nullable=True,  # Nullable during migration, will be required later
        index=True,
        comment="FK to Location - company site where waste is generated"
    )
    
    # Ownership
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Basic Information
    name = Column(String(255), nullable=False, index=True)
    
    # LEGACY: Keep for backward compatibility (will be deprecated)
    client = Column(String(255), nullable=True, comment="LEGACY - use location.company.name")
    location = Column(String(255), nullable=True, comment="LEGACY - use location.name")
    
    sector = Column(
        String(100),
        nullable=False,
        comment="Municipal, Industrial, Commercial, Residential",
    )
    subsector = Column(String(100), nullable=True)
    project_type = Column(
        String(100),
        default="To be defined",
        comment="Type of treatment system",
    )
    description = Column(Text, nullable=True)
    
    # Financial
    budget = Column(Float, default=0.0, comment="Estimated budget in USD")
    
    # Schedule
    schedule_summary = Column(
        String(255),
        default="To be defined",
        comment="High-level schedule summary",
    )
    
    # Status and Progress
    status = Column(
        String(50),
        default="In Preparation",
        nullable=False,
        index=True,
        comment="Project status matching frontend enum",
    )
    progress = Column(
        Integer,
        default=0,
        nullable=False,
        comment="Completion percentage 0-100",
    )
    
    # Metadata
    tags = Column(
        JSON,
        default=list,
        comment="Array of tags for categorization",
    )
    
    # ═══════════════════════════════════════════════════════════
    # FLEXIBLE PROJECT DATA (JSONB)
    # ═══════════════════════════════════════════════════════════
    project_data = Column(
        JSONB,
        nullable=False,
        default=dict,
        server_default='{}',
        comment="Flexible JSONB storage for all project technical data (technical_sections, etc.)"
    )
    
    # Relationships
    location_rel = relationship("Location", back_populates="projects")
    user = relationship("User", back_populates="projects")
    
    proposals = relationship(
        "Proposal",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="desc(Proposal.created_at)",
        lazy="selectin",
    )
    
    files = relationship(
        "ProjectFile",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="desc(ProjectFile.created_at)",
        lazy="dynamic",
    )
    
    timeline = relationship(
        "TimelineEvent",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="desc(TimelineEvent.created_at)",
        lazy="selectin",
    )
    
    def __repr__(self) -> str:
        return f"<Project {self.name}>"
    
    @property
    def proposals_count(self) -> int:
        """Count of proposals for this project."""
        return len(self.proposals) if self.proposals else 0
    
    @property
    def company_name(self) -> Optional[str]:
        """Get company name from location relationship."""
        if self.location_rel and self.location_rel.company:
            return self.location_rel.company.name
        return self.client  # Fallback to legacy field
    
    @property
    def location_name(self) -> Optional[str]:
        """Get location name from relationship."""
        if self.location_rel:
            return self.location_rel.name
        return self.location  # Fallback to legacy field
