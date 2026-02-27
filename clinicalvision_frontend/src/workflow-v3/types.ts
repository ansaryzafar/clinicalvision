/**
 * Workflow V3 - Type Definitions
 * 
 * Clean, minimal type definitions for the workflow system.
 * All types are designed to support derived state computation.
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Workflow steps in order of the clinical workflow.
 * Values are numeric for comparison operations.
 */
export enum WorkflowStep {
  UPLOAD = 0,
  AI_ANALYSIS = 1,
  PATIENT_INFO = 2,
  MEASUREMENTS = 3,
  ASSESSMENT = 4,
  REPORT = 5,
  FINALIZE = 6,
}

/**
 * Visual state of a workflow step.
 * Priority order: current > completed > available > locked
 */
export type StepState = 'current' | 'completed' | 'available' | 'locked';

/**
 * Workflow mode determines visible steps and navigation rules.
 */
export type WorkflowMode = 'quick' | 'clinical';

/**
 * Session status for overall workflow completion.
 */
export type SessionStatus = 'active' | 'completed';

// ============================================================================
// DATA TYPES (Source of truth for completion checks)
// ============================================================================

/**
 * Uploaded image data
 */
export interface ImageData {
  id: string;
  file: File | null;
  fileName: string;
  fileSize: number;
  preview: string; // Base64 or object URL
  uploadedAt: string;
  metadata: ImageMetadata;
}

export interface ImageMetadata {
  width: number;
  height: number;
  type: string; // 'mammogram' | 'dicom' | 'jpeg' | etc.
  view?: 'CC' | 'MLO' | 'unknown';
  laterality?: 'left' | 'right' | 'unknown';
}

/**
 * AI Analysis Results
 */
export interface AnalysisResults {
  id: string;
  analyzedAt: string;
  status: 'pending' | 'complete' | 'failed';
  
  // Results (only present when status === 'complete')
  predictions?: Prediction[];
  confidenceScore?: number;
  findings?: Finding[];
  suggestedBirads?: number;
  heatmapUrl?: string;
}

export interface Prediction {
  label: string;
  confidence: number;
  boundingBox?: BoundingBox;
}

export interface Finding {
  id: string;
  type: string;
  location: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Patient Information
 */
export interface PatientInfo {
  id: string; // Primary identifier - used for completion check
  name: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | '';
  medicalRecordNumber?: string;
  contactInfo?: ContactInfo;
  clinicalHistory?: ClinicalHistory;
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  address?: string;
}

export interface ClinicalHistory {
  previousMammograms: boolean;
  familyHistory: boolean;
  priorBiopsies: boolean;
  hormoneTherapy: boolean;
  notes?: string;
}

/**
 * Measurement data
 */
export interface Measurement {
  id: string;
  type: 'distance' | 'area' | 'angle' | 'annotation';
  label: string;
  value: number;
  unit: string;
  createdAt: string;
  coordinates?: MeasurementCoordinates;
}

export interface MeasurementCoordinates {
  startX: number;
  startY: number;
  endX?: number;
  endY?: number;
  points?: Array<{ x: number; y: number }>;
}

/**
 * Clinical Assessment
 */
export interface Assessment {
  birads: number | null; // BI-RADS category (0-6), null = not set
  laterality: 'left' | 'right' | 'bilateral' | null;
  density: 'A' | 'B' | 'C' | 'D' | null;
  findings: AssessmentFinding[];
  impression: string; // Used for REPORT completion check
  recommendations: string;
  notes: string;
}

export interface AssessmentFinding {
  id: string;
  type: 'mass' | 'calcification' | 'asymmetry' | 'distortion' | 'other';
  location: string;
  description: string;
  birads?: number;
}

// ============================================================================
// SESSION TYPE (Main workflow state container)
// ============================================================================

/**
 * Complete workflow session.
 * This is the single source of truth for the entire workflow.
 * All completion states are derived from this data.
 */
export interface WorkflowSession {
  // Identity
  id: string;
  createdAt: string;
  updatedAt: string;
  
  // Navigation state (NOT completion tracking)
  currentStep: WorkflowStep;
  mode: WorkflowMode;
  status: SessionStatus;
  
  // Actual data - completion is derived from these
  images: ImageData[];
  activeImageId?: string; // Currently selected image for viewing
  analysisResults: AnalysisResults | null;
  patientInfo: PatientInfo;
  measurements: Measurement[];
  assessment: Assessment;
}

// ============================================================================
// UI CONFIGURATION TYPES
// ============================================================================

/**
 * Configuration for displaying a workflow step
 */
export interface StepConfig {
  step: WorkflowStep;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}

/**
 * Result of navigation validation
 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
  missingRequirements?: string[];
}

// ============================================================================
// FACTORY FUNCTIONS (Default values)
// ============================================================================

/**
 * Create empty patient info with required structure
 */
export function createEmptyPatientInfo(): PatientInfo {
  return {
    id: '',
    name: '',
    dateOfBirth: '',
    gender: '',
    clinicalHistory: {
      previousMammograms: false,
      familyHistory: false,
      priorBiopsies: false,
      hormoneTherapy: false,
    },
  };
}

/**
 * Create empty assessment with required structure
 */
export function createEmptyAssessment(): Assessment {
  return {
    birads: null,
    laterality: null,
    density: null,
    findings: [],
    impression: '',
    recommendations: '',
    notes: '',
  };
}

/**
 * Create a new workflow session with default values
 */
export function createNewSession(mode: WorkflowMode): WorkflowSession {
  const now = new Date().toISOString();
  return {
    id: generateSessionId(),
    createdAt: now,
    updatedAt: now,
    currentStep: WorkflowStep.UPLOAD,
    mode,
    status: 'active',
    images: [],
    analysisResults: null,
    patientInfo: createEmptyPatientInfo(),
    measurements: [],
    assessment: createEmptyAssessment(),
  };
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `session_${timestamp}_${randomPart}`;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if a value is a valid WorkflowStep
 */
export function isValidWorkflowStep(value: unknown): value is WorkflowStep {
  return (
    typeof value === 'number' &&
    value >= WorkflowStep.UPLOAD &&
    value <= WorkflowStep.FINALIZE
  );
}

/**
 * Check if a value is a valid WorkflowMode
 */
export function isValidWorkflowMode(value: unknown): value is WorkflowMode {
  return value === 'quick' || value === 'clinical';
}

/**
 * Check if a session has valid structure
 */
export function isValidSession(session: unknown): session is WorkflowSession {
  if (!session || typeof session !== 'object') return false;
  
  const s = session as Record<string, unknown>;
  
  return (
    typeof s.id === 'string' &&
    typeof s.createdAt === 'string' &&
    typeof s.updatedAt === 'string' &&
    isValidWorkflowStep(s.currentStep) &&
    isValidWorkflowMode(s.mode) &&
    (s.status === 'active' || s.status === 'completed') &&
    Array.isArray(s.images) &&
    (s.analysisResults === null || typeof s.analysisResults === 'object') &&
    typeof s.patientInfo === 'object' &&
    Array.isArray(s.measurements) &&
    typeof s.assessment === 'object'
  );
}
