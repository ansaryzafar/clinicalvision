/**
 * useMetrics — Custom React Hook for Dashboard Metrics
 *
 * Provides auto-refreshing analytics data with graceful fallback:
 *
 *  1. Tries the backend API (`fetchOverviewMetrics`).
 *  2. On failure, falls back to the local aggregator
 *     (`aggregateLocalMetrics`) so the dashboard is never empty.
 *
 * Features:
 *  - AbortController cancellation on unmount / period change
 *  - Configurable auto-refresh interval (default 5 min)
 *  - `enabled` flag to pause fetching when the tab is inactive
 *  - `refresh()` imperative handle for manual refresh
 *  - `dataSource` indicator ('api' | 'local' | null)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchOverviewMetrics,
  fetchPerformanceMetrics,
  fetchModelIntelligenceMetrics,
} from '../services/metricsApi';
import { aggregateLocalMetrics } from '../services/localMetricsAggregator';
import {
  EMPTY_OVERVIEW_METRICS,
  EMPTY_PERFORMANCE_METRICS,
  EMPTY_MODEL_INTELLIGENCE_METRICS,
} from '../types/metrics.types';
import type {
  MetricsPeriod,
  OverviewMetrics,
  PerformanceMetrics,
  ModelIntelligenceMetrics,
} from '../types/metrics.types';

// ────────────────────────────────────────────────────────────────────────────
// Public types
// ────────────────────────────────────────────────────────────────────────────

export interface UseOverviewMetricsOptions {
  /** Time window. Default '30d'. */
  period?: MetricsPeriod;
  /** Auto-refresh interval in ms. 0 = disabled. Default 300 000 (5 min). */
  refreshIntervalMs?: number;
  /** Set false to pause fetching (e.g. tab not visible). Default true. */
  enabled?: boolean;
}

export type MetricsDataSource = 'api' | 'local' | null;

export interface UseOverviewMetricsReturn {
  /** The metrics data (never null — falls back to EMPTY_OVERVIEW_METRICS). */
  data: OverviewMetrics;
  /** True while the initial or refresh fetch is in-flight. */
  isLoading: boolean;
  /** Human-readable error string, or null. */
  error: string | null;
  /** Where the current data came from. */
  dataSource: MetricsDataSource;
  /** Trigger an immediate refresh. */
  refresh: () => void;
  /** Timestamp of last successful data load. */
  lastUpdated: Date | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Default configuration
// ────────────────────────────────────────────────────────────────────────────

const DEFAULT_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

// ────────────────────────────────────────────────────────────────────────────
// Hook implementation
// ────────────────────────────────────────────────────────────────────────────

export function useOverviewMetrics(
  options?: UseOverviewMetricsOptions,
): UseOverviewMetricsReturn {
  const {
    period = '30d',
    refreshIntervalMs = DEFAULT_REFRESH_MS,
    enabled = true,
  } = options ?? {};

  const [data, setData] = useState<OverviewMetrics>(EMPTY_OVERVIEW_METRICS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<MetricsDataSource>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Ref to track whether the component is still mounted
  const mountedRef = useRef(true);
  // Ref for the current AbortController
  const abortRef = useRef<AbortController | null>(null);

  // ── Core fetch logic ──────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);

    try {
      // Attempt backend API first
      const metrics = await fetchOverviewMetrics(period, controller.signal);
      if (!mountedRef.current) return;

      setData(metrics);
      setDataSource('api');
      setError(null);
      setLastUpdated(new Date());
    } catch (apiError: unknown) {
      // If request was aborted, bail silently
      if (controller.signal.aborted) return;
      if (!mountedRef.current) return;

      // Fallback to local aggregation
      try {
        const localMetrics = aggregateLocalMetrics(period);
        setData(localMetrics);
        setDataSource('local');
        setError(null);
        setLastUpdated(new Date());
      } catch {
        // Both sources failed — keep existing data, set error
        if (mountedRef.current) {
          setError('Unable to load analytics data');
          setDataSource(null);
        }
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [period]);

  // ── Imperative refresh ────────────────────────────────────────────────
  const refresh = useCallback(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled, fetchData]);

  // ── Effect: initial load + period change ──────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    fetchData();

    // Cleanup on unmount or period change
    return () => {
      abortRef.current?.abort();
    };
  }, [enabled, fetchData]);

