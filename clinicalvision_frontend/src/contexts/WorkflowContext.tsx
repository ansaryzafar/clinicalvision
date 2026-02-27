/**
 * Workflow Context
 * Provides centralized state management for clinical workflow
 * 
 * Design Principles (Paton et al. 2021 + VoxLogicA UI Thesis):
 * - Progressive Disclosure: Show relevant steps based on workflow mode
 * - Error Prevention: Validate before advancing (Nielsen Heuristic #5)
 * - Flexibility: Support both quick and clinical workflows (Nielsen Heuristic #7)
 * - Visibility of System Status: Clear progress indication (Nielsen Heuristic #1)
 * 
 * CRITICAL: Step completion is DERIVED from actual session data, not manually tracked.
 * This eliminates sync issues between React state and localStorage.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  AnalysisSession, 
  WorkflowStep, 
  Finding, 
  AutoSaveState, 
  ImageMetadata,
  WorkflowMode,
  BIRADS,
  getVisibleSteps,
  WORKFLOW_STEPS,
} from '../types/clinical.types';
import { clinicalSessionService } from '../services/clinicalSession.service';
import { isStepActuallyCompleted } from '../utils/workflowUtils';

interface WorkflowContextValue {
  // Session state
  currentSession: AnalysisSession | null;
  isLoading: boolean;
  error: string | null;
  autoSaveState: AutoSaveState;

  // Workflow mode
  workflowMode: WorkflowMode;
  setWorkflowMode: (mode: WorkflowMode) => void;
  getVisibleWorkflowSteps: () => typeof WORKFLOW_STEPS;

  // Session operations
  createNewSession: (initialData?: Partial<AnalysisSession>) => void;
  loadSession: (sessionId: string) => void;
  saveSession: () => void;
  updateSessionData: (updates: Partial<AnalysisSession>) => void;
  deleteCurrentSession: () => void;

  // Workflow operations
  advanceToStep: (step: WorkflowStep) => void;
  completeWorkflow: () => void;
  getCurrentStepIndex: () => number;
  isStepCompleted: (step: WorkflowStep) => boolean;
  canAdvanceToStep: (step: WorkflowStep) => boolean;
  validateStepData: (step: WorkflowStep) => { valid: boolean; errors: string[] };
  markStepCompleted: (step: WorkflowStep) => void;

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
  
  // Error handling (Nielsen Heuristic #9)
  clearError: () => void;
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

  /**
   * Load current session on mount and repair workflow state if needed
   * 
   * CRITICAL: Workflow completion is now DERIVED from actual session data,
   * NOT from the completedSteps array. We also ensure currentStep is correct.
   */
  useEffect(() => {
    const session = clinicalSessionService.getCurrentSession();
    if (session) {
      console.log(`📥 Loading session ${session.sessionId}`);
      
      // Log derived completion state for debugging
      const derivedState = {
        upload: isStepActuallyCompleted(session, WorkflowStep.UPLOAD),
        aiAnalysis: isStepActuallyCompleted(session, WorkflowStep.AI_ANALYSIS),
        patientInfo: isStepActuallyCompleted(session, WorkflowStep.PATIENT_INFO),
        assessment: isStepActuallyCompleted(session, WorkflowStep.ASSESSMENT),
      };
      console.log(`📊 Derived completion state:`, derivedState);
      
      // Repair currentStep if it doesn't match the actual progress
      let needsRepair = false;
      let newCurrentStep = session.workflow.currentStep;
      
      // If AI analysis is done but currentStep is still UPLOAD, advance it
      if (derivedState.aiAnalysis && session.workflow.currentStep === WorkflowStep.UPLOAD) {
        newCurrentStep = WorkflowStep.ASSESSMENT; // Skip to assessment after AI
        needsRepair = true;
        console.log('🔧 Repairing currentStep: AI done but stuck on UPLOAD');
      }
      
      // If Upload is done but currentStep is UPLOAD and AI not done, advance to AI
      if (derivedState.upload && !derivedState.aiAnalysis && 
          session.workflow.currentStep === WorkflowStep.UPLOAD) {
        newCurrentStep = WorkflowStep.AI_ANALYSIS;
        needsRepair = true;
        console.log('🔧 Repairing currentStep: Images uploaded, advancing to AI Analysis');
      }
      
      if (needsRepair) {
        session.workflow.currentStep = newCurrentStep;
        clinicalSessionService.saveSession(session);
        console.log(`✅ Repaired: currentStep now ${WorkflowStep[newCurrentStep]}`);
      }
      
      setCurrentSession(session);
      // Restore workflow mode from session if available
      if (session.workflow?.mode) {
        setWorkflowModeState(session.workflow.mode);
      }
    }
  }, []);

  // Auto-save state sync
  useEffect(() => {
    const interval = setInterval(() => {
      setAutoSaveState(clinicalSessionService.getAutoSaveState());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Set workflow mode and update session
   * Implements "Flexibility and efficiency of use" (Nielsen Heuristic #7)
   */
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

  /**
   * Get visible workflow steps based on current mode
   * Implements Progressive Disclosure (VoxLogicA UI thesis)
   */
  const getVisibleWorkflowSteps = () => {
    return getVisibleSteps(workflowMode);
  };

  /**
   * Clear error state
   * Implements "Help users recover from errors" (Nielsen Heuristic #9)
   */
  const clearError = () => {
    setError(null);
  };

  const createNewSession = (initialData?: Partial<AnalysisSession>) => {
    try {
      setIsLoading(true);
      // Include workflow mode in initial data
      const sessionData = {
        ...initialData,
        workflow: {
          mode: workflowMode,
          currentStep: WorkflowStep.UPLOAD, // Start with upload
          completedSteps: [],
          status: 'in-progress' as const,
          startedAt: new Date().toISOString(),
          stepHistory: [],
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

  const advanceToStep = (step: WorkflowStep) => {
    if (!currentSession) {
      console.error('Cannot advance: No active session');
      setError('No active session. Please start a new analysis.');
      return;
    }

    const mode = currentSession.workflow?.mode || workflowMode;
    
    // Clear any previous errors
    setError(null);

    /**
     * QUICK MODE: Minimal validation for fast screening
     * Only requires: Upload → AI Analysis
     * Patient info can be added later before finalization
     */
    if (mode === 'quick') {
      // In quick mode, only block finalization without patient info
      if (step === WorkflowStep.FINALIZE) {
        if (!currentSession.patientInfo?.patientId) {
          setError('Patient information required before finalizing. Add patient details to complete the case.');
          return;
        }
      }
      
      // Allow free navigation in quick mode except finalization
      clinicalSessionService.advanceWorkflow(currentSession.sessionId, step);
      const updatedSession = clinicalSessionService.getSession(currentSession.sessionId);
      if (updatedSession) {
        setCurrentSession(updatedSession);
      }
      return;
    }

    /**
     * CLINICAL MODE: Full validation for diagnostic workflow
     * Enforces logical sequence with helpful error messages
     */
    
    // Track step entry for KLM timing analysis
    const stepEntry = {
      step,
      enteredAt: new Date().toISOString(),
    };

    // Validation: Upload is always required first in clinical mode
    if (step > WorkflowStep.AI_ANALYSIS && !isStepCompleted(WorkflowStep.UPLOAD)) {
      setError('Please upload at least one image to continue.');
      return;
    }

    // Validation: AI Analysis required before measurements/assessment
    if (step >= WorkflowStep.MEASUREMENTS && !isStepCompleted(WorkflowStep.AI_ANALYSIS)) {
      setError('Please complete AI analysis before proceeding to measurements.');
      return;
    }

    // Validation: Patient info required before report generation
    if (step >= WorkflowStep.REPORT && !currentSession.patientInfo?.patientId) {
      setError('Patient information required for report generation. Please add patient details.');
      return;
    }

    // Validation: Assessment required before report
    if (step >= WorkflowStep.REPORT && !isStepCompleted(WorkflowStep.ASSESSMENT)) {
      setError('Please complete the assessment before generating a report.');
      return;
    }

    // Validation: Report required before finalization
    if (step === WorkflowStep.FINALIZE && !isStepCompleted(WorkflowStep.REPORT)) {
      setError('Please generate a report before finalizing the case.');
      return;
    }
    
    clinicalSessionService.advanceWorkflow(currentSession.sessionId, step);
    const updatedSession = clinicalSessionService.getSession(currentSession.sessionId);
    if (updatedSession) {
      // Update step history for timing analysis
      const stepHistory = [...(updatedSession.workflow.stepHistory || []), stepEntry];
      updatedSession.workflow.stepHistory = stepHistory;
      setCurrentSession(updatedSession);
    }
  };

  /**
   * @deprecated - Step completion is now DERIVED from session data.
   * This function is kept for backward compatibility but is a NO-OP.
   * 
   * Completion is determined by isStepActuallyCompleted() from workflowUtils.ts:
   * - UPLOAD: session.images.length > 0
   * - AI_ANALYSIS: session.storedAnalysisResults exists OR session.findings.length > 0
   * - PATIENT_INFO: session.patientInfo.patientId.trim().length > 0
   * - MEASUREMENTS: session.measurements.length > 0
   * - ASSESSMENT: session.assessment.biradsCategory !== null
   * - REPORT: session.assessment.impression exists AND biradsCategory set
   * - FINALIZE: session.workflow.status === 'finalized' OR 'completed'
   */
  const markStepCompleted = (step: WorkflowStep) => {
    console.warn(`⚠️ markStepCompleted(${WorkflowStep[step]}) is deprecated. Step completion is now DERIVED from session data.`);
    // NO-OP - completion is derived from actual data
  };

  const completeWorkflow = () => {
    if (!currentSession) return;
    clinicalSessionService.completeWorkflow(currentSession.sessionId);
    const updatedSession = clinicalSessionService.getSession(currentSession.sessionId);
    if (updatedSession) {
      setCurrentSession(updatedSession);
    }
  };

  const getCurrentStepIndex = (): number => {
    return currentSession?.workflow.currentStep || 0;
  };

  /**
   * Check if a step is completed - DERIVED FROM ACTUAL DATA
   * Uses isStepActuallyCompleted from workflowUtils for single source of truth.
   * This replaces the old approach of checking workflow.completedSteps array.
   */
  const isStepCompleted = (step: WorkflowStep): boolean => {
    return isStepActuallyCompleted(currentSession, step);
  };

  const canAdvanceToStep = (step: WorkflowStep): boolean => {
    if (!currentSession) return false;

    const mode = currentSession.workflow?.mode || workflowMode;

    // Can always go back or stay on current step
    if (step <= currentSession.workflow.currentStep) return true;

    /**
     * QUICK MODE: Minimal prerequisites
     * Optimized for "time-to-first-result" (KLM efficiency)
     */
    if (mode === 'quick') {
      switch (step) {
        case WorkflowStep.UPLOAD:
          return true; // Always accessible
        case WorkflowStep.AI_ANALYSIS:
          return currentSession.images.length > 0; // Need images
        case WorkflowStep.PATIENT_INFO:
          return true; // Always accessible for adding later
        case WorkflowStep.ASSESSMENT:
          return isStepCompleted(WorkflowStep.AI_ANALYSIS);
        case WorkflowStep.FINALIZE:
          return !!currentSession.patientInfo?.patientId && isStepCompleted(WorkflowStep.AI_ANALYSIS);
        default:
          return true;
      }
    }

    /**
     * CLINICAL MODE: Full prerequisite checking
     * Ensures complete diagnostic documentation
     */
    switch (step) {
      case WorkflowStep.UPLOAD:
        return true; // Always start with upload
      case WorkflowStep.AI_ANALYSIS:
        return isStepCompleted(WorkflowStep.UPLOAD) || currentSession.images.length > 0;
      case WorkflowStep.PATIENT_INFO:
        return true; // Can add patient info at any time
      case WorkflowStep.MEASUREMENTS:
        return isStepCompleted(WorkflowStep.AI_ANALYSIS);
      case WorkflowStep.ASSESSMENT:
        return isStepCompleted(WorkflowStep.AI_ANALYSIS);
      case WorkflowStep.REPORT:
        return isStepCompleted(WorkflowStep.ASSESSMENT) && 
               !!currentSession.assessment?.biradsCategory &&
               !!currentSession.patientInfo?.patientId;
      case WorkflowStep.FINALIZE:
        return isStepCompleted(WorkflowStep.REPORT);
      default:
        return true;
    }
  };

  /**
   * Validate step data with user-friendly error messages
   * Implements "Help users recognize, diagnose, and recover from errors" (Nielsen #9)
   */
  const validateStepData = (step: WorkflowStep): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!currentSession) {
      errors.push('No active session. Please start a new analysis.');
      return { valid: false, errors };
    }

    const mode = currentSession.workflow?.mode || workflowMode;

    switch (step) {
      case WorkflowStep.UPLOAD:
        if (!currentSession.images || currentSession.images.length === 0) {
          errors.push('Please upload at least one mammogram image.');
        }
        break;

      case WorkflowStep.AI_ANALYSIS:
        if (!currentSession.images || currentSession.images.length === 0) {
          errors.push('No images available for analysis. Please upload images first.');
        }
        // Check if any image has been analyzed
        const analyzedImages = currentSession.images.filter(img => img.analyzed);
        if (analyzedImages.length === 0 && currentSession.findings.length === 0) {
          errors.push('AI analysis not yet completed. Please run analysis on uploaded images.');
        }
        break;

      case WorkflowStep.PATIENT_INFO:
        // Only validate in clinical mode
        if (mode === 'clinical') {
          if (!currentSession.patientInfo?.patientId) {
            errors.push('Patient ID is required.');
          }
          if (!currentSession.studyInfo?.studyId) {
            errors.push('Study ID is required for clinical documentation.');
          }
        }
        break;

      case WorkflowStep.ASSESSMENT:
        if (!currentSession.assessment?.biradsCategory && currentSession.assessment?.biradsCategory !== BIRADS.INCOMPLETE) {
          errors.push('Please select a BI-RADS category.');
        }
        if (mode === 'clinical' && !currentSession.assessment?.impression?.trim()) {
          errors.push('Clinical impression is required for the assessment.');
        }
        break;

      case WorkflowStep.REPORT:
        if (!currentSession.patientInfo?.patientId) {
          errors.push('Patient information required for report generation.');
        }
        if (!currentSession.assessment?.biradsCategory && currentSession.assessment?.biradsCategory !== BIRADS.INCOMPLETE) {
          errors.push('BI-RADS assessment required before generating report.');
        }
        break;

      case WorkflowStep.FINALIZE:
        if (!currentSession.patientInfo?.patientId) {
          errors.push('Patient information required before finalizing.');
        }
        if (!isStepCompleted(WorkflowStep.ASSESSMENT)) {
          errors.push('Assessment must be completed before finalizing.');
        }
        if (mode === 'clinical' && !isStepCompleted(WorkflowStep.REPORT)) {
          errors.push('Report must be generated before finalizing in clinical mode.');
        }
        break;

      default:
        break;
    }

    return { valid: errors.length === 0, errors };
  };

  const addFinding = (finding: Finding) => {
    if (!currentSession) return;
    
    const updatedFindings = [...currentSession.findings, finding];
    updateSessionData({ findings: updatedFindings });
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

  // Image management functions
  const addImages = async (files: File[]): Promise<void> => {
    if (!currentSession) return;

    const newImages: ImageMetadata[] = [];

    for (const file of files) {
      // Create thumbnail
      const thumbnail = await createThumbnail(file);

      const imageMetadata: ImageMetadata = {
        imageId: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fileName: file.name,
        fileSize: file.size,
        uploadDate: new Date().toISOString(),
        thumbnail,
        analyzed: false,
        // Optional metadata can be filled in later by user
        viewType: undefined,
        laterality: undefined,
        notes: undefined,
      };

      newImages.push(imageMetadata);
    }

    const updatedImages = [...currentSession.images, ...newImages];
    updateSessionData({ 
      images: updatedImages,
      activeImageId: updatedImages[0]?.imageId || currentSession.activeImageId,
    });
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
    
    // Also remove findings and measurements associated with this image
    const updatedFindings = currentSession.findings.filter(f => 
      !f.coordinates || (f.coordinates as any).imageId !== imageId
    );
    const updatedMeasurements = currentSession.measurements.filter(m => 
      m.imageId !== imageId
    );

    // If deleting active image, set new active image
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

  // Helper function to create thumbnail from image file
  const createThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Thumbnail size
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

  const enableAutoSave = (enabled: boolean) => {
    clinicalSessionService.setAutoSaveEnabled(enabled);
  };

  const forceSave = () => {
    saveSession();
  };

  const value: WorkflowContextValue = {
    currentSession,
    isLoading,
    error,
    autoSaveState,
    workflowMode,
    setWorkflowMode,
    getVisibleWorkflowSteps,
    createNewSession,
    loadSession,
    saveSession,
    updateSessionData,
    deleteCurrentSession,
    advanceToStep,
    completeWorkflow,
    getCurrentStepIndex,
    isStepCompleted,
    canAdvanceToStep,
    validateStepData,
    markStepCompleted,
    addImages,
    updateImage,
    deleteImage,
    setActiveImage,
    addFinding,
    updateFinding,
    deleteFinding,
    enableAutoSave,
    forceSave,
    clearError,
  };

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
};
