"""Company contact model."""

import uuid
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    Text,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class CompanyContact(BaseModel):
    """Contact associated with a company."""

    __tablename__ = "company_contacts"

    __table_args__ = (
        ForeignKeyConstraint(
            ["company_id", "organization_id"],
            ["companies.id", "companies.organization_id"],
            name="fk_company_contacts_company_org",
            ondelete="CASCADE",
        ),
        CheckConstraint(
            "num_nonnulls(NULLIF(BTRIM(name), ''), NULLIF(BTRIM(email), ''), NULLIF(BTRIM(phone), '')) >= 1",
            name="ck_company_contacts_identity_present",
        ),
        Index(
            "uq_company_contacts_primary_per_company",
            "organization_id",
            "company_id",
            unique=True,
            postgresql_where=text("is_primary IS TRUE"),
        ),
        Index(
            "ix_company_contacts_org_company_name_id",
            "organization_id",
            "company_id",
            "name",
            "id",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
        index=False,
    )

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id"),
        nullable=False,
        index=True,
    )
    company_id: Mapped[UUID] = mapped_column(nullable=False, index=True)

    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )

    company = relationship("Company", back_populates="contacts")

    def __repr__(self) -> str:
        try:
            name = self.__dict__.get("name", "Unknown")
            return f"<CompanyContact {name}>"
        except Exception:
            return "<CompanyContact (detached)>"
