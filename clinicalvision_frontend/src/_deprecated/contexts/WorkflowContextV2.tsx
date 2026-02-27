/**
 * Workflow Context v2 - SIMPLIFIED
 * 
 * DESIGN PRINCIPLES:
 * 1. Single source of truth: ALL workflow logic in one place
 * 2. Explicit completion: Steps are completed via user action, not data derivation
 * 3. Simple state machine: LOCKED → AVAILABLE → CURRENT → COMPLETED
 * 4. No duplicate logic: One function for each concern
 * 
 * This replaces the over-engineered v1 that had:
 * - 3 different implementations of navigation logic
 * - Automatic completion that confused users
 * - Race conditions between derived state and stored state
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  AnalysisSession, 
  WorkflowStep, 
  Finding, 
  AutoSaveState, 
  ImageMetadata,
  WorkflowMode,
  getVisibleSteps,
  WORKFLOW_STEPS,
} from '../types/clinical.types';
import { clinicalSessionService } from '../services/clinicalSession.service';
import { 
  canNavigateTo, 
  validateStepData, 
  getStepVisualState,
  calculateProgress,
  getNextVisibleStep,
  StepVisualState,
  ValidationResult,
} from '../utils/workflowUtilsV2';

// ============================================================================
// CONTEXT INTERFACE
// ============================================================================

interface WorkflowContextValue {
  // Session state
  currentSession: AnalysisSession | null;
  isLoading: boolean;
  error: string | null;
  autoSaveState: AutoSaveState;

  // Workflow mode
  workflowMode: WorkflowMode;
  setWorkflowMode: (mode: WorkflowMode) => void;
  visibleSteps: typeof WORKFLOW_STEPS;

  // Session operations
  createNewSession: (initialData?: Partial<AnalysisSession>) => void;
  loadSession: (sessionId: string) => void;
  saveSession: () => void;
  updateSessionData: (updates: Partial<AnalysisSession>) => void;
  deleteCurrentSession: () => void;

  // NEW SIMPLIFIED Workflow operations
  goToStep: (step: WorkflowStep) => void;              // Navigate to a step
  completeCurrentStep: () => ValidationResult;          // Mark current step done + advance
  getStepState: (step: WorkflowStep) => StepVisualState; // Get visual state
  canGoTo: (step: WorkflowStep) => boolean;             // Check if navigation allowed
  validateCurrentStep: () => ValidationResult;           // Check if current step data is valid
  
  // Progress
  progress: { completed: number; total: number; percentage: number };

  // Image operations
  addImages: (files: File[]) => Promise<void>;
  updateImage: (imageId: string, updates: Partial<ImageMetadata>) => void;
  deleteImage: (imageId: string) => void;
  setActiveImage: (imageId: string) => void;

  // Findings operations
  addFinding: (finding: Finding) => void;
  updateFinding: (findingId: string, updates: Partial<Finding>) => void;
  deleteFinding: (findingId: string) => void;

  // Auto-save controls
  enableAutoSave: (enabled: boolean) => void;
  forceSave: () => void;
  
  // Error handling
  clearError: () => void;
  
  // Legacy compatibility (deprecated)
  advanceToStep: (step: WorkflowStep) => void;
  isStepCompleted: (step: WorkflowStep) => boolean;
  canAdvanceToStep: (step: WorkflowStep) => boolean;
  markStepCompleted: (step: WorkflowStep) => void;
  getCurrentStepIndex: () => number;
  completeWorkflow: () => void;
  getVisibleWorkflowSteps: () => typeof WORKFLOW_STEPS;
}

const WorkflowContext = createContext<WorkflowContextValue | undefined>(undefined);

export { WorkflowContext };

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within WorkflowProvider');
  }
  return context;
};

// ============================================================================
// PROVIDER
// ============================================================================

interface WorkflowProviderProps {
  children: ReactNode;
}

export const WorkflowProvider: React.FC<WorkflowProviderProps> = ({ children }) => {
  const [currentSession, setCurrentSession] = useState<AnalysisSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflowMode, setWorkflowModeState] = useState<WorkflowMode>('quick');
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>(
    clinicalSessionService.getAutoSaveState()
  );

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    const session = clinicalSessionService.getCurrentSession();
    if (session) {
      console.log(`📥 Loading session: ${session.sessionId}`);
      setCurrentSession(session);
      if (session.workflow?.mode) {
        setWorkflowModeState(session.workflow.mode);
      }
    }
  }, []);

  // Auto-save state sync
  useEffect(() => {
    const interval = setInterval(() => {
      setAutoSaveState(clinicalSessionService.getAutoSaveState());
    }, 5000); // Reduced frequency to avoid performance issues
    return () => clearInterval(interval);
  }, []);

  // ============================================================================
  // DERIVED VALUES (memoized to prevent recalculation)
  // ============================================================================

  const mode = currentSession?.workflow?.mode || workflowMode;
  const visibleSteps = getVisibleSteps(mode);
  const progress = calculateProgress(currentSession, mode);

  // ============================================================================
  // WORKFLOW OPERATIONS - SIMPLIFIED
  // ============================================================================

  /**
   * Navigate to a step. Does NOT mark anything as complete.
   */
  const goToStep = useCallback((step: WorkflowStep) => {
    if (!currentSession) {
      setError('No active session. Please start a new analysis.');
      return;
    }

    // Check if navigation is allowed
    if (!canNavigateTo(currentSession, step, mode)) {
      setError('Cannot navigate to this step. Complete required steps first.');
      return;
    }

    // Clear error and navigate
    setError(null);
    
    // Update session
    const updatedSession = {
      ...currentSession,
      workflow: {
        ...currentSession.workflow,
        currentStep: step,
        stepHistory: [
          ...(currentSession.workflow.stepHistory || []),
          { step, enteredAt: new Date().toISOString() }
        ],
      },
    };

    // Save and update state
    clinicalSessionService.saveSession(updatedSession);
    setCurrentSession(updatedSession);
  }, [currentSession, mode]);

  /**
   * Complete the current step and advance to next.
   * Returns validation result so caller can show errors.
   */
  const completeCurrentStep = useCallback((): ValidationResult => {
    if (!currentSession) {
      return { valid: false, errors: ['No active session'] };
    }

    const currentStep = currentSession.workflow?.currentStep ?? WorkflowStep.UPLOAD;
    
    // Validate current step
    const validation = validateStepData(currentSession, currentStep);
    if (!validation.valid) {
      setError(validation.errors.join('. '));
      return validation;
    }

    // Mark current step as completed
    const completedSteps = [...(currentSession.workflow.completedSteps || [])];
    if (!completedSteps.includes(currentStep)) {
      completedSteps.push(currentStep);
    }

    // Get next step
    const nextStep = getNextVisibleStep(currentSession, currentStep, mode);
    const newCurrentStep = nextStep ?? currentStep;

    // Update session
    const updatedSession = {
      ...currentSession,
      workflow: {
        ...currentSession.workflow,
        completedSteps,
        currentStep: newCurrentStep,
        stepHistory: [
          ...(currentSession.workflow.stepHistory || []),
          { step: newCurrentStep, enteredAt: new Date().toISOString() }
        ],
      },
    };

    // Save and update state
    setError(null);
    clinicalSessionService.saveSession(updatedSession);
    setCurrentSession(updatedSession);

    console.log(`✅ Completed step ${WorkflowStep[currentStep]}, advancing to ${WorkflowStep[newCurrentStep]}`);
    
    return { valid: true, errors: [] };
  }, [currentSession, mode]);

  /**
   * Get visual state of a step
   */
  const getStepState = useCallback((step: WorkflowStep): StepVisualState => {
    return getStepVisualState(currentSession, step, mode);
  }, [currentSession, mode]);

  /**
   * Check if navigation to step is allowed
   */
  const canGoTo = useCallback((step: WorkflowStep): boolean => {
    return canNavigateTo(currentSession, step, mode);
  }, [currentSession, mode]);

  /**
   * Validate current step without completing
   */
  const validateCurrentStep = useCallback((): ValidationResult => {
    if (!currentSession) {
      return { valid: false, errors: ['No active session'] };
    }
    const currentStep = currentSession.workflow?.currentStep ?? WorkflowStep.UPLOAD;
    return validateStepData(currentSession, currentStep);
  }, [currentSession]);

  // ============================================================================
  // SESSION OPERATIONS
  // ============================================================================

  const setWorkflowMode = (mode: WorkflowMode) => {
    setWorkflowModeState(mode);
    if (currentSession) {
      updateSessionData({
        workflow: {
          ...currentSession.workflow,
          mode,
        },
      });
    }
  };

  const createNewSession = (initialData?: Partial<AnalysisSession>) => {
    try {
      setIsLoading(true);
      const sessionData = {
        ...initialData,
        workflow: {
          mode: workflowMode,
          currentStep: WorkflowStep.UPLOAD,
          completedSteps: [],
          status: 'in-progress' as const,
          startedAt: new Date().toISOString(),
          stepHistory: [{ step: WorkflowStep.UPLOAD, enteredAt: new Date().toISOString() }],
          ...(initialData?.workflow || {}),
        },
      };
      const session = clinicalSessionService.createSession(sessionData);
      setCurrentSession(session);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSession = (sessionId: string) => {
    try {
      setIsLoading(true);
      const session = clinicalSessionService.getSession(sessionId);
      if (session) {
        clinicalSessionService.setCurrentSession(sessionId);
        setCurrentSession(session);
        if (session.workflow?.mode) {
          setWorkflowModeState(session.workflow.mode);
        }
        setError(null);
      } else {
        setError('Session not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSession = () => {
    if (!currentSession) return;
    try {
      clinicalSessionService.saveSession(currentSession);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save session');
    }
  };

  const updateSessionData = (updates: Partial<AnalysisSession>) => {
    if (!currentSession) return;
    const updatedSession = { ...currentSession, ...updates };
    setCurrentSession(updatedSession);
    clinicalSessionService.markDirty();
  };

  const deleteCurrentSession = () => {
    if (!currentSession) return;
    try {
      clinicalSessionService.deleteSession(currentSession.sessionId);
      setCurrentSession(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  };

  const clearError = () => setError(null);

  // ============================================================================
  // IMAGE OPERATIONS
  // ============================================================================

  const addImages = async (files: File[]): Promise<void> => {
    if (!currentSession) return;

    const newImages: ImageMetadata[] = [];

    for (const file of files) {
      const thumbnail = await createThumbnail(file);

      const imageMetadata: ImageMetadata = {
        imageId: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fileName: file.name,
        fileSize: file.size,
        uploadDate: new Date().toISOString(),
        thumbnail,
        analyzed: false,
      };

      newImages.push(imageMetadata);
    }

    const updatedImages = [...currentSession.images, ...newImages];
    updateSessionData({ 
      images: updatedImages,
      activeImageId: updatedImages[0]?.imageId || currentSession.activeImageId,
    });
    
    // Auto-complete upload step if images are added and we're on upload
    if (currentSession.workflow.currentStep === WorkflowStep.UPLOAD) {
      const completedSteps = [...(currentSession.workflow.completedSteps || [])];
      if (!completedSteps.includes(WorkflowStep.UPLOAD)) {
        completedSteps.push(WorkflowStep.UPLOAD);
        updateSessionData({
          images: updatedImages,
          activeImageId: updatedImages[0]?.imageId || currentSession.activeImageId,
          workflow: {
            ...currentSession.workflow,
            completedSteps,
          },
        });
      }
    }
  };

  const updateImage = (imageId: string, updates: Partial<ImageMetadata>) => {
    if (!currentSession) return;
    const updatedImages = currentSession.images.map(img =>
      img.imageId === imageId ? { ...img, ...updates } : img
    );
    updateSessionData({ images: updatedImages });
  };

  const deleteImage = (imageId: string) => {
    if (!currentSession) return;
    const updatedImages = currentSession.images.filter(img => img.imageId !== imageId);
    const updatedFindings = currentSession.findings.filter(f => 
      !f.coordinates || (f.coordinates as any).imageId !== imageId
    );
    const updatedMeasurements = currentSession.measurements.filter(m => 
      m.imageId !== imageId
    );
    let newActiveImageId = currentSession.activeImageId;
    if (currentSession.activeImageId === imageId) {
      newActiveImageId = updatedImages[0]?.imageId || undefined;
    }
    updateSessionData({ 
      images: updatedImages,
      findings: updatedFindings,
      measurements: updatedMeasurements,
      activeImageId: newActiveImageId,
    });
  };

  const setActiveImage = (imageId: string) => {
    if (!currentSession) return;
    updateSessionData({ activeImageId: imageId });
  };

  const createThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const maxSize = 200;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // ============================================================================
  // FINDINGS OPERATIONS
  // ============================================================================

  const addFinding = (finding: Finding) => {
    if (!currentSession) return;
    updateSessionData({ findings: [...currentSession.findings, finding] });
  };

  const updateFinding = (findingId: string, updates: Partial<Finding>) => {
    if (!currentSession) return;
    const updatedFindings = currentSession.findings.map(f =>
      f.findingId === findingId ? { ...f, ...updates } : f
    );
    updateSessionData({ findings: updatedFindings });
  };

  const deleteFinding = (findingId: string) => {
    if (!currentSession) return;
    const updatedFindings = currentSession.findings.filter(f => f.findingId !== findingId);
    updateSessionData({ findings: updatedFindings });
  };

  // ============================================================================
  // AUTO-SAVE
  // ============================================================================

  const enableAutoSave = (enabled: boolean) => {
    clinicalSessionService.setAutoSaveEnabled(enabled);
  };

  const forceSave = () => saveSession();

  // ============================================================================
  // LEGACY COMPATIBILITY (these wrap the new functions)
  // ============================================================================

  const advanceToStep = goToStep;
  
  const isStepCompleted = (step: WorkflowStep): boolean => {
    return currentSession?.workflow?.completedSteps?.includes(step) || false;
  };
  
  const canAdvanceToStep = canGoTo;
  
  const markStepCompleted = (step: WorkflowStep) => {
    console.warn('markStepCompleted is deprecated. Use completeCurrentStep() instead.');
    if (!currentSession) return;
    const completedSteps = [...(currentSession.workflow.completedSteps || [])];
    if (!completedSteps.includes(step)) {
      completedSteps.push(step);
      updateSessionData({
        workflow: {
          ...currentSession.workflow,
          completedSteps,
        },
      });
    }
  };
  
  const getCurrentStepIndex = (): number => {
    return currentSession?.workflow?.currentStep ?? 0;
  };
  
  const completeWorkflow = () => {
    if (!currentSession) return;
    clinicalSessionService.completeWorkflow(currentSession.sessionId);
    const updatedSession = clinicalSessionService.getSession(currentSession.sessionId);
    if (updatedSession) setCurrentSession(updatedSession);
  };
  
  const getVisibleWorkflowSteps = () => visibleSteps;

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value: WorkflowContextValue = {
    // Session state
    currentSession,
    isLoading,
    error,
    autoSaveState,

    // Workflow mode
    workflowMode: mode,
    setWorkflowMode,
    visibleSteps,

    // Session operations
    createNewSession,
    loadSession,
    saveSession,
    updateSessionData,
    deleteCurrentSession,

    // NEW Workflow operations
    goToStep,
    completeCurrentStep,
    getStepState,
    canGoTo,
    validateCurrentStep,
    
    // Progress
    progress,

    // Image operations
    addImages,
    updateImage,
    deleteImage,
    setActiveImage,

    // Findings operations
    addFinding,
    updateFinding,
    deleteFinding,

    // Auto-save controls
    enableAutoSave,
    forceSave,
    
    // Error handling
    clearError,
    
    // Legacy compatibility
    advanceToStep,
    isStepCompleted,
    canAdvanceToStep,
    markStepCompleted,
    getCurrentStepIndex,
    completeWorkflow,
    getVisibleWorkflowSteps,
  };

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
};
