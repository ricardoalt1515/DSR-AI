"""
User model.
Represents system users with authentication and profile information.
Integrated with FastAPI Users for production-ready authentication.
"""

from typing import Optional
from sqlalchemy import Boolean, Column, String
from sqlalchemy.orm import relationship, Mapped, mapped_column
from fastapi_users.db import SQLAlchemyBaseUserTableUUID

from app.models.base import BaseModel

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
    
    Custom H2O Allegiant fields:
        - first_name: User's first name
        - last_name: User's last name
        - company_name: Optional company name
        - location: Optional location
        - sector: Optional industry sector
        - subsector: Optional industry subsector
    
    Best Practices:
        - Uses FastAPI Users for battle-tested auth
        - Maintains existing UUID primary key
        - Preserves custom business fields
        - Type-safe with Mapped annotations
    """
    
    __tablename__ = "users"
    
    # Custom H2O Allegiant Profile Fields
    # Note: Authentication fields (email, hashed_password, is_active, etc.) 
    # are inherited from SQLAlchemyBaseUserTableUUID
    
    first_name: Mapped[str] = mapped_column(
        String(100), 
        nullable=False,
        comment="User's first name"
    )
    last_name: Mapped[str] = mapped_column(
        String(100), 
        nullable=False,
        comment="User's last name"
    )
    company_name: Mapped[Optional[str]] = mapped_column(
        String(255), 
        nullable=True,
        comment="Company or organization name"
    )
    location: Mapped[Optional[str]] = mapped_column(
        String(255), 
        nullable=True,
        comment="User location"
    )
    
    # Industry Context
    sector: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="Industry sector (Municipal, Industrial, Commercial, Residential)",
    )
    subsector: Mapped[Optional[str]] = mapped_column(
        String(100), 
        nullable=True,
        comment="Industry subsector"
    )
    
    # Relationships
    projects = relationship(
        "Project",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )
    
    def __repr__(self) -> str:
        return f"<User {self.email}>"
    
    @property
    def full_name(self) -> str:
        """Get user's full name."""
        return f"{self.first_name} {self.last_name}"
