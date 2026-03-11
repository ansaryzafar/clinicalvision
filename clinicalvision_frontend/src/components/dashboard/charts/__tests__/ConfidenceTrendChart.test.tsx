/**
 * ConfidenceTrendChart — Unit Tests (TDD)
 *
 * @jest-environment jsdom
 *
 * Tests:
 *  - Renders an SVG area chart when data is provided
 *  - Shows empty state when data is empty
 *  - Displays axes and tooltip
 *  - Handles single data point gracefully
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ConfidenceTrendChart from '../ConfidenceTrendChart';
import type { ConfidenceTrendPoint } from '../../../../types/metrics.types';

// Mock recharts — jsdom has no layout engine, so ResponsiveContainer
// cannot measure container dimensions.  We swap it for a simple div.
jest.mock('recharts', () => {
  const React = require('react');
  const Pass = (props: any) => React.createElement('div', { 'data-testid': props['data-testid'] || 'chart-el' }, props.children);
  return {
    __esModule: true,
    ResponsiveContainer: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'responsive-container', style: { width: 600, height: 300 } }, children),
    AreaChart: (props: any) => React.createElement('div', { 'data-testid': 'area-chart', 'data-length': props.data?.length ?? 0 }, props.children),
    Area: (props: any) => React.createElement('div', { 'data-testid': `area-${props.dataKey}` }),
    XAxis: (props: any) => React.createElement('div', { 'data-testid': 'x-axis' }),
    YAxis: (props: any) => React.createElement('div', { 'data-testid': 'y-axis' }),
    CartesianGrid: () => React.createElement('div', { 'data-testid': 'grid' }),
    Tooltip: () => React.createElement('div', { 'data-testid': 'tooltip' }),
    Brush: () => React.createElement('div', { 'data-testid': 'brush' }),
  };
});

const theme = createTheme();
const wrap = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

// ── Test data ────────────────────────────────────────────────────────────

const sampleData: ConfidenceTrendPoint[] = [
  { date: '2026-03-01', avgConfidence: 0.85, stdConfidence: 0.08, analysisCount: 12 },
  { date: '2026-03-02', avgConfidence: 0.87, stdConfidence: 0.06, analysisCount: 15 },
  { date: '2026-03-03', avgConfidence: 0.82, stdConfidence: 0.10, analysisCount: 8 },
  { date: '2026-03-04', avgConfidence: 0.90, stdConfidence: 0.05, analysisCount: 20 },
];

// ═══════════════════════════════════════════════════════════════════════════

describe('ConfidenceTrendChart', () => {
  it('renders the area chart with data', () => {
    wrap(<ConfidenceTrendChart data={sampleData} />);
    const chart = screen.getByTestId('area-chart');
    expect(chart).toBeInTheDocument();
    expect(chart.getAttribute('data-length')).toBe('4');
  });

  it('renders confidence area series', () => {
    wrap(<ConfidenceTrendChart data={sampleData} />);
    expect(screen.getByTestId('area-avgConfidence')).toBeInTheDocument();
  });

  it('renders axes', () => {
    wrap(<ConfidenceTrendChart data={sampleData} />);
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
  });

  it('renders tooltip', () => {
    wrap(<ConfidenceTrendChart data={sampleData} />);
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });

  it('shows empty message when data is empty', () => {
    wrap(<ConfidenceTrendChart data={[]} />);
    expect(screen.getByText(/no trend data/i)).toBeInTheDocument();
  });

  it('handles a single data point', () => {
    const single: ConfidenceTrendPoint[] = [
      { date: '2026-03-01', avgConfidence: 0.88, stdConfidence: 0.05, analysisCount: 3 },
    ];
    wrap(<ConfidenceTrendChart data={single} />);
    const chart = screen.getByTestId('area-chart');
    expect(chart.getAttribute('data-length')).toBe('1');
  });
});
