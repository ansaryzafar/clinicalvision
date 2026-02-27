/**
 * useWorkflow Hook - V3
 * 
 * React hook that combines state management with persistence.
 * 
 * CRITICAL DESIGN DECISION:
 * Every state update IMMEDIATELY persists to localStorage.
 * This prevents Bug #1 where state and storage diverged.
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';

import { sessionStorage } from './sessionStorage';
import {
  isStepComplete as engineIsStepComplete,
  canNavigateToStep as engineCanNavigateToStep,
  getStepState as engineGetStepState,
  getCompletionPercentage as engineGetCompletionPercentage,
  validateNavigation,
  getNextStep,
} from './workflowEngine';
import { shouldAutoAdvance } from './constants';
import {
  WorkflowSession,
  WorkflowStep,
  WorkflowMode,
  StepState,
  ValidationResult,
  createNewSession,
} from './types';

// ============================================================================
// TYPES
// ============================================================================

interface WorkflowContextValue {
  // State
  session: WorkflowSession | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createSession: (mode: WorkflowMode) => WorkflowSession;
  updateSession: (updates: Partial<WorkflowSession>) => void;
  navigateToStep: (step: WorkflowStep) => boolean;
  deleteSession: () => void;
  clearError: () => void;
  
  // Derived state (computed on every call)
  isStepComplete: (step: WorkflowStep) => boolean;
  canNavigateToStep: (step: WorkflowStep) => boolean;
  getStepState: (step: WorkflowStep) => StepState;
  validateStep: (step: WorkflowStep) => ValidationResult;
  completionPercentage: number;
}

// ============================================================================
// CONTEXT
// ============================================================================

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface WorkflowProviderProps {
  children: ReactNode;
}

export function WorkflowProvider({ children }: WorkflowProviderProps) {
  // State
  const [session, setSession] = useState<WorkflowSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to track if we're mounted (prevent state updates after unmount)
  const isMounted = useRef(true);
  
  // ========================================================================
  // INITIALIZATION
  // ========================================================================
  
  useEffect(() => {
    isMounted.current = true;
    
    // Restore session from storage
    const restoreSession = () => {
      try {
        const currentId = sessionStorage.getCurrentSessionId();
        if (currentId) {
          const savedSession = sessionStorage.getSession(currentId);
          if (savedSession && isMounted.current) {
            setSession(savedSession);
          }
        }
      } catch (err) {
        console.error('[useWorkflow] Error restoring session:', err);
        if (isMounted.current) {
          setError('Failed to restore session');
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };
    
    restoreSession();
    
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // ========================================================================
  // PERSISTENCE HELPER
  // ========================================================================
  
  /**
   * Persist session to storage.
   * This is called on EVERY update - no deferred saves.
   */
  const persistSession = useCallback((sessionToSave: WorkflowSession) => {
    try {
      sessionStorage.saveSession(sessionToSave);
    } catch (err) {
      console.error('[useWorkflow] Error saving session:', err);
      setError('Failed to save session');
    }
  }, []);
  
  // ========================================================================
  // ACTIONS
  // ========================================================================
  
  /**
   * Create a new workflow session.
   * Mode is explicitly provided - never read from localStorage (Bug #4 fix).
   */
  const createSession = useCallback((mode: WorkflowMode): WorkflowSession => {
    const newSession = createNewSession(mode);
    
    // Persist FIRST, then update state
    persistSession(newSession);
    sessionStorage.setCurrentSessionId(newSession.id);
    
    setSession(newSession);
    setError(null);
    
    return newSession;
  }, [persistSession]);
  
  /**
   * Update session with partial data.
   * IMMEDIATELY persists to localStorage (Bug #1 fix).
   */
  const updateSession = useCallback((updates: Partial<WorkflowSession>) => {
    setSession((prevSession) => {
      if (!prevSession) return null;
      
      const updatedSession: WorkflowSession = {
        ...prevSession,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      // IMMEDIATELY persist - this is the key fix for Bug #1
      persistSession(updatedSession);
      
      return updatedSession;
    });
  }, [persistSession]);
  
  /**
   * Navigate to a specific step.
   * Returns false if navigation is blocked.
   */
  const navigateToStep = useCallback((step: WorkflowStep): boolean => {
    if (!session) return false;
    
    // Validate navigation
    if (!engineCanNavigateToStep(session, step)) {
      return false;
    }
    
    // Update with immediate persistence
    const updatedSession: WorkflowSession = {
      ...session,
      currentStep: step,
      updatedAt: new Date().toISOString(),
    };
    
    persistSession(updatedSession);
    setSession(updatedSession);
    
    return true;
  }, [session, persistSession]);
  
  /**
   * Delete the current session.
   */
  const deleteSession = useCallback(() => {
    if (session) {
      sessionStorage.deleteSession(session.id);
    }
    sessionStorage.clearCurrentSession();
    setSession(null);
    setError(null);
  }, [session]);
  
  /**
   * Clear error state.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // ========================================================================
  // AUTO-ADVANCE LOGIC
  // ========================================================================
  
  /**
   * Auto-advance to next step when certain steps complete.
   * E.g., after AI analysis completes, move to next step.
   */
  useEffect(() => {
    if (!session) return;
    
    const currentStep = session.currentStep;
    
    // Check if current step should auto-advance
    if (shouldAutoAdvance(currentStep) && engineIsStepComplete(session, currentStep)) {
      const nextStep = getNextStep(session, currentStep);
      if (nextStep !== null && engineCanNavigateToStep(session, nextStep)) {
        // Auto-advance
        const updatedSession: WorkflowSession = {
          ...session,
          currentStep: nextStep,
          updatedAt: new Date().toISOString(),
        };
        
        persistSession(updatedSession);
        setSession(updatedSession);
      }
    }
  }, [session?.analysisResults]); // Only trigger on analysis change
  
  // ========================================================================
  // DERIVED STATE (Computed on every access)
  // ========================================================================
  
  const isStepComplete = useCallback((step: WorkflowStep): boolean => {
    if (!session) return false;
    return engineIsStepComplete(session, step);
  }, [session]);
  
  const canNavigateToStepFn = useCallback((step: WorkflowStep): boolean => {
    if (!session) return false;
    return engineCanNavigateToStep(session, step);
  }, [session]);
  
  const getStepState = useCallback((step: WorkflowStep): StepState => {
    if (!session) return 'locked';
    return engineGetStepState(session, step);
  }, [session]);
  
  const validateStep = useCallback((step: WorkflowStep): ValidationResult => {
    if (!session) return { valid: false, reason: 'No active session' };
    return validateNavigation(session, step);
  }, [session]);
  
  const completionPercentage = session
    ? engineGetCompletionPercentage(session)
    : 0;
  
  // ========================================================================
  // CONTEXT VALUE
  // ========================================================================
  
  const contextValue: WorkflowContextValue = {
    // State
    session,
    isLoading,
    error,
    
    // Actions
    createSession,
    updateSession,
    navigateToStep,
    deleteSession,
    clearError,
    
    // Derived
    isStepComplete,
    canNavigateToStep: canNavigateToStepFn,
    getStepState,
    validateStep,
    completionPercentage,
  };
  
  return (
    <WorkflowContext.Provider value={contextValue}>
      {children}
    </WorkflowContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to access workflow context.
 * Must be used within a WorkflowProvider.
 */
export function useWorkflow(): WorkflowContextValue {
  const context = useContext(WorkflowContext);
  
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  
  return context;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { WorkflowContextValue };
