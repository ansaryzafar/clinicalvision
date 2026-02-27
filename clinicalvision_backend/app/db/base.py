"""
Base model with common fields for all database models
Provides UUID primary key, timestamps, and soft delete functionality
"""

from sqlalchemy import Column, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.db.session import Base


class BaseModel(Base):
    """
    Abstract base model with common fields
    All models should inherit from this
    """
    
    __abstract__ = True
    
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        unique=True,
        nullable=False,
        index=True
    )
    
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    is_deleted = Column(
        Boolean,
        default=False,
        nullable=False,
        index=True
    )
    
    def soft_delete(self):
        """Soft delete the record"""
        self.is_deleted = True
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

