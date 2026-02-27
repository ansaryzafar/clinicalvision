/**
 * Workflow State Machine
 * 
 * Manages clinical workflow state transitions with validation.
 * Implements guard conditions to ensure data integrity before step changes.
 * 
 * @module workflowStateMachine
 */

import {
  ClinicalCase,
  ClinicalWorkflowStep,
  WorkflowState,
  CaseStatus,
  Result,
  success,
  failure,
  STEP_INDEX,
  TOTAL_WORKFLOW_STEPS,
  ErrorCode,
  AuditEntry,
} from '../types/case.types';
import {
  validatePatientInfo,
  validateClinicalHistory,
} from './validators';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Transition validation result
 */
export interface TransitionValidation {
  allowed: boolean;
  reason?: string;
}

/**
 * Workflow transition definition
 */
export interface WorkflowTransition {
  from: ClinicalWorkflowStep;
  to: ClinicalWorkflowStep;
  guard: (case_: ClinicalCase) => TransitionValidation;
  guardMessage: string;
}

/**
 * Step data requirements for validation
 */
export interface StepRequirements {
  step: ClinicalWorkflowStep;
  validate: (case_: ClinicalCase) => TransitionValidation;
  description: string;
}

/**
 * Workflow error with context
 */
export interface WorkflowTransitionError extends Error {
  name: 'WorkflowTransitionError';
  code: ErrorCode.WORKFLOW_ERROR;
  currentStep: ClinicalWorkflowStep;
  targetStep: ClinicalWorkflowStep;
  reason: string;
}

// ============================================================================
// GUARD FUNCTIONS
// ============================================================================

/**
 * Check if patient info is complete
 */
function guardPatientInfo(case_: ClinicalCase): TransitionValidation {
  const result = validatePatientInfo(case_.patient);
  if (!result.isValid) {
    return {
      allowed: false,
      reason: `Patient information incomplete: ${result.errors[0]?.message || 'Validation failed'}`,
    };
  }
  return { allowed: true };
}

/**
 * Check if clinical history is complete
 */
function guardClinicalHistory(case_: ClinicalCase): TransitionValidation {
  const result = validateClinicalHistory(case_.clinicalHistory);
  if (!result.isValid) {
    return {
      allowed: false,
      reason: `Clinical history incomplete: ${result.errors[0]?.message || 'Validation failed'}`,
    };
  }
  return { allowed: true };
}

/**
 * Check if at least one image is uploaded
 */
function guardHasImages(case_: ClinicalCase): TransitionValidation {
  if (!case_.images || case_.images.length === 0) {
    return {
      allowed: false,
      reason: 'At least one image must be uploaded',
    };
  }
  return { allowed: true };
}

/**
 * Check if all images are uploaded successfully
 */
function guardAllImagesUploaded(case_: ClinicalCase): TransitionValidation {
  if (!case_.images || case_.images.length === 0) {
    return {
      allowed: false,
      reason: 'No images uploaded',
    };
  }
  
  const failedUploads = case_.images.filter(img => img.uploadStatus !== 'uploaded');
  if (failedUploads.length > 0) {
    return {
      allowed: false,
      reason: `${failedUploads.length} image(s) not uploaded successfully`,
    };
  }
  
  return { allowed: true };
}

/**
 * Check if AI analysis is complete for all images
 */
function guardAnalysisComplete(case_: ClinicalCase): TransitionValidation {
  if (!case_.images || case_.images.length === 0) {
    return {
      allowed: false,
      reason: 'No images to analyze',
    };
  }
  
  if (!case_.analysisResults || case_.analysisResults.length === 0) {
    return {
      allowed: false,
      reason: 'AI analysis has not been run',
    };
  }
  
  // Check if all images have analysis results
  const analyzedImageIds = new Set(case_.analysisResults.map(r => r.imageId));
  const unanalyzedImages = case_.images.filter(img => !analyzedImageIds.has(img.id));
  
  if (unanalyzedImages.length > 0) {
    return {
      allowed: false,
      reason: `${unanalyzedImages.length} image(s) not analyzed`,
    };
  }
  
  return { allowed: true };
}

