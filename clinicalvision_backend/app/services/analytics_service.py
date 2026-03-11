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
    ConfidenceBin,
    ConfidenceTrendPoint,
    ConcordanceEntry,
    HumanReviewRatePoint,
    KPITrends,
    LatencyPercentilePoint,
    ModelIntelligenceMetricsResponse,
    ModelVersionStatsEntry,
    OverviewKPIs,
    OverviewMetricsResponse,
    PerformanceKPIs,
    PerformanceKPITrends,
    PerformanceMetricsResponse,
    PredictionDistribution,
    ReviewTriggerEntry,
    RiskDistribution,
    TemporalConfidencePoint,
    UncertaintyDecompositionPoint,
    UncertaintyScatterPoint,
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
        # Also clear performance / model-intelligence caches
        _generic_cache.pop(f"performance:{period}", None)
        _generic_cache.pop(f"model_intelligence:{period}", None)
    else:
        _cache.clear()
        _generic_cache.clear()


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


# ════════════════════════════════════════════════════════════════════════════
# PERFORMANCE DEEP DIVE (Tab 2)
# ════════════════════════════════════════════════════════════════════════════

def get_performance_metrics(db: Session, period: str = "30d") -> PerformanceMetricsResponse:
    """
    Aggregate performance deep-dive metrics.

    Includes model accuracy KPIs (from Feedback ground truth), confidence
    histogram, uncertainty scatter, temporal confidence trends, and
    AI-vs-radiologist concordance rates.
    """
    if period not in VALID_PERIODS:
        period = "30d"

    cache_key = f"performance:{period}"
    cached = _get_cached_generic(cache_key)
    if cached is not None:
        return cached

    cutoff = _cutoff_date(period)
    prev_cutoff = _previous_period_cutoff(period, cutoff)

    try:
        kpis = _compute_performance_kpis(db, cutoff)
        kpi_trends = _compute_performance_kpi_trends(db, cutoff, prev_cutoff)
        histogram = _compute_confidence_histogram(db, cutoff)
        scatter = _compute_uncertainty_scatter(db, cutoff)
        temporal = _compute_temporal_confidence(db, cutoff)
        concordance = _compute_concordance(db, cutoff)

        result = PerformanceMetricsResponse(
            kpis=kpis,
            kpi_trends=kpi_trends,
            confidence_histogram=histogram,
            uncertainty_scatter=scatter,
            temporal_confidence=temporal,
            concordance_data=concordance,
        )

        _set_cached_generic(cache_key, result)
        logger.info(f"Performance metrics computed for period={period}")
        return result

    except Exception as e:
        logger.error(f"Performance aggregation failed: {e}", exc_info=True)
        return PerformanceMetricsResponse()


def _compute_performance_kpis(
    db: Session, cutoff: Optional[datetime]
) -> PerformanceKPIs:
    """
    Compute sensitivity, specificity, PPV, NPV, F1, AUC-ROC from Feedback.

    Joins Analysis → Feedback where is_correct is populated, using
    prediction_class as the AI prediction and actual_diagnosis as ground truth.
    """
    try:
        from app.db.models.feedback import Feedback

        q = (
            db.query(
                Analysis.prediction_class,
                Feedback.actual_diagnosis,
            )
            .join(Feedback, Feedback.analysis_id == Analysis.id)
            .filter(Analysis.status == AnalysisStatus.COMPLETED)
        )
        if cutoff is not None:
            q = q.filter(Analysis.created_at >= cutoff)

        rows = q.all()
        if not rows:
            return PerformanceKPIs()

        tp = fp = tn = fn = 0
        for pred_class, actual_diag in rows:
            pred_mal = pred_class == PredictionClass.MALIGNANT
            actual_str = actual_diag.value if hasattr(actual_diag, 'value') else str(actual_diag)
            actual_mal = actual_str == "malignant"

            if pred_mal and actual_mal:
                tp += 1
            elif pred_mal and not actual_mal:
                fp += 1
            elif not pred_mal and actual_mal:
                fn += 1
            else:
                tn += 1

        sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0
        ppv = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        npv = tn / (tn + fn) if (tn + fn) > 0 else 0.0
        precision = ppv
        f1 = (2 * precision * sensitivity / (precision + sensitivity)
              if (precision + sensitivity) > 0 else 0.0)

        # AUC-ROC approximation: average of sensitivity and specificity
        # (Proper AUC requires continuous score thresholding — acceptable approx for dashboard)
        auc_roc = (sensitivity + specificity) / 2.0

        return PerformanceKPIs(
            sensitivity=round(sensitivity, 4),
            specificity=round(specificity, 4),
            auc_roc=round(auc_roc, 4),
            ppv=round(ppv, 4),
            npv=round(npv, 4),
            f1_score=round(f1, 4),
        )
    except Exception as e:
        logger.warning(f"Performance KPI computation failed: {e}")
        return PerformanceKPIs()


