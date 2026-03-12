/**
 * New Chart Components — Unit Tests (TDD)
 *
 * Tests for the five new chart components:
 *  - CalibrationCurve
 *  - EntropyHistogram
 *  - SystemHealthBar
 *  - ChartSkeleton
 *  - ErrorAlert
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import CalibrationCurve from '../CalibrationCurve';
import EntropyHistogram from '../EntropyHistogram';
import SystemHealthBar from '../SystemHealthBar';
import ChartSkeleton from '../ChartSkeleton';
import ErrorAlert from '../ErrorAlert';

import type {
  CalibrationPoint,
  EntropyBin,
  SystemHealthStatus,
} from '../../../../types/metrics.types';
import { EMPTY_SYSTEM_HEALTH } from '../../../../types/metrics.types';

// ────────────────────────────────────────────────────────────────────────────
// Mock recharts
// ────────────────────────────────────────────────────────────────────────────

jest.mock('recharts', () => {
  const React = require('react');
  return {
    __esModule: true,
    ResponsiveContainer: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'responsive-container' }, children),
    LineChart: (props: any) =>
      React.createElement('div', {
        'data-testid': 'line-chart',
        'data-length': props.data?.length ?? 0,
        role: props.role,
        'aria-label': props['aria-label'],
      }, props.children),
    BarChart: (props: any) =>
      React.createElement('div', {
        'data-testid': 'bar-chart',
        'data-length': props.data?.length ?? 0,
        role: props.role,
        'aria-label': props['aria-label'],
      }, props.children),
    Line: (props: any) => React.createElement('div', { 'data-testid': `line-${props.dataKey}` }),
    Bar: (props: any) => React.createElement('div', { 'data-testid': `bar-${props.dataKey || 'default'}` }),
    XAxis: () => React.createElement('div', { 'data-testid': 'x-axis' }),
    YAxis: () => React.createElement('div', { 'data-testid': 'y-axis' }),
    CartesianGrid: () => React.createElement('div'),
    Tooltip: () => React.createElement('div', { 'data-testid': 'tooltip' }),
    ReferenceLine: () => React.createElement('div', { 'data-testid': 'reference-line' }),
    Cell: () => React.createElement('div'),
  };
});

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const theme = createTheme();
const wrap = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

// ────────────────────────────────────────────────────────────────────────────
// Test data
// ────────────────────────────────────────────────────────────────────────────

const CALIBRATION_DATA: CalibrationPoint[] = [
  { binStart: 0.0, binEnd: 0.1, predictedProbability: 0.05, observedFrequency: 0.03, count: 20 },
  { binStart: 0.5, binEnd: 0.6, predictedProbability: 0.55, observedFrequency: 0.52, count: 30 },
  { binStart: 0.9, binEnd: 1.0, predictedProbability: 0.95, observedFrequency: 0.93, count: 45 },
];

const ENTROPY_DATA: EntropyBin[] = [
  { binStart: 0.0, binEnd: 0.2, count: 100, label: '0.0–0.2' },
  { binStart: 0.2, binEnd: 0.4, count: 60, label: '0.2–0.4' },
  { binStart: 0.6, binEnd: 0.8, count: 25, label: '0.6–0.8' },
];

const HEALTHY_STATUS: SystemHealthStatus = {
  modelStatus: 'healthy',
  modelVersion: 'v2.1.0',
  backendStatus: 'healthy',
  gpuAvailable: true,
  uptimeSeconds: 86400,
  errorCount24h: 0,
  queueDepth: 3,
};

const DEGRADED_STATUS: SystemHealthStatus = {
  modelStatus: 'degraded',
  modelVersion: 'v2.0.0',
  backendStatus: 'healthy',
  gpuAvailable: false,
  uptimeSeconds: 3661,
  errorCount24h: 15,
  queueDepth: 50,
};

// ════════════════════════════════════════════════════════════════════════════
// CalibrationCurve
// ════════════════════════════════════════════════════════════════════════════

describe('CalibrationCurve', () => {
  it('shows empty state when no data', () => {
    wrap(<CalibrationCurve data={[]} />);
    expect(screen.getByText(/no calibration data/i)).toBeInTheDocument();
  });

  it('renders line chart when data is provided', () => {
    wrap(<CalibrationCurve data={CALIBRATION_DATA} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toHaveAttribute('data-length', '3');
  });

  it('includes a reference line for perfect calibration', () => {
    wrap(<CalibrationCurve data={CALIBRATION_DATA} />);
    expect(screen.getByTestId('reference-line')).toBeInTheDocument();
  });

  it('has ARIA attributes for accessibility', () => {
    wrap(<CalibrationCurve data={CALIBRATION_DATA} />);
    const chart = screen.getByTestId('line-chart');
    expect(chart).toHaveAttribute('role', 'img');
    expect(chart).toHaveAttribute('aria-label', expect.stringContaining('alibration'));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// EntropyHistogram
// ════════════════════════════════════════════════════════════════════════════

describe('EntropyHistogram', () => {
  it('shows empty state when no data', () => {
    wrap(<EntropyHistogram data={[]} />);
    expect(screen.getByText(/no entropy distribution/i)).toBeInTheDocument();
  });

  it('renders bar chart when data is provided', () => {
    wrap(<EntropyHistogram data={ENTROPY_DATA} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-length', '3');
  });

  it('has ARIA attributes for accessibility', () => {
    wrap(<EntropyHistogram data={ENTROPY_DATA} />);
    const chart = screen.getByTestId('bar-chart');
    expect(chart).toHaveAttribute('role', 'img');
    expect(chart).toHaveAttribute('aria-label', expect.stringContaining('ntropy'));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SystemHealthBar
// ════════════════════════════════════════════════════════════════════════════

describe('SystemHealthBar', () => {
  it('renders the container with correct data-testid', () => {
    wrap(<SystemHealthBar health={HEALTHY_STATUS} />);
    expect(screen.getByTestId('system-health-bar')).toBeInTheDocument();
  });

  it('has ARIA role="status"', () => {
    wrap(<SystemHealthBar health={HEALTHY_STATUS} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders model status chip for healthy', () => {
    wrap(<SystemHealthBar health={HEALTHY_STATUS} />);
    const chip = screen.getByTestId('model-status-chip');
    expect(chip).toHaveTextContent('Model: Healthy');
  });

  it('renders model status chip for degraded', () => {
    wrap(<SystemHealthBar health={DEGRADED_STATUS} />);
    const chip = screen.getByTestId('model-status-chip');
    expect(chip).toHaveTextContent('Model: Degraded');
  });

  it('renders backend status chip', () => {
    wrap(<SystemHealthBar health={HEALTHY_STATUS} />);
    expect(screen.getByTestId('backend-status-chip')).toHaveTextContent('API: Healthy');
  });

  it('renders GPU chip when GPU available', () => {
    wrap(<SystemHealthBar health={HEALTHY_STATUS} />);
    expect(screen.getByTestId('gpu-chip')).toHaveTextContent('GPU');
  });

  it('renders CPU chip when GPU not available', () => {
    wrap(<SystemHealthBar health={DEGRADED_STATUS} />);
    expect(screen.getByTestId('gpu-chip')).toHaveTextContent('CPU');
  });

  it('displays uptime value', () => {
    wrap(<SystemHealthBar health={HEALTHY_STATUS} />);
    expect(screen.getByTestId('uptime-value')).toHaveTextContent('1.0d');
  });

  it('displays error count', () => {
    wrap(<SystemHealthBar health={DEGRADED_STATUS} />);
    expect(screen.getByTestId('error-count')).toHaveTextContent('15 err');
  });

  it('displays queue depth', () => {
    wrap(<SystemHealthBar health={HEALTHY_STATUS} />);
    expect(screen.getByTestId('queue-depth')).toHaveTextContent('3 queued');
  });

  it('formats uptime correctly for hours', () => {
    wrap(<SystemHealthBar health={DEGRADED_STATUS} />);
    // 3661 seconds = ~1.0h
    expect(screen.getByTestId('uptime-value')).toHaveTextContent('1.0h');
  });

  it('renders with empty/default health data', () => {
    wrap(<SystemHealthBar health={EMPTY_SYSTEM_HEALTH} />);
    expect(screen.getByTestId('system-health-bar')).toBeInTheDocument();
    expect(screen.getByTestId('model-status-chip')).toHaveTextContent('Model: Unknown');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ChartSkeleton
// ════════════════════════════════════════════════════════════════════════════

describe('ChartSkeleton', () => {
  it('renders gauge skeleton', () => {
    wrap(<ChartSkeleton variant="gauge" />);
    expect(screen.getByTestId('skeleton-gauge')).toBeInTheDocument();
  });

  it('renders chart skeleton by default', () => {
    wrap(<ChartSkeleton />);
    expect(screen.getByTestId('skeleton-chart')).toBeInTheDocument();
  });

  it('renders chart skeleton with explicit variant', () => {
    wrap(<ChartSkeleton variant="chart" />);
    expect(screen.getByTestId('skeleton-chart')).toBeInTheDocument();
  });

  it('renders bar skeleton', () => {
    wrap(<ChartSkeleton variant="bar" />);
    expect(screen.getByTestId('skeleton-bar')).toBeInTheDocument();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ErrorAlert
// ════════════════════════════════════════════════════════════════════════════

describe('ErrorAlert', () => {
  it('renders with correct data-testid', () => {
    wrap(<ErrorAlert message="Something went wrong" />);
    expect(screen.getByTestId('error-alert')).toBeInTheDocument();
  });

  it('displays the error message', () => {
    wrap(<ErrorAlert message="Connection timeout" />);
    expect(screen.getByText('Connection timeout')).toBeInTheDocument();
  });

  it('displays the title', () => {
    wrap(<ErrorAlert message="Test error" />);
    expect(screen.getByText('Data Loading Error')).toBeInTheDocument();
  });

  it('has ARIA role="alert"', () => {
    wrap(<ErrorAlert message="Test error" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders retry button when onRetry is provided', () => {
    const onRetry = jest.fn();
    wrap(<ErrorAlert message="Error" onRetry={onRetry} />);
    const btn = screen.getByTestId('error-retry');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not render retry button when onRetry is not provided', () => {
    wrap(<ErrorAlert message="Error" />);
    expect(screen.queryByTestId('error-retry')).not.toBeInTheDocument();
  });
});
