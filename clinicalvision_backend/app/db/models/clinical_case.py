"""
Clinical Case Management — SQLAlchemy Models

Tables:
  - clinical_cases   → Main case record (patient, workflow, assessment, report)
  - case_images      → Images scoped to a case
  - case_findings    → Consolidated / radiologist-reviewed findings

All models inherit BaseModel (UUID PK, created_at, updated_at, is_deleted).
"""

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    BigInteger,
    Column,
    Date,
    DateTime,
    Enum as SQLEnum,
    Float,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import BaseModel


# ============================================================================
# ENUMS
# ============================================================================

class CaseWorkflowStatus(str, enum.Enum):
    """Workflow-level status for a clinical case."""
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    PENDING_REVIEW = "pending_review"
    COMPLETED = "completed"
    FINALIZED = "finalized"


class CaseWorkflowStep(str, enum.Enum):
    """12-step clinical workflow — mirrors frontend ClinicalWorkflowStep."""
    PATIENT_REGISTRATION = "patient_registration"
    CLINICAL_HISTORY = "clinical_history"
    IMAGE_UPLOAD = "image_upload"
    IMAGE_VERIFICATION = "image_verification"
    BATCH_AI_ANALYSIS = "batch_ai_analysis"
    FINDINGS_REVIEW = "findings_review"
    MEASUREMENTS = "measurements"
    ANNOTATIONS = "annotations"
    BIRADS_ASSESSMENT = "birads_assessment"
    REPORT_GENERATION = "report_generation"
    FINALIZE = "finalize"
    DIGITAL_SIGNATURE = "digital_signature"


# Ordered list for index-based comparison
STEP_ORDER = [
    CaseWorkflowStep.PATIENT_REGISTRATION,
    CaseWorkflowStep.CLINICAL_HISTORY,
    CaseWorkflowStep.IMAGE_UPLOAD,
    CaseWorkflowStep.IMAGE_VERIFICATION,
    CaseWorkflowStep.BATCH_AI_ANALYSIS,
    CaseWorkflowStep.FINDINGS_REVIEW,
    CaseWorkflowStep.MEASUREMENTS,
    CaseWorkflowStep.ANNOTATIONS,
    CaseWorkflowStep.BIRADS_ASSESSMENT,
    CaseWorkflowStep.REPORT_GENERATION,
    CaseWorkflowStep.FINALIZE,
    CaseWorkflowStep.DIGITAL_SIGNATURE,
]

STEP_INDEX = {step: idx for idx, step in enumerate(STEP_ORDER)}


# ============================================================================
# CLINICAL CASE MODEL
# ============================================================================

