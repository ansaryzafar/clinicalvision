/**
 * Metrics Data Types — AI Analytics Dashboard
 *
 * Shared interfaces consumed by both the local metrics aggregator
 * (offline/demo mode) and the future backend analytics API.
 */

// ────────────────────────────────────────────────────────────────────────────
// Period selector
// ────────────────────────────────────────────────────────────────────────────

export type MetricsPeriod = '7d' | '30d' | '90d' | 'all';

/** Convert period label to number of days (0 = unlimited). */
export const periodToDays = (period: MetricsPeriod): number => {
  switch (period) {
    case '7d':
      return 7;
    case '30d':
      return 30;
    case '90d':
      return 90;
    case 'all':
      return 0;
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Overview metrics (Tab 1)
// ────────────────────────────────────────────────────────────────────────────

export interface OverviewKPIs {
  totalAnalyses: number;
  averageConfidence: number; // 0-1
  averageInferenceTimeMs: number;
  highUncertaintyRate: number; // 0-1 (fraction flagged for review)
  totalCases: number;
  completedCases: number;
}

export interface KPITrends {
  confidenceChange: number; // Δ from previous period
  latencyChange: number;
  uncertaintyChange: number;
}

export interface ConfidenceTrendPoint {
  date: string; // ISO date 'YYYY-MM-DD'
  avgConfidence: number;
  stdConfidence: number; // For uncertainty band (mcStd or population σ)
  analysisCount: number;
}

export interface LatencyPercentilePoint {
  date: string;
  p50: number;
  p90: number;
  p99: number;
}

export interface OverviewMetrics {
  kpis: OverviewKPIs;
  kpiTrends: KPITrends;
  confidenceTrend: ConfidenceTrendPoint[];
  predictionDistribution: { benign: number; malignant: number };
  riskDistribution: { low: number; moderate: number; high: number };
  biradsDistribution: Record<string, number>;
  latencyPercentiles: LatencyPercentilePoint[];
}

// ────────────────────────────────────────────────────────────────────────────
// Empty defaults (safe for rendering components when no data available)
// ────────────────────────────────────────────────────────────────────────────

export const EMPTY_OVERVIEW_METRICS: OverviewMetrics = {
  kpis: {
    totalAnalyses: 0,
    averageConfidence: 0,
    averageInferenceTimeMs: 0,
    highUncertaintyRate: 0,
    totalCases: 0,
    completedCases: 0,
  },
  kpiTrends: {
    confidenceChange: 0,
    latencyChange: 0,
    uncertaintyChange: 0,
  },
  confidenceTrend: [],
  predictionDistribution: { benign: 0, malignant: 0 },
  riskDistribution: { low: 0, moderate: 0, high: 0 },
  biradsDistribution: {},
  latencyPercentiles: [],
};
