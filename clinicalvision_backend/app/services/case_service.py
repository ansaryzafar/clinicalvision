"""
Business logic service for Clinical Case Management

Handles CRUD, 12-step workflow transitions, case numbers, and case
finalization.  Designed for dependency-injection into FastAPI endpoints.

Design principles mirror app/services/reports_service.py:
  - Class with __init__(db: Session)
  - Custom exceptions for each error category
  - Soft-delete via BaseModel.is_deleted
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.db.models.clinical_case import (
    CaseImage,
    CaseFinding,
    CaseWorkflowStatus,
    ClinicalCase,
    STEP_INDEX,
    STEP_ORDER,
)
from app.schemas.clinical_case import (
    CaseCreate,
    CaseFinalize,
    CaseUpdate,
)


# ============================================================================
# CUSTOM EXCEPTIONS
# ============================================================================

class CaseServiceException(Exception):
    """Base exception for case service errors."""


class CaseNotFoundException(CaseServiceException):
    """Raised when a clinical case is not found or has been soft-deleted."""


class CaseLockedError(CaseServiceException):
    """Raised when an operation targets a finalized / locked case."""


class InvalidWorkflowTransitionError(CaseServiceException):
    """Raised when a workflow step transition violates ordering rules."""


# ============================================================================
# SERVICE
# ============================================================================

class CaseService:
    """Core business-logic layer for clinical-case management."""

    def __init__(self, db: Session) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def generate_case_number(self) -> str:
        """Return the next sequential case number: ``CV-YYYY-NNNNNN``."""
        year = datetime.now().year
        prefix = f"CV-{year}-"
        count: int = (
            self.db.query(ClinicalCase)
            .filter(ClinicalCase.case_number.like(f"{prefix}%"))
            .count()
        )
        return f"{prefix}{count + 1:06d}"

    def _get_case(self, case_id: UUID) -> ClinicalCase:
        """Fetch a case by primary key. Raises CaseNotFoundException."""
        case: Optional[ClinicalCase] = (
            self.db.query(ClinicalCase)
            .options(joinedload(ClinicalCase.images), joinedload(ClinicalCase.findings))
            .filter(ClinicalCase.id == case_id, ClinicalCase.is_deleted.is_(False))
            .first()
        )
        if case is None:
            raise CaseNotFoundException(f"Case {case_id} not found")
        return case

    def _ensure_unlocked(self, case: ClinicalCase) -> None:
        """Guard clause — raises CaseLockedError for locked/finalized cases."""
        if case.workflow_locked:
            raise CaseLockedError(
                f"Case {case.id} is finalized and cannot be modified"
            )

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    def create_case(self, user_id: UUID, data: CaseCreate) -> ClinicalCase:
        """Create a new clinical case in DRAFT status."""
        case = ClinicalCase(
            case_number=self.generate_case_number(),
            created_by=user_id,
            patient_mrn=data.patient_mrn,
            patient_first_name=data.patient_first_name,
            patient_last_name=data.patient_last_name,
            patient_dob=data.patient_dob,
            patient_sex=data.patient_sex,
            clinical_history=data.clinical_history,
            workflow_current_step=STEP_ORDER[0],  # patient_registration
            workflow_status=CaseWorkflowStatus.DRAFT.value,
            workflow_completed_steps=[],
            workflow_locked=False,
        )
        self.db.add(case)
        self.db.commit()
        self.db.refresh(case)
        return case

    def get_case(self, case_id: UUID) -> ClinicalCase:
        """Retrieve a single case by ID (with eager-loaded relationships)."""
        return self._get_case(case_id)

    def list_cases(
        self,
        user_id: Optional[UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[ClinicalCase]:
        """Return a filtered, paginated list of cases."""
        from sqlalchemy import and_

        conditions = [ClinicalCase.is_deleted.is_(False)]
        if user_id is not None:
            conditions.append(ClinicalCase.created_by == user_id)
        if status is not None:
            conditions.append(ClinicalCase.workflow_status == status)

        return (
            self.db.query(ClinicalCase)
            .filter(and_(*conditions))
            .order_by(ClinicalCase.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def update_case(self, case_id: UUID, data: CaseUpdate) -> ClinicalCase:
        """Partial update of mutable case fields.  Locked cases are rejected."""
        case = self._get_case(case_id)
        self._ensure_unlocked(case)

        update_dict = data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(case, field, value)

        self.db.commit()
        self.db.refresh(case)
        return case

    def delete_case(self, case_id: UUID) -> bool:
        """Soft-delete a case (sets is_deleted = True)."""
        case = self._get_case(case_id)
        case.is_deleted = True
        self.db.commit()
        return True

    # ------------------------------------------------------------------
    # Workflow
    # ------------------------------------------------------------------

    def advance_workflow(self, case_id: UUID, target_step: str) -> ClinicalCase:
        """
        Move workflow to *target_step*.

        Rules:
        1. Locked cases → CaseLockedError
        2. Forward: only the immediate next step is allowed
        3. Backward: any previously-completed step is allowed
        4. Otherwise → InvalidWorkflowTransitionError
        """
        case = self._get_case(case_id)
        self._ensure_unlocked(case)

        current_idx = STEP_INDEX.get(case.workflow_current_step)
        target_idx = STEP_INDEX.get(target_step)

        if target_idx is None:
            raise InvalidWorkflowTransitionError(
                f"Unknown step: {target_step}"
            )

        # Forward: only immediate next step
        if target_idx == current_idx + 1:  # type: ignore[operator]
            # Mark current step as completed
            completed = list(case.workflow_completed_steps or [])
            if case.workflow_current_step not in completed:
                completed.append(case.workflow_current_step)
            case.workflow_completed_steps = completed
            case.workflow_current_step = target_step
            case.workflow_status = CaseWorkflowStatus.IN_PROGRESS.value
            if case.workflow_started_at is None:
                case.workflow_started_at = datetime.now(timezone.utc)

        # Backward: to any already-completed step
        elif target_idx < current_idx and target_step in (case.workflow_completed_steps or []):  # type: ignore[operator]
            case.workflow_current_step = target_step

        else:
            raise InvalidWorkflowTransitionError(
                f"Cannot transition from {case.workflow_current_step} "
                f"to {target_step}"
            )

        self.db.commit()
        self.db.refresh(case)
        return case

    def finalize_case(
        self,
        case_id: UUID,
        user_id: UUID,
        data: CaseFinalize,
    ) -> ClinicalCase:
        """Finalize and lock a case with optional signature."""
        case = self._get_case(case_id)
        self._ensure_unlocked(case)

        case.workflow_locked = True
        case.workflow_status = CaseWorkflowStatus.FINALIZED.value
        case.workflow_completed_at = datetime.now(timezone.utc)
        case.signed_by = user_id
        case.signed_at = datetime.now(timezone.utc)
        if data.signature_hash:
            case.signature_hash = data.signature_hash

        self.db.commit()
        self.db.refresh(case)
        return case

    # ------------------------------------------------------------------
    # Nested resources
    # ------------------------------------------------------------------

    def list_case_images(
        self, case_id: UUID, skip: int = 0, limit: int = 100
    ) -> List[CaseImage]:
        """Return paginated images for a case using SQL offset/limit."""
        # Verify case exists (raises CaseNotFoundException if not)
        self._get_case(case_id)
        return (
            self.db.query(CaseImage)
            .filter(CaseImage.case_id == case_id)
            .order_by(CaseImage.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def list_case_findings(
        self, case_id: UUID, skip: int = 0, limit: int = 100
    ) -> List[CaseFinding]:
        """Return paginated findings for a case using SQL offset/limit."""
        self._get_case(case_id)
        return (
            self.db.query(CaseFinding)
            .filter(CaseFinding.case_id == case_id)
            .order_by(CaseFinding.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def add_image_to_case(
        self, case_id: UUID, image_data: Dict[str, Any]
    ) -> CaseImage:
        """Attach an image record to a case."""
        case = self._get_case(case_id)
        self._ensure_unlocked(case)

        image = CaseImage(
            case_id=case.id,
            filename=image_data.get("filename", ""),
            view_type=image_data.get("view_type", ""),
            laterality=image_data.get("laterality", ""),
            upload_status=image_data.get("upload_status", "pending"),
            file_size=image_data.get("file_size"),
            mime_type=image_data.get("mime_type"),
            analysis_result=image_data.get("analysis_result"),
        )
        if image_data.get("analysis_result"):
            from datetime import datetime, timezone
            image.analyzed_at = datetime.now(timezone.utc)
        self.db.add(image)
        self.db.commit()
        self.db.refresh(image)
        return image

    def add_finding_to_case(
        self, case_id: UUID, finding_data: Dict[str, Any]
    ) -> CaseFinding:
        """Attach a finding record to a case."""
        case = self._get_case(case_id)
        self._ensure_unlocked(case)

        finding = CaseFinding(
            case_id=case.id,
            finding_type=finding_data.get("finding_type", ""),
            laterality=finding_data.get("laterality", ""),
            description=finding_data.get("description"),
            location=finding_data.get("location"),
            size=finding_data.get("size"),
            ai_confidence=finding_data.get("ai_confidence"),
            ai_generated=finding_data.get("ai_generated", False),
        )
        self.db.add(finding)
        self.db.commit()
        self.db.refresh(finding)
        return finding
