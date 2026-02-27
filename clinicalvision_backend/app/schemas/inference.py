"""
Inference/Analysis Request and Response Schemas
Pydantic models for AI prediction API
"""

from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Dict, Any
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


# ============================================================================
# Core Prediction Components
# ============================================================================

class PredictionResult(BaseModel):
    """Core prediction output from AI model"""
    prediction: PredictionClass = Field(..., description="Binary classification result")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Model confidence score (0-1)")
    probabilities: Dict[str, float] = Field(..., description="Class probabilities")
    risk_level: RiskLevel = Field(..., description="Clinical risk level")
    
    model_config = ConfigDict(protected_namespaces=(), use_enum_values=True)


class UncertaintyMetrics(BaseModel):
    """Uncertainty quantification metrics from MC Dropout inference"""
    epistemic_uncertainty: float = Field(..., ge=0.0, description="Model uncertainty (variance from MC Dropout)")
    aleatoric_uncertainty: Optional[float] = Field(None, ge=0.0, description="Data uncertainty (inherent noise)")
    predictive_entropy: float = Field(..., ge=0.0, description="Total prediction uncertainty (entropy)")
    mutual_information: Optional[float] = Field(None, ge=0.0, description="Information gain")
    mc_samples: Optional[int] = Field(None, ge=1, description="Number of MC Dropout samples used")
    mc_std: Optional[float] = Field(None, ge=0.0, description="Standard deviation of MC Dropout predictions")
    requires_human_review: bool = Field(..., description="Flag for cases requiring radiologist review")


class SuspiciousRegion(BaseModel):
    """Detected suspicious region with location in both coordinate systems"""
    region_id: int = Field(..., description="Unique region identifier")
    bbox: List[int] = Field(..., description="Bounding box [x, y, width, height] in model space (224x224)")
    bbox_model: Optional[List[int]] = Field(None, description="Bounding box in model space (224x224)")
    bbox_original: Optional[List[int]] = Field(None, description="Bounding box in original image space")
    attention_score: float = Field(..., ge=0.0, le=1.0, description="Attention weight")
    location: str = Field(..., description="Anatomical location description")
    area_pixels: Optional[int] = Field(None, ge=0, description="Region area in pixels (model space)")
    area_pixels_original: Optional[int] = Field(None, ge=0, description="Region area in pixels (original image)")


class ImageMetadata(BaseModel):
    """Metadata about the original image for coordinate transformation"""
    original_width: int = Field(..., ge=1, description="Original image width in pixels")
    original_height: int = Field(..., ge=1, description="Original image height in pixels")
    model_width: int = Field(default=224, description="Model input width (224)")
    model_height: int = Field(default=224, description="Model input height (224)")
    scale_x: float = Field(..., gt=0, description="Scale factor: original_width / model_width")
    scale_y: float = Field(..., gt=0, description="Scale factor: original_height / model_height")
    aspect_ratio: float = Field(..., gt=0, description="Original image aspect ratio")
    coordinate_system: str = Field(default="model", description="Coordinate system used (model or original)")


# ============================================================================
# Tile-Based Analysis Schemas (Phase 2)
# ============================================================================

class AnalysisModeEnum(str, Enum):
    """Analysis mode for tile-based inference"""
    GLOBAL_ONLY = "global_only"           # Quick: only 224×224 downsampled
    ATTENTION_GUIDED = "attention_guided"  # Default: tiles from high-attention areas
    FULL_COVERAGE = "full_coverage"        # Comprehensive: all tiles with overlap


class TileConfig(BaseModel):
    """Configuration for tile-based analysis"""
    tile_size: int = Field(default=224, ge=64, le=512, description="Size of each tile in pixels")
    overlap: float = Field(default=0.25, ge=0.0, le=0.75, description="Overlap between tiles (0-0.75)")
    attention_threshold: float = Field(default=0.3, ge=0.0, le=1.0, description="Min attention to analyze tile")
    max_tiles: int = Field(default=50, ge=1, le=200, description="Maximum tiles to analyze")


class TileAnalysisRequest(BaseModel):
    """Request for tile-based analysis"""
    mode: AnalysisModeEnum = Field(default=AnalysisModeEnum.ATTENTION_GUIDED, description="Analysis mode")
    config: Optional[TileConfig] = Field(None, description="Optional tile configuration")
    save_result: bool = Field(default=False, description="Save prediction to database")
    
    model_config = ConfigDict(use_enum_values=True)


