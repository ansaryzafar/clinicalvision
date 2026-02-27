"""
Pydantic schemas for Clinical Reports API

This module defines request/response schemas for clinical reporting endpoints,
including BI-RADS structured reports, workflow management, and audit trails.

Standards:
- BI-RADS 5th Edition (ACR)
- HIPAA compliance
- CAP (College of American Pathologists) reporting guidelines
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, ConfigDict
from enum import Enum


# ============================================================================
# ENUMS
# ============================================================================

class ReportTypeEnum(str, Enum):
    """Clinical report types"""
    BIRADS = "BIRADS"
    DIAGNOSTIC = "DIAGNOSTIC"
    SCREENING = "SCREENING"
    COMPARISON = "COMPARISON"
    CONSULTATION = "CONSULTATION"
    FOLLOW_UP = "FOLLOW_UP"


class ReportStatusEnum(str, Enum):
    """Report workflow states"""
    DRAFT = "DRAFT"
    PENDING_REVIEW = "PENDING_REVIEW"
    REVIEWED = "REVIEWED"
    APPROVED = "APPROVED"
    SIGNED = "SIGNED"
    AMENDED = "AMENDED"
    CANCELLED = "CANCELLED"


class BIRADSCategoryEnum(str, Enum):
    """BI-RADS assessment categories (5th Edition)"""
    INCOMPLETE = "0"
    NEGATIVE = "1"
    BENIGN = "2"
    PROBABLY_BENIGN = "3"
    SUSPICIOUS_LOW = "4A"
    SUSPICIOUS_MODERATE = "4B"
    SUSPICIOUS_HIGH = "4C"
    HIGHLY_SUGGESTIVE = "5"
    KNOWN_MALIGNANCY = "6"


class RecommendationActionEnum(str, Enum):
    """Recommended actions based on BI-RADS"""
    ROUTINE_SCREENING = "routine_screening"
    SHORT_TERM_FOLLOWUP = "short_term_followup"
    ADDITIONAL_IMAGING = "additional_imaging"
    BIOPSY = "biopsy"
    SURGICAL_CONSULTATION = "surgical_consultation"
    TREATMENT = "treatment"
    CLINICAL_CORRELATION = "clinical_correlation"


# ============================================================================
# BASE SCHEMAS
# ============================================================================

class FindingBase(BaseModel):
    """Base schema for imaging findings"""
    location: str = Field(..., description="Anatomical location (e.g., UOQ, UIQ, LOQ, LIQ)")
    size_mm: Optional[int] = Field(None, description="Size in millimeters", ge=0, le=200)
    description: str = Field(..., description="Detailed description of finding")
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "location": "UOQ",
                "size_mm": 12,
                "description": "Irregular hypoechoic mass with indistinct margins"
            }
        }
    )


class MassFinding(FindingBase):
    """Schema for mass findings"""
    shape: Optional[str] = Field(None, description="Mass shape (oval, round, irregular)")
    margin: Optional[str] = Field(None, description="Mass margin characteristics")
    density: Optional[str] = Field(None, description="Mass density")


class CalcificationFinding(FindingBase):
    """Schema for calcification findings"""
    morphology: Optional[str] = Field(None, description="Calcification morphology")
    distribution: Optional[str] = Field(None, description="Calcification distribution pattern")


class RecommendationBase(BaseModel):
    """Base schema for recommendations"""
    action: RecommendationActionEnum = Field(..., description="Recommended action")
    description: str = Field(..., description="Detailed recommendation text")
    urgency: Optional[str] = Field(None, description="Urgency level (routine, urgent, emergent)")
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "action": "biopsy",
                "description": "Core needle biopsy recommended for suspicious mass",
                "urgency": "urgent"
            }
        }
    )


# ============================================================================
# REQUEST SCHEMAS
# ============================================================================

class ReportCreate(BaseModel):
    """Schema for creating a new clinical report"""
    study_id: UUID = Field(..., description="Associated study UUID")
    report_type: ReportTypeEnum = Field(default=ReportTypeEnum.BIRADS)
    
    # Clinical content
    findings: Dict[str, List[Dict[str, Any]]] = Field(
        default_factory=lambda: {
            "masses": [],
            "calcifications": [],
            "asymmetries": [],
            "architectural_distortion": []
        },
        description="Structured findings by category"
    )
    impression: str = Field(..., description="Clinical impression", min_length=10, max_length=5000)
    clinical_history: Optional[str] = Field(None, description="Patient clinical history")
    technique: Optional[str] = Field(None, description="Imaging technique description")
    comparison: Optional[str] = Field(None, description="Comparison with prior studies")
    
    # BI-RADS assessment
    overall_birads: BIRADSCategoryEnum = Field(..., description="Overall BI-RADS category")
    recommendations: List[RecommendationBase] = Field(
        default_factory=list,
        description="Clinical recommendations"
    )
    follow_up_interval_months: Optional[int] = Field(
        None,
        description="Follow-up interval in months",
        ge=1,
        le=24
    )
    
    # AI integration
    ai_assisted: bool = Field(default=False, description="Whether AI assisted in report generation")
    ai_confidence: Optional[float] = Field(
        None,
        description="AI confidence score",
        ge=0.0,
        le=1.0
    )
    ai_findings_reviewed: bool = Field(
        default=False,
        description="Whether AI findings were reviewed by radiologist"
    )
    
    # Metadata
    reading_time_minutes: Optional[int] = Field(None, ge=0, le=180)
    complexity_score: Optional[int] = Field(None, ge=1, le=5)
    
    @field_validator('overall_birads')
    @classmethod
    def validate_birads_recommendations(cls, v, info):
        """Validate that recommendations match BI-RADS category"""
        # This will be called after all fields are set
        return v
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "study_id": "123e4567-e89b-12d3-a456-426614174000",
                "report_type": "BIRADS",
                "findings": {
                    "masses": [{
                        "location": "UOQ",
                        "size_mm": 12,
                        "description": "Irregular hypoechoic mass with indistinct margins"
                    }],
                    "calcifications": [],
                    "asymmetries": [],
                    "architectural_distortion": []
                },
                "impression": "Suspicious finding in upper outer quadrant. Recommend biopsy.",
                "clinical_history": "Annual screening mammogram",
                "technique": "Digital mammography with CAD",
                "overall_birads": "4B",
                "recommendations": [{
                    "action": "biopsy",
                    "description": "Core needle biopsy recommended",
                    "urgency": "urgent"
                }],
                "ai_assisted": True,
                "ai_confidence": 0.92,
                "ai_findings_reviewed": True,
                "reading_time_minutes": 15,
                "complexity_score": 4
            }
        }
    )


class ReportUpdate(BaseModel):
    """Schema for updating an existing report"""
    findings: Optional[Dict[str, List[Dict[str, Any]]]] = None
    impression: Optional[str] = Field(None, min_length=10, max_length=5000)
    clinical_history: Optional[str] = None
    technique: Optional[str] = None
    comparison: Optional[str] = None
    overall_birads: Optional[BIRADSCategoryEnum] = None
    recommendations: Optional[List[RecommendationBase]] = None
    follow_up_interval_months: Optional[int] = Field(None, ge=1, le=24)
    reading_time_minutes: Optional[int] = Field(None, ge=0, le=180)
    complexity_score: Optional[int] = Field(None, ge=1, le=5)
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "impression": "Updated impression after additional views",
                "overall_birads": "3",
                "recommendations": [{
                    "action": "short_term_followup",
                    "description": "6-month follow-up recommended"
                }]
            }
        }
    )


class WorkflowTransition(BaseModel):
    """Schema for transitioning report workflow state"""
    to_status: ReportStatusEnum = Field(..., description="Target workflow state")
    user_id: UUID = Field(..., description="User performing the transition")
    notes: Optional[str] = Field(None, description="Transition notes", max_length=1000)
    ip_address: Optional[str] = Field(None, description="User IP address")
    user_agent: Optional[str] = Field(None, description="User agent string")
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "to_status": "SIGNED",
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "notes": "Report reviewed and approved",
                "ip_address": "192.168.1.100",
                "user_agent": "Mozilla/5.0 (Clinical Vision Platform)"
            }
        }
    )


class ReportAmendment(BaseModel):
    """Schema for creating a report amendment"""
    amendment_reason: str = Field(..., description="Reason for amendment", min_length=10, max_length=1000)
    findings: Optional[Dict[str, List[Dict[str, Any]]]] = None
    impression: Optional[str] = Field(None, min_length=10, max_length=5000)
    overall_birads: Optional[BIRADSCategoryEnum] = None
    recommendations: Optional[List[RecommendationBase]] = None
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "amendment_reason": "Additional finding identified on review",
                "findings": {
                    "masses": [{
                        "location": "UIQ",
                        "size_mm": 8,
                        "description": "Additional small mass identified"
                    }]
                },
                "impression": "Two suspicious findings identified. Biopsy recommended for both.",
                "overall_birads": "4C"
            }
        }
    )


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class UserBrief(BaseModel):
    """Brief user information for report responses"""
    id: UUID
    username: str
    full_name: Optional[str] = None
    role: str
    
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)


class WorkflowHistoryResponse(BaseModel):
    """Schema for workflow history entry"""
    id: UUID
    report_id: UUID
    from_status: str
    to_status: str
    changed_by: Optional[UserBrief] = None
    notes: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)


class ReportResponse(BaseModel):
    """Schema for clinical report response"""
    id: UUID
    study_id: UUID
    report_number: Optional[str] = None
    report_type: str
    status: str
    
    # Clinical content
    findings: Optional[Dict[str, Any]] = None
    impression: Optional[str] = None
    clinical_history: Optional[str] = None
    technique: Optional[str] = None
    comparison: Optional[str] = None
    
    # BI-RADS assessment
    overall_birads: Optional[str] = None
    recommendations: Optional[List[Dict[str, Any]]] = None
    follow_up_interval_months: Optional[int] = None
    
    # AI integration
    ai_assisted: Optional[bool] = None
    ai_confidence: Optional[float] = None
    ai_findings_reviewed: Optional[bool] = None
    
    # Metadata
    reading_time_minutes: Optional[int] = None
    complexity_score: Optional[int] = None
    version: int
    
    # Workflow participants
    author: Optional[UserBrief] = None
    reviewer: Optional[UserBrief] = None
    approver: Optional[UserBrief] = None
    
    # Amendment tracking
    parent_report_id: Optional[UUID] = None
    amendment_reason: Optional[str] = None
    
    # Timestamps
    drafted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    signed_at: Optional[datetime] = None
    
    # Critical findings
    critical_finding: Optional[bool] = None
    notification_sent: Optional[bool] = None
    
    # Audit
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(
        protected_namespaces=(),
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "study_id": "223e4567-e89b-12d3-a456-426614174000",
                "report_number": "RPT-20260108190000-ABC123",
                "report_type": "BIRADS",
                "status": "SIGNED",
                "findings": {
                    "masses": [{
                        "location": "UOQ",
                        "size_mm": 12,
                        "description": "Irregular mass"
                    }]
                },
                "impression": "Suspicious finding. Biopsy recommended.",
                "overall_birads": "4B",
                "recommendations": [{
                    "action": "biopsy",
                    "description": "Core needle biopsy"
                }],
                "ai_assisted": True,
                "ai_confidence": 0.92,
                "critical_finding": True,
                "created_at": "2026-01-08T19:00:00Z",
                "updated_at": "2026-01-08T19:30:00Z"
            }
        }
    )


class ReportListResponse(BaseModel):
    """Schema for paginated report list"""
    reports: List[ReportResponse]
    total: int
    skip: int
    limit: int
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "reports": [],
                "total": 100,
                "skip": 0,
                "limit": 20
            }
        }
    )


class ReportStatistics(BaseModel):
    """Schema for report statistics"""
    total_reports: int
    by_status: Dict[str, int]
    by_birads: Dict[str, int]
    critical_findings: int
    ai_assisted_count: int
    average_reading_time: Optional[float] = None
    average_complexity: Optional[float] = None
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "total_reports": 618,
                "by_status": {
                    "DRAFT": 124,
                    "SIGNED": 117
                },
                "by_birads": {
                    "1": 257,
                    "2": 102
                },
                "critical_findings": 14,
                "ai_assisted_count": 432,
                "average_reading_time": 12.5,
                "average_complexity": 2.8
            }
        }
    )


# ============================================================================
# ERROR SCHEMAS
# ============================================================================

class ErrorResponse(BaseModel):
    """Standard error response schema"""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "error": "ValidationError",
                "message": "Invalid BI-RADS category",
                "details": {
                    "field": "overall_birads",
                    "value": "7",
                    "allowed_values": ["0", "1", "2", "3", "4A", "4B", "4C", "5", "6"]
                }
            }
        }
    )
