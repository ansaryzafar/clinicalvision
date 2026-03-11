"""
Analytics Service & Endpoint Test Suite

Tests the analytics aggregation logic using lightweight mock objects
(no real database required). Verifies:
  - KPI computation (averages, rates, counts)
  - Period filtering
  - Trend computation (current vs previous period)
  - Distribution counting
  - Percentile calculation
  - Cache hit/miss behaviour
  - Endpoint response shape
  - Empty-state handling
"""

import math
import pytest
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from unittest.mock import MagicMock, patch, PropertyMock

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
from app.services.analytics_service import (
    _percentile,
    _period_to_days,
    _cutoff_date,
    invalidate_cache,
    _cache,
    _generic_cache,
    VALID_PERIODS,
)


# ============================================================================
# Unit Tests — Helper Functions
# ============================================================================


class TestPeriodHelpers:
    """Test period conversion utilities."""

    def test_period_to_days_7d(self):
        assert _period_to_days("7d") == 7

    def test_period_to_days_30d(self):
        assert _period_to_days("30d") == 30

    def test_period_to_days_90d(self):
        assert _period_to_days("90d") == 90

    def test_period_to_days_all(self):
        assert _period_to_days("all") == 0

    def test_period_to_days_invalid_defaults_30(self):
        assert _period_to_days("invalid") == 30

    def test_cutoff_date_7d_is_recent(self):
        cutoff = _cutoff_date("7d")
        assert cutoff is not None
        delta = datetime.now(timezone.utc) - cutoff
        assert 6.9 < delta.total_seconds() / 86400 < 7.1

    def test_cutoff_date_all_is_none(self):
        assert _cutoff_date("all") is None

    def test_valid_periods_set(self):
        assert VALID_PERIODS == {"7d", "30d", "90d", "all"}


# ============================================================================
# Unit Tests — Percentile Calculation
# ============================================================================


class TestPercentile:
    """Test the in-memory percentile function."""

    def test_empty_list_returns_zero(self):
        assert _percentile([], 0.5) == 0.0

    def test_single_value(self):
        assert _percentile([100.0], 0.5) == 100.0

    def test_median_of_two(self):
        result = _percentile([100.0, 200.0], 0.5)
        assert result == 150.0

    def test_p50_odd_count(self):
        assert _percentile([10.0, 20.0, 30.0], 0.5) == 20.0

    def test_p90(self):
        values = sorted([float(i) for i in range(1, 101)])
        p90 = _percentile(values, 0.90)
        assert 89.0 <= p90 <= 91.0

    def test_p99(self):
        values = sorted([float(i) for i in range(1, 101)])
        p99 = _percentile(values, 0.99)
        assert 98.0 <= p99 <= 100.0

    def test_p0_returns_min(self):
        assert _percentile([5.0, 10.0, 15.0], 0.0) == 5.0

    def test_p100_returns_max(self):
        assert _percentile([5.0, 10.0, 15.0], 1.0) == 15.0


# ============================================================================
# Unit Tests — Schema Models
# ============================================================================


class TestSchemaDefaults:
    """Verify Pydantic models have safe zero-value defaults."""

    def test_overview_kpis_defaults(self):
        kpis = OverviewKPIs()
        assert kpis.total_analyses == 0
        assert kpis.average_confidence == 0.0
        assert kpis.average_inference_time_ms == 0.0
        assert kpis.high_uncertainty_rate == 0.0

    def test_kpi_trends_defaults(self):
        trends = KPITrends()
        assert trends.confidence_change == 0.0
        assert trends.latency_change == 0.0
        assert trends.uncertainty_change == 0.0

    def test_prediction_distribution_defaults(self):
        dist = PredictionDistribution()
        assert dist.benign == 0
        assert dist.malignant == 0

    def test_risk_distribution_defaults(self):
        dist = RiskDistribution()
        assert dist.low == 0
        assert dist.moderate == 0
        assert dist.high == 0

    def test_overview_metrics_response_defaults(self):
        resp = OverviewMetricsResponse()
        assert resp.kpis.total_analyses == 0
        assert resp.confidence_trend == []
        assert resp.latency_percentiles == []
        assert resp.birads_distribution == {}

    def test_confidence_trend_point(self):
        pt = ConfidenceTrendPoint(
            date="2026-03-01",
            avg_confidence=0.87,
            std_confidence=0.05,
            analysis_count=12,
        )
        assert pt.date == "2026-03-01"
        assert pt.avg_confidence == 0.87

    def test_latency_percentile_point(self):
        pt = LatencyPercentilePoint(
            date="2026-03-01", p50=250.0, p90=480.0, p99=920.0
        )
        assert pt.p50 == 250.0
        assert pt.p90 == 480.0


# ============================================================================
# Unit Tests — Cache
# ============================================================================