class TileInfo(BaseModel):
    """Information about an analyzed tile"""
    tile_id: int = Field(..., description="Tile identifier")
    position: List[int] = Field(..., description="[x, y] position in original image")
    attention_score: float = Field(..., ge=0.0, le=1.0, description="Average attention in tile")
    breast_coverage: float = Field(..., ge=0.0, le=1.0, description="Fraction of breast tissue")
    prediction: str = Field(..., description="Tile prediction (benign/malignant)")
    malignancy_prob: float = Field(..., ge=0.0, le=1.0, description="Malignancy probability")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Prediction confidence")


class TileAnalysisMetrics(BaseModel):
    """Aggregated metrics from tile analysis"""
    global_probability: float = Field(..., ge=0.0, le=1.0, description="Probability from global analysis")
    tile_weighted_average: float = Field(..., ge=0.0, le=1.0, description="Attention-weighted tile average")
    tile_max_probability: float = Field(..., ge=0.0, le=1.0, description="Maximum tile probability")
    final_probability: float = Field(..., ge=0.0, le=1.0, description="Final aggregated probability")
    tiles: List[TileInfo] = Field(default_factory=list, description="Individual tile results")


class ExplanationData(BaseModel):
    """Explainable AI outputs"""
    attention_map: Optional[List[List[float]]] = Field(None, description="Attention heatmap (224x224)")
    suspicious_regions: List[SuspiciousRegion] = Field(default_factory=list, description="Detected suspicious areas")
    narrative: str = Field(..., description="Clinical narrative explanation")
    confidence_explanation: str = Field(..., description="Explanation of confidence level")


class TileAnalysisResponse(BaseModel):
    """Response from tile-based analysis"""
    # Core prediction
    prediction: PredictionClass
    confidence: float = Field(ge=0.0, le=1.0)
    probabilities: Dict[str, float]
    risk_level: RiskLevel
    
    # Uncertainty
    uncertainty: UncertaintyMetrics
    
    # Explanation with regions in original coordinates
    explanation: ExplanationData
    
    # Image and analysis metadata
    image_metadata: ImageMetadata
    analysis_mode: str = Field(..., description="Analysis mode used")
    tiles_analyzed: int = Field(..., ge=0, description="Number of tiles analyzed")
    tile_analysis: Optional[TileAnalysisMetrics] = Field(None, description="Detailed tile metrics")
    
    # Standard metadata
    case_id: str
    image_id: Optional[Any] = None
    model_version: str
    inference_time_ms: float
    timestamp: str
    
    model_config = ConfigDict(use_enum_values=True, protected_namespaces=())


class AnalysisMetadata(BaseModel):
    """Metadata about the inference process"""
    case_id: str = Field(..., description="Unique case identifier")
    image_id: Optional[Any] = Field(None, description="Database image ID")
    model_version: str = Field(..., description="Model version used")
    inference_time_ms: float = Field(..., gt=0, description="Inference time in milliseconds")
    timestamp: str = Field(..., description="ISO timestamp of inference")
    
    model_config = ConfigDict(protected_namespaces=())


# ============================================================================
# Single Image Inference
# ============================================================================

class InferenceRequest(BaseModel):
    """Request for single image inference (file upload handled separately)"""
    save_result: bool = Field(default=False, description="Save prediction to database")
    model_version: Optional[str] = Field(None, description="Specific model version to use")
    
    model_config = ConfigDict(protected_namespaces=())


