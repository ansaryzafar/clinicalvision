/**
 * Model Intelligence Charts — Unit Tests (TDD)
 *
 * Tests for UncertaintyDecompositionChart, ModelVersionComparison,
 * HumanReviewRateChart, and ReviewTriggersPie.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import UncertaintyDecompositionChart from '../UncertaintyDecompositionChart';
import ModelVersionComparison from '../ModelVersionComparison';
import HumanReviewRateChart from '../HumanReviewRateChart';
import ReviewTriggersPie from '../ReviewTriggersPie';
import type {
  UncertaintyDecompositionPoint,
  ModelVersionStats,
  HumanReviewRatePoint,
  ReviewTrigger,
} from '../../../../types/metrics.types';

// Mock recharts
jest.mock('recharts', () => {
  const React = require('react');
  return {
    __esModule: true,
    ResponsiveContainer: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'responsive-container' }, children),
    AreaChart: (props: any) =>
      React.createElement('div', { 'data-testid': 'area-chart', 'data-length': props.data?.length ?? 0 }, props.children),
    Area: (props: any) => React.createElement('div', { 'data-testid': `area-${props.dataKey}` }),
    BarChart: (props: any) =>
      React.createElement('div', { 'data-testid': 'bar-chart', 'data-length': props.data?.length ?? 0 }, props.children),
    Bar: (props: any) => React.createElement('div', { 'data-testid': `bar-${props.dataKey || props.name || 'default'}` }),
    PieChart: (props: any) =>
      React.createElement('div', { 'data-testid': 'pie-chart' }, props.children),
    Pie: (props: any) =>
      React.createElement('div', { 'data-testid': 'pie', 'data-length': props.data?.length ?? 0 }, props.children),
    Cell: () => React.createElement('div'),
    XAxis: () => React.createElement('div', { 'data-testid': 'x-axis' }),
    YAxis: () => React.createElement('div', { 'data-testid': 'y-axis' }),
    CartesianGrid: () => React.createElement('div'),
    Tooltip: () => React.createElement('div', { 'data-testid': 'tooltip' }),
    Legend: () => React.createElement('div', { 'data-testid': 'legend' }),
    ReferenceLine: (props: any) =>
      React.createElement('div', { 'data-testid': 'reference-line' }),
  };
});

const theme = createTheme();
const wrap = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

// ═══════════════════════════════════════════════════════════════════════════
// UncertaintyDecompositionChart
// ═══════════════════════════════════════════════════════════════════════════

describe('UncertaintyDecompositionChart', () => {
  const sampleData: UncertaintyDecompositionPoint[] = [
    { date: '2026-03-01', epistemic: 0.08, aleatoric: 0.05, total: 0.13 },
    { date: '2026-03-02', epistemic: 0.07, aleatoric: 0.06, total: 0.13 },
    { date: '2026-03-03', epistemic: 0.09, aleatoric: 0.04, total: 0.13 },
  ];

  it('renders the area chart', () => {
    wrap(<UncertaintyDecompositionChart data={sampleData} />);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('renders epistemic and aleatoric areas', () => {
    wrap(<UncertaintyDecompositionChart data={sampleData} />);
    expect(screen.getByTestId('area-epistemic')).toBeInTheDocument();
    expect(screen.getByTestId('area-aleatoric')).toBeInTheDocument();
  });

  it('passes correct data length', () => {
    wrap(<UncertaintyDecompositionChart data={sampleData} />);
    expect(screen.getByTestId('area-chart').getAttribute('data-length')).toBe('3');
  });

  it('shows empty state when data is empty', () => {
    wrap(<UncertaintyDecompositionChart data={[]} />);
    expect(screen.getByText(/no uncertainty decomposition/i)).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ModelVersionComparison
// ═══════════════════════════════════════════════════════════════════════════

describe('ModelVersionComparison', () => {
  const sampleData: ModelVersionStats[] = [
    { version: 'v2.0', accuracy: 0.92, avgConfidence: 0.85, avgLatencyMs: 300, totalPredictions: 400, aucRoc: 0.96 },
    { version: 'v2.1', accuracy: 0.94, avgConfidence: 0.87, avgLatencyMs: 280, totalPredictions: 250, aucRoc: 0.978 },
  ];

  it('renders the bar chart', () => {
    wrap(<ModelVersionComparison data={sampleData} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('passes correct data length', () => {
    wrap(<ModelVersionComparison data={sampleData} />);
    expect(screen.getByTestId('bar-chart').getAttribute('data-length')).toBe('2');
  });

  it('shows empty state when data is empty', () => {
    wrap(<ModelVersionComparison data={[]} />);
    expect(screen.getByText(/no model version data/i)).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HumanReviewRateChart
// ═══════════════════════════════════════════════════════════════════════════

describe('HumanReviewRateChart', () => {
  const sampleData: HumanReviewRatePoint[] = [
    { date: '2026-03-01', reviewRate: 0.12, totalCases: 40, reviewedCases: 5 },
    { date: '2026-03-02', reviewRate: 0.15, totalCases: 45, reviewedCases: 7 },
    { date: '2026-03-03', reviewRate: 0.10, totalCases: 50, reviewedCases: 5 },
  ];

  it('renders the area chart', () => {
    wrap(<HumanReviewRateChart data={sampleData} />);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('renders a threshold reference line', () => {
    wrap(<HumanReviewRateChart data={sampleData} />);
    expect(screen.getByTestId('reference-line')).toBeInTheDocument();
  });

  it('renders the review rate area', () => {
    wrap(<HumanReviewRateChart data={sampleData} />);
    expect(screen.getByTestId('area-reviewRate')).toBeInTheDocument();
  });

  it('shows empty state when data is empty', () => {
    wrap(<HumanReviewRateChart data={[]} />);
    expect(screen.getByText(/no human review rate/i)).toBeInTheDocument();
  });

  it('accepts a custom threshold prop', () => {
    wrap(<HumanReviewRateChart data={sampleData} threshold={0.25} />);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ReviewTriggersPie
// ═══════════════════════════════════════════════════════════════════════════

describe('ReviewTriggersPie', () => {
  const sampleData: ReviewTrigger[] = [
    { trigger: 'High Epistemic Uncertainty', count: 25, percentage: 42.5 },
    { trigger: 'Low Confidence', count: 15, percentage: 25.4 },
    { trigger: 'Borderline Confidence', count: 10, percentage: 17.0 },
    { trigger: 'High Aleatoric Uncertainty', count: 9, percentage: 15.1 },
  ];

  it('renders the bar chart', () => {
    wrap(<ReviewTriggersPie data={sampleData} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders trigger names', () => {
    wrap(<ReviewTriggersPie data={sampleData} />);
    // The bar chart should render with data
    expect(screen.getByTestId('bar-chart').getAttribute('data-length')).toBe('4');
  });

  it('renders bar for count data', () => {
    wrap(<ReviewTriggersPie data={sampleData} />);
    expect(screen.getByTestId('bar-count')).toBeInTheDocument();
  });

  it('shows empty state when data is empty', () => {
    wrap(<ReviewTriggersPie data={[]} />);
    expect(screen.getByText(/no review trigger data/i)).toBeInTheDocument();
  });
});
