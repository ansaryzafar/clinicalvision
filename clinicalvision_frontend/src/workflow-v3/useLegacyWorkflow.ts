/**
 * useLegacyWorkflow Hook
 * 
 * Provides the old WorkflowContext API using V3 implementation underneath.
 * This allows gradual migration - components can continue using the old API
 * while V3 handles persistence and state management correctly.
 */

import { useCallback, useMemo } from 'react';
import { useWorkflow } from './useWorkflow';
import {
  WorkflowStep as V3WorkflowStep,
  WorkflowMode as V3WorkflowMode,
  WorkflowSession,
  ImageData as V3ImageData,
} from './types';
import {
  toV3Step,
  toLegacyStep,
  toV3Mode,
  toLegacyMode,
  toV3ImageData,
  toV3AnalysisResults,
  toLegacySession,
  toLegacyAnalysisResult,
} from './adapter';
import {
  WorkflowStep as LegacyWorkflowStep,
  WorkflowMode as LegacyWorkflowMode,
  AnalysisSession,
  StoredAnalysisResult,
  ImageMetadata,
} from '../types/clinical.types';

/**
 * Hook that provides legacy WorkflowContext API using V3 implementation
 */
export function useLegacyWorkflow() {
  const {
    session,
    isLoading,
    error,
    createSession: v3CreateSession,
    updateSession: v3UpdateSession,
    navigateToStep: v3NavigateToStep,
    deleteSession: v3DeleteSession,
    clearError,
    isStepComplete,
    canNavigateToStep,
    getStepState,
    completionPercentage,
  } = useWorkflow();

  // Convert V3 session to legacy format
  const currentSession = useMemo(() => {
    if (!session) return null;
    return toLegacySession(session) as AnalysisSession;
  }, [session]);

  // Get current workflow mode
  const workflowMode = useMemo<LegacyWorkflowMode>(() => {
    return session ? toLegacyMode(session.mode) : 'clinical';
  }, [session]);

  // Set workflow mode
  const setWorkflowMode = useCallback((mode: LegacyWorkflowMode) => {
    if (session) {
      v3UpdateSession({ mode: toV3Mode(mode) });
    }
  }, [session, v3UpdateSession]);

  // Create new session with legacy API
  const createNewSession = useCallback((initialData?: Partial<AnalysisSession>) => {
    const mode = initialData?.workflow?.mode || 'clinical';
    const newSession = v3CreateSession(toV3Mode(mode));
    
    // If there's initial patient info, update it
    if (initialData?.patientInfo) {
      v3UpdateSession({
        patientInfo: {
          ...newSession.patientInfo,
          id: initialData.patientInfo.patientId || '',
          name: initialData.patientInfo.name || '',
          dateOfBirth: initialData.patientInfo.dateOfBirth || '',
          gender: (initialData.patientInfo.gender || '') as '' | 'male' | 'female' | 'other',
        },
      });
    }
    
    return newSession;
  }, [v3CreateSession, v3UpdateSession]);

  // Update session data with legacy API
  const updateSessionData = useCallback((updates: Partial<AnalysisSession>) => {
    if (!session) return;

    const v3Updates: Partial<WorkflowSession> = {};

    // Convert images
    if (updates.images) {
      v3Updates.images = updates.images.map((img): V3ImageData => ({
        id: img.imageId,
        file: null,
        fileName: img.fileName,
        fileSize: img.fileSize,
        preview: img.thumbnail || img.imageDataUrl || '',
        uploadedAt: img.uploadDate,
        metadata: {
          width: 0,
          height: 0,
          type: 'mammogram',
          view: img.viewType as 'CC' | 'MLO' | undefined,
          laterality: img.laterality === 'L' ? 'left' : img.laterality === 'R' ? 'right' : undefined,
        },
      }));
    }

    // Convert analysis results
    if (updates.storedAnalysisResults) {
      v3Updates.analysisResults = toV3AnalysisResults(updates.storedAnalysisResults);
    }

    // Convert patient info
    if (updates.patientInfo) {
      v3Updates.patientInfo = {
        ...session.patientInfo,
        id: updates.patientInfo.patientId || session.patientInfo.id,
        name: updates.patientInfo.patientName || session.patientInfo.name,
        dateOfBirth: updates.patientInfo.dateOfBirth || session.patientInfo.dateOfBirth,
        gender: (updates.patientInfo.gender || session.patientInfo.gender) as 'male' | 'female' | 'other' | '',
      };
    }

    // Convert assessment
    if (updates.assessment) {
      const biradsValue = updates.assessment.biradsCategory ?? session.assessment.birads;
      v3Updates.assessment = {
        ...session.assessment,
        birads: typeof biradsValue === 'number' ? biradsValue : (biradsValue as unknown as number),
        impression: updates.assessment.impression ?? session.assessment.impression,
        // Legacy uses 'recommendation' (singular), V3 uses 'recommendations' (plural)
        recommendations: updates.assessment.recommendation ?? session.assessment.recommendations,
        notes: session.assessment.notes,
      };
    }

    // Convert workflow mode
    if (updates.workflow?.mode) {
      v3Updates.mode = toV3Mode(updates.workflow.mode);
    }

    // Convert current step
    if (updates.workflow?.currentStep !== undefined) {
      v3Updates.currentStep = toV3Step(updates.workflow.currentStep);
    }

    // Convert status
    if (updates.workflow?.status) {
      v3Updates.status = updates.workflow.status === 'finalized' || updates.workflow.status === 'completed' 
        ? 'completed' 
        : 'active';
    }

    // Convert findings to measurements (closest V3 equivalent for tracking)
    if (updates.findings) {
      v3Updates.measurements = updates.findings.map((f, i) => ({
        id: f.findingId || `finding_${i}`,
        type: 'annotation' as const,
        label: f.findingType,
        value: f.aiConfidence || 0,
        unit: '%',
        createdAt: new Date().toISOString(),
        coordinates: f.coordinates ? {
          startX: f.coordinates.x,
          startY: f.coordinates.y,
          endX: f.coordinates.x + (f.coordinates.width || 0),
          endY: f.coordinates.y + (f.coordinates.height || 0),
        } : undefined,
      }));
    }

    v3UpdateSession(v3Updates);
  }, [session, v3UpdateSession]);

  // Advance to step (legacy API)
  const advanceToStep = useCallback((step: LegacyWorkflowStep): boolean => {
    return v3NavigateToStep(toV3Step(step));
  }, [v3NavigateToStep]);

  // Navigate to step (alias for advanceToStep)
  const navigateToStep = advanceToStep;

  // Mark step completed (no-op in V3 - completion is derived)
  const markStepCompleted = useCallback((_step: LegacyWorkflowStep) => {
    // In V3, step completion is derived from session data
    // This function is a no-op but kept for API compatibility
    console.debug('[V3 Adapter] markStepCompleted is a no-op - completion is derived from data');
  }, []);

  // Check if step is completed (using V3 derived logic)
  const isStepCompletedLegacy = useCallback((step: LegacyWorkflowStep): boolean => {
    return isStepComplete(toV3Step(step));
  }, [isStepComplete]);

  // Can advance to step (using V3 logic)
  const canAdvanceToStep = useCallback((step: LegacyWorkflowStep): boolean => {
    return canNavigateToStep(toV3Step(step));
  }, [canNavigateToStep]);

  // Get step state (using V3 logic)
  const getStepStateLegacy = useCallback((step: LegacyWorkflowStep) => {
    return getStepState(toV3Step(step));
  }, [getStepState]);

  // Auto-save state (V3 saves immediately, so these are mostly no-ops)
  // NOTE: Uses 'lastSaved' (not 'lastSaveTime') for compatibility with AutoSaveStatus component
  const autoSaveState = useMemo(() => ({
    isDirty: false,
    lastSaved: session?.updatedAt || new Date().toISOString(),
    savingInProgress: false,
    enabled: true,
  }), [session?.updatedAt]);

  const enableAutoSave = useCallback((_enabled: boolean) => {
    // V3 always saves immediately, no separate auto-save toggle
    console.debug('[V3 Adapter] enableAutoSave is a no-op - V3 saves immediately');
  }, []);

  const forceSave = useCallback(() => {
    // V3 always saves immediately, no need for force save
    console.debug('[V3 Adapter] forceSave is a no-op - V3 saves immediately');
  }, []);

  const saveSession = useCallback(() => {
    // V3 always saves immediately, no need for explicit save
    console.debug('[V3 Adapter] saveSession is a no-op - V3 saves immediately');
  }, []);

  // Load session by ID
  const loadSession = useCallback((sessionId: string) => {
    // V3 handles this via session picker or navigation
    console.debug('[V3 Adapter] loadSession - to be implemented with session management');
    return session && session.id === sessionId;
  }, [session]);

  // Complete workflow
  const completeWorkflow = useCallback(() => {
    if (session) {
      v3UpdateSession({ status: 'completed' });
    }
  }, [session, v3UpdateSession]);

  // Get visible workflow steps
  const getVisibleWorkflowSteps = useCallback(() => {
    const mode = session?.mode || 'clinical';
    return mode === 'quick' 
      ? [LegacyWorkflowStep.UPLOAD, LegacyWorkflowStep.AI_ANALYSIS]
      : [
          LegacyWorkflowStep.UPLOAD,
          LegacyWorkflowStep.AI_ANALYSIS,
          LegacyWorkflowStep.PATIENT_INFO,
          LegacyWorkflowStep.MEASUREMENTS,
          LegacyWorkflowStep.ASSESSMENT,
          LegacyWorkflowStep.REPORT,
          LegacyWorkflowStep.FINALIZE,
        ];
  }, [session?.mode]);

  // Validate step data
  const validateStepData = useCallback((_step: LegacyWorkflowStep) => {
    return { valid: true, errors: [] as string[] };
  }, []);

  // Get current step index
  const getCurrentStepIndex = useCallback(() => {
    return session?.currentStep || 0;
  }, [session?.currentStep]);

  // Delete current session
  const deleteCurrentSession = useCallback(() => {
    if (session) {
      v3DeleteSession();
    }
  }, [session, v3DeleteSession]);

  // Image management
  const addImages = useCallback(async (files: File[]) => {
    if (!session) return;
    
    const newImages: V3ImageData[] = [];
    for (const file of files) {
      const preview = await createThumbnail(file);
      newImages.push({
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        fileName: file.name,
        fileSize: file.size,
        preview,
        uploadedAt: new Date().toISOString(),
        metadata: {
          width: 0,
          height: 0,
          type: 'mammogram',
        },
      });
    }
    
    v3UpdateSession({ images: [...session.images, ...newImages] });
  }, [session, v3UpdateSession]);

  const updateImage = useCallback((imageId: string, updates: Partial<ImageMetadata>) => {
    if (!session) return;
    
    const updatedImages = session.images.map(img =>
      img.id === imageId ? { 
        ...img, 
        fileName: updates.fileName ?? img.fileName,
        metadata: {
          ...img.metadata,
          view: updates.viewType as 'CC' | 'MLO' | undefined,
          laterality: updates.laterality === 'L' ? 'left' : updates.laterality === 'R' ? 'right' : img.metadata.laterality,
        },
      } : img
    );
    v3UpdateSession({ images: updatedImages });
  }, [session, v3UpdateSession]);

  const deleteImage = useCallback((imageId: string) => {
    if (!session) return;
    const updatedImages = session.images.filter(img => img.id !== imageId);
    v3UpdateSession({ images: updatedImages });
  }, [session, v3UpdateSession]);

  const setActiveImage = useCallback((imageId: string) => {
    if (!session) return;
    v3UpdateSession({ activeImageId: imageId });
  }, [session, v3UpdateSession]);

  // Finding management
  const addFinding = useCallback((finding: any) => {
    if (!session || !session.analysisResults) return;
    const newFinding = {
      id: finding.findingId || `finding_${Date.now()}`,
      type: finding.findingType || 'mass',
      location: finding.location?.description || '',
      severity: 'medium' as const,
      description: finding.description || '',
    };
    v3UpdateSession({
      analysisResults: {
        ...session.analysisResults,
        findings: [...(session.analysisResults.findings || []), newFinding],
      },
    });
  }, [session, v3UpdateSession]);

  const updateFinding = useCallback((findingId: string, updates: any) => {
    if (!session || !session.analysisResults) return;
    const updatedFindings = (session.analysisResults.findings || []).map(f =>
      f.id === findingId ? { ...f, ...updates } : f
    );
    v3UpdateSession({
      analysisResults: {
        ...session.analysisResults,
        findings: updatedFindings,
      },
    });
  }, [session, v3UpdateSession]);

  const deleteFinding = useCallback((findingId: string) => {
    if (!session || !session.analysisResults) return;
    const updatedFindings = (session.analysisResults.findings || []).filter(f => f.id !== findingId);
    v3UpdateSession({
      analysisResults: {
        ...session.analysisResults,
        findings: updatedFindings,
      },
    });
  }, [session, v3UpdateSession]);

  return {
    // State
    currentSession,
    isLoading,
    error,
    autoSaveState,
    
    // Mode
    workflowMode,
    setWorkflowMode,
    
    // Actions
    createNewSession,
    updateSessionData,
    advanceToStep,
    navigateToStep,
    deleteSession: v3DeleteSession,
    deleteCurrentSession,
    clearError,
    markStepCompleted, // No-op in V3
    completeWorkflow,
    loadSession,
    saveSession,
    enableAutoSave,
    forceSave,
    
    // Image management
    addImages,
    updateImage,
    deleteImage,
    setActiveImage,
    
    // Finding management
    addFinding,
    updateFinding,
    deleteFinding,
    
    // Derived state
    isStepCompleted: isStepCompletedLegacy,
    canAdvanceToStep,
    getStepState: getStepStateLegacy,
    completionPercentage,
    getVisibleWorkflowSteps,
    validateStepData,
    getCurrentStepIndex,
    
    // V3 direct access (for components that want to use V3 directly)
    v3Session: session,
    v3UpdateSession,
  };
}

// Helper function to create thumbnail from image file
function createThumbnail(file: File): Promise<string> {
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
      img.onerror = () => resolve('');
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}export type LegacyWorkflowHook = ReturnType<typeof useLegacyWorkflow>;
