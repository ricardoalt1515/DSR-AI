"""
Timeline event schemas for project activity tracking.
"""

from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import Field, ConfigDict

from app.schemas.common import BaseSchema


class TimelineEventResponse(BaseSchema):
    """
    Timeline event response matching frontend TimelineEvent interface.
    
    Maps internal DB fields (snake_case) to API fields (camelCase).
    Represents a single activity/audit event in a project's history.
    """
    
    id: UUID
    
    # Map event_type → type (frontend expects "type")
    event_type: str = Field(
        serialization_alias="type",
        description="Event type: version, proposal, edit, upload, etc."
    )
    
    title: str = Field(description="Short event title")
    description: Optional[str] = Field(None, description="Detailed event description")
    
    # Map actor → user (frontend expects "user")
    actor: Optional[str] = Field(
        default=None,
        serialization_alias="user",
        description="User who performed the action"
    )
    
    # Map event_metadata → metadata (frontend expects "metadata")
    event_metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        serialization_alias="metadata",
        description="Additional event data"
    )
    
    # Map created_at → timestamp (frontend expects "timestamp")
    created_at: datetime = Field(
        serialization_alias="timestamp",
        description="When the event occurred"
    )
    
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )
