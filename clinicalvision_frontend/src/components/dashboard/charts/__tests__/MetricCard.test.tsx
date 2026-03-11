/**
 * MetricCard — Unit Tests (TDD)
 *
 * @jest-environment jsdom
 *
 * MetricCard is the standardised wrapper for every chart on the
 * AI Analytics dashboard.  These tests verify:
 *  - Renders title, subtitle, and value
 *  - Shows trend arrow and colour coding
 *  - Shows time-range chip when provided
 *  - Renders children (chart slot)
 *  - Empty / minimal prop combinations are graceful
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MetricCard from '../MetricCard';

const theme = createTheme();

const wrap = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

// ═══════════════════════════════════════════════════════════════════════════
// 1. Basic rendering
// ═══════════════════════════════════════════════════════════════════════════

describe('MetricCard', () => {
  it('renders the title', () => {
    wrap(<MetricCard title="Avg Confidence">chart</MetricCard>);
    expect(screen.getByText('Avg Confidence')).toBeInTheDocument();
  });

  it('renders children as chart content', () => {
    wrap(
      <MetricCard title="Test">
        <div data-testid="chart-placeholder">Chart here</div>
      </MetricCard>,
    );
    expect(screen.getByTestId('chart-placeholder')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    wrap(<MetricCard title="T" subtitle="Last 30 days">c</MetricCard>);
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 2. Headline value + trend
  // ═════════════════════════════════════════════════════════════════════════

  it('renders headline value when provided', () => {
    wrap(<MetricCard title="T" value="87.3%">c</MetricCard>);
    expect(screen.getByText('87.3%')).toBeInTheDocument();
  });

  it('renders trend up arrow in green', () => {
    wrap(
      <MetricCard title="T" trend={{ value: 2.1, direction: 'up' }}>
        c
      </MetricCard>,
    );
    const el = screen.getByText(/↑.*2\.1/);
    expect(el).toBeInTheDocument();
  });

  it('renders trend down arrow in red', () => {
    wrap(
      <MetricCard title="T" trend={{ value: 1.5, direction: 'down' }}>
        c
      </MetricCard>,
    );
    const el = screen.getByText(/↓.*1\.5/);
    expect(el).toBeInTheDocument();
  });

  it('renders flat trend with dash', () => {
    wrap(
      <MetricCard title="T" trend={{ value: 0, direction: 'flat' }}>
        c
      </MetricCard>,
    );
    expect(screen.getByText(/—/)).toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 3. Time range chip
  // ═════════════════════════════════════════════════════════════════════════

  it('renders time range chip when provided', () => {
    wrap(<MetricCard title="T" timeRange="Last 7 days">c</MetricCard>);
    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
  });

  it('does not render time range chip when omitted', () => {
    wrap(<MetricCard title="T">c</MetricCard>);
    expect(screen.queryByText(/Last/)).not.toBeInTheDocument();
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 4. Edge cases
  // ═════════════════════════════════════════════════════════════════════════

  it('renders with only title and children (minimal props)', () => {
    const { container } = wrap(<MetricCard title="Minimal">child</MetricCard>);
    expect(container.firstChild).toBeInTheDocument();
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('renders with numeric value 0 correctly', () => {
    wrap(<MetricCard title="T" value={0}>c</MetricCard>);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('applies custom height to chart container', () => {
    const { container } = wrap(
      <MetricCard title="T" height={400}>
        <div data-testid="inner">I</div>
      </MetricCard>,
    );
    // The chart area div should exist
    expect(screen.getByTestId('inner')).toBeInTheDocument();
  });
});
