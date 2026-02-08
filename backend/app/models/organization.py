"""Organization model - tenant root for multi-tenant isolation."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Organization(BaseModel):
    """
    Organization model representing a tenant (customer).
    """

    __tablename__ = "organizations"
    __table_args__ = (
        CheckConstraint(
            "(is_active = true AND archived_at IS NULL) OR (is_active = false AND archived_at IS NOT NULL)",
            name="ck_organizations_lifecycle_state",
        ),
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    settings: Mapped[dict[str, object]] = mapped_column(JSONB, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    users = relationship(
        "User",
        back_populates="organization",
        foreign_keys="User.organization_id",
    )
    archived_by_user = relationship(
        "User",
        foreign_keys=[archived_by_user_id],
    )
    companies = relationship("Company", back_populates="organization")

    def __repr__(self) -> str:
        return f"<Organization {self.slug}>"
