"""
Patient model for de-identified medical records (HIPAA compliant)
"""

from sqlalchemy import Column, String, Date, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.db.base import BaseModel


class Gender(str, enum.Enum):
    """Gender for patient demographics"""
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    UNKNOWN = "unknown"


class Patient(BaseModel):
    """
    Patient model with de-identified data (HIPAA compliant)
    Uses hashed identifiers instead of real patient names
    """
    
    __tablename__ = "patients"
    
    # Organization relationship (multi-tenancy)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    
    # De-identified patient identifier (hash of MRN or patient ID)
    patient_identifier_hash = Column(String(255), nullable=False, index=True)
    
    # Demographics (limited for HIPAA)
    date_of_birth = Column(Date, nullable=True)  # Can be generalized to year only
    gender = Column(SQLEnum(Gender), default=Gender.UNKNOWN, nullable=False)
    
    # Medical history (limited)
    has_breast_cancer_history = Column(String(50), nullable=True)  # "yes", "no", "unknown"
    has_family_history = Column(String(50), nullable=True)
    
    # Relationships
    organization = relationship("Organization", back_populates="patients")
    studies = relationship("Study", back_populates="patient", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Patient(id={self.id}, identifier_hash={self.patient_identifier_hash[:8]}...)>"
