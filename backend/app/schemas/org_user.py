import uuid
from pydantic import BaseModel, Field, EmailStr

from app.schemas.user_fastapi import UserCreate
from app.models.user import UserRole


class OrgUserCreateRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str
    last_name: str
    role: str = Field(default=UserRole.FIELD_AGENT.value)


class OrgUserCreate(UserCreate):
    organization_id: uuid.UUID
    role: str = Field(default=UserRole.FIELD_AGENT.value)
    is_superuser: bool = False
