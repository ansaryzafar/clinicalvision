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
// Performance Deep Dive metrics (Tab 2)
// ────────────────────────────────────────────────────────────────────────────

export interface PerformanceKPIs {
  sensitivity: number;  // True positive rate (0-1)
  specificity: number;  // True negative rate (0-1)
  aucRoc: number;       // Area under ROC curve (0-1)
  ppv: number;          // Positive predictive value (0-1)
  npv: number;          // Negative predictive value (0-1)
  f1Score: number;      // Harmonic mean of precision and recall (0-1)
}

export interface PerformanceKPITrends {
  sensitivityChange: number;
  specificityChange: number;
  aucRocChange: number;
  ppvChange: number;
}

export interface ConfidenceBin {
  binStart: number;   // e.g. 0.0
  binEnd: number;     // e.g. 0.1
  count: number;
  label: string;      // e.g. "0–10%"
}

export interface UncertaintyScatterPoint {
  confidence: number;
  uncertainty: number;
  riskLevel: string;          // 'low' | 'moderate' | 'high'
  processingTimeMs: number;
}

export interface TemporalConfidencePoint {
  date: string;
  avgConfidence: number;
  avgEpistemicUncertainty: number;
  avgAleatoricUncertainty: number;
  highUncertaintyCount: number;
  analysisCount: number;
}

export interface ConcordanceEntry {
  category: string;      // BI-RADS category or 'Benign'/'Malignant'
  aiCount: number;
  radiologistCount: number;
  agreementRate: number; // 0-1
}

export interface CalibrationPoint {
  binStart: number;             // e.g. 0.0
  binEnd: number;               // e.g. 0.1
  predictedProbability: number; // Mean predicted probability in bin
  observedFrequency: number;    // Actual positive fraction in bin
  count: number;                // Number of cases in this bin
}

export interface PerformanceMetrics {
  kpis: PerformanceKPIs;
  kpiTrends: PerformanceKPITrends;
  confidenceHistogram: ConfidenceBin[];
  uncertaintyScatter: UncertaintyScatterPoint[];
  temporalConfidence: TemporalConfidencePoint[];
  concordanceData: ConcordanceEntry[];
  calibrationCurve: CalibrationPoint[];
}

// ────────────────────────────────────────────────────────────────────────────
// Model Intelligence metrics (Tab 3)
// ────────────────────────────────────────────────────────────────────────────

export interface UncertaintyDecompositionPoint {
  date: string;
  epistemic: number;  // Model uncertainty
  aleatoric: number;  // Data uncertainty
  total: number;      // Combined predictive uncertainty
}

export interface ModelVersionStats {
  version: string;
  accuracy: number;
  avgConfidence: number;
  avgLatencyMs: number;
  totalPredictions: number;
  aucRoc: number;
}

export interface HumanReviewRatePoint {
  date: string;
  reviewRate: number;  // 0-1
  totalCases: number;
  reviewedCases: number;
}

export interface ReviewTrigger {
  trigger: string;     // e.g. "High Epistemic Uncertainty"
  count: number;
  percentage: number;  // 0-100
}

export interface EntropyBin {
  binStart: number;   // e.g. 0.0
  binEnd: number;     // e.g. 0.1
  count: number;
  label: string;      // e.g. "0.00–0.10"
}

export interface ModelIntelligenceMetrics {
  uncertaintyDecomposition: UncertaintyDecompositionPoint[];
  modelVersionComparison: ModelVersionStats[];
  humanReviewRate: HumanReviewRatePoint[];
  reviewTriggers: ReviewTrigger[];
  entropyDistribution: EntropyBin[];
}

// ────────────────────────────────────────────────────────────────────────────
// System Health (Overview Tab — Row 4)
// ────────────────────────────────────────────────────────────────────────────

export interface SystemHealthStatus {
  modelStatus: string;      // 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  modelVersion: string;
  backendStatus: string;    // 'healthy' | 'degraded' | 'unhealthy'
  gpuAvailable: boolean;
  uptimeSeconds: number;
  errorCount24h: number;
  queueDepth: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Empty defaults (safe for rendering components when no data available)
// ────────────────────────────────────────────────────────────────────────────

export const EMPTY_PERFORMANCE_METRICS: PerformanceMetrics = {
  kpis: {
    sensitivity: 0,
    specificity: 0,
    aucRoc: 0,
    ppv: 0,
    npv: 0,
    f1Score: 0,
  },
  kpiTrends: {
    sensitivityChange: 0,
    specificityChange: 0,
    aucRocChange: 0,
    ppvChange: 0,
  },
  confidenceHistogram: [],
  uncertaintyScatter: [],
  temporalConfidence: [],
  concordanceData: [],
  calibrationCurve: [],
};

export const EMPTY_MODEL_INTELLIGENCE_METRICS: ModelIntelligenceMetrics = {
  uncertaintyDecomposition: [],
  modelVersionComparison: [],
  humanReviewRate: [],
  reviewTriggers: [],
  entropyDistribution: [],
};

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

export const EMPTY_SYSTEM_HEALTH: SystemHealthStatus = {
  modelStatus: 'unknown',
  modelVersion: '—',
  backendStatus: 'unknown',
  gpuAvailable: false,
  uptimeSeconds: 0,
  errorCount24h: 0,
  queueDepth: 0,
};
