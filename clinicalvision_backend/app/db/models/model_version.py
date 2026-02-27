"""
Model Version Tracking System
FDA compliance for AI/ML as a Medical Device (SaMD)
Tracks algorithm versions, validation metrics, deployment history
"""

from sqlalchemy import Column, String, Float, Enum as SQLEnum, Boolean, Integer, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum
from datetime import datetime

from app.db.base import BaseModel


class AlgorithmType(str, enum.Enum):
    """Type of machine learning algorithm"""
    CNN = "cnn"  # Convolutional Neural Network
    ENSEMBLE = "ensemble"  # Ensemble of models
    TRANSFER_LEARNING = "transfer_learning"
    TRANSFORMER = "transformer"
    BAYESIAN = "bayesian"
    HYBRID = "hybrid"
    TRADITIONAL_ML = "traditional_ml"  # Random Forest, SVM, etc.


class ModelStatus(str, enum.Enum):
    """Model lifecycle status"""
    DEVELOPMENT = "development"  # In training/testing
    VALIDATION = "validation"  # Clinical validation
    FDA_SUBMISSION = "fda_submission"  # Regulatory review
    APPROVED = "approved"  # Approved for use
    ACTIVE = "active"  # Currently deployed
    DEPRECATED = "deprecated"  # Being phased out
    RETIRED = "retired"  # No longer in use
    RECALLED = "recalled"  # Safety issue


