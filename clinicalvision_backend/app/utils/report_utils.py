"""
Clinical Report Generation Utilities
BI-RADS structured reporting and report workflow management
Supports FDA/HIPAA compliant clinical documentation
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
import uuid

from app.db.models import (
    ClinicalReport,
    ReportType,
    ReportStatus,
    ReportWorkflowHistory,
    Study,
    User,
    Analysis,
    Image
)


class BIRADSReportGenerator:
    """
    Generate BI-RADS structured mammography reports
    Based on ACR BI-RADS Atlas 5th Edition guidelines
    """
    
    BIRADS_CATEGORIES = {
        "0": "Incomplete - Need Additional Imaging Evaluation",
        "1": "Negative",
        "2": "Benign",
        "3": "Probably Benign",
        "4": "Suspicious",
        "4A": "Low suspicion for malignancy",
        "4B": "Moderate suspicion for malignancy",
        "4C": "High suspicion for malignancy",
        "5": "Highly Suggestive of Malignancy",
        "6": "Known Biopsy-Proven Malignancy"
    }
    
    RECOMMENDATIONS = {
        "0": "Additional imaging evaluation needed",
        "1": "Continue routine screening",
        "2": "Continue routine screening",
        "3": "Short-interval follow-up (6 months)",
        "4": "Tissue diagnosis recommended",
        "4A": "Consider biopsy",
        "4B": "Biopsy recommended",
        "4C": "Biopsy strongly recommended",
        "5": "Appropriate action should be taken (biopsy/surgical consultation)",
        "6": "Surgical excision when clinically appropriate"
    }
    
    def __init__(self, db: Session):
        self.db = db
    
    def generate_report(
        self,
        study_id: uuid.UUID,
        author_id: uuid.UUID,
        findings: Dict[str, Any],
        overall_birads: str,
        impression: str,
        clinical_history: Optional[str] = None,
        comparison: Optional[str] = None,
        ai_assisted: bool = False
    ) -> ClinicalReport:
        """
        Generate a BI-RADS structured report
        
        Args:
            study_id: Study UUID
            author_id: Radiologist UUID
            findings: Structured findings dictionary
            overall_birads: Overall BI-RADS category (0-6, 4A, 4B, 4C)
            impression: Clinical impression summary
            clinical_history: Patient history/indication
            comparison: Comparison with prior studies
            ai_assisted: Whether AI was used
            
        Returns:
            ClinicalReport instance
        """
        # Generate unique report number
        report_number = self._generate_report_number()
        
        # Determine follow-up interval
        follow_up_months = None
        if overall_birads == "3":
            follow_up_months = 6
        
        # Create recommendations based on BI-RADS
        recommendations = self._generate_recommendations(overall_birads, findings)
        
        # Determine if critical finding
        critical = overall_birads in ["4C", "5", "6"]
        
        # Create report
        report = ClinicalReport(
            study_id=study_id,
            report_number=report_number,
            report_type=ReportType.BIRADS,
            author_id=author_id,
            status=ReportStatus.DRAFT,
            findings=findings,
            impression=impression,
            clinical_history=clinical_history,
            comparison=comparison,
            overall_birads=overall_birads,
            recommendations=recommendations,
            follow_up_interval_months=follow_up_months,
            ai_assisted=ai_assisted,
            ai_findings_reviewed=ai_assisted,
            critical_finding=critical,
            version=1,
            drafted_at=datetime.utcnow().isoformat()
        )
        
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        
        # Create workflow history entry
        self._log_workflow_change(
            report.id,
            None,
            ReportStatus.DRAFT,
            author_id,
            "Report created"
        )
        
        return report
    
    def generate_from_ai_analysis(
        self,
        study_id: uuid.UUID,
        author_id: uuid.UUID,
        ai_confidence_threshold: float = 0.7
    ) -> ClinicalReport:
        """
        Generate initial report draft from AI analysis
        Radiologist can then review and modify
        
        Args:
            study_id: Study UUID
            author_id: Radiologist UUID
            ai_confidence_threshold: Minimum confidence for findings
            
        Returns:
            ClinicalReport instance with AI-generated findings
        """
        # Get all images and analyses for study
        study = self.db.query(Study).filter(Study.id == study_id).first()
        if not study:
            raise ValueError(f"Study {study_id} not found")
        
        # Collect AI findings
        findings = {
            "masses": [],
            "calcifications": [],
            "asymmetries": [],
            "architectural_distortion": []
        }
        
        highest_birads = "1"  # Default negative
        malignant_count = 0
        
        for image in study.images:
            for analysis in image.analyses:
                if analysis.confidence_score >= ai_confidence_threshold:
                    # Extract findings from AI analysis
                    if analysis.prediction_class.value == "malignant":
                        malignant_count += 1
                        
                        # Create finding entry
                        finding = {
                            "image_id": str(image.id),
                            "view": f"{image.laterality.value} {image.view_type.value}",
                            "confidence": analysis.confidence_score,
                            "ai_prediction": analysis.prediction_class.value,
                            "roi_coordinates": analysis.roi_coordinates
                        }
                        
                        # Add to appropriate category
                        findings["masses"].append(finding)
                        
                        # Update BI-RADS based on confidence
                        if analysis.confidence_score >= 0.9:
                            highest_birads = "5"
                        elif analysis.confidence_score >= 0.7:
                            highest_birads = max(highest_birads, "4B")
        
        # Generate impression
        if malignant_count == 0:
            impression = "No suspicious findings identified by AI analysis. Negative for malignancy."
            overall_birads = "1"
        else:
            impression = f"AI-detected suspicious findings in {malignant_count} view(s). Radiologist review required for confirmation."
            overall_birads = highest_birads
        
        clinical_history = "Screening mammogram"
        
        return self.generate_report(
            study_id=study_id,
            author_id=author_id,
            findings=findings,
            overall_birads=overall_birads,
            impression=impression,
            clinical_history=clinical_history,
            ai_assisted=True
        )
    
    def _generate_report_number(self) -> str:
        """Generate unique report number"""
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        random_suffix = str(uuid.uuid4())[:8]
        return f"RPT-{timestamp}-{random_suffix}"
    
    def _generate_recommendations(
        self,
        birads: str,
        findings: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate follow-up recommendations based on BI-RADS"""
        recommendations = []
        
        base_recommendation = self.RECOMMENDATIONS.get(birads, "Follow standard protocol")
        
        recommendations.append({
            "action": "primary",
            "description": base_recommendation,
            "urgency": self._get_urgency(birads)
        })
        
        # Add specific recommendations based on findings
        if birads in ["4", "4A", "4B", "4C", "5"]:
            recommendations.append({
                "action": "biopsy",
                "description": "Tissue diagnosis recommended",
                "urgency": "within_2_weeks" if birads in ["4C", "5"] else "within_1_month"
            })
        
        if birads == "3":
            recommendations.append({
                "action": "short_interval_followup",
                "description": "Short-interval follow-up mammogram in 6 months",
                "urgency": "6_months"
            })
        
        return recommendations
    
    def _get_urgency(self, birads: str) -> str:
        """Determine urgency level from BI-RADS"""
        if birads in ["5", "6"]:
            return "urgent"
        elif birads in ["4B", "4C"]:
            return "high"
        elif birads in ["4", "4A"]:
            return "moderate"
        elif birads == "0":
            return "routine"
        else:
            return "routine_screening"
    
    def _log_workflow_change(
        self,
        report_id: uuid.UUID,
        from_status: Optional[ReportStatus],
        to_status: ReportStatus,
        changed_by_id: uuid.UUID,
        notes: Optional[str] = None
    ):
        """Log workflow state transition"""
        history = ReportWorkflowHistory(
            report_id=report_id,
            from_status=from_status,
            to_status=to_status,
            changed_by_id=changed_by_id,
            notes=notes
        )
        self.db.add(history)
        self.db.commit()


