/**
 * Workflow Engine - V3
 * 
 * Pure business logic functions for workflow management.
 * NO SIDE EFFECTS - these functions only compute results.
 * 
 * Key Design Decisions:
 * 1. All completion status is DERIVED from session data
 * 2. No separate "completedSteps" array to track
 * 3. Step state priority: current > completed > available > locked
 */

import { getVisibleStepNumbers } from './constants';
import {
  WorkflowSession,
  WorkflowStep,
  StepState,
  ValidationResult,
} from './types';

// ============================================================================
// COMPLETION CHECKS
// ============================================================================

/**
 * Check if a specific step is complete.
 * This is THE source of truth for step completion.
 * 
 * @param session - The workflow session
 * @param step - The step to check
 * @returns true if the step is complete
 */
export function isStepComplete(session: WorkflowSession, step: WorkflowStep): boolean {
  switch (step) {
    case WorkflowStep.UPLOAD:
      return session.images.length > 0;
    
    case WorkflowStep.AI_ANALYSIS:
      return (
        session.analysisResults !== null &&
        session.analysisResults.status === 'complete'
      );
    
    case WorkflowStep.PATIENT_INFO:
      return session.patientInfo.id.trim() !== '';
    
    case WorkflowStep.MEASUREMENTS:
      return session.measurements.length > 0;
    
    case WorkflowStep.ASSESSMENT:
      return session.assessment.birads !== null;
    
    case WorkflowStep.REPORT:
      return session.assessment.impression.trim() !== '';
    
    case WorkflowStep.FINALIZE:
      return session.status === 'completed';
    
    default:
      return false;
  }
}

// ============================================================================
// NAVIGATION RULES
// ============================================================================

/**
 * Check if navigation to a step is allowed.
 * This implements all prerequisite rules.
 * 
 * @param session - The workflow session
 * @param targetStep - The step to navigate to
 * @returns true if navigation is allowed
 */
export function canNavigateToStep(
  session: WorkflowSession,
  targetStep: WorkflowStep
): boolean {
  switch (targetStep) {
    case WorkflowStep.UPLOAD:
      // Always accessible
      return true;
    
    case WorkflowStep.AI_ANALYSIS:
      // Requires images uploaded
      return isStepComplete(session, WorkflowStep.UPLOAD);
    
    case WorkflowStep.PATIENT_INFO:
      // Always accessible (floating step)
      return true;
    
    case WorkflowStep.MEASUREMENTS:
      // Requires AI analysis complete
      return isStepComplete(session, WorkflowStep.AI_ANALYSIS);
    
    case WorkflowStep.ASSESSMENT:
      // Requires AI analysis complete
      return isStepComplete(session, WorkflowStep.AI_ANALYSIS);
    
    case WorkflowStep.REPORT:
      // Requires assessment complete AND patient ID
      return (
        isStepComplete(session, WorkflowStep.ASSESSMENT) &&
        isStepComplete(session, WorkflowStep.PATIENT_INFO)
      );
    
    case WorkflowStep.FINALIZE:
      // Requires report complete
      return isStepComplete(session, WorkflowStep.REPORT);
    
    default:
      return false;
  }
}

/**
 * Get the visual state of a step.
 * CRITICAL: Current step ALWAYS shows as "current", even if complete.
 * 
 * Priority order:
 * 1. current - this is where the user is
 * 2. completed - step is done
 * 3. available - can navigate but not done
 * 4. locked - cannot navigate yet
 * 
 * @param session - The workflow session
 * @param step - The step to get state for
 * @returns The visual state of the step
 */
export function getStepState(session: WorkflowSession, step: WorkflowStep): StepState {
  // Priority 1: Current step always shows as current
  if (session.currentStep === step) {
    return 'current';
  }
  
  // Priority 2: Completed steps
  if (isStepComplete(session, step)) {
    return 'completed';
  }
  
  // Priority 3: Available (can navigate but not complete)
  if (canNavigateToStep(session, step)) {
    return 'available';
  }
  
  // Priority 4: Locked
  return 'locked';
}

// ============================================================================
// NAVIGATION HELPERS
// ============================================================================

/**
 * Get the next step in the workflow (based on mode).
 * 
 * @param session - The workflow session
 * @param currentStep - Current step
 * @returns Next step or null if at end
 */
export function getNextStep(
  session: WorkflowSession,
  currentStep: WorkflowStep
): WorkflowStep | null {
  const visibleSteps = getVisibleStepNumbers(session.mode);
  const currentIndex = visibleSteps.indexOf(currentStep);
  
  if (currentIndex === -1 || currentIndex >= visibleSteps.length - 1) {
    return null;
  }
  
  return visibleSteps[currentIndex + 1];
}

/**
 * Get the previous step in the workflow (based on mode).
 * 
 * @param session - The workflow session
 * @param currentStep - Current step
 * @returns Previous step or null if at beginning
 */
