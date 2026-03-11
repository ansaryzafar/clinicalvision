/**
 * Local Metrics Aggregator
 *
 * Aggregates AI inference metrics from the frontend localStorage-based
 * session store.  This provides offline/demo-mode analytics when the
 * backend analytics API is not available.
 *
 * It walks every AnalysisSession → storedAnalysisResults + findings and
 * computes the same OverviewMetrics shape as the backend would return.
 */

import { clinicalSessionService } from './clinicalSession.service';
import {
  OverviewMetrics,
  EMPTY_OVERVIEW_METRICS,
  MetricsPeriod,
  periodToDays,
  ConfidenceTrendPoint,
  LatencyPercentilePoint,
} from '../types/metrics.types';
import { AnalysisSession, getNumericBirads } from '../types/clinical.types';

// ────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────────────────────

/** Extract the ISO date portion (YYYY-MM-DD) from an ISO datetime string. */
const toDateKey = (iso: string): string => iso.slice(0, 10);

/** Compute a specific percentile from a sorted array of numbers. */
const percentile = (sorted: number[], p: number): number => {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
};

/** Completed-status set (mirrors ClinicalSessionService.COMPLETED_STATUSES). */
const COMPLETED = new Set(['completed', 'reviewed', 'finalized']);

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Aggregate OverviewMetrics from the local session store.
 *
 * @param period - Time window filter ('7d' | '30d' | '90d' | 'all')
 * @returns Fully populated OverviewMetrics (safe to render; never null).
 */
export function aggregateLocalMetrics(
  period: MetricsPeriod = '30d',
): OverviewMetrics {
  const allSessions = clinicalSessionService.getAllSessions();

  if (allSessions.length === 0) {
    return { ...EMPTY_OVERVIEW_METRICS };
  }

  // ── Apply period filter ────────────────────────────────────────────────
  const days = periodToDays(period);
  const cutoff =
    days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;

  const sessionsInWindow = cutoff
    ? allSessions.filter((s) => {
        const analyzedAt = s.storedAnalysisResults?.analyzedAt;
        const ts = analyzedAt
          ? new Date(analyzedAt)
          : new Date(s.metadata.createdAt);
        return ts >= cutoff;
      })
    : allSessions;

  // ── Extract analysis results ───────────────────────────────────────────
  type AnalysisEntry = {
    prediction: 'benign' | 'malignant';
    confidence: number;
    riskLevel: string;
    processingTimeMs: number | undefined;
    analyzedAt: string;
  };

  const analyses: AnalysisEntry[] = [];

  for (const session of sessionsInWindow) {
    const ar = session.storedAnalysisResults;
    if (!ar) continue;

    analyses.push({
      prediction: ar.prediction,
      confidence: ar.confidence,
      riskLevel: ar.riskLevel ?? 'low',
      processingTimeMs: ar.processingTimeMs,
      analyzedAt: ar.analyzedAt ?? session.metadata.createdAt,
    });
  }

  // No analyses → return basic case counts only
  if (analyses.length === 0) {
    return {
      ...EMPTY_OVERVIEW_METRICS,
      kpis: {
        ...EMPTY_OVERVIEW_METRICS.kpis,
        totalCases: allSessions.length,
        completedCases: allSessions.filter((s) =>
          COMPLETED.has(s.workflow.status),
        ).length,
      },
    };
  }

  // ── KPIs ───────────────────────────────────────────────────────────────
  const totalAnalyses = analyses.length;
  const sumConfidence = analyses.reduce((s, a) => s + a.confidence, 0);
  const averageConfidence = sumConfidence / totalAnalyses;

  const timings = analyses
    .map((a) => a.processingTimeMs)
    .filter((t): t is number => t != null && t > 0);
  const averageInferenceTimeMs =
    timings.length > 0 ? timings.reduce((s, t) => s + t, 0) / timings.length : 0;

  // High-uncertainty: confidence < 0.6
  const highUncertaintyCount = analyses.filter(
    (a) => a.confidence < 0.6,
  ).length;
  const highUncertaintyRate = highUncertaintyCount / totalAnalyses;

  const totalCases = allSessions.length;
  const completedCases = allSessions.filter((s) =>
    COMPLETED.has(s.workflow.status),
  ).length;

  // ── Prediction distribution ────────────────────────────────────────────
  const predictionDistribution = { benign: 0, malignant: 0 };
  for (const a of analyses) {
    if (a.prediction === 'malignant') predictionDistribution.malignant++;
    else predictionDistribution.benign++;
  }

  // ── Risk distribution ──────────────────────────────────────────────────
  const riskDistribution = { low: 0, moderate: 0, high: 0 };
  for (const a of analyses) {
    const rl = a.riskLevel as keyof typeof riskDistribution;
    if (rl in riskDistribution) riskDistribution[rl]++;
    else riskDistribution.low++;
  }

  // ── BI-RADS distribution from findings ─────────────────────────────────
  const biradsDistribution: Record<string, number> = {};
  for (const session of sessionsInWindow) {
    for (const finding of session.findings ?? []) {
      if (finding.biradsCategory) {
        const numericKey = String(getNumericBirads(finding.biradsCategory as any));
        biradsDistribution[numericKey] = (biradsDistribution[numericKey] ?? 0) + 1;
      }
    }
  }

  // ── Confidence trend (grouped by date) ─────────────────────────────────
  const byDate = new Map<string, number[]>();
  for (const a of analyses) {
    const dk = toDateKey(a.analyzedAt);
    if (!byDate.has(dk)) byDate.set(dk, []);
    byDate.get(dk)!.push(a.confidence);
  }

  const confidenceTrend: ConfidenceTrendPoint[] = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => {
      const avg = values.reduce((s, v) => s + v, 0) / values.length;
      const variance =
        values.length > 1
          ? values.reduce((s, v) => s + (v - avg) ** 2, 0) / (values.length - 1)
          : 0;
      return {
        date,
        avgConfidence: avg,
        stdConfidence: Math.sqrt(variance),
        analysisCount: values.length,
      };
    });

  // ── Latency percentiles (grouped by date) ──────────────────────────────
  const latencyByDate = new Map<string, number[]>();
  for (const a of analyses) {
    if (a.processingTimeMs != null && a.processingTimeMs > 0) {
      const dk = toDateKey(a.analyzedAt);
      if (!latencyByDate.has(dk)) latencyByDate.set(dk, []);
      latencyByDate.get(dk)!.push(a.processingTimeMs);
    }
  }

  const latencyPercentiles: LatencyPercentilePoint[] = Array.from(
    latencyByDate.entries(),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => {
      const sorted = [...values].sort((a, b) => a - b);
      return {
        date,
        p50: percentile(sorted, 50),
        p90: percentile(sorted, 90),
        p99: percentile(sorted, 99),
      };
    });

  // ── KPI trends (placeholder — requires previous-period comparison) ─────
  // For local mode we don't have historical data beyond the session store,
  // so trends default to 0 unless we compute half-period comparison.
  const kpiTrends = { confidenceChange: 0, latencyChange: 0, uncertaintyChange: 0 };

  // ── Assemble ───────────────────────────────────────────────────────────
  return {
    kpis: {
      totalAnalyses,
      averageConfidence,
      averageInferenceTimeMs,
      highUncertaintyRate,
      totalCases,
      completedCases,
    },
    kpiTrends,
    confidenceTrend,
    predictionDistribution,
    riskDistribution,
    biradsDistribution,
    latencyPercentiles,
  };
}
