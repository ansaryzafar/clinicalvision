"""
Image model for DICOM mammogram files
Extended to support general medical image storage and lifecycle management
"""

from sqlalchemy import Column, String, Integer, Enum as SQLEnum, ForeignKey, Float, JSON, Text, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import enum

from app.db.base import BaseModel


class ViewType(str, enum.Enum):
    """Mammogram view type"""
    CC = "CC"  # Craniocaudal
    MLO = "MLO"  # Mediolateral Oblique
    ML = "ML"  # Mediolateral
    LM = "LM"  # Lateromedial
    XCCL = "XCCL"  # Exaggerated CC Lateral
    OTHER = "OTHER"


class Laterality(str, enum.Enum):
    """Breast laterality"""
    LEFT = "LEFT"
    RIGHT = "RIGHT"
    BILATERAL = "BILATERAL"
    UNKNOWN = "UNKNOWN"


class ImageStatus(str, enum.Enum):
    """Image processing status"""
    UPLOADED = "uploaded"
    PREPROCESSING = "preprocessing"
    READY = "ready"
    ANALYZED = "analyzed"
    FAILED = "failed"


class Image(BaseModel):
    """
    Image model for mammogram DICOM files and general medical images
    Contains file metadata, preprocessing information, and storage management
    """
    
    __tablename__ = "images"
    
    # Study relationship (nullable for standalone uploads)
    study_id = Column(UUID(as_uuid=True), ForeignKey("studies.id"), nullable=True, index=True)
    
    # Patient and study identifiers (for direct uploads without study creation)
    patient_id = Column(String(100), nullable=True, index=True)
    study_instance_uid = Column(String(200), nullable=True, index=True)
    
    # File information
    file_path = Column(String(500), nullable=False)  # Relative path or S3 key
    file_name = Column(String(500), nullable=True)  # Original filename
    file_size_bytes = Column(Integer, nullable=True)
    checksum = Column(String(64), nullable=True)  # SHA-256 hash
    mime_type = Column(String(100), nullable=True)  # MIME type
    
    # Storage backend information
    storage_backend = Column(String(50), default="local")  # local, s3, azure
    storage_region = Column(String(50), nullable=True)
    
    # DICOM metadata
    sop_instance_uid = Column(String(255), nullable=True, unique=True, index=True)
    series_instance_uid = Column(String(255), nullable=True, index=True)
    modality = Column(String(50), nullable=True)  # MG, CT, MRI, etc.
    
    # Image characteristics
    view_type = Column(SQLEnum(ViewType), nullable=True, index=True)  # Made nullable
    laterality = Column(SQLEnum(Laterality), nullable=True, index=True)  # Made nullable
    image_width = Column(Integer, nullable=True)
    image_height = Column(Integer, nullable=True)
    bits_stored = Column(Integer, nullable=True)
    
    # Additional metadata (DICOM tags, etc.)
    image_metadata = Column(JSON, nullable=True, default=dict)
    image_type = Column(String(100), nullable=True)
    view_position = Column(String(50), nullable=True)  # CC, MLO for mammography
    
    # Preprocessing info
    status = Column(SQLEnum(ImageStatus), default=ImageStatus.UPLOADED, nullable=False, index=True)
    preprocessing_applied = Column(String(500), nullable=True)  # JSON string of preprocessing steps
    processing_status = Column(String(50), default="pending")
    processing_error = Column(Text, nullable=True)
    is_processed = Column(Boolean, default=False)
    
    # Quality metrics
    quality_score = Column(Float, nullable=True)  # 0.0-1.0
    artifacts_detected = Column(String(500), nullable=True)  # JSON array of artifact types
    
    # Lifecycle management
    is_archived = Column(Boolean, default=False)
    archived_at = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    
    # Upload tracking
    uploaded_by = Column(UUID(as_uuid=True), nullable=True, index=True)  # User ID
    upload_source = Column(String(100), default="web")
    
    # Relationships
    study = relationship("Study", back_populates="images")
    analyses = relationship("Analysis", back_populates="image", cascade="all, delete-orphan")
    dicom_metadata = relationship("DICOMMetadata", back_populates="image", uselist=False, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Image(id={self.id}, file={self.file_name}, status={self.status})>"
