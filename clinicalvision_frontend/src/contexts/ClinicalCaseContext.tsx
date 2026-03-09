/**
 * ClinicalCaseContext
 * 
 * React context for managing clinical case state and operations.
 * Provides centralized state management for the redesigned clinical workflow.
 * 
 * Features:
 * - Case creation and loading
 * - Workflow state machine integration
 * - Patient and clinical history updates
 * - Image management
 * - Persistence integration (local and backend)
 * 
 * @module ClinicalCaseContext
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  ReactNode,
} from 'react';

import {
  ClinicalCase,
  ClinicalWorkflowStep,
  PatientInfo,
  ClinicalHistory,
  MammogramImage,
  ImageAnalysisResult,
  ConsolidatedFinding,
  BiRadsCategory,
  BiRadsAssessment,
  GeneratedReport,
  ReportStatus,
  Result,
  success,
  failure,
  AuditEntry,
  ErrorCode,
  MAX_IMAGES_PER_CASE,
} from '../types/case.types';

import { createClinicalCase } from '../utils/caseOperations';
import { validatePatientInfo, validateClinicalHistory } from '../utils/validators';
import {
  advanceWorkflow as advanceWorkflowFn,
  goBackToStep as goBackToStepFn,
  finalizeCase as finalizeCaseFn,
  getWorkflowProgress as getProgressFn,
  isStepCompleted as isStepCompletedFn,
  isAtFinalStep as isAtFinalStepFn,
  isFinalized as isFinalizedFn,
} from '../utils/workflowStateMachine';
import {
  generateReportContent,
} from '../utils/reportOperations';
import { api } from '../services/api';
import type {
  CaseCreateRequest,
  CaseUpdateRequest,
} from '../services/api';
import {
  BackendSyncService,
  SyncStatus,
  SyncOperation,
} from '../services/BackendSyncService';
import {
  syncCaseToSessionService,
  syncAllCasesToSessionService,
} from '../services/caseSessionBridge';
import {
  debouncedPersist,
  cancelPersist,
  flushPersist,
} from '../utils/debouncedPersistence';
import {
  restoreImageUrls,
  removeImage as removeImageFromStorage,
  revokeAllUrls,
} from '../services/imageStorageService';

// ============================================================================
// CONTEXT TYPES
// ============================================================================

/**
 * Error type for context operations
 */
interface ContextError extends Error {
  code?: ErrorCode;
}

/**
 * Context value type
 */
export interface ClinicalCaseContextValue {
  // Current user
  userId: string;
  
  // State
  currentCase: ClinicalCase | null;
  isLoading: boolean;
  error: ContextError | null;
  
  // Case operations
  createCase: (
    patientInfo: PatientInfo,
    clinicalHistory: ClinicalHistory,
    options?: { skipValidation?: boolean }
  ) => Promise<Result<ClinicalCase, ContextError>>;
  loadCase: (caseId: string) => Promise<Result<ClinicalCase, ContextError>>;
  clearCurrentCase: () => void;
  
  // Workflow operations
  advanceWorkflow: () => Result<ClinicalCase, ContextError>;
  goBackToStep: (step: ClinicalWorkflowStep) => Result<ClinicalCase, ContextError>;
  finalizeCase: (signatureHash: string) => Promise<Result<ClinicalCase, ContextError>>;
  
  // Patient operations
  updatePatientInfo: (updates: Partial<PatientInfo>) => Result<ClinicalCase, ContextError>;
  updateClinicalHistory: (updates: Partial<ClinicalHistory>) => Result<ClinicalCase, ContextError>;
  
  // Image operations
  addImage: (image: MammogramImage) => Result<ClinicalCase, ContextError>;
  removeImage: (imageId: string) => Result<ClinicalCase, ContextError>;
  updateImage: (imageId: string, updates: Partial<MammogramImage>) => Result<ClinicalCase, ContextError>;
  
  // Analysis operations (Phase 5 integration)
  updateAnalysisResults: (
    results: ImageAnalysisResult[],
    consolidatedFindings: ConsolidatedFinding[],
    suggestedBiRads?: BiRadsCategory
  ) => Result<ClinicalCase, ContextError>;
  
  // Assessment operations (Phase 6 integration)
  updateAssessment: (assessment: BiRadsAssessment) => Result<ClinicalCase, ContextError>;
  
  // Report operations (Phase 6 integration)
  updateReport: (report: GeneratedReport) => Result<ClinicalCase, ContextError>;
  generateReport: () => Result<ClinicalCase, ContextError>;
  finalizeReport: () => Result<ClinicalCase, ContextError>;
  signReport: (signatureHash: string) => Result<ClinicalCase, ContextError>;
  
  // Workflow helpers
  getWorkflowProgress: () => number;
  isStepCompleted: (step: ClinicalWorkflowStep) => boolean;
  isAtFinalStep: () => boolean;
  isFinalized: () => boolean;
  
  // Backend sync status (Phase F)
  syncStatus: SyncStatus;
  pendingCount: number;
  retrySync: () => Promise<void>;
  
  // Case listing (persisted cases)
  getAllCases: () => ClinicalCase[];
  
  // Error handling
  clearError: () => void;
}

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const ClinicalCaseContext = createContext<ClinicalCaseContextValue | undefined>(undefined);

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to access the clinical case context
 * @throws Error if used outside of ClinicalCaseProvider
 */