class ClinicalCase(BaseModel):
    """
    Main clinical case record.

    Stores denormalized patient demographics alongside workflow state,
    BI-RADS assessment, and report content.  JSONB columns provide
    flexibility for nested/evolving data shapes.
    """

    __tablename__ = "clinical_cases"

    # ── Identifiers ─────────────────────────────────────────────────────
    case_number = Column(String(20), unique=True, nullable=False, index=True)
    backend_id = Column(String(50), unique=True, nullable=True)

    # ── Foreign Keys ────────────────────────────────────────────────────
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=True, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)

    # ── Patient Info (denormalized for case portability) ────────────────
    patient_mrn = Column(String(20), nullable=True)
    patient_first_name = Column(String(100), nullable=True)
    patient_last_name = Column(String(100), nullable=True)
    patient_dob = Column(Date, nullable=True)
    patient_sex = Column(String(1), nullable=True)  # M / F / O

    # ── Clinical History (JSONB for flexibility) ────────────────────────
    clinical_history = Column(JSONB, nullable=True, default=dict)

    # ── Workflow State ──────────────────────────────────────────────────
    workflow_current_step = Column(
        String(50), nullable=False, default=CaseWorkflowStep.PATIENT_REGISTRATION.value
    )
    workflow_status = Column(
        String(20), nullable=False, default=CaseWorkflowStatus.DRAFT.value
    )
    workflow_completed_steps = Column(JSONB, nullable=False, default=list)
    workflow_started_at = Column(DateTime(timezone=True), server_default=func.now())
    workflow_completed_at = Column(DateTime(timezone=True), nullable=True)
    workflow_locked = Column(Boolean, default=False)

    # ── BI-RADS Assessment (JSONB) ──────────────────────────────────────
    birads_assessment = Column(JSONB, nullable=True)

    # ── Report ──────────────────────────────────────────────────────────
    report_content = Column(Text, nullable=True)
    report_generated_at = Column(DateTime(timezone=True), nullable=True)

    # ── Audit / Signature ───────────────────────────────────────────────
    signed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    signed_at = Column(DateTime(timezone=True), nullable=True)
    signature_hash = Column(String(256), nullable=True)

    # ── Relationships ───────────────────────────────────────────────────
    images = relationship(
        "CaseImage", back_populates="case", cascade="all, delete-orphan",
        lazy="selectin",
    )
    findings = relationship(
        "CaseFinding", back_populates="case", cascade="all, delete-orphan",
        lazy="selectin",
    )
    patient = relationship("Patient", backref="clinical_cases", foreign_keys=[patient_id])
    creator = relationship("User", foreign_keys=[created_by])
    assignee = relationship("User", foreign_keys=[assigned_to])
    signer = relationship("User", foreign_keys=[signed_by])

    # ── Composite Indexes ───────────────────────────────────────────────
    __table_args__ = (
        Index("ix_clinical_cases_status", "workflow_status"),
        Index("ix_clinical_cases_created_by", "created_by"),
    )

    def __repr__(self) -> str:
        return f"<ClinicalCase(id={self.id}, case_number={self.case_number})>"


# ============================================================================
# CASE IMAGE MODEL
# ============================================================================

class CaseImage(BaseModel):
    """Image scoped to a clinical case."""

    __tablename__ = "case_images"

    case_id = Column(UUID(as_uuid=True), ForeignKey("clinical_cases.id"), nullable=False, index=True)
    medical_image_id = Column(UUID(as_uuid=True), ForeignKey("images.id"), nullable=True, index=True)

    filename = Column(String(255), nullable=False)
    view_type = Column(String(10), nullable=False)   # CC, MLO, XCCL, …
    laterality = Column(String(1), nullable=False)    # R or L
    upload_status = Column(String(20), default="pending")
    file_size = Column(BigInteger, nullable=True)
    mime_type = Column(String(50), nullable=True)

    # Per-image AI analysis result (JSONB)
    analysis_result = Column(JSONB, nullable=True)
    analyzed_at = Column(DateTime(timezone=True), nullable=True)

    # ── Relationships ───────────────────────────────────────────────────
    case = relationship("ClinicalCase", back_populates="images")

    def __repr__(self) -> str:
        return f"<CaseImage(id={self.id}, filename={self.filename})>"


# ============================================================================
# CASE FINDING MODEL
# ============================================================================

class CaseFinding(BaseModel):
    """
    Consolidated finding for a clinical case.
    May originate from AI or be manually created by the radiologist.
    """

    __tablename__ = "case_findings"

    case_id = Column(UUID(as_uuid=True), ForeignKey("clinical_cases.id"), nullable=False, index=True)

    finding_type = Column(String(50), nullable=False)   # mass, calcification, distortion, …
    laterality = Column(String(1), nullable=False)       # R or L
    description = Column(Text, nullable=True)
    location = Column(JSONB, nullable=True)              # {clock_position, quadrant, depth}
    size = Column(JSONB, nullable=True)                  # {length_mm, width_mm, depth_mm}

    ai_confidence = Column(Float, nullable=True)
    ai_generated = Column(Boolean, default=False)
    radiologist_confirmed = Column(Boolean, default=False)
    radiologist_notes = Column(Text, nullable=True)

    # ── Relationships ───────────────────────────────────────────────────
    case = relationship("ClinicalCase", back_populates="findings")

    def __repr__(self) -> str:
        return f"<CaseFinding(id={self.id}, type={self.finding_type})>"
