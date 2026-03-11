"""
Analytics Service — SQL Aggregation with Caching

Provides efficient PostgreSQL aggregation queries for the AI Metrics Dashboard.
All queries use a single pass through the analyses table with conditional
aggregation to minimize DB round-trips.

Caching: In-memory TTL cache keyed on (period, user_id) prevents redundant
queries within the configured TTL window.
"""

import logging
import math
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from sqlalchemy import case, cast, func, Float, Integer, and_, literal
from sqlalchemy.orm import Session

from app.db.models.analysis import Analysis, AnalysisStatus, PredictionClass
from app.schemas.analytics import (
    ConfidenceTrendPoint,
    KPITrends,
    LatencyPercentilePoint,
    OverviewKPIs,
    OverviewMetricsResponse,
    PredictionDistribution,
    RiskDistribution,
)

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────────────────────────────────
# Period helpers
# ────────────────────────────────────────────────────────────────────────────

VALID_PERIODS = {"7d", "30d", "90d", "all"}


def _period_to_days(period: str) -> int:
    """Convert period string to number of days (0 = no limit)."""
    return {"7d": 7, "30d": 30, "90d": 90, "all": 0}.get(period, 30)


def _cutoff_date(period: str) -> Optional[datetime]:
    """Return the earliest date for the given period, or None for 'all'."""
    days = _period_to_days(period)
    if days == 0:
        return None
    return datetime.now(timezone.utc) - timedelta(days=days)


# ────────────────────────────────────────────────────────────────────────────
# Simple in-memory cache
# ────────────────────────────────────────────────────────────────────────────

_cache: Dict[str, Tuple[datetime, OverviewMetricsResponse]] = {}
CACHE_TTL_SECONDS = 300  # 5 minutes


def _cache_key(period: str) -> str:
    return f"overview:{period}"


def _get_cached(period: str) -> Optional[OverviewMetricsResponse]:
    key = _cache_key(period)
    entry = _cache.get(key)
    if entry is None:
        return None
    cached_at, data = entry
    if (datetime.now(timezone.utc) - cached_at).total_seconds() > CACHE_TTL_SECONDS:
        del _cache[key]
        return None
    return data


def _set_cached(period: str, data: OverviewMetricsResponse) -> None:
    _cache[_cache_key(period)] = (datetime.now(timezone.utc), data)


def invalidate_cache(period: Optional[str] = None) -> None:
    """Clear cached analytics — call after new analyses are created."""
    if period:
        _cache.pop(_cache_key(period), None)
    else:
        _cache.clear()


# ────────────────────────────────────────────────────────────────────────────
# Core query builder
# ────────────────────────────────────────────────────────────────────────────

def _base_filter(db: Session, cutoff: Optional[datetime]):
    """Return a base query filtered to completed analyses within the period."""
    q = db.query(Analysis).filter(Analysis.status == AnalysisStatus.COMPLETED)
    if cutoff is not None:
        q = q.filter(Analysis.created_at >= cutoff)
    return q


# ────────────────────────────────────────────────────────────────────────────
# Public API
# ────────────────────────────────────────────────────────────────────────────

def get_overview_metrics(db: Session, period: str = "30d") -> OverviewMetricsResponse:
    """
    Aggregate overview metrics from the analyses table.

    Uses conditional aggregation in a single pass where possible,
    then separate queries for trend/percentile time-series.

    Args:
        db: SQLAlchemy session
        period: One of '7d', '30d', '90d', 'all'

    Returns:
        OverviewMetricsResponse populated with all fields
    """
    if period not in VALID_PERIODS:
        period = "30d"

    # Check cache
    cached = _get_cached(period)
    if cached is not None:
        logger.debug(f"Analytics cache hit for period={period}")
        return cached

    cutoff = _cutoff_date(period)
    prev_cutoff = _previous_period_cutoff(period, cutoff)

    try:
        kpis = _compute_kpis(db, cutoff)
        kpi_trends = _compute_kpi_trends(db, cutoff, prev_cutoff)
        confidence_trend = _compute_confidence_trend(db, cutoff)
        prediction_dist = _compute_prediction_distribution(db, cutoff)
        risk_dist = _compute_risk_distribution(db, cutoff)
        birads_dist = _compute_birads_distribution(db, cutoff)
        latency_pcts = _compute_latency_percentiles(db, cutoff)

        result = OverviewMetricsResponse(
            kpis=kpis,
            kpi_trends=kpi_trends,
            confidence_trend=confidence_trend,
            prediction_distribution=prediction_dist,
            risk_distribution=risk_dist,
            birads_distribution=birads_dist,
            latency_percentiles=latency_pcts,
        )

        _set_cached(period, result)
        logger.info(f"Analytics overview computed for period={period}, "
                     f"total_analyses={kpis.total_analyses}")
        return result

    except Exception as e:
        logger.error(f"Analytics aggregation failed: {e}", exc_info=True)
        # Return empty rather than crash
        return OverviewMetricsResponse()