class DeploymentEnvironment(str, enum.Enum):
    """Deployment environment"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    RESEARCH = "research"
    CLINICAL_TRIAL = "clinical_trial"


class ValidationStatus(str, enum.Enum):
    """Validation status"""
    NOT_VALIDATED = "not_validated"
    INTERNAL_VALIDATION = "internal_validation"
    EXTERNAL_VALIDATION = "external_validation"
    CLINICAL_VALIDATION = "clinical_validation"
    FDA_CLEARED = "fda_cleared"
    FDA_APPROVED = "fda_approved"
    CE_MARKED = "ce_marked"  # European compliance


class ModelVersion(BaseModel):
    """
    Model version tracking for AI/ML algorithms
    Essential for FDA compliance (21 CFR Part 820 for SaMD)
    Tracks training, validation, deployment, and performance monitoring
    """
    
    __tablename__ = "model_versions"
    
    # ==================== Model Identification ====================
    model_name = Column(String(255), nullable=False, index=True)  # e.g., "BreastCancer_DenseNet121_v2"
    version = Column(String(50), nullable=False, index=True)  # Semantic versioning: "2.1.0"
    version_hash = Column(String(64), nullable=True, unique=True)  # Git commit or model hash
    
    # Model type and architecture
    algorithm_type = Column(SQLEnum(AlgorithmType), nullable=False)
    architecture = Column(String(255), nullable=True)  # "DenseNet121", "EfficientNet-B4"
    framework = Column(String(100), nullable=True)  # "PyTorch 2.0", "TensorFlow 2.13"
    
    # ==================== Training Information ====================
    training_date = Column(String, nullable=True, index=True)  # ISO timestamp
    training_duration_hours = Column(Float, nullable=True)
    training_dataset_size = Column(Integer, nullable=True)  # Number of training samples
    training_dataset_version = Column(String(50), nullable=True)  # Dataset version ID
    
    # Training hyperparameters
    hyperparameters = Column(JSONB, nullable=True)
    # Example:
    # {
    #   "learning_rate": 0.001,
    #   "batch_size": 32,
    #   "epochs": 100,
    #   "optimizer": "Adam",
    #   "loss_function": "binary_crossentropy",
    #   "dropout_rate": 0.5
    # }
    
    # ==================== Validation Metrics ====================
    validation_metrics = Column(JSONB, nullable=False)
    # Example:
    # {
    #   "accuracy": 0.912,
    #   "sensitivity": 0.885,
    #   "specificity": 0.925,
    #   "precision": 0.891,
    #   "recall": 0.885,
    #   "f1_score": 0.888,
    #   "auc_roc": 0.942,
    #   "auc_pr": 0.918,
    #   "validation_dataset_size": 500,
    #   "confusion_matrix": {"TP": 420, "TN": 463, "FP": 37, "FN": 55}
    # }
    
    # Statistical confidence intervals
    confidence_intervals = Column(JSONB, nullable=True)  # 95% CI for key metrics
    
    # Performance by subgroup (for fairness analysis)
    subgroup_performance = Column(JSONB, nullable=True)
    # Example:
    # {
    #   "by_age": {"40-50": {"accuracy": 0.91}, "50-60": {"accuracy": 0.92}, ...},
    #   "by_density": {"a": {"accuracy": 0.89}, "b": {"accuracy": 0.91}, ...}
    # }
    
    # ==================== Clinical Validation ====================
    validation_status = Column(SQLEnum(ValidationStatus), nullable=False, default=ValidationStatus.NOT_VALIDATED)
    clinical_study_id = Column(String(100), nullable=True)  # IRB/clinical trial ID
    validation_dataset_info = Column(JSONB, nullable=True)
    
    # External validation results (if applicable)
    external_validation_results = Column(JSONB, nullable=True)
    
    # ==================== Regulatory Compliance ====================
    fda_approval_status = Column(String(50), nullable=True)  # "510(k)", "PMA", "De Novo"
    fda_submission_date = Column(String, nullable=True)
    fda_clearance_date = Column(String, nullable=True)
    fda_clearance_number = Column(String(50), nullable=True, index=True)
    
    ce_marking = Column(Boolean, default=False)  # European conformity
    ce_marking_date = Column(String, nullable=True)
    
    # Intended use statement (FDA requirement)
    intended_use = Column(Text, nullable=True)
    indications_for_use = Column(Text, nullable=True)
    contraindications = Column(Text, nullable=True)
    
    # ==================== Deployment Information ====================
    status = Column(SQLEnum(ModelStatus), nullable=False, default=ModelStatus.DEVELOPMENT, index=True)
    deployment_environment = Column(SQLEnum(DeploymentEnvironment), nullable=True)
    
    deployment_date = Column(String, nullable=True, index=True)  # When deployed to production
    deprecation_date = Column(String, nullable=True)
    retirement_date = Column(String, nullable=True)
    
    is_active = Column(Boolean, default=False, index=True)  # Currently serving predictions
    
    # ==================== Model Artifacts ====================
    model_file_path = Column(String(500), nullable=True)  # S3 path or local path
    model_file_size_mb = Column(Float, nullable=True)
    model_checksum = Column(String(64), nullable=True)  # SHA-256 of model file
    
    # Associated files
    preprocessing_pipeline_path = Column(String(500), nullable=True)
    config_file_path = Column(String(500), nullable=True)
    
    # ==================== Performance Monitoring ====================
    # Real-world performance metrics (updated periodically)
    production_metrics = Column(JSONB, nullable=True)
    # Example:
    # {
    #   "total_predictions": 10000,
    #   "avg_inference_time_ms": 245,
    #   "avg_confidence": 0.78,
    #   "predictions_per_day": 500,
    #   "error_rate": 0.02
    # }
    
    # Drift detection
    performance_drift_detected = Column(Boolean, default=False)
    last_drift_check_date = Column(String, nullable=True)
    
    # ==================== Documentation ====================
    release_notes = Column(Text, nullable=True)  # What changed in this version
    known_issues = Column(JSONB, nullable=True)  # Known limitations/bugs
    changelog = Column(Text, nullable=True)  # Version history
    
    # Research paper or technical report
    paper_citation = Column(Text, nullable=True)
    paper_doi = Column(String(100), nullable=True)
    
    # ==================== Responsible AI ====================
    fairness_metrics = Column(JSONB, nullable=True)  # Bias analysis results
    explainability_method = Column(String(100), nullable=True)  # "GradCAM", "SHAP", "LIME"
    uncertainty_quantification = Column(Boolean, default=False)  # MC Dropout, etc.
    
    # Ethics review
    ethics_approval = Column(Boolean, default=False)
    ethics_board = Column(String(255), nullable=True)
    ethics_approval_date = Column(String, nullable=True)
    
    # ==================== Team Information ====================
    developed_by = Column(String(255), nullable=True)  # Team or individual
    contact_email = Column(String(255), nullable=True)
    organization_id = Column(UUID(as_uuid=True), nullable=True)  # If org-specific model
    
    # ==================== Relationships ====================
    analyses = relationship("Analysis", back_populates="model_version_ref")
    
    def __repr__(self):
        return f"<ModelVersion(name={self.model_name}, version={self.version}, status={self.status})>"
    
    @property
    def full_version_string(self):
        """Get full version identifier"""
        return f"{self.model_name}_v{self.version}"
    
    @property
    def is_fda_cleared(self):
        """Check if model is FDA cleared/approved"""
        return self.fda_clearance_date is not None
    
    @property
    def is_production_ready(self):
        """Check if model is ready for production use"""
        return (
            self.status in [ModelStatus.APPROVED, ModelStatus.ACTIVE] and
            self.validation_status in [
                ValidationStatus.CLINICAL_VALIDATION,
                ValidationStatus.FDA_CLEARED,
                ValidationStatus.FDA_APPROVED
            ]
        )
    
    @property
    def primary_metric(self):
        """Get primary performance metric (AUC-ROC if available)"""
        if self.validation_metrics and isinstance(self.validation_metrics, dict):
            return self.validation_metrics.get("auc_roc") or self.validation_metrics.get("accuracy")
        return None


class ModelPerformanceLog(BaseModel):
    """
    Track model performance over time in production
    Essential for continuous monitoring and drift detection
    """
    
    __tablename__ = "model_performance_logs"
    
    # Model version relationship
    model_version_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Time period
    log_date = Column(String, nullable=False, index=True)  # Date of measurement
    measurement_window_days = Column(Integer, default=1)  # Rolling window
    
    # Performance metrics for this period
    metrics = Column(JSONB, nullable=False)
    # Same structure as validation_metrics in ModelVersion
    
    # Volume statistics
    total_predictions = Column(Integer, nullable=False)
    avg_confidence = Column(Float, nullable=True)
    avg_inference_time_ms = Column(Float, nullable=True)
    
    # Quality indicators
    feedback_received = Column(Integer, default=0)  # How many got radiologist review
    agreement_rate = Column(Float, nullable=True)  # % agreement with radiologist
    
    # Alerts
    performance_alert = Column(Boolean, default=False)  # Dropped below threshold
    drift_alert = Column(Boolean, default=False)  # Distribution shift detected
    
    # Notes
    notes = Column(Text, nullable=True)
    
    def __repr__(self):
        return f"<ModelPerformanceLog(model_version_id={self.model_version_id}, date={self.log_date}, predictions={self.total_predictions})>"