export function getPreviousStep(
  session: WorkflowSession,
  currentStep: WorkflowStep
): WorkflowStep | null {
  const visibleSteps = getVisibleStepNumbers(session.mode);
  const currentIndex = visibleSteps.indexOf(currentStep);
  
  if (currentIndex <= 0) {
    return null;
  }
  
  return visibleSteps[currentIndex - 1];
}

/**
 * Get the first incomplete step in the workflow.
 * Useful for resuming a workflow.
 * 
 * @param session - The workflow session
 * @returns First incomplete step or null if all complete
 */
export function getFirstIncompleteStep(
  session: WorkflowSession
): WorkflowStep | null {
  const visibleSteps = getVisibleStepNumbers(session.mode);
  
  for (const step of visibleSteps) {
    if (!isStepComplete(session, step)) {
      return step;
    }
  }
  
  return null;
}

// ============================================================================
// COMPLETION METRICS
// ============================================================================

/**
 * Calculate workflow completion percentage.
 * Based on visible steps in current mode.
 * 
 * @param session - The workflow session
 * @returns Completion percentage (0-100)
 */
export function getCompletionPercentage(session: WorkflowSession): number {
  const visibleSteps = getVisibleStepNumbers(session.mode);
  if (visibleSteps.length === 0) return 0;
  
  const completedCount = visibleSteps.filter(
    (step) => isStepComplete(session, step)
  ).length;
  
  return Math.round((completedCount / visibleSteps.length) * 100);
}

/**
 * Get count of completed steps.
 * 
 * @param session - The workflow session
 * @returns Object with completed and total counts
 */
export function getCompletionCounts(
  session: WorkflowSession
): { completed: number; total: number } {
  const visibleSteps = getVisibleStepNumbers(session.mode);
  const completedCount = visibleSteps.filter(
    (step) => isStepComplete(session, step)
  ).length;
  
  return {
    completed: completedCount,
    total: visibleSteps.length,
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate navigation attempt and provide helpful error messages.
 * 
 * @param session - The workflow session
 * @param targetStep - The step user wants to navigate to
 * @returns Validation result with reason if invalid
 */
export function validateNavigation(
  session: WorkflowSession,
  targetStep: WorkflowStep
): ValidationResult {
  if (canNavigateToStep(session, targetStep)) {
    return { valid: true };
  }
  
  // Build helpful error message
  const missingRequirements: string[] = [];
  
  switch (targetStep) {
    case WorkflowStep.AI_ANALYSIS:
      if (!isStepComplete(session, WorkflowStep.UPLOAD)) {
        missingRequirements.push('Upload images');
      }
      break;
    
    case WorkflowStep.MEASUREMENTS:
    case WorkflowStep.ASSESSMENT:
      if (!isStepComplete(session, WorkflowStep.AI_ANALYSIS)) {
        missingRequirements.push('Complete AI analysis');
      }
      break;
    
    case WorkflowStep.REPORT:
      if (!isStepComplete(session, WorkflowStep.ASSESSMENT)) {
        missingRequirements.push('Complete assessment');
      }
      if (!isStepComplete(session, WorkflowStep.PATIENT_INFO)) {
        missingRequirements.push('Enter patient ID');
      }
      break;
    
    case WorkflowStep.FINALIZE:
      if (!isStepComplete(session, WorkflowStep.REPORT)) {
        missingRequirements.push('Complete report');
      }
      break;
  }
  
  return {
    valid: false,
    reason: `Cannot navigate to this step. Missing: ${missingRequirements.join(', ')}`,
    missingRequirements,
  };
}

// ============================================================================
// WORKFLOW STATE QUERIES
// ============================================================================

/**
 * Check if the workflow can be finalized.
 * 
 * @param session - The workflow session
 * @returns true if all required steps are complete
 */
export function canFinalizeWorkflow(session: WorkflowSession): boolean {
  // In quick mode, needs assessment and patient ID
  if (session.mode === 'quick') {
    return (
      isStepComplete(session, WorkflowStep.ASSESSMENT) &&
      isStepComplete(session, WorkflowStep.PATIENT_INFO)
    );
  }
  
  // In clinical mode, needs report complete
  return isStepComplete(session, WorkflowStep.REPORT);
}

/**
 * Get a summary of workflow state for debugging.
 * 
 * @param session - The workflow session
 * @returns Object with step states
 */
export function getWorkflowStateSummary(
  session: WorkflowSession
): Record<string, { complete: boolean; state: StepState }> {
  const visibleSteps = getVisibleStepNumbers(session.mode);
  const summary: Record<string, { complete: boolean; state: StepState }> = {};
  
  for (const step of visibleSteps) {
    const stepName = WorkflowStep[step];
    summary[stepName] = {
      complete: isStepComplete(session, step),
      state: getStepState(session, step),
    };
  }
  
  return summary;
}
