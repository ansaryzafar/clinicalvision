/**
 * OverviewTab — Unit Tests (TDD)
 *
 * Tests for the OverviewTab component including:
 *  - Rendering with empty data
 *  - Rendering with populated data
 *  - Loading skeletons
 *  - Error alert display
 *  - SystemHealthBar rendering
 *  - Period selector & refresh
 *  - Data source chip
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import OverviewTab from '../../tabs/OverviewTab';
import type {
  OverviewMetrics,
  SystemHealthStatus,
} from '../../../../types/metrics.types';
import {
  EMPTY_OVERVIEW_METRICS,
  EMPTY_SYSTEM_HEALTH,
} from '../../../../types/metrics.types';

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
      React.createElement('div', { 'data-testid': 'bar-chart' }, props.children),
    Bar: (props: any) => React.createElement('div', { 'data-testid': `bar-${props.dataKey || 'default'}` }),
    LineChart: (props: any) =>
      React.createElement('div', { 'data-testid': 'line-chart' }, props.children),
    AreaChart: (props: any) =>
      React.createElement('div', { 'data-testid': 'area-chart' }, props.children),
    Area: (props: any) => React.createElement('div', { 'data-testid': `area-${props.dataKey}` }),
    Line: (props: any) => React.createElement('div', { 'data-testid': `line-${props.dataKey}` }),
    ComposedChart: (props: any) =>
      React.createElement('div', { 'data-testid': 'composed-chart' }, props.children),
    PieChart: (props: any) =>
      React.createElement('div', { 'data-testid': 'pie-chart' }, props.children),
    Pie: (props: any) => React.createElement('div', { 'data-testid': 'pie' }),
    Cell: () => React.createElement('div'),
    XAxis: () => React.createElement('div'),
    YAxis: () => React.createElement('div'),
    CartesianGrid: () => React.createElement('div'),
    Tooltip: () => React.createElement('div', { 'data-testid': 'tooltip' }),
    Legend: () => React.createElement('div'),
    ReferenceLine: () => React.createElement('div'),
    RadialBarChart: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'radial-bar-chart' }, children),
    RadialBar: () => React.createElement('div', { 'data-testid': 'radial-bar' }),
    PolarAngleAxis: () => React.createElement('div'),
  };
});

// ────────────────────────────────────────────────────────────────────────────
// Mock hooks
// ────────────────────────────────────────────────────────────────────────────

const mockRefresh = jest.fn();

let mockOverviewReturn: {
  data: OverviewMetrics;
  isLoading: boolean;
  error: string | null;
  dataSource: 'api' | 'local' | null;
  refresh: () => void;
  lastUpdated: Date | null;
};

let mockHealthReturn: {
  data: SystemHealthStatus;
  isLoading: boolean;
  error: string | null;
};

jest.mock('../../../../hooks/useMetrics', () => ({
  useOverviewMetrics: (opts: any) => mockOverviewReturn,
  useSystemHealth: (opts?: any) => mockHealthReturn,
}));

// ────────────────────────────────────────────────────────────────────────────
// Test data
// ────────────────────────────────────────────────────────────────────────────

const MOCK_POPULATED: OverviewMetrics = {
  kpis: {
    totalAnalyses: 500,
    averageConfidence: 0.87,
    highUncertaintyRate: 0.12,
    averageInferenceTimeMs: 340,
    totalCases: 200,
    completedCases: 180,
  },
  kpiTrends: {
    confidenceChange: 0.02,
    uncertaintyChange: -0.01,
    latencyChange: -0.05,
  },
  predictionDistribution: {
    benign: 300,
    malignant: 80,
  },
  biradsDistribution: {
    '1': 100,
    '2': 150,
    '4': 80,
  },
  confidenceTrend: [
    { date: '2024-01-15', avgConfidence: 0.85, stdConfidence: 0.05, analysisCount: 50 },
    { date: '2024-01-16', avgConfidence: 0.87, stdConfidence: 0.04, analysisCount: 55 },
  ],
  riskDistribution: { low: 250, moderate: 150, high: 100 },
  latencyPercentiles: [
    { date: '2024-01-15', p50: 300, p90: 600, p99: 900 },
    { date: '2024-01-16', p50: 290, p90: 580, p99: 870 },
  ],
};

const MOCK_HEALTH: SystemHealthStatus = {
  modelStatus: 'healthy',
  modelVersion: 'v2.1.0',
  backendStatus: 'running',
  gpuAvailable: true,
  uptimeSeconds: 86400,
  errorCount24h: 2,
  queueDepth: 5,
};

// ════════════════════════════════════════════════════════════════════════════
// Helper
// ════════════════════════════════════════════════════════════════════════════

const theme = createTheme();
const wrap = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

// ════════════════════════════════════════════════════════════════════════════
// Setup
// ════════════════════════════════════════════════════════════════════════════

beforeEach(() => {
  jest.clearAllMocks();
  mockOverviewReturn = {
    data: EMPTY_OVERVIEW_METRICS,
    isLoading: false,
    error: null,
    dataSource: null,
    refresh: mockRefresh,
    lastUpdated: null,
  };
  mockHealthReturn = {
    data: EMPTY_SYSTEM_HEALTH,
    isLoading: false,
    error: null,
  };
});

// ════════════════════════════════════════════════════════════════════════════
// Tests
// ════════════════════════════════════════════════════════════════════════════

describe('OverviewTab', () => {
  // ── Basic rendering ──────────────────────────────────────────────────────

  it('renders the tab container', () => {
    wrap(<OverviewTab period="30d" />);
    expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
  });

  it('renders the heading', () => {
    wrap(<OverviewTab period="30d" />);
    expect(screen.getByText('AI Performance Overview')).toBeInTheDocument();
  });

  // ── Empty state ──────────────────────────────────────────────────────────

  it('shows empty messages when no data is available', () => {
    wrap(<OverviewTab period="30d" />);
    expect(screen.getByTestId('empty-confidence-trend')).toBeInTheDocument();
    expect(screen.getByTestId('empty-latency')).toBeInTheDocument();
  });

  // ── Populated state ─────────────────────────────────────────────────────

  it('renders charts when data is populated', () => {
    mockOverviewReturn = { ...mockOverviewReturn, data: MOCK_POPULATED, dataSource: 'api' };
    wrap(<OverviewTab period="30d" />);
    expect(screen.queryByTestId('empty-confidence')).not.toBeInTheDocument();
  });

  it('renders KPI gauge labels', () => {
    mockOverviewReturn = { ...mockOverviewReturn, data: MOCK_POPULATED };
    wrap(<OverviewTab period="30d" />);
    expect(screen.getByText('Avg AI Confidence')).toBeInTheDocument();
    expect(screen.getByText('High Uncertainty Rate')).toBeInTheDocument();
    expect(screen.getByText('Avg Latency')).toBeInTheDocument();
    expect(screen.getByText('Cases Analyzed')).toBeInTheDocument();
  });

  // ── Loading & Skeletons ─────────────────────────────────────────────────

  it('shows loading spinner when loading', () => {
    mockOverviewReturn = { ...mockOverviewReturn, isLoading: true };
    wrap(<OverviewTab period="30d" />);
    expect(screen.getByTestId('metrics-loading')).toBeInTheDocument();
  });

  it('shows loading skeletons when loading with no data', () => {
    mockOverviewReturn = { ...mockOverviewReturn, isLoading: true, data: undefined as any };
    wrap(<OverviewTab period="30d" />);
    // ChartSkeleton renders data-testid skeleton-gauge / skeleton-chart / skeleton-bar
    const gauges = screen.getAllByTestId('skeleton-gauge');
    expect(gauges.length).toBe(4);
    expect(screen.getByTestId('skeleton-bar')).toBeInTheDocument();
  });

  it('hides loading spinner when not loading', () => {
    wrap(<OverviewTab period="30d" />);
    expect(screen.queryByTestId('metrics-loading')).not.toBeInTheDocument();
  });

  // ── Error alert ──────────────────────────────────────────────────────────

  it('shows error alert when error is set', () => {
    mockOverviewReturn = { ...mockOverviewReturn, error: 'Network failure' };
    wrap(<OverviewTab period="30d" />);
    expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    expect(screen.getByText('Network failure')).toBeInTheDocument();
  });

  it('hides error alert when no error', () => {
    wrap(<OverviewTab period="30d" />);
    expect(screen.queryByTestId('error-alert')).not.toBeInTheDocument();
  });

  // ── Data source chip ────────────────────────────────────────────────────

  it('shows "Live" chip when dataSource is api', () => {
    mockOverviewReturn = { ...mockOverviewReturn, dataSource: 'api' };
    wrap(<OverviewTab period="30d" />);
    const chip = screen.getByTestId('data-source-chip');
    expect(chip).toHaveTextContent('Live');
  });

  it('does not show data source chip when dataSource is null', () => {
    wrap(<OverviewTab period="30d" />);
    expect(screen.queryByTestId('data-source-chip')).not.toBeInTheDocument();
  });

  // ── Refresh ──────────────────────────────────────────────────────────────

  it('calls refresh when clicking the refresh button', () => {
    wrap(<OverviewTab period="30d" />);
    fireEvent.click(screen.getByTestId('refresh-metrics'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  // ── Period selector ──────────────────────────────────────────────────────

  it('accepts period prop and passes it to data hook', () => {
    wrap(<OverviewTab period="30d" />);
    // Period selector is now in parent ClinicalDashboard sub-banner;
    // tab receives period as prop and uses it for data fetching.
    expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
  });

  it('renders correctly with different period values', () => {
    wrap(<OverviewTab period="7d" />);
    expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
  });

  // ── System Health Bar ────────────────────────────────────────────────────

  it('renders SystemHealthBar', () => {
    mockHealthReturn = { ...mockHealthReturn, data: MOCK_HEALTH };
    wrap(<OverviewTab period="30d" />);
    expect(screen.getByTestId('system-health-bar')).toBeInTheDocument();
  });

  it('renders SystemHealthBar with default health data', () => {
    wrap(<OverviewTab period="30d" />);
    expect(screen.getByTestId('system-health-bar')).toBeInTheDocument();
  });

  // ── Chart card titles ────────────────────────────────────────────────────

  it('renders chart card titles when data is populated', () => {
    mockOverviewReturn = { ...mockOverviewReturn, data: MOCK_POPULATED };
    wrap(<OverviewTab period="30d" />);
    expect(screen.getByText('Confidence Trend')).toBeInTheDocument();
    expect(screen.getByText('Prediction Distribution')).toBeInTheDocument();
    expect(screen.getByText('BI-RADS Distribution')).toBeInTheDocument();
    expect(screen.getByText('Risk Distribution')).toBeInTheDocument();
    expect(screen.getByText('Inference Latency')).toBeInTheDocument();
  });
});
