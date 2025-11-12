"""
Timeline event model.
Represents project history and activity log.
"""

from sqlalchemy import Column, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class TimelineEvent(BaseModel):
    """
    Timeline event model representing project activity history.
    
    Tracks all significant events in a project's lifecycle:
    - Project creation and updates
    - Technical data changes
    - Proposal generation
    - File uploads
    - Status changes
    
    Attributes:
        project_id: Parent project
        event_type: Type of event (created, updated, status_change, etc.)
        title: Event title
        description: Detailed event description
        actor: User who performed the action
        event_metadata: Additional event data (JSON)
    """
    
    __tablename__ = "timeline_events"
    
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    event_type = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Event type: created, updated, status_change, proposal_generated, file_uploaded, etc.",
    )
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    actor = Column(
        String(255),
        nullable=True,
        comment="User who performed the action",
    )
    
    # Metadata (renamed to avoid SQLAlchemy reserved name conflict)
    event_metadata = Column(
        JSON,
        nullable=True,
        comment="Additional event data (old_value, new_value, etc.)",
    )
    
    # Relationships
    project = relationship("Project", back_populates="timeline")
    
    def __repr__(self) -> str:
        return f"<TimelineEvent {self.event_type}: {self.title}>"