/**
 * Check if BI-RADS assessment is complete
 */
function guardBiRadsComplete(case_: ClinicalCase): TransitionValidation {
  if (!case_.assessment) {
    return {
      allowed: false,
      reason: 'BI-RADS assessment not provided',
    };
  }
  
  if (!case_.assessment.overallCategory) {
    return {
      allowed: false,
      reason: 'Overall BI-RADS category not selected',
    };
  }
  
  if (!case_.assessment.impression || case_.assessment.impression.trim() === '') {
    return {
      allowed: false,
      reason: 'Clinical impression is required',
    };
  }
  
  if (!case_.assessment.recommendation || case_.assessment.recommendation.trim() === '') {
    return {
      allowed: false,
      reason: 'Recommendation is required',
    };
  }
  
  return { allowed: true };
}

/**
 * Check if report is generated
 */
function guardReportGenerated(case_: ClinicalCase): TransitionValidation {
  if (!case_.report) {
    return {
      allowed: false,
      reason: 'Report has not been generated',
    };
  }
  
  return { allowed: true };
}

/**
 * Always allow transition (for optional steps)
 */
function guardAlwaysAllow(): TransitionValidation {
  return { allowed: true };
}

/**
 * Check if case is not locked
 */
function guardNotLocked(case_: ClinicalCase): TransitionValidation {
  if (case_.workflow.isLocked) {
    return {
      allowed: false,
      reason: 'Case is locked and cannot be modified',
    };
  }
  return { allowed: true };
}

// ============================================================================
// TRANSITION MAP
// ============================================================================

/**
 * Define all valid workflow transitions
 */
const WORKFLOW_TRANSITIONS: Map<ClinicalWorkflowStep, WorkflowTransition> = new Map([
  [ClinicalWorkflowStep.PATIENT_REGISTRATION, {
    from: ClinicalWorkflowStep.PATIENT_REGISTRATION,
    to: ClinicalWorkflowStep.CLINICAL_HISTORY,
    guard: guardPatientInfo,
    guardMessage: 'Patient information must be complete',
  }],
  [ClinicalWorkflowStep.CLINICAL_HISTORY, {
    from: ClinicalWorkflowStep.CLINICAL_HISTORY,
    to: ClinicalWorkflowStep.IMAGE_UPLOAD,
    guard: guardClinicalHistory,
    guardMessage: 'Clinical history must be complete',
  }],
  [ClinicalWorkflowStep.IMAGE_UPLOAD, {
    from: ClinicalWorkflowStep.IMAGE_UPLOAD,
    to: ClinicalWorkflowStep.IMAGE_VERIFICATION,
    guard: guardHasImages,
    guardMessage: 'At least one image must be uploaded',
  }],
  [ClinicalWorkflowStep.IMAGE_VERIFICATION, {
    from: ClinicalWorkflowStep.IMAGE_VERIFICATION,
    to: ClinicalWorkflowStep.BATCH_AI_ANALYSIS,
    guard: guardAllImagesUploaded,
    guardMessage: 'All images must be uploaded successfully',
  }],
  [ClinicalWorkflowStep.BATCH_AI_ANALYSIS, {
    from: ClinicalWorkflowStep.BATCH_AI_ANALYSIS,
    to: ClinicalWorkflowStep.FINDINGS_REVIEW,
    guard: guardAnalysisComplete,
    guardMessage: 'AI analysis must be complete for all images',
  }],
  [ClinicalWorkflowStep.FINDINGS_REVIEW, {
    from: ClinicalWorkflowStep.FINDINGS_REVIEW,
    to: ClinicalWorkflowStep.BIRADS_ASSESSMENT,
    guard: guardAlwaysAllow,
    guardMessage: '',
  }],
  [ClinicalWorkflowStep.BIRADS_ASSESSMENT, {
    from: ClinicalWorkflowStep.BIRADS_ASSESSMENT,
    to: ClinicalWorkflowStep.REPORT_GENERATION,
    guard: guardBiRadsComplete,
    guardMessage: 'BI-RADS assessment must be complete',
  }],
  [ClinicalWorkflowStep.REPORT_GENERATION, {
    from: ClinicalWorkflowStep.REPORT_GENERATION,
    to: ClinicalWorkflowStep.FINALIZE,
    guard: guardReportGenerated,
    guardMessage: 'Report must be generated',
  }],
  [ClinicalWorkflowStep.FINALIZE, {
    from: ClinicalWorkflowStep.FINALIZE,
    to: ClinicalWorkflowStep.DIGITAL_SIGNATURE,
    guard: guardAlwaysAllow,
    guardMessage: '',
  }],
]);

