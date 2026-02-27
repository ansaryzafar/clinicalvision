"""
Reports Service Test Suite

Tests workflow state management:
- Report creation
- Status transitions  
- BI-RADS validation
- Workflow state machine
"""

import pytest
from datetime import datetime
from typing import Optional
from enum import Enum

# ============================================================================
# Types and Enums (Mirroring Backend)
# ============================================================================

class ReportStatus(str, Enum):
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    PENDING_REVIEW = "pending_review"
    REVIEWED = "reviewed"
    FINALIZED = "finalized"
    AMENDED = "amended"


class BiradsCategory(int, Enum):
    INCOMPLETE = 0
    NEGATIVE = 1
    BENIGN = 2
    PROBABLY_BENIGN = 3
    SUSPICIOUS = 4
    HIGHLY_SUSPICIOUS = 5
    KNOWN_MALIGNANCY = 6


# ============================================================================
# Report Model for Testing
# ============================================================================

class Report:
    def __init__(
        self,
        report_id: str,
        session_id: str,
        patient_id: str,
        status: ReportStatus = ReportStatus.DRAFT,
        birads_category: Optional[int] = None,
        birads_subcategory: Optional[str] = None,
        impression: Optional[str] = None,
        recommendation: Optional[str] = None,
    ):
        self.report_id = report_id
        self.session_id = session_id
        self.patient_id = patient_id
        self.status = status
        self.birads_category = birads_category
        self.birads_subcategory = birads_subcategory
        self.impression = impression
        self.recommendation = recommendation
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()


# ============================================================================
# Workflow State Machine
# ============================================================================

VALID_TRANSITIONS = {
    ReportStatus.DRAFT: [ReportStatus.IN_PROGRESS],
    ReportStatus.IN_PROGRESS: [ReportStatus.PENDING_REVIEW, ReportStatus.DRAFT],
    ReportStatus.PENDING_REVIEW: [ReportStatus.REVIEWED, ReportStatus.IN_PROGRESS],
    ReportStatus.REVIEWED: [ReportStatus.FINALIZED, ReportStatus.IN_PROGRESS],
    ReportStatus.FINALIZED: [ReportStatus.AMENDED],
    ReportStatus.AMENDED: [ReportStatus.FINALIZED],
}


def is_valid_transition(from_status: ReportStatus, to_status: ReportStatus) -> bool:
    """Check if status transition is valid."""
    valid_next = VALID_TRANSITIONS.get(from_status, [])
    return to_status in valid_next


def get_next_valid_states(current_status: ReportStatus) -> list[ReportStatus]:
    """Get list of valid next states."""
    return VALID_TRANSITIONS.get(current_status, [])


# ============================================================================
# BI-RADS Validation
# ============================================================================

def validate_birads_category(category: int) -> tuple[bool, str]:
    """Validate BI-RADS category."""
    if not isinstance(category, int):
        return False, "BI-RADS category must be an integer"
    
    if category < 0 or category > 6:
        return False, "BI-RADS category must be between 0 and 6"
    
    return True, ""


def validate_birads_subcategory(category: int, subcategory: Optional[str]) -> tuple[bool, str]:
    """Validate BI-RADS subcategory for category 4."""
    if category == 4:
        if subcategory is None:
            return False, "BI-RADS 4 requires subcategory (4A, 4B, or 4C)"
        
        if subcategory not in ["4A", "4B", "4C"]:
            return False, "BI-RADS 4 subcategory must be 4A, 4B, or 4C"
    
    if category != 4 and subcategory is not None:
        return False, "Subcategory should only be specified for BI-RADS 4"
    
    return True, ""


def get_recommended_action(category: int, subcategory: Optional[str] = None) -> str:
    """Get recommended action based on BI-RADS category."""
    recommendations = {
        0: "Recall for additional imaging evaluation",
        1: "Routine annual screening mammography",
        2: "Routine annual screening mammography",
        3: "Short-term follow-up (6 months)",
        4: "Tissue diagnosis (biopsy)",
        5: "Tissue diagnosis and appropriate action",
        6: "Treatment as clinically indicated",
    }
    return recommendations.get(category, "Consult with physician")


