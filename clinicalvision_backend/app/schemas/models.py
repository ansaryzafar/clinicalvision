"""
Pydantic schemas for Model Versions API

This module defines request/response schemas for AI/ML model version tracking,
lifecycle management, performance monitoring, and FDA compliance.

Standards:
- FDA 21 CFR Part 820 (SaMD Quality System Regulation)
- FDA 21 CFR Part 11 (Electronic Records)
- ISO 13485 (Medical Device Quality Management)
- ISO 14971 (Risk Management)
"""

from datetime import datetime, date
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, ConfigDict
from enum import Enum


# ============================================================================
# ENUMS
# ============================================================================

class AlgorithmTypeEnum(str, Enum):
    """Type of machine learning algorithm"""
    CNN = "cnn"
    ENSEMBLE = "ensemble"
    TRANSFER_LEARNING = "transfer_learning"
    TRANSFORMER = "transformer"
    BAYESIAN = "bayesian"
    HYBRID = "hybrid"
    TRADITIONAL_ML = "traditional_ml"


class ModelStatusEnum(str, Enum):
    """Model lifecycle status"""
    DEVELOPMENT = "development"
    VALIDATION = "validation"
    FDA_SUBMISSION = "fda_submission"
    APPROVED = "approved"
    ACTIVE = "active"
    DEPRECATED = "deprecated"
    RETIRED = "retired"
    RECALLED = "recalled"


