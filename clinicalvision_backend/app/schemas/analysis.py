"""
Schemas for mammogram analysis requests and responses
Defines the data contract for AI predictions and explanations
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
from datetime import datetime
from enum import Enum


class PredictionClass(str, Enum):
    """Classification result categories"""
    BENIGN = "benign"
    MALIGNANT = "malignant"


class RiskLevel(str, Enum):
    """Clinical risk categorization"""
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"


class PredictionResult(BaseModel):
    """
    Core prediction output from the AI model
    """
    prediction: PredictionClass = Field(
        ...,
        description="Binary classification result"
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Model confidence score (0-1)"
    )
    probabilities: Dict[str, float] = Field(
        ...,
        description="Class probabilities for benign and malignant"
    )
    risk_level: RiskLevel = Field(
        ...,
        description="Interpreted clinical risk level"
    )
    
    model_config = ConfigDict(protected_namespaces=(), use_enum_values=True)


class UncertaintyMetrics(BaseModel):
    """
    Uncertainty quantification metrics from MC Dropout or ensemble
    """
    epistemic_uncertainty: float = Field(
        ...,
        ge=0.0,
        description="Model uncertainty (knowledge gap)"
    )
    aleatoric_uncertainty: Optional[float] = Field(
        None,
        ge=0.0,
        description="Data uncertainty (inherent noise)"
    )
    predictive_entropy: float = Field(
        ...,
        ge=0.0,
        description="Total prediction uncertainty"
    )
    mutual_information: Optional[float] = Field(
        None,
        ge=0.0,
        description="Information gain from model uncertainty"
    )
    requires_human_review: bool = Field(
        ...,
        description="Flag indicating high uncertainty requiring radiologist review"
    )


class SuspiciousRegion(BaseModel):
    """
    Detected suspicious region with location and characteristics
    """
    region_id: int = Field(..., description="Unique region identifier")
    bbox: List[int] = Field(..., description="Bounding box [x, y, width, height]")
    attention_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Attention weight for this region"
    )
    location: str = Field(..., description="Anatomical location description")


class ExplanationData(BaseModel):
    """
    Explainable AI outputs including attention maps and clinical narratives
    """
    attention_map: List[List[float]] = Field(
        ...,
        description="2D attention heatmap (224x224)"
    )
    suspicious_regions: List[SuspiciousRegion] = Field(
        default_factory=list,
        description="Identified regions of interest"
    )
    clinical_narrative: str = Field(
        ...,
        description="Human-readable clinical explanation"
    )
    recommendation: str = Field(
        ...,
        description="Clinical action recommendation"
    )


class AnalysisMetadata(BaseModel):
    """
    Metadata about the analysis process
    """
    case_id: str = Field(..., description="Unique case identifier")
    model_version: str = Field(..., description="Model version used")
    inference_time_ms: float = Field(..., description="Inference time in milliseconds")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Analysis timestamp (UTC)"
    )
    
    model_config = ConfigDict(protected_namespaces=())


class AnalysisResponse(BaseModel):
    """
    Complete analysis response combining all AI outputs
    This is the main response schema for the /analyze endpoint
    """
    metadata: AnalysisMetadata
    prediction: PredictionResult
    uncertainty: UncertaintyMetrics
    explanation: ExplanationData
    
    model_config = ConfigDict(
        protected_namespaces=(),  # Allow model_ prefix without warnings
        json_schema_extra={
            "example": {
                "metadata": {
                    "case_id": "case_20260105_001",
                    "model_version": "resnet50-v1.0",
                    "inference_time_ms": 1250.5,
                    "timestamp": "2026-01-05T10:30:00Z"
                },
                "prediction": {
                    "prediction": "malignant",
                    "confidence": 0.85,
                    "probabilities": {
                        "benign": 0.15,
                        "malignant": 0.85
                    },
                    "risk_level": "high"
                },
                "uncertainty": {
                    "epistemic_uncertainty": 0.12,
                    "predictive_entropy": 0.45,
                    "requires_human_review": False
                },
                "explanation": {
                    "attention_map": [[0.1, 0.2], [0.3, 0.4]],
                    "suspicious_regions": [
                        {
                            "region_id": 1,
                            "bbox": [100, 150, 50, 50],
                            "attention_score": 0.92,
                            "location": "upper outer quadrant"
                        }
                    ],
                    "clinical_narrative": "AI analysis detected irregular density...",
                    "recommendation": "Recommend biopsy for further evaluation"
                }
            }
        }
    )
