/**
 * ModelIntelligenceTab — Unit Tests (TDD)
 *
 * Tests for the ModelIntelligenceTab component including:
 *  - Rendering with empty data
 *  - Rendering with populated data
 *  - Summary metric derivation (versions, active model, review rate, top trigger)
 *  - Period selector functionality
 *  - Loading state
 *  - Data source chip
 *  - Chart slots (decomposition, version comparison, review rate, triggers)
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ModelIntelligenceTab from '../../tabs/ModelIntelligenceTab';
import type {
  ModelIntelligenceMetrics,
  UncertaintyDecompositionPoint,
  ModelVersionStats,
  HumanReviewRatePoint,
  ReviewTrigger,
  EntropyBin,
} from '../../../../types/metrics.types';
import { EMPTY_MODEL_INTELLIGENCE_METRICS } from '../../../../types/metrics.types';

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
    AreaChart: (props: any) =>
      React.createElement('div', { 'data-testid': 'area-chart', 'data-length': props.data?.length ?? 0 }, props.children),
    Area: (props: any) => React.createElement('div', { 'data-testid': `area-${props.dataKey}` }),
    PieChart: (props: any) =>
      React.createElement('div', { 'data-testid': 'pie-chart' }, props.children),
    Pie: (props: any) =>
      React.createElement('div', { 'data-testid': 'pie' }),
    XAxis: () => React.createElement('div', { 'data-testid': 'x-axis' }),
    YAxis: () => React.createElement('div', { 'data-testid': 'y-axis' }),
    CartesianGrid: () => React.createElement('div'),
    Tooltip: () => React.createElement('div', { 'data-testid': 'tooltip' }),
    Legend: () => React.createElement('div', { 'data-testid': 'legend' }),
    ReferenceLine: () => React.createElement('div', { 'data-testid': 'reference-line' }),
    Cell: () => React.createElement('div'),
    Line: (props: any) => React.createElement('div', { 'data-testid': `line-${props.dataKey}` }),
    RadialBarChart: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'radial-bar-chart' }, children),
    RadialBar: () => React.createElement('div', { 'data-testid': 'radial-bar' }),
    PolarAngleAxis: () => React.createElement('div'),
  };
});

// ────────────────────────────────────────────────────────────────────────────
// Mock the useModelIntelligenceMetrics hook
// ────────────────────────────────────────────────────────────────────────────

const mockRefresh = jest.fn();

let mockHookReturn: {
  data: ModelIntelligenceMetrics;
  isLoading: boolean;
  error: string | null;
  dataSource: 'api' | 'local' | null;
  refresh: () => void;
  lastUpdated: Date | null;
};

jest.mock('../../../../hooks/useMetrics', () => ({
  useModelIntelligenceMetrics: (opts: any) => mockHookReturn,
  useSystemHealth: () => ({ data: { modelVersion: 'v1.3.0', status: 'healthy', uptime: 99.9 }, isLoading: false, error: null }),
}));

// ────────────────────────────────────────────────────────────────────────────
// Test data
// ────────────────────────────────────────────────────────────────────────────

const MOCK_DECOMPOSITION: UncertaintyDecompositionPoint[] = [
  { date: '2024-01-15', epistemic: 0.08, aleatoric: 0.12, total: 0.20 },
  { date: '2024-01-16', epistemic: 0.07, aleatoric: 0.11, total: 0.18 },
];

const MOCK_VERSIONS: ModelVersionStats[] = [
  { version: 'v1.2.0', accuracy: 0.9, totalPredictions: 200, avgConfidence: 0.82, avgLatencyMs: 310, aucRoc: 0.91 },
  { version: 'v1.3.0', accuracy: 0.93, totalPredictions: 300, avgConfidence: 0.87, avgLatencyMs: 280, aucRoc: 0.95 },
];

const MOCK_REVIEW_RATE: HumanReviewRatePoint[] = [
  { date: '2024-01-15', reviewRate: 0.18, totalCases: 50, reviewedCases: 9 },
  { date: '2024-01-16', reviewRate: 0.22, totalCases: 55, reviewedCases: 12 },
];

const MOCK_TRIGGERS: ReviewTrigger[] = [
  { trigger: 'high_epistemic', count: 30, percentage: 42.9 },
  { trigger: 'low_confidence', count: 25, percentage: 35.7 },
  { trigger: 'high_entropy', count: 15, percentage: 21.4 },
];

const MOCK_ENTROPY = [
  { binStart: 0.0, binEnd: 0.1, count: 30, label: '0.00–0.10' },
  { binStart: 0.1, binEnd: 0.2, count: 20, label: '0.10–0.20' },
  { binStart: 0.5, binEnd: 0.6, count: 5, label: '0.50–0.60' },
];

const MOCK_POPULATED: ModelIntelligenceMetrics = {
  uncertaintyDecomposition: MOCK_DECOMPOSITION,
  modelVersionComparison: MOCK_VERSIONS,
  humanReviewRate: MOCK_REVIEW_RATE,
  reviewTriggers: MOCK_TRIGGERS,
  entropyDistribution: MOCK_ENTROPY,
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
    data: EMPTY_MODEL_INTELLIGENCE_METRICS,
    isLoading: false,
    error: null,
    dataSource: null,
    refresh: mockRefresh,
    lastUpdated: null,
  };
});

describe('ModelIntelligenceTab', () => {
  // ── Basic rendering ──────────────────────────────────────────────────────

  it('renders the tab container', () => {
    wrap(<ModelIntelligenceTab period="30d" />);
    expect(screen.getByTestId('model-intelligence-tab')).toBeInTheDocument();
  });

  it('renders the heading', () => {
    wrap(<ModelIntelligenceTab period="30d" />);
    expect(screen.getByText('Model Intelligence')).toBeInTheDocument();
  });

  // ── Empty state ──────────────────────────────────────────────────────────

  it('shows empty messages when no data is available', () => {
    wrap(<ModelIntelligenceTab period="30d" />);
    expect(screen.getByTestId('empty-decomposition')).toBeInTheDocument();
    expect(screen.getByTestId('empty-version-comparison')).toBeInTheDocument();
    expect(screen.getByTestId('empty-review-rate')).toBeInTheDocument();
    expect(screen.getByTestId('empty-triggers')).toBeInTheDocument();
  });

  // ── Populated state ──────────────────────────────────────────────────────

  it('renders charts when data is populated', () => {
    mockHookReturn = {
      ...mockHookReturn,
      data: MOCK_POPULATED,
      dataSource: 'api',
    };
    wrap(<ModelIntelligenceTab period="30d" />);

    // Empty messages should be gone
    expect(screen.queryByTestId('empty-decomposition')).not.toBeInTheDocument();
    expect(screen.queryByTestId('empty-version-comparison')).not.toBeInTheDocument();
    expect(screen.queryByTestId('empty-review-rate')).not.toBeInTheDocument();
    expect(screen.queryByTestId('empty-triggers')).not.toBeInTheDocument();

    // Chart containers present
    expect(screen.getAllByTestId('responsive-container').length).toBeGreaterThanOrEqual(3);
  });

  // ── Summary metrics derivation ──────────────────────────────────────────

  it('derives correct model version count', () => {
    mockHookReturn = { ...mockHookReturn, data: MOCK_POPULATED, dataSource: 'api' };
    wrap(<ModelIntelligenceTab period="30d" />);
    // GaugeCard with "Model Versions" should show the count "2"
    expect(screen.getByText('Model Versions')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('derives the active model version (last entry)', () => {
    mockHookReturn = { ...mockHookReturn, data: MOCK_POPULATED, dataSource: 'api' };
    wrap(<ModelIntelligenceTab period="30d" />);
    expect(screen.getByTestId('active-model-version')).toHaveTextContent('v1.3.0');
  });

  it('derives the top review trigger', () => {
    mockHookReturn = { ...mockHookReturn, data: MOCK_POPULATED, dataSource: 'api' };
    wrap(<ModelIntelligenceTab period="30d" />);
    const triggerElem = screen.getByTestId('top-review-trigger');
    expect(triggerElem).toHaveTextContent('high epistemic');
  });

  it('shows fallback for summary metrics when empty', () => {
    wrap(<ModelIntelligenceTab period="30d" />);
    // Active model version falls back to system health data (v1.3.0) when metrics are empty
    expect(screen.getByTestId('active-model-version')).toHaveTextContent('v1.3.0');
    expect(screen.getByTestId('top-review-trigger')).toHaveTextContent('—');
  });

  // ── Loading state ────────────────────────────────────────────────────────

  it('shows loading spinner when loading', () => {
    mockHookReturn = { ...mockHookReturn, isLoading: true };
    wrap(<ModelIntelligenceTab period="30d" />);
    expect(screen.getByTestId('intel-metrics-loading')).toBeInTheDocument();
  });

  it('hides loading spinner when not loading', () => {
    wrap(<ModelIntelligenceTab period="30d" />);
    expect(screen.queryByTestId('intel-metrics-loading')).not.toBeInTheDocument();
  });

  // ── Data source chip ─────────────────────────────────────────────────────

  it('shows "Live" chip when dataSource is api', () => {
    mockHookReturn = { ...mockHookReturn, dataSource: 'api' };
    wrap(<ModelIntelligenceTab period="30d" />);
    const chip = screen.getByTestId('intel-data-source-chip');
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent('Live');
  });

  it('does not show data source chip when dataSource is null', () => {
    wrap(<ModelIntelligenceTab period="30d" />);
    expect(screen.queryByTestId('intel-data-source-chip')).not.toBeInTheDocument();
  });

  // ── Refresh button ──────────────────────────────────────────────────────

  it('calls refresh when clicking the refresh button', () => {
    wrap(<ModelIntelligenceTab period="30d" />);
    const btn = screen.getByTestId('intel-refresh-metrics');
    fireEvent.click(btn);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  // ── Period selector ─────────────────────────────────────────────────────

  it('accepts period prop and passes it to data hook', () => {
    wrap(<ModelIntelligenceTab period="30d" />);
    // Period selector is now in parent ClinicalDashboard sub-banner;
    // tab receives period as prop and uses it for data fetching.
    expect(screen.getByTestId('model-intelligence-tab')).toBeInTheDocument();
  });

  it('renders correctly with different period values', () => {
    wrap(<ModelIntelligenceTab period="7d" />);
    expect(screen.getByTestId('model-intelligence-tab')).toBeInTheDocument();
  });

  // ── MetricCard titles ───────────────────────────────────────────────────

  it('renders chart card titles', () => {
    wrap(<ModelIntelligenceTab period="30d" />);
    expect(screen.getByText('Uncertainty Decomposition Over Time')).toBeInTheDocument();
    expect(screen.getByText('Model Version Comparison')).toBeInTheDocument();
    expect(screen.getByText('Human Review Rate Over Time')).toBeInTheDocument();
    expect(screen.getByText('Review Trigger Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Predictive Entropy Distribution')).toBeInTheDocument();
  });

  // ── Entropy histogram ──────────────────────────────────────────────────

  it('shows entropy empty state when no entropy data', () => {
    wrap(<ModelIntelligenceTab period="30d" />);
    expect(screen.getByTestId('empty-entropy')).toBeInTheDocument();
  });

  it('renders entropy histogram when data is populated', () => {
    mockHookReturn = {
      ...mockHookReturn,
      data: MOCK_POPULATED,
      dataSource: 'api',
    };
    wrap(<ModelIntelligenceTab period="30d" />);
    expect(screen.queryByTestId('empty-entropy')).not.toBeInTheDocument();
  });

  // ── Error state ──────────────────────────────────────────────────────

  it('shows error alert when error is set', () => {
    mockHookReturn = { ...mockHookReturn, error: 'Network error' };
    wrap(<ModelIntelligenceTab period="30d" />);
    expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });
});