class InferenceResponse(BaseModel):
    """Complete single image inference response"""
    # Core prediction
    prediction: PredictionClass
    confidence: float = Field(ge=0.0, le=1.0)
    probabilities: Dict[str, float]
    risk_level: RiskLevel
    
    # Uncertainty quantification
    uncertainty: UncertaintyMetrics
    
    # Explainable AI
    explanation: ExplanationData
    
    # Image metadata for coordinate transformation (full-size mammogram support)
    image_metadata: Optional[ImageMetadata] = Field(None, description="Original image dimensions for coordinate mapping")
    
    # Metadata
    case_id: str
    image_id: Optional[Any] = None
    model_version: str
    inference_time_ms: float
    timestamp: str
    
    model_config = ConfigDict(
        use_enum_values=True,
        protected_namespaces=(),  # Allow model_ prefix without warnings
        json_schema_extra={
            "example": {
                "prediction": "malignant",
                "confidence": 0.87,
                "probabilities": {
                    "benign": 0.13,
                    "malignant": 0.87
                },
                "risk_level": "high",
                "uncertainty": {
                    "epistemic_uncertainty": 0.08,
                    "aleatoric_uncertainty": 0.05,
                    "predictive_entropy": 0.42,
                    "mutual_information": 0.03,
                    "requires_human_review": False
                },
                "explanation": {
                    "attention_map": None,
                    "suspicious_regions": [
                        {
                            "region_id": 1,
                            "bbox": [120, 80, 45, 50],
                            "attention_score": 0.92,
                            "location": "upper outer quadrant"
                        }
                    ],
                    "narrative": "High-density irregular mass detected in upper outer quadrant with spiculated margins.",
                    "confidence_explanation": "High confidence based on clear morphological features typical of malignancy."
                },
                "case_id": "case_20260112_143520_a3f8b9c2",
                "image_id": 1234,
                "model_version": "ensemble-v2.1",
                "inference_time_ms": 1250.5,
                "timestamp": "2026-01-12T14:35:20.123456"
            }
        }
    )


# ============================================================================
# Bilateral Inference (4 views)
# ============================================================================

class BilateralInferenceRequest(BaseModel):
    """Request for bilateral mammogram study inference"""
    image_ids: Dict[str, int] = Field(
        ...,
        description="Image IDs for all 4 views: left_cc, right_cc, left_mlo, right_mlo"
    )
    model_version: Optional[str] = Field(None, description="Specific model version to use")
    
    @field_validator("image_ids")
    @classmethod
    def validate_image_ids(cls, v):
        required_views = ["left_cc", "right_cc", "left_mlo", "right_mlo"]
        missing = [view for view in required_views if view not in v]
        if missing:
            raise ValueError(f"Missing required views: {missing}")
        return v
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "image_ids": {
                    "left_cc": 123,
                    "right_cc": 124,
                    "left_mlo": 125,
                    "right_mlo": 126
                },
                "model_version": "ensemble-v2.1"
            }
        }
    )


class ViewPrediction(InferenceResponse):
    """Prediction for individual view in bilateral study"""
    view: str = Field(..., description="View name (left_cc, right_cc, left_mlo, right_mlo)")


class BilateralStatistics(BaseModel):
    """Aggregated statistics from bilateral study"""
    max_malignant_probability: float = Field(ge=0.0, le=1.0)
    most_suspicious_view: str
    average_malignant_probability: float = Field(ge=0.0, le=1.0)
    average_benign_probability: float = Field(ge=0.0, le=1.0)
    suspicious_view_count: int = Field(ge=0, le=4)
    suspicious_views: List[str]
    max_uncertainty: float = Field(ge=0.0)
    average_uncertainty: float = Field(ge=0.0)
    
    model_config = ConfigDict(protected_namespaces=())


class BilateralInferenceResponse(BaseModel):
    """Complete bilateral study inference response"""
    # Overall assessment
    overall_prediction: PredictionClass
    overall_confidence: float = Field(ge=0.0, le=1.0)
    overall_risk_level: RiskLevel
    
    # Individual view predictions
    view_predictions: Dict[str, Dict[str, Any]]
    
    # Aggregation metadata
    aggregation_method: str = Field(default="max_pooling")
    statistics: BilateralStatistics
    
    # Metadata
    case_id: str
    model_version: str
    inference_time_ms: float
    timestamp: str
    
    model_config = ConfigDict(
        use_enum_values=True,
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "overall_prediction": "malignant",
                "overall_confidence": 0.89,
                "overall_risk_level": "high",
                "view_predictions": {
                    "left_cc": {
                        "prediction": "malignant",
                        "confidence": 0.89,
                        "risk_level": "high"
                    },
                    "right_cc": {
                        "prediction": "benign",
                        "confidence": 0.72,
                        "risk_level": "low"
                    },
                    "left_mlo": {
                        "prediction": "malignant",
                        "confidence": 0.81,
                        "risk_level": "moderate"
                    },
                    "right_mlo": {
                        "prediction": "benign",
                        "confidence": 0.68,
                        "risk_level": "low"
                    }
                },
                "aggregation_method": "max_pooling",
                "statistics": {
                    "max_malignant_probability": 0.89,
                    "most_suspicious_view": "left_cc",
                    "average_malignant_probability": 0.52,
                    "average_benign_probability": 0.48,
                    "suspicious_view_count": 2,
                    "suspicious_views": ["left_cc", "left_mlo"],
                    "max_uncertainty": 0.12,
                    "average_uncertainty": 0.09
                },
                "case_id": "bilateral_20260112_143520_x9y2k3p4",
                "model_version": "ensemble-v2.1",
                "inference_time_ms": 4850.2,
                "timestamp": "2026-01-12T14:35:25.987654"
            }
        }
    )


