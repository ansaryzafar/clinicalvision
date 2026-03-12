"""
Analytics API Endpoints

Provides aggregate AI performance metrics for the dashboard.
All endpoints require authenticated user.

Endpoints:
 - GET /api/v1/analytics/overview          → OverviewMetricsResponse
 - GET /api/v1/analytics/performance       → PerformanceMetricsResponse
 - GET /api/v1/analytics/model-intelligence → ModelIntelligenceMetricsResponse
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models.user import User
from app.core.dependencies import get_current_active_user
from app.schemas.analytics import (
    OverviewMetricsResponse,
    PerformanceMetricsResponse,
    ModelIntelligenceMetricsResponse,
    SystemHealthResponse,
)
from app.services.analytics_service import (
    get_overview_metrics,
    get_performance_metrics,
    get_model_intelligence_metrics,
    get_system_health,
    VALID_PERIODS,
)

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


# ────────────────────────────────────────────────────────────────────────────
# Performance Deep Dive
# ────────────────────────────────────────────────────────────────────────────

@router.get(
    "/performance",
    response_model=PerformanceMetricsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get performance deep-dive metrics",
    description=(
        "Returns model accuracy KPIs (sensitivity, specificity, AUC-ROC), "
        "confidence histogram, uncertainty scatter, temporal confidence trends, "
        "and AI-vs-radiologist concordance data."
    ),
)
async def get_performance(
    period: str = Query(
        default="30d",
        description="Time period: '7d', '30d', '90d', or 'all'",
        pattern="^(7d|30d|90d|all)$",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PerformanceMetricsResponse:
    """
    **Get Performance Deep-Dive Metrics**

    Aggregates model accuracy, confidence distribution, uncertainty scatter,
    temporal trends, and concordance data for the specified period.
    """
    try:
        metrics = get_performance_metrics(db, period)
        logger.info(
            f"Performance metrics served for user={current_user.email}, period={period}"
        )
        return metrics

    except Exception as e:
        logger.error(f"Performance metrics failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compute performance metrics",
        )


# ────────────────────────────────────────────────────────────────────────────
# Model Intelligence
# ────────────────────────────────────────────────────────────────────────────

@router.get(
    "/model-intelligence",
    response_model=ModelIntelligenceMetricsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get model intelligence metrics",
    description=(
        "Returns uncertainty decomposition (epistemic vs aleatoric), "
        "model version comparison, human review rates, "
        "and review trigger classification."
    ),
)
async def get_model_intelligence(
    period: str = Query(
        default="30d",
        description="Time period: '7d', '30d', '90d', or 'all'",
        pattern="^(7d|30d|90d|all)$",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ModelIntelligenceMetricsResponse:
    """
    **Get Model Intelligence Metrics**

    Aggregates deep model behavior insights: uncertainty decomposition,
    version-level performance comparison, human review trigger rates,
    and categorized review triggers.
    """
    try:
        metrics = get_model_intelligence_metrics(db, period)
        logger.info(
            f"Model intelligence metrics served for user={current_user.email}, period={period}"
        )
        return metrics

    except Exception as e:
        logger.error(f"Model intelligence metrics failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compute model intelligence metrics",
        )


# ────────────────────────────────────────────────────────────────────────────
# System Health
# ────────────────────────────────────────────────────────────────────────────

@router.get(
    "/system-health",
    response_model=SystemHealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Get system health status for dashboard status bar",
    description=(
        "Returns model status, backend health, GPU availability, "
        "uptime, recent error count, and inference queue depth."
    ),
)
async def get_system_health_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> SystemHealthResponse:
    """
    **Get System Health Status**

    Returns a snapshot of system health for the dashboard status bar
    in the Overview tab.
    """
    try:
        health = get_system_health(db)
        logger.info(
            f"System health served for user={current_user.email}"
        )
        return health

    except Exception as e:
        logger.error(f"System health endpoint failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve system health",
        )