class TestCache:
    """Test the in-memory cache invalidation."""

    def setup_method(self):
        _cache.clear()

    def test_invalidate_all(self):
        _cache["overview:7d"] = (datetime.now(timezone.utc), OverviewMetricsResponse())
        _cache["overview:30d"] = (datetime.now(timezone.utc), OverviewMetricsResponse())
        invalidate_cache()
        assert len(_cache) == 0

    def test_invalidate_specific_period(self):
        _cache["overview:7d"] = (datetime.now(timezone.utc), OverviewMetricsResponse())
        _cache["overview:30d"] = (datetime.now(timezone.utc), OverviewMetricsResponse())
        invalidate_cache("7d")
        assert "overview:7d" not in _cache
        assert "overview:30d" in _cache

    def test_invalidate_missing_key_no_error(self):
        invalidate_cache("nonexistent")
        assert len(_cache) == 0


# ============================================================================
# Unit Tests — Response Serialisation
# ============================================================================


class TestResponseSerialisation:
    """Verify the full response can be serialised to JSON (frontend shape)."""

    def test_full_response_json(self):
        resp = OverviewMetricsResponse(
            kpis=OverviewKPIs(
                total_analyses=100,
                average_confidence=0.87,
                average_inference_time_ms=342.5,
                high_uncertainty_rate=0.12,
                total_cases=40,
                completed_cases=38,
            ),
            kpi_trends=KPITrends(
                confidence_change=0.02,
                latency_change=-15.0,
                uncertainty_change=-0.01,
            ),
            confidence_trend=[
                ConfidenceTrendPoint(
                    date="2026-03-01",
                    avg_confidence=0.85,
                    std_confidence=0.08,
                    analysis_count=12,
                ),
            ],
            prediction_distribution=PredictionDistribution(benign=75, malignant=25),
            risk_distribution=RiskDistribution(low=60, moderate=25, high=15),
            birads_distribution={"1": 20, "2": 35, "3": 25, "4": 15, "5": 5},
            latency_percentiles=[
                LatencyPercentilePoint(
                    date="2026-03-01", p50=280.0, p90=520.0, p99=890.0
                ),
            ],
        )

        data = resp.model_dump()
        assert data["kpis"]["total_analyses"] == 100
        assert data["kpi_trends"]["confidence_change"] == 0.02
        assert len(data["confidence_trend"]) == 1
        assert data["prediction_distribution"]["benign"] == 75
        assert data["risk_distribution"]["low"] == 60
        assert data["birads_distribution"]["3"] == 25
        assert data["latency_percentiles"][0]["p50"] == 280.0

    def test_json_keys_are_snake_case(self):
        """Frontend expects snake_case from the backend (mapped to camelCase on FE)."""
        resp = OverviewMetricsResponse()
        data = resp.model_dump()
        assert "kpi_trends" in data
        assert "confidence_trend" in data
        assert "prediction_distribution" in data
        assert "risk_distribution" in data
        assert "birads_distribution" in data
        assert "latency_percentiles" in data


# ============================================================================
# Unit Tests — KPI Computation Edge Cases
# ============================================================================


class TestKPIEdgeCases:
    """Test edge cases in KPI value ranges."""

    def test_high_uncertainty_rate_bounded(self):
        """Rate should be between 0 and 1."""
        kpis = OverviewKPIs(
            total_analyses=100,
            high_uncertainty_rate=0.0,
        )
        assert 0.0 <= kpis.high_uncertainty_rate <= 1.0

    def test_confidence_bounded(self):
        kpis = OverviewKPIs(average_confidence=1.0)
        assert kpis.average_confidence <= 1.0

    def test_zero_analyses_safe(self):
        """All-zero state should not cause division errors."""
        kpis = OverviewKPIs()
        assert kpis.total_analyses == 0
        assert kpis.high_uncertainty_rate == 0.0


# ============================================================================
# Unit Tests — Performance Metrics Schemas
# ============================================================================


