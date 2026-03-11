/**
 * Metrics API Service — Backend Analytics Client
 *
 * Fetches aggregated AI performance metrics from the backend
 * analytics endpoint (`GET /api/v1/analytics/overview`).
 *
 * Handles:
 * - snake_case → camelCase field mapping
 * - Network error wrapping
 * - Type-safe response parsing
 *
 * Falls back gracefully when the backend is unreachable —
 * the useMetrics hook pairs this with the local aggregator.
 */

import { apiClient } from '../utils/apiClient';
import type {
  MetricsPeriod,
  OverviewMetrics,
  PerformanceMetrics,
  ModelIntelligenceMetrics,
} from '../types/metrics.types';

// ────────────────────────────────────────────────────────────────────────────
// Backend response shapes (snake_case, matches Pydantic schemas)
// ────────────────────────────────────────────────────────────────────────────

// ── Overview (Tab 1) ────────────────────────────────────────────────────

interface BackendOverviewKPIs {
  total_analyses: number;
  average_confidence: number;
  average_inference_time_ms: number;
  high_uncertainty_rate: number;
  total_cases: number;
  completed_cases: number;
}

interface BackendKPITrends {
  confidence_change: number;
  latency_change: number;
  uncertainty_change: number;
}

interface BackendConfidenceTrendPoint {
  date: string;
  avg_confidence: number;
  std_confidence: number;
  analysis_count: number;
}

interface BackendLatencyPercentilePoint {
  date: string;
  p50: number;
  p90: number;
  p99: number;
}

interface BackendOverviewResponse {
  kpis: BackendOverviewKPIs;
  kpi_trends: BackendKPITrends;
  confidence_trend: BackendConfidenceTrendPoint[];
  prediction_distribution: { benign: number; malignant: number };
  risk_distribution: { low: number; moderate: number; high: number };
  birads_distribution: Record<string, number>;
  latency_percentiles: BackendLatencyPercentilePoint[];
}

// ────────────────────────────────────────────────────────────────────────────
// Mapper: snake_case backend → camelCase frontend
// ────────────────────────────────────────────────────────────────────────────

