"""
User model.
Represents system users with authentication and profile information.
Integrated with FastAPI Users for production-ready authentication.
"""

from enum import Enum
from uuid import UUID

from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class UserRole(str, Enum):
    """User roles for access control."""

    ADMIN = "admin"
    ORG_ADMIN = "org_admin"
    FIELD_AGENT = "field_agent"
    CONTRACTOR = "contractor"
    COMPLIANCE = "compliance"
    SALES = "sales"


class User(SQLAlchemyBaseUserTableUUID, BaseModel):
    """
    User model for authentication and profile management.

    Inherits from SQLAlchemyBaseUserTableUUID which provides:
        - id (UUID): Primary key, inherited from BaseModel
        - email (str): Unique email address for login
        - hashed_password (str): Bcrypt hashed password
        - is_active (bool): Whether user account is active
        - is_superuser (bool): Whether user has admin privileges
        - is_verified (bool): Whether user email is verified

    Custom fields:
        - role: User role for business logic (admin, org_admin, field_agent, contractor, compliance, sales)
        - first_name, last_name: User's name
        - company_name, location: Optional profile info
        - sector, subsector: Industry context
    """

    __tablename__ = "users"

    # Role field for business access control
    # Note: is_superuser is kept for FastAPI Users compatibility
    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=UserRole.FIELD_AGENT,
        index=True,
        comment="User role: admin, org_admin, field_agent, contractor, compliance, sales",
    )

    organization_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("organizations.id"),
        nullable=True,
        index=True,
        comment="Tenant organization (NULL for platform admins)",
    )

    # Profile fields
    first_name: Mapped[str] = mapped_column(
        String(100), nullable=False, comment="User's first name"
    )
    last_name: Mapped[str] = mapped_column(String(100), nullable=False, comment="User's last name")
    company_name: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment="Company or organization name"
    )
    location: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment="User location"
    )

    # Industry Context
    sector: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="Industry sector (Municipal, Industrial, Commercial, Residential)",
    )
    subsector: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="Industry subsector"
    )

    # Relationships
    projects = relationship(
        "Project",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )
    organization = relationship("Organization", back_populates="users")

    def __repr__(self) -> str:
        return f"<User {self.email}>"

    @property
    def full_name(self) -> str:
        """Get user's full name."""
        return f"{self.first_name} {self.last_name}"

    def is_admin(self) -> bool:
        """Check if user has admin privileges."""
        return self.is_superuser or self.role == UserRole.ADMIN

    def is_global_admin(self) -> bool:
        """Platform admin (superuser, no organization)."""
        return self.is_superuser

    def is_org_admin(self) -> bool:
        """Tenant admin within an organization."""
        return self.role == UserRole.ORG_ADMIN

    def can_see_all_org_projects(self) -> bool:
        """Org admin sees all projects in their org, not only their own."""
        return self.is_superuser or self.role == UserRole.ORG_ADMIN

    def can_manage_org_users(self) -> bool:
        """Org Admin or Platform Admin can manage users within an organization."""
        return self.is_superuser or self.role == UserRole.ORG_ADMIN

    def can_create_projects(self) -> bool:
        """Check if user can create projects."""
        return self.role in (UserRole.ADMIN, UserRole.FIELD_AGENT, UserRole.CONTRACTOR)

    def can_review_compliance(self) -> bool:
        """Check if user can review compliance."""
        return self.role in (UserRole.ADMIN, UserRole.COMPLIANCE)

    def can_validate_sales(self) -> bool:
        """Check if user can validate sales."""
        return self.role in (UserRole.ADMIN, UserRole.SALES)