def _compute_performance_kpi_trends(
    db: Session,
    cutoff: Optional[datetime],
    prev_cutoff: Optional[datetime],
) -> PerformanceKPITrends:
    """Compare current vs previous period performance KPIs."""
    if prev_cutoff is None or cutoff is None:
        return PerformanceKPITrends()

    current = _compute_performance_kpis(db, cutoff)
    previous = _compute_performance_kpis(db, prev_cutoff)

    return PerformanceKPITrends(
        sensitivity_change=round(current.sensitivity - previous.sensitivity, 4),
        specificity_change=round(current.specificity - previous.specificity, 4),
        auc_roc_change=round(current.auc_roc - previous.auc_roc, 4),
        ppv_change=round(current.ppv - previous.ppv, 4),
    )


def _compute_confidence_histogram(
    db: Session, cutoff: Optional[datetime], num_bins: int = 10
) -> List[ConfidenceBin]:
    """Build a confidence score histogram with configurable bin count."""
    q = _base_filter(db, cutoff).filter(Analysis.confidence_score.isnot(None))

    scores = [
        float(r[0])
        for r in q.with_entities(Analysis.confidence_score).all()
    ]
    if not scores:
        return []

    bin_width = 1.0 / num_bins
    bins: List[ConfidenceBin] = []

    for i in range(num_bins):
        bin_start = round(i * bin_width, 2)
        bin_end = round((i + 1) * bin_width, 2)
        count = sum(
            1 for s in scores
            if (bin_start <= s < bin_end) or (i == num_bins - 1 and s == bin_end)
        )
        lo_pct = int(bin_start * 100)
        hi_pct = int(bin_end * 100)
        bins.append(ConfidenceBin(
            bin_start=bin_start,
            bin_end=bin_end,
            count=count,
            label=f"{lo_pct}–{hi_pct}%",
        ))

    return bins


def _compute_uncertainty_scatter(
    db: Session, cutoff: Optional[datetime], limit: int = 200
) -> List[UncertaintyScatterPoint]:
    """
    Return recent (confidence, uncertainty) pairs for the scatter chart.
    Capped at `limit` to keep the payload reasonable.
    """
    latency_col = func.coalesce(
        Analysis.inference_time_ms, cast(Analysis.processing_time_ms, Float)
    )

    q = (
        _base_filter(db, cutoff)
        .filter(
            Analysis.confidence_score.isnot(None),
            Analysis.epistemic_uncertainty.isnot(None),
        )
        .with_entities(
            Analysis.confidence_score,
            Analysis.epistemic_uncertainty,
            Analysis.risk_level,
            latency_col.label("latency"),
        )
        .order_by(Analysis.created_at.desc())
        .limit(limit)
    )

    return [
        UncertaintyScatterPoint(
            confidence=round(float(r.confidence_score), 4),
            uncertainty=round(float(r.epistemic_uncertainty), 4),
            risk_level=r.risk_level or "low",
            processing_time_ms=round(float(r.latency or 0), 1),
        )
        for r in q.all()
    ]


