"""
FastAPI router for Clinical Case Management API

RESTful endpoints: create, retrieve, update, delete, workflow-advance, finalize.
Follows the same patterns as app/api/v1/endpoints/reports.py.
"""

import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.clinical_case import (
    CaseCreate,
    CaseFinalize,
    CaseListResponse,
    CaseResponse,
    CaseUpdate,
    CaseImageCreate,
    CaseFindingCreate,
    CaseImageResponse,
    CaseFindingResponse,
    CaseAnalysisResultUpdate,
    WorkflowAdvance,
)
from app.services.case_service import (
    CaseLockedError,
    CaseNotFoundException,
    CaseService,
    InvalidWorkflowTransitionError,
)

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------
# Router
# --------------------------------------------------------------------------

router = APIRouter(
    prefix="/api/v1/cases",
    tags=["Case Management"],
)


# --------------------------------------------------------------------------
# Dependency
# --------------------------------------------------------------------------

def get_case_service(db: Session = Depends(get_db)) -> CaseService:
    """Dependency injection for CaseService."""
    return CaseService(db)


# --------------------------------------------------------------------------
# Exception helper
# --------------------------------------------------------------------------

def _handle_case_exception(e: Exception) -> HTTPException:
    if isinstance(e, CaseNotFoundException):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    if isinstance(e, CaseLockedError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    if isinstance(e, InvalidWorkflowTransitionError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    logger.error("Unexpected case-service error: %s", e, exc_info=True)
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="An unexpected error occurred",
    )


# --------------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------------

@router.post(
    "/",
    response_model=CaseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new clinical case",
)
def create_case(
    data: CaseCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        service = get_case_service(db)
        case = service.create_case(user_id=current_user.id, data=data)
        return case
    except Exception as e:
        raise _handle_case_exception(e)


@router.get(
    "/",
    response_model=List[CaseListResponse],
    summary="List clinical cases",
)
def list_cases(
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        service = get_case_service(db)
        cases = service.list_cases(
            user_id=current_user.id,
            status=status_filter,
            skip=skip,
            limit=limit,
        )
        return cases
    except Exception as e:
        raise _handle_case_exception(e)


@router.get(
    "/{case_id}",
    response_model=CaseResponse,
    summary="Retrieve a clinical case by ID",
)
def get_case(
    case_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        service = get_case_service(db)
        return service.get_case(case_id)
    except Exception as e:
        raise _handle_case_exception(e)


@router.patch(
    "/{case_id}",
    response_model=CaseResponse,
    summary="Partially update a clinical case",
)
def update_case(
    case_id: UUID,
    data: CaseUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        service = get_case_service(db)
        return service.update_case(case_id=case_id, data=data)
    except Exception as e:
        raise _handle_case_exception(e)


@router.delete(
    "/{case_id}",
    status_code=status.HTTP_200_OK,
    summary="Soft-delete a clinical case",
)
def delete_case(
    case_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        service = get_case_service(db)
        service.delete_case(case_id)
        return {"detail": "Case deleted"}
    except Exception as e:
        raise _handle_case_exception(e)


@router.patch(
    "/{case_id}/workflow",
    response_model=CaseResponse,
    summary="Advance / navigate the workflow step",
)
def advance_workflow(
    case_id: UUID,
    body: WorkflowAdvance,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        service = get_case_service(db)
        return service.advance_workflow(case_id=case_id, target_step=body.target_step)
    except Exception as e:
        raise _handle_case_exception(e)


@router.post(
    "/{case_id}/finalize",
    response_model=CaseResponse,
    summary="Finalize and lock a clinical case",
)
def finalize_case(
    case_id: UUID,
    body: CaseFinalize,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        service = get_case_service(db)
        return service.finalize_case(
            case_id=case_id, user_id=current_user.id, data=body
        )
    except Exception as e:
        raise _handle_case_exception(e)


# --------------------------------------------------------------------------
# Nested Resource Endpoints: Images & Findings (Gap 3 & 4 fix)
# --------------------------------------------------------------------------

@router.post(
    "/{case_id}/images",
    response_model=CaseImageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add an image to a clinical case",
)
def add_image_to_case(
    case_id: UUID,
    data: CaseImageCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Attach an image record to a clinical case."""
    try:
        service = get_case_service(db)
        image = service.add_image_to_case(
            case_id=case_id,
            image_data=data.model_dump(),
        )
        return image
    except Exception as e:
        raise _handle_case_exception(e)


@router.get(
    "/{case_id}/images",
    response_model=List[CaseImageResponse],
    summary="List images for a clinical case",
)
def list_case_images(
    case_id: UUID,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records to return"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get all images attached to a clinical case with pagination."""
    try:
        service = get_case_service(db)
        case = service.get_case(case_id)
        return case.images[skip:skip + limit]
    except Exception as e:
        raise _handle_case_exception(e)


@router.post(
    "/{case_id}/findings",
    response_model=CaseFindingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a finding to a clinical case",
)
def add_finding_to_case(
    case_id: UUID,
    data: CaseFindingCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Attach a finding record to a clinical case."""
    try:
        service = get_case_service(db)
        finding = service.add_finding_to_case(
            case_id=case_id,
            finding_data=data.model_dump(),
        )
        return finding
    except Exception as e:
        raise _handle_case_exception(e)


@router.get(
    "/{case_id}/findings",
    response_model=List[CaseFindingResponse],
    summary="List findings for a clinical case",
)
def list_case_findings(
    case_id: UUID,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records to return"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get all findings attached to a clinical case with pagination."""
    try:
        service = get_case_service(db)
        case = service.get_case(case_id)
        return case.findings[skip:skip + limit]
    except Exception as e:
        raise _handle_case_exception(e)


@router.post(
    "/{case_id}/analysis-results",
    response_model=CaseResponse,
    summary="Store AI analysis results for a clinical case",
)
def store_analysis_results(
    case_id: UUID,
    data: CaseAnalysisResultUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Store AI analysis results (prediction, confidence, explanation)
    against a clinical case's JSONB birads_assessment field.
    """
    try:
        service = get_case_service(db)
        case = service.get_case(case_id)
        service._ensure_unlocked(case)

        # Merge analysis results into the case's birads_assessment JSONB
        existing = case.birads_assessment or {}
        existing["ai_analysis"] = data.model_dump()
        case.birads_assessment = existing

        db.commit()
        db.refresh(case)
        logger.info(
            "Stored analysis results for case %s: prediction=%s, confidence=%.2f",
            case_id, data.prediction, data.confidence,
        )
        return case
    except Exception as e:
        raise _handle_case_exception(e)
