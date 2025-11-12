"""Pydantic schemas for request/response validation."""

from app.schemas.common import PaginatedResponse, APIError, SuccessResponse
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.schemas.company import (
    CompanyCreate,
    CompanyUpdate,
    CompanySummary,
    CompanyDetail,
)
from app.schemas.location import (
    LocationCreate,
    LocationUpdate,
    LocationSummary,
    LocationDetail,
)
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectSummary,
    ProjectDetail,
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
    # User
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "TokenResponse",
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
