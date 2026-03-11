/**
 * RiskDistributionChart + LatencyPercentilesChart — Unit Tests (TDD)
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import RiskDistributionChart from '../RiskDistributionChart';
import LatencyPercentilesChart from '../LatencyPercentilesChart';
import type { LatencyPercentilePoint } from '../../../../types/metrics.types';

// Mock recharts
jest.mock('recharts', () => {
  const React = require('react');
  return {
    __esModule: true,
    ResponsiveContainer: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'responsive-container' }, children),
    BarChart: (props: any) =>
      React.createElement('div', { 'data-testid': 'bar-chart', 'data-length': props.data?.length ?? 0 }, props.children),
    Bar: (props: any) => React.createElement('div', { 'data-testid': `bar-${props.dataKey}` }),
    LineChart: (props: any) =>
      React.createElement('div', { 'data-testid': 'line-chart', 'data-length': props.data?.length ?? 0 }, props.children),
    Line: (props: any) => React.createElement('div', { 'data-testid': `line-${props.dataKey}` }),
    XAxis: () => React.createElement('div', { 'data-testid': 'x-axis' }),
    YAxis: () => React.createElement('div', { 'data-testid': 'y-axis' }),
    CartesianGrid: () => React.createElement('div'),
    Tooltip: () => React.createElement('div', { 'data-testid': 'tooltip' }),
    ReferenceLine: () => React.createElement('div', { 'data-testid': 'reference-line' }),
    Cell: () => React.createElement('div'),
    Legend: () => React.createElement('div', { 'data-testid': 'legend' }),
  };
});

const theme = createTheme();
const wrap = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

// ═══════════════════════════════════════════════════════════════════════════
// RiskDistributionChart
// ═══════════════════════════════════════════════════════════════════════════

describe('RiskDistributionChart', () => {
  it('renders the bar chart with risk data', () => {
    wrap(<RiskDistributionChart low={60} moderate={25} high={15} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('passes 3 data entries for low/moderate/high', () => {
    wrap(<RiskDistributionChart low={60} moderate={25} high={15} />);
    expect(screen.getByTestId('bar-chart').getAttribute('data-length')).toBe('3');
  });

  it('shows empty state when all are 0', () => {
    wrap(<RiskDistributionChart low={0} moderate={0} high={0} />);
    expect(screen.getByText(/no risk data/i)).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// LatencyPercentilesChart
// ═══════════════════════════════════════════════════════════════════════════

describe('LatencyPercentilesChart', () => {
  const sampleData: LatencyPercentilePoint[] = [
    { date: '2026-03-01', p50: 200, p90: 400, p99: 800 },
    { date: '2026-03-02', p50: 220, p90: 380, p99: 750 },
    { date: '2026-03-03', p50: 190, p90: 420, p99: 900 },
  ];

  it('renders the line chart', () => {
    wrap(<LatencyPercentilesChart data={sampleData} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders p50, p90, p99 lines', () => {
    wrap(<LatencyPercentilesChart data={sampleData} />);
    expect(screen.getByTestId('line-p50')).toBeInTheDocument();
    expect(screen.getByTestId('line-p90')).toBeInTheDocument();
    expect(screen.getByTestId('line-p99')).toBeInTheDocument();
  });

  it('shows empty state when data is empty', () => {
    wrap(<LatencyPercentilesChart data={[]} />);
    expect(screen.getByText(/no latency data/i)).toBeInTheDocument();
  });
});
