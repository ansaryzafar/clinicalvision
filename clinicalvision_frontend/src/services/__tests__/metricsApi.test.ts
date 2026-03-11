/**
 * metricsApi — Unit Tests
 *
 * Tests the snake_case → camelCase mapping and error handling.
 *
 * @jest-environment jsdom
 */

import { fetchOverviewMetrics } from '../metricsApi';

// Mock the apiClient module
const mockGet = jest.fn();
jest.mock('../../utils/apiClient', () => ({
  __esModule: true,
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

// ── Sample backend response (snake_case) ────────────────────────────────
const BACKEND_RESPONSE = {
  kpis: {
    total_analyses: 247,
    average_confidence: 0.87,
    average_inference_time_ms: 342.5,
    high_uncertainty_rate: 0.12,
    total_cases: 85,
    completed_cases: 72,
  },
  kpi_trends: {
    confidence_change: 0.02,
    latency_change: -15.3,
    uncertainty_change: -0.01,
  },
  confidence_trend: [
    { date: '2026-03-01', avg_confidence: 0.85, std_confidence: 0.08, analysis_count: 12 },
    { date: '2026-03-02', avg_confidence: 0.88, std_confidence: 0.06, analysis_count: 15 },
  ],
  prediction_distribution: { benign: 180, malignant: 67 },
  risk_distribution: { low: 160, moderate: 55, high: 32 },
  birads_distribution: { '1': 45, '2': 80, '3': 62, '4': 38, '5': 22 },
  latency_percentiles: [
    { date: '2026-03-01', p50: 280.0, p90: 520.0, p99: 890.0 },
  ],
};

describe('metricsApi', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('calls the correct endpoint with period param', async () => {
    mockGet.mockResolvedValueOnce({ data: BACKEND_RESPONSE });

    await fetchOverviewMetrics('7d');

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/analytics/overview',
      expect.objectContaining({ params: { period: '7d' } }),
    );
  });

  it('maps snake_case response to camelCase OverviewMetrics', async () => {
    mockGet.mockResolvedValueOnce({ data: BACKEND_RESPONSE });

    const result = await fetchOverviewMetrics('30d');

    // KPIs
    expect(result.kpis.totalAnalyses).toBe(247);
    expect(result.kpis.averageConfidence).toBe(0.87);
    expect(result.kpis.averageInferenceTimeMs).toBe(342.5);
    expect(result.kpis.highUncertaintyRate).toBe(0.12);
    expect(result.kpis.totalCases).toBe(85);
    expect(result.kpis.completedCases).toBe(72);

    // KPI Trends
    expect(result.kpiTrends.confidenceChange).toBe(0.02);
    expect(result.kpiTrends.latencyChange).toBe(-15.3);
    expect(result.kpiTrends.uncertaintyChange).toBe(-0.01);

    // Confidence trend
    expect(result.confidenceTrend).toHaveLength(2);
    expect(result.confidenceTrend[0].avgConfidence).toBe(0.85);
    expect(result.confidenceTrend[0].stdConfidence).toBe(0.08);
    expect(result.confidenceTrend[0].analysisCount).toBe(12);

    // Distributions
    expect(result.predictionDistribution.benign).toBe(180);
    expect(result.predictionDistribution.malignant).toBe(67);
    expect(result.riskDistribution.low).toBe(160);
    expect(result.biradsDistribution).toEqual({ '1': 45, '2': 80, '3': 62, '4': 38, '5': 22 });

    // Latency
    expect(result.latencyPercentiles).toHaveLength(1);
    expect(result.latencyPercentiles[0].p50).toBe(280.0);
  });

  it('passes AbortSignal to apiClient', async () => {
    mockGet.mockResolvedValueOnce({ data: BACKEND_RESPONSE });
    const controller = new AbortController();

    await fetchOverviewMetrics('30d', controller.signal);

    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/analytics/overview',
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it('defaults to 30d period when not specified', async () => {
    mockGet.mockResolvedValueOnce({ data: BACKEND_RESPONSE });

    await fetchOverviewMetrics();

    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/analytics/overview',
      expect.objectContaining({ params: { period: '30d' } }),
    );
  });

  it('propagates network errors', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network Error'));

    await expect(fetchOverviewMetrics('7d')).rejects.toThrow('Network Error');
  });
});
