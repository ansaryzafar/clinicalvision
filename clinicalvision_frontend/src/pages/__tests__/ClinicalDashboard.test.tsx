/**
 * ClinicalDashboard — Tabbed Layout Integration Tests (TDD)
 *
 * @jest-environment jsdom
 *
 * Verifies:
 *  - Dashboard renders with tab bar (Clinical Overview + AI Analytics)
 *  - Default tab is "Clinical Overview" (existing content preserved)
 *  - Clicking "AI Analytics" shows the OverviewTab component
 *  - Existing stat cards still render in Clinical Overview tab
 *  - Tab switching does not crash or lose data
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ────────────────────────────────────────────────────────────────

// Mock useAuth
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'doctor@test.com' },
    isAuthenticated: true,
  }),
}));

// Mock useLegacyWorkflow
jest.mock('../../workflow-v3', () => ({
  useLegacyWorkflow: () => ({
    loadSession: jest.fn(),
  }),
}));

// Mock clinicalSessionService
jest.mock('../../services/clinicalSession.service', () => ({
  __esModule: true,
  clinicalSessionService: {
    getAllSessions: jest.fn().mockReturnValue([]),
  },
}));

// Mock localMetricsAggregator (used by OverviewTab)
jest.mock('../../services/localMetricsAggregator', () => ({
  __esModule: true,
  aggregateLocalMetrics: jest.fn().mockReturnValue({
    kpis: {
      totalAnalyses: 0,
      averageConfidence: 0,
      averageInferenceTimeMs: 0,
      highUncertaintyRate: 0,
      totalCases: 0,
      completedCases: 0,
    },
    kpiTrends: { confidenceChange: 0, latencyChange: 0, uncertaintyChange: 0 },
    confidenceTrend: [],
    predictionDistribution: { benign: 0, malignant: 0 },
    riskDistribution: { low: 0, moderate: 0, high: 0 },
    biradsDistribution: {},
    latencyPercentiles: [],
  }),
}));

// Mock recharts ResponsiveContainer (zero-size container issue in jsdom)
jest.mock('recharts', () => {
  const React = require('react');
  const P = ({ children, ...rest }: any) =>
    React.createElement('div', { 'data-testid': 'chart', ...rest }, children);
  return {
    __esModule: true,
    ResponsiveContainer: ({ children }: any) =>
      React.createElement('div', { style: { width: 200, height: 160 } }, children),
    RadialBarChart: P,
    RadialBar: P,
    PolarAngleAxis: P,
  };
});

// Mock fetch (for /health/ endpoint)
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        status: 'healthy',
        model_loaded: true,
        model_version: 'v2.1',
      }),
  }),
) as jest.Mock;

import ClinicalDashboard from '../ClinicalDashboard';

const theme = createTheme();

const renderDashboard = () =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <ClinicalDashboard />
      </MemoryRouter>
    </ThemeProvider>,
  );

// ═══════════════════════════════════════════════════════════════════════════

describe('ClinicalDashboard — Tabbed Layout', () => {
  // ─────────────────────────────────────────────────────────────────────
  // 1. Tab bar renders
  // ─────────────────────────────────────────────────────────────────────

  it('renders tab bar with Clinical Overview and AI Analytics tabs', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /clinical overview/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /ai analytics/i })).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // 2. Default tab shows existing content
  // ─────────────────────────────────────────────────────────────────────

  it('defaults to Clinical Overview tab showing existing stat cards', async () => {
    renderDashboard();
    await waitFor(() => {
      // The existing stat card labels
      expect(screen.getByText('Total Cases')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('High Priority')).toBeInTheDocument();
    });
  });

  it('defaults to showing Quick Actions on Clinical Overview tab', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // 3. Tab switching
  // ─────────────────────────────────────────────────────────────────────

  it('switches to AI Analytics tab and shows the overview metrics', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /ai analytics/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('tab', { name: /ai analytics/i }));

    await waitFor(() => {
      expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      expect(screen.getByText('AI Performance Overview')).toBeInTheDocument();
    });
  });

  it('hides existing stat cards when AI Analytics tab is active', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /ai analytics/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('tab', { name: /ai analytics/i }));

    await waitFor(() => {
      // Existing content should be hidden (not in DOM)
      expect(screen.queryByText('Quick Actions')).not.toBeInTheDocument();
    });
  });

  it('can switch back to Clinical Overview and see original content', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /ai analytics/i })).toBeInTheDocument();
    });

    // Switch to AI Analytics
    fireEvent.click(screen.getByRole('tab', { name: /ai analytics/i }));
    await waitFor(() => {
      expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
    });

    // Switch back
    fireEvent.click(screen.getByRole('tab', { name: /clinical overview/i }));
    await waitFor(() => {
      expect(screen.getByText('Total Cases')).toBeInTheDocument();
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // 4. Page header preserved
  // ─────────────────────────────────────────────────────────────────────

  it('page header with greeting remains visible regardless of tab', async () => {
    renderDashboard();
    await waitFor(() => {
      // The greeting should always be visible
      expect(screen.getByText(/Good (morning|afternoon|evening)/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('tab', { name: /ai analytics/i }));
    await waitFor(() => {
      expect(screen.getByText(/Good (morning|afternoon|evening)/i)).toBeInTheDocument();
    });
  });
});