export function useClinicalCase(): ClinicalCaseContextValue {
  const context = useContext(ClinicalCaseContext);
  if (!context) {
    throw new Error('useClinicalCase must be used within ClinicalCaseProvider');
  }
  return context;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createContextError(message: string, code?: ErrorCode): ContextError {
  const error = new Error(message) as ContextError;
  error.code = code;
  return error;
}

// ============================================================================
// LOCALSTORAGE PERSISTENCE
// ============================================================================

/** localStorage key for all cases */
const CASE_STORE_KEY = 'clinicalvision_cases';
/** localStorage key for the currently-active case ID */
const CURRENT_CASE_KEY = 'clinicalvision_current_case_id';

/**
 * Serialise the in-memory caseStore → localStorage.
 * Images are stripped (they contain Blob data that cannot be serialised);
 * everything else (patient info, workflow state, audit trail, assessment,
 * report, analysis results, findings) is persisted.
 */
function persistCaseStore(): void {
  try {
    const serialisable: Record<string, ClinicalCase> = {};
    caseStore.forEach((c, id) => {
      // Strip non-serialisable fields (File/Blob references in images)
      serialisable[id] = {
        ...c,
        images: c.images.map((img) => ({ ...img, file: undefined as any })),
      };
    });
    localStorage.setItem(CASE_STORE_KEY, JSON.stringify(serialisable));

    // Bridge: sync every case to clinicalSessionService so CasesDashboard
    // and PatientRecords (which read from clinicalvision_sessions) can see them
    caseStore.forEach((c) => {
      syncCaseToSessionService(c);
    });
  } catch (err) {
    console.warn('[ClinicalCaseContext] Failed to persist case store:', err);
  }
}

/**
 * Load persisted cases from localStorage → caseStore Map.
 * Called once at module initialisation.
 */
function hydrateFromLocalStorage(): void {
  try {
    const raw = localStorage.getItem(CASE_STORE_KEY);
    if (!raw) return;
    const parsed: Record<string, ClinicalCase> = JSON.parse(raw);
    const cases: ClinicalCase[] = [];
    Object.entries(parsed).forEach(([id, c]) => {
      caseStore.set(id, c);
      cases.push(c);
    });
    // Bridge: ensure clinicalSessionService (CasesDashboard data source)
    // has all cases that were persisted in the ClinicalCaseContext store
    if (cases.length > 0) {
      syncAllCasesToSessionService(cases);
    }
  } catch (err) {
    console.warn('[ClinicalCaseContext] Failed to hydrate case store:', err);
  }
}

/** Persist the active case ID so refreshing picks up where the user left off */
function persistCurrentCaseId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(CURRENT_CASE_KEY, id);
    } else {
      localStorage.removeItem(CURRENT_CASE_KEY);
    }
  } catch { /* best-effort */ }
}

/** Retrieve the last-active case ID after a page refresh */
function getPersistedCurrentCaseId(): string | null {
  try {
    return localStorage.getItem(CURRENT_CASE_KEY);
  } catch {
    return null;
  }
}

// In-memory case storage (hydrated from localStorage on startup)
const caseStore = new Map<string, ClinicalCase>();
hydrateFromLocalStorage();

/**
 * Reset the case store for test isolation
 * @internal For testing purposes only
 */
export function __resetCaseStore(): void {
  caseStore.clear();
  try {
    localStorage.removeItem(CASE_STORE_KEY);
    localStorage.removeItem(CURRENT_CASE_KEY);
  } catch { /* no-op in environments without localStorage */ }
}

/**
 * Get all cases from store (for testing/debugging)
 * @internal For testing purposes only
 */
export function __getCaseStore(): Map<string, ClinicalCase> {
  return caseStore;
}

// ============================================================================
// BACKEND SYNC HELPERS (Phase C)
// ============================================================================

/**
 * Convert frontend PatientInfo + ClinicalHistory to backend CaseCreateRequest
 */
function toCreateRequest(
  patient: PatientInfo,
  clinicalHistory: ClinicalHistory
): CaseCreateRequest {
  return {
    patient_mrn: patient.mrn || undefined,
    patient_first_name: patient.firstName,
    patient_last_name: patient.lastName,
    patient_dob: patient.dateOfBirth || undefined,
    patient_sex: patient.gender || undefined,
    clinical_history: clinicalHistory as Record<string, any>,
  };
}

/**
 * Convert partial PatientInfo to backend CaseUpdateRequest
 */
function patientToUpdateRequest(patient: PatientInfo): CaseUpdateRequest {
  return {
    patient_mrn: patient.mrn || undefined,
    patient_first_name: patient.firstName,
    patient_last_name: patient.lastName,
    patient_dob: patient.dateOfBirth || undefined,
    patient_sex: patient.gender || undefined,
  };
}

/**
 * Fire-and-forget backend sync. Logs errors but never throws.
 * This enables optimistic local updates while syncing in the background.
 */
function syncToBackend(fn: () => Promise<unknown>): void {
  fn().catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('[ClinicalCase] Backend sync failed:', err?.message || err);
  });
}

// ============================================================================
// PROVIDER
// ============================================================================

interface ClinicalCaseProviderProps {
  userId: string;
  children: ReactNode;
}

