"""
Analytics API Endpoints

Provides aggregate AI performance metrics for the dashboard.
All endpoints require authenticated user with radiologist, technician, or admin role.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models.user import User
from app.core.dependencies import get_current_active_user
from app.schemas.analytics import OverviewMetricsResponse
from app.services.analytics_service import get_overview_metrics, VALID_PERIODS

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/analytics",
    tags=["Analytics Dashboard"],
)


@router.get(
    "/overview",
    response_model=OverviewMetricsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get overview metrics for AI Analytics dashboard",
    description=(
        "Returns aggregated KPIs, trend data, prediction/risk/BI-RADS distributions, "
        "and latency percentiles for the selected time period. "
        "Results are cached for 5 minutes."
    ),
)
async def get_overview(
    period: str = Query(
        default="30d",
        description="Time period: '7d', '30d', '90d', or 'all'",
        pattern="^(7d|30d|90d|all)$",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> OverviewMetricsResponse:
    """
    **Get AI Analytics Overview Metrics**

    Aggregates inference results from the database for the specified period.

    **Authentication:** Requires any authenticated active user.

    **Query Parameters:**
    - `period` — `7d` | `30d` | `90d` | `all` (default: `30d`)

    **Returns:** OverviewMetricsResponse with KPIs, trends, distributions, and charts data.
    """
    try:
        metrics = get_overview_metrics(db, period)
        logger.info(
            f"Analytics overview served for user={current_user.email}, period={period}"
        )
        return metrics

    except Exception as e:
        logger.error(f"Analytics overview failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compute analytics overview",
        )
