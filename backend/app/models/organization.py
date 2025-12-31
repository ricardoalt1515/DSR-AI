"""
Organization model - tenant root for multi-tenant isolation.
"""

from sqlalchemy import Boolean, Column, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Organization(BaseModel):
    """
    Organization model representing a tenant (customer).
    """

    __tablename__ = "organizations"

    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    settings = Column(JSONB, default=dict)
    is_active = Column(Boolean, default=True, index=True)

    users = relationship("User", back_populates="organization")
    companies = relationship("Company", back_populates="organization")

    def __repr__(self) -> str:
        return f"<Organization {self.slug}>"