# ============================================================================
# Inference History
# ============================================================================

class AnalysisHistoryResponse(BaseModel):
    """Historical inference record"""
    id: int = Field(..., description="Analysis record ID")
    image_id: int = Field(..., description="Image ID")
    model_version: str = Field(..., description="Model version used")
    prediction_class: PredictionClass = Field(..., description="Prediction result")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score")
    risk_level: RiskLevel = Field(..., description="Risk level")
    epistemic_uncertainty: float = Field(..., description="Epistemic uncertainty")
    requires_human_review: bool = Field(..., description="Review flag")
    inference_time_ms: float = Field(..., description="Inference time")
    created_at: datetime = Field(..., description="Timestamp")
    
    model_config = ConfigDict(
        use_enum_values=True,
        from_attributes=True,
        protected_namespaces=()
    )


# ============================================================================
# Statistics
# ============================================================================

class InferenceStatsResponse(BaseModel):
    """Comprehensive inference statistics"""
    total_inferences: int = Field(0, description="Total inference count")
    prediction_distribution: Dict[str, int] = Field(default_factory=dict, description="Count by prediction class")
    risk_level_distribution: Dict[str, int] = Field(default_factory=dict, description="Count by risk level")
    average_confidence: float = Field(0.0, ge=0.0, le=1.0, description="Average confidence")
    average_epistemic_uncertainty: float = Field(0.0, ge=0.0, description="Average uncertainty")
    average_inference_time_ms: float = Field(0.0, ge=0.0, description="Average inference time")
    high_uncertainty_count: int = Field(0, description="Cases requiring review")
    
    model_config = ConfigDict(
        protected_namespaces=(),  # Allow model_ prefix without warnings
        json_schema_extra={
            "example": {
                "total_inferences": 1523,
                "prediction_distribution": {
                    "benign": 1124,
                    "malignant": 399
                },
                "risk_level_distribution": {
                    "low": 1098,
                    "moderate": 312,
                    "high": 113
                },
                "average_confidence": 0.84,
                "average_epistemic_uncertainty": 0.09,
                "average_inference_time_ms": 1285.4,
                "high_uncertainty_count": 187
            }
        }
    )


# ============================================================================
# Explainability (GradCAM, LIME, SHAP) Schemas
# ============================================================================

class ExplainabilityMethodEnum(str, Enum):
    """Available explainability methods - comprehensive XAI suite"""
    # Gradient-based methods (model-specific for CNNs)
    GRADCAM = "gradcam"
    GRADCAM_PLUS_PLUS = "gradcam++"
    INTEGRATED_GRADIENTS = "integrated_gradients"
    
    # Model-agnostic methods
    LIME = "lime"
    SHAP = "shap"
    
    # Comparison mode
    ALL = "all"


class GradCAMRequest(BaseModel):
    """Request for generating GradCAM explanation"""
    method: ExplainabilityMethodEnum = Field(
        default=ExplainabilityMethodEnum.GRADCAM_PLUS_PLUS,
        description="Explainability method to use"
    )
    target_layer: Optional[str] = Field(
        None, 
        description="Target convolutional layer (auto-detected if not specified)"
    )
    output_format: str = Field(
        default="heatmap",
        description="Output format: 'heatmap' (2D array), 'image' (base64 PNG), 'overlay' (base64 blended)"
    )
    colormap: str = Field(
        default="jet",
        description="Colormap for visualization (jet, viridis, hot, etc.)"
    )
    overlay_alpha: float = Field(
        default=0.4,
        ge=0.0,
        le=1.0,
        description="Overlay opacity when format is 'overlay'"
    )
    
    model_config = ConfigDict(use_enum_values=True)


