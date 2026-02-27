/**
 * Case Operations
 * 
 * Core functions for creating and managing clinical cases.
 * Implements the algorithms defined in ALGORITHM_DESIGN.md.
 * 
 * @module caseOperations
 */

import {
  ClinicalCase,
  PatientInfo,
  ClinicalHistory,
  ClinicalWorkflowStep,
  WorkflowState,
  AuditTrail,
  Result,
  success,
  failure,
  ValidationResult,
  FieldError,
  createValidationResult,
  ErrorCode,
} from '../types/case.types';

import {
  validatePatientInfo,
  validateClinicalHistory,
} from './validators';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for creating a clinical case
 */
export interface CreateCaseOptions {
  /** Custom ID to use instead of generated UUID */
  customId?: string;
  /** Custom case number to use instead of generated */
  customCaseNumber?: string;
  /** Pre-existing backend ID (for cases synced from server) */
  backendId?: number;
  /** Skip patient/clinical-history validation (for draft cases where data is filled in later) */
  skipValidation?: boolean;
}

/**
 * Validation error with field details
 */
export interface CaseValidationError extends Error {
  name: 'ValidationError';
  code: ErrorCode.VALIDATION_ERROR;
  errors: FieldError[];
}

// ============================================================================
// ID GENERATION
// ============================================================================

/** Counter for generating unique sequence numbers within the same millisecond */
let sequenceCounter = 0;
let lastTimestamp = 0;

/**
 * Reset the sequence counter for test isolation
 * @internal For testing purposes only
 */
export function __resetSequenceCounter(): void {
  sequenceCounter = 0;
  lastTimestamp = 0;
}

/**
 * Generate a unique case number in CV-YYYY-XXXXXX format
 * 
 * @returns Case number string (e.g., "CV-2026-001234")
 */
export function generateCaseNumber(): string {
  const now = Date.now();
  const year = new Date(now).getFullYear();
  
  // Reset counter if we're in a new millisecond
  if (now !== lastTimestamp) {
    lastTimestamp = now;
    sequenceCounter = 0;
  } else {
    sequenceCounter++;
  }
  
  // Combine timestamp-based sequence with counter for uniqueness
  // Use last 4 digits of timestamp (0-9999) * 100 + counter (0-99) for 6-digit sequence
  // This gives us up to 100 unique numbers per millisecond
  const timeComponent = (now % 10000) * 100;
  const sequence = (timeComponent + (sequenceCounter % 100)) % 1000000;
  
  // Pad to 6 digits
  const sequenceStr = sequence.toString().padStart(6, '0');
  
  return `CV-${year}-${sequenceStr}`;
}

/**
 * Generate a UUID v4
 * 
 * @returns UUID string
 */
export function generateUUID(): string {
  // Use crypto API if available, otherwise fallback to Math.random
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback UUID v4 generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
}