  // ── Effect: auto-refresh interval ─────────────────────────────────────
  useEffect(() => {
    if (!enabled || refreshIntervalMs <= 0) return;

    const intervalId = setInterval(() => {
      fetchData();
    }, refreshIntervalMs);

    return () => clearInterval(intervalId);
  }, [enabled, refreshIntervalMs, fetchData]);

  // ── Effect: cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  return { data, isLoading, error, dataSource, refresh, lastUpdated };
}


// ════════════════════════════════════════════════════════════════════════════
// Generic metrics hook factory — DRY pattern for Performance & Intelligence
// ════════════════════════════════════════════════════════════════════════════

interface UseGenericMetricsOptions {
  period?: MetricsPeriod;
  refreshIntervalMs?: number;
  enabled?: boolean;
}

interface UseGenericMetricsReturn<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
  dataSource: MetricsDataSource;
  refresh: () => void;
  lastUpdated: Date | null;
}

/**
 * Internal factory: creates a metrics hook for any tab type.
 * Follows the same API-first pattern as useOverviewMetrics.
 * No local fallback for Performance / Intelligence tabs (API only).
 */
function useGenericMetrics<T>(
  fetcher: (period: MetricsPeriod, signal: AbortSignal) => Promise<T>,
  emptyDefault: T,
  options?: UseGenericMetricsOptions,
): UseGenericMetricsReturn<T> {
  const {
    period = '30d',
    refreshIntervalMs = DEFAULT_REFRESH_MS,
    enabled = true,
  } = options ?? {};

  const [data, setData] = useState<T>(emptyDefault);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<MetricsDataSource>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);

    try {
      const metrics = await fetcher(period, controller.signal);
      if (!mountedRef.current) return;

      setData(metrics);
      setDataSource('api');
      setError(null);
      setLastUpdated(new Date());
    } catch (apiError: unknown) {
      if (controller.signal.aborted) return;
      if (!mountedRef.current) return;

      setError('Unable to load analytics data');
      setDataSource(null);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [period, fetcher]);

  const refresh = useCallback(() => {
    if (enabled) fetchData();
  }, [enabled, fetchData]);

  useEffect(() => {
    if (!enabled) return;
    fetchData();
    return () => { abortRef.current?.abort(); };
  }, [enabled, fetchData]);

  useEffect(() => {
    if (!enabled || refreshIntervalMs <= 0) return;
    const id = setInterval(fetchData, refreshIntervalMs);
    return () => clearInterval(id);
  }, [enabled, refreshIntervalMs, fetchData]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  return { data, isLoading, error, dataSource, refresh, lastUpdated };
}


// ════════════════════════════════════════════════════════════════════════════
// Performance Deep Dive hook (Tab 2)
// ════════════════════════════════════════════════════════════════════════════

export function usePerformanceMetrics(
  options?: UseGenericMetricsOptions,
): UseGenericMetricsReturn<PerformanceMetrics> {
  return useGenericMetrics<PerformanceMetrics>(
    fetchPerformanceMetrics,
    EMPTY_PERFORMANCE_METRICS,
    options,
  );
}


// ════════════════════════════════════════════════════════════════════════════
// Model Intelligence hook (Tab 3)
// ════════════════════════════════════════════════════════════════════════════

export function useModelIntelligenceMetrics(
  options?: UseGenericMetricsOptions,
): UseGenericMetricsReturn<ModelIntelligenceMetrics> {
  return useGenericMetrics<ModelIntelligenceMetrics>(
    fetchModelIntelligenceMetrics,
    EMPTY_MODEL_INTELLIGENCE_METRICS,
    options,
  );
}
