/**
 * GaugeCard — Unit Tests (TDD)
 *
 * @jest-environment jsdom
 *
 * GaugeCard displays a single KPI as a radial gauge (recharts RadialBarChart).
 * Tests verify:
 *  - Label, formatted value, and unit render
 *  - Trend indicator renders with correct direction/colour
 *  - Gauge SVG renders (ResponsiveContainer → RadialBarChart)
 *  - Edge cases: zero value, missing trend, maxValue boundary
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import GaugeCard from '../GaugeCard';

// recharts needs a non-zero container size; mock ResponsiveContainer
// We mock only the specific import to avoid recharts circular-dependency issues
jest.mock('recharts', () => {
  const React = require('react');
  const Passthrough = ({ children, ...rest }: any) =>
    React.createElement('div', { 'data-testid': 'chart-element', ...rest }, children);
  return {
    __esModule: true,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'responsive-container', style: { width: 200, height: 160 } }, children),
    RadialBarChart: Passthrough,
    RadialBar: Passthrough,
    PolarAngleAxis: Passthrough,
  };
});

const theme = createTheme();

const wrap = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

// ═══════════════════════════════════════════════════════════════════════════
// 1. Basic rendering
// ═══════════════════════════════════════════════════════════════════════════

describe('GaugeCard', () => {
  it('renders the label text', () => {
    wrap(
      <GaugeCard label="Avg Confidence" value={87} maxValue={100} unit="%" color="#00C9EA" />,
    );
    expect(screen.getByText('Avg Confidence')).toBeInTheDocument();
  });

  it('renders the formatted value with unit', () => {
    wrap(
      <GaugeCard label="Latency" value={312} maxValue={1000} unit="ms" color="#00C9EA" />,
    );
    expect(screen.getByText('312ms')).toBeInTheDocument();
  });

  it('renders the radial chart container', () => {
    wrap(
      <GaugeCard label="L" value={50} maxValue={100} unit="%" color="#00C9EA" />,
    );
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 2. Trend indicator
  // ═════════════════════════════════════════════════════════════════════════

  it('renders trend up indicator', () => {
    wrap(
      <GaugeCard label="L" value={87} maxValue={100} unit="%" color="#00C9EA" trend={2.3} />,
    );
    expect(screen.getByText(/↑.*2\.3/)).toBeInTheDocument();
  });

  it('renders trend down indicator', () => {
    wrap(
      <GaugeCard label="L" value={87} maxValue={100} unit="%" color="#00C9EA" trend={-1.5} />,
    );
    expect(screen.getByText(/↓.*1\.5/)).toBeInTheDocument();
  });

  it('does not render trend when omitted', () => {
    wrap(
      <GaugeCard label="L" value={87} maxValue={100} unit="%" color="#00C9EA" />,
    );
    expect(screen.queryByText(/[↑↓]/)).not.toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 3. Edge cases
  // ═════════════════════════════════════════════════════════════════════════

  it('renders with value 0', () => {
    wrap(
      <GaugeCard label="Cases Today" value={0} maxValue={100} unit="" color="#00C9EA" />,
    );
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('handles value equal to maxValue', () => {
    wrap(
      <GaugeCard label="Acc" value={100} maxValue={100} unit="%" color="#22C55E" />,
    );
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('handles fractional values', () => {
    wrap(
      <GaugeCard label="AUC" value={0.978} maxValue={1} unit="" color="#00C9EA" />,
    );
    expect(screen.getByText('0.978')).toBeInTheDocument();
  });

  it('renders zero trend without arrow', () => {
    wrap(
      <GaugeCard label="L" value={50} maxValue={100} unit="%" color="#00C9EA" trend={0} />,
    );
    // zero trend should show the value but direction is flat
    expect(screen.getByText(/—.*0/)).toBeInTheDocument();
  });
});
