"""
Audit log model for HIPAA compliance and security tracking
"""

from sqlalchemy import Column, String, Text, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum

from app.db.base import BaseModel


class AuditAction(str, enum.Enum):
    """Types of auditable actions"""
    # Authentication
    LOGIN = "login"
    LOGOUT = "logout"
    LOGIN_FAILED = "login_failed"
    PASSWORD_CHANGE = "password_change"
    
    # Data access
    VIEW = "view"
    DOWNLOAD = "download"
    EXPORT = "export"
    
    # Data modification
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    
    # Analysis operations
    ANALYZE = "analyze"
    REVIEW = "review"
    FEEDBACK = "feedback"
    
    # Administrative
    USER_CREATE = "user_create"
    USER_UPDATE = "user_update"
    USER_DELETE = "user_delete"
    PERMISSION_CHANGE = "permission_change"
    
    # Security events
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"


class ResourceType(str, enum.Enum):
    """Types of resources being accessed"""
    USER = "user"
    ORGANIZATION = "organization"
    PATIENT = "patient"
    STUDY = "study"
    IMAGE = "image"
    ANALYSIS = "analysis"
    FEEDBACK = "feedback"
    SYSTEM = "system"


class AuditLog(BaseModel):
    """
    Audit log model for HIPAA compliance
    Tracks all user actions and system events
    """
    
    __tablename__ = "audit_logs"
    
    # User who performed the action (nullable for system events)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    
    # Action details
    action = Column(SQLEnum(AuditAction), nullable=False, index=True)
    resource_type = Column(SQLEnum(ResourceType), nullable=False, index=True)
    resource_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    
    # Request metadata
    ip_address = Column(String(45), nullable=True, index=True)  # IPv6 compatible
    user_agent = Column(String(500), nullable=True)
    request_method = Column(String(10), nullable=True)  # GET, POST, etc.
    request_path = Column(String(500), nullable=True)
    
    # Response details
    status_code = Column(String(10), nullable=True)  # HTTP status code
    success = Column(String(50), nullable=False, default="true", index=True)
    
    # Additional context
    details = Column(JSONB, nullable=True)  # Additional structured data
    error_message = Column(Text, nullable=True)
    
    # Session tracking
    session_id = Column(String(255), nullable=True, index=True)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    
    def __repr__(self):
        return f"<AuditLog(id={self.id}, action={self.action}, resource={self.resource_type})>"