class DeploymentEnvironmentEnum(str, Enum):
    """Deployment environment"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    RESEARCH = "research"
    CLINICAL_TRIAL = "clinical_trial"


class ValidationStatusEnum(str, Enum):
    """Validation status"""
    NOT_VALIDATED = "not_validated"
    INTERNAL_VALIDATION = "internal_validation"
    EXTERNAL_VALIDATION = "external_validation"
    CLINICAL_VALIDATION = "clinical_validation"
    FDA_CLEARED = "fda_cleared"
    FDA_APPROVED = "fda_approved"
    CE_MARKED = "ce_marked"


# ============================================================================
# BASE SCHEMAS
# ============================================================================

class ModelVersionBase(BaseModel):
    """Base schema for model version"""
    model_name: str = Field(..., description="Model identifier", max_length=255)
    version: str = Field(..., description="Semantic version (e.g., 2.1.0)", max_length=50)
    algorithm_type: AlgorithmTypeEnum = Field(..., description="Algorithm type")
    architecture: Optional[str] = Field(None, description="Model architecture", max_length=255)
    framework: Optional[str] = Field(None, description="ML framework", max_length=100)
    
    # Training info
    training_dataset_size: Optional[int] = Field(None, description="Training samples", ge=0)
    training_dataset_version: Optional[str] = Field(None, description="Dataset version", max_length=50)
    training_duration_hours: Optional[float] = Field(None, description="Training duration", ge=0)
    
    # Validation metrics (required)
    validation_metrics: Dict[str, Any] = Field(..., description="Performance metrics")
    hyperparameters: Optional[Dict[str, Any]] = Field(None, description="Training hyperparameters")
    confidence_intervals: Optional[Dict[str, Any]] = Field(None, description="95% CI for metrics")
    subgroup_performance: Optional[Dict[str, Any]] = Field(None, description="Fairness analysis")
    
    # Regulatory
    validation_status: ValidationStatusEnum = Field(
        ValidationStatusEnum.NOT_VALIDATED,
        description="Validation status"
    )
    clinical_study_id: Optional[str] = Field(None, description="IRB/trial ID", max_length=100)
    fda_approval_status: Optional[str] = Field(None, description="FDA pathway", max_length=50)
    intended_use: Optional[str] = Field(None, description="Intended use statement")
    indications_for_use: Optional[str] = Field(None, description="Indications for use")
    contraindications: Optional[str] = Field(None, description="Contraindications")
    
    # Documentation
    release_notes: Optional[str] = Field(None, description="What changed")
    known_issues: Optional[Dict[str, Any]] = Field(None, description="Known limitations")
    
    # Responsible AI
    fairness_metrics: Optional[Dict[str, Any]] = Field(None, description="Bias analysis")
    explainability_method: Optional[str] = Field(None, description="XAI method", max_length=100)
    uncertainty_quantification: bool = Field(False, description="Uncertainty quantification")
    
    # Team
    developed_by: Optional[str] = Field(None, description="Team/individual", max_length=255)
    contact_email: Optional[str] = Field(None, description="Contact email", max_length=255)
    
    model_config = ConfigDict(protected_namespaces=())


class ModelVersionCreate(ModelVersionBase):
    """Schema for creating a new model version"""
    
    model_config = ConfigDict(
        protected_namespaces=(),  # Allow model_ prefix without warnings
        json_schema_extra={
            "example": {
                "model_name": "BreastCancer_DenseNet121",
                "version": "2.1.0",
                "algorithm_type": "cnn",
                "architecture": "DenseNet121",
                "framework": "PyTorch 2.0",
                "training_dataset_size": 50000,
                "training_dataset_version": "CBIS-DDSM_v2.0",
                "training_duration_hours": 48.5,
                "validation_metrics": {
                    "accuracy": 0.912,
                    "sensitivity": 0.885,
                    "specificity": 0.925,
                    "auc_roc": 0.942,
                    "auc_pr": 0.918
                },
                "hyperparameters": {
                    "learning_rate": 0.001,
                    "batch_size": 32,
                    "epochs": 100,
                    "optimizer": "Adam"
                },
                "validation_status": "internal_validation",
                "intended_use": "Aid in detection of breast cancer in mammography screening",
                "developed_by": "ClinicalVision AI Research Team",
                "explainability_method": "GradCAM",
                "uncertainty_quantification": True
            }
        }
    )


class ModelVersionUpdate(BaseModel):
    """Schema for updating model version (partial updates)"""
    status: Optional[ModelStatusEnum] = None
    validation_status: Optional[ValidationStatusEnum] = None
    deployment_environment: Optional[DeploymentEnvironmentEnum] = None
    is_active: Optional[bool] = None
    fda_approval_status: Optional[str] = None
    fda_clearance_number: Optional[str] = None
    fda_clearance_date: Optional[str] = None
    release_notes: Optional[str] = None
    known_issues: Optional[Dict[str, Any]] = None
    production_metrics: Optional[Dict[str, Any]] = None
    performance_drift_detected: Optional[bool] = None
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "status": "active",
                "validation_status": "fda_cleared",
                "deployment_environment": "production",
                "is_active": True,
                "fda_approval_status": "510(k)",
                "fda_clearance_number": "K123456"
            }
        }
    )


class ModelVersionResponse(ModelVersionBase):
    """Schema for model version response"""
    id: UUID
    version_hash: Optional[str]
    status: ModelStatusEnum
    deployment_environment: Optional[DeploymentEnvironmentEnum]
    is_active: bool
    
    # Dates
    training_date: Optional[str]
    deployment_date: Optional[str]
    deprecation_date: Optional[str]
    retirement_date: Optional[str]
    
    # FDA info
    fda_submission_date: Optional[str]
    fda_clearance_date: Optional[str]
    fda_clearance_number: Optional[str]
    ce_marking: bool
    ce_marking_date: Optional[str]
    
    # Monitoring
    production_metrics: Optional[Dict[str, Any]]
    performance_drift_detected: bool
    last_drift_check_date: Optional[str]
    
    # Files
    model_file_path: Optional[str]
    model_file_size_mb: Optional[float]
    model_checksum: Optional[str]
    
    # Research
    paper_citation: Optional[str]
    paper_doi: Optional[str]
    
    # Ethics
    ethics_approval: bool
    ethics_board: Optional[str]
    ethics_approval_date: Optional[str]
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(
        protected_namespaces=(),
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "model_name": "BreastCancer_DenseNet121",
                "version": "2.1.0",
                "status": "active",
                "is_active": True,
                "algorithm_type": "cnn",
                "validation_metrics": {
                    "auc_roc": 0.942,
                    "sensitivity": 0.885
                },
                "deployment_environment": "production",
                "fda_clearance_number": "K123456",
                "created_at": "2024-01-15T10:30:00Z"
            }
        }
    )


class ModelVersionListResponse(BaseModel):
    """Schema for paginated list of model versions"""
    models: List[ModelVersionResponse]
    total: int
    skip: int
    limit: int
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "models": [],
                "total": 7,
                "skip": 0,
                "limit": 20
            }
        }
    )


class ModelDeploymentRequest(BaseModel):
    """Request to deploy a model"""
    environment: DeploymentEnvironmentEnum = Field(..., description="Target environment")
    deployment_notes: Optional[str] = Field(None, description="Deployment notes")
    set_as_active: bool = Field(True, description="Set as active model")
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "environment": "production",
                "deployment_notes": "Deploying v2.1.0 with improved sensitivity",
                "set_as_active": True
            }
        }
    )


class ModelComparisonRequest(BaseModel):
    """Request to compare multiple models"""
    model_version_ids: List[UUID] = Field(..., description="Model version UUIDs to compare", min_length=2)
    metrics_to_compare: Optional[List[str]] = Field(
        None,
        description="Specific metrics to compare (default: all)"
    )
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "model_version_ids": [
                    "550e8400-e29b-41d4-a716-446655440001",
                    "550e8400-e29b-41d4-a716-446655440002"
                ],
                "metrics_to_compare": ["auc_roc", "sensitivity", "specificity"]
            }
        }
    )


class ModelComparisonResponse(BaseModel):
    """Response for model comparison"""
    models: List[Dict[str, Any]]
    comparison_summary: Dict[str, Any]
    recommendation: Optional[str]
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "models": [
                    {"id": "...", "model_name": "v2.0", "auc_roc": 0.932},
                    {"id": "...", "model_name": "v2.1", "auc_roc": 0.942}
                ],
                "comparison_summary": {
                    "best_auc_roc": "v2.1",
                    "best_sensitivity": "v2.1",
                    "improvement": "+0.010 AUC-ROC"
                },
                "recommendation": "Deploy v2.1 for improved performance"
            }
        }
    )


class ModelPerformanceLogBase(BaseModel):
    """Base schema for performance log"""
    log_date: str = Field(..., description="Date of measurement (ISO format)")
    measurement_window_days: int = Field(1, description="Rolling window in days", ge=1, le=90)
    metrics: Dict[str, Any] = Field(..., description="Performance metrics")
    total_predictions: int = Field(..., description="Total predictions", ge=0)
    avg_confidence: Optional[float] = Field(None, description="Average confidence", ge=0, le=1)
    avg_inference_time_ms: Optional[float] = Field(None, description="Avg inference time", ge=0)
    feedback_received: int = Field(0, description="Feedback count", ge=0)
    agreement_rate: Optional[float] = Field(None, description="Agreement with radiologist", ge=0, le=1)
    performance_alert: bool = Field(False, description="Performance dropped")
    drift_alert: bool = Field(False, description="Drift detected")
    notes: Optional[str] = Field(None, description="Additional notes")
    
    model_config = ConfigDict(protected_namespaces=())


class ModelPerformanceLogCreate(ModelPerformanceLogBase):
    """Schema for creating performance log"""
    model_version_id: UUID = Field(..., description="Model version UUID")


class ModelPerformanceLogResponse(ModelPerformanceLogBase):
    """Schema for performance log response"""
    id: UUID
    model_version_id: UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class ModelPerformanceTrendResponse(BaseModel):
    """Response for performance trend over time"""
    model_version_id: UUID
    model_name: str
    version: str
    logs: List[ModelPerformanceLogResponse]
    trend_analysis: Dict[str, Any]
    alerts: List[Dict[str, Any]]
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "model_version_id": "550e8400-e29b-41d4-a716-446655440000",
                "model_name": "BreastCancer_DenseNet121",
                "version": "2.1.0",
                "logs": [],
                "trend_analysis": {
                    "trend": "stable",
                    "avg_auc_30d": 0.938,
                    "drift_detected": False
                },
                "alerts": []
            }
        }
    )


class ModelDriftCheckResponse(BaseModel):
    """Response for drift detection check"""
    model_version_id: UUID
    drift_detected: bool
    drift_score: float
    drift_threshold: float
    affected_metrics: List[str]
    recommendation: str
    last_check_date: str
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "model_version_id": "550e8400-e29b-41d4-a716-446655440000",
                "drift_detected": False,
                "drift_score": 0.03,
                "drift_threshold": 0.05,
                "affected_metrics": [],
                "recommendation": "No action required",
                "last_check_date": "2024-01-15T10:30:00Z"
            }
        }
    )


class ModelStatistics(BaseModel):
    """Statistics about model versions in the system"""
    total_models: int
    by_status: Dict[str, int]
    by_algorithm_type: Dict[str, int]
    active_models: int
    fda_cleared_models: int
    models_in_production: int
    avg_auc_roc: Optional[float]
    latest_version: Optional[str]
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "total_models": 7,
                "by_status": {
                    "development": 2,
                    "active": 3,
                    "deprecated": 2
                },
                "by_algorithm_type": {
                    "cnn": 5,
                    "ensemble": 2
                },
                "active_models": 3,
                "fda_cleared_models": 2,
                "models_in_production": 1,
                "avg_auc_roc": 0.935,
                "latest_version": "2.1.0"
            }
        }
    )


# ============================================================================
# ERROR RESPONSES
# ============================================================================

class ErrorResponse(BaseModel):
    """Standard error response"""
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "error": "Model version not found",
                "detail": "No model found with ID: 550e8400-e29b-41d4-a716-446655440000",
                "timestamp": "2024-01-15T10:30:00Z"
            }
        }
    )