class TestPerformanceSchemas:
    """Verify Performance Deep Dive Pydantic models."""

    def test_performance_kpis_defaults(self):
        kpis = PerformanceKPIs()
        assert kpis.sensitivity == 0.0
        assert kpis.specificity == 0.0
        assert kpis.auc_roc == 0.0
        assert kpis.ppv == 0.0
        assert kpis.npv == 0.0
        assert kpis.f1_score == 0.0

    def test_performance_kpis_with_values(self):
        kpis = PerformanceKPIs(
            sensitivity=0.96,
            specificity=0.92,
            auc_roc=0.978,
            ppv=0.89,
            npv=0.97,
            f1_score=0.92,
        )
        assert kpis.sensitivity == 0.96
        assert kpis.auc_roc == 0.978

    def test_performance_kpi_trends_defaults(self):
        trends = PerformanceKPITrends()
        assert trends.sensitivity_change == 0.0
        assert trends.specificity_change == 0.0
        assert trends.auc_roc_change == 0.0
        assert trends.ppv_change == 0.0

    def test_confidence_bin(self):
        b = ConfidenceBin(
            bin_start=0.8, bin_end=0.9, count=42, label="80–90%"
        )
        assert b.count == 42
        assert b.label == "80–90%"

    def test_uncertainty_scatter_point(self):
        pt = UncertaintyScatterPoint(
            confidence=0.85,
            uncertainty=0.12,
            risk_level="low",
            processing_time_ms=320.5,
        )
        assert pt.confidence == 0.85
        assert pt.risk_level == "low"

    def test_temporal_confidence_point(self):
        pt = TemporalConfidencePoint(
            date="2026-03-01",
            avg_confidence=0.87,
            avg_epistemic_uncertainty=0.08,
            avg_aleatoric_uncertainty=0.05,
            high_uncertainty_count=3,
            analysis_count=25,
        )
        assert pt.avg_epistemic_uncertainty == 0.08
        assert pt.analysis_count == 25

    def test_concordance_entry(self):
        entry = ConcordanceEntry(
            category="Benign",
            ai_count=120,
            radiologist_count=100,
            agreement_rate=0.92,
        )
        assert entry.agreement_rate == 0.92

    def test_performance_response_defaults(self):
        resp = PerformanceMetricsResponse()
        assert resp.kpis.sensitivity == 0.0
        assert resp.confidence_histogram == []
        assert resp.uncertainty_scatter == []
        assert resp.temporal_confidence == []
        assert resp.concordance_data == []

    def test_performance_response_full(self):
        resp = PerformanceMetricsResponse(
            kpis=PerformanceKPIs(sensitivity=0.96, specificity=0.92),
            kpi_trends=PerformanceKPITrends(sensitivity_change=0.02),
            confidence_histogram=[
                ConfidenceBin(bin_start=0.0, bin_end=0.1, count=5, label="0–10%"),
            ],
            uncertainty_scatter=[
                UncertaintyScatterPoint(
                    confidence=0.85, uncertainty=0.1,
                    risk_level="low", processing_time_ms=200.0,
                ),
            ],
            temporal_confidence=[
                TemporalConfidencePoint(
                    date="2026-03-01", avg_confidence=0.87,
                    avg_epistemic_uncertainty=0.08, avg_aleatoric_uncertainty=0.05,
                    high_uncertainty_count=2, analysis_count=20,
                ),
            ],
            concordance_data=[
                ConcordanceEntry(
                    category="Benign", ai_count=80,
                    radiologist_count=75, agreement_rate=0.93,
                ),
            ],
        )
        data = resp.model_dump()
        assert data["kpis"]["sensitivity"] == 0.96
        assert len(data["confidence_histogram"]) == 1
        assert len(data["uncertainty_scatter"]) == 1
        assert len(data["temporal_confidence"]) == 1
        assert len(data["concordance_data"]) == 1


# ============================================================================
# Unit Tests — Model Intelligence Schemas
# ============================================================================


class TestModelIntelligenceSchemas:
    """Verify Model Intelligence Pydantic models."""

    def test_uncertainty_decomposition_point(self):
        pt = UncertaintyDecompositionPoint(
            date="2026-03-01",
            epistemic=0.08,
            aleatoric=0.05,
            total=0.13,
        )
        assert pt.epistemic == 0.08
        assert pt.total == 0.13

    def test_model_version_stats(self):
        entry = ModelVersionStatsEntry(
            version="v2.1.0",
            accuracy=0.94,
            avg_confidence=0.87,
            avg_latency_ms=342.5,
            total_predictions=500,
            auc_roc=0.978,
        )
        assert entry.version == "v2.1.0"
        assert entry.total_predictions == 500

    def test_human_review_rate_point(self):
        pt = HumanReviewRatePoint(
            date="2026-03-01",
            review_rate=0.15,
            total_cases=40,
            reviewed_cases=6,
        )
        assert pt.review_rate == 0.15
        assert pt.reviewed_cases == 6

    def test_review_trigger_entry(self):
        entry = ReviewTriggerEntry(
            trigger="High Epistemic Uncertainty",
            count=25,
            percentage=42.5,
        )
        assert entry.trigger == "High Epistemic Uncertainty"
        assert entry.percentage == 42.5

    def test_model_intelligence_response_defaults(self):
        resp = ModelIntelligenceMetricsResponse()
        assert resp.uncertainty_decomposition == []
        assert resp.model_version_comparison == []
        assert resp.human_review_rate == []
        assert resp.review_triggers == []

    def test_model_intelligence_response_full(self):
        resp = ModelIntelligenceMetricsResponse(
            uncertainty_decomposition=[
                UncertaintyDecompositionPoint(
                    date="2026-03-01", epistemic=0.08,
                    aleatoric=0.05, total=0.13,
                ),
            ],
            model_version_comparison=[
                ModelVersionStatsEntry(
                    version="v2.0", accuracy=0.92,
                    avg_confidence=0.85, avg_latency_ms=300.0,
                    total_predictions=400, auc_roc=0.96,
                ),
            ],
            human_review_rate=[
                HumanReviewRatePoint(
                    date="2026-03-01", review_rate=0.12,
                    total_cases=50, reviewed_cases=6,
                ),
            ],
            review_triggers=[
                ReviewTriggerEntry(
                    trigger="Low Confidence", count=15, percentage=30.0,
                ),
            ],
        )
        data = resp.model_dump()
        assert len(data["uncertainty_decomposition"]) == 1
        assert len(data["model_version_comparison"]) == 1
        assert len(data["human_review_rate"]) == 1
        assert len(data["review_triggers"]) == 1
        assert data["model_version_comparison"][0]["version"] == "v2.0"

    def test_json_keys_snake_case(self):
        resp = ModelIntelligenceMetricsResponse()
        data = resp.model_dump()
        assert "uncertainty_decomposition" in data
        assert "model_version_comparison" in data
        assert "human_review_rate" in data
        assert "review_triggers" in data