// ============================================================================
// STATE MACHINE FUNCTIONS
// ============================================================================

/**
 * Get the next step in the workflow sequence
 * 
 * @param currentStep - Current workflow step
 * @returns Next step or undefined if at end
 */
export function getNextStep(
  currentStep: ClinicalWorkflowStep
): ClinicalWorkflowStep | undefined {
  const transition = WORKFLOW_TRANSITIONS.get(currentStep);
  return transition?.to;
}

/**
 * Get the previous step in the workflow sequence
 * 
 * @param currentStep - Current workflow step
 * @returns Previous step or undefined if at start
 */
export function getPreviousStep(
  currentStep: ClinicalWorkflowStep
): ClinicalWorkflowStep | undefined {
  const currentIndex = STEP_INDEX[currentStep];
  if (currentIndex === 0) return undefined;
  
  // Find the step with index - 1
  const entries = Object.entries(STEP_INDEX) as [ClinicalWorkflowStep, number][];
  const previousEntry = entries.find(([_, index]) => index === currentIndex - 1);
  return previousEntry?.[0];
}

/**
 * Check if a step is before another step
 * 
 * @param step - Step to check
 * @param reference - Reference step
 * @returns True if step comes before reference
 */
export function isStepBefore(
  step: ClinicalWorkflowStep,
  reference: ClinicalWorkflowStep
): boolean {
  return STEP_INDEX[step] < STEP_INDEX[reference];
}

/**
 * Check if a step is after another step
 * 
 * @param step - Step to check
 * @param reference - Reference step
 * @returns True if step comes after reference
 */
export function isStepAfter(
  step: ClinicalWorkflowStep,
  reference: ClinicalWorkflowStep
): boolean {
  return STEP_INDEX[step] > STEP_INDEX[reference];
}

/**
 * Get the workflow progress as a percentage
 * 
 * @param step - Current workflow step
 * @returns Progress percentage (0-100)
 */
export function getWorkflowProgress(step: ClinicalWorkflowStep): number {
  const stepIndex = STEP_INDEX[step];
  return Math.round(((stepIndex + 1) / TOTAL_WORKFLOW_STEPS) * 100);
}

/**
 * Check if a step has been completed
 * 
 * @param step - Step to check
 * @param workflow - Current workflow state
 * @returns True if step is in completedSteps
 */
export function isStepCompleted(
  step: ClinicalWorkflowStep,
  workflow: WorkflowState
): boolean {
  return workflow.completedSteps.includes(step);
}

/**
 * Check if the workflow is at the final step
 * 
 * @param workflow - Current workflow state
 * @returns True if at DIGITAL_SIGNATURE step
 */
export function isAtFinalStep(workflow: WorkflowState): boolean {
  return workflow.currentStep === ClinicalWorkflowStep.DIGITAL_SIGNATURE;
}

/**
 * Check if the workflow is finalized
 * 
 * @param workflow - Current workflow state
 * @returns True if status is 'finalized'
 */
export function isFinalized(workflow: WorkflowState): boolean {
  return workflow.status === 'finalized';
}

// ============================================================================
// TRANSITION VALIDATION
// ============================================================================