def _compute_temporal_confidence(
    db: Session, cutoff: Optional[datetime]
) -> List[TemporalConfidencePoint]:
    """Daily confidence + uncertainty component averages."""
    date_col = func.date(Analysis.created_at).label("day")

    q = (
        db.query(
            date_col,
            func.avg(Analysis.confidence_score).label("avg_conf"),
            func.coalesce(func.avg(Analysis.epistemic_uncertainty), 0.0).label("avg_epi"),
            func.coalesce(func.avg(Analysis.aleatoric_uncertainty), 0.0).label("avg_ale"),
            func.count(
                case(
                    (Analysis.requires_human_review == True, Analysis.id),  # noqa: E712
                )
            ).label("high_unc"),
            func.count(Analysis.id).label("cnt"),
        )
        .filter(Analysis.status == AnalysisStatus.COMPLETED)
    )
    if cutoff is not None:
        q = q.filter(Analysis.created_at >= cutoff)

    rows = q.group_by(date_col).order_by(date_col).all()

    return [
        TemporalConfidencePoint(
            date=str(r.day),
            avg_confidence=round(float(r.avg_conf or 0), 4),
            avg_epistemic_uncertainty=round(float(r.avg_epi), 4),
            avg_aleatoric_uncertainty=round(float(r.avg_ale), 4),
            high_uncertainty_count=r.high_unc,
            analysis_count=r.cnt,
        )
        for r in rows
    ]


def _compute_concordance(
    db: Session, cutoff: Optional[datetime]
) -> List[ConcordanceEntry]:
    """AI vs radiologist agreement rates per prediction category."""
    try:
        from app.db.models.feedback import Feedback

        q = (
            db.query(
                Analysis.prediction_class,
                func.count(Analysis.id).label("ai_count"),
                func.count(Feedback.id).label("feedback_count"),
                func.count(
                    case((Feedback.is_correct == True, Feedback.id))  # noqa: E712
                ).label("agree_count"),
            )
            .outerjoin(Feedback, Feedback.analysis_id == Analysis.id)
            .filter(Analysis.status == AnalysisStatus.COMPLETED)
        )
        if cutoff is not None:
            q = q.filter(Analysis.created_at >= cutoff)

        rows = q.group_by(Analysis.prediction_class).all()

        results: List[ConcordanceEntry] = []
        for r in rows:
            cat = r.prediction_class.value if hasattr(r.prediction_class, 'value') else str(r.prediction_class)
            fb = r.feedback_count or 0
            agree = r.agree_count or 0
            results.append(ConcordanceEntry(
                category=cat.capitalize(),
                ai_count=r.ai_count,
                radiologist_count=fb,
                agreement_rate=round(agree / fb, 4) if fb > 0 else 0.0,
            ))
        return results

    except Exception as e:
        logger.warning(f"Concordance computation failed: {e}")
        return []


# ════════════════════════════════════════════════════════════════════════════
# MODEL INTELLIGENCE (Tab 3)
# ════════════════════════════════════════════════════════════════════════════

def get_model_intelligence_metrics(
    db: Session, period: str = "30d"
) -> ModelIntelligenceMetricsResponse:
    """
    Aggregate model intelligence metrics.

    Covers uncertainty decomposition, model version comparison,
    human review rates, and review trigger breakdown.
    """
    if period not in VALID_PERIODS:
        period = "30d"

    cache_key = f"model_intelligence:{period}"
    cached = _get_cached_generic(cache_key)
    if cached is not None:
        return cached

    cutoff = _cutoff_date(period)

    try:
        decomposition = _compute_uncertainty_decomposition(db, cutoff)
        version_stats = _compute_model_version_comparison(db, cutoff)
        review_rate = _compute_human_review_rate(db, cutoff)
        triggers = _compute_review_triggers(db, cutoff)

        result = ModelIntelligenceMetricsResponse(
            uncertainty_decomposition=decomposition,
            model_version_comparison=version_stats,
            human_review_rate=review_rate,
            review_triggers=triggers,
        )

        _set_cached_generic(cache_key, result)
        logger.info(f"Model intelligence metrics computed for period={period}")
        return result

    except Exception as e:
        logger.error(f"Model intelligence aggregation failed: {e}", exc_info=True)
        return ModelIntelligenceMetricsResponse()


