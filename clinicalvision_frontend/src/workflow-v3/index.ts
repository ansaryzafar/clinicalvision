/**
 * Workflow V3 - Public Exports
 * 
 * Clean export interface for the workflow module.
 */

// Types
export type {
  WorkflowSession,
  WorkflowMode,
  SessionStatus,
  StepState,
  StepConfig,
  ValidationResult,
  ImageData,
  ImageMetadata,
  AnalysisResults,
  Prediction,
  Finding,
  BoundingBox,
  PatientInfo,
  ContactInfo,
  ClinicalHistory,
  Measurement,
  MeasurementCoordinates,
  Assessment,
  AssessmentFinding,
} from './types';

// Enums
export { WorkflowStep } from './types';

// Factory Functions
export {
  createNewSession,
  createEmptyPatientInfo,
  createEmptyAssessment,
  isValidWorkflowStep,
  isValidWorkflowMode,
  isValidSession,
} from './types';

// Constants
export {
  STORAGE_KEYS,
  STEP_CONFIGS,
  QUICK_MODE_STEPS,
  CLINICAL_MODE_STEPS,
  getVisibleSteps,
  getVisibleStepNumbers,
  isStepVisibleInMode,
  getStepLabel,
  getStepShortLabel,
  STEP_STATE_COLORS,
  shouldAutoAdvance,
} from './constants';

// Session Storage (for advanced use cases)
export { sessionStorage } from './sessionStorage';

// Workflow Engine (pure functions)
export {
  isStepComplete,
  canNavigateToStep,
  getStepState,
  getNextStep,
  getPreviousStep,
  getFirstIncompleteStep,
  getCompletionPercentage,
  getCompletionCounts,
  validateNavigation,
  canFinalizeWorkflow,
  getWorkflowStateSummary,
} from './workflowEngine';

// React Hook & Provider
export { useWorkflow, WorkflowProvider } from './useWorkflow';
export type { WorkflowContextValue } from './useWorkflow';

// Components
export { WorkflowStepper, MiniStepper, VerticalStepper } from './WorkflowStepper';
export { StepIndicator, MobileStepIndicator } from './StepIndicator';

// Legacy Adapter (for gradual migration)
export { useLegacyWorkflow } from './useLegacyWorkflow';
export type { LegacyWorkflowHook } from './useLegacyWorkflow';
export {
  toV3Step,
  toLegacyStep,
  toV3Mode,
  toLegacyMode,
  toV3ImageData,
  toV3AnalysisResults,
  toLegacySession,
  toLegacyAnalysisResult,
} from './adapter';
