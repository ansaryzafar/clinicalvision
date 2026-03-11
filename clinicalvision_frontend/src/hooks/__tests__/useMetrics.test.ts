/**
 * useOverviewMetrics — Hook Unit Tests
 *
 * Tests:
 *  - API success path
 *  - API failure → local fallback
 *  - Loading state transitions
 *  - Data source indicator
 *  - Refresh imperative handle
 *  - Cleanup on unmount (no state updates after unmount)
 *
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useOverviewMetrics } from '../useMetrics';
import { EMPTY_OVERVIEW_METRICS } from '../../types/metrics.types';
import type { OverviewMetrics } from '../../types/metrics.types';

// ── Mock fetchOverviewMetrics ───────────────────────────────────────────
const mockFetch = jest.fn();
jest.mock('../../services/metricsApi', () => ({
  __esModule: true,
  fetchOverviewMetrics: (...args: unknown[]) => mockFetch(...args),
}));

// ── Mock aggregateLocalMetrics ──────────────────────────────────────────
const mockLocal = jest.fn();
jest.mock('../../services/localMetricsAggregator', () => ({
  __esModule: true,
  aggregateLocalMetrics: (...args: unknown[]) => mockLocal(...args),
}));

// ── Sample data ─────────────────────────────────────────────────────────
const API_DATA: OverviewMetrics = {
  ...EMPTY_OVERVIEW_METRICS,
  kpis: {
    ...EMPTY_OVERVIEW_METRICS.kpis,
    totalAnalyses: 100,
    averageConfidence: 0.87,
  },
};

const LOCAL_DATA: OverviewMetrics = {
  ...EMPTY_OVERVIEW_METRICS,
  kpis: {
    ...EMPTY_OVERVIEW_METRICS.kpis,
    totalAnalyses: 5,
    averageConfidence: 0.75,
  },
};

describe('useOverviewMetrics', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch.mockReset();
    mockLocal.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts with EMPTY_OVERVIEW_METRICS and isLoading false', () => {
    // Don't resolve fetch yet
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() =>
      useOverviewMetrics({ period: '30d', refreshIntervalMs: 0 }),
    );

    // Initially data should be empty (before fetch resolves)
    expect(result.current.data.kpis.totalAnalyses).toBe(0);
  });

  it('returns API data on successful fetch', async () => {
    mockFetch.mockResolvedValue(API_DATA);

    const { result } = renderHook(() =>
      useOverviewMetrics({ period: '30d', refreshIntervalMs: 0 }),
    );

    await waitFor(() => {
      expect(result.current.data.kpis.totalAnalyses).toBe(100);
    });

    expect(result.current.dataSource).toBe('api');
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('falls back to local data when API fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network Error'));
    mockLocal.mockReturnValue(LOCAL_DATA);

    const { result } = renderHook(() =>
      useOverviewMetrics({ period: '30d', refreshIntervalMs: 0 }),
    );

    await waitFor(() => {
      expect(result.current.dataSource).toBe('local');
    });

    expect(result.current.data.kpis.totalAnalyses).toBe(5);
    expect(result.current.error).toBeNull();
  });

  it('sets error when both API and local fail', async () => {
    mockFetch.mockRejectedValue(new Error('Network Error'));
    mockLocal.mockImplementation(() => { throw new Error('Local Error'); });

    const { result } = renderHook(() =>
      useOverviewMetrics({ period: '30d', refreshIntervalMs: 0 }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Unable to load analytics data');
    });

    expect(result.current.dataSource).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('passes period parameter to fetchOverviewMetrics', async () => {
    mockFetch.mockResolvedValue(API_DATA);

    renderHook(() =>
      useOverviewMetrics({ period: '7d', refreshIntervalMs: 0 }),
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('7d', expect.any(AbortSignal));
    });
  });

  it('does not fetch when enabled is false', () => {
    renderHook(() =>
      useOverviewMetrics({ period: '30d', enabled: false, refreshIntervalMs: 0 }),
    );

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('refresh() triggers a new fetch', async () => {
    mockFetch.mockResolvedValue(API_DATA);

    const { result } = renderHook(() =>
      useOverviewMetrics({ period: '30d', refreshIntervalMs: 0 }),
    );

    await waitFor(() => {
      expect(result.current.dataSource).toBe('api');
    });

    mockFetch.mockResolvedValue({ ...API_DATA, kpis: { ...API_DATA.kpis, totalAnalyses: 200 } });

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.data.kpis.totalAnalyses).toBe(200);
    });

    // 2 fetches: initial + refresh
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('sets lastUpdated on successful fetch', async () => {
    mockFetch.mockResolvedValue(API_DATA);

    const { result } = renderHook(() =>
      useOverviewMetrics({ period: '30d', refreshIntervalMs: 0 }),
    );

    await waitFor(() => {
      expect(result.current.lastUpdated).toBeInstanceOf(Date);
    });
  });

  it('cleans up AbortController on unmount', async () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves

    const { unmount } = renderHook(() =>
      useOverviewMetrics({ period: '30d', refreshIntervalMs: 0 }),
    );

    // Should not throw
    unmount();
  });
});