# ============================================================================
# Report Service Logic
# ============================================================================

class ReportService:
    def __init__(self):
        self.reports: dict[str, Report] = {}
        self._report_counter = 0
    
    def create_report(self, session_id: str, patient_id: str) -> Report:
        """Create a new report."""
        self._report_counter += 1
        report_id = f"RPT_{self._report_counter:05d}"
        
        report = Report(
            report_id=report_id,
            session_id=session_id,
            patient_id=patient_id,
        )
        
        self.reports[report_id] = report
        return report
    
    def get_report(self, report_id: str) -> Optional[Report]:
        """Get report by ID."""
        return self.reports.get(report_id)
    
    def update_status(self, report_id: str, new_status: ReportStatus) -> tuple[bool, str]:
        """Update report status with validation."""
        report = self.get_report(report_id)
        
        if not report:
            return False, "Report not found"
        
        if not is_valid_transition(report.status, new_status):
            return False, f"Invalid transition from {report.status.value} to {new_status.value}"
        
        report.status = new_status
        report.updated_at = datetime.utcnow()
        
        return True, ""
    
    def update_assessment(
        self,
        report_id: str,
        birads_category: int,
        birads_subcategory: Optional[str] = None,
        impression: Optional[str] = None,
        recommendation: Optional[str] = None,
    ) -> tuple[bool, str]:
        """Update report assessment."""
        report = self.get_report(report_id)
        
        if not report:
            return False, "Report not found"
        
        # Validate BI-RADS
        valid, error = validate_birads_category(birads_category)
        if not valid:
            return False, error
        
        valid, error = validate_birads_subcategory(birads_category, birads_subcategory)
        if not valid:
            return False, error
        
        # Update report
        report.birads_category = birads_category
        report.birads_subcategory = birads_subcategory
        report.impression = impression
        report.recommendation = recommendation or get_recommended_action(birads_category, birads_subcategory)
        report.updated_at = datetime.utcnow()
        
        return True, ""
    
    def can_finalize(self, report_id: str) -> tuple[bool, list[str]]:
        """Check if report can be finalized."""
        report = self.get_report(report_id)
        
        if not report:
            return False, ["Report not found"]
        
        errors = []
        
        if report.birads_category is None:
            errors.append("BI-RADS category is required")
        
        if report.birads_category == 4 and not report.birads_subcategory:
            errors.append("BI-RADS 4 requires subcategory")
        
        if not report.impression:
            errors.append("Clinical impression is required")
        
        if report.status not in [ReportStatus.REVIEWED, ReportStatus.AMENDED]:
            errors.append(f"Report must be reviewed before finalization (current: {report.status.value})")
        
        return len(errors) == 0, errors


# ============================================================================
# Tests
# ============================================================================

class TestReportStatusTransitions:
    """Tests for workflow state machine transitions."""
    
    def test_draft_can_transition_to_in_progress(self):
        assert is_valid_transition(ReportStatus.DRAFT, ReportStatus.IN_PROGRESS)
    
    def test_draft_cannot_skip_to_finalized(self):
        assert not is_valid_transition(ReportStatus.DRAFT, ReportStatus.FINALIZED)
    
    def test_in_progress_can_go_back_to_draft(self):
        assert is_valid_transition(ReportStatus.IN_PROGRESS, ReportStatus.DRAFT)
    
    def test_in_progress_can_transition_to_pending_review(self):
        assert is_valid_transition(ReportStatus.IN_PROGRESS, ReportStatus.PENDING_REVIEW)
    
    def test_pending_review_can_transition_to_reviewed(self):
        assert is_valid_transition(ReportStatus.PENDING_REVIEW, ReportStatus.REVIEWED)
    
    def test_pending_review_can_go_back_to_in_progress(self):
        assert is_valid_transition(ReportStatus.PENDING_REVIEW, ReportStatus.IN_PROGRESS)
    
    def test_reviewed_can_transition_to_finalized(self):
        assert is_valid_transition(ReportStatus.REVIEWED, ReportStatus.FINALIZED)
    
    def test_finalized_can_be_amended(self):
        assert is_valid_transition(ReportStatus.FINALIZED, ReportStatus.AMENDED)
    
    def test_amended_can_be_finalized_again(self):
        assert is_valid_transition(ReportStatus.AMENDED, ReportStatus.FINALIZED)
    
    def test_get_next_valid_states_for_draft(self):
        states = get_next_valid_states(ReportStatus.DRAFT)
        assert ReportStatus.IN_PROGRESS in states
        assert len(states) == 1
    
    def test_get_next_valid_states_for_in_progress(self):
        states = get_next_valid_states(ReportStatus.IN_PROGRESS)
        assert ReportStatus.PENDING_REVIEW in states
        assert ReportStatus.DRAFT in states
        assert len(states) == 2


