/**
 * Workflow Utilities v2 - SIMPLIFIED
 * 
 * Design Philosophy: EXPLICIT > IMPLICIT
 * 
 * Instead of deriving completion from data (which is confusing and causes
 * race conditions), we use explicit state transitions:
 * 
 * 1. Step completion is STORED, not derived
 * 2. Navigation validation happens in ONE place
 * 3. State machine is simple: LOCKED → AVAILABLE → CURRENT → COMPLETED
 */

import { AnalysisSession, WorkflowStep, WorkflowMode, getVisibleSteps } from '../types/clinical.types';

// ============================================================================
// STEP VALIDATION - What data must exist for a step to be COMPLETABLE
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Check if a step has the required data to be marked as complete.
 * This is called when user tries to advance FROM this step.
 */
export function validateStepData(session: AnalysisSession | null, step: WorkflowStep): ValidationResult {
  if (!session) {
    return { valid: false, errors: ['No active session'] };
  }

  const errors: string[] = [];

  switch (step) {
    case WorkflowStep.UPLOAD:
      if ((session.images?.length || 0) === 0) {
        errors.push('Upload at least one image');
      }
      break;

    case WorkflowStep.AI_ANALYSIS:
      // AI analysis is considered valid if analysis was run
      const hasAnalysis = !!session.storedAnalysisResults || 
                          session.images?.some(img => img.analyzed) ||
                          (session.findings?.length || 0) > 0;
      if (!hasAnalysis) {
        errors.push('Run AI analysis on the uploaded images');
      }
      break;

    case WorkflowStep.PATIENT_INFO:
      if (!session.patientInfo?.patientId?.trim()) {
        errors.push('Enter a Patient ID');
      }
      break;

    case WorkflowStep.MEASUREMENTS:
      // Measurements are optional - always valid
      break;

    case WorkflowStep.ASSESSMENT:
      if (session.assessment?.biradsCategory === undefined || 
          session.assessment?.biradsCategory === null) {
        errors.push('Select a BI-RADS category');
      }
      break;

    case WorkflowStep.REPORT:
      if (!session.assessment?.impression?.trim()) {
        errors.push('Write a clinical impression');
      }
      if (session.assessment?.biradsCategory === undefined) {
        errors.push('BI-RADS category required for report');
      }
      if (!session.patientInfo?.patientId?.trim()) {
        errors.push('Patient information required for report');
      }
      break;

    case WorkflowStep.FINALIZE:
      // All previous required steps must be done
      if (!session.patientInfo?.patientId?.trim()) {
        errors.push('Patient information required');
      }
      if (session.assessment?.biradsCategory === undefined) {
        errors.push('BI-RADS assessment required');
      }
      break;
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// NAVIGATION - What steps can the user access
// ============================================================================

/**
 * Check if user can navigate TO a step.
 * This is the SINGLE source of truth for navigation permissions.
 */
export function canNavigateTo(
  session: AnalysisSession | null, 
  targetStep: WorkflowStep, 
  mode: WorkflowMode
): boolean {
  if (!session) return false;

  const currentStep = session.workflow?.currentStep ?? WorkflowStep.UPLOAD;

  // Rule 1: Can always go back to previous steps or stay on current
  if (targetStep <= currentStep) return true;

  // Rule 2: Can only go forward if we've been there before OR prerequisites are met
  const visitedSteps = session.workflow?.stepHistory?.map(h => h.step) || [];
  if (visitedSteps.includes(targetStep)) return true;

  // Rule 3: Check prerequisites for forward navigation
  return checkPrerequisites(session, targetStep, mode);
}

/**
 * Check if prerequisites are met to move forward to a step
 */
function checkPrerequisites(
  session: AnalysisSession, 
  targetStep: WorkflowStep, 
  mode: WorkflowMode
): boolean {
  // Get visible steps for this mode
  const visibleSteps = getVisibleSteps(mode);
  const visibleStepIds = visibleSteps.map(s => s.step);
  
  // If step isn't visible in this mode, can't navigate to it
  if (!visibleStepIds.includes(targetStep)) {
    return false;
  }

  // Prerequisites based on workflow mode
  if (mode === 'quick') {
    return checkQuickModePrereqs(session, targetStep);
  } else {
    return checkClinicalModePrereqs(session, targetStep);
  }
}

function checkQuickModePrereqs(session: AnalysisSession, step: WorkflowStep): boolean {
  switch (step) {
    case WorkflowStep.UPLOAD:
      return true;
    case WorkflowStep.AI_ANALYSIS:
      return (session.images?.length || 0) > 0;
    case WorkflowStep.ASSESSMENT:
      return hasAnalysisData(session);
    default:
      return true;
  }
}

function checkClinicalModePrereqs(session: AnalysisSession, step: WorkflowStep): boolean {
  switch (step) {
    case WorkflowStep.UPLOAD:
      return true;
    case WorkflowStep.AI_ANALYSIS:
      return (session.images?.length || 0) > 0;
    case WorkflowStep.PATIENT_INFO:
      return true; // Can enter patient info anytime
    case WorkflowStep.MEASUREMENTS:
      return hasAnalysisData(session);
    case WorkflowStep.ASSESSMENT:
      return hasAnalysisData(session);
    case WorkflowStep.REPORT:
      return hasAssessmentData(session) && hasPatientId(session);
    case WorkflowStep.FINALIZE:
      return hasReportData(session);
    default:
      return true;
  }
}

// Helper functions for prerequisite checks
function hasAnalysisData(session: AnalysisSession): boolean {
  return !!session.storedAnalysisResults || 
         session.images?.some(img => img.analyzed) ||
         (session.findings?.length || 0) > 0;
}

function hasAssessmentData(session: AnalysisSession): boolean {
  return session.assessment?.biradsCategory !== undefined &&
         session.assessment?.biradsCategory !== null;
}

function hasPatientId(session: AnalysisSession): boolean {
  return !!(session.patientInfo?.patientId?.trim());
}

function hasReportData(session: AnalysisSession): boolean {
  return hasAssessmentData(session) && 
         !!(session.assessment?.impression?.trim());
}

// ============================================================================
// STEP STATE - Visual state for rendering
// ============================================================================

export type StepVisualState = 'locked' | 'available' | 'current' | 'completed';

/**
 * Get the visual state of a step for UI rendering.
 */
export function getStepVisualState(
  session: AnalysisSession | null,
  step: WorkflowStep,
  mode: WorkflowMode
): StepVisualState {
  if (!session) return 'locked';

  const currentStep = session.workflow?.currentStep ?? WorkflowStep.UPLOAD;

  // Check if step is in completedSteps array (explicit completion)
  const isCompleted = session.workflow?.completedSteps?.includes(step) || false;
  if (isCompleted) {
    return 'completed';
  }

  // Check if this is the current step
  if (step === currentStep) {
    return 'current';
  }

  // Check if step is navigable
  if (canNavigateTo(session, step, mode)) {
    return 'available';
  }

  return 'locked';
}

// ============================================================================
// PROGRESS CALCULATION
// ============================================================================

/**
 * Calculate completion percentage based on VISIBLE steps only.
 */
export function calculateProgress(session: AnalysisSession | null, mode: WorkflowMode): {
  completed: number;
  total: number;
  percentage: number;
} {
  if (!session) {
    return { completed: 0, total: 0, percentage: 0 };
  }

  const visibleSteps = getVisibleSteps(mode);
  const completedSteps = session.workflow?.completedSteps || [];
  
  // Count how many VISIBLE steps are in the completedSteps array
  const completedVisible = visibleSteps.filter(s => 
    completedSteps.includes(s.step)
  ).length;

  const total = visibleSteps.length;
  const percentage = total > 0 ? Math.round((completedVisible / total) * 100) : 0;

  return { completed: completedVisible, total, percentage };
}

// ============================================================================
// NEXT STEP CALCULATION
// ============================================================================

/**
 * Get the next step in the workflow based on visible steps.
 */
export function getNextVisibleStep(
  session: AnalysisSession | null, 
  currentStep: WorkflowStep, 
  mode: WorkflowMode
): WorkflowStep | null {
  if (!session) return null;

  const visibleSteps = getVisibleSteps(mode);
  const currentIndex = visibleSteps.findIndex(s => s.step === currentStep);
  
  if (currentIndex === -1 || currentIndex >= visibleSteps.length - 1) {
    return null; // No next step
  }

  return visibleSteps[currentIndex + 1].step;
}

/**
 * Get the previous step in the workflow based on visible steps.
 */
export function getPreviousVisibleStep(
  session: AnalysisSession | null, 
  currentStep: WorkflowStep, 
  mode: WorkflowMode
): WorkflowStep | null {
  if (!session) return null;

  const visibleSteps = getVisibleSteps(mode);
  const currentIndex = visibleSteps.findIndex(s => s.step === currentStep);
  
  if (currentIndex <= 0) {
    return null; // No previous step
  }

  return visibleSteps[currentIndex - 1].step;
}
