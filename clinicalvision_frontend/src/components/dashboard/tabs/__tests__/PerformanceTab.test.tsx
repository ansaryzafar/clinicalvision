/**
 * PerformanceTab — Unit Tests (TDD)
 *
 * Tests for the PerformanceTab component including:
 *  - Rendering with empty data
 *  - Rendering with populated data
 *  - Period selector functionality
 *  - Loading state
 *  - Data source chip
 *  - Chart slots (histogram, scatter, temporal, concordance)
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PerformanceTab from '../../tabs/PerformanceTab';
import type {
  PerformanceMetrics,
  ConfidenceBin,
  UncertaintyScatterPoint,
  TemporalConfidencePoint,
  ConcordanceEntry,
  CalibrationPoint,
} from '../../../../types/metrics.types';
import { EMPTY_PERFORMANCE_METRICS } from '../../../../types/metrics.types';

// ────────────────────────────────────────────────────────────────────────────
// Mock recharts
// ────────────────────────────────────────────────────────────────────────────

jest.mock('recharts', () => {
  const React = require('react');
  return {
    __esModule: true,
    ResponsiveContainer: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'responsive-container' }, children),
    BarChart: (props: any) =>
      React.createElement('div', { 'data-testid': 'bar-chart', 'data-length': props.data?.length ?? 0 }, props.children),
    Bar: (props: any) => React.createElement('div', { 'data-testid': `bar-${props.dataKey || props.name || 'default'}` }),
    ScatterChart: (props: any) =>
      React.createElement('div', { 'data-testid': 'scatter-chart' }, props.children),
    Scatter: (props: any) =>
      React.createElement('div', { 'data-testid': `scatter-${props.name?.replace(/\s+/g, '-').toLowerCase() || 'default'}` }),
    ComposedChart: (props: any) =>
      React.createElement('div', { 'data-testid': 'composed-chart', 'data-length': props.data?.length ?? 0 }, props.children),
    AreaChart: (props: any) =>
      React.createElement('div', { 'data-testid': 'area-chart', 'data-length': props.data?.length ?? 0 }, props.children),
    Area: (props: any) => React.createElement('div', { 'data-testid': `area-${props.dataKey}` }),
    Line: (props: any) => React.createElement('div', { 'data-testid': `line-${props.dataKey}` }),
    XAxis: () => React.createElement('div', { 'data-testid': 'x-axis' }),
    YAxis: () => React.createElement('div', { 'data-testid': 'y-axis' }),
    ZAxis: () => React.createElement('div', { 'data-testid': 'z-axis' }),
    CartesianGrid: () => React.createElement('div'),
    Tooltip: () => React.createElement('div', { 'data-testid': 'tooltip' }),
    Legend: () => React.createElement('div', { 'data-testid': 'legend' }),
    ReferenceLine: () => React.createElement('div', { 'data-testid': 'reference-line' }),
    Cell: () => React.createElement('div'),
    LineChart: (props: any) =>
      React.createElement('div', { 'data-testid': 'line-chart', 'data-length': props.data?.length ?? 0 }, props.children),
    RadialBarChart: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'radial-bar-chart' }, children),
    RadialBar: () => React.createElement('div', { 'data-testid': 'radial-bar' }),
    PolarAngleAxis: () => React.createElement('div'),
  };
});

// ────────────────────────────────────────────────────────────────────────────
// Mock the usePerformanceMetrics hook
// ────────────────────────────────────────────────────────────────────────────

const mockRefresh = jest.fn();

let mockHookReturn: {
  data: PerformanceMetrics;
  isLoading: boolean;
  error: string | null;
  dataSource: 'api' | 'local' | null;
  refresh: () => void;
  lastUpdated: Date | null;
};

jest.mock('../../../../hooks/useMetrics', () => ({
  usePerformanceMetrics: (opts: any) => mockHookReturn,
}));

// ────────────────────────────────────────────────────────────────────────────
// Test data
// ────────────────────────────────────────────────────────────────────────────

const MOCK_HISTOGRAM: ConfidenceBin[] = [
  { binStart: 0, binEnd: 0.1, count: 5 },
  { binStart: 0.1, binEnd: 0.2, count: 10 },
  { binStart: 0.5, binEnd: 0.6, count: 25 },
  { binStart: 0.9, binEnd: 1.0, count: 40 },
];

const MOCK_SCATTER: UncertaintyScatterPoint[] = [
  { analysisId: 'a1', confidence: 0.85, uncertainty: 0.1, processingTimeMs: 200, riskLevel: 'low' },
  { analysisId: 'a2', confidence: 0.5, uncertainty: 0.4, processingTimeMs: 350, riskLevel: 'high' },
];

const MOCK_TEMPORAL: TemporalConfidencePoint[] = [
  { date: '2024-01-15', avgConfidence: 0.82, avgEpistemicUncertainty: 0.08, avgAleatoricUncertainty: 0.12, analysisCount: 50, highUncertaintyCount: 3 },
  { date: '2024-01-16', avgConfidence: 0.84, avgEpistemicUncertainty: 0.07, avgAleatoricUncertainty: 0.11, analysisCount: 55, highUncertaintyCount: 2 },
];

const MOCK_CONCORDANCE: ConcordanceEntry[] = [
  { category: 'Malignant', aiCount: 50, radiologistCount: 48, agreementRate: 0.92 },
  { category: 'Benign', aiCount: 120, radiologistCount: 125, agreementRate: 0.96 },
];

const MOCK_CALIBRATION: CalibrationPoint[] = [
  { binStart: 0.0, binEnd: 0.1, predictedProbability: 0.05, observedFrequency: 0.03, count: 20 },
  { binStart: 0.5, binEnd: 0.6, predictedProbability: 0.55, observedFrequency: 0.52, count: 30 },
  { binStart: 0.9, binEnd: 1.0, predictedProbability: 0.95, observedFrequency: 0.93, count: 45 },
];

const MOCK_POPULATED: PerformanceMetrics = {
  kpis: {
    sensitivity: 0.92,
    specificity: 0.88,
    aucRoc: 0.95,
    ppv: 0.85,
    npv: 0.93,
    f1Score: 0.89,
    totalAnalyses: 500,
    flaggedForReview: 42,
  },
  kpiTrends: {
    sensitivityChange: 0.02,
    specificityChange: -0.01,
    aucRocChange: 0.015,
    ppvChange: 0.0,
  },
  confidenceHistogram: MOCK_HISTOGRAM,
  uncertaintyScatter: MOCK_SCATTER,
  temporalConfidence: MOCK_TEMPORAL,
  concordanceData: MOCK_CONCORDANCE,
  calibrationCurve: MOCK_CALIBRATION,
};

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const theme = createTheme();
const wrap = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

// ════════════════════════════════════════════════════════════════════════════
// Tests
// ════════════════════════════════════════════════════════════════════════════

beforeEach(() => {
  jest.clearAllMocks();
  mockHookReturn = {
    data: EMPTY_PERFORMANCE_METRICS,
    isLoading: false,
    error: null,
    dataSource: null,
    refresh: mockRefresh,
    lastUpdated: null,
  };
});

describe('PerformanceTab', () => {
  // ── Basic rendering ──────────────────────────────────────────────────────

  it('renders the tab container', () => {
    wrap(<PerformanceTab />);
    expect(screen.getByTestId('performance-tab')).toBeInTheDocument();
  });

  it('renders the heading', () => {
    wrap(<PerformanceTab />);
    expect(screen.getByText('Performance Deep Dive')).toBeInTheDocument();
  });

  // ── Empty state ──────────────────────────────────────────────────────────

  it('shows empty messages when no data is available', () => {
    wrap(<PerformanceTab />);
    expect(screen.getByTestId('empty-histogram')).toBeInTheDocument();
    expect(screen.getByTestId('empty-scatter')).toBeInTheDocument();
    expect(screen.getByTestId('empty-temporal')).toBeInTheDocument();
    expect(screen.getByTestId('empty-concordance')).toBeInTheDocument();
  });

  // ── Populated state ──────────────────────────────────────────────────────

  it('renders charts when data is populated', () => {
    mockHookReturn = {
      ...mockHookReturn,
      data: MOCK_POPULATED,
      dataSource: 'api',
    };
    wrap(<PerformanceTab />);

    // Should NOT show empty messages
    expect(screen.queryByTestId('empty-histogram')).not.toBeInTheDocument();
    expect(screen.queryByTestId('empty-scatter')).not.toBeInTheDocument();
    expect(screen.queryByTestId('empty-temporal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('empty-concordance')).not.toBeInTheDocument();

    // Chart containers should be present
    expect(screen.getAllByTestId('responsive-container').length).toBeGreaterThanOrEqual(4);
  });

  // ── KPI Gauges ───────────────────────────────────────────────────────────

  it('renders KPI gauge labels', () => {
    mockHookReturn = { ...mockHookReturn, data: MOCK_POPULATED, dataSource: 'api' };
    wrap(<PerformanceTab />);

    expect(screen.getByText('Sensitivity')).toBeInTheDocument();
    expect(screen.getByText('Specificity')).toBeInTheDocument();
    expect(screen.getByText('AUC-ROC')).toBeInTheDocument();
    expect(screen.getByText('PPV')).toBeInTheDocument();
  });

  // ── Loading state ────────────────────────────────────────────────────────

  it('shows loading spinner when loading', () => {
    mockHookReturn = { ...mockHookReturn, isLoading: true };
    wrap(<PerformanceTab />);
    expect(screen.getByTestId('perf-metrics-loading')).toBeInTheDocument();
  });

  it('hides loading spinner when not loading', () => {
    wrap(<PerformanceTab />);
    expect(screen.queryByTestId('perf-metrics-loading')).not.toBeInTheDocument();
  });

  // ── Data source chip ─────────────────────────────────────────────────────

  it('shows "Live" chip when dataSource is api', () => {
    mockHookReturn = { ...mockHookReturn, dataSource: 'api' };
    wrap(<PerformanceTab />);
    const chip = screen.getByTestId('perf-data-source-chip');
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent('Live');
  });

  it('does not show data source chip when dataSource is null', () => {
    wrap(<PerformanceTab />);
    expect(screen.queryByTestId('perf-data-source-chip')).not.toBeInTheDocument();
  });

  // ── Refresh button ──────────────────────────────────────────────────────

  it('calls refresh when clicking the refresh button', () => {
    wrap(<PerformanceTab />);
    const btn = screen.getByTestId('perf-refresh-metrics');
    fireEvent.click(btn);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  // ── Period selector ─────────────────────────────────────────────────────

  it('renders all period options', () => {
    wrap(<PerformanceTab />);
    expect(screen.getByText('7 Days')).toBeInTheDocument();
    // '30 Days' appears in both toggle button AND MetricCard timeRange
    expect(screen.getAllByText('30 Days').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('90 Days')).toBeInTheDocument();
    expect(screen.getByText('All Time')).toBeInTheDocument();
  });

  // ── MetricCard titles ───────────────────────────────────────────────────

  it('renders chart card titles', () => {
    wrap(<PerformanceTab />);
    expect(screen.getByText('Confidence Distribution')).toBeInTheDocument();
    expect(screen.getByText('Uncertainty vs Confidence')).toBeInTheDocument();
    expect(screen.getByText('Confidence & Uncertainty Over Time')).toBeInTheDocument();
    expect(screen.getByText('AI vs Radiologist Agreement')).toBeInTheDocument();
  });

  // ── KPI values correct with math ────────────────────────────────────────

  it('displays correct gauge percentages from KPI values', () => {
    mockHookReturn = { ...mockHookReturn, data: MOCK_POPULATED, dataSource: 'api' };
    wrap(<PerformanceTab />);

    // GaugeCard renders "{value}{unit}" e.g. "92%"
    expect(screen.getAllByText('92%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('88%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('95%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('85%').length).toBeGreaterThanOrEqual(1);
  });

  // ── Calibration Curve ─────────────────────────────────────────────

  it('renders Calibration Curve card title', () => {
    wrap(<PerformanceTab />);
    expect(screen.getByText('Calibration Curve')).toBeInTheDocument();
  });

  it('shows calibration empty state when no calibration data', () => {
    wrap(<PerformanceTab />);
    expect(screen.getByTestId('empty-calibration')).toBeInTheDocument();
  });

  it('renders calibration chart when data is populated', () => {
    mockHookReturn = {
      ...mockHookReturn,
      data: MOCK_POPULATED,
      dataSource: 'api',
    };
    wrap(<PerformanceTab />);
    expect(screen.queryByTestId('empty-calibration')).not.toBeInTheDocument();
  });

  // ── Error alert ──────────────────────────────────────────────────

  it('shows error alert when error is set', () => {
    mockHookReturn = { ...mockHookReturn, error: 'API timeout' };
    wrap(<PerformanceTab />);
    expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    expect(screen.getByText('API timeout')).toBeInTheDocument();
  });
});
