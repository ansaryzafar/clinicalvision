"""
Analytics Dashboard Response Schemas

Pydantic models for the AI Analytics Dashboard API endpoints.
These match the frontend OverviewMetrics TypeScript interfaces exactly
(camelCase ↔ snake_case mapping via alias generators).
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Optional
from datetime import datetime


# ============================================================================
# Shared Sub-models
# ============================================================================

class OverviewKPIs(BaseModel):
    """Headline KPI values for the overview gauges."""
    total_analyses: int = Field(0, description="Total completed analyses in period")
    average_confidence: float = Field(0.0, ge=0.0, le=1.0, description="Mean confidence score (0-1)")
    average_inference_time_ms: float = Field(0.0, ge=0.0, description="Mean inference latency in ms")
    high_uncertainty_rate: float = Field(0.0, ge=0.0, le=1.0, description="Fraction flagged for human review")
    total_cases: int = Field(0, description="Total unique cases")
    completed_cases: int = Field(0, description="Completed cases")


class KPITrends(BaseModel):
    """Delta values comparing current period to previous period."""
    confidence_change: float = Field(0.0, description="Δ avg confidence vs previous period")
    latency_change: float = Field(0.0, description="Δ avg latency ms vs previous period")
    uncertainty_change: float = Field(0.0, description="Δ uncertainty rate vs previous period")


class ConfidenceTrendPoint(BaseModel):
    """One data point on the confidence trend chart (aggregated per day)."""
    date: str = Field(..., description="ISO date YYYY-MM-DD")
    avg_confidence: float = Field(0.0, ge=0.0, le=1.0)
    std_confidence: float = Field(0.0, ge=0.0, description="Population standard deviation")
    analysis_count: int = Field(0, ge=0)


class LatencyPercentilePoint(BaseModel):
    """One data point on the latency percentiles chart (aggregated per day)."""
    date: str = Field(..., description="ISO date YYYY-MM-DD")
    p50: float = Field(0.0, ge=0.0, description="Median latency ms")
    p90: float = Field(0.0, ge=0.0, description="90th percentile ms")
    p99: float = Field(0.0, ge=0.0, description="99th percentile ms")


class PredictionDistribution(BaseModel):
    """Benign vs malignant prediction counts."""
    benign: int = Field(0, ge=0)
    malignant: int = Field(0, ge=0)


class RiskDistribution(BaseModel):
    """Risk level distribution counts."""
    low: int = Field(0, ge=0)
    moderate: int = Field(0, ge=0)
    high: int = Field(0, ge=0)


# ============================================================================
# Main Response Model
# ============================================================================

class OverviewMetricsResponse(BaseModel):
    """
    Complete response for GET /api/v1/analytics/overview

    Matches the frontend OverviewMetrics TypeScript interface.
    Frontend field mapping (camelCase ↔ snake_case):
      kpis.totalAnalyses       ← kpis.total_analyses
      kpis.averageConfidence   ← kpis.average_confidence
      kpiTrends.confidenceChange ← kpi_trends.confidence_change
      confidenceTrend[].avgConfidence ← confidence_trend[].avg_confidence
      predictionDistribution   ← prediction_distribution
      riskDistribution         ← risk_distribution
      biradsDistribution       ← birads_distribution
      latencyPercentiles       ← latency_percentiles
    """
    kpis: OverviewKPIs = Field(default_factory=OverviewKPIs)
    kpi_trends: KPITrends = Field(default_factory=KPITrends)
    confidence_trend: List[ConfidenceTrendPoint] = Field(default_factory=list)
    prediction_distribution: PredictionDistribution = Field(default_factory=PredictionDistribution)
    risk_distribution: RiskDistribution = Field(default_factory=RiskDistribution)
    birads_distribution: Dict[str, int] = Field(default_factory=dict)
    latency_percentiles: List[LatencyPercentilePoint] = Field(default_factory=list)

    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "kpis": {
                    "total_analyses": 247,
                    "average_confidence": 0.87,
                    "average_inference_time_ms": 342.5,
                    "high_uncertainty_rate": 0.12,
                    "total_cases": 85,
                    "completed_cases": 72,
                },
                "kpi_trends": {
                    "confidence_change": 0.02,
                    "latency_change": -15.3,
                    "uncertainty_change": -0.01,
                },
                "confidence_trend": [
                    {"date": "2026-03-01", "avg_confidence": 0.85, "std_confidence": 0.08, "analysis_count": 12},
                    {"date": "2026-03-02", "avg_confidence": 0.88, "std_confidence": 0.06, "analysis_count": 15},
                ],
                "prediction_distribution": {"benign": 180, "malignant": 67},
                "risk_distribution": {"low": 160, "moderate": 55, "high": 32},
                "birads_distribution": {"1": 45, "2": 80, "3": 62, "4": 38, "5": 22},
                "latency_percentiles": [
                    {"date": "2026-03-01", "p50": 280.0, "p90": 520.0, "p99": 890.0},
                ],
            }
        },
    )