/**
 * Check if transition to a step is allowed
 * 
 * @param case_ - Clinical case
 * @param targetStep - Step to transition to
 * @returns TransitionValidation with allowed status and reason
 */
export function canTransitionTo(
  case_: ClinicalCase,
  targetStep: ClinicalWorkflowStep
): TransitionValidation {
  const currentStep = case_.workflow.currentStep;
  
  // Check if case is locked
  const lockCheck = guardNotLocked(case_);
  if (!lockCheck.allowed) {
    return lockCheck;
  }
  
  // Check if already finalized
  if (isFinalized(case_.workflow)) {
    return {
      allowed: false,
      reason: 'Case is finalized and cannot be modified',
    };
  }
  
  // Check if target is the same as current
  if (currentStep === targetStep) {
    return {
      allowed: false,
      reason: 'Already at this step',
    };
  }
  
  // Get transition from current step
  const transition = WORKFLOW_TRANSITIONS.get(currentStep);
  
  // Check if target is the valid next step
  if (!transition || transition.to !== targetStep) {
    // Check if going back to a completed step (allowed)
    if (isStepBefore(targetStep, currentStep)) {
      if (isStepCompleted(targetStep, case_.workflow)) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Cannot go back to incomplete step',
      };
    }
    
    return {
      allowed: false,
      reason: `Cannot skip from ${currentStep} to ${targetStep}`,
    };
  }
  
  // Run the guard condition
  const guardResult = transition.guard(case_);
  if (!guardResult.allowed) {
    return {
      allowed: false,
      reason: guardResult.reason || transition.guardMessage,
    };
  }
  
  return { allowed: true };
}

/**
 * Check if user can go back to a previous step
 * 
 * @param case_ - Clinical case
 * @param targetStep - Step to go back to
 * @returns TransitionValidation
 */
export function canGoBackTo(
  case_: ClinicalCase,
  targetStep: ClinicalWorkflowStep
): TransitionValidation {
  // Cannot go back if finalized
  if (isFinalized(case_.workflow)) {
    return {
      allowed: false,
      reason: 'Case is finalized and cannot be modified',
    };
  }
  
  // Cannot go back if locked
  if (case_.workflow.isLocked) {
    return {
      allowed: false,
      reason: 'Case is locked',
    };
  }
  
  // Can only go back to completed steps
  if (!isStepCompleted(targetStep, case_.workflow)) {
    return {
      allowed: false,
      reason: 'Can only go back to previously completed steps',
    };
  }
  
  return { allowed: true };
}

// ============================================================================
// STATE TRANSITIONS
// ============================================================================

/**
 * Advance workflow to the next step
 * 
 * @param case_ - Clinical case to advance
 * @param userId - User performing the action
 * @returns Result with updated case or error
 */
export function advanceWorkflow(
  case_: ClinicalCase,
  userId: string
): Result<ClinicalCase, WorkflowTransitionError> {
  // CRITICAL: Prevent advancing finalized cases
  if (case_.workflow.status === 'finalized') {
    return failure(createWorkflowError(
      case_.workflow.currentStep,
      case_.workflow.currentStep,
      'Case is finalized and cannot be modified'
    ));
  }
  
  const currentStep = case_.workflow.currentStep;
  const nextStep = getNextStep(currentStep);
  
  if (!nextStep) {
    return failure(createWorkflowError(
      currentStep,
      currentStep,
      'No next step available - workflow may be complete'
    ));
  }
  
  // Validate transition
  const validation = canTransitionTo(case_, nextStep);
  if (!validation.allowed) {
    return failure(createWorkflowError(
      currentStep,
      nextStep,
      validation.reason || 'Transition not allowed'
    ));
  }
  
  // Create updated workflow state
  const now = new Date().toISOString();
  const updatedWorkflow: WorkflowState = {
    ...case_.workflow,
    currentStep: nextStep,
    completedSteps: case_.workflow.completedSteps.includes(currentStep)
      ? case_.workflow.completedSteps
      : [...case_.workflow.completedSteps, currentStep],
    lastModifiedAt: now,
    status: determineStatus(nextStep),
  };
  
  // If reaching digital signature, mark as complete
  if (nextStep === ClinicalWorkflowStep.DIGITAL_SIGNATURE) {
    updatedWorkflow.completedAt = now;
  }
  
  // Create audit entry
  const auditEntry: AuditEntry = {
    timestamp: now,
    userId,
    action: 'WORKFLOW_ADVANCE',
    field: 'workflow.currentStep',
    previousValue: currentStep,
    newValue: nextStep,
  };
  
  // Return updated case
  const updatedCase: ClinicalCase = {
    ...case_,
    workflow: updatedWorkflow,
    audit: {
      ...case_.audit,
      modifications: [...case_.audit.modifications, auditEntry],
    },
  };
  
  return success(updatedCase);
}

