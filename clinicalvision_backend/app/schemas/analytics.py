"""
Analytics Dashboard Response Schemas

Pydantic models for the AI Analytics Dashboard API endpoints.
These match the frontend TypeScript interfaces exactly
(camelCase ↔ snake_case mapping via metricsApi mapper).

Covers:
 - OverviewMetricsResponse  (GET /api/v1/analytics/overview)
 - PerformanceMetricsResponse (GET /api/v1/analytics/performance)
 - ModelIntelligenceMetricsResponse (GET /api/v1/analytics/model-intelligence)
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


# ============================================================================
# Performance Deep Dive (Tab 2)
# ============================================================================

class PerformanceKPIs(BaseModel):
    """Model performance headline metrics (from confirmed outcomes)."""
    sensitivity: float = Field(0.0, ge=0.0, le=1.0, description="True positive rate")
    specificity: float = Field(0.0, ge=0.0, le=1.0, description="True negative rate")
    auc_roc: float = Field(0.0, ge=0.0, le=1.0, description="Area under ROC curve")
    ppv: float = Field(0.0, ge=0.0, le=1.0, description="Positive predictive value")
    npv: float = Field(0.0, ge=0.0, le=1.0, description="Negative predictive value")
    f1_score: float = Field(0.0, ge=0.0, le=1.0, description="Harmonic mean of precision & recall")


class PerformanceKPITrends(BaseModel):
    """Delta values for performance KPIs vs previous period."""
    sensitivity_change: float = Field(0.0)
    specificity_change: float = Field(0.0)
    auc_roc_change: float = Field(0.0)
    ppv_change: float = Field(0.0)


class ConfidenceBin(BaseModel):
    """One bin of the confidence histogram."""
    bin_start: float = Field(..., ge=0.0, le=1.0)
    bin_end: float = Field(..., ge=0.0, le=1.0)
    count: int = Field(0, ge=0)
    label: str = Field(...)


class UncertaintyScatterPoint(BaseModel):
    """One data point for the confidence-vs-uncertainty scatter chart."""
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    uncertainty: float = Field(0.0, ge=0.0)
    risk_level: str = Field("low")
    processing_time_ms: float = Field(0.0, ge=0.0)


class TemporalConfidencePoint(BaseModel):
    """Daily aggregate for the composed confidence/uncertainty time series."""
    date: str = Field(..., description="ISO date YYYY-MM-DD")
    avg_confidence: float = Field(0.0, ge=0.0, le=1.0)
    avg_epistemic_uncertainty: float = Field(0.0, ge=0.0)
    avg_aleatoric_uncertainty: float = Field(0.0, ge=0.0)
    high_uncertainty_count: int = Field(0, ge=0)
    analysis_count: int = Field(0, ge=0)


class ConcordanceEntry(BaseModel):
    """AI vs radiologist agreement for a single category."""
    category: str = Field(...)
    ai_count: int = Field(0, ge=0)
    radiologist_count: int = Field(0, ge=0)
    agreement_rate: float = Field(0.0, ge=0.0, le=1.0)


class CalibrationPoint(BaseModel):
    """One point on the calibration curve (predicted vs observed)."""
    bin_start: float = Field(..., ge=0.0, le=1.0)
    bin_end: float = Field(..., ge=0.0, le=1.0)
    predicted_probability: float = Field(0.0, ge=0.0, le=1.0, description="Mean predicted probability in bin")
    observed_frequency: float = Field(0.0, ge=0.0, le=1.0, description="Actual positive fraction in bin")
    count: int = Field(0, ge=0, description="Number of cases in this bin")


class PerformanceMetricsResponse(BaseModel):
    """
    Complete response for GET /api/v1/analytics/performance

    Frontend mapping: PerformanceMetrics TypeScript interface.
    """
    kpis: PerformanceKPIs = Field(default_factory=PerformanceKPIs)
    kpi_trends: PerformanceKPITrends = Field(default_factory=PerformanceKPITrends)
    confidence_histogram: List[ConfidenceBin] = Field(default_factory=list)
    uncertainty_scatter: List[UncertaintyScatterPoint] = Field(default_factory=list)
    temporal_confidence: List[TemporalConfidencePoint] = Field(default_factory=list)
    concordance_data: List[ConcordanceEntry] = Field(default_factory=list)
    calibration_curve: List[CalibrationPoint] = Field(default_factory=list)

    model_config = ConfigDict(protected_namespaces=())


# ============================================================================
# Model Intelligence (Tab 3)
# ============================================================================

class UncertaintyDecompositionPoint(BaseModel):
    """Daily epistemic vs aleatoric uncertainty decomposition."""
    date: str = Field(..., description="ISO date YYYY-MM-DD")
    epistemic: float = Field(0.0, ge=0.0)
    aleatoric: float = Field(0.0, ge=0.0)
    total: float = Field(0.0, ge=0.0)


class ModelVersionStatsEntry(BaseModel):
    """Aggregated statistics for a single model version."""
    version: str = Field(...)
    accuracy: float = Field(0.0, ge=0.0, le=1.0)
    avg_confidence: float = Field(0.0, ge=0.0, le=1.0)
    avg_latency_ms: float = Field(0.0, ge=0.0)
    total_predictions: int = Field(0, ge=0)
    auc_roc: float = Field(0.0, ge=0.0, le=1.0)


class HumanReviewRatePoint(BaseModel):
    """Daily human review trigger rate."""
    date: str = Field(..., description="ISO date YYYY-MM-DD")
    review_rate: float = Field(0.0, ge=0.0, le=1.0)
    total_cases: int = Field(0, ge=0)
    reviewed_cases: int = Field(0, ge=0)


class ReviewTriggerEntry(BaseModel):
    """Breakdown of why cases were flagged for human review."""
    trigger: str = Field(...)
    count: int = Field(0, ge=0)
    percentage: float = Field(0.0, ge=0.0, le=100.0)


class EntropyBin(BaseModel):
    """One bin of the predictive entropy histogram."""
    bin_start: float = Field(..., ge=0.0)
    bin_end: float = Field(..., ge=0.0)
    count: int = Field(0, ge=0)
    label: str = Field(...)


class ModelIntelligenceMetricsResponse(BaseModel):
    """
    Complete response for GET /api/v1/analytics/model-intelligence

    Frontend mapping: ModelIntelligenceMetrics TypeScript interface.
    """
    uncertainty_decomposition: List[UncertaintyDecompositionPoint] = Field(default_factory=list)
    model_version_comparison: List[ModelVersionStatsEntry] = Field(default_factory=list)
    human_review_rate: List[HumanReviewRatePoint] = Field(default_factory=list)
    review_triggers: List[ReviewTriggerEntry] = Field(default_factory=list)
    entropy_distribution: List[EntropyBin] = Field(default_factory=list)

    model_config = ConfigDict(protected_namespaces=())


# ============================================================================
# System Health (Overview Tab — Row 4)
# ============================================================================

class SystemHealthResponse(BaseModel):
    """
    System health snapshot for the analytics dashboard status bar.

    Frontend mapping: SystemHealthStatus TypeScript interface.
    """
    model_status: str = Field("unknown", description="healthy | degraded | unhealthy | unknown")
    model_version: str = Field("—", description="Current active model version string")
    backend_status: str = Field("unknown", description="healthy | degraded | unhealthy")
    gpu_available: bool = Field(False, description="Whether GPU acceleration is active")
    uptime_seconds: float = Field(0.0, ge=0.0, description="Backend uptime in seconds")
    error_count_24h: int = Field(0, ge=0, description="Errors logged in the last 24 hours")
    queue_depth: int = Field(0, ge=0, description="Pending inference requests in queue")

    model_config = ConfigDict(protected_namespaces=())
