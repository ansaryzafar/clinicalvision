/**
 * Workflow V3 - Constants and Step Configuration
 * 
 * Central configuration for workflow steps and their properties.
 */

import { StepConfig, WorkflowMode, WorkflowStep } from './types';

// ============================================================================
// STORAGE KEYS
// ============================================================================

export const STORAGE_KEYS = {
  SESSIONS: 'clinicalvision_v3_sessions',
  CURRENT_SESSION_ID: 'clinicalvision_v3_current_session',
} as const;

// ============================================================================
// STEP CONFIGURATIONS
// ============================================================================

/**
 * Full configuration for all workflow steps
 */
export const STEP_CONFIGS: Record<WorkflowStep, StepConfig> = {
  [WorkflowStep.UPLOAD]: {
    step: WorkflowStep.UPLOAD,
    label: 'Upload Images',
    shortLabel: 'Upload',
    icon: 'upload',
    description: 'Upload mammogram images for analysis',
  },
  [WorkflowStep.AI_ANALYSIS]: {
    step: WorkflowStep.AI_ANALYSIS,
    label: 'AI Analysis',
    shortLabel: 'Analysis',
    icon: 'brain',
    description: 'Automated AI analysis of uploaded images',
  },
  [WorkflowStep.PATIENT_INFO]: {
    step: WorkflowStep.PATIENT_INFO,
    label: 'Patient Information',
    shortLabel: 'Patient',
    icon: 'user',
    description: 'Enter patient details and clinical history',
  },
  [WorkflowStep.MEASUREMENTS]: {
    step: WorkflowStep.MEASUREMENTS,
    label: 'Measurements',
    shortLabel: 'Measure',
    icon: 'ruler',
    description: 'Take measurements and annotations',
  },
  [WorkflowStep.ASSESSMENT]: {
    step: WorkflowStep.ASSESSMENT,
    label: 'Assessment',
    shortLabel: 'Assess',
    icon: 'clipboard',
    description: 'Make clinical assessment and BI-RADS classification',
  },
  [WorkflowStep.REPORT]: {
    step: WorkflowStep.REPORT,
    label: 'Generate Report',
    shortLabel: 'Report',
    icon: 'file-text',
    description: 'Generate structured clinical report',
  },
  [WorkflowStep.FINALIZE]: {
    step: WorkflowStep.FINALIZE,
    label: 'Finalize',
    shortLabel: 'Finalize',
    icon: 'check-circle',
    description: 'Review and finalize the examination',
  },
};

// ============================================================================
// MODE-SPECIFIC STEP VISIBILITY
// ============================================================================

/**
 * Steps visible in Quick Mode (streamlined workflow)
 */
export const QUICK_MODE_STEPS: WorkflowStep[] = [
  WorkflowStep.UPLOAD,
  WorkflowStep.AI_ANALYSIS,
  WorkflowStep.ASSESSMENT,
];

/**
 * Steps visible in Clinical Mode (full workflow)
 */
export const CLINICAL_MODE_STEPS: WorkflowStep[] = [
  WorkflowStep.UPLOAD,
  WorkflowStep.AI_ANALYSIS,
  WorkflowStep.PATIENT_INFO,
  WorkflowStep.MEASUREMENTS,
  WorkflowStep.ASSESSMENT,
  WorkflowStep.REPORT,
  WorkflowStep.FINALIZE,
];

/**
 * Get visible steps for a workflow mode
 */
export function getVisibleSteps(mode: WorkflowMode): StepConfig[] {
  const steps = mode === 'quick' ? QUICK_MODE_STEPS : CLINICAL_MODE_STEPS;
  return steps.map((step) => STEP_CONFIGS[step]);
}

/**
 * Get step numbers visible in a mode (for quick reference)
 */
export function getVisibleStepNumbers(mode: WorkflowMode): WorkflowStep[] {
  return mode === 'quick' ? QUICK_MODE_STEPS : CLINICAL_MODE_STEPS;
}

/**
 * Check if a step is visible in a given mode
 */
export function isStepVisibleInMode(step: WorkflowStep, mode: WorkflowMode): boolean {
  const visibleSteps = mode === 'quick' ? QUICK_MODE_STEPS : CLINICAL_MODE_STEPS;
  return visibleSteps.includes(step);
}

// ============================================================================
// STEP LABELS LOOKUP
// ============================================================================

/**
 * Get step label by step enum
 */
export function getStepLabel(step: WorkflowStep): string {
  return STEP_CONFIGS[step]?.label ?? `Step ${step}`;
}

/**
 * Get step short label by step enum
 */
export function getStepShortLabel(step: WorkflowStep): string {
  return STEP_CONFIGS[step]?.shortLabel ?? `S${step}`;
}

// ============================================================================
// STEP STATE COLORS (for CSS classes)
// ============================================================================

export const STEP_STATE_COLORS = {
  current: {
    bg: 'bg-medical-blue',
    border: 'border-medical-blue',
    text: 'text-white',
    ring: 'ring-medical-blue',
  },
  completed: {
    bg: 'bg-emerald-500',
    border: 'border-emerald-500',
    text: 'text-white',
    ring: 'ring-emerald-500',
  },
  available: {
    bg: 'bg-white',
    border: 'border-medical-blue border-dashed',
    text: 'text-medical-blue',
    ring: 'ring-medical-blue',
  },
  locked: {
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    text: 'text-gray-400',
    ring: 'ring-gray-300',
  },
} as const;

// ============================================================================
// QUICK MODE STEP MAPPING
// ============================================================================

/**
 * In Quick Mode, ASSESSMENT maps to visible step index 2
 * This mapping helps convert between actual steps and display indices
 */
export const QUICK_MODE_DISPLAY_INDEX: Record<WorkflowStep, number> = {
  [WorkflowStep.UPLOAD]: 0,
  [WorkflowStep.AI_ANALYSIS]: 1,
  [WorkflowStep.PATIENT_INFO]: -1, // Not visible
  [WorkflowStep.MEASUREMENTS]: -1, // Not visible
  [WorkflowStep.ASSESSMENT]: 2,
  [WorkflowStep.REPORT]: -1, // Not visible
  [WorkflowStep.FINALIZE]: -1, // Not visible
};

// ============================================================================
// AUTO-ADVANCE CONFIGURATION
// ============================================================================

/**
 * Steps that should auto-advance when completed
 * (e.g., AI Analysis automatically moves to next step when done)
 */
export const AUTO_ADVANCE_STEPS: WorkflowStep[] = [
  WorkflowStep.AI_ANALYSIS,
];

/**
 * Check if a step should auto-advance
 */
export function shouldAutoAdvance(step: WorkflowStep): boolean {
  return AUTO_ADVANCE_STEPS.includes(step);
}
