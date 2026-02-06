from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.common import BaseSchema


class TransferUserOrganizationRequest(BaseSchema):
    target_organization_id: UUID
    reason: str = Field(min_length=10, max_length=500)
    reassign_to_user_id: UUID | None = None


class TransferUserOrganizationResponse(BaseSchema):
    user_id: UUID
    from_organization_id: UUID
    to_organization_id: UUID
    reassigned_projects_count: int
    transferred_at: datetime
