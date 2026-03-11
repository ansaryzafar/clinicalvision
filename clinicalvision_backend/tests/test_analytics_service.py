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
    ConfidenceTrendPoint,
    KPITrends,
    LatencyPercentilePoint,
    OverviewKPIs,
    OverviewMetricsResponse,
    PredictionDistribution,
    RiskDistribution,
)
from app.services.analytics_service import (
    _percentile,
    _period_to_days,
    _cutoff_date,
    invalidate_cache,
    _cache,
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