/**
 * Go back to a previous step
 * 
 * @param case_ - Clinical case
 * @param targetStep - Step to go back to
 * @param userId - User performing the action
 * @returns Result with updated case or error
 */
export function goBackToStep(
  case_: ClinicalCase,
  targetStep: ClinicalWorkflowStep,
  userId: string
): Result<ClinicalCase, WorkflowTransitionError> {
  // CRITICAL: Prevent modifications on finalized cases
  if (case_.workflow.status === 'finalized') {
    return failure(createWorkflowError(
      case_.workflow.currentStep,
      targetStep,
      'Case is finalized and cannot be modified'
    ));
  }
  
  const validation = canGoBackTo(case_, targetStep);
  
  if (!validation.allowed) {
    return failure(createWorkflowError(
      case_.workflow.currentStep,
      targetStep,
      validation.reason || 'Cannot go back to this step'
    ));
  }
  
  const now = new Date().toISOString();
  
  // Create audit entry
  const auditEntry: AuditEntry = {
    timestamp: now,
    userId,
    action: 'WORKFLOW_GO_BACK',
    field: 'workflow.currentStep',
    previousValue: case_.workflow.currentStep,
    newValue: targetStep,
  };
  
  // Update workflow state
  const updatedCase: ClinicalCase = {
    ...case_,
    workflow: {
      ...case_.workflow,
      currentStep: targetStep,
      lastModifiedAt: now,
      // Keep completedSteps as is - we're just navigating back
    },
    audit: {
      ...case_.audit,
      modifications: [...case_.audit.modifications, auditEntry],
    },
  };
  
  return success(updatedCase);
}

/**
 * Finalize a case (lock it and mark as finalized)
 * 
 * @param case_ - Clinical case to finalize
 * @param userId - User performing finalization
 * @param signatureHash - Digital signature hash
 * @returns Result with finalized case or error
 */
