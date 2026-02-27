/**
 * Workflow Utilities
 * 
 * FIXED: This module derives workflow state from ACTUAL DATA ONLY.
 * 
 * CRITICAL FIX: We NO LONGER trust the completedSteps array in localStorage
 * because it can become corrupted/out-of-sync. Instead, we derive completion
 * status purely from the actual session data.
 * 
 * This eliminates:
 * - Patient Info showing green when empty (because it was in completedSteps)
 * - Steps showing complete when data doesn't support it
 * - State sync issues between React state and localStorage
 */

import { AnalysisSession, WorkflowStep, WorkflowMode, getVisibleSteps } from '../types/clinical.types';

/**
 * Determine if a step is completed based ONLY on ACTUAL SESSION DATA
 * 
 * CRITICAL: This function IGNORES the completedSteps array because it can be corrupted.
 * We derive completion status purely from whether the required data exists.
 */
export function isStepActuallyCompleted(session: AnalysisSession | null, step: WorkflowStep): boolean {
  if (!session) return false;

  // ONLY derive from actual data - DO NOT check completedSteps array
  switch (step) {
    case WorkflowStep.UPLOAD:
      // Complete when at least one image exists
      return (session.images?.length || 0) > 0;

    case WorkflowStep.AI_ANALYSIS:
      // Complete when we have stored analysis results OR findings from analysis
      // Check storedAnalysisResults which is set when analysis completes
      return !!session.storedAnalysisResults || 
             (session.findings?.length || 0) > 0 ||
             session.images?.some(img => img.analyzed === true) || false;

    case WorkflowStep.PATIENT_INFO:
      // CRITICAL: ONLY complete when patient ID has actual content (not empty/whitespace)
      // This was the bug - showing green when completedSteps had it but data was empty
      const patientId = session.patientInfo?.patientId;
      return typeof patientId === 'string' && patientId.trim().length > 0;

    case WorkflowStep.MEASUREMENTS:
      // Complete when measurements exist
      return (session.measurements?.length || 0) > 0;

    case WorkflowStep.ASSESSMENT:
      // Complete when BI-RADS category is selected (0 is valid - BIRADS.INCOMPLETE)
      const birads = session.assessment?.biradsCategory;
      return birads !== undefined && birads !== null;

    case WorkflowStep.REPORT:
      // Complete when report has impression AND BI-RADS
      const hasImpression = typeof session.assessment?.impression === 'string' && 
                           session.assessment.impression.trim().length > 0;
      const hasBirads = session.assessment?.biradsCategory !== undefined && 
                       session.assessment?.biradsCategory !== null;
      return hasImpression && hasBirads;

    case WorkflowStep.FINALIZE:
      // Complete when workflow status is finalized or completed
      return session.workflow?.status === 'finalized' || 
             session.workflow?.status === 'completed';

    default:
      return false;
  }
}

/**
 * Get all completed steps for a session
 * Derived from actual data - single source of truth
 */
export function getCompletedSteps(session: AnalysisSession | null): WorkflowStep[] {
  if (!session) return [];

  const allSteps = [
    WorkflowStep.UPLOAD,
    WorkflowStep.AI_ANALYSIS,
    WorkflowStep.PATIENT_INFO,
    WorkflowStep.MEASUREMENTS,
    WorkflowStep.ASSESSMENT,
    WorkflowStep.REPORT,
    WorkflowStep.FINALIZE,
  ];

  return allSteps.filter(step => isStepActuallyCompleted(session, step));
}

/**
 * Calculate completion percentage based on visible steps
 */
export function getCompletionPercentage(session: AnalysisSession | null, mode: WorkflowMode): number {
  if (!session) return 0;

  const visibleSteps = getVisibleSteps(mode);
  const completedVisible = visibleSteps.filter(s => isStepActuallyCompleted(session, s.step));

  if (visibleSteps.length === 0) return 0;
  return Math.round((completedVisible.length / visibleSteps.length) * 100);
}

/**
 * Get count of completed visible steps
 */
export function getCompletedVisibleStepsCount(session: AnalysisSession | null, mode: WorkflowMode): number {
  if (!session) return 0;

  const visibleSteps = getVisibleSteps(mode);
  return visibleSteps.filter(s => isStepActuallyCompleted(session, s.step)).length;
}

/**
 * Determine step state for visual rendering
 */
export type StepState = 'completed' | 'current' | 'available' | 'locked';

export function getStepState(
  session: AnalysisSession | null,
  step: WorkflowStep,
  currentStep: WorkflowStep,
  mode: WorkflowMode
): StepState {
  if (!session) return 'locked';

  // CRITICAL: Priority is current > completed > available > locked
  // Current step ALWAYS shows as current, even if complete
  // This gives users clear feedback about where they are
  
  // Priority 1: Current step
  if (step === currentStep) {
    return 'current';
  }

  // Priority 2: Completed steps
  if (isStepActuallyCompleted(session, step)) {
    return 'completed';
  }

  // Priority 3: Available (can navigate but not complete)
  if (canNavigateToStep(session, step, mode)) {
    return 'available';
  }

  // Priority 4: Locked
  return 'locked';
}

/**
 * Check if user can navigate to a step
 */
export function canNavigateToStep(
  session: AnalysisSession | null,
  step: WorkflowStep,
  mode: WorkflowMode
): boolean {
  if (!session) return false;

  // Can always go back or stay on current step
  if (step <= session.workflow.currentStep) return true;

  // Quick mode - minimal prerequisites
  if (mode === 'quick') {
    switch (step) {
      case WorkflowStep.UPLOAD:
        return true;
      case WorkflowStep.AI_ANALYSIS:
        return (session.images?.length || 0) > 0;
      case WorkflowStep.PATIENT_INFO:
        return true; // Can add anytime
      case WorkflowStep.ASSESSMENT:
        return isStepActuallyCompleted(session, WorkflowStep.AI_ANALYSIS);
      case WorkflowStep.FINALIZE:
        return !!(session.patientInfo?.patientId) && 
               isStepActuallyCompleted(session, WorkflowStep.AI_ANALYSIS);
      default:
        return true;
    }
  }

  // Clinical mode - full prerequisites
  switch (step) {
    case WorkflowStep.UPLOAD:
      return true;
    case WorkflowStep.AI_ANALYSIS:
      return isStepActuallyCompleted(session, WorkflowStep.UPLOAD);
    case WorkflowStep.PATIENT_INFO:
      return true; // Can add anytime
    case WorkflowStep.MEASUREMENTS:
      return isStepActuallyCompleted(session, WorkflowStep.AI_ANALYSIS);
    case WorkflowStep.ASSESSMENT:
      return isStepActuallyCompleted(session, WorkflowStep.AI_ANALYSIS);
    case WorkflowStep.REPORT:
      return isStepActuallyCompleted(session, WorkflowStep.ASSESSMENT) &&
             !!(session.patientInfo?.patientId);
    case WorkflowStep.FINALIZE:
      return isStepActuallyCompleted(session, WorkflowStep.REPORT);
    default:
      return true;
  }
}