class GradCAMResponse(BaseModel):
    """Response containing GradCAM explanation"""
    method_used: str = Field(..., description="Actual method used")
    target_layer: Optional[str] = Field(None, description="Layer used for visualization")
    attention_map: Optional[List[List[float]]] = Field(
        None, 
        description="Attention heatmap as 2D array (when format='heatmap')"
    )
    attention_image: Optional[str] = Field(
        None,
        description="Base64-encoded heatmap image (when format='image' or 'overlay')"
    )
    suspicious_regions: List[SuspiciousRegion] = Field(
        default_factory=list,
        description="Detected suspicious regions"
    )
    image_metadata: Optional[ImageMetadata] = Field(
        None,
        description="Original image metadata for coordinate mapping"
    )
    inference_time_ms: float = Field(..., description="Time to generate explanation")
    
    model_config = ConfigDict(protected_namespaces=())


# ============================================================================
# XAI Validation and Quality Schemas
# ============================================================================

class ValidationResultEnum(str, Enum):
    """Validation result status"""
    PASSED = "passed"
    WARNING = "warning"
    FAILED = "failed"


class QualityMetricEnum(str, Enum):
    """Quality metric types"""
    SPARSITY = "sparsity"
    COHERENCE = "coherence"
    LOCALIZATION = "localization"
    FAITHFULNESS = "faithfulness"
    STABILITY = "stability"
    PLAUSIBILITY = "plausibility"
    OVERALL = "overall"


class QualityScoreResponse(BaseModel):
    """Individual quality metric score"""
    metric: QualityMetricEnum = Field(..., description="Quality metric name")
    score: float = Field(..., ge=0.0, le=1.0, description="Normalized score (0-1)")
    status: ValidationResultEnum = Field(..., description="Pass/warn/fail status")
    details: str = Field(..., description="Human-readable details")
    threshold: float = Field(..., ge=0.0, le=1.0, description="Threshold for passing")
    passed: bool = Field(..., description="Whether metric passed")
    
    model_config = ConfigDict(use_enum_values=True)


class XAIValidationRequest(BaseModel):
    """Request for XAI validation"""
    attention_map: List[List[float]] = Field(..., description="Attention map to validate")
    known_regions: Optional[List[Dict[str, Any]]] = Field(
        None, description="Ground truth regions for localization check"
    )
    include_faithfulness: bool = Field(
        default=False, description="Include faithfulness check (requires model inference)"
    )
    
    model_config = ConfigDict(protected_namespaces=())


class XAIValidationResponse(BaseModel):
    """Response from XAI validation"""
    overall_score: float = Field(..., ge=0.0, le=1.0, description="Overall quality score")
    overall_status: ValidationResultEnum = Field(..., description="Overall status")
    metrics: List[QualityScoreResponse] = Field(default_factory=list, description="Individual metrics")
    recommendations: List[str] = Field(default_factory=list, description="Improvement recommendations")
    warnings: List[str] = Field(default_factory=list, description="Warning messages")
    passed: bool = Field(..., description="Whether validation passed")
    timestamp: str = Field(..., description="ISO timestamp")
    
    model_config = ConfigDict(use_enum_values=True, protected_namespaces=())


class AttentionQualityRequest(BaseModel):
    """Quick quality check request"""
    attention_map: List[List[float]] = Field(..., description="Attention map to check")
    include_details: bool = Field(default=False, description="Include detailed metrics")


class AttentionQualityResponse(BaseModel):
    """Quick quality score response"""
    quality_score: float = Field(..., ge=0.0, le=1.0, description="Quality score (0-1)")
    quality_level: str = Field(..., description="Quality level (excellent, good, acceptable, poor)")
    is_acceptable: bool = Field(..., description="Whether quality is acceptable")
    details: Optional[Dict[str, float]] = Field(None, description="Detailed metric scores")


# ============================================================================
# Clinical Narrative Schemas
# ============================================================================

class BIRADSCategoryEnum(str, Enum):
    """ACR BI-RADS Assessment Categories"""
    BIRADS_0 = "0"  # Incomplete
    BIRADS_1 = "1"  # Negative
    BIRADS_2 = "2"  # Benign
    BIRADS_3 = "3"  # Probably Benign
    BIRADS_4A = "4A"  # Low Suspicion
    BIRADS_4B = "4B"  # Moderate Suspicion
    BIRADS_4C = "4C"  # High Suspicion
    BIRADS_5 = "5"  # Highly Suggestive
    BIRADS_6 = "6"  # Known Malignancy