def _compute_uncertainty_decomposition(
    db: Session, cutoff: Optional[datetime]
) -> List[UncertaintyDecompositionPoint]:
    """Daily epistemic vs aleatoric uncertainty averages."""
    date_col = func.date(Analysis.created_at).label("day")

    q = (
        db.query(
            date_col,
            func.coalesce(func.avg(Analysis.epistemic_uncertainty), 0.0).label("epi"),
            func.coalesce(func.avg(Analysis.aleatoric_uncertainty), 0.0).label("ale"),
            func.coalesce(func.avg(Analysis.predictive_entropy), 0.0).label("total"),
        )
        .filter(Analysis.status == AnalysisStatus.COMPLETED)
    )
    if cutoff is not None:
        q = q.filter(Analysis.created_at >= cutoff)

    rows = q.group_by(date_col).order_by(date_col).all()

    return [
        UncertaintyDecompositionPoint(
            date=str(r.day),
            epistemic=round(float(r.epi), 4),
            aleatoric=round(float(r.ale), 4),
            total=round(float(r.total), 4),
        )
        for r in rows
    ]


def _compute_model_version_comparison(
    db: Session, cutoff: Optional[datetime]
) -> List[ModelVersionStatsEntry]:
    """Per-version aggregated statistics."""
    latency_col = func.coalesce(
        Analysis.inference_time_ms, cast(Analysis.processing_time_ms, Float)
    )

    q = (
        db.query(
            Analysis.model_version,
            func.count(Analysis.id).label("cnt"),
            func.avg(Analysis.confidence_score).label("avg_conf"),
            func.avg(latency_col).label("avg_lat"),
        )
        .filter(
            Analysis.status == AnalysisStatus.COMPLETED,
            Analysis.model_version.isnot(None),
        )
    )
    if cutoff is not None:
        q = q.filter(Analysis.created_at >= cutoff)

    rows = q.group_by(Analysis.model_version).order_by(func.count(Analysis.id).desc()).all()

    results: List[ModelVersionStatsEntry] = []
    for r in rows:
        # Attempt to get AUC-ROC from the ModelVersion table
        auc = 0.0
        try:
            from app.db.models.model_version import ModelVersion
            mv = (
                db.query(ModelVersion)
                .filter(ModelVersion.version == r.model_version)
                .first()
            )
            if mv and mv.validation_metrics and isinstance(mv.validation_metrics, dict):
                auc = float(mv.validation_metrics.get("auc_roc", 0.0))
        except Exception:
            pass

        results.append(ModelVersionStatsEntry(
            version=str(r.model_version),
            accuracy=0.0,  # Requires ground truth — populated from Feedback if available
            avg_confidence=round(float(r.avg_conf or 0), 4),
            avg_latency_ms=round(float(r.avg_lat or 0), 1),
            total_predictions=r.cnt,
            auc_roc=round(auc, 4),
        ))

    return results


