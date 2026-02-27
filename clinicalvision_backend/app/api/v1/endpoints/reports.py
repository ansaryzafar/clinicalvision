"""
FastAPI router for Clinical Reports API

Provides RESTful endpoints for clinical report management, including
creation, retrieval, workflow management, amendments, and statistics.

Standards Compliance:
- RESTful API design
- OpenAPI 3.0 documentation
- HIPAA compliance (audit logging)
- BI-RADS 5th Edition
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
import logging

from app.db.session import get_db
from app.db.models.user import User
from app.core.dependencies import (
    get_current_active_user,
    require_radiologist_or_admin,
    RoleChecker
)
from app.schemas.reports import (
    ReportCreate,
    ReportUpdate,
    ReportResponse,
    ReportListResponse,
    WorkflowTransition,
    ReportAmendment,
    WorkflowHistoryResponse,
    ReportStatistics,
    ErrorResponse,
    BIRADSCategoryEnum,
    ReportStatusEnum
)
from app.services.reports_service import (
    ClinicalReportsService,
    ReportNotFoundException,
    InvalidWorkflowTransitionException,
    ReportValidationException,
    PermissionDeniedException
)

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/api/v1/reports",
    tags=["Clinical Reports"],
    responses={
        404: {"model": ErrorResponse, "description": "Report not found"},
        400: {"model": ErrorResponse, "description": "Validation error"},
        403: {"model": ErrorResponse, "description": "Permission denied"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_reports_service(db: Session = Depends(get_db)) -> ClinicalReportsService:
    """Dependency injection for reports service"""
    return ClinicalReportsService(db)


def handle_service_exception(e: Exception) -> HTTPException:
    """
    Convert service exceptions to HTTP exceptions
    
    Args:
        e: Service exception
        
    Returns:
        HTTPException with appropriate status code and message
    """
    if isinstance(e, ReportNotFoundException):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "NotFound", "message": str(e)}
        )
    elif isinstance(e, InvalidWorkflowTransitionException):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "InvalidTransition", "message": str(e)}
        )
    elif isinstance(e, ReportValidationException):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "ValidationError", "message": str(e)}
        )
    elif isinstance(e, PermissionDeniedException):
        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "PermissionDenied", "message": str(e)}
        )
    else:
        logger.error(f"Unexpected error in reports API: {str(e)}", exc_info=True)
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "InternalError", "message": "An unexpected error occurred"}
        )


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get(
    "/health",
    summary="Health check",
    description="Check if the reports API is operational",
    tags=["Health"]
)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "clinical-reports-api",
        "version": "1.0.0"
    }


@router.post(
    "/",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new clinical report",
    description="""
    Create a new clinical report with BI-RADS assessment.
    
    **Features:**
    - Automatic BI-RADS validation
    - Critical finding flagging (BI-RADS 4C, 5, 6)
    - Unique report number generation
    - AI integration support
    - Audit trail creation
    
    **Workflow:**
    - New reports start in DRAFT status
    - Must transition through workflow states to reach SIGNED
    
    **Validation:**
    - Study must exist
    - BI-RADS category must match recommendations
    - Required fields: impression, overall_birads, recommendations
    """,
    responses={
        201: {
            "description": "Report created successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "report_number": "RPT-20260108190000-ABC123",
                        "status": "DRAFT",
                        "overall_birads": "4B",
                        "critical_finding": True
                    }
                }
            }
        }
    }
)
async def create_report(
    report_data: ReportCreate,
    request: Request,
    current_user: User = Depends(require_radiologist_or_admin),
    service: ClinicalReportsService = Depends(get_reports_service)
):
    """Create a new clinical report
    
    **Authentication Required:** Radiologist or Admin role
    **Permissions:** CREATE_REPORT
    """
    try:
        # TODO: Get actual user ID from authentication
        # For now, using first radiologist from database
        from app.db.models import User
        author = service.db.query(User).filter(User.role == "radiologist").first()
        if not author:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No radiologist user found in system"
            )
        
        report = service.create_report(report_data, author.id)
        
        logger.info(
            f"Created report {report.report_number} for study {report.study_id} "
            f"by user {author.id}"
        )
        
        return report
        
    except (ReportValidationException, ReportNotFoundException) as e:
        raise handle_service_exception(e)
    except Exception as e:
        raise handle_service_exception(e)


@router.get(
    "/{report_id}",
    response_model=ReportResponse,
    summary="Get report by ID",
    description="""
    Retrieve a clinical report with all details including:
    - Report content (findings, impression, recommendations)
    - Workflow metadata (author, reviewer, approver)
    - Timestamps (drafted, reviewed, approved, signed)
    - AI integration data
    - Critical finding status
    """,
    responses={
        200: {"description": "Report retrieved successfully"}
    }
)
async def get_report(
    report_id: UUID,
    current_user: User = Depends(get_current_active_user),
    service: ClinicalReportsService = Depends(get_reports_service)
):
    """Get a specific report by ID
    
    **Authentication Required:** Any active user
    **Permissions:** READ_REPORT
    """
    try:
        report = service.get_report(report_id, include_relations=True)
        return report
        
    except ReportNotFoundException as e:
        raise handle_service_exception(e)
    except Exception as e:
        raise handle_service_exception(e)


@router.get(
    "/",
    response_model=ReportListResponse,
    summary="List reports with filters",
    description="""
    List clinical reports with optional filtering and pagination.
    
    **Filters:**
    - `status`: Filter by workflow status (DRAFT, SIGNED, etc.)
    - `birads`: Filter by BI-RADS category (0-6, 4A, 4B, 4C)
    - `critical_only`: Show only critical findings
    - `author_id`: Filter by report author
    
    **Pagination:**
    - `skip`: Number of records to skip (default: 0)
    - `limit`: Maximum records to return (default: 20, max: 100)
    
    **Sorting:**
    - Results sorted by creation date (newest first)
    """,
    responses={
        200: {
            "description": "Reports retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "reports": [],
                        "total": 100,
                        "skip": 0,
                        "limit": 20
                    }
                }
            }
        }
    }
)
async def list_reports(
    status: Optional[ReportStatusEnum] = Query(None, description="Filter by report status"),
    birads: Optional[BIRADSCategoryEnum] = Query(None, description="Filter by BI-RADS category"),
    critical_only: bool = Query(False, description="Show only critical findings"),
    author_id: Optional[UUID] = Query(None, description="Filter by author ID"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum records to return"),
    current_user: User = Depends(get_current_active_user),
    service: ClinicalReportsService = Depends(get_reports_service)
):
    """List reports with filters and pagination
    
    **Authentication Required:** Any active user
    **Permissions:** READ_REPORTS
    """
    try:
        reports, total = service.list_reports(
            status=status.value if status else None,
            birads=birads.value if birads else None,
            critical_only=critical_only,
            author_id=author_id,
            skip=skip,
            limit=limit
        )
        
        return ReportListResponse(
            reports=reports,
            total=total,
            skip=skip,
            limit=limit
        )
        
    except Exception as e:
        raise handle_service_exception(e)


@router.put(
    "/{report_id}",
    response_model=ReportResponse,
    summary="Update report",
    description="""
    Update an existing clinical report.
    
    **Restrictions:**
    - Cannot modify SIGNED reports (use amendment instead)
    - All fields are optional
    - BI-RADS validation applies to updates
    - Critical finding flag auto-updates based on BI-RADS
    
    **Use Cases:**
    - Correct typos in DRAFT reports
    - Add additional findings during review
    - Update recommendations based on peer review
    """,
    responses={
        200: {"description": "Report updated successfully"},
        403: {"description": "Cannot modify signed report"}
    }
)
async def update_report(
    report_id: UUID,
    update_data: ReportUpdate,
    current_user: User = Depends(require_radiologist_or_admin),
    service: ClinicalReportsService = Depends(get_reports_service)
):
    """Update an existing report
    
    **Authentication Required:** Radiologist or Admin role
    **Permissions:** UPDATE_REPORT
    """
    try:
        # Use authenticated user for audit trail
        report = service.update_report(report_id, update_data, current_user.id)
        
        logger.info(f"Updated report {report.report_number} by user {user.id}")
        
        return report
        
    except (ReportNotFoundException, PermissionDeniedException, ReportValidationException) as e:
        raise handle_service_exception(e)
    except Exception as e:
        raise handle_service_exception(e)


@router.put(
    "/{report_id}/transition",
    response_model=ReportResponse,
    summary="Transition report workflow state",
    description="""
    Transition report to a new workflow state.
    
    **Valid Transitions:**
    - DRAFT → PENDING_REVIEW, CANCELLED
    - PENDING_REVIEW → REVIEWED, DRAFT
    - REVIEWED → APPROVED, PENDING_REVIEW
    - APPROVED → SIGNED, REVIEWED
    - SIGNED → AMENDED (via amendment endpoint)
    
    **Audit Trail:**
    - All transitions logged in workflow history
    - Includes user, timestamp, IP, notes
    
    **Automatic Updates:**
    - REVIEWED: Sets reviewer_id and reviewed_at
    - APPROVED: Sets approver_id and approved_at
    - SIGNED: Sets signed_at
    """,
    responses={
        200: {"description": "Transition successful"},
        400: {"description": "Invalid transition"}
    }
)
async def transition_report_workflow(
    report_id: UUID,
    transition_data: WorkflowTransition,
    request: Request,
    current_user: User = Depends(require_radiologist_or_admin),
    service: ClinicalReportsService = Depends(get_reports_service)
):
    """Transition report workflow state
    
    **Authentication Required:** Radiologist or Admin role
    **Permissions:** MANAGE_WORKFLOW
    """
    try:
        # Enhance transition data with request info
        if not transition_data.ip_address:
            transition_data.ip_address = request.client.host if request.client else None
        if not transition_data.user_agent:
            transition_data.user_agent = request.headers.get("user-agent")
        
        report = service.transition_workflow(report_id, transition_data)
        
        logger.info(
            f"Report {report.report_number} transitioned to {report.status} "
            f"by user {transition_data.user_id}"
        )
        
        return report
        
    except (ReportNotFoundException, InvalidWorkflowTransitionException) as e:
        raise handle_service_exception(e)
    except Exception as e:
        raise handle_service_exception(e)


@router.post(
    "/{report_id}/amend",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create report amendment",
    description="""
    Create an amendment to a signed report.
    
    **Requirements:**
    - Original report must be SIGNED
    - Amendment reason required (minimum 10 characters)
    
    **Process:**
    1. Original report status changed to AMENDED
    2. New report created with incremented version
    3. New report links to original via parent_report_id
    4. New report starts in DRAFT status
    
    **Use Cases:**
    - Correct errors in signed reports
    - Add findings discovered after signing
    - Update assessment based on new information
    """,
    responses={
        201: {"description": "Amendment created successfully"},
        403: {"description": "Original report not signed"}
    }
)
async def create_amendment(
    report_id: UUID,
    amendment_data: ReportAmendment,
    current_user: User = Depends(require_radiologist_or_admin),
    service: ClinicalReportsService = Depends(get_reports_service)
):
    """Create an amendment to a signed report
    
    **Authentication Required:** Radiologist or Admin role
    **Permissions:** AMEND_REPORT
    """
    try:
        # Use authenticated user for audit trail
        amended_report = service.create_amendment(report_id, amendment_data, current_user.id)
        
        logger.info(
            f"Created amendment {amended_report.report_number} "
            f"for report {report_id} by user {current_user.id}"
        )
        
        return amended_report
        
    except (ReportNotFoundException, PermissionDeniedException) as e:
        raise handle_service_exception(e)
    except Exception as e:
        raise handle_service_exception(e)


@router.get(
    "/{report_id}/history",
    response_model=List[WorkflowHistoryResponse],
    summary="Get report workflow history",
    description="""
    Retrieve complete workflow audit trail for a report.
    
    **Information Included:**
    - All state transitions
    - User who performed each transition
    - Timestamps for each transition
    - Transition notes
    - IP addresses and user agents
    
    **Use Cases:**
    - Compliance auditing
    - Workflow analysis
    - Dispute resolution
    - Quality assurance
    """,
    responses={
        200: {
            "description": "Workflow history retrieved",
            "content": {
                "application/json": {
                    "example": [{
                        "from_status": "DRAFT",
                        "to_status": "PENDING_REVIEW",
                        "changed_by": {"username": "dr.smith"},
                        "created_at": "2026-01-08T19:00:00Z"
                    }]
                }
            }
        }
    }
)
async def get_workflow_history(
    report_id: UUID,
    current_user: User = Depends(get_current_active_user),
    service: ClinicalReportsService = Depends(get_reports_service)
):
    """Get workflow history for a report (audit trail)
    
    **Authentication Required:** Any active user
    **Permissions:** READ_AUDIT_TRAIL
    """
    try:
        # First verify report exists
        service.get_report(report_id, include_relations=False)
        
        history = service.get_workflow_history(report_id)
        return history
        
    except ReportNotFoundException as e:
        raise handle_service_exception(e)
    except Exception as e:
        raise handle_service_exception(e)


@router.get(
    "/critical/list",
    response_model=ReportListResponse,
    summary="Get critical findings",
    description="""
    Retrieve reports with critical findings (BI-RADS 4C, 5, 6).
    
    **Critical Findings:**
    - BI-RADS 4C: High suspicion for malignancy
    - BI-RADS 5: Highly suggestive of malignancy
    - BI-RADS 6: Known biopsy-proven malignancy
    
    **Use Cases:**
    - Priority workflow management
    - Quality assurance
    - Patient follow-up tracking
    - Notification systems
    """,
    responses={
        200: {"description": "Critical findings retrieved"}
    }
)
async def get_critical_findings(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum records to return"),
    current_user: User = Depends(get_current_active_user),
    service: ClinicalReportsService = Depends(get_reports_service)
):
    """Get reports with critical findings
    
    **Authentication Required:** Any active user
    **Permissions:** READ_CRITICAL_FINDINGS
    """
    try:
        reports, total = service.get_critical_findings(skip=skip, limit=limit)
        
        return ReportListResponse(
            reports=reports,
            total=total,
            skip=skip,
            limit=limit
        )
        
    except Exception as e:
        raise handle_service_exception(e)


@router.get(
    "/statistics/summary",
    response_model=ReportStatistics,
    summary="Get report statistics",
    description="""
    Retrieve comprehensive statistics about clinical reports.
    
    **Metrics Included:**
    - Total report count
    - Distribution by status (DRAFT, SIGNED, etc.)
    - Distribution by BI-RADS category
    - Critical findings count
    - AI-assisted reports count
    - Average reading time
    - Average complexity score
    
    **Use Cases:**
    - Dashboard analytics
    - Workflow optimization
    - Resource allocation
    - Performance monitoring
    """,
    responses={
        200: {
            "description": "Statistics retrieved",
            "content": {
                "application/json": {
                    "example": {
                        "total_reports": 618,
                        "by_status": {"SIGNED": 117, "DRAFT": 124},
                        "by_birads": {"1": 257, "2": 102},
                        "critical_findings": 14,
                        "ai_assisted_count": 432
                    }
                }
            }
        }
    }
)
async def get_statistics(
    current_user: User = Depends(get_current_active_user),
    service: ClinicalReportsService = Depends(get_reports_service)
):
    """Get comprehensive report statistics
    
    **Authentication Required:** Any active user
    **Permissions:** READ_STATISTICS
    """
    try:
        stats = service.get_statistics()
        return ReportStatistics(**stats)
        
    except Exception as e:
        raise handle_service_exception(e)


# Health check endpoint moved to top of file (before parameterized routes)
