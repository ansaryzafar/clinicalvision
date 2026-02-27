"""
Feedback model for radiologist ground truth and reviews
"""

from sqlalchemy import Column, String, Text, Boolean, Enum as SQLEnum, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum

from app.db.base import BaseModel


class FeedbackType(str, enum.Enum):
    """Type of feedback provided"""
    AGREEMENT = "agreement"  # Radiologist agrees with AI
    CORRECTION = "correction"  # Radiologist corrects AI prediction
    ANNOTATION = "annotation"  # Additional annotations provided
    QUALITY_ISSUE = "quality_issue"  # Image quality concerns


class DiagnosisType(str, enum.Enum):
    """Actual diagnosis options"""
    BENIGN = "benign"
    MALIGNANT = "malignant"
    UNCERTAIN = "uncertain"
    PENDING_BIOPSY = "pending_biopsy"


class BIRADSAssessment(str, enum.Enum):
    """BI-RADS assessment categories (same as Analysis but separate for clarity)"""
    BIRADS_0 = "0"
    BIRADS_1 = "1"
    BIRADS_2 = "2"
    BIRADS_3 = "3"
    BIRADS_4 = "4"
    BIRADS_5 = "5"
    BIRADS_6 = "6"


class Feedback(BaseModel):
    """
    Feedback model for radiologist reviews and ground truth
    Used for model evaluation and continuous learning
    """
    
    __tablename__ = "feedback"
    
    # Analysis relationship
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("analyses.id"), nullable=False, index=True)
    
    # Radiologist who provided feedback
    radiologist_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Feedback type
    feedback_type = Column(SQLEnum(FeedbackType), nullable=False, index=True)
    
    # Agreement with AI prediction
    is_correct = Column(Boolean, nullable=False, index=True)
    
    # Ground truth diagnosis
    actual_diagnosis = Column(SQLEnum(DiagnosisType), nullable=False, index=True)
    birads_assessment = Column(SQLEnum(BIRADSAssessment), nullable=True)
    
    # Detailed feedback
    comments = Column(Text, nullable=True)
    findings_description = Column(Text, nullable=True)
    
    # Annotations (ROI corrections, lesion locations, etc.)
    annotations = Column(JSONB, nullable=True)  # Additional ROI boxes, lesion markers
    
    # Confidence in feedback
    radiologist_confidence = Column(Integer, nullable=True)  # 1-5 scale
    
    # Follow-up information
    biopsy_performed = Column(Boolean, nullable=True)
    pathology_result = Column(String(255), nullable=True)
    follow_up_recommendation = Column(String(500), nullable=True)
    
    # Relationships
    analysis = relationship("Analysis", back_populates="feedback")
    radiologist = relationship("User", back_populates="feedback")
    
    def __repr__(self):
        return f"<Feedback(id={self.id}, is_correct={self.is_correct}, actual={self.actual_diagnosis})>"
