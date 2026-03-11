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
import type { MetricsPeriod, OverviewMetrics } from '../types/metrics.types';

// ────────────────────────────────────────────────────────────────────────────
// Backend response shape (snake_case, matches Pydantic schema)
// ────────────────────────────────────────────────────────────────────────────

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
