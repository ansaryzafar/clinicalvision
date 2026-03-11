/**
 * Performance Charts — Unit Tests (TDD)
 *
 * Tests for ConfidenceHistogram, UncertaintyScatter,
 * TemporalConfidenceChart, and ConcordanceChart.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ConfidenceHistogram from '../ConfidenceHistogram';
import UncertaintyScatter from '../UncertaintyScatter';
import TemporalConfidenceChart from '../TemporalConfidenceChart';
import ConcordanceChart from '../ConcordanceChart';
import type {
  ConfidenceBin,
  UncertaintyScatterPoint,
  TemporalConfidencePoint,
  ConcordanceEntry,
} from '../../../../types/metrics.types';

// Mock recharts
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
  };
});

const theme = createTheme();
const wrap = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

// ═══════════════════════════════════════════════════════════════════════════
// ConfidenceHistogram
// ═══════════════════════════════════════════════════════════════════════════

describe('ConfidenceHistogram', () => {
  const sampleBins: ConfidenceBin[] = [
    { binStart: 0.0, binEnd: 0.1, count: 5, label: '0–10%' },
    { binStart: 0.1, binEnd: 0.2, count: 8, label: '10–20%' },
    { binStart: 0.2, binEnd: 0.3, count: 3, label: '20–30%' },
    { binStart: 0.8, binEnd: 0.9, count: 25, label: '80–90%' },
    { binStart: 0.9, binEnd: 1.0, count: 42, label: '90–100%' },
  ];

  it('renders the bar chart with histogram data', () => {
    wrap(<ConfidenceHistogram data={sampleBins} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('passes correct data length', () => {
    wrap(<ConfidenceHistogram data={sampleBins} />);
    expect(screen.getByTestId('bar-chart').getAttribute('data-length')).toBe('5');
  });

  it('shows empty state when data is empty', () => {
    wrap(<ConfidenceHistogram data={[]} />);
    expect(screen.getByText(/no confidence distribution/i)).toBeInTheDocument();
  });

  it('shows empty state when data is undefined', () => {
    wrap(<ConfidenceHistogram data={undefined as any} />);
    expect(screen.getByText(/no confidence distribution/i)).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UncertaintyScatter
// ═══════════════════════════════════════════════════════════════════════════

describe('UncertaintyScatter', () => {
  const samplePoints: UncertaintyScatterPoint[] = [
    { confidence: 0.9, uncertainty: 0.05, riskLevel: 'low', processingTimeMs: 250 },
    { confidence: 0.5, uncertainty: 0.35, riskLevel: 'high', processingTimeMs: 450 },
    { confidence: 0.7, uncertainty: 0.15, riskLevel: 'moderate', processingTimeMs: 320 },
  ];

  it('renders the scatter chart', () => {
    wrap(<UncertaintyScatter data={samplePoints} />);
    expect(screen.getByTestId('scatter-chart')).toBeInTheDocument();
  });

  it('renders risk-grouped scatter series', () => {
    wrap(<UncertaintyScatter data={samplePoints} />);
    expect(screen.getByTestId('scatter-low-risk')).toBeInTheDocument();
    expect(screen.getByTestId('scatter-moderate-risk')).toBeInTheDocument();
    expect(screen.getByTestId('scatter-high-risk')).toBeInTheDocument();
  });

  it('renders reference lines for thresholds', () => {
    wrap(<UncertaintyScatter data={samplePoints} />);
    const refLines = screen.getAllByTestId('reference-line');
    expect(refLines.length).toBeGreaterThanOrEqual(2);
  });

  it('shows empty state when data is empty', () => {
    wrap(<UncertaintyScatter data={[]} />);
    expect(screen.getByText(/no uncertainty data/i)).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TemporalConfidenceChart
// ═══════════════════════════════════════════════════════════════════════════

describe('TemporalConfidenceChart', () => {
  const sampleData: TemporalConfidencePoint[] = [
    {
      date: '2026-03-01',
      avgConfidence: 0.87,
      avgEpistemicUncertainty: 0.08,
      avgAleatoricUncertainty: 0.05,
      highUncertaintyCount: 2,
      analysisCount: 20,
    },
    {
      date: '2026-03-02',
      avgConfidence: 0.89,
      avgEpistemicUncertainty: 0.07,
      avgAleatoricUncertainty: 0.04,
      highUncertaintyCount: 1,
      analysisCount: 25,
    },
  ];

  it('renders the composed chart', () => {
    wrap(<TemporalConfidenceChart data={sampleData} />);
    expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
  });

  it('renders confidence area', () => {
    wrap(<TemporalConfidenceChart data={sampleData} />);
    expect(screen.getByTestId('area-avgConfidence')).toBeInTheDocument();
  });

  it('renders uncertainty lines', () => {
    wrap(<TemporalConfidenceChart data={sampleData} />);
    expect(screen.getByTestId('line-avgEpistemicUncertainty')).toBeInTheDocument();
    expect(screen.getByTestId('line-avgAleatoricUncertainty')).toBeInTheDocument();
  });

  it('renders flagged-cases bar', () => {
    wrap(<TemporalConfidenceChart data={sampleData} />);
    expect(screen.getByTestId('bar-highUncertaintyCount')).toBeInTheDocument();
  });

  it('shows empty state when data is empty', () => {
    wrap(<TemporalConfidenceChart data={[]} />);
    expect(screen.getByText(/no temporal data/i)).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ConcordanceChart
// ═══════════════════════════════════════════════════════════════════════════

describe('ConcordanceChart', () => {
  const sampleData: ConcordanceEntry[] = [
    { category: 'Benign', aiCount: 80, radiologistCount: 75, agreementRate: 0.93 },
    { category: 'Malignant', aiCount: 40, radiologistCount: 38, agreementRate: 0.89 },
  ];

  it('renders the bar chart', () => {
    wrap(<ConcordanceChart data={sampleData} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('passes correct data length', () => {
    wrap(<ConcordanceChart data={sampleData} />);
    expect(screen.getByTestId('bar-chart').getAttribute('data-length')).toBe('2');
  });

  it('renders AI and radiologist bar series', () => {
    wrap(<ConcordanceChart data={sampleData} />);
    expect(screen.getByTestId('bar-aiCount')).toBeInTheDocument();
    expect(screen.getByTestId('bar-radiologistCount')).toBeInTheDocument();
    expect(screen.getByTestId('bar-agreementPct')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    wrap(<ConcordanceChart data={[]} />);
    expect(screen.getByText(/no concordance data/i)).toBeInTheDocument();
  });
});