class ClinicalNarrativeRequest(BaseModel):
    """Request for clinical narrative generation"""
    prediction: PredictionClass = Field(..., description="Model prediction")
    malignancy_probability: float = Field(..., ge=0.0, le=1.0, description="Probability of malignancy")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Model confidence")
    uncertainty: float = Field(..., ge=0.0, description="Epistemic uncertainty (variance)")
    suspicious_regions: List[Dict[str, Any]] = Field(
        default_factory=list, description="Detected suspicious regions"
    )
    attention_quality: Optional[float] = Field(
        None, ge=0.0, le=1.0, description="Attention map quality score"
    )
    patient_context: Optional[Dict[str, Any]] = Field(
        None, description="Optional patient information"
    )
    
    model_config = ConfigDict(use_enum_values=True, protected_namespaces=())


class ClinicalRecommendation(BaseModel):
    """Clinical recommendation"""
    action: str = Field(..., description="Recommended action")
    urgency: str = Field(..., description="Urgency level (routine, timely, urgent)")
    timeframe: Optional[str] = Field(None, description="Recommended timeframe")
    rationale: str = Field(..., description="Reason for recommendation")


class ClinicalNarrativeResponse(BaseModel):
    """Response with clinical narrative"""
    impression: str = Field(..., description="Clinical impression summary")
    birads_category: BIRADSCategoryEnum = Field(..., description="Suggested BI-RADS category")
    birads_description: str = Field(..., description="BI-RADS category description")
    findings: List[str] = Field(default_factory=list, description="List of findings")
    recommendations: List[str] = Field(default_factory=list, description="Clinical recommendations")
    technical_notes: str = Field(..., description="Technical analysis details")
    confidence_explanation: str = Field(..., description="Explanation of confidence level")
    limitations: List[str] = Field(default_factory=list, description="Analysis limitations")
    disclaimer: str = Field(..., description="Standard disclaimer")
    generated_at: str = Field(..., description="Generation timestamp")
    
    model_config = ConfigDict(use_enum_values=True, protected_namespaces=())


# ============================================================================
# LIME (Local Interpretable Model-agnostic Explanations) Schemas
# ============================================================================

class LIMESegmentInfo(BaseModel):
    """Information about a LIME superpixel segment"""
    segment_id: int = Field(..., description="Unique segment identifier")
    rank: int = Field(..., description="Importance rank (1 = most important)")
    importance: float = Field(..., description="Segment importance score")
    bbox: List[int] = Field(..., description="Bounding box [x, y, width, height]")
    centroid: List[int] = Field(..., description="Segment centroid [x, y]")
    area_fraction: float = Field(..., ge=0.0, le=1.0, description="Fraction of image area")
    location: str = Field(..., description="Anatomical location")


class LIMERequest(BaseModel):
    """Request for LIME explanation"""
    n_segments: int = Field(default=50, ge=10, le=200, description="Number of superpixels")
    n_samples: int = Field(default=100, ge=50, le=500, description="Number of perturbed samples")
    top_k_features: int = Field(default=10, ge=1, le=50, description="Number of top features to return")
    output_format: str = Field(default="heatmap", description="Output format: 'heatmap', 'image', 'overlay'")
    colormap: str = Field(default="RdBu", description="Colormap for visualization")
    overlay_alpha: float = Field(default=0.5, ge=0.0, le=1.0, description="Overlay opacity")
    
    model_config = ConfigDict(protected_namespaces=())


class LIMEResponse(BaseModel):
    """Response containing LIME explanation"""
    lime_map: List[List[float]] = Field(..., description="LIME explanation heatmap")
    lime_image: Optional[str] = Field(None, description="Base64-encoded visualization")
    top_regions: List[LIMESegmentInfo] = Field(default_factory=list, description="Most important regions")
    segment_importance: Dict[str, float] = Field(default_factory=dict, description="Importance by segment ID")
    n_segments: int = Field(..., description="Total number of segments")
    n_samples: int = Field(..., description="Number of samples used")
    method_used: str = Field(..., description="LIME variant used")
    inference_time_ms: float = Field(..., description="Time to generate explanation")
    
    model_config = ConfigDict(protected_namespaces=())


# ============================================================================
# SHAP (SHapley Additive exPlanations) Schemas
# ============================================================================

class SHAPMethodEnum(str, Enum):
    """SHAP computation methods"""
    DEEP = "deep"           # DeepSHAP using DeepLIFT
    GRADIENT = "gradient"   # GradientSHAP
    PARTITION = "partition" # PartitionSHAP for images
    KERNEL = "kernel"       # KernelSHAP (model-agnostic)