// ============================================================================
// WORKFLOW INITIALIZATION
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
export function createInitialAuditTrail(userId: string): AuditTrail {
  const now = new Date().toISOString();
  
  return {
    createdBy: userId,
    createdAt: now,
    modifications: [],
  };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Create a validation error
 */
function createValidationError(errors: FieldError[]): CaseValidationError {
  const error = new Error('Validation failed') as CaseValidationError;
  error.name = 'ValidationError';
  error.code = ErrorCode.VALIDATION_ERROR;
  error.errors = errors;
  return error;
}

/**
 * Validate user ID
 */
function validateUserId(userId: string): ValidationResult {
  const result = createValidationResult();
  
  if (!userId || typeof userId !== 'string') {
    result.isValid = false;
    result.errors.push({
      field: 'userId',
      message: 'User ID is required',
      code: 'REQUIRED',
    });
    return result;
  }
  
  if (userId.trim().length === 0) {
    result.isValid = false;
    result.errors.push({
      field: 'userId',
      message: 'User ID cannot be empty',
      code: 'EMPTY',
    });
  }
  
  return result;
}

/**
 * Normalize patient info (trim whitespace, uppercase MRN, etc.)
 */
function normalizePatientInfo(patient: PatientInfo): PatientInfo {
  return {
    ...patient,
    mrn: patient.mrn?.trim().toUpperCase() || '',
    firstName: patient.firstName?.trim() || '',
    lastName: patient.lastName?.trim() || '',
    dateOfBirth: patient.dateOfBirth?.trim() || '',
    phone: patient.phone?.trim(),
    email: patient.email?.trim(),
    insuranceProvider: patient.insuranceProvider?.trim(),
    insuranceId: patient.insuranceId?.trim(),
  };
}

/**
 * Normalize clinical history
 */
function normalizeClinicalHistory(history: ClinicalHistory): ClinicalHistory {
  return {
    ...history,
    clinicalIndication: history.clinicalIndication?.trim() || '',
    familyHistoryBreastCancer: Boolean(history.familyHistoryBreastCancer),
    personalHistoryBreastCancer: Boolean(history.personalHistoryBreastCancer),
    previousBiopsy: Boolean(history.previousBiopsy),
    comparisonAvailable: Boolean(history.comparisonAvailable),
    biopsyResults: history.biopsyResults?.trim(),
    priorMammogramDate: history.priorMammogramDate?.trim(),
    priorMammogramFinding: history.priorMammogramFinding?.trim(),
    additionalNotes: history.additionalNotes?.trim(),
  };
}

/**
 * Check if patient age is unusually old and generate warning
 */
function checkAgeWarnings(dateOfBirth: string): string[] {
  const warnings: string[] = [];
  
  const dob = new Date(dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear();
  
  if (age > 120) {
    warnings.push(`Patient age (${age} years) is unusually high - please verify date of birth`);
  }
  
  return warnings;
}

// ============================================================================
// MAIN CASE CREATION FUNCTION
// ============================================================================

/**
 * Create a new clinical case
 * 
 * This function implements Algorithm #1 from ALGORITHM_DESIGN.md:
 * 1. Validate patient info
 * 2. Validate clinical history
 * 3. Generate case identifiers
 * 4. Create initial workflow state
 * 5. Construct case object
 * 
 * @param patientInfo - Patient demographics
 * @param clinicalHistory - Clinical history and risk factors
 * @param userId - User creating the case
 * @param options - Optional creation options
 * @returns Result with ClinicalCase or validation error
 */
export function createClinicalCase(
  patientInfo: PatientInfo,
  clinicalHistory: ClinicalHistory,
  userId: string,
  options: CreateCaseOptions = {}
): Result<ClinicalCase, CaseValidationError> {
  const allErrors: FieldError[] = [];
  const warnings: string[] = [];
  
  // ========================================================================
  // STEP 0: Handle null/undefined inputs defensively
  // ========================================================================
  
  if (!patientInfo || typeof patientInfo !== 'object') {
    return failure(createValidationError([{
      field: 'patientInfo',
      message: 'Patient information is required',
      code: 'REQUIRED',
    }]));
  }
  
  if (!clinicalHistory || typeof clinicalHistory !== 'object') {
    return failure(createValidationError([{
      field: 'clinicalHistory',
      message: 'Clinical history is required',
      code: 'REQUIRED',
    }]));
  }
  
  // ========================================================================
  // STEP 1: Validate user ID
  // ========================================================================
  
  const userIdValidation = validateUserId(userId);
  if (!userIdValidation.isValid) {
    allErrors.push(...userIdValidation.errors);
  }
  
  // ========================================================================
  // STEP 2: Normalize and validate patient info
  // ========================================================================
  
  const normalizedPatient = normalizePatientInfo(patientInfo);
  
  if (!options.skipValidation) {
    const patientValidation = validatePatientInfo(normalizedPatient);
    
    if (!patientValidation.isValid) {
      allErrors.push(...patientValidation.errors);
    }
  }
  
  // Check for age warnings
  if (normalizedPatient.dateOfBirth) {
    warnings.push(...checkAgeWarnings(normalizedPatient.dateOfBirth));
  }
  
  // ========================================================================
  // STEP 3: Normalize and validate clinical history
  // ========================================================================
  
  const normalizedHistory = normalizeClinicalHistory(clinicalHistory);
  
  if (!options.skipValidation) {
    const historyValidation = validateClinicalHistory(normalizedHistory);
    
    if (!historyValidation.isValid) {
      allErrors.push(...historyValidation.errors);
    }
  }
  
  // ========================================================================
  // Return early if validation failed
  // ========================================================================
  
  if (allErrors.length > 0) {
    return failure(createValidationError(allErrors));
  }
  
  // ========================================================================
  // STEP 4: Generate identifiers
  // ========================================================================
  
  const id = options.customId || generateUUID();
  const caseNumber = options.customCaseNumber || generateCaseNumber();
  
  // ========================================================================
  // STEP 5: Create initial workflow state
  // ========================================================================
  
  const workflow = createInitialWorkflowState(userId);
  
  // ========================================================================
  // STEP 6: Create audit trail
  // ========================================================================
  
  const audit = createInitialAuditTrail(userId);
  
  // ========================================================================
  // STEP 7: Construct case object
  // ========================================================================
  
  const clinicalCase: ClinicalCase = {
    // Identifiers
    id,
    caseNumber,
    backendId: options.backendId !== undefined ? String(options.backendId) : undefined,
    
    // Patient & History
    patient: normalizedPatient,
    clinicalHistory: normalizedHistory,
    
    // Empty arrays for later population
    images: [],
    analysisResults: [],
    consolidatedFindings: [],
    
    // Workflow
    workflow,
    
    // Audit
    audit,
  };
  
  // ========================================================================
  // Return successful result
  // ========================================================================
  
  return success(clinicalCase, warnings.length > 0 ? warnings : undefined);
}

// ============================================================================
// CASE UPDATE OPERATIONS
// ============================================================================

/**
 * Update patient info in a case
 */
export function updateCasePatientInfo(
  case_: ClinicalCase,
  patientInfo: PatientInfo,
  userId: string
): Result<ClinicalCase, CaseValidationError> {
  // Normalize and validate
  const normalizedPatient = normalizePatientInfo(patientInfo);
  const validation = validatePatientInfo(normalizedPatient);
  
  if (!validation.isValid) {
    return failure(createValidationError(validation.errors));
  }
  
  // Create audit entry
  const now = new Date().toISOString();
  
  // Return updated case (immutable)
  return success({
    ...case_,
    patient: normalizedPatient,
    workflow: {
      ...case_.workflow,
      lastModifiedAt: now,
    },
    audit: {
      ...case_.audit,
      modifications: [
        ...case_.audit.modifications,
        {
          timestamp: now,
          userId,
          action: 'UPDATE_PATIENT_INFO',
          field: 'patient',
          previousValue: case_.patient,
          newValue: normalizedPatient,
        },
      ],
    },
  });
}

/**
 * Update clinical history in a case
 */
export function updateCaseClinicalHistory(
  case_: ClinicalCase,
  clinicalHistory: ClinicalHistory,
  userId: string
): Result<ClinicalCase, CaseValidationError> {
  // Normalize and validate
  const normalizedHistory = normalizeClinicalHistory(clinicalHistory);
  const validation = validateClinicalHistory(normalizedHistory);
  
  if (!validation.isValid) {
    return failure(createValidationError(validation.errors));
  }
  
  // Create audit entry
  const now = new Date().toISOString();
  
  // Return updated case (immutable)
  return success({
    ...case_,
    clinicalHistory: normalizedHistory,
    workflow: {
      ...case_.workflow,
      lastModifiedAt: now,
    },
    audit: {
      ...case_.audit,
      modifications: [
        ...case_.audit.modifications,
        {
          timestamp: now,
          userId,
          action: 'UPDATE_CLINICAL_HISTORY',
          field: 'clinicalHistory',
          previousValue: case_.clinicalHistory,
          newValue: normalizedHistory,
        },
      ],
    },
  });
}

// ============================================================================
// CASE RETRIEVAL UTILITIES
// ============================================================================

/**
 * Get case by ID from an array of cases
 */
export function getCaseById(
  cases: ClinicalCase[],
  caseId: string
): ClinicalCase | undefined {
  return cases.find(c => c.id === caseId);
}

/**
 * Get case by case number from an array of cases
 */
export function getCaseByCaseNumber(
  cases: ClinicalCase[],
  caseNumber: string
): ClinicalCase | undefined {
  return cases.find(c => c.caseNumber === caseNumber);
}

/**
 * Get cases by patient MRN
 */
export function getCasesByPatientMrn(
  cases: ClinicalCase[],
  mrn: string
): ClinicalCase[] {
  const normalizedMrn = mrn.trim().toUpperCase();
  return cases.filter(c => c.patient.mrn === normalizedMrn);
}

// ============================================================================
// CASE FILTERING UTILITIES
// ============================================================================

/**
 * Get cases by workflow status
 */
export function getCasesByStatus(
  cases: ClinicalCase[],
  status: ClinicalCase['workflow']['status']
): ClinicalCase[] {
  return cases.filter(c => c.workflow.status === status);
}

/**
 * Get cases at a specific workflow step
 */
export function getCasesAtStep(
  cases: ClinicalCase[],
  step: ClinicalWorkflowStep
): ClinicalCase[] {
  return cases.filter(c => c.workflow.currentStep === step);
}

/**
 * Get recent cases (modified within timeframe)
 */
export function getRecentCases(
  cases: ClinicalCase[],
  withinHours: number = 24
): ClinicalCase[] {
  const cutoff = Date.now() - (withinHours * 60 * 60 * 1000);
  
  return cases.filter(c => {
    const modifiedAt = new Date(c.workflow.lastModifiedAt).getTime();
    return modifiedAt >= cutoff;
  });
}

// ============================================================================
// CASE SORTING UTILITIES
// ============================================================================

/**
 * Sort cases by last modified date (newest first)
 */
export function sortCasesByModified(
  cases: ClinicalCase[],
  direction: 'asc' | 'desc' = 'desc'
): ClinicalCase[] {
  return [...cases].sort((a, b) => {
    const aTime = new Date(a.workflow.lastModifiedAt).getTime();
    const bTime = new Date(b.workflow.lastModifiedAt).getTime();
    return direction === 'desc' ? bTime - aTime : aTime - bTime;
  });
}

/**
 * Sort cases by creation date
 */
export function sortCasesByCreated(
  cases: ClinicalCase[],
  direction: 'asc' | 'desc' = 'desc'
): ClinicalCase[] {
  return [...cases].sort((a, b) => {
    const aTime = new Date(a.audit.createdAt).getTime();
    const bTime = new Date(b.audit.createdAt).getTime();
    return direction === 'desc' ? bTime - aTime : aTime - bTime;
  });
}

/**
 * Sort cases by patient name (alphabetically)
 */
export function sortCasesByPatientName(
  cases: ClinicalCase[],
  direction: 'asc' | 'desc' = 'asc'
): ClinicalCase[] {
  return [...cases].sort((a, b) => {
    const aName = `${a.patient.lastName}, ${a.patient.firstName}`.toLowerCase();
    const bName = `${b.patient.lastName}, ${b.patient.firstName}`.toLowerCase();
    const comparison = aName.localeCompare(bName);
    return direction === 'asc' ? comparison : -comparison;
  });
}
