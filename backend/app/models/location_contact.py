"""
Location contact model.
Represents contacts associated with a specific location.
"""

from sqlalchemy import Column, ForeignKey, ForeignKeyConstraint, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class LocationContact(BaseModel):
    """
    Contact associated with a specific location.
    """

    __tablename__ = "location_contacts"

    __table_args__ = (
        ForeignKeyConstraint(
            ["location_id", "organization_id"],
            ["locations.id", "locations.organization_id"],
            name="fk_location_contacts_location_org",
            ondelete="CASCADE",
        ),
        Index("ix_location_contacts_org_location", "organization_id", "location_id"),
    )

    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id"),
        nullable=False,
        index=True,
    )
    location_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    title = Column(String(255), nullable=True)
    notes = Column(String(1000), nullable=True)

    location = relationship("Location", back_populates="contacts")

    def __repr__(self) -> str:
        """Safe repr that avoids lazy loads."""
        try:
            name = self.__dict__.get("name", "Unknown")
            return f"<LocationContact {name}>"
        except Exception:
            return "<LocationContact (detached)>"