export const ClinicalCaseProvider: React.FC<ClinicalCaseProviderProps> = ({
  userId,
  children,
}) => {
  // State
  const [currentCase, setCurrentCase] = useState<ClinicalCase | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ContextError | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);

  // ============================================================================
  // BACKEND SYNC SERVICE (Phase F)
  // ============================================================================

  /**
   * Create the BackendSyncService executor that translates SyncOperations
   * into actual API calls.
   */
  const syncServiceRef = useRef<BackendSyncService | null>(null);

  if (!syncServiceRef.current) {
    const executor = async (op: SyncOperation): Promise<void> => {
      const payload = op.payload as Record<string, unknown>;
      switch (op.type) {
        case 'create': {
          const caseId = payload.caseId as string;
          const data = payload.data as CaseCreateRequest;
          const backendResp = await api.createCase(data);
          // Store backendId on the local case
          const localCase = caseStore.get(caseId);
          if (localCase) {
            const synced: ClinicalCase = {
              ...localCase,
              backendId: backendResp.id,
            };
            caseStore.set(synced.id, synced);
            setCurrentCase(synced);
          }
          break;
        }
        case 'update': {
          const backendId = payload.backendId as string;
          const data = payload.data as CaseUpdateRequest;
          if (backendId) {
            await api.updateCase(backendId, data);
          }
          break;
        }
        case 'delete': {
          const backendId = payload.backendId as string;
          if (backendId) {
            await api.deleteCase(backendId);
          }
          break;
        }
        case 'finalize': {
          const backendId = payload.backendId as string;
          const signatureHash = payload.signatureHash as string | undefined;
          if (backendId) {
            await api.finalizeCase(backendId, signatureHash);
          }
          break;
        }
        case 'add_image': {
          const backendId = payload.backendId as string;
          const imageData = payload.data as Record<string, unknown>;
          if (backendId) {
            await api.addImageToCase(backendId, imageData as any);
          }
          break;
        }
        case 'add_finding': {
          const backendId = payload.backendId as string;
          const findingData = payload.data as Record<string, unknown>;
          if (backendId) {
            await api.addFindingToCase(backendId, findingData as any);
          }
          break;
        }
        case 'store_analysis': {
          const backendId = payload.backendId as string;
          const analysisData = payload.data as Record<string, unknown>;
          if (backendId) {
            await api.storeAnalysisResults(backendId, analysisData as any);
          }
          break;
        }
      }
    };

    syncServiceRef.current = new BackendSyncService(executor);
  }

  const syncService = syncServiceRef.current;

  // Subscribe to sync status changes
  useEffect(() => {
    const unsubscribe = syncService.onStatusChange((newStatus: SyncStatus) => {
      setSyncStatus(newStatus);
      setPendingCount(syncService.getPendingCount());
    });
    return unsubscribe;
  }, [syncService]);

  // Dispose sync service on unmount
  useEffect(() => {
    return () => {
      syncService.dispose();
    };
  }, [syncService]);

  // ============================================================================
  // LOCAL PERSISTENCE (survive page refreshes)
  // ============================================================================

  // Hydrate currentCase from localStorage on first mount
  // AND restore dead blob: URLs from IndexedDB
  useEffect(() => {
    const savedId = getPersistedCurrentCaseId();
    if (savedId && caseStore.has(savedId) && !currentCase) {
      const savedCase = caseStore.get(savedId)!;

      // Restore blob URLs from IndexedDB for all images.
      // blob: URLs die on page refresh — IndexedDB stores the raw data.
      const imageIds = savedCase.images.map((img) => img.id);
      if (imageIds.length > 0) {
        restoreImageUrls(imageIds)
          .then((urlMap) => {
            if (urlMap.size > 0) {
              const restoredImages = savedCase.images.map((img) => {
                const restoredUrl = urlMap.get(img.id);
                return restoredUrl ? { ...img, localUrl: restoredUrl } : img;
              });
              const restoredCase = { ...savedCase, images: restoredImages };
              caseStore.set(restoredCase.id, restoredCase);
              setCurrentCase(restoredCase);
            } else {
              setCurrentCase(savedCase);
            }
          })
          .catch(() => {
            // Graceful fallback — load case without working image URLs
            setCurrentCase(savedCase);
          });
      } else {
        setCurrentCase(savedCase);
      }
    }
    // Run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-persist whenever currentCase changes (DEBOUNCED)
  // The heavy caseStore serialisation (~100KB with attention maps) is now
  // debounced to avoid blocking the main thread on rapid state updates
  // (slider drags, W/L adjustments, etc.).
  useEffect(() => {
    persistCurrentCaseId(currentCase?.id ?? null);

    // Build serialisable snapshot for debounced write
    const serialisable: Record<string, ClinicalCase> = {};
    caseStore.forEach((c, id) => {
      serialisable[id] = {
        ...c,
        images: c.images.map((img) => ({ ...img, file: undefined as any })),
      };
    });

    // Debounced localStorage write (3s window)
    debouncedPersist(CASE_STORE_KEY, serialisable);

    // Sync to session service immediately (lightweight — just metadata)
    caseStore.forEach((c) => {
      syncCaseToSessionService(c);
    });
  }, [currentCase]);

  // Flush persistence on unmount + beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Flush any pending debounced writes before page unload
      const serialisable: Record<string, ClinicalCase> = {};
      caseStore.forEach((c, id) => {
        serialisable[id] = {
          ...c,
          images: c.images.map((img) => ({ ...img, file: undefined as any })),
        };
      });
      flushPersist(CASE_STORE_KEY, serialisable);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    // pagehide is more reliable on mobile Safari (beforeunload may not fire)
    window.addEventListener('pagehide', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      cancelPersist();
      // Release blob URL memory (IndexedDB data survives for next session)
      revokeAllUrls();
    };
  }, []);

  /** Retry all failed sync operations */
  const retrySync = useCallback(async () => {
    await syncService.retryAll();
  }, [syncService]);

  /** Return all cases from the persistent store */
  const getAllCases = useCallback((): ClinicalCase[] => {
    return Array.from(caseStore.values());
  }, []);

  // ============================================================================
  // CASE OPERATIONS
  // ============================================================================

  /**
   * Create a new clinical case
   */
  const createCase = useCallback(
    async (
      patientInfo: PatientInfo,
      clinicalHistory: ClinicalHistory,
      options?: { skipValidation?: boolean }
    ): Promise<Result<ClinicalCase, ContextError>> => {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = createClinicalCase(patientInfo, clinicalHistory, userId, {
          skipValidation: options?.skipValidation,
        });
        
        if (result.success === true) {
          const newCase = result.data;
          
          // Store in memory
          caseStore.set(newCase.id, newCase);
          
          // Set as current case
          setCurrentCase(newCase);
          setIsLoading(false);
          
          // Phase F: Sync to backend via BackendSyncService (fire-and-forget)
          syncService.syncCreate({
            caseId: newCase.id,
            data: toCreateRequest(patientInfo, clinicalHistory),
          }).catch(() => {
            // BackendSyncService handles retries internally.
          });
          
          return success(newCase);
        }
        
        // result.success === false
        const errorMsg = result.error.message;
        const error = createContextError(
          errorMsg,
          ErrorCode.VALIDATION_ERROR
        );
        setError(error);
        setIsLoading(false);
        return failure(error);
      } catch (e) {
        const error = createContextError(
          e instanceof Error ? e.message : 'Failed to create case',
          ErrorCode.VALIDATION_ERROR
        );
        setError(error);
        setIsLoading(false);
        return failure(error);
      }
    },
    [userId]
  );

  /**
   * Load an existing case
   */
  const loadCase = useCallback(
    async (caseId: string): Promise<Result<ClinicalCase, ContextError>> => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Check in-memory store (would check backend)
        const storedCase = caseStore.get(caseId);
        
        if (!storedCase) {
          const error = createContextError(
            `Case ${caseId} not found`,
            ErrorCode.NOT_FOUND
          );
          setError(error);
          setIsLoading(false);
          return failure(error);
        }
        
        setCurrentCase(storedCase);
        setIsLoading(false);
        return success(storedCase);
      } catch (e) {
        const error = createContextError(
          e instanceof Error ? e.message : 'Failed to load case',
          ErrorCode.NOT_FOUND
        );
        setError(error);
        setIsLoading(false);
        return failure(error);
      }
    },
    []
  );

  /**
   * Clear the current case
   */
  const clearCurrentCase = useCallback(() => {
    setCurrentCase(null);
    setError(null);
  }, []);

  // ============================================================================
  // WORKFLOW OPERATIONS
  // ============================================================================

  /**
   * Advance workflow to next step
   */
  const advanceWorkflow = useCallback((): Result<ClinicalCase, ContextError> => {
    if (!currentCase) {
      return failure(createContextError('No case loaded', ErrorCode.WORKFLOW_ERROR));
    }
    
    const result = advanceWorkflowFn(currentCase, userId);
    
    if (result.success === true) {
      const updatedCase = result.data;
      caseStore.set(updatedCase.id, updatedCase);
      setCurrentCase(updatedCase);

      // Phase F: Sync workflow advance to backend via BackendSyncService
      syncService.syncUpdate({
        backendId: currentCase.backendId,
        caseId: currentCase.id,
        data: {
          workflow_current_step: updatedCase.workflow.currentStep,
        } as CaseUpdateRequest,
      }).catch(() => {});

      return success(updatedCase);
    }
    
    // result.success === false  
    return failure(createContextError(
      result.error.reason,
      ErrorCode.WORKFLOW_ERROR
    ));
  }, [currentCase, userId]);

  /**
   * Go back to a previous step
   */
  const goBackToStep = useCallback(
    (step: ClinicalWorkflowStep): Result<ClinicalCase, ContextError> => {
      if (!currentCase) {
        return failure(createContextError('No case loaded', ErrorCode.WORKFLOW_ERROR));
      }
      
      const result = goBackToStepFn(currentCase, step, userId);
      
      if (result.success === true) {
        const updatedCase = result.data;
        caseStore.set(updatedCase.id, updatedCase);
        setCurrentCase(updatedCase);
        return success(updatedCase);
      }
      
      // result.success === false
      return failure(createContextError(
        result.error.reason,
        ErrorCode.WORKFLOW_ERROR
      ));
    },
    [currentCase, userId]
  );

  /**
   * Finalize the case
   */
  const finalizeCaseHandler = useCallback(
    async (signatureHash: string): Promise<Result<ClinicalCase, ContextError>> => {
      if (!currentCase) {
        return failure(createContextError('No case loaded', ErrorCode.WORKFLOW_ERROR));
      }
      
      const result = finalizeCaseFn(currentCase, userId, signatureHash);
      
      if (result.success === true) {
        const updatedCase = result.data;
        caseStore.set(updatedCase.id, updatedCase);
        setCurrentCase(updatedCase);

        // Phase F: Sync finalization to backend via BackendSyncService
        syncService.syncFinalize({
          backendId: currentCase.backendId,
          caseId: currentCase.id,
          signatureHash,
        }).catch(() => {});

        return success(updatedCase);
      }
      
      // result.success === false
      return failure(createContextError(
        result.error.reason,
        ErrorCode.WORKFLOW_ERROR
      ));
    },
    [currentCase, userId]
  );

  // ============================================================================
  // PATIENT OPERATIONS
  // ============================================================================

  /**
   * Update patient information
   */
  const updatePatientInfo = useCallback(
    (updates: Partial<PatientInfo>): Result<ClinicalCase, ContextError> => {
      if (!currentCase) {
        return failure(createContextError('No case loaded', ErrorCode.VALIDATION_ERROR));
      }
      
      // Merge updates with existing patient info
      const updatedPatient = { ...currentCase.patient, ...updates };
      
      // Validate the updated patient info
      const validation = validatePatientInfo(updatedPatient);
      if (!validation.isValid) {
        return failure(createContextError(
          validation.errors[0]?.message || 'Invalid patient info',
          ErrorCode.VALIDATION_ERROR
        ));
      }
      
      // Create audit entry
      const auditEntry: AuditEntry = {
        timestamp: new Date().toISOString(),
        userId,
        action: 'UPDATE_PATIENT_INFO',
        field: 'patient',
        previousValue: currentCase.patient,
        newValue: updatedPatient,
      };
      
      // Create updated case
      const updatedCase: ClinicalCase = {
        ...currentCase,
        patient: updatedPatient,
        audit: {
          ...currentCase.audit,
          modifications: [...currentCase.audit.modifications, auditEntry],
        },
      };
      
      caseStore.set(updatedCase.id, updatedCase);
      setCurrentCase(updatedCase);

      // Phase F: Sync to backend via BackendSyncService (fire-and-forget, optimistic)
      syncService.syncUpdate({
        backendId: currentCase.backendId,
        caseId: currentCase.id,
        data: patientToUpdateRequest(updatedPatient),
      }).catch(() => {});

      return success(updatedCase);
    },
    [currentCase, userId]
  );

  /**
   * Update clinical history
   */
  const updateClinicalHistory = useCallback(
    (updates: Partial<ClinicalHistory>): Result<ClinicalCase, ContextError> => {
      if (!currentCase) {
        return failure(createContextError('No case loaded', ErrorCode.VALIDATION_ERROR));
      }
      
      // Merge updates with existing history
      const updatedHistory = { ...currentCase.clinicalHistory, ...updates };
      
      // Validate the updated history
      const validation = validateClinicalHistory(updatedHistory);
      if (!validation.isValid) {
        return failure(createContextError(
          validation.errors[0]?.message || 'Invalid clinical history',
          ErrorCode.VALIDATION_ERROR
        ));
      }
      
      // Create audit entry
      const auditEntry: AuditEntry = {
        timestamp: new Date().toISOString(),
        userId,
        action: 'UPDATE_CLINICAL_HISTORY',
        field: 'clinicalHistory',
        previousValue: currentCase.clinicalHistory,
        newValue: updatedHistory,
      };
      
      // Create updated case
      const updatedCase: ClinicalCase = {
        ...currentCase,
        clinicalHistory: updatedHistory,
        audit: {
          ...currentCase.audit,
          modifications: [...currentCase.audit.modifications, auditEntry],
        },
      };
      
      caseStore.set(updatedCase.id, updatedCase);
      setCurrentCase(updatedCase);

      // Phase F: Sync to backend via BackendSyncService (fire-and-forget, optimistic)
      syncService.syncUpdate({
        backendId: currentCase.backendId,
        caseId: currentCase.id,
        data: { clinical_history: updatedHistory as Record<string, any> },
      }).catch(() => {});

      return success(updatedCase);
    },
    [currentCase, userId]
  );

  // ============================================================================
  // IMAGE OPERATIONS
  // ============================================================================

  /**
   * Add an image to the case
   * 
   * NOTE: Uses caseStore.get() instead of closure-captured currentCase to
   * handle rapid sequential calls (e.g. MultiImageUpload uploading 4 images
   * in a synchronous loop). Without this, React batches state updates and
   * each call sees the same stale currentCase, causing only the last image
   * to survive.
   */
  const addImage = useCallback(
    (image: MammogramImage): Result<ClinicalCase, ContextError> => {
      // Read the LATEST case from the synchronous store — not the
      // possibly-stale closure-captured currentCase
      const latestCase = currentCase
        ? (caseStore.get(currentCase.id) ?? currentCase)
        : null;

      if (!latestCase) {
        return failure(createContextError('No case loaded', ErrorCode.VALIDATION_ERROR));
      }
      
      // Validate workflow state - images can only be added at IMAGE_UPLOAD or IMAGE_VERIFICATION steps
      const allowedSteps = [ClinicalWorkflowStep.IMAGE_UPLOAD, ClinicalWorkflowStep.IMAGE_VERIFICATION];
      if (!allowedSteps.includes(latestCase.workflow.currentStep)) {
        return failure(createContextError(
          `Images cannot be added at step: ${latestCase.workflow.currentStep}`,
          ErrorCode.WORKFLOW_ERROR
        ));
      }
      
      // Check if case is finalized
      if (latestCase.workflow.isLocked) {
        return failure(createContextError(
          'Cannot modify a finalized case',
          ErrorCode.WORKFLOW_ERROR
        ));
      }
      
      // Check image count limit
      if (latestCase.images.length >= MAX_IMAGES_PER_CASE) {
        return failure(createContextError(
          `Maximum of ${MAX_IMAGES_PER_CASE} images per case exceeded`,
          ErrorCode.VALIDATION_ERROR
        ));
      }
      
      // Create audit entry
      const auditEntry: AuditEntry = {
        timestamp: new Date().toISOString(),
        userId,
        action: 'ADD_IMAGE',
        field: 'images',
        newValue: image.id,
      };
      
      // Create updated case from latestCase (not stale currentCase)
      const updatedCase: ClinicalCase = {
        ...latestCase,
        images: [...latestCase.images, image],
        audit: {
          ...latestCase.audit,
          modifications: [...latestCase.audit.modifications, auditEntry],
        },
      };
      
      // Update synchronous store FIRST (so next rapid call reads latest)
      caseStore.set(updatedCase.id, updatedCase);
      // Then schedule React state update
      setCurrentCase(updatedCase);
      return success(updatedCase);
    },
    [currentCase, userId]
  );

  /**
   * Remove an image from the case
   */
  const removeImage = useCallback(
    (imageId: string): Result<ClinicalCase, ContextError> => {
      if (!currentCase) {
        return failure(createContextError('No case loaded', ErrorCode.VALIDATION_ERROR));
      }
      
      // Validate workflow state - images can only be removed at IMAGE_UPLOAD or IMAGE_VERIFICATION steps
      const allowedSteps = [ClinicalWorkflowStep.IMAGE_UPLOAD, ClinicalWorkflowStep.IMAGE_VERIFICATION];
      if (!allowedSteps.includes(currentCase.workflow.currentStep)) {
        return failure(createContextError(
          `Images cannot be removed at step: ${currentCase.workflow.currentStep}`,
          ErrorCode.WORKFLOW_ERROR
        ));
      }
      
      // Check if case is finalized
      if (currentCase.workflow.isLocked) {
        return failure(createContextError(
          'Cannot modify a finalized case',
          ErrorCode.WORKFLOW_ERROR
        ));
      }
      
      const imageExists = currentCase.images.some(img => img.id === imageId);
      if (!imageExists) {
        return failure(createContextError(
          `Image ${imageId} not found`,
          ErrorCode.NOT_FOUND
        ));
      }
      
      // Create audit entry
      const auditEntry: AuditEntry = {
        timestamp: new Date().toISOString(),
        userId,
        action: 'REMOVE_IMAGE',
        field: 'images',
        previousValue: imageId,
      };
      
      // Clean up IndexedDB entry for the removed image (fire-and-forget)
      removeImageFromStorage(imageId).catch(() => {});

      // Create updated case
      const updatedCase: ClinicalCase = {
        ...currentCase,
        images: currentCase.images.filter(img => img.id !== imageId),
        audit: {
          ...currentCase.audit,
          modifications: [...currentCase.audit.modifications, auditEntry],
        },
      };
      
      caseStore.set(updatedCase.id, updatedCase);
      setCurrentCase(updatedCase);
      return success(updatedCase);
    },
    [currentCase, userId]
  );

  /**
   * Update an image's metadata
   */
  const updateImage = useCallback(
    (imageId: string, updates: Partial<MammogramImage>): Result<ClinicalCase, ContextError> => {
      if (!currentCase) {
        return failure(createContextError('No case loaded', ErrorCode.VALIDATION_ERROR));
      }
      
      const imageIndex = currentCase.images.findIndex(img => img.id === imageId);
      if (imageIndex === -1) {
        return failure(createContextError(
          `Image ${imageId} not found`,
          ErrorCode.NOT_FOUND
        ));
      }
      
      const updatedImages = [...currentCase.images];
      updatedImages[imageIndex] = { ...updatedImages[imageIndex], ...updates };
      
      // Create audit entry
      const auditEntry: AuditEntry = {
        timestamp: new Date().toISOString(),
        userId,
        action: 'UPDATE_IMAGE',
        field: `images[${imageId}]`,
        newValue: updates,
      };
      
      // Create updated case
      const updatedCase: ClinicalCase = {
        ...currentCase,
        images: updatedImages,
        audit: {
          ...currentCase.audit,
          modifications: [...currentCase.audit.modifications, auditEntry],
        },
      };
      
      caseStore.set(updatedCase.id, updatedCase);
      setCurrentCase(updatedCase);
      return success(updatedCase);
    },
    [currentCase, userId]
  );

  // ============================================================================
  // ANALYSIS OPERATIONS (Phase 5 Integration)
  // ============================================================================

  /**
   * Update analysis results on the current case
   * Called after BatchAnalysisRunner completes
   */
  const updateAnalysisResults = useCallback(
    (
      results: ImageAnalysisResult[],
      consolidatedFindings: ConsolidatedFinding[],
      suggestedBiRads?: BiRadsCategory
    ): Result<ClinicalCase, ContextError> => {
      if (!currentCase) {
        return failure(createContextError('No case loaded', ErrorCode.VALIDATION_ERROR));
      }
      
      const now = new Date().toISOString();
      
      // Create audit entry
      const auditEntry: AuditEntry = {
        timestamp: now,
        userId,
        action: 'UPDATE_ANALYSIS_RESULTS',
        field: 'analysisResults',
        newValue: {
          resultsCount: results.length,
          findingsCount: consolidatedFindings.length,
          suggestedBiRads,
        },
      };
      
      // Create updated case with analysis results
      const updatedCase: ClinicalCase = {
        ...currentCase,
        analysisResults: results,
        consolidatedFindings,
        // Persist the AI-suggested BI-RADS so BiRadsAssessmentStep can display it
        aiSuggestedBiRads: suggestedBiRads ?? currentCase.aiSuggestedBiRads,
        // Mark BATCH_AI_ANALYSIS as completed if not already
        workflow: {
          ...currentCase.workflow,
          completedSteps: currentCase.workflow.completedSteps.includes(ClinicalWorkflowStep.BATCH_AI_ANALYSIS)
            ? currentCase.workflow.completedSteps
            : [...currentCase.workflow.completedSteps, ClinicalWorkflowStep.BATCH_AI_ANALYSIS],
          lastModifiedAt: now,
        },
        audit: {
          ...currentCase.audit,
          lastModifiedBy: userId,
          lastModifiedAt: now,
          modifications: [...currentCase.audit.modifications, auditEntry],
        },
      };
      
      caseStore.set(updatedCase.id, updatedCase);
      setCurrentCase(updatedCase);
      return success(updatedCase);
    },
    [currentCase, userId]
  );

  // ============================================================================
  // ASSESSMENT OPERATIONS (Phase 6 Integration)
  // ============================================================================

  /**
   * Update the BI-RADS assessment on the current case
   */
  const updateAssessment = useCallback(
    (assessment: BiRadsAssessment): Result<ClinicalCase, ContextError> => {
      if (!currentCase) {
        return failure(createContextError('No case loaded', ErrorCode.NO_CASE));
      }
      
      const now = new Date().toISOString();
      
      // Create audit entry
      const auditEntry: AuditEntry = {
        timestamp: now,
        userId,
        action: 'UPDATE_ASSESSMENT',
        field: 'assessment',
        newValue: {
          overallCategory: assessment.overallCategory,
          rightBreastCategory: assessment.rightBreast.biRadsCategory,
          leftBreastCategory: assessment.leftBreast.biRadsCategory,
        },
      };
      
      // Create updated case with assessment
      const updatedCase: ClinicalCase = {
        ...currentCase,
        assessment,
        workflow: {
          ...currentCase.workflow,
          completedSteps: currentCase.workflow.completedSteps.includes(ClinicalWorkflowStep.BIRADS_ASSESSMENT)
            ? currentCase.workflow.completedSteps
            : [...currentCase.workflow.completedSteps, ClinicalWorkflowStep.BIRADS_ASSESSMENT],
          lastModifiedAt: now,
        },
        audit: {
          ...currentCase.audit,
          lastModifiedBy: userId,
          lastModifiedAt: now,
          modifications: [...currentCase.audit.modifications, auditEntry],
        },
      };
      
      caseStore.set(updatedCase.id, updatedCase);
      setCurrentCase(updatedCase);
      return success(updatedCase);
    },
    [currentCase, userId]
  );

  // ============================================================================
  // REPORT OPERATIONS (Phase 6 Integration)
  // ============================================================================

  /**
   * Update the report on the current case
   */
  const updateReport = useCallback(
    (report: GeneratedReport): Result<ClinicalCase, ContextError> => {
      if (!currentCase) {
        return failure(createContextError('No case loaded', ErrorCode.NO_CASE));
      }
      
      const now = new Date().toISOString();
      
      // Create audit entry
      const auditEntry: AuditEntry = {
        timestamp: now,
        userId,
        action: 'UPDATE_REPORT',
        field: 'report',
        newValue: {
          reportId: report.id,
          status: report.status,
        },
      };
      
      // Create updated case with report
      const updatedCase: ClinicalCase = {
        ...currentCase,
        report,
        workflow: {
          ...currentCase.workflow,
          lastModifiedAt: now,
        },
        audit: {
          ...currentCase.audit,
          lastModifiedBy: userId,
          lastModifiedAt: now,
          modifications: [...currentCase.audit.modifications, auditEntry],
        },
      };
      
      caseStore.set(updatedCase.id, updatedCase);
      setCurrentCase(updatedCase);
      return success(updatedCase);
    },
    [currentCase, userId]
  );

  /**
   * Generate a report from the current case
   */
  const generateReportHandler = useCallback((): Result<ClinicalCase, ContextError> => {
    if (!currentCase) {
      return failure(createContextError('No case loaded', ErrorCode.NO_CASE));
    }
    
    const now = new Date().toISOString();
    
    // Use reportOperations utilities for proper formatting with full header, findings, etc.
    // generateReportContent handles missing data gracefully with fallback text
    const content = generateReportContent(currentCase);
    
    const report: GeneratedReport = {
      id: `report-${Date.now()}`,
      status: 'draft',
      content,
      generatedAt: now,
      modifiedAt: now,
    };
    
    // Create audit entry
    const auditEntry: AuditEntry = {
      timestamp: now,
      userId,
      action: 'GENERATE_REPORT',
      field: 'report',
      newValue: {
        reportId: report.id,
        status: report.status,
      },
    };
    
    // Create updated case with report
    const updatedCase: ClinicalCase = {
      ...currentCase,
      report,
      workflow: {
        ...currentCase.workflow,
        completedSteps: currentCase.workflow.completedSteps.includes(ClinicalWorkflowStep.REPORT_GENERATION)
          ? currentCase.workflow.completedSteps
          : [...currentCase.workflow.completedSteps, ClinicalWorkflowStep.REPORT_GENERATION],
        lastModifiedAt: now,
      },
      audit: {
        ...currentCase.audit,
        lastModifiedBy: userId,
        lastModifiedAt: now,
        modifications: [...currentCase.audit.modifications, auditEntry],
      },
    };
    
    caseStore.set(updatedCase.id, updatedCase);
    setCurrentCase(updatedCase);
    return success(updatedCase);
  }, [currentCase, userId]);

  /**
   * Finalize the report (change status to pending_review)
   */
  const finalizeReportHandler = useCallback((): Result<ClinicalCase, ContextError> => {
    if (!currentCase) {
      return failure(createContextError('No case loaded', ErrorCode.NO_CASE));
    }
    
    if (!currentCase.report) {
      return failure(createContextError('No report to finalize', ErrorCode.VALIDATION_ERROR));
    }
    
    // Validate report status - only drafts can be finalized
    if (currentCase.report.status !== 'draft') {
      return failure(createContextError(
        `Cannot finalize report with status: ${currentCase.report.status}`,
        ErrorCode.VALIDATION_ERROR
      ));
    }
    
    const now = new Date().toISOString();
    
    const updatedReport: GeneratedReport = {
      ...currentCase.report,
      status: 'pending_review',
      modifiedAt: now,
    };
    
    // Create audit entry
    const auditEntry: AuditEntry = {
      timestamp: now,
      userId,
      action: 'FINALIZE_REPORT',
      field: 'report.status',
      previousValue: currentCase.report.status,
      newValue: 'pending_review',
    };
    
    // Create updated case
    const updatedCase: ClinicalCase = {
      ...currentCase,
      report: updatedReport,
      workflow: {
        ...currentCase.workflow,
        lastModifiedAt: now,
      },
      audit: {
        ...currentCase.audit,
        lastModifiedBy: userId,
        lastModifiedAt: now,
        modifications: [...currentCase.audit.modifications, auditEntry],
      },
    };
    
    caseStore.set(updatedCase.id, updatedCase);
    setCurrentCase(updatedCase);
    return success(updatedCase);
  }, [currentCase, userId]);

  /**
   * Sign the report
   */
  const signReportHandler = useCallback(
    (signatureHash: string): Result<ClinicalCase, ContextError> => {
      if (!currentCase) {
        return failure(createContextError('No case loaded', ErrorCode.NO_CASE));
      }
      
      if (!currentCase.report) {
        return failure(createContextError('No report to sign', ErrorCode.VALIDATION_ERROR));
      }
      
      // Validate report status - must be pending_review or reviewed to sign
      const signable: ReportStatus[] = ['pending_review', 'reviewed'];
      if (!signable.includes(currentCase.report.status)) {
        return failure(createContextError(
          `Cannot sign report with status: ${currentCase.report.status}. Report must be reviewed first.`,
          ErrorCode.VALIDATION_ERROR
        ));
      }
      
      const now = new Date().toISOString();
      
      const updatedReport: GeneratedReport = {
        ...currentCase.report,
        status: 'signed',
        modifiedAt: now,
      };
      
      // Create audit entry
      const auditEntry: AuditEntry = {
        timestamp: now,
        userId,
        action: 'SIGN_REPORT',
        field: 'report.status',
        previousValue: currentCase.report.status,
        newValue: 'signed',
      };
      
      // Create updated case with signature persisted in audit trail
      const updatedCase: ClinicalCase = {
        ...currentCase,
        report: updatedReport,
        workflow: {
          ...currentCase.workflow,
          lastModifiedAt: now,
        },
        audit: {
          ...currentCase.audit,
          lastModifiedBy: userId,
          lastModifiedAt: now,
          signedBy: userId,
          signedAt: now,
          signatureHash: signatureHash || undefined,
          modifications: [...currentCase.audit.modifications, auditEntry],
        },
      };
      
      caseStore.set(updatedCase.id, updatedCase);
      setCurrentCase(updatedCase);
      return success(updatedCase);
    },
    [currentCase, userId]
  );

  // ============================================================================
  // WORKFLOW HELPERS
  // ============================================================================

  const getWorkflowProgress = useCallback((): number => {
    if (!currentCase) return 0;
    return getProgressFn(currentCase.workflow.currentStep);
  }, [currentCase]);

  const isStepCompleted = useCallback(
    (step: ClinicalWorkflowStep): boolean => {
      if (!currentCase) return false;
      return isStepCompletedFn(step, currentCase.workflow);
    },
    [currentCase]
  );

  const isAtFinalStep = useCallback((): boolean => {
    if (!currentCase) return false;
    return isAtFinalStepFn(currentCase.workflow);
  }, [currentCase]);

  const isFinalized = useCallback((): boolean => {
    if (!currentCase) return false;
    return isFinalizedFn(currentCase.workflow);
  }, [currentCase]);

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value = useMemo<ClinicalCaseContextValue>(
    () => ({
      // User
      userId,
      
      // State
      currentCase,
      isLoading,
      error,
      
      // Case operations
      createCase,
      loadCase,
      clearCurrentCase,
      
      // Workflow operations
      advanceWorkflow,
      goBackToStep,
      finalizeCase: finalizeCaseHandler,
      
      // Patient operations
      updatePatientInfo,
      updateClinicalHistory,
      
      // Image operations
      addImage,
      removeImage,
      updateImage,
      
      // Analysis operations (Phase 5)
      updateAnalysisResults,
      
      // Assessment operations (Phase 6)
      updateAssessment,
      
      // Report operations (Phase 6)
      updateReport,
      generateReport: generateReportHandler,
      finalizeReport: finalizeReportHandler,
      signReport: signReportHandler,
      
      // Workflow helpers
      getWorkflowProgress,
      isStepCompleted,
      isAtFinalStep,
      isFinalized,
      
      // Backend sync (Phase F)
      syncStatus,
      pendingCount,
      retrySync,
      
      // Case listing
      getAllCases,
      
      // Error handling
      clearError,
    }),
    [
      userId,
      currentCase,
      isLoading,
      error,
      createCase,
      loadCase,
      clearCurrentCase,
      advanceWorkflow,
      goBackToStep,
      finalizeCaseHandler,
      updatePatientInfo,
      updateClinicalHistory,
      addImage,
      removeImage,
      updateImage,
      updateAnalysisResults,
      updateAssessment,
      updateReport,
      generateReportHandler,
      finalizeReportHandler,
      signReportHandler,
      getWorkflowProgress,
      isStepCompleted,
      isAtFinalStep,
      isFinalized,
      syncStatus,
      pendingCount,
      retrySync,
      getAllCases,
      clearError,
    ]
  );

  return (
    <ClinicalCaseContext.Provider value={value}>
      {children}
    </ClinicalCaseContext.Provider>
  );
};

export { ClinicalCaseContext };