class ReportWorkflowManager:
    """
    Manage clinical report workflow state transitions
    Handles draft → review → approval → signing workflow
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def transition_report(
        self,
        report_id: uuid.UUID,
        new_status: ReportStatus,
        user_id: uuid.UUID,
        notes: Optional[str] = None
    ) -> ClinicalReport:
        """
        Transition report to new status
        
        Args:
            report_id: Report UUID
            new_status: Target status
            user_id: User making the transition
            notes: Optional notes about the transition
            
        Returns:
            Updated ClinicalReport
        """
        report = self.db.query(ClinicalReport).filter(
            ClinicalReport.id == report_id
        ).first()
        
        if not report:
            raise ValueError(f"Report {report_id} not found")
        
        # Validate transition
        if not self._is_valid_transition(report.status, new_status):
            raise ValueError(
                f"Invalid transition from {report.status} to {new_status}"
            )
        
        # Store old status
        old_status = report.status
        
        # Update report
        report.status = new_status
        
        # Set appropriate timestamps
        now = datetime.utcnow().isoformat()
        if new_status == ReportStatus.REVIEWED:
            report.reviewed_at = now
            report.reviewer_id = user_id
        elif new_status == ReportStatus.APPROVED:
            report.approved_at = now
            report.approver_id = user_id
        elif new_status == ReportStatus.SIGNED:
            report.signed_at = now
        
        self.db.commit()
        self.db.refresh(report)
        
        # Log workflow change
        history = ReportWorkflowHistory(
            report_id=report_id,
            from_status=old_status,
            to_status=new_status,
            changed_by_id=user_id,
            notes=notes
        )
        self.db.add(history)
        self.db.commit()
        
        # Send notification if critical finding
        if report.critical_finding and not report.notification_sent:
            self._send_critical_finding_notification(report)
            report.notification_sent = True
            self.db.commit()
        
        return report
    
    def _is_valid_transition(
        self,
        current: ReportStatus,
        new: ReportStatus
    ) -> bool:
        """Validate workflow state transition"""
        valid_transitions = {
            ReportStatus.DRAFT: [
                ReportStatus.PENDING_REVIEW,
                ReportStatus.DELETED
            ],
            ReportStatus.PENDING_REVIEW: [
                ReportStatus.DRAFT,  # Send back for changes
                ReportStatus.REVIEWED,
                ReportStatus.DELETED
            ],
            ReportStatus.REVIEWED: [
                ReportStatus.APPROVED,
                ReportStatus.DRAFT,  # Send back for changes
                ReportStatus.DELETED
            ],
            ReportStatus.APPROVED: [
                ReportStatus.SIGNED,
                ReportStatus.DELETED
            ],
            ReportStatus.SIGNED: [
                ReportStatus.AMENDED  # Can only amend signed reports
            ],
            ReportStatus.AMENDED: [
                ReportStatus.SIGNED  # Re-sign after amendment
            ]
        }
        
        return new in valid_transitions.get(current, [])
    
    def create_amendment(
        self,
        original_report_id: uuid.UUID,
        author_id: uuid.UUID,
        amendment_reason: str,
        updated_findings: Optional[Dict[str, Any]] = None,
        updated_impression: Optional[str] = None
    ) -> ClinicalReport:
        """
        Create an amended version of a signed report
        
        Args:
            original_report_id: Original report UUID
            author_id: Radiologist making amendment
            amendment_reason: Reason for amendment
            updated_findings: New findings (if changed)
            updated_impression: New impression (if changed)
            
        Returns:
            New ClinicalReport (amended version)
        """
        original = self.db.query(ClinicalReport).filter(
            ClinicalReport.id == original_report_id
        ).first()
        
        if not original:
            raise ValueError(f"Report {original_report_id} not found")
        
        if original.status != ReportStatus.SIGNED:
            raise ValueError("Can only amend signed reports")
        
        # Create new report version
        amended = ClinicalReport(
            study_id=original.study_id,
            report_number=original.report_number,  # Keep same number
            report_type=original.report_type,
            author_id=author_id,
            status=ReportStatus.AMENDED,
            findings=updated_findings or original.findings,
            impression=updated_impression or original.impression,
            clinical_history=original.clinical_history,
            comparison=original.comparison,
            overall_birads=original.overall_birads,
            recommendations=original.recommendations,
            follow_up_interval_months=original.follow_up_interval_months,
            ai_assisted=original.ai_assisted,
            critical_finding=original.critical_finding,
            version=original.version + 1,
            parent_report_id=original.id,
            amendment_reason=amendment_reason,
            drafted_at=datetime.utcnow().isoformat()
        )
        
        self.db.add(amended)
        self.db.commit()
        self.db.refresh(amended)
        
        return amended
    
    def _send_critical_finding_notification(self, report: ClinicalReport):
        """
        Send notification for critical findings
        In production, this would trigger email/SMS/pager alerts
        """
        # TODO: Implement actual notification system
        # For now, just log
        print(f"CRITICAL FINDING ALERT: Report {report.report_number}")
        print(f"Study ID: {report.study_id}")
        print(f"BI-RADS: {report.overall_birads}")
        print(f"Impression: {report.impression[:100]}...")
    
    def get_report_history(self, report_id: uuid.UUID) -> List[ReportWorkflowHistory]:
        """Get complete workflow history for a report"""
        return self.db.query(ReportWorkflowHistory).filter(
            ReportWorkflowHistory.report_id == report_id
        ).order_by(ReportWorkflowHistory.created_at).all()


class ReportTemplateManager:
    """
    Manage report templates for standardized reporting
    Supports institutional customization
    """
    
    STANDARD_TEMPLATES = {
        "screening_negative": {
            "impression": "Negative for malignancy. No suspicious findings identified.",
            "overall_birads": "1",
            "recommendations": [
                {"action": "routine_screening", "description": "Continue annual screening mammography"}
            ]
        },
        "screening_benign": {
            "impression": "Benign finding(s). No evidence of malignancy.",
            "overall_birads": "2",
            "recommendations": [
                {"action": "routine_screening", "description": "Continue annual screening mammography"}
            ]
        },
        "probably_benign": {
            "impression": "Probably benign finding. Short-interval follow-up recommended.",
            "overall_birads": "3",
            "follow_up_interval_months": 6,
            "recommendations": [
                {"action": "short_interval_followup", "description": "Short-interval follow-up in 6 months"}
            ]
        }
    }
    
    @classmethod
    def get_template(cls, template_name: str) -> Dict[str, Any]:
        """Get report template by name"""
        return cls.STANDARD_TEMPLATES.get(template_name, {})
    
    @classmethod
    def apply_template(cls, report: ClinicalReport, template_name: str):
        """Apply template to report"""
        template = cls.get_template(template_name)
        if template:
            for key, value in template.items():
                setattr(report, key, value)
