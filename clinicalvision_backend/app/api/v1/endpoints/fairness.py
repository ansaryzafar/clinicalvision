"""
Fairness Monitoring API - Production Implementation

Real fairness monitoring that computes metrics from actual prediction data.
Falls back to demo data when database is unavailable.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
import logging

from sqlalchemy.orm import Session

from app.schemas.fairness import (
    AlertSeverity,
    FairnessAlert,
    FairnessDashboardResponse,
)
from app.services.fairness_service import get_fairness_service
from app.db.session import get_db
from app.core.dependencies import get_current_active_user
from app.db.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/fairness", tags=["Fairness Monitoring"])


def get_real_or_demo_dashboard(db: Session) -> FairnessDashboardResponse:
    """
    Try to use real fairness computation from database.
    Falls back to demo data when insufficient prediction data exists.
    """
    try:
        # Try real computation first
        from app.services.real_fairness_service import RealFairnessService
        real_service = RealFairnessService(db)
        return real_service.get_dashboard()
    except (ImportError, OSError, ConnectionError) as e:
        # F5: Narrow catch — only infrastructure/import failures
        logger.warning(f"Real fairness computation failed (infrastructure), using demo: {e}")
        service = get_fairness_service()
        response = service.get_dashboard()
        response.metadata = {
            "data_source": "demo_fallback",
            "reason": str(e),
            "note": "Using pre-computed demo data due to infrastructure error"
        }
        return response
    except Exception as e:
        # Application-level errors: still fall back but log as error for investigation
        logger.error(f"Real fairness computation failed (application error), using demo: {e}")
        service = get_fairness_service()
        response = service.get_dashboard()
        response.metadata = {
            "data_source": "demo_fallback",
            "reason": str(e),
            "note": "Using pre-computed demo data due to application error"
        }
        return response


@router.get(
    "/dashboard",
    response_model=FairnessDashboardResponse,
    summary="Get Fairness Dashboard",
    description="Returns fairness monitoring dashboard. Uses real prediction data when available, falls back to demonstration data when the database lacks sufficient predictions or ground truth labels."
)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> FairnessDashboardResponse:
    """
    Get fairness monitoring dashboard data.
    
    This endpoint attempts to compute REAL fairness metrics by:
    1. Querying actual predictions from the database
    2. Joining with DICOM metadata for demographic attributes
    3. Computing sensitivity/specificity by protected attribute subgroups
    4. Identifying disparities that exceed regulatory thresholds
    
    When insufficient real data is available, falls back to pre-computed
    demonstration data with metadata.data_source set to 'demo_fallback'.
    The frontend should check this field and display a disclosure banner.
    
    Returns:
        Dashboard with compliance status, alerts, and subgroup metrics.
        Check metadata.data_source to determine if data is real or demo.
    """
    try:
        return get_real_or_demo_dashboard(db)
    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        raise HTTPException(status_code=500, detail="Failed to load dashboard")


@router.get(
    "/alerts",
    response_model=List[FairnessAlert],
    summary="Get Fairness Alerts",
    description="Returns active fairness alerts with optional filtering."
)
def get_alerts(
    severity: Optional[AlertSeverity] = Query(None, description="Filter by severity"),
    acknowledged: Optional[bool] = Query(None, description="Filter by acknowledgment status"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of records to return"),
    current_user: User = Depends(get_current_active_user)
) -> List[FairnessAlert]:
    """
    Get fairness alerts with pagination.
    
    Args:
        severity: Optional filter by alert severity
        acknowledged: Optional filter by acknowledgment status
        skip: Number of records to skip (pagination offset)
        limit: Maximum number of records to return
        
    Returns:
        List of fairness alerts matching filters.
    """
    try:
        service = get_fairness_service()
        alerts = service.get_alerts(
            severity=severity, acknowledged=acknowledged,
            skip=skip, limit=limit,
        )
        return alerts
    except Exception as e:
        logger.error(f"Alerts error: {e}")
        raise HTTPException(status_code=500, detail="Failed to load alerts")


@router.post(
    "/alerts/{alert_id}/acknowledge",
    summary="Acknowledge Alert",
    description="Mark a fairness alert as acknowledged."
)
def acknowledge_alert(
    alert_id: str,
    current_user: User = Depends(get_current_active_user)
) -> dict:
    """
    Acknowledge a fairness alert.
    
    Args:
        alert_id: The ID of the alert to acknowledge
        
    Returns:
        Success message
    """
    try:
        service = get_fairness_service()
        if service.acknowledge_alert(alert_id):
            return {"status": "acknowledged", "alert_id": alert_id}
        raise HTTPException(status_code=404, detail="Alert not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Acknowledge error: {e}")
        raise HTTPException(status_code=500, detail="Failed to acknowledge alert")
