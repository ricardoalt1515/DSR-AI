"""
Project schemas matching frontend interfaces.
"""

from typing import Annotated, List, Optional, Dict
from uuid import UUID
from pydantic import BaseModel, Field, field_serializer, computed_field, ConfigDict, model_validator
from datetime import datetime

from app.schemas.common import BaseSchema
from app.schemas.proposal import ProposalResponse


class ProjectCreate(BaseSchema):
    """
    Schema for creating a new project (waste assessment).
    
    All data is inherited from Location → Company.
    No legacy fields - system is new, no backward compatibility needed.
    """
    
    # Required: Location relationship (single source of truth)
    location_id: UUID = Field(..., description="FK to Location (company site) - REQUIRED")
    
    # Core fields
    name: str = Field(..., min_length=1, max_length=255)
    project_type: str = Field(default="Assessment", max_length=100)
    description: Optional[str] = None
    budget: float = Field(default=0.0, ge=0)
    schedule_summary: str = Field(default="Por definir", max_length=255)
    tags: List[str] = Field(default_factory=list)
    
    class Config:
        json_schema_extra = {
            "example": {
                "location_id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "Waste Resource Assessment - ABC Factory",
                "project_type": "Assessment",
                "description": "Initial waste assessment for recycling opportunities",
                "budget": 5000.0,
                "schedule_summary": "2 weeks",
                "tags": ["assessment", "recycling"],
            }
        }


class ProjectUpdate(BaseSchema):
    """Schema for updating project fields."""
    
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    client: Optional[str] = Field(None, min_length=1, max_length=255)
    sector: Optional[str] = None
    subsector: Optional[str] = None
    location: Optional[str] = None
    project_type: Optional[str] = None
    description: Optional[str] = None
    budget: Optional[float] = Field(None, ge=0)
    schedule_summary: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = Field(None, ge=0, le=100)
    tags: Optional[List[str]] = None
    is_archived: Optional[bool] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "In Engineering",
                "progress": 35,
                "budget": 165000.0,
            }
        }


class ProjectSummary(BaseSchema):
    """
    Lightweight project summary for list views and cards.
    
    Optimized for performance:
    - No relationship data (proposals loaded separately)
    - Minimal fields for fast serialization
    - Uses SQLAlchemy model properties (proposals_count)
    
    Best Practice: Pydantic V2 with from_attributes=True handles
    SQLAlchemy models automatically - no manual model_validate needed!
    
    Serializes to camelCase for frontend (inherited from BaseSchema).
    """

    # Core fields
    id: UUID
    name: Annotated[str, Field(max_length=255)]
    sector: str
    subsector: Optional[str] = None
    
    # Location relationship (NEW)
    location_id: Optional[UUID] = None
    
    # Computed from relationships (NEW - preferred)
    company_name: Optional[str] = Field(
        default=None,
        description="Company name from location.company (computed)"
    )
    location_name: Optional[str] = Field(
        default=None,
        description="Location name from location_rel (computed)"
    )
    
    # Legacy fields (kept for backward compatibility)
    client: Annotated[str, Field(max_length=255)]
    location: Annotated[str, Field(max_length=255)]
    
    # Status & progress
    status: str
    progress: Annotated[int, Field(ge=0, le=100)]
    lifecycle_state: str
    is_archived: bool
    archived_at: Optional[datetime] = None
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    # Details
    project_type: str
    description: Optional[str] = None
    budget: Annotated[float, Field(ge=0)]
    schedule_summary: str
    
    # Computed from relationship (SQLAlchemy @property)
    proposals_count: int = Field(
        default=0,
        description="Count from proposals relationship"
    )
    
    # Metadata
    tags: List[str] = Field(default_factory=list)
    
    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, dt: datetime, _info) -> str:
        """Serialize datetime to ISO 8601 string."""
        return dt.isoformat()
    
    @field_serializer('tags')
    def serialize_tags(self, tags: List[str] | None, _info) -> List[str]:
        """Ensure tags is always a list, never None."""
        return tags or []

    @field_serializer('archived_at')
    def serialize_archived_at(self, dt: datetime | None, _info) -> str | None:
        """Serialize archived_at to ISO format."""
        return dt.isoformat() if dt else None


class ProjectDetail(ProjectSummary):
    """
    Full project details with eager-loaded relationships.
    
    Includes proposals and recent timeline events (last 10).
    Files loaded via separate endpoint for performance.
    """

    proposals: List = Field(
        default_factory=list,
        description="Generated proposals"
    )
    
    timeline: List = Field(
        default_factory=list,
        description="Recent activity events (last 10)"
    )
    
    @field_serializer('proposals')
    def serialize_proposals(self, proposals: List, _info) -> List[dict]:
        """Serialize proposals with snapshot data."""
        if not proposals:
            return []
        
        from app.schemas.proposal import ProposalResponse
        return [
            ProposalResponse.model_validate(p).model_dump(by_alias=True)
            for p in proposals
        ]
    
    @field_serializer('timeline')
    def serialize_timeline(self, events: List, _info) -> List[dict]:
        """Serialize timeline events (last 10 for performance)."""
        if not events:
            return []
        
        from app.schemas.timeline import TimelineEventResponse
        return [
            TimelineEventResponse.model_validate(e).model_dump(by_alias=True)
            for e in events[:10]  # Limit to last 10
        ]


# ==============================================================================
# Dashboard Stats Schemas (Optimized Aggregation Response)
# ==============================================================================

class PipelineStageStats(BaseSchema):
    """Statistics for a single pipeline stage."""
    count: int = Field(description="Number of projects in this stage")
    avg_progress: int = Field(ge=0, le=100, description="Average progress percentage")


class DashboardStatsResponse(BaseSchema):
    """
    Pre-aggregated dashboard statistics.
    
    Replaces client-side calculations with fast database aggregations.
    
    Performance: O(1) query with GROUP BY vs O(N) frontend iterations.
    """
    # Totals
    total_projects: int = Field(description="Total number of projects")
    
    # By status
    in_preparation: int = Field(description="Projects in preparation")
    generating: int = Field(description="Projects generating proposals")
    ready: int = Field(description="Projects with ready proposals")
    completed: int = Field(description="Completed projects")
    
    # Aggregates
    avg_progress: int = Field(ge=0, le=100, description="Average progress across all projects")
    total_budget: float = Field(ge=0, description="Sum of all project budgets")
    
    # Metadata
    last_updated: Optional[datetime] = Field(description="Most recent project update")
    
    # Pipeline breakdown
    pipeline_stages: Dict[str, PipelineStageStats] = Field(
        description="Stats grouped by status"
    )
    
    @field_serializer('last_updated')
    def serialize_datetime(self, dt: datetime | None, _info) -> str | None:
        """Serialize datetime to ISO 8601 string."""
        return dt.isoformat() if dt else None