class TestBiradsValidation:
    """Tests for BI-RADS validation."""
    
    def test_valid_categories(self):
        for category in range(7):
            valid, _ = validate_birads_category(category)
            assert valid, f"Category {category} should be valid"
    
    def test_invalid_negative_category(self):
        valid, error = validate_birads_category(-1)
        assert not valid
        assert "between 0 and 6" in error
    
    def test_invalid_high_category(self):
        valid, error = validate_birads_category(7)
        assert not valid
        assert "between 0 and 6" in error
    
    def test_category_4_requires_subcategory(self):
        valid, error = validate_birads_subcategory(4, None)
        assert not valid
        assert "requires subcategory" in error
    
    def test_category_4_valid_subcategories(self):
        for sub in ["4A", "4B", "4C"]:
            valid, _ = validate_birads_subcategory(4, sub)
            assert valid, f"Subcategory {sub} should be valid"
    
    def test_category_4_invalid_subcategory(self):
        valid, error = validate_birads_subcategory(4, "4D")
        assert not valid
        assert "4A, 4B, or 4C" in error
    
    def test_other_categories_no_subcategory(self):
        valid, error = validate_birads_subcategory(1, "4A")
        assert not valid
        assert "only be specified for BI-RADS 4" in error
    
    def test_other_categories_none_subcategory_valid(self):
        for category in [0, 1, 2, 3, 5, 6]:
            valid, _ = validate_birads_subcategory(category, None)
            assert valid


class TestRecommendations:
    """Tests for BI-RADS recommendations."""
    
    def test_category_0_recommends_additional_imaging(self):
        rec = get_recommended_action(0)
        assert "additional imaging" in rec.lower()
    
    def test_category_1_recommends_routine_screening(self):
        rec = get_recommended_action(1)
        assert "routine" in rec.lower()
        assert "annual" in rec.lower()
    
    def test_category_3_recommends_short_follow_up(self):
        rec = get_recommended_action(3)
        assert "6 months" in rec.lower() or "short-term" in rec.lower()
    
    def test_category_4_recommends_biopsy(self):
        rec = get_recommended_action(4)
        assert "biopsy" in rec.lower()
    
    def test_category_5_recommends_biopsy(self):
        rec = get_recommended_action(5)
        assert "biopsy" in rec.lower() or "tissue diagnosis" in rec.lower()