class SHAPRegionInfo(BaseModel):
    """Information about a SHAP-identified region"""
    region_id: int = Field(..., description="Region identifier")
    bbox: List[int] = Field(..., description="Bounding box [x, y, width, height]")
    centroid: List[int] = Field(..., description="Region centroid [x, y]")
    mean_shap: float = Field(..., description="Mean SHAP value in region")
    area_fraction: float = Field(..., ge=0.0, le=1.0, description="Fraction of image area")
    contribution_type: str = Field(..., description="'supports_malignancy' or 'supports_benign'")
    location: str = Field(..., description="Anatomical location")


class SHAPRequest(BaseModel):
    """Request for SHAP explanation"""
    method: SHAPMethodEnum = Field(default=SHAPMethodEnum.GRADIENT, description="SHAP method")
    n_samples: int = Field(default=50, ge=20, le=200, description="Number of samples for GradientSHAP")
    n_background: int = Field(default=50, ge=10, le=100, description="Number of background samples")
    output_format: str = Field(default="heatmap", description="Output format: 'heatmap', 'image', 'overlay'")
    colormap: str = Field(default="RdBu_r", description="Diverging colormap for visualization")
    overlay_alpha: float = Field(default=0.5, ge=0.0, le=1.0, description="Overlay opacity")
    
    model_config = ConfigDict(use_enum_values=True, protected_namespaces=())


class SHAPResponse(BaseModel):
    """Response containing SHAP explanation"""
    shap_map: List[List[float]] = Field(..., description="SHAP attribution heatmap (normalized)")
    shap_image: Optional[str] = Field(None, description="Base64-encoded visualization")
    base_value: float = Field(..., description="Expected model output (baseline)")
    prediction_contribution: float = Field(..., description="Sum of SHAP values")
    feature_importance: Dict[str, float] = Field(
        default_factory=dict, 
        description="Aggregated feature importance (total_positive, total_negative, net)"
    )
    positive_regions: List[SHAPRegionInfo] = Field(
        default_factory=list, description="Regions supporting malignancy"
    )
    negative_regions: List[SHAPRegionInfo] = Field(
        default_factory=list, description="Regions supporting benign"
    )
    method_used: str = Field(..., description="SHAP variant used")
    n_samples: int = Field(..., description="Number of samples used")
    n_background: int = Field(..., description="Number of background samples")
    inference_time_ms: float = Field(..., description="Time to generate explanation")
    
    model_config = ConfigDict(protected_namespaces=())


# ============================================================================
# XAI Comparison Schema (Compare GradCAM, LIME, SHAP)
# ============================================================================

class XAIComparisonRequest(BaseModel):
    """Request to compare multiple XAI methods"""
    methods: List[ExplainabilityMethodEnum] = Field(
        default=[
            ExplainabilityMethodEnum.GRADCAM_PLUS_PLUS,
            ExplainabilityMethodEnum.LIME,
            ExplainabilityMethodEnum.SHAP
        ],
        description="Methods to compare"
    )
    output_format: str = Field(default="heatmap", description="Output format for all methods")
    include_overlay: bool = Field(default=True, description="Include overlaid images")
    
    model_config = ConfigDict(use_enum_values=True, protected_namespaces=())


class XAIMethodResult(BaseModel):
    """Result from a single XAI method"""
    method: str = Field(..., description="Method name")
    attention_map: List[List[float]] = Field(..., description="Normalized heatmap [0-1]")
    attention_image: Optional[str] = Field(None, description="Base64-encoded visualization")
    top_regions: List[Dict[str, Any]] = Field(default_factory=list, description="Most important regions")
    inference_time_ms: float = Field(..., description="Generation time")
    method_specific: Dict[str, Any] = Field(default_factory=dict, description="Method-specific metadata")


class XAIComparisonResponse(BaseModel):
    """Response comparing multiple XAI methods"""
    methods_compared: List[str] = Field(..., description="Methods that were compared")
    results: Dict[str, XAIMethodResult] = Field(..., description="Results by method name")
    agreement_score: float = Field(..., ge=0.0, le=1.0, description="Agreement between methods")
    consensus_regions: List[Dict[str, Any]] = Field(
        default_factory=list, description="Regions identified by multiple methods"
    )
    total_inference_time_ms: float = Field(..., description="Total time for all methods")
    summary: str = Field(..., description="Natural language comparison summary")
    
    model_config = ConfigDict(protected_namespaces=())
