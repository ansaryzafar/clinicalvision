"""
Clinical Report Model
Comprehensive reporting system for radiologist findings and BI-RADS assessments
Supports structured reporting, workflow management, and audit trails
"""

from sqlalchemy import Column, String, Enum as SQLEnum, ForeignKey, Text, Boolean, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum
from datetime import datetime

from app.db.base import BaseModel


class ReportType(str, enum.Enum):
    """Types of clinical reports"""
    BIRADS = "birads"  # BI-RADS structured report
    NARRATIVE = "narrative"  # Free-text narrative report
    STRUCTURED = "structured"  # Structured template-based
    COMPARISON = "comparison"  # Comparison with prior studies
    ADDENDUM = "addendum"  # Addendum to existing report
    CONSULTATION = "consultation"  # Second opinion/consultation


class ReportStatus(str, enum.Enum):
    """Report workflow states"""
    DRAFT = "draft"  # Being created/edited
    PENDING_REVIEW = "pending_review"  # Awaiting peer review
    REVIEWED = "reviewed"  # Peer reviewed
    APPROVED = "approved"  # Final approved report
    SIGNED = "signed"  # Digitally signed
    AMENDED = "amended"  # Amended after signing
    DELETED = "deleted"  # Soft deleted


class FindingSeverity(str, enum.Enum):
    """Severity classification for findings"""
    BENIGN = "benign"
    PROBABLY_BENIGN = "probably_benign"
    SUSPICIOUS = "suspicious"
    HIGHLY_SUSPICIOUS = "highly_suspicious"
    MALIGNANT = "malignant"


class RecommendationAction(str, enum.Enum):
    """Follow-up recommendations"""
    ROUTINE_SCREENING = "routine_screening"  # Return to routine
    SHORT_INTERVAL_FOLLOWUP = "short_interval_followup"  # 6 months
    ADDITIONAL_IMAGING = "additional_imaging"  # Ultrasound, MRI, etc.
    BIOPSY = "biopsy"  # Tissue sampling recommended
    SURGICAL_CONSULTATION = "surgical_consultation"
    CLINICAL_CORRELATION = "clinical_correlation"
    NO_ACTION_NEEDED = "no_action_needed"