function mapBackendToFrontend(raw: BackendOverviewResponse): OverviewMetrics {
  return {
    kpis: {
      totalAnalyses: raw.kpis.total_analyses,
      averageConfidence: raw.kpis.average_confidence,
      averageInferenceTimeMs: raw.kpis.average_inference_time_ms,
      highUncertaintyRate: raw.kpis.high_uncertainty_rate,
      totalCases: raw.kpis.total_cases,
      completedCases: raw.kpis.completed_cases,
    },
    kpiTrends: {
      confidenceChange: raw.kpi_trends.confidence_change,
      latencyChange: raw.kpi_trends.latency_change,
      uncertaintyChange: raw.kpi_trends.uncertainty_change,
    },
    confidenceTrend: raw.confidence_trend.map((pt) => ({
      date: pt.date,
      avgConfidence: pt.avg_confidence,
      stdConfidence: pt.std_confidence,
      analysisCount: pt.analysis_count,
    })),
    predictionDistribution: {
      benign: raw.prediction_distribution.benign,
      malignant: raw.prediction_distribution.malignant,
    },
    riskDistribution: {
      low: raw.risk_distribution.low,
      moderate: raw.risk_distribution.moderate,
      high: raw.risk_distribution.high,
    },
    biradsDistribution: raw.birads_distribution,
    latencyPercentiles: raw.latency_percentiles.map((pt) => ({
      date: pt.date,
      p50: pt.p50,
      p90: pt.p90,
      p99: pt.p99,
    })),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Fetch overview metrics from the backend analytics endpoint.
 *
 * @param period  Time window: '7d' | '30d' | '90d' | 'all'
 * @param signal  Optional AbortSignal for cancellation
 * @returns Parsed OverviewMetrics in camelCase
 * @throws Error on network / server failure
 */
export async function fetchOverviewMetrics(
  period: MetricsPeriod = '30d',
  signal?: AbortSignal,
): Promise<OverviewMetrics> {
  const response = await apiClient.get<BackendOverviewResponse>(
    `/api/v1/analytics/overview`,
    { params: { period }, signal },
  );
  return mapBackendToFrontend(response.data);
}


// ────────────────────────────────────────────────────────────────────────────
// Performance Deep Dive (Tab 2) — Backend types
// ────────────────────────────────────────────────────────────────────────────

interface BackendPerformanceKPIs {
  sensitivity: number;
  specificity: number;
  auc_roc: number;
  ppv: number;
  npv: number;
  f1_score: number;
}

interface BackendPerformanceKPITrends {
  sensitivity_change: number;
  specificity_change: number;
  auc_roc_change: number;
  ppv_change: number;
}

interface BackendConfidenceBin {
  bin_start: number;
  bin_end: number;
  count: number;
  label: string;
}

interface BackendUncertaintyScatterPoint {
  confidence: number;
  uncertainty: number;
  risk_level: string;
  processing_time_ms: number;
}

interface BackendTemporalConfidencePoint {
  date: string;
  avg_confidence: number;
  avg_epistemic_uncertainty: number;
  avg_aleatoric_uncertainty: number;
  high_uncertainty_count: number;
  analysis_count: number;
}

interface BackendConcordanceEntry {
  category: string;
  ai_count: number;
  radiologist_count: number;
  agreement_rate: number;
}

interface BackendPerformanceResponse {
  kpis: BackendPerformanceKPIs;
  kpi_trends: BackendPerformanceKPITrends;
  confidence_histogram: BackendConfidenceBin[];
  uncertainty_scatter: BackendUncertaintyScatterPoint[];
  temporal_confidence: BackendTemporalConfidencePoint[];
  concordance_data: BackendConcordanceEntry[];
}

function mapPerformanceToFrontend(raw: BackendPerformanceResponse): PerformanceMetrics {
  return {
    kpis: {
      sensitivity: raw.kpis.sensitivity,
      specificity: raw.kpis.specificity,
      aucRoc: raw.kpis.auc_roc,
      ppv: raw.kpis.ppv,
      npv: raw.kpis.npv,
      f1Score: raw.kpis.f1_score,
    },
    kpiTrends: {
      sensitivityChange: raw.kpi_trends.sensitivity_change,
      specificityChange: raw.kpi_trends.specificity_change,
      aucRocChange: raw.kpi_trends.auc_roc_change,
      ppvChange: raw.kpi_trends.ppv_change,
    },
    confidenceHistogram: raw.confidence_histogram.map((b) => ({
      binStart: b.bin_start,
      binEnd: b.bin_end,
      count: b.count,
      label: b.label,
    })),
    uncertaintyScatter: raw.uncertainty_scatter.map((pt) => ({
      confidence: pt.confidence,
      uncertainty: pt.uncertainty,
      riskLevel: pt.risk_level,
      processingTimeMs: pt.processing_time_ms,
    })),
    temporalConfidence: raw.temporal_confidence.map((pt) => ({
      date: pt.date,
      avgConfidence: pt.avg_confidence,
      avgEpistemicUncertainty: pt.avg_epistemic_uncertainty,
      avgAleatoricUncertainty: pt.avg_aleatoric_uncertainty,
      highUncertaintyCount: pt.high_uncertainty_count,
      analysisCount: pt.analysis_count,
    })),
    concordanceData: raw.concordance_data.map((c) => ({
      category: c.category,
      aiCount: c.ai_count,
      radiologistCount: c.radiologist_count,
      agreementRate: c.agreement_rate,
    })),
  };
}

/**
 * Fetch performance deep-dive metrics from the backend.
 */
export async function fetchPerformanceMetrics(
  period: MetricsPeriod = '30d',
  signal?: AbortSignal,
): Promise<PerformanceMetrics> {
  const response = await apiClient.get<BackendPerformanceResponse>(
    `/api/v1/analytics/performance`,
    { params: { period }, signal },
  );
  return mapPerformanceToFrontend(response.data);
}


// ────────────────────────────────────────────────────────────────────────────
// Model Intelligence (Tab 3) — Backend types
// ────────────────────────────────────────────────────────────────────────────

interface BackendUncertaintyDecompositionPoint {
  date: string;
  epistemic: number;
  aleatoric: number;
  total: number;
}

interface BackendModelVersionStats {
  version: string;
  accuracy: number;
  avg_confidence: number;
  avg_latency_ms: number;
  total_predictions: number;
  auc_roc: number;
}

interface BackendHumanReviewRatePoint {
  date: string;
  review_rate: number;
  total_cases: number;
  reviewed_cases: number;
}

interface BackendReviewTrigger {
  trigger: string;
  count: number;
  percentage: number;
}

interface BackendModelIntelligenceResponse {
  uncertainty_decomposition: BackendUncertaintyDecompositionPoint[];
  model_version_comparison: BackendModelVersionStats[];
  human_review_rate: BackendHumanReviewRatePoint[];
  review_triggers: BackendReviewTrigger[];
}

function mapModelIntelligenceToFrontend(
  raw: BackendModelIntelligenceResponse,
): ModelIntelligenceMetrics {
  return {
    uncertaintyDecomposition: raw.uncertainty_decomposition.map((pt) => ({
      date: pt.date,
      epistemic: pt.epistemic,
      aleatoric: pt.aleatoric,
      total: pt.total,
    })),
    modelVersionComparison: raw.model_version_comparison.map((v) => ({
      version: v.version,
      accuracy: v.accuracy,
      avgConfidence: v.avg_confidence,
      avgLatencyMs: v.avg_latency_ms,
      totalPredictions: v.total_predictions,
      aucRoc: v.auc_roc,
    })),
    humanReviewRate: raw.human_review_rate.map((pt) => ({
      date: pt.date,
      reviewRate: pt.review_rate,
      totalCases: pt.total_cases,
      reviewedCases: pt.reviewed_cases,
    })),
    reviewTriggers: raw.review_triggers.map((t) => ({
      trigger: t.trigger,
      count: t.count,
      percentage: t.percentage,
    })),
  };
}

/**
 * Fetch model intelligence metrics from the backend.
 */
export async function fetchModelIntelligenceMetrics(
  period: MetricsPeriod = '30d',
  signal?: AbortSignal,
): Promise<ModelIntelligenceMetrics> {
  const response = await apiClient.get<BackendModelIntelligenceResponse>(
    `/api/v1/analytics/model-intelligence`,
    { params: { period }, signal },
  );
  return mapModelIntelligenceToFrontend(response.data);
}
