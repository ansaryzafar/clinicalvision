/**
 * localMetricsAggregator — Unit Tests (TDD)
 *
 * @jest-environment jsdom
 *
 * Verifies aggregation of metrics from localStorage-based session data.
 * Tests cover:
 *  - Empty sessions → EMPTY_OVERVIEW_METRICS
 *  - Single session with one analysis
 *  - Multiple sessions with multiple analyses
 *  - Period filtering (7d / 30d / 90d / all)
 *  - BI-RADS distribution from findings
 *  - Risk level counts
 *  - Prediction distribution
 *  - Confidence trend grouping by date
 *  - Latency percentile computation
 *  - High-uncertainty rate calculation
 *  - Edge: missing optional fields (no processingTimeMs, no uncertainty)
 */

import { aggregateLocalMetrics } from '../localMetricsAggregator';
import { EMPTY_OVERVIEW_METRICS } from '../../types/metrics.types';
import type { AnalysisSession } from '../../types/clinical.types';

// ── Mock clinicalSessionService ──────────────────────────────────────────
const mockGetAllSessions = jest.fn<AnalysisSession[], []>();

jest.mock('../clinicalSession.service', () => ({
  clinicalSessionService: {
    getAllSessions: () => mockGetAllSessions(),
  },
}));

// ── Helper factories ─────────────────────────────────────────────────────

/** Minimal valid AnalysisSession stub */
function makeSession(overrides: Partial<AnalysisSession> = {}): AnalysisSession {
  return {
    sessionId: `session_${Math.random().toString(36).slice(2, 8)}`,
    patientInfo: { patientId: 'P-001', patientName: 'Test' } as any,
    studyInfo: {} as any,
    images: [],
    findings: [],
    assessment: { impression: '', recommendation: '' },
    workflow: {
      mode: 'quick',
      currentStep: 1,
      completedSteps: [],
      status: 'completed',
    },
    measurements: [],
    viewerSettings: {
      windowLevel: { width: 400, center: 40 },
      zoom: 1,
      rotation: 0,
      gridEnabled: false,
      gridSpacing: 10,
      calibration: 1,
    },
    metadata: {
      createdAt: new Date().toISOString(),
      createdBy: 'test',
      lastModified: new Date().toISOString(),
      modifiedBy: 'test',
      version: 1,
      autoSaveEnabled: false,
    },
    ...overrides,
  } as AnalysisSession;
}

/** Helper to make stored analysis result */
function makeAnalysis(overrides: Record<string, any> = {}) {
  return {
    prediction: 'benign' as const,
    confidence: 0.87,
    probabilities: { benign: 0.87, malignant: 0.13 },
    riskLevel: 'low' as const,
    processingTimeMs: 320,
    modelVersion: 'v2.1.0',
    analyzedAt: new Date().toISOString(),
    ...overrides,
  };
}

