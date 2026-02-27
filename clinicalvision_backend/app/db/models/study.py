"""
Study model for mammogram imaging sessions
"""

from sqlalchemy import Column, String, Date, Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.db.base import BaseModel


class Modality(str, enum.Enum):
    """Imaging modality type - aligned with frontend"""
    MG = "MG"    # Full-field Digital Mammography
    DBT = "DBT"  # Digital Breast Tomosynthesis (3D mammography)
    US = "US"    # Ultrasound
    MRI = "MRI"  # Magnetic Resonance Imaging
    CT = "CT"    # Computed Tomography


class StudyStatus(str, enum.Enum):
    """Study processing status"""
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    ANALYZED = "analyzed"
    REVIEWED = "reviewed"
    COMPLETED = "completed"
    FAILED = "failed"


class Study(BaseModel):
    """
    Study model representing a mammogram imaging session
    Contains metadata about the imaging study
    """
    
    __tablename__ = "studies"
    
    # Organization relationship (multi-tenancy)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    
    # Patient relationship
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    
    # Study information
    accession_number = Column(String(100), nullable=False, unique=True, index=True)
    study_date = Column(Date, nullable=False, index=True)
    modality = Column(SQLEnum(Modality), default=Modality.MG, nullable=False)
    
    # Study metadata
    study_description = Column(String(500), nullable=True)
    referring_physician = Column(String(255), nullable=True)
    institution_name = Column(String(255), nullable=True)
    
    # Processing status
    status = Column(SQLEnum(StudyStatus), default=StudyStatus.UPLOADED, nullable=False, index=True)
    
    # Clinical context
    clinical_indication = Column(Text, nullable=True)  # Reason for exam
    comparison_available = Column(String(50), nullable=True)  # "yes", "no", "unknown"
    
    # Relationships
    organization = relationship("Organization", back_populates="studies")
    patient = relationship("Patient", back_populates="studies")
    images = relationship("Image", back_populates="study", cascade="all, delete-orphan")
    clinical_reports = relationship("ClinicalReport", back_populates="study", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Study(id={self.id}, accession_number={self.accession_number}, status={self.status})>"
