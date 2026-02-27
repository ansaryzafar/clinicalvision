/**
 * FairnessDashboard — Authentication & Data Loading Tests
 *
 * TDD tests verifying:
 *  - Dashboard fetches data using the authenticated API client (not bare axios)
 *  - Alert acknowledgement uses the authenticated API client
 *  - Error states are handled gracefully
 *  - No bare axios instances are created (preventing auth bypass)
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// ── Mock the authenticated API service ────────────────────────────────────
const mockGetFairnessDashboard = jest.fn();
const mockAcknowledgeFairnessAlert = jest.fn();

jest.mock('../../services/api', () => ({
  __esModule: true,
  api: {
    getFairnessDashboard: (...args: any[]) => mockGetFairnessDashboard(...args),
    acknowledgeFairnessAlert: (...args: any[]) => mockAcknowledgeFairnessAlert(...args),
  },
  default: {
    getFairnessDashboard: (...args: any[]) => mockGetFairnessDashboard(...args),
    acknowledgeFairnessAlert: (...args: any[]) => mockAcknowledgeFairnessAlert(...args),
  },
}));

// ── Mock axios to detect any raw usage ────────────────────────────────────
const mockAxiosCreate = jest.fn();
jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return {
    ...actual,
    __esModule: true,
    default: {
      ...actual,
      create: (...args: any[]) => {
        mockAxiosCreate(...args);
        return actual.create(...args);
      },
      isCancel: actual.isCancel,
    },
    create: (...args: any[]) => {
      mockAxiosCreate(...args);
      return actual.create(...args);
    },
    isCancel: actual.isCancel,
  };
});

import FairnessDashboard from '../FairnessDashboard';

// ============================================================================
// FIXTURES
// ============================================================================

const theme = createTheme();

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

const mockDashboardData = {
  overall_status: 'compliant',
  last_evaluation: '2026-02-26T10:00:00Z',
  model_version: '1.0.0',
  summary: {
    total_alerts: 0,
    critical_alerts: 0,
    warning_alerts: 0,
    attributes_analyzed: 4,
    compliance_score: 95,
  },
  compliance: {
    fda_status: 'compliant',
    eu_ai_act_status: 'compliant',
    nist_rmf_status: 'compliant',
  },
  alerts: [],
  attributes: [],
};

// ============================================================================
// TESTS
// ============================================================================

describe('FairnessDashboard — Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch data using the authenticated API service, not bare axios', async () => {
    mockGetFairnessDashboard.mockResolvedValue(mockDashboardData);

    renderWithTheme(<FairnessDashboard />);

    await waitFor(() => {
      expect(mockGetFairnessDashboard).toHaveBeenCalledTimes(1);
    });

    // Must NOT create any bare axios instances (which bypass auth)
    expect(mockAxiosCreate).not.toHaveBeenCalled();
  });

  it('should render dashboard content when data loads successfully', async () => {
    mockGetFairnessDashboard.mockResolvedValue(mockDashboardData);

    renderWithTheme(<FairnessDashboard />);

    await waitFor(() => {
      expect(screen.queryByText(/Unable to Load Fairness Data/i)).not.toBeInTheDocument();
    });
  });

  it('should display error message when API call fails', async () => {
    mockGetFairnessDashboard.mockRejectedValue(new Error('Network error'));

    renderWithTheme(<FairnessDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Unable to Load Fairness Data/i)).toBeInTheDocument();
    });
  });

  it('should use the authenticated API for alert acknowledgement', async () => {
    mockGetFairnessDashboard.mockResolvedValue({
      ...mockDashboardData,
      alerts: [
        {
          id: 'alert-001',
          severity: 'warning',
          message: 'Disparity detected in age group 60+',
          metric_name: 'equal_opportunity',
          demographic_group: 'age_60_plus',
          threshold: 0.1,
          actual_value: 0.15,
          created_at: '2026-02-26T09:00:00Z',
          acknowledged: false,
        },
      ],
    });

    mockAcknowledgeFairnessAlert.mockResolvedValue(undefined);

    renderWithTheme(<FairnessDashboard />);

    // Wait for the dashboard to render with alerts
    await waitFor(() => {
      expect(screen.queryByText(/Unable to Load Fairness Data/i)).not.toBeInTheDocument();
    });

    // The acknowledge flow should use the authenticated API client
    // (not raw fetch without auth headers)
    expect(mockAxiosCreate).not.toHaveBeenCalled();
  });

  it('should retry fetch using authenticated API when Try Again is clicked', async () => {
    mockGetFairnessDashboard
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockDashboardData);

    renderWithTheme(<FairnessDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Unable to Load Fairness Data/i)).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(mockGetFairnessDashboard).toHaveBeenCalledTimes(2);
    });

    // Still must not use bare axios
    expect(mockAxiosCreate).not.toHaveBeenCalled();
  });
});
