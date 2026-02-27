"""
Business logic service for Clinical Reports

This module handles all business logic for clinical report operations,
including validation, workflow management, and data transformations.

Design Principles:
- Separation of concerns (service layer separate from API layer)
- Single Responsibility Principle
- Dependency Injection
- Comprehensive error handling
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID, uuid4
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_

from app.db.models import (
    ClinicalReport,
    ReportWorkflowHistory,
    User,
    Study
)
from app.schemas.reports import (
    ReportCreate,
    ReportUpdate,
    WorkflowTransition,
    ReportAmendment,
    BIRADSCategoryEnum,
    ReportStatusEnum
)


# ============================================================================
# CUSTOM EXCEPTIONS
# ============================================================================

class ReportServiceException(Exception):
    """Base exception for report service errors"""
    pass


class ReportNotFoundException(ReportServiceException):
    """Raised when report is not found"""
    pass


class InvalidWorkflowTransitionException(ReportServiceException):
    """Raised when workflow transition is invalid"""
    pass


class ReportValidationException(ReportServiceException):
    """Raised when report validation fails"""
    pass


class PermissionDeniedException(ReportServiceException):
    """Raised when user lacks permission for operation"""
    pass


# ============================================================================
# WORKFLOW MANAGEMENT
# ============================================================================

class WorkflowManager:
    """Manages report workflow state transitions"""
    
    # Valid state transitions
    VALID_TRANSITIONS = {
        ReportStatusEnum.DRAFT: [ReportStatusEnum.PENDING_REVIEW, ReportStatusEnum.CANCELLED],
        ReportStatusEnum.PENDING_REVIEW: [ReportStatusEnum.REVIEWED, ReportStatusEnum.DRAFT],
        ReportStatusEnum.REVIEWED: [ReportStatusEnum.APPROVED, ReportStatusEnum.PENDING_REVIEW],
        ReportStatusEnum.APPROVED: [ReportStatusEnum.SIGNED, ReportStatusEnum.REVIEWED],
        ReportStatusEnum.SIGNED: [ReportStatusEnum.AMENDED],
        ReportStatusEnum.AMENDED: [],
        ReportStatusEnum.CANCELLED: []
    }
    
    @classmethod
    def validate_transition(
        cls,
        from_status: str,
        to_status: str
    ) -> bool:
        """
        Validate if transition is allowed
        
        Args:
            from_status: Current report status
            to_status: Target report status
            
        Returns:
            bool: True if transition is valid
            
        Raises:
            InvalidWorkflowTransitionException: If transition is invalid
        """
        try:
            from_enum = ReportStatusEnum(from_status)
            to_enum = ReportStatusEnum(to_status)
        except ValueError:
            raise InvalidWorkflowTransitionException(
                f"Invalid status value: {from_status} or {to_status}"
            )
        
        valid_next_states = cls.VALID_TRANSITIONS.get(from_enum, [])
        
        if to_enum not in valid_next_states:
            raise InvalidWorkflowTransitionException(
                f"Cannot transition from {from_status} to {to_status}. "
                f"Valid transitions: {[s.value for s in valid_next_states]}"
            )
        
        return True
    
    @classmethod
    def get_valid_transitions(cls, current_status: str) -> List[str]:
        """Get list of valid next states"""
        try:
            status_enum = ReportStatusEnum(current_status)
            return [s.value for s in cls.VALID_TRANSITIONS.get(status_enum, [])]
        except ValueError:
            return []


# ============================================================================
# VALIDATION UTILITIES
# ============================================================================

class ReportValidator:
    """Validates report content and structure"""
    
    # BI-RADS category specific validations
    BIRADS_RECOMMENDATIONS = {
        "0": ["additional_imaging"],
        "1": ["routine_screening"],
        "2": ["routine_screening"],
        "3": ["short_term_followup"],
        "4A": ["biopsy", "short_term_followup"],
        "4B": ["biopsy"],
        "4C": ["biopsy"],
        "5": ["biopsy"],
        "6": ["treatment", "surgical_consultation"]
    }
    
    @classmethod
    def validate_birads_consistency(
        cls,
        birads: str,
        recommendations: List[Dict[str, Any]]
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate that recommendations are consistent with BI-RADS category
        
        Args:
            birads: BI-RADS category
            recommendations: List of recommendations
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not recommendations:
            return False, "Recommendations are required"
        
        expected_actions = cls.BIRADS_RECOMMENDATIONS.get(birads, [])
        if not expected_actions:
            return True, None  # Unknown category, skip validation
        
        rec_actions = [r.get("action") for r in recommendations]
        
        # Check if at least one recommendation matches expected actions
        has_valid_action = any(action in expected_actions for action in rec_actions)
        
        if not has_valid_action:
            return False, (
                f"BI-RADS {birads} requires one of these actions: {expected_actions}. "
                f"Found: {rec_actions}"
            )
        
        return True, None
    
    @classmethod
    def should_flag_critical(cls, birads: str) -> bool:
        """Determine if finding should be flagged as critical"""
        return birads in ["4C", "5", "6"]


# ============================================================================
# CLINICAL REPORTS SERVICE
# ============================================================================

class ClinicalReportsService:
    """Service for clinical report operations"""
    
    def __init__(self, db: Session):
        """
        Initialize service
        
        Args:
            db: Database session
        """
        self.db = db
        self.workflow_manager = WorkflowManager()
        self.validator = ReportValidator()
    
    def generate_report_number(self) -> str:
        """
        Generate unique report number
        
        Format: RPT-YYYYMMDDHHMMSS-XXXXXXXX
        
        Returns:
            str: Unique report number
        """
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        unique_id = uuid4().hex[:8].upper()
        return f"RPT-{timestamp}-{unique_id}"
    
    def create_report(
        self,
        report_data: ReportCreate,
        author_id: UUID
    ) -> ClinicalReport:
        """
        Create a new clinical report
        
        Args:
            report_data: Report creation data
            author_id: UUID of report author
            
        Returns:
            ClinicalReport: Created report
            
        Raises:
            ReportValidationException: If validation fails
        """
        # Validate study exists
        study = self.db.query(Study).filter(Study.id == report_data.study_id).first()
        if not study:
            raise ReportValidationException(f"Study {report_data.study_id} not found")
        
        # Validate BI-RADS consistency
        if report_data.overall_birads and report_data.recommendations:
            is_valid, error_msg = self.validator.validate_birads_consistency(
                report_data.overall_birads.value,
                [rec.model_dump() for rec in report_data.recommendations]
            )
            if not is_valid:
                raise ReportValidationException(error_msg)
        
        # Determine if critical finding
        critical_finding = self.validator.should_flag_critical(
            report_data.overall_birads.value
        )
        
        # Create report
        report = ClinicalReport(
            study_id=report_data.study_id,
            report_number=self.generate_report_number(),
            report_type=report_data.report_type.value,
            author_id=author_id,
            status=ReportStatusEnum.DRAFT.value,
            findings=report_data.findings,
            impression=report_data.impression,
            clinical_history=report_data.clinical_history,
            technique=report_data.technique,
            comparison=report_data.comparison,
            overall_birads=report_data.overall_birads.value,
            recommendations=[rec.model_dump() for rec in report_data.recommendations],
            follow_up_interval_months=report_data.follow_up_interval_months,
            ai_assisted=report_data.ai_assisted,
            ai_confidence=report_data.ai_confidence,
            ai_findings_reviewed=report_data.ai_findings_reviewed,
            reading_time_minutes=report_data.reading_time_minutes,
            complexity_score=report_data.complexity_score,
            version=1,
            critical_finding=critical_finding,
            notification_sent=False,
            drafted_at=datetime.now()
        )
        
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        
        return report
    
    def get_report(
        self,
        report_id: UUID,
        include_relations: bool = True
    ) -> ClinicalReport:
        """
        Retrieve a report by ID
        
        Args:
            report_id: Report UUID
            include_relations: Whether to include related entities
            
        Returns:
            ClinicalReport: Report instance
            
        Raises:
            ReportNotFoundException: If report not found
        """
        query = self.db.query(ClinicalReport)
        
        if include_relations:
            query = query.options(
                joinedload(ClinicalReport.author),
                joinedload(ClinicalReport.reviewer),
                joinedload(ClinicalReport.approver),
                joinedload(ClinicalReport.study)
            )
        
        report = query.filter(ClinicalReport.id == report_id).first()
        
        if not report:
            raise ReportNotFoundException(f"Report {report_id} not found")
        
        return report
    
    def list_reports(
        self,
        status: Optional[str] = None,
        birads: Optional[str] = None,
        critical_only: bool = False,
        author_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[ClinicalReport], int]:
        """
        List reports with filters
        
        Args:
            status: Filter by status
            birads: Filter by BI-RADS category
            critical_only: Only critical findings
            author_id: Filter by author
            skip: Number of records to skip
            limit: Maximum records to return
            
        Returns:
            Tuple of (reports, total_count)
        """
        query = self.db.query(ClinicalReport).options(
            joinedload(ClinicalReport.author),
            joinedload(ClinicalReport.study)
        )
        
        # Apply filters
        if status:
            query = query.filter(ClinicalReport.status == status)
        if birads:
            query = query.filter(ClinicalReport.overall_birads == birads)
        if critical_only:
            query = query.filter(ClinicalReport.critical_finding == True)
        if author_id:
            query = query.filter(ClinicalReport.author_id == author_id)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        reports = query.order_by(
            ClinicalReport.created_at.desc()
        ).offset(skip).limit(limit).all()
        
        return reports, total
    
    def update_report(
        self,
        report_id: UUID,
        update_data: ReportUpdate,
        user_id: UUID
    ) -> ClinicalReport:
        """
        Update a report
        
        Args:
            report_id: Report UUID
            update_data: Update data
            user_id: User performing update
            
        Returns:
            ClinicalReport: Updated report
            
        Raises:
            ReportNotFoundException: If report not found
            PermissionDeniedException: If report is already signed
        """
        report = self.get_report(report_id, include_relations=False)
        
        # Check if report can be modified
        if report.status == ReportStatusEnum.SIGNED.value:
            raise PermissionDeniedException(
                "Cannot modify signed report. Create an amendment instead."
            )
        
        # Update fields
        update_dict = update_data.model_dump(exclude_unset=True)
        
        # Convert enums to strings
        if 'overall_birads' in update_dict and update_dict['overall_birads']:
            update_dict['overall_birads'] = update_dict['overall_birads'].value
        
        # Convert recommendations to dict
        if 'recommendations' in update_dict and update_dict['recommendations']:
            update_dict['recommendations'] = [
                rec.model_dump() if hasattr(rec, 'model_dump') else rec
                for rec in update_dict['recommendations']
            ]
        
        for key, value in update_dict.items():
            if value is not None:
                setattr(report, key, value)
        
        # Update critical finding flag
        if update_dict.get('overall_birads'):
            report.critical_finding = self.validator.should_flag_critical(
                update_dict['overall_birads']
            )
        
        self.db.commit()
        self.db.refresh(report)
        
        return report
    
    def transition_workflow(
        self,
        report_id: UUID,
        transition_data: WorkflowTransition
    ) -> ClinicalReport:
        """
        Transition report workflow state
        
        Args:
            report_id: Report UUID
            transition_data: Transition data
            
        Returns:
            ClinicalReport: Updated report
            
        Raises:
            ReportNotFoundException: If report not found
            InvalidWorkflowTransitionException: If transition invalid
        """
        report = self.get_report(report_id, include_relations=False)
        
        # Validate transition
        self.workflow_manager.validate_transition(
            report.status,
            transition_data.to_status.value
        )
        
        # Update report status and timestamps
        old_status = report.status
        report.status = transition_data.to_status.value
        
        if transition_data.to_status == ReportStatusEnum.REVIEWED:
            report.reviewer_id = transition_data.user_id
            report.reviewed_at = datetime.now()
        elif transition_data.to_status == ReportStatusEnum.APPROVED:
            report.approver_id = transition_data.user_id
            report.approved_at = datetime.now()
        elif transition_data.to_status == ReportStatusEnum.SIGNED:
            report.signed_at = datetime.now()
        
        # Create workflow history entry
        history = ReportWorkflowHistory(
            report_id=report.id,
            from_status=old_status,
            to_status=transition_data.to_status.value,
            changed_by_id=transition_data.user_id,
            notes=transition_data.notes,
            ip_address=transition_data.ip_address,
            user_agent=transition_data.user_agent
        )
        
        self.db.add(history)
        self.db.commit()
        self.db.refresh(report)
        
        return report
    
    def create_amendment(
        self,
        report_id: UUID,
        amendment_data: ReportAmendment,
        user_id: UUID
    ) -> ClinicalReport:
        """
        Create report amendment
        
        Args:
            report_id: Original report UUID
            amendment_data: Amendment data
            user_id: User creating amendment
            
        Returns:
            ClinicalReport: New amended report
            
        Raises:
            ReportNotFoundException: If original report not found
            PermissionDeniedException: If original report not signed
        """
        original_report = self.get_report(report_id, include_relations=False)
        
        # Verify original report is signed
        if original_report.status != ReportStatusEnum.SIGNED.value:
            raise PermissionDeniedException(
                "Can only amend signed reports"
            )
        
        # Create amended report
        amended_report = ClinicalReport(
            study_id=original_report.study_id,
            report_number=self.generate_report_number(),
            report_type=original_report.report_type,
            author_id=user_id,
            status=ReportStatusEnum.DRAFT.value,
            findings=amendment_data.findings or original_report.findings,
            impression=amendment_data.impression or original_report.impression,
            clinical_history=original_report.clinical_history,
            technique=original_report.technique,
            comparison=original_report.comparison,
            overall_birads=(
                amendment_data.overall_birads.value
                if amendment_data.overall_birads
                else original_report.overall_birads
            ),
            recommendations=(
                [rec.model_dump() for rec in amendment_data.recommendations]
                if amendment_data.recommendations
                else original_report.recommendations
            ),
            follow_up_interval_months=original_report.follow_up_interval_months,
            ai_assisted=original_report.ai_assisted,
            ai_confidence=original_report.ai_confidence,
            ai_findings_reviewed=original_report.ai_findings_reviewed,
            version=original_report.version + 1,
            parent_report_id=original_report.id,
            amendment_reason=amendment_data.amendment_reason,
            critical_finding=self.validator.should_flag_critical(
                amendment_data.overall_birads.value
                if amendment_data.overall_birads
                else original_report.overall_birads
            ),
            drafted_at=datetime.now()
        )
        
        # Update original report status
        original_report.status = ReportStatusEnum.AMENDED.value
        
        self.db.add(amended_report)
        self.db.commit()
        self.db.refresh(amended_report)
        
        return amended_report
    
    def get_workflow_history(
        self,
        report_id: UUID
    ) -> List[ReportWorkflowHistory]:
        """
        Get workflow history for a report
        
        Args:
            report_id: Report UUID
            
        Returns:
            List[ReportWorkflowHistory]: Workflow history entries
        """
        history = self.db.query(ReportWorkflowHistory).options(
            joinedload(ReportWorkflowHistory.changed_by)
        ).filter(
            ReportWorkflowHistory.report_id == report_id
        ).order_by(
            ReportWorkflowHistory.created_at
        ).all()
        
        return history
    
    def get_critical_findings(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[ClinicalReport], int]:
        """
        Get reports with critical findings
        
        Args:
            skip: Number of records to skip
            limit: Maximum records to return
            
        Returns:
            Tuple of (reports, total_count)
        """
        return self.list_reports(
            critical_only=True,
            skip=skip,
            limit=limit
        )
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get report statistics
        
        Returns:
            Dict with statistics
        """
        # Total reports
        total_reports = self.db.query(func.count(ClinicalReport.id)).scalar()
        
        # By status
        status_counts = dict(
            self.db.query(
                ClinicalReport.status,
                func.count(ClinicalReport.id)
            ).group_by(ClinicalReport.status).all()
        )
        
        # By BI-RADS
        birads_counts = dict(
            self.db.query(
                ClinicalReport.overall_birads,
                func.count(ClinicalReport.id)
            ).group_by(ClinicalReport.overall_birads).all()
        )
        
        # Critical findings
        critical_count = self.db.query(
            func.count(ClinicalReport.id)
        ).filter(
            ClinicalReport.critical_finding == True
        ).scalar()
        
        # AI assisted
        ai_assisted_count = self.db.query(
            func.count(ClinicalReport.id)
        ).filter(
            ClinicalReport.ai_assisted == True
        ).scalar()
        
        # Averages
        avg_reading_time = self.db.query(
            func.avg(ClinicalReport.reading_time_minutes)
        ).filter(
            ClinicalReport.reading_time_minutes.isnot(None)
        ).scalar()
        
        avg_complexity = self.db.query(
            func.avg(ClinicalReport.complexity_score)
        ).filter(
            ClinicalReport.complexity_score.isnot(None)
        ).scalar()
        
        return {
            "total_reports": total_reports or 0,
            "by_status": status_counts,
            "by_birads": birads_counts,
            "critical_findings": critical_count or 0,
            "ai_assisted_count": ai_assisted_count or 0,
            "average_reading_time": float(avg_reading_time) if avg_reading_time else None,
            "average_complexity": float(avg_complexity) if avg_complexity else None
        }
