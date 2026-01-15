"""Company model - represents client organizations.
A company can have multiple locations (plants, warehouses, etc.).
"""

from sqlalchemy import JSON, Column, ForeignKey, String, Text, UniqueConstraint, func, select
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import column_property, relationship

from app.models.base import BaseModel
from app.models.location import Location


class Company(BaseModel):
    """
    Client company that generates waste streams.

    Example: Honda Manufacturing, Toyota, Bimbo
    """

    __tablename__ = "companies"

    __table_args__ = (UniqueConstraint("id", "organization_id", name="uq_companies_id_org"),)

    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id"),
        nullable=False,
        index=True,
    )

    # Basic information
    name = Column(String(255), nullable=False, index=True)
    industry = Column(String(100), nullable=False, comment="Automotive, Food & Beverage, etc.")

    # Sector classification (for filtering and reporting)
    sector = Column(
        String(50),
        nullable=False,
        index=True,
        comment="commercial, industrial, residential, municipal, other",
    )
    subsector = Column(
        String(100),
        nullable=False,
        comment="Specific subsector within the sector (e.g., food_processing, hotel)",
    )

    # Primary contact
    contact_name = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)

    # Additional info
    notes = Column(Text, nullable=True)
    tags = Column(JSON, default=list, comment="Categorization tags")

    # Relationships
    locations = relationship(
        "Location",
        back_populates="company",
        cascade="all, delete-orphan",
        order_by="Location.name",
        lazy="selectin",  # Eager load locations with company
    )
    organization = relationship("Organization", back_populates="companies")

    def __repr__(self) -> str:
        """Safe repr that doesn't trigger lazy loads or attribute refresh."""
        try:
            # Access __dict__ directly to avoid SQLAlchemy instrumentation
            name = self.__dict__.get("name", "Unknown")
            return f"<Company {name}>"
        except Exception:
            return "<Company (detached)>"


Company.location_count = column_property(
    select(func.count(Location.id))
    .where(
        Location.company_id == Company.id,
        Location.organization_id == Company.organization_id,
    )
    .correlate_except(Location)
    .scalar_subquery(),
    deferred=False,
)