export function finalizeCase(
  case_: ClinicalCase,
  userId: string,
  signatureHash: string
): Result<ClinicalCase, WorkflowTransitionError> {
  // CRITICAL: Prevent double finalization
  if (case_.workflow.status === 'finalized') {
    return failure(createWorkflowError(
      case_.workflow.currentStep,
      ClinicalWorkflowStep.DIGITAL_SIGNATURE,
      'Case is already finalized and cannot be modified'
    ));
  }
  
  // Prevent finalization by different user if case is locked
  if (case_.workflow.isLocked && case_.workflow.lockedBy && case_.workflow.lockedBy !== userId) {
    return failure(createWorkflowError(
      case_.workflow.currentStep,
      ClinicalWorkflowStep.DIGITAL_SIGNATURE,
      `Case is locked by another user`
    ));
  }
  
  // Must be at digital signature step
  if (case_.workflow.currentStep !== ClinicalWorkflowStep.DIGITAL_SIGNATURE) {
    return failure(createWorkflowError(
      case_.workflow.currentStep,
      ClinicalWorkflowStep.DIGITAL_SIGNATURE,
      'Must complete all steps before finalizing'
    ));
  }
  
  // Validate all required data is present
  const patientCheck = guardPatientInfo(case_);
  if (!patientCheck.allowed) {
    return failure(createWorkflowError(
      case_.workflow.currentStep,
      ClinicalWorkflowStep.DIGITAL_SIGNATURE,
      patientCheck.reason || 'Patient info incomplete'
    ));
  }
  
  const biRadsCheck = guardBiRadsComplete(case_);
  if (!biRadsCheck.allowed) {
    return failure(createWorkflowError(
      case_.workflow.currentStep,
      ClinicalWorkflowStep.DIGITAL_SIGNATURE,
      biRadsCheck.reason || 'Assessment incomplete'
    ));
  }
  
  const reportCheck = guardReportGenerated(case_);
  if (!reportCheck.allowed) {
    return failure(createWorkflowError(
      case_.workflow.currentStep,
      ClinicalWorkflowStep.DIGITAL_SIGNATURE,
      reportCheck.reason || 'Report not generated'
    ));
  }
  
  const now = new Date().toISOString();
  
  // Finalize case
  const finalizedCase: ClinicalCase = {
    ...case_,
    workflow: {
      ...case_.workflow,
      completedSteps: case_.workflow.completedSteps.includes(ClinicalWorkflowStep.DIGITAL_SIGNATURE)
        ? case_.workflow.completedSteps
        : [
          ...case_.workflow.completedSteps,
          ClinicalWorkflowStep.DIGITAL_SIGNATURE,
        ],
      status: 'finalized',
      finalizedAt: now,
      isLocked: true,
      lockedBy: userId,
      lockedAt: now,
    },
    audit: {
      ...case_.audit,
      signedBy: userId,
      signedAt: now,
      signatureHash,
      modifications: [
        ...case_.audit.modifications,
        {
          timestamp: now,
          userId,
          action: 'CASE_FINALIZED',
        },
      ],
    },
  };
  
  return success(finalizedCase);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determine case status based on current step
 */
function determineStatus(step: ClinicalWorkflowStep): CaseStatus {
  const index = STEP_INDEX[step];
  
  if (index === 0) return 'draft';
  if (index < 4) return 'in_progress';
  if (index < TOTAL_WORKFLOW_STEPS - 1) return 'pending_review';
  return 'completed';
}

/**
 * Create a workflow transition error
 */
function createWorkflowError(
  currentStep: ClinicalWorkflowStep,
  targetStep: ClinicalWorkflowStep,
  reason: string
): WorkflowTransitionError {
  const error = new Error(reason) as WorkflowTransitionError;
  error.name = 'WorkflowTransitionError';
  error.code = ErrorCode.WORKFLOW_ERROR;
  error.currentStep = currentStep;
  error.targetStep = targetStep;
  error.reason = reason;
  return error;
}

// ============================================================================
// INITIAL STATE FACTORY
// ============================================================================

/**
 * Create initial workflow state for a new case
 * 
 * @param userId - User creating the case
 * @returns Initial workflow state
 */
export function createInitialWorkflowState(userId: string): WorkflowState {
  const now = new Date().toISOString();
  
  return {
    currentStep: ClinicalWorkflowStep.PATIENT_REGISTRATION,
    completedSteps: [],
    status: 'draft',
    startedAt: now,
    lastModifiedAt: now,
    isLocked: false,
  };
}

/**
 * Create initial audit trail for a new case
 * 
 * @param userId - User creating the case
 * @returns Initial audit trail
 */
export function createInitialAuditTrail(userId: string): ClinicalCase['audit'] {
  const now = new Date().toISOString();
  
  return {
    createdBy: userId,
    createdAt: now,
    modifications: [],
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  WORKFLOW_TRANSITIONS,
  guardPatientInfo,
  guardClinicalHistory,
  guardHasImages,
  guardAllImagesUploaded,
  guardAnalysisComplete,
  guardBiRadsComplete,
  guardReportGenerated,
  guardAlwaysAllow,
  guardNotLocked,
};
