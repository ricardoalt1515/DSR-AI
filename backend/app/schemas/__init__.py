"""Pydantic schemas for request/response validation."""

from app.schemas.common import APIError, PaginatedResponse, SuccessResponse
from app.schemas.company import (
    CompanyCreate,
    CompanyDetail,
    CompanySummary,
    CompanyUpdate,
)
from app.schemas.location import (
    LocationCreate,
    LocationDetail,
    LocationSummary,
    LocationUpdate,
)
from app.schemas.project import (
    ProjectCreate,
    ProjectDetail,
    ProjectSummary,
    ProjectUpdate,
)
from app.schemas.proposal import (
    ProposalGenerationRequest,
    ProposalJobStatus,
    ProposalResponse,
)

__all__ = [
    # Common
    "PaginatedResponse",
    "APIError",
    "SuccessResponse",
    # Company
    "CompanyCreate",
    "CompanyUpdate",
    "CompanySummary",
    "CompanyDetail",
    # Location
    "LocationCreate",
    "LocationUpdate",
    "LocationSummary",
    "LocationDetail",
    # Project
    "ProjectCreate",
    "ProjectUpdate",
    "ProjectSummary",
    "ProjectDetail",
    # Proposal
    "ProposalGenerationRequest",
    "ProposalJobStatus",
    "ProposalResponse",
]

# Rebuild models to resolve forward references (circular imports)
CompanyDetail.model_rebuild()
LocationDetail.model_rebuild()