# ────────────────────────────────────────────────────────────────────────────
# Private aggregation functions
# ────────────────────────────────────────────────────────────────────────────

def _compute_kpis(db: Session, cutoff: Optional[datetime]) -> OverviewKPIs:
    """Single-pass conditional aggregation for headline KPIs."""
    base = _base_filter(db, cutoff)

    row = base.with_entities(
        func.count(Analysis.id).label("total"),
        func.coalesce(func.avg(Analysis.confidence_score), 0.0).label("avg_conf"),
        func.coalesce(
            func.avg(
                func.coalesce(Analysis.inference_time_ms, cast(Analysis.processing_time_ms, Float))
            ),
            0.0,
        ).label("avg_latency"),
        func.count(
            case(
                (Analysis.requires_human_review == True, Analysis.id),  # noqa: E712
            )
        ).label("high_unc"),
        func.count(func.distinct(Analysis.image_id)).label("total_images"),
    ).first()

    total = row.total if row else 0
    high_unc = row.high_unc if row else 0

    return OverviewKPIs(
        total_analyses=total,
        average_confidence=float(row.avg_conf) if row else 0.0,
        average_inference_time_ms=float(row.avg_latency) if row else 0.0,
        high_uncertainty_rate=(high_unc / total) if total > 0 else 0.0,
        total_cases=row.total_images if row else 0,
        completed_cases=row.total_images if row else 0,
    )


def _previous_period_cutoff(
    period: str, current_cutoff: Optional[datetime]
) -> Optional[datetime]:
    """Compute the cutoff for the previous period (used for trend deltas)."""
    days = _period_to_days(period)
    if days == 0 or current_cutoff is None:
        return None
    return current_cutoff - timedelta(days=days)


def _compute_kpi_trends(
    db: Session,
    cutoff: Optional[datetime],
    prev_cutoff: Optional[datetime],
) -> KPITrends:
    """Compare current vs previous period averages."""
    if prev_cutoff is None or cutoff is None:
        return KPITrends()

    # Previous-period aggregation
    prev_q = (
        db.query(Analysis)
        .filter(
            Analysis.status == AnalysisStatus.COMPLETED,
            Analysis.created_at >= prev_cutoff,
            Analysis.created_at < cutoff,
        )
    )

    prev_row = prev_q.with_entities(
        func.count(Analysis.id).label("total"),
        func.coalesce(func.avg(Analysis.confidence_score), 0.0).label("avg_conf"),
        func.coalesce(
            func.avg(
                func.coalesce(Analysis.inference_time_ms, cast(Analysis.processing_time_ms, Float))
            ),
            0.0,
        ).label("avg_latency"),
        func.count(
            case(
                (Analysis.requires_human_review == True, Analysis.id),  # noqa: E712
            )
        ).label("high_unc"),
    ).first()

    if not prev_row or prev_row.total == 0:
        return KPITrends()

    # Current period
    curr_q = _base_filter(db, cutoff)
    curr_row = curr_q.with_entities(
        func.count(Analysis.id).label("total"),
        func.coalesce(func.avg(Analysis.confidence_score), 0.0).label("avg_conf"),
        func.coalesce(
            func.avg(
                func.coalesce(Analysis.inference_time_ms, cast(Analysis.processing_time_ms, Float))
            ),
            0.0,
        ).label("avg_latency"),
        func.count(
            case(
                (Analysis.requires_human_review == True, Analysis.id),  # noqa: E712
            )
        ).label("high_unc"),
    ).first()

    curr_total = curr_row.total if curr_row else 0
    prev_total = prev_row.total

    curr_unc_rate = (curr_row.high_unc / curr_total) if curr_total > 0 else 0.0
    prev_unc_rate = (prev_row.high_unc / prev_total) if prev_total > 0 else 0.0

    return KPITrends(
        confidence_change=float(curr_row.avg_conf) - float(prev_row.avg_conf),
        latency_change=float(curr_row.avg_latency) - float(prev_row.avg_latency),
        uncertainty_change=curr_unc_rate - prev_unc_rate,
    )