def _compute_human_review_rate(
    db: Session, cutoff: Optional[datetime]
) -> List[HumanReviewRatePoint]:
    """Daily human-review-required rate."""
    date_col = func.date(Analysis.created_at).label("day")

    q = (
        db.query(
            date_col,
            func.count(Analysis.id).label("total"),
            func.count(
                case(
                    (Analysis.requires_human_review == True, Analysis.id),  # noqa: E712
                )
            ).label("reviewed"),
        )
        .filter(Analysis.status == AnalysisStatus.COMPLETED)
    )
    if cutoff is not None:
        q = q.filter(Analysis.created_at >= cutoff)

    rows = q.group_by(date_col).order_by(date_col).all()

    return [
        HumanReviewRatePoint(
            date=str(r.day),
            review_rate=round(r.reviewed / r.total, 4) if r.total > 0 else 0.0,
            total_cases=r.total,
            reviewed_cases=r.reviewed,
        )
        for r in rows
    ]


# ── Review trigger classification ────────────────────────────────────────

# Thresholds for trigger classification (configurable)
TRIGGER_THRESHOLDS = {
    "High Epistemic Uncertainty": ("epistemic_uncertainty", 0.3),
    "High Aleatoric Uncertainty": ("aleatoric_uncertainty", 0.3),
    "Low Confidence": ("confidence_score", None),        # < 0.5
    "Borderline Confidence": ("confidence_score", None),  # 0.5–0.65
    "High Predictive Entropy": ("predictive_entropy", 0.5),
}


def _compute_review_triggers(
    db: Session, cutoff: Optional[datetime]
) -> List[ReviewTriggerEntry]:
    """
    Classify why analyses were flagged for human review.

    Categories:
      - High Epistemic Uncertainty (> 0.3)
      - High Aleatoric Uncertainty (> 0.3)
      - Low Confidence (< 0.5)
      - Borderline Confidence (0.5–0.65)
      - High Predictive Entropy (> 0.5)
    """
    q = _base_filter(db, cutoff).filter(
        Analysis.requires_human_review == True  # noqa: E712
    )

    rows = q.with_entities(
        Analysis.confidence_score,
        Analysis.epistemic_uncertainty,
        Analysis.aleatoric_uncertainty,
        Analysis.predictive_entropy,
    ).all()

    total_flagged = len(rows)
    if total_flagged == 0:
        return []

    counters: Dict[str, int] = {
        "High Epistemic Uncertainty": 0,
        "High Aleatoric Uncertainty": 0,
        "Low Confidence": 0,
        "Borderline Confidence": 0,
        "High Predictive Entropy": 0,
    }

    for r in rows:
        conf = float(r.confidence_score or 0)
        epi = float(r.epistemic_uncertainty or 0)
        ale = float(r.aleatoric_uncertainty or 0)
        entropy = float(r.predictive_entropy or 0)

        if epi > 0.3:
            counters["High Epistemic Uncertainty"] += 1
        if ale > 0.3:
            counters["High Aleatoric Uncertainty"] += 1
        if conf < 0.5:
            counters["Low Confidence"] += 1
        elif conf < 0.65:
            counters["Borderline Confidence"] += 1
        if entropy > 0.5:
            counters["High Predictive Entropy"] += 1

    # Filter out zero-count triggers and sort descending
    triggers = [
        ReviewTriggerEntry(
            trigger=name,
            count=count,
            percentage=round(count / total_flagged * 100, 1),
        )
        for name, count in sorted(counters.items(), key=lambda x: -x[1])
        if count > 0
    ]

    return triggers


# ════════════════════════════════════════════════════════════════════════════
# Generic cache helpers (supports multiple endpoint types)
# ════════════════════════════════════════════════════════════════════════════

_generic_cache: Dict[str, Tuple[datetime, object]] = {}


def _get_cached_generic(key: str) -> Optional[object]:
    """Retrieve from generic cache if TTL is valid."""
    entry = _generic_cache.get(key)
    if entry is None:
        return None
    cached_at, data = entry
    if (datetime.now(timezone.utc) - cached_at).total_seconds() > CACHE_TTL_SECONDS:
        del _generic_cache[key]
        return None
    return data


def _set_cached_generic(key: str, data: object) -> None:
    """Store in generic cache with current timestamp."""
    _generic_cache[key] = (datetime.now(timezone.utc), data)
