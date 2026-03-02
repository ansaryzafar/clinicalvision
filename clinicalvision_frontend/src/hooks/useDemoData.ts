/**
 * useDemoData — React hook for loading demo data
 *
 * Wraps DemoDataService to provide React-friendly loading/error states.
 * Auto-loads the manifest on mount (configurable via autoLoad option).
 *
 * Usage:
 *   const { cases, isLoading, error, isAvailable, loadCaseInfo } = useDemoData();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DemoDataService,
  DemoCaseSummary,
  DemoCaseInfo,
} from '../services/demoDataService';

// ============================================================================
// Types
// ============================================================================

export interface UseDemoDataOptions {
  /** Whether to auto-load the manifest on mount. Defaults to true. */
  autoLoad?: boolean;
}

export interface UseDemoDataResult {
  /** List of available demo case summaries */
  cases: DemoCaseSummary[];
  /** Whether the manifest is currently loading */
  isLoading: boolean;
  /** Error message if loading failed, null otherwise */
  error: string | null;
  /** Whether demo data is available (manifest loaded successfully) */
  isAvailable: boolean;
  /** Load detailed info for a specific case. Returns null on error. */
  loadCaseInfo: (caseId: string) => Promise<DemoCaseInfo | null>;
}

// ============================================================================
// Hook
// ============================================================================

export function useDemoData(options?: UseDemoDataOptions): UseDemoDataResult {
  const { autoLoad = true } = options ?? {};

  const [cases, setCases] = useState<DemoCaseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  // Stable service reference across renders
  const serviceRef = useRef(new DemoDataService());

  useEffect(() => {
    if (!autoLoad) return;

    let cancelled = false;

    const loadManifest = async () => {
      try {
        const manifest = await serviceRef.current.getManifest();
        if (!cancelled) {
          setCases(manifest.cases);
          setIsAvailable(true);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load demo data');
          setCases([]);
          setIsAvailable(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadManifest();

    return () => {
      cancelled = true;
    };
  }, [autoLoad]);

  const loadCaseInfo = useCallback(async (caseId: string): Promise<DemoCaseInfo | null> => {
    try {
      return await serviceRef.current.getCaseInfo(caseId);
    } catch {
      return null;
    }
  }, []);

  return {
    cases,
    isLoading,
    error,
    isAvailable,
    loadCaseInfo,
  };
}
