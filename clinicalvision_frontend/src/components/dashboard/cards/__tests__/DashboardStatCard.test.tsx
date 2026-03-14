/**
 * DashboardStatCard — Unit Tests (TDD)
 *
 * Tests for the shared, reusable stat card component that provides
 * uniform gradient + shadow styling across all dashboard pages.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Assignment } from '@mui/icons-material';

import DashboardStatCard from '../DashboardStatCard';

const theme = createTheme();
const wrap = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('DashboardStatCard', () => {
  // ── Rendering ──────────────────────────────────────────────────────────

  it('renders value and label', () => {
    wrap(
      <DashboardStatCard
        value="42"
        label="Total Cases"
        color="#00C9EA"
        icon={<Assignment data-testid="icon" />}
      />,
    );
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Total Cases')).toBeInTheDocument();
  });

  it('renders the icon', () => {
    wrap(
      <DashboardStatCard
        value="5"
        label="In Progress"
        color="#F59E0B"
        icon={<Assignment data-testid="stat-icon" />}
      />,
    );
    expect(screen.getByTestId('stat-icon')).toBeInTheDocument();
  });

  it('renders optional subtitle/change text', () => {
    wrap(
      <DashboardStatCard
        value="10"
        label="Completed"
        color="#22C55E"
        icon={<Assignment />}
        subtitle="+3 this month"
      />,
    );
    expect(screen.getByText('+3 this month')).toBeInTheDocument();
  });

  it('renders trend indicator when provided', () => {
    wrap(
      <DashboardStatCard
        value="7"
        label="High Priority"
        color="#EF4444"
        icon={<Assignment />}
        trend="up"
      />,
    );
    expect(screen.getByText('↑')).toBeInTheDocument();
  });

  it('renders down trend', () => {
    wrap(
      <DashboardStatCard
        value="0"
        label="Errors"
        color="#22C55E"
        icon={<Assignment />}
        trend="down"
      />,
    );
    expect(screen.getByText('↓')).toBeInTheDocument();
  });

  it('renders neutral trend as dash', () => {
    wrap(
      <DashboardStatCard
        value="3"
        label="Pending"
        color="#F59E0B"
        icon={<Assignment />}
        trend="neutral"
      />,
    );
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('has no trend chip when trend prop is omitted', () => {
    const { container } = wrap(
      <DashboardStatCard
        value="12"
        label="Misc"
        color="#00C9EA"
        icon={<Assignment />}
      />,
    );
    expect(container.querySelector('[class*="MuiChip"]')).toBeNull();
  });

  // ── Uniform sizing ─────────────────────────────────────────────────────

  it('applies height:100% on root card for uniform row height', () => {
    const { container } = wrap(
      <DashboardStatCard
        value="1"
        label="Test"
        color="#00C9EA"
        icon={<Assignment />}
      />,
    );
    const card = container.firstChild as HTMLElement;
    // The Card should have height 100%
    expect(card).toHaveStyle({ height: '100%' });
  });

  // ── Clickable variant ─────────────────────────────────────────────────

  it('fires onClick when provided', () => {
    const fn = jest.fn();
    wrap(
      <DashboardStatCard
        value="5"
        label="Click me"
        color="#00C9EA"
        icon={<Assignment />}
        onClick={fn}
      />,
    );
    screen.getByText('5').closest('[class*="MuiCard"]')!.click();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('has cursor pointer when onClick is provided', () => {
    const { container } = wrap(
      <DashboardStatCard
        value="5"
        label="Click"
        color="#00C9EA"
        icon={<Assignment />}
        onClick={() => {}}
      />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveStyle({ cursor: 'pointer' });
  });

  it('has default cursor when no onClick', () => {
    const { container } = wrap(
      <DashboardStatCard
        value="5"
        label="No click"
        color="#00C9EA"
        icon={<Assignment />}
      />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card).not.toHaveStyle({ cursor: 'pointer' });
  });
});
