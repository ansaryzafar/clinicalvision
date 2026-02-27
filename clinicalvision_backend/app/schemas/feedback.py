"""
Schemas for radiologist feedback collection
Enables continuous learning and model improvement
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from enum import Enum


class AgreementLevel(str, Enum):
    """Radiologist agreement with AI prediction"""
    STRONGLY_DISAGREE = "strongly_disagree"
    DISAGREE = "disagree"
    NEUTRAL = "neutral"
    AGREE = "agree"
    STRONGLY_AGREE = "strongly_agree"


class DiagnosisType(str, Enum):
    """Radiologist's final diagnosis"""
    BENIGN = "benign"
    MALIGNANT = "malignant"
    UNCERTAIN = "uncertain"


class FeedbackCreate(BaseModel):
    """
    Feedback submission from radiologist
    Used for model validation and continuous improvement
    """
    case_id: str = Field(..., description="Reference to analyzed case")
    radiologist_id: Optional[str] = Field(
        None,
        description="Radiologist identifier (anonymized)"
    )
    ai_prediction: str = Field(
        ...,
        description="Original AI prediction"
    )
    radiologist_diagnosis: DiagnosisType = Field(
        ...,
        description="Radiologist's final diagnosis"
    )
    agreement_score: AgreementLevel = Field(
        ...,
        description="Level of agreement with AI"
    )
    feedback_notes: Optional[str] = Field(
        None,
        max_length=1000,
        description="Additional comments or observations"
    )
    time_to_review_seconds: Optional[int] = Field(
        None,
        description="Time spent reviewing the case"
    )
    
    model_config = ConfigDict(protected_namespaces=(), use_enum_values=True)


class FeedbackResponse(BaseModel):
    """
    Response after feedback submission
    """
    feedback_id: str = Field(..., description="Unique feedback identifier")
    case_id: str
    status: str = Field(default="recorded", description="Processing status")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Feedback submission timestamp"
    )
    message: str = Field(
        default="Feedback recorded successfully",
        description="Confirmation message"
    )
