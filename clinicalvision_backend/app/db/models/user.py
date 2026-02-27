"""
User model for authentication and authorization
Supports radiologists, admins, and technicians
"""

from sqlalchemy import Column, String, Boolean, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.db.base import BaseModel


class UserRole(str, enum.Enum):
    """User roles for RBAC"""
    ADMIN = "admin"
    RADIOLOGIST = "radiologist"
    TECHNICIAN = "technician"
    VIEWER = "viewer"


class User(BaseModel):
    """
    User model for authentication and authorization
    Represents radiologists, admins, technicians, etc.
    """
    
    __tablename__ = "users"
    
    # Organization relationship (multi-tenancy)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    
    # Authentication
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    
    # Profile
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.VIEWER, nullable=False, index=True)
    
    # Medical credentials
    license_number = Column(String(100), nullable=True)  # Medical license for radiologists
    specialization = Column(String(255), nullable=True)
    
    # Security
    is_active = Column(Boolean, default=True, nullable=False)
    two_factor_enabled = Column(Boolean, default=False, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    last_login = Column(String(255), nullable=True)  # ISO timestamp
    
    # Relationships
    organization = relationship("Organization", back_populates="users")
    feedback = relationship("Feedback", back_populates="radiologist", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    authored_reports = relationship("ClinicalReport", foreign_keys="ClinicalReport.author_id", back_populates="author")
    reviewed_reports = relationship("ClinicalReport", foreign_keys="ClinicalReport.reviewer_id", back_populates="reviewer")
    approved_reports = relationship("ClinicalReport", foreign_keys="ClinicalReport.approver_id", back_populates="approver")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
    
    @property
    def username(self) -> str:
        """Get username (email prefix)"""
        return self.email.split('@')[0] if self.email else "unknown"
    
    @property
    def full_name(self) -> str:
        """Get user's full name"""
        return f"{self.first_name} {self.last_name}"