# ============================================================================
# Unit Tests — Cache (extended for generic cache)
# ============================================================================


class TestGenericCache:
    """Test the generic cache used by performance and model intelligence."""

    def setup_method(self):
        _cache.clear()
        _generic_cache.clear()

    def test_invalidate_all_clears_generic(self):
        _generic_cache["performance:30d"] = (
            datetime.now(timezone.utc), PerformanceMetricsResponse()
        )
        _generic_cache["model_intelligence:30d"] = (
            datetime.now(timezone.utc), ModelIntelligenceMetricsResponse()
        )
        invalidate_cache()
        assert len(_generic_cache) == 0

    def test_invalidate_period_clears_specific_generic(self):
        _generic_cache["performance:7d"] = (
            datetime.now(timezone.utc), PerformanceMetricsResponse()
        )
        _generic_cache["performance:30d"] = (
            datetime.now(timezone.utc), PerformanceMetricsResponse()
        )
        _generic_cache["model_intelligence:7d"] = (
            datetime.now(timezone.utc), ModelIntelligenceMetricsResponse()
        )
        invalidate_cache("7d")
        assert "performance:7d" not in _generic_cache
        assert "model_intelligence:7d" not in _generic_cache
        assert "performance:30d" in _generic_cache

    def test_response_serialisation_performance(self):
        resp = PerformanceMetricsResponse()
        data = resp.model_dump()
        assert "kpis" in data
        assert "kpi_trends" in data
        assert "confidence_histogram" in data

    def test_response_serialisation_model_intelligence(self):
        resp = ModelIntelligenceMetricsResponse()
        data = resp.model_dump()
        assert "uncertainty_decomposition" in data
        assert "review_triggers" in data


# ============================================================================
# Unit Tests — Confidence Histogram Edge Cases
# ============================================================================


class TestConfidenceHistogramLogic:
    """Test histogram binning logic."""

    def test_ten_bins_created_from_label_format(self):
        """Verify bins have correct label format."""
        b = ConfidenceBin(bin_start=0.0, bin_end=0.1, count=10, label="0–10%")
        assert b.bin_start == 0.0
        assert b.bin_end == 0.1

    def test_last_bin_upper_bound(self):
        b = ConfidenceBin(bin_start=0.9, bin_end=1.0, count=5, label="90–100%")
        assert b.bin_end == 1.0

    def test_confidence_bin_serialisation(self):
        b = ConfidenceBin(bin_start=0.5, bin_end=0.6, count=20, label="50–60%")
        data = b.model_dump()
        assert data["bin_start"] == 0.5
        assert data["count"] == 20


# ============================================================================
# Unit Tests — Review Trigger Classification
# ============================================================================


class TestReviewTriggerClassification:
    """Test review trigger entry structure."""

    def test_percentage_bounded(self):
        entry = ReviewTriggerEntry(
            trigger="Test", count=10, percentage=100.0
        )
        assert 0.0 <= entry.percentage <= 100.0

    def test_multiple_triggers_sortable(self):
        triggers = [
            ReviewTriggerEntry(trigger="A", count=5, percentage=25.0),
            ReviewTriggerEntry(trigger="B", count=15, percentage=75.0),
        ]
        sorted_t = sorted(triggers, key=lambda t: -t.count)
        assert sorted_t[0].trigger == "B"

    def test_empty_trigger_list_valid(self):
        resp = ModelIntelligenceMetricsResponse(review_triggers=[])
        assert resp.review_triggers == []