/** Helper to make findings with BI-RADS */
function makeFinding(birads: string, aiConfidence = 0.85) {
  return {
    findingId: `f_${Math.random().toString(36).slice(2, 6)}`,
    findingType: 'mass' as const,
    location: {} as any,
    status: 'confirmed' as const,
    biradsCategory: birads,
    aiConfidence,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('aggregateLocalMetrics', () => {
  beforeEach(() => {
    mockGetAllSessions.mockReset();
  });

  // ─────────────────────────────────────────────────────────────────────
  // 1. Empty / no data
  // ─────────────────────────────────────────────────────────────────────

  it('returns EMPTY_OVERVIEW_METRICS when no sessions exist', () => {
    mockGetAllSessions.mockReturnValue([]);
    const result = aggregateLocalMetrics('all');
    expect(result).toEqual(EMPTY_OVERVIEW_METRICS);
  });

  it('returns EMPTY_OVERVIEW_METRICS when sessions have no analysis results', () => {
    mockGetAllSessions.mockReturnValue([makeSession(), makeSession()]);
    const result = aggregateLocalMetrics('all');
    expect(result.kpis.totalAnalyses).toBe(0);
    expect(result.kpis.totalCases).toBe(2);
  });

  // ─────────────────────────────────────────────────────────────────────
  // 2. Single session with one analysis
  // ─────────────────────────────────────────────────────────────────────

  it('aggregates a single analysis correctly', () => {
    const session = makeSession({
      storedAnalysisResults: makeAnalysis({
        prediction: 'malignant',
        confidence: 0.92,
        riskLevel: 'high',
        processingTimeMs: 500,
        analyzedAt: '2026-03-10T10:00:00Z',
      }),
      workflow: { mode: 'quick', currentStep: 5, completedSteps: [], status: 'completed' },
    });
    mockGetAllSessions.mockReturnValue([session]);

    const result = aggregateLocalMetrics('all');

    expect(result.kpis.totalAnalyses).toBe(1);
    expect(result.kpis.totalCases).toBe(1);
    expect(result.kpis.completedCases).toBe(1);
    expect(result.kpis.averageConfidence).toBeCloseTo(0.92, 2);
    expect(result.kpis.averageInferenceTimeMs).toBeCloseTo(500, 0);
    expect(result.predictionDistribution.malignant).toBe(1);
    expect(result.predictionDistribution.benign).toBe(0);
    expect(result.riskDistribution.high).toBe(1);
  });

  // ─────────────────────────────────────────────────────────────────────
  // 3. Multiple sessions
  // ─────────────────────────────────────────────────────────────────────

  it('aggregates multiple sessions correctly', () => {
    const sessions = [
      makeSession({
        storedAnalysisResults: makeAnalysis({
          prediction: 'benign', confidence: 0.85, riskLevel: 'low',
          processingTimeMs: 300, analyzedAt: '2026-03-09T10:00:00Z',
        }),
        workflow: { mode: 'quick', currentStep: 5, completedSteps: [], status: 'completed' },
      }),
      makeSession({
        storedAnalysisResults: makeAnalysis({
          prediction: 'malignant', confidence: 0.91, riskLevel: 'high',
          processingTimeMs: 400, analyzedAt: '2026-03-10T10:00:00Z',
        }),
        workflow: { mode: 'quick', currentStep: 5, completedSteps: [], status: 'completed' },
      }),
      makeSession({
        storedAnalysisResults: makeAnalysis({
          prediction: 'benign', confidence: 0.78, riskLevel: 'moderate',
          processingTimeMs: 600, analyzedAt: '2026-03-10T14:00:00Z',
        }),
        workflow: { mode: 'quick', currentStep: 3, completedSteps: [], status: 'in-progress' },
      }),
    ];
    mockGetAllSessions.mockReturnValue(sessions);

    const result = aggregateLocalMetrics('all');

    expect(result.kpis.totalAnalyses).toBe(3);
    expect(result.kpis.totalCases).toBe(3);
    expect(result.kpis.completedCases).toBe(2);
    expect(result.kpis.averageConfidence).toBeCloseTo((0.85 + 0.91 + 0.78) / 3, 2);
    expect(result.kpis.averageInferenceTimeMs).toBeCloseTo((300 + 400 + 600) / 3, 0);
    expect(result.predictionDistribution.benign).toBe(2);
    expect(result.predictionDistribution.malignant).toBe(1);
    expect(result.riskDistribution.low).toBe(1);
    expect(result.riskDistribution.moderate).toBe(1);
    expect(result.riskDistribution.high).toBe(1);
  });

  // ─────────────────────────────────────────────────────────────────────
  // 4. BI-RADS distribution from findings
  // ─────────────────────────────────────────────────────────────────────

  it('counts BI-RADS distribution from findings', () => {
    const session = makeSession({
      findings: [
        makeFinding('2'),
        makeFinding('3'),
        makeFinding('4A'),
        makeFinding('4A'),
        makeFinding('5'),
      ] as any,
      storedAnalysisResults: makeAnalysis(),
    });
    mockGetAllSessions.mockReturnValue([session]);

    const result = aggregateLocalMetrics('all');

    expect(result.biradsDistribution['2']).toBe(1);
    expect(result.biradsDistribution['3']).toBe(1);
    expect(result.biradsDistribution['4']).toBe(2); // 4A → numeric 4
    expect(result.biradsDistribution['5']).toBe(1);
  });

  // ─────────────────────────────────────────────────────────────────────
  // 5. Confidence trend grouped by date
  // ─────────────────────────────────────────────────────────────────────

  it('groups confidence trend points by date', () => {
    const sessions = [
      makeSession({
        storedAnalysisResults: makeAnalysis({
          confidence: 0.80, analyzedAt: '2026-03-09T08:00:00Z', processingTimeMs: 200,
        }),
      }),
      makeSession({
        storedAnalysisResults: makeAnalysis({
          confidence: 0.90, analyzedAt: '2026-03-09T16:00:00Z', processingTimeMs: 300,
        }),
      }),
      makeSession({
        storedAnalysisResults: makeAnalysis({
          confidence: 0.95, analyzedAt: '2026-03-10T10:00:00Z', processingTimeMs: 250,
        }),
      }),
    ];
    mockGetAllSessions.mockReturnValue(sessions);

    const result = aggregateLocalMetrics('all');

    expect(result.confidenceTrend.length).toBe(2); // Two distinct dates
    const mar9 = result.confidenceTrend.find(p => p.date === '2026-03-09');
    expect(mar9).toBeDefined();
    expect(mar9!.avgConfidence).toBeCloseTo(0.85, 2); // mean of 0.80, 0.90
    expect(mar9!.analysisCount).toBe(2);

    const mar10 = result.confidenceTrend.find(p => p.date === '2026-03-10');
    expect(mar10).toBeDefined();
    expect(mar10!.avgConfidence).toBeCloseTo(0.95, 2);
    expect(mar10!.analysisCount).toBe(1);
  });

  // ─────────────────────────────────────────────────────────────────────
  // 6. Period filtering
  // ─────────────────────────────────────────────────────────────────────

  it('filters analyses by period (7d)', () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    const old = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000); // 20 days ago

    const sessions = [
      makeSession({
        storedAnalysisResults: makeAnalysis({
          confidence: 0.85, analyzedAt: recent.toISOString(), processingTimeMs: 300,
        }),
        metadata: { createdAt: recent.toISOString(), createdBy: 'test', lastModified: recent.toISOString(), modifiedBy: 'test', version: 1, autoSaveEnabled: false },
      }),
      makeSession({
        storedAnalysisResults: makeAnalysis({
          confidence: 0.70, analyzedAt: old.toISOString(), processingTimeMs: 500,
        }),
        metadata: { createdAt: old.toISOString(), createdBy: 'test', lastModified: old.toISOString(), modifiedBy: 'test', version: 1, autoSaveEnabled: false },
      }),
    ];
    mockGetAllSessions.mockReturnValue(sessions);

    const result = aggregateLocalMetrics('7d');
    expect(result.kpis.totalAnalyses).toBe(1); // Only the recent one
    expect(result.kpis.averageConfidence).toBeCloseTo(0.85, 2);
  });

  // ─────────────────────────────────────────────────────────────────────
  // 7. Edge: missing optional fields
  // ─────────────────────────────────────────────────────────────────────

  it('handles sessions with no processingTimeMs gracefully', () => {
    const session = makeSession({
      storedAnalysisResults: makeAnalysis({
        processingTimeMs: undefined,
      }),
    });
    mockGetAllSessions.mockReturnValue([session]);

    const result = aggregateLocalMetrics('all');
    expect(result.kpis.averageInferenceTimeMs).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────────
  // 8. Latency percentiles
  // ─────────────────────────────────────────────────────────────────────

  it('computes latency percentiles per date', () => {
    const analyses = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map(
      (ms, i) =>
        makeSession({
          storedAnalysisResults: makeAnalysis({
            processingTimeMs: ms,
            analyzedAt: '2026-03-10T10:00:00Z',
          }),
        }),
    );
    mockGetAllSessions.mockReturnValue(analyses);

    const result = aggregateLocalMetrics('all');

    expect(result.latencyPercentiles.length).toBe(1);
    const point = result.latencyPercentiles[0];
    expect(point.date).toBe('2026-03-10');
    expect(point.p50).toBeGreaterThan(0);
    expect(point.p90).toBeGreaterThanOrEqual(point.p50);
    expect(point.p99).toBeGreaterThanOrEqual(point.p90);
  });

  // ─────────────────────────────────────────────────────────────────────
  // 9. High-uncertainty rate
  // ─────────────────────────────────────────────────────────────────────

  it('calculates high-uncertainty rate from confidence < 0.6', () => {
    const sessions = [
      makeSession({ storedAnalysisResults: makeAnalysis({ confidence: 0.40 }) }),
      makeSession({ storedAnalysisResults: makeAnalysis({ confidence: 0.55 }) }),
      makeSession({ storedAnalysisResults: makeAnalysis({ confidence: 0.90 }) }),
      makeSession({ storedAnalysisResults: makeAnalysis({ confidence: 0.85 }) }),
    ];
    mockGetAllSessions.mockReturnValue(sessions);

    const result = aggregateLocalMetrics('all');
    // 2 out of 4 have confidence < 0.6
    expect(result.kpis.highUncertaintyRate).toBeCloseTo(0.5, 2);
  });
});
