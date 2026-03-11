/**
 * PredictionDonut + BiRadsBarChart — Unit Tests (TDD)
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PredictionDonut from '../PredictionDonut';
import BiRadsBarChart from '../BiRadsBarChart';

// Mock recharts
jest.mock('recharts', () => {
  const React = require('react');
  const Pass = (props: any) =>
    React.createElement('div', { 'data-testid': props['data-testid'] || `chart-${props.dataKey || 'el'}` }, props.children);
  return {
    __esModule: true,
    ResponsiveContainer: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'responsive-container' }, children),
    PieChart: (props: any) => React.createElement('div', { 'data-testid': 'pie-chart' }, props.children),
    Pie: (props: any) => React.createElement('div', { 'data-testid': 'pie', 'data-length': props.data?.length ?? 0 }, props.children),
    Cell: () => React.createElement('div'),
    BarChart: (props: any) => React.createElement('div', { 'data-testid': 'bar-chart', 'data-length': props.data?.length ?? 0 }, props.children),
    Bar: (props: any) => React.createElement('div', { 'data-testid': `bar-${props.dataKey}` }),
    XAxis: () => React.createElement('div', { 'data-testid': 'x-axis' }),
    YAxis: () => React.createElement('div', { 'data-testid': 'y-axis' }),
    CartesianGrid: () => React.createElement('div'),
    Tooltip: () => React.createElement('div', { 'data-testid': 'tooltip' }),
    Label: () => React.createElement('div'),
  };
});

const theme = createTheme();
const wrap = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

// ═══════════════════════════════════════════════════════════════════════════
// PredictionDonut
// ═══════════════════════════════════════════════════════════════════════════

describe('PredictionDonut', () => {
  it('renders the pie chart with benign and malignant data', () => {
    wrap(<PredictionDonut benign={65} malignant={35} />);
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie')).toBeInTheDocument();
  });

  it('shows percentage labels', () => {
    wrap(<PredictionDonut benign={65} malignant={35} />);
    const matches = screen.getAllByText(/65%/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('shows benign / malignant legend text', () => {
    wrap(<PredictionDonut benign={80} malignant={20} />);
    expect(screen.getAllByText(/benign/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/malignant/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when both are 0', () => {
    wrap(<PredictionDonut benign={0} malignant={0} />);
    expect(screen.getByText(/no prediction/i)).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BiRadsBarChart
// ═══════════════════════════════════════════════════════════════════════════

describe('BiRadsBarChart', () => {
  const sampleData = { '1': 20, '2': 45, '3': 30, '4': 15, '5': 5 };

  it('renders the bar chart', () => {
    wrap(<BiRadsBarChart distribution={sampleData} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('passes correct number of data entries', () => {
    wrap(<BiRadsBarChart distribution={sampleData} />);
    expect(screen.getByTestId('bar-chart').getAttribute('data-length')).toBe('5');
  });

  it('renders axes', () => {
    wrap(<BiRadsBarChart distribution={sampleData} />);
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
  });

  it('shows empty state when distribution is empty', () => {
    wrap(<BiRadsBarChart distribution={{}} />);
    expect(screen.getByText(/no bi-rads/i)).toBeInTheDocument();
  });
});