class TestReportService:
    """Tests for ReportService operations."""
    
    @pytest.fixture
    def service(self):
        return ReportService()
    
    def test_create_report(self, service):
        report = service.create_report("session_001", "patient_001")
        
        assert report.report_id.startswith("RPT_")
        assert report.session_id == "session_001"
        assert report.patient_id == "patient_001"
        assert report.status == ReportStatus.DRAFT
    
    def test_create_multiple_reports(self, service):
        report1 = service.create_report("session_001", "patient_001")
        report2 = service.create_report("session_002", "patient_002")
        
        assert report1.report_id != report2.report_id
    
    def test_get_report(self, service):
        created = service.create_report("session_001", "patient_001")
        retrieved = service.get_report(created.report_id)
        
        assert retrieved is not None
        assert retrieved.report_id == created.report_id
    
    def test_get_nonexistent_report(self, service):
        result = service.get_report("RPT_99999")
        assert result is None
    
    def test_update_status_valid_transition(self, service):
        report = service.create_report("session_001", "patient_001")
        
        success, error = service.update_status(report.report_id, ReportStatus.IN_PROGRESS)
        
        assert success
        assert error == ""
        assert report.status == ReportStatus.IN_PROGRESS
    
    def test_update_status_invalid_transition(self, service):
        report = service.create_report("session_001", "patient_001")
        
        success, error = service.update_status(report.report_id, ReportStatus.FINALIZED)
        
        assert not success
        assert "Invalid transition" in error
        assert report.status == ReportStatus.DRAFT
    
    def test_update_assessment(self, service):
        report = service.create_report("session_001", "patient_001")
        
        success, error = service.update_assessment(
            report.report_id,
            birads_category=2,
            impression="Benign findings",
        )
        
        assert success
        assert report.birads_category == 2
        assert report.impression == "Benign findings"
    
    def test_update_assessment_invalid_birads(self, service):
        report = service.create_report("session_001", "patient_001")
        
        success, error = service.update_assessment(
            report.report_id,
            birads_category=8,
        )
        
        assert not success
        assert "between 0 and 6" in error
    
    def test_update_assessment_category_4_requires_subcategory(self, service):
        report = service.create_report("session_001", "patient_001")
        
        success, error = service.update_assessment(
            report.report_id,
            birads_category=4,
            impression="Suspicious finding",
        )
        
        assert not success
        assert "subcategory" in error
    
    def test_update_assessment_category_4_with_subcategory(self, service):
        report = service.create_report("session_001", "patient_001")
        
        success, error = service.update_assessment(
            report.report_id,
            birads_category=4,
            birads_subcategory="4B",
            impression="Suspicious finding",
        )
        
        assert success
        assert report.birads_category == 4
        assert report.birads_subcategory == "4B"


class TestReportFinalization:
    """Tests for report finalization validation."""
    
    @pytest.fixture
    def service(self):
        return ReportService()
    
    def test_cannot_finalize_without_birads(self, service):
        report = service.create_report("session_001", "patient_001")
        
        can_finalize, errors = service.can_finalize(report.report_id)
        
        assert not can_finalize
        assert "BI-RADS category is required" in errors
    
    def test_cannot_finalize_without_impression(self, service):
        report = service.create_report("session_001", "patient_001")
        report.birads_category = 1
        
        can_finalize, errors = service.can_finalize(report.report_id)
        
        assert not can_finalize
        assert "Clinical impression is required" in errors
    
    def test_cannot_finalize_in_draft_status(self, service):
        report = service.create_report("session_001", "patient_001")
        report.birads_category = 1
        report.impression = "Normal mammogram"
        
        can_finalize, errors = service.can_finalize(report.report_id)
        
        assert not can_finalize
        assert any("reviewed" in e.lower() for e in errors)
    
    def test_can_finalize_when_reviewed(self, service):
        report = service.create_report("session_001", "patient_001")
        report.birads_category = 1
        report.impression = "Normal mammogram"
        report.status = ReportStatus.REVIEWED
        
        can_finalize, errors = service.can_finalize(report.report_id)
        
        assert can_finalize
        assert len(errors) == 0
    
    def test_cannot_finalize_category_4_without_subcategory(self, service):
        report = service.create_report("session_001", "patient_001")
        report.birads_category = 4
        report.impression = "Suspicious finding"
        report.status = ReportStatus.REVIEWED
        
        can_finalize, errors = service.can_finalize(report.report_id)
        
        assert not can_finalize
        assert "BI-RADS 4 requires subcategory" in errors
    
    def test_can_finalize_category_4_with_subcategory(self, service):
        report = service.create_report("session_001", "patient_001")
        report.birads_category = 4
        report.birads_subcategory = "4A"
        report.impression = "Suspicious finding"
        report.status = ReportStatus.REVIEWED
        
        can_finalize, errors = service.can_finalize(report.report_id)
        
        assert can_finalize
