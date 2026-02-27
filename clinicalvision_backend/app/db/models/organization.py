"""
Organization model for multi-tenant support
Each organization represents a hospital or imaging center
"""

from sqlalchemy import Column, String, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum

from app.db.base import BaseModel


class SubscriptionTier(str, enum.Enum):
    """Subscription tier for organization"""
    FREE = "free"
    BASIC = "basic"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class Organization(BaseModel):
    """
    Organization model for multi-tenancy
    Represents a hospital, clinic, or imaging center
    """
    
    __tablename__ = "organizations"
    
    name = Column(String(255), nullable=False, index=True)
    subscription_tier = Column(
        SQLEnum(SubscriptionTier),
        default=SubscriptionTier.FREE,
        nullable=False
    )
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Contact information
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(String(500), nullable=True)
    
    # Relationships
    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    patients = relationship("Patient", back_populates="organization", cascade="all, delete-orphan")
    studies = relationship("Study", back_populates="organization", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Organization(id={self.id}, name={self.name})>"
