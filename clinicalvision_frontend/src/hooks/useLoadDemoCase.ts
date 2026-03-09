/**
 * useLoadDemoCase — React hook for loading a demo case into the workflow.
 *
 * Orchestrates the full flow:
 *  1. Fetch case info JSON from demo data service
 *  2. Map demo data → PatientInfo + ClinicalHistory via demoDataMapper
 *  3. Create case in ClinicalCaseContext (auto-populates forms)
 *  4. Advance workflow to IMAGE_UPLOAD step
 *  5. Fetch demo PNG images from public/demo-data/
 *  6. Create MammogramImage objects and add to the case
 *
 * Usage:
 *   const { loadDemoCase, isLoading, error } = useLoadDemoCase();
 *   await loadDemoCase('DEMO-001');
 */

import { useState, useCallback, useRef } from 'react';
import { DemoDataService } from '../services/demoDataService';
import { useClinicalCase } from '../contexts/ClinicalCaseContext';
import {
  mapDemoCaseToCreateCaseInput,
  mapDemoImagesToUploadSpec,
} from '../utils/demoDataMapper';
import { createMammogramImage } from '../utils/imageUploadOperations';
import { addImage as persistImageBlob } from '../services/imageStorageService';

// ============================================================================
// Types
// ============================================================================

export interface UseLoadDemoCaseResult {
  /** Load a demo case by caseId. Returns true on success, false on error. */
  loadDemoCase: (caseId: string) => Promise<boolean>;
  /** Whether a demo case is currently being loaded */
  isLoading: boolean;
  /** Error message if loading failed, null otherwise */
  error: string | null;
}

// ============================================================================
// Hook
// ============================================================================

export function useLoadDemoCase(): UseLoadDemoCaseResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createCase, advanceWorkflow, addImage } = useClinicalCase();

  // Stable service reference
  const serviceRef = useRef(new DemoDataService());

  const loadDemoCase = useCallback(
    async (caseId: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        // ── Step 1: Fetch manifest + case info ──────────────────────
        const manifest = await serviceRef.current.getManifest();
        const caseInfo = await serviceRef.current.getCaseInfo(caseId);

        // Resolve case directory from manifest
        const caseSummary = manifest.cases.find((c) => c.id === caseId);
        if (!caseSummary) {
          throw new Error(`Demo case "${caseId}" not found in manifest`);
        }

        // Extract directory name from path (e.g., "/demo-data/case-1-normal/" → "case-1-normal")
        const caseDir = caseSummary.path
          .replace(/^\/demo-data\//, '')
          .replace(/\/$/, '');

        // ── Step 2: Map demo data to workflow types ─────────────────
        const { patient, clinicalHistory } = mapDemoCaseToCreateCaseInput(caseInfo);

        // ── Step 3: Create case in context ──────────────────────────
        const caseResult = await createCase(patient, clinicalHistory, {
          skipValidation: true,
        });

        if (!caseResult.success) {
          const errorMsg = 'error' in caseResult
            ? (caseResult as { error?: { message?: string } }).error?.message
            : undefined;
          throw new Error(errorMsg || 'Failed to create case from demo data');
        }

        // ── Step 4: Advance workflow to IMAGE_UPLOAD ────────────────
        // PATIENT_REGISTRATION → CLINICAL_HISTORY → IMAGE_UPLOAD
        advanceWorkflow();
        advanceWorkflow();

        // ── Step 5: Fetch and add demo images ───────────────────────
        const imageSpecs = mapDemoImagesToUploadSpec(caseInfo, caseDir);

        for (const spec of imageSpecs) {
          try {
            // Fetch the PNG from the public directory
            const response = await fetch(spec.url);
            if (!response.ok) {
              // eslint-disable-next-line no-console
              console.warn(
                `[useLoadDemoCase] Failed to fetch image ${spec.filename}: HTTP ${response.status}`
              );
              continue;
            }

            const blob = await response.blob();
            const file = new File([blob], `${spec.filename}.png`, {
              type: 'image/png',
            });

            // Create MammogramImage via the standard pipeline
            const createResult = createMammogramImage(file, {
              viewType: spec.viewType,
              laterality: spec.laterality,
            });

            if (!createResult.success) {
              // eslint-disable-next-line no-console
              console.warn(
                `[useLoadDemoCase] Failed to create image object for ${spec.filename}`
              );
              continue;
            }

            // Persist image blob to IndexedDB for cross-session resume (fire-and-forget)
            persistImageBlob(createResult.data.id, file, file.type).catch(() => {});

            // Add to case
            addImage(createResult.data);
          } catch (imgErr) {
            // Log but don't fail the whole load for a single image
            // eslint-disable-next-line no-console
            console.warn(
              `[useLoadDemoCase] Error loading image ${spec.filename}:`,
              imgErr
            );
          }
        }

        setIsLoading(false);
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unknown error loading demo case';
        setError(message);
        setIsLoading(false);
        return false;
      }
    },
    [createCase, advanceWorkflow, addImage]
  );

  return {
    loadDemoCase,
    isLoading,
    error,
  };
}
