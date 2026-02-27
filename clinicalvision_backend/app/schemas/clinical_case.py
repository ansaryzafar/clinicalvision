"""
Pydantic Schemas — Clinical Case Management

Request / response schemas for the /api/v1/cases/ endpoints.
Follows the same conventions as app/schemas/reports.py.
"""

from datetime import date, datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ============================================================================
# REQUEST SCHEMAS
# ============================================================================

class CaseCreate(BaseModel):
    """Payload for creating a new clinical case."""

    patient_mrn: Optional[str] = None
    patient_first_name: Optional[str] = None
    patient_last_name: Optional[str] = None
    patient_dob: Optional[date] = None
    patient_sex: Optional[str] = None  # M / F / O
    clinical_history: Optional[Dict[str, Any]] = None

    @field_validator("patient_sex")
    @classmethod
    def validate_sex(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("M", "F", "O"):
            raise ValueError("patient_sex must be M, F, or O")
        return v

    model_config = ConfigDict(extra="forbid")


class CaseUpdate(BaseModel):
    """Partial update for an existing clinical case."""

    patient_mrn: Optional[str] = None
    patient_first_name: Optional[str] = None
    patient_last_name: Optional[str] = None
    patient_dob: Optional[date] = None
    patient_sex: Optional[str] = None
    clinical_history: Optional[Dict[str, Any]] = None
    workflow_current_step: Optional[str] = None
    workflow_status: Optional[str] = None
    workflow_completed_steps: Optional[List[str]] = None
    birads_assessment: Optional[Dict[str, Any]] = None
    report_content: Optional[str] = None

    @field_validator("patient_sex")
    @classmethod
    def validate_sex(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("M", "F", "O"):
            raise ValueError("patient_sex must be M, F, or O")
        return v

    model_config = ConfigDict(extra="forbid")


class WorkflowAdvance(BaseModel):
    """Payload for advancing the workflow to a specific step."""
    target_step: str


class CaseFinalize(BaseModel):
    """Payload for finalizing & signing a case."""
    signature_hash: Optional[str] = None


class CaseImageCreate(BaseModel):
    """Payload for adding an image to a case."""
    filename: str
    view_type: str = "CC"
    laterality: str = "L"
    upload_status: str = "completed"
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    analysis_result: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(extra="forbid")


class CaseFindingCreate(BaseModel):
    """Payload for adding a finding to a case."""
    finding_type: str = "mass"
    laterality: str = "L"
    description: Optional[str] = None
    location: Optional[Dict[str, Any]] = None
    size: Optional[Dict[str, Any]] = None
    ai_confidence: Optional[float] = None
    ai_generated: bool = False

    model_config = ConfigDict(extra="forbid")


class CaseAnalysisResultUpdate(BaseModel):
    """Payload for storing analysis results against a case."""
    prediction: str
    confidence: float
    probabilities: Dict[str, float]
    risk_level: str
    processing_time_ms: Optional[float] = None
    model_version: Optional[str] = None
    explanation: Optional[Dict[str, Any]] = None
    uncertainty: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(extra="forbid")


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class CaseImageResponse(BaseModel):
    """Single image within a case response."""

    id: UUID
    filename: str
    view_type: str
    laterality: str
    upload_status: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    analysis_result: Optional[Dict[str, Any]] = None
    analyzed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CaseFindingResponse(BaseModel):
    """Single finding within a case response."""

    id: UUID
    finding_type: str
    laterality: str
    description: Optional[str] = None
    location: Optional[Dict[str, Any]] = None
    size: Optional[Dict[str, Any]] = None
    ai_confidence: Optional[float] = None
    ai_generated: bool = False
    radiologist_confirmed: bool = False
    radiologist_notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CaseResponse(BaseModel):
    """Full case detail response (includes nested images & findings)."""

    id: UUID
    case_number: str
    patient_mrn: Optional[str] = None
    patient_first_name: Optional[str] = None
    patient_last_name: Optional[str] = None
    patient_dob: Optional[date] = None
    patient_sex: Optional[str] = None
    clinical_history: Optional[Dict[str, Any]] = None
    workflow_current_step: str
    workflow_status: str
    workflow_completed_steps: List[str] = []
    workflow_locked: bool = False
    birads_assessment: Optional[Dict[str, Any]] = None
    report_content: Optional[str] = None
    signed_at: Optional[datetime] = None
    signature_hash: Optional[str] = None
    images: List[CaseImageResponse] = []
    findings: List[CaseFindingResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CaseListResponse(BaseModel):
    """Lightweight case summary for list endpoints (no nested data)."""

    id: UUID
    case_number: str
    patient_mrn: Optional[str] = None
    patient_first_name: Optional[str] = None
    patient_last_name: Optional[str] = None
    workflow_current_step: str
    workflow_status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
