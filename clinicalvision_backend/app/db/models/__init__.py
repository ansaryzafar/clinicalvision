"""
Database models package
Exports all SQLAlchemy models for the clinical vision platform
"""

from app.db.models.organization import Organization, SubscriptionTier
from app.db.models.user import User, UserRole
from app.db.models.patient import Patient, Gender
from app.db.models.study import Study, Modality, StudyStatus
from app.db.models.image import Image, ViewType, Laterality, ImageStatus
from app.db.models.analysis import Analysis, PredictionClass, BIRADSCategory, AnalysisStatus
from app.db.models.feedback import Feedback, FeedbackType, DiagnosisType, BIRADSAssessment
from app.db.models.audit_log import AuditLog, AuditAction, ResourceType

# New models for industry standards compliance
from app.db.models.dicom_metadata import (
    DICOMMetadata,
    TransferSyntax,
    PhotometricInterpretation,
    PatientPosition
)
from app.db.models.clinical_report import (
    ClinicalReport,
    ReportWorkflowHistory,
    ReportType,
    ReportStatus,
    FindingSeverity,
    RecommendationAction
)
from app.db.models.model_version import (
    ModelVersion,
    ModelPerformanceLog,
    AlgorithmType,
    ModelStatus,
    DeploymentEnvironment,
    ValidationStatus
)
from app.db.models.clinical_case import (
    ClinicalCase,
    CaseImage,
    CaseFinding,
    CaseWorkflowStatus,
    CaseWorkflowStep,
    STEP_ORDER,
    STEP_INDEX,
)


__all__ = [
    # Core Models
    "Organization",
    "User",
    "Patient",
    "Study",
    "Image",
    "Analysis",
    "Feedback",
    "AuditLog",
    
    # Industry Standards Models
    "DICOMMetadata",
    "ClinicalReport",
    "ReportWorkflowHistory",
    "ModelVersion",
    "ModelPerformanceLog",
    
    # Core Enums
    "SubscriptionTier",
    "UserRole",
    "Gender",
    "Modality",
    "StudyStatus",
    "ViewType",
    "Laterality",
    "ImageStatus",
    "PredictionClass",
    "BIRADSCategory",
    "AnalysisStatus",
    "FeedbackType",
    "DiagnosisType",
    "BIRADSAssessment",
    "AuditAction",
    "ResourceType",
    
    # DICOM Enums
    "TransferSyntax",
    "PhotometricInterpretation",
    "PatientPosition",
    
    # Clinical Report Enums
    "ReportType",
    "ReportStatus",
    "FindingSeverity",
    "RecommendationAction",
    
    # Model Version Enums
    "AlgorithmType",
    "ModelStatus",
    "DeploymentEnvironment",
    "ValidationStatus",
    
    # Clinical Case Models & Enums
    "ClinicalCase",
    "CaseImage",
    "CaseFinding",
    "CaseWorkflowStatus",
    "CaseWorkflowStep",
    "STEP_ORDER",
    "STEP_INDEX",
]
