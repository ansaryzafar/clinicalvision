"""
Analysis model for AI predictions and results
"""

from sqlalchemy import Column, String, Float, Enum as SQLEnum, ForeignKey, Integer, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum

from app.db.base import BaseModel


class PredictionClass(str, enum.Enum):
    """Binary classification result"""
    BENIGN = "benign"
    MALIGNANT = "malignant"


class BIRADSCategory(str, enum.Enum):
    """BI-RADS assessment categories"""
    BIRADS_0 = "0"  # Incomplete - Need additional imaging
    BIRADS_1 = "1"  # Negative
    BIRADS_2 = "2"  # Benign
    BIRADS_3 = "3"  # Probably benign
    BIRADS_4 = "4"  # Suspicious
    BIRADS_5 = "5"  # Highly suggestive of malignancy
    BIRADS_6 = "6"  # Known biopsy-proven malignancy


class AnalysisStatus(str, enum.Enum):
    """Analysis processing status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class Analysis(BaseModel):
    """
    Analysis model for AI predictions
    Stores model predictions, confidence scores, and explainability data
    """
    
    __tablename__ = "analyses"
    
    # Image relationship
    image_id = Column(UUID(as_uuid=True), ForeignKey("images.id"), nullable=False, index=True)
    
    # Model information
    model_version = Column(String(100), nullable=False, index=True)  # Legacy version string
    model_name = Column(String(255), nullable=True)  # e.g., "DenseNet121_Ensemble"
    model_version_id = Column(UUID(as_uuid=True), ForeignKey("model_versions.id"), nullable=True, index=True)
    
    # Prediction results
    prediction_class = Column(SQLEnum(PredictionClass), nullable=False, index=True)
    confidence_score = Column(Float, nullable=False)  # 0.0-1.0
    
    # Probability scores
    malignant_probability = Column(Float, nullable=True)  # P(malignant)
    benign_probability = Column(Float, nullable=True)  # P(benign)
    
    # Risk level
    risk_level = Column(String(50), nullable=True, index=True)  # low, moderate, high
    
    # Uncertainty quantification (MC Dropout / Ensemble)
    epistemic_uncertainty = Column(Float, nullable=True)  # Model uncertainty (knowledge gap)
    aleatoric_uncertainty = Column(Float, nullable=True)  # Data uncertainty (inherent noise)
    predictive_entropy = Column(Float, nullable=True)  # Total uncertainty
    mutual_information = Column(Float, nullable=True)  # Information gain
    requires_human_review = Column(Boolean, default=False, nullable=True)  # High uncertainty flag
    
    # Legacy field for backward compatibility
    uncertainty_score = Column(Float, nullable=True)  # MC Dropout uncertainty (0.0-1.0) - deprecated
    
    # BI-RADS assessment
    birads_category = Column(SQLEnum(BIRADSCategory), nullable=True, index=True)
    
    # Detailed predictions (probabilities for each class)
    prediction_probabilities = Column(JSONB, nullable=True)  # {"benign": 0.3, "malignant": 0.7}
    
    # Explainability data
    explainability_data = Column(JSONB, nullable=True)  # GradCAM, attention maps, etc.
    attention_map = Column(JSONB, nullable=True)  # Attention heatmap (224x224)
    suspicious_regions = Column(JSONB, nullable=True)  # List of suspicious regions with coordinates
    clinical_narrative = Column(String(2000), nullable=True)  # Clinical explanation
    confidence_explanation = Column(String(1000), nullable=True)  # Confidence explanation
    roi_coordinates = Column(JSONB, nullable=True)  # Region of interest bounding boxes (legacy)
    
    # Processing metadata
    status = Column(SQLEnum(AnalysisStatus), default=AnalysisStatus.PENDING, nullable=False, index=True)
    inference_time_ms = Column(Float, nullable=True)  # Inference time in milliseconds
    processing_time_ms = Column(Integer, nullable=True)  # Legacy field for backward compatibility
    processing_metadata = Column(JSONB, nullable=True)  # Additional metadata (case_id, timestamp, etc.)
    error_message = Column(String(1000), nullable=True)
    
    # Ensemble details (if applicable)
    ensemble_predictions = Column(JSONB, nullable=True)  # Individual model predictions
    
    # Relationships
    image = relationship("Image", back_populates="analyses")
    feedback = relationship("Feedback", back_populates="analysis", cascade="all, delete-orphan")
    model_version_ref = relationship("ModelVersion", back_populates="analyses")
    
    def __repr__(self):
        return f"<Analysis(id={self.id}, prediction={self.prediction_class}, confidence={self.confidence_score:.2f})>"