def _compute_confidence_trend(
    db: Session, cutoff: Optional[datetime]
) -> List[ConfidenceTrendPoint]:
    """Group by date → avg/std confidence + count."""
    date_col = func.date(Analysis.created_at).label("day")

    q = (
        db.query(
            date_col,
            func.avg(Analysis.confidence_score).label("avg_conf"),
            func.coalesce(func.stddev_pop(Analysis.confidence_score), 0.0).label("std_conf"),
            func.count(Analysis.id).label("cnt"),
        )
        .filter(Analysis.status == AnalysisStatus.COMPLETED)
    )
    if cutoff is not None:
        q = q.filter(Analysis.created_at >= cutoff)

    rows = q.group_by(date_col).order_by(date_col).all()

    return [
        ConfidenceTrendPoint(
            date=str(r.day),
            avg_confidence=round(float(r.avg_conf), 4),
            std_confidence=round(float(r.std_conf), 4),
            analysis_count=r.cnt,
        )
        for r in rows
    ]


def _compute_prediction_distribution(
    db: Session, cutoff: Optional[datetime]
) -> PredictionDistribution:
    """Count benign vs malignant predictions."""
    q = _base_filter(db, cutoff).with_entities(
        func.count(
            case((Analysis.prediction_class == PredictionClass.BENIGN, Analysis.id))
        ).label("benign"),
        func.count(
            case((Analysis.prediction_class == PredictionClass.MALIGNANT, Analysis.id))
        ).label("malignant"),
    ).first()

    return PredictionDistribution(
        benign=q.benign if q else 0,
        malignant=q.malignant if q else 0,
    )


def _compute_risk_distribution(
    db: Session, cutoff: Optional[datetime]
) -> RiskDistribution:
    """Count low / moderate / high risk analyses."""
    q = _base_filter(db, cutoff).with_entities(
        func.count(case((Analysis.risk_level == "low", Analysis.id))).label("low"),
        func.count(case((Analysis.risk_level == "moderate", Analysis.id))).label("moderate"),
        func.count(case((Analysis.risk_level == "high", Analysis.id))).label("high"),
    ).first()

    return RiskDistribution(
        low=q.low if q else 0,
        moderate=q.moderate if q else 0,
        high=q.high if q else 0,
    )


def _compute_birads_distribution(
    db: Session, cutoff: Optional[datetime]
) -> Dict[str, int]:
    """Count analyses per BI-RADS category."""
    q = (
        _base_filter(db, cutoff)
        .filter(Analysis.birads_category.isnot(None))
        .with_entities(
            Analysis.birads_category,
            func.count(Analysis.id).label("cnt"),
        )
        .group_by(Analysis.birads_category)
    )
    return {str(r.birads_category.value if hasattr(r.birads_category, 'value') else r.birads_category): r.cnt for r in q.all()}


def _compute_latency_percentiles(
    db: Session, cutoff: Optional[datetime]
) -> List[LatencyPercentilePoint]:
    """
    Group by date and compute p50 / p90 / p99 latency.

    Uses SQL percentile_cont (PostgreSQL) when available,
    otherwise falls back to loading values and computing in Python.
    """
    date_col = func.date(Analysis.created_at).label("day")
    latency_col = func.coalesce(
        Analysis.inference_time_ms, cast(Analysis.processing_time_ms, Float)
    )

    q = (
        db.query(
            date_col,
            func.count(Analysis.id).label("cnt"),
        )
        .filter(
            Analysis.status == AnalysisStatus.COMPLETED,
            latency_col.isnot(None),
        )
    )
    if cutoff is not None:
        q = q.filter(Analysis.created_at >= cutoff)

    day_rows = q.group_by(date_col).order_by(date_col).all()

    results: List[LatencyPercentilePoint] = []
    for day_row in day_rows:
        day = day_row.day
        # Fetch all latencies for this day
        latencies_q = (
            db.query(latency_col.label("lat"))
            .filter(
                Analysis.status == AnalysisStatus.COMPLETED,
                func.date(Analysis.created_at) == day,
                latency_col.isnot(None),
            )
            .order_by(latency_col)
        )
        latencies = [float(r.lat) for r in latencies_q.all()]
        if not latencies:
            continue

        results.append(
            LatencyPercentilePoint(
                date=str(day),
                p50=_percentile(latencies, 0.50),
                p90=_percentile(latencies, 0.90),
                p99=_percentile(latencies, 0.99),
            )
        )

    return results


def _percentile(sorted_values: List[float], pct: float) -> float:
    """Compute the pct-th percentile from a pre-sorted list."""
    if not sorted_values:
        return 0.0
    n = len(sorted_values)
    k = (n - 1) * pct
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return round(sorted_values[int(k)], 1)
    return round(sorted_values[f] * (c - k) + sorted_values[c] * (k - f), 1)