class ClinicalReport(BaseModel):
    """
    Clinical report model for radiologist findings
    Supports BI-RADS structured reporting and narrative reports
    Tracks workflow state and approval chain for HIPAA compliance
    """
    
    __tablename__ = "clinical_reports"
    
    # Study relationship (one report per study, but can have amendments)
    study_id = Column(UUID(as_uuid=True), ForeignKey("studies.id"), nullable=False, index=True)
    
    # Report identification
    report_number = Column(String(50), nullable=True, unique=True, index=True)  # Auto-generated or manual
    report_type = Column(SQLEnum(ReportType), nullable=False, default=ReportType.BIRADS)
    
    # Author and reviewers
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)  # Radiologist
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)  # Peer reviewer
    approver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)  # Final approver
    
    # Report status and workflow
    status = Column(SQLEnum(ReportStatus), nullable=False, default=ReportStatus.DRAFT, index=True)
    
    # ==================== Structured Findings ====================
    # Store findings in structured JSONB format for flexibility
    findings = Column(JSONB, nullable=True)
    # Example structure:
    # {
    #   "masses": [
    #     {
    #       "location": {"breast": "right", "clock_position": "3:00", "depth": "anterior"},
    #       "shape": "irregular",
    #       "margin": "spiculated",
    #       "size_mm": 15,
    #       "density": "high",
    #       "birads_category": "5"
    #     }
    #   ],
    #   "calcifications": [...],
    #   "architectural_distortion": [...],
    #   "asymmetries": [...]
    # }
    
    # ==================== Clinical Assessment ====================
    impression = Column(Text, nullable=True)  # Summary of findings
    clinical_history = Column(Text, nullable=True)  # Patient history/indication
    technique = Column(Text, nullable=True)  # Imaging technique description
    comparison = Column(Text, nullable=True)  # Comparison with prior studies
    
    # Overall BI-RADS assessment
    overall_birads = Column(String(10), nullable=True, index=True)  # "0", "1", "2", "3", "4A", "4B", "4C", "5", "6"
    
    # ==================== Recommendations ====================
    recommendations = Column(JSONB, nullable=True)
    # Example:
    # [
    #   {"action": "biopsy", "urgency": "within_1_week", "notes": "Right breast 3:00"},
    #   {"action": "short_interval_followup", "interval_months": 6}
    # ]
    
    follow_up_interval_months = Column(Integer, nullable=True)  # For BI-RADS 3
    
    # ==================== AI Integration ====================
    ai_assisted = Column(Boolean, default=False)  # Was AI used?
    ai_confidence = Column(JSONB, nullable=True)  # AI confidence scores per finding
    ai_findings_reviewed = Column(Boolean, default=False)  # Radiologist confirmed AI findings
    
    # ==================== Quality Metrics ====================
    reading_time_minutes = Column(Integer, nullable=True)  # Time spent on report
    complexity_score = Column(Integer, nullable=True)  # 1-5 based on case complexity
    
    # ==================== Version Control ====================
    version = Column(Integer, default=1, nullable=False)  # Report version number
    parent_report_id = Column(UUID(as_uuid=True), ForeignKey("clinical_reports.id"), nullable=True, index=True)  # If amended
    amendment_reason = Column(Text, nullable=True)
    
    # ==================== Timestamps ====================
    drafted_at = Column(String, nullable=True)  # ISO timestamp for draft creation
    reviewed_at = Column(String, nullable=True)
    approved_at = Column(String, nullable=True)
    signed_at = Column(String, nullable=True)
    
    # ==================== Additional Metadata ====================
    keywords = Column(JSONB, nullable=True)  # ["mass", "calcification", "suspicious"]
    critical_finding = Column(Boolean, default=False, index=True)  # Flag for urgent findings
    notification_sent = Column(Boolean, default=False)  # Critical finding notification status
    
    # Template used (if structured report)
    template_id = Column(String(100), nullable=True)
    template_version = Column(String(20), nullable=True)
    
    # Attachments/additional files
    attachments = Column(JSONB, nullable=True)  # Links to diagrams, annotated images, etc.
    
    # ==================== Relationships ====================
    study = relationship("Study", back_populates="clinical_reports")
    author = relationship("User", foreign_keys=[author_id], back_populates="authored_reports")
    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="reviewed_reports")
    approver = relationship("User", foreign_keys=[approver_id], back_populates="approved_reports")
    
    # Self-referential for amendments
    amendments = relationship("ClinicalReport", backref="parent_report", remote_side="ClinicalReport.id")
    
    # Workflow history
    workflow_history = relationship("ReportWorkflowHistory", back_populates="report", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ClinicalReport(id={self.id}, report_number={self.report_number}, status={self.status}, birads={self.overall_birads})>"
    
    @property
    def is_critical(self):
        """Check if report contains critical findings (BI-RADS 4C, 5, 6)"""
        if self.overall_birads:
            return self.overall_birads in ["4C", "5", "6"]
        return False
    
    @property
    def requires_followup(self):
        """Check if report requires follow-up (BI-RADS 0, 3, 4, 5)"""
        if self.overall_birads:
            return self.overall_birads in ["0", "3", "4", "4A", "4B", "4C", "5"]
        return False


class ReportWorkflowHistory(BaseModel):
    """
    Track report workflow transitions for audit trail
    Records every state change, reviewer, and timestamps
    """
    
    __tablename__ = "report_workflow_history"
    
    # Report relationship
    report_id = Column(UUID(as_uuid=True), ForeignKey("clinical_reports.id"), nullable=False, index=True)
    
    # State transition
    from_status = Column(SQLEnum(ReportStatus), nullable=True)  # Previous state (null if first)
    to_status = Column(SQLEnum(ReportStatus), nullable=False)
    
    # Actor
    changed_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Metadata
    notes = Column(Text, nullable=True)  # Reason for change
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Relationships
    report = relationship("ClinicalReport", back_populates="workflow_history")
    changed_by = relationship("User")
    
    def __repr__(self):
        return f"<ReportWorkflowHistory(report_id={self.report_id}, {self.from_status} -> {self.to_status})>"
