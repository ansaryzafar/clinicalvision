/**
 * Validation Functions for Clinical Case Data
 * 
 * These validators ensure data integrity and prevent errors early.
 * Each validator returns a ValidationResult with detailed error information.
 * 
 * @module validators
 */

import {
  PatientInfo,
  ClinicalHistory,
  MammogramImage,
  ViewType,
  Laterality,
  ValidationResult,
  FieldError,
  createValidationResult,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  MAX_IMAGES_PER_CASE,
  CLINICAL_INDICATION_OPTIONS,
} from '../types/case.types';

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

/** MRN pattern: alphanumeric with hyphens/underscores/periods, 5-20 characters.
 *  Must start and end with a letter or digit. */
export const MRN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-_.]{3,18}[A-Za-z0-9]$/;

/** Name pattern: letters, spaces, hyphens, apostrophes */
export const NAME_PATTERN = /^[A-Za-z\s\-']{1,100}$/;

/** Extended name pattern: also allows common accented characters */
export const NAME_PATTERN_EXTENDED = /^[\p{L}\s\-']{1,100}$/u;

/** Phone pattern: optional, various formats */
export const PHONE_PATTERN = /^[\d\s\-\+\(\)]{0,20}$/;

/** Email pattern: standard email format */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Date pattern: ISO 8601 YYYY-MM-DD */
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 
 * Dangerous Unicode patterns:
 * - Zero-width characters (can be used for hiding text)
 * - Bidirectional overrides (can manipulate text display)
 * - Control characters
 */
export const DANGEROUS_UNICODE_PATTERN = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202F\uFEFF]/;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Add an error to the validation result
 */
function addError(
  result: ValidationResult,
  field: string,
  message: string,
  code?: string
): void {
  result.isValid = false;
  result.errors.push({ field, message, code });
}

/**
 * Add a warning to the validation result
 */
function addWarning(result: ValidationResult, message: string): void {
  result.warnings.push(message);
}

/**
 * Check if a string is empty or whitespace only
 */
function isEmpty(value: string | undefined | null): boolean {
  return !value || value.trim().length === 0;
}

/**
 * XSS/Injection pattern - detects common attack vectors
 */
const XSS_PATTERN = /<[^>]*>|javascript:|data:|on\w+\s*=|&[a-z]+;|&#\d+;/i;

/**
 * Check if a string contains potential XSS/injection content
 */
function containsXSS(value: string): boolean {
  return XSS_PATTERN.test(value);
}

/**
 * Check if a string contains dangerous Unicode characters
 * (zero-width, bidirectional overrides, control chars)
 */
function containsDangerousUnicode(value: string): boolean {
  return DANGEROUS_UNICODE_PATTERN.test(value);
}

/**
 * Validate a name field with Unicode safety checks
 * Returns error message if invalid, null if valid
 */
function validateNameField(value: string, fieldName: string): string | null {
  // Check for dangerous Unicode first
  if (containsDangerousUnicode(value)) {
    return `${fieldName} contains invalid control characters`;
  }
  
  // Check for XSS
  if (containsXSS(value)) {
    return `${fieldName} contains invalid characters`;
  }
  
  // Trim and check length
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return `${fieldName} is required`;
  }
  
  if (trimmed.length > 100) {
    return `${fieldName} must be 100 characters or less`;
  }
  
  // Allow extended Unicode for international names, or basic ASCII
  if (!NAME_PATTERN.test(trimmed) && !NAME_PATTERN_EXTENDED.test(trimmed)) {
    return `${fieldName} contains invalid characters`;
  }
  
  return null;
}

/**
 * Check if a date string is valid and parseable with STRICT validation
 * Validates that the day is actually valid for the given month/year
 */
function isValidDate(dateString: string): boolean {
  if (!DATE_PATTERN.test(dateString)) return false;
  
  // Parse the components
  const [yearStr, monthStr, dayStr] = dateString.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  
  // Month must be 1-12
  if (month < 1 || month > 12) return false;
  
  // Day must be at least 1
  if (day < 1) return false;
  
  // Check max days for each month
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  // Handle leap year for February
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  if (isLeapYear) {
    daysInMonth[1] = 29;
  }
  
  // Check if day is valid for the month
  if (day > daysInMonth[month - 1]) return false;
  
  // Final verification: create a date and check it round-trips correctly
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;
  
  // Verify the date components match what we parsed
  // This catches edge cases where JS Date might auto-correct invalid dates
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Check if a date is in the future
 */
function isFutureDate(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

/**
 * Check if a date is too far in the past (over 150 years)
 */
function isTooOld(dateString: string): boolean {
  const date = new Date(dateString);
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 150);
  return date < minDate;
}

// ============================================================================
// PATIENT INFO VALIDATION
// ============================================================================

/**
 * Validate patient information
 * 
 * @param patient - Patient info to validate
 * @returns ValidationResult with errors if invalid
 * 
 * @example
 * const result = validatePatientInfo({ mrn: 'MRN12345', firstName: 'Jane', ... });
 * if (!result.isValid) {
 *   console.log(result.errors);
 * }
 */
export function validatePatientInfo(
  patient: Partial<PatientInfo> | null | undefined
): ValidationResult {
  const result = createValidationResult();
  
  // Null/undefined check
  if (!patient) {
    addError(result, 'patient', 'Patient information is required', 'REQUIRED');
    return result;
  }
  
  // MRN validation
  if (isEmpty(patient.mrn)) {
    addError(result, 'mrn', 'Medical Record Number (MRN) is required', 'REQUIRED');
  } else if (!MRN_PATTERN.test(patient.mrn!)) {
    addError(
      result,
      'mrn',
      'MRN must be 5-20 characters (letters, digits, hyphens, underscores, or periods)',
      'INVALID_FORMAT'
    );
  } else if (containsXSS(patient.mrn!)) {
    addError(
      result,
      'mrn',
      'MRN contains invalid characters',
      'XSS_DETECTED'
    );
  }
  
  // First name validation
  if (isEmpty(patient.firstName)) {
    addError(result, 'firstName', 'First name is required', 'REQUIRED');
  } else if (containsDangerousUnicode(patient.firstName!)) {
    addError(
      result,
      'firstName',
      'First name contains invalid control characters',
      'DANGEROUS_UNICODE'
    );
  } else if (containsXSS(patient.firstName!)) {
    addError(
      result,
      'firstName',
      'First name contains invalid characters',
      'XSS_DETECTED'
    );
  } else {
    const trimmed = patient.firstName!.trim();
    if (trimmed.length > 100) {
      addError(
        result,
        'firstName',
        'First name must be 100 characters or less',
        'TOO_LONG'
      );
    } else if (!NAME_PATTERN.test(trimmed) && !NAME_PATTERN_EXTENDED.test(trimmed)) {
      addError(
        result,
        'firstName',
        'First name contains invalid characters',
        'INVALID_FORMAT'
      );
    }
  }
  
  // Last name validation
  if (isEmpty(patient.lastName)) {
    addError(result, 'lastName', 'Last name is required', 'REQUIRED');
  } else if (containsDangerousUnicode(patient.lastName!)) {
    addError(
      result,
      'lastName',
      'Last name contains invalid control characters',
      'DANGEROUS_UNICODE'
    );
  } else if (containsXSS(patient.lastName!)) {
    addError(
      result,
      'lastName',
      'Last name contains invalid characters',
      'XSS_DETECTED'
    );
  } else {
    const trimmed = patient.lastName!.trim();
    if (trimmed.length > 100) {
      addError(
        result,
        'lastName',
        'Last name must be 100 characters or less',
        'TOO_LONG'
      );
    } else if (!NAME_PATTERN.test(trimmed) && !NAME_PATTERN_EXTENDED.test(trimmed)) {
      addError(
        result,
        'lastName',
        'Last name contains invalid characters',
        'INVALID_FORMAT'
      );
    }
  }
  
  // Date of birth validation
  if (isEmpty(patient.dateOfBirth)) {
    addError(result, 'dateOfBirth', 'Date of birth is required', 'REQUIRED');
  } else if (!isValidDate(patient.dateOfBirth!)) {
    addError(
      result,
      'dateOfBirth',
      'Invalid date of birth',
      'INVALID_FORMAT'
    );
  } else if (isFutureDate(patient.dateOfBirth!)) {
    addError(
      result,
      'dateOfBirth',
      'Date of birth cannot be in the future',
      'INVALID_VALUE'
    );
  } else if (isTooOld(patient.dateOfBirth!)) {
    addError(
      result,
      'dateOfBirth',
      'Date of birth is too far in the past',
      'INVALID_VALUE'
    );
  }
  
  // Gender validation
  if (!patient.gender) {
    addError(result, 'gender', 'Gender is required', 'REQUIRED');
  } else if (!['F', 'M', 'O'].includes(patient.gender)) {
    addError(
      result,
      'gender',
      'Gender must be F, M, or O',
      'INVALID_VALUE'
    );
  }
  
  // Optional field validations
  if (patient.phone && !PHONE_PATTERN.test(patient.phone)) {
    addError(
      result,
      'phone',
      'Invalid phone number format',
      'INVALID_FORMAT'
    );
  }
  
  if (patient.email) {
    if (containsXSS(patient.email) || patient.email.toLowerCase().startsWith('javascript:')) {
      addError(
        result,
        'email',
        'Invalid email format',
        'XSS_DETECTED'
      );
    } else if (!EMAIL_PATTERN.test(patient.email)) {
      addError(
        result,
        'email',
        'Invalid email format',
        'INVALID_FORMAT'
      );
    }
  }
  
  // Warnings for mammography context
  if (patient.gender === 'M') {
    addWarning(
      result,
      'Male patient - mammography is less common. Verify indication.'
    );
  }
  
  return result;
}

// ============================================================================
// CLINICAL HISTORY VALIDATION
// ============================================================================

/**
 * Validate clinical history
 * 
 * @param history - Clinical history to validate
 * @returns ValidationResult with errors if invalid
 */
export function validateClinicalHistory(
  history: Partial<ClinicalHistory> | null | undefined
): ValidationResult {
  const result = createValidationResult();
  
  // Null/undefined check
  if (!history) {
    addError(result, 'clinicalHistory', 'Clinical history is required', 'REQUIRED');
    return result;
  }
  
  // Clinical indication is required
  if (isEmpty(history.clinicalIndication)) {
    addError(
      result,
      'clinicalIndication',
      'Clinical indication is required',
      'REQUIRED'
    );
  } else if (containsXSS(history.clinicalIndication!)) {
    addError(
      result,
      'clinicalIndication',
      'Clinical indication contains invalid characters',
      'XSS_DETECTED'
    );
  }
  
  // XSS check for additionalNotes field if present
  if (history.additionalNotes && containsXSS(history.additionalNotes)) {
    addError(
      result,
      'additionalNotes',
      'Notes field contains invalid characters',
      'XSS_DETECTED'
    );
  }
  
  // Validate boolean fields exist (not undefined)
  if (typeof history.familyHistoryBreastCancer !== 'boolean') {
    addError(
      result,
      'familyHistoryBreastCancer',
      'Family history must be specified (yes/no)',
      'REQUIRED'
    );
  }
  
  if (typeof history.personalHistoryBreastCancer !== 'boolean') {
    addError(
      result,
      'personalHistoryBreastCancer',
      'Personal history must be specified (yes/no)',
      'REQUIRED'
    );
  }
  
  if (typeof history.previousBiopsy !== 'boolean') {
    addError(
      result,
      'previousBiopsy',
      'Previous biopsy status must be specified (yes/no)',
      'REQUIRED'
    );
  }
  
  if (typeof history.comparisonAvailable !== 'boolean') {
    addError(
      result,
      'comparisonAvailable',
      'Comparison availability must be specified (yes/no)',
      'REQUIRED'
    );
  }
  
  // If previous biopsy is true, results should ideally be provided
  if (history.previousBiopsy === true && isEmpty(history.biopsyResults)) {
    addWarning(
      result,
      'Previous biopsy indicated but results not provided'
    );
  }
  
  // If comparison available, prior mammogram date should be provided
  if (history.comparisonAvailable === true && isEmpty(history.priorMammogramDate)) {
    addWarning(
      result,
      'Comparison available but prior mammogram date not specified'
    );
  }
  
  // Validate prior mammogram date format if provided
  if (
    history.priorMammogramDate &&
    !isEmpty(history.priorMammogramDate) &&
    !isValidDate(history.priorMammogramDate)
  ) {
    addError(
      result,
      'priorMammogramDate',
      'Invalid prior mammogram date format. Use YYYY-MM-DD',
      'INVALID_FORMAT'
    );
  }
  
  // Warnings for high-risk factors
  if (history.brca1Positive === true || history.brca2Positive === true) {
    addWarning(
      result,
      'BRCA mutation positive - high-risk patient'
    );
  }
  
  if (
    history.familyHistoryBreastCancer === true &&
    history.personalHistoryBreastCancer === true
  ) {
    addWarning(
      result,
      'Both family and personal history positive - very high-risk patient'
    );
  }
  
  return result;
}

// ============================================================================
// IMAGE FILE VALIDATION
// ============================================================================

/**
 * Validate an image file for upload
 * 
 * @param file - File object to validate
 * @returns ValidationResult with errors if invalid
 */
export function validateImageFile(
  file: File | null | undefined
): ValidationResult {
  const result = createValidationResult();
  
  // Null/undefined check
  if (!file) {
    addError(result, 'file', 'File is required', 'REQUIRED');
    return result;
  }
  
  // File size check
  if (file.size > MAX_FILE_SIZE) {
    const maxMB = MAX_FILE_SIZE / (1024 * 1024);
    addError(
      result,
      'fileSize',
      `File size exceeds maximum allowed (${maxMB}MB)`,
      'FILE_TOO_LARGE'
    );
  }
  
  // File size minimum (empty file check)
  if (file.size === 0) {
    addError(
      result,
      'fileSize',
      'File is empty',
      'FILE_EMPTY'
    );
  }
  
  // MIME type check
  if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
    addError(
      result,
      'mimeType',
      `File type "${file.type}" is not supported. Allowed: PNG, JPEG, DICOM`,
      'INVALID_FILE_TYPE'
    );
  }
  
  // Filename validation
  if (isEmpty(file.name)) {
    addError(
      result,
      'filename',
      'Filename is required',
      'REQUIRED'
    );
  }
  
  return result;
}

// ============================================================================
// IMAGE METADATA VALIDATION
// ============================================================================

/**
 * Image metadata input for validation
 */
export interface ImageMetadataInput {
  viewType?: ViewType | string;
  laterality?: Laterality | string;
}

/**
 * Validate image metadata (view type and laterality)
 * 
 * @param metadata - Image metadata to validate
 * @returns ValidationResult with errors if invalid
 */
export function validateImageMetadata(
  metadata: ImageMetadataInput | null | undefined
): ValidationResult {
  const result = createValidationResult();
  
  // Null/undefined check
  if (!metadata) {
    addError(result, 'metadata', 'Image metadata is required', 'REQUIRED');
    return result;
  }
  
  // View type validation
  if (!metadata.viewType) {
    addError(
      result,
      'viewType',
      'View type is required',
      'REQUIRED'
    );
  } else {
    const validViewTypes = Object.values(ViewType);
    if (!validViewTypes.includes(metadata.viewType as ViewType)) {
      addError(
        result,
        'viewType',
        `Invalid view type. Must be one of: ${validViewTypes.join(', ')}`,
        'INVALID_VALUE'
      );
    }
  }
  
  // Laterality validation
  if (!metadata.laterality) {
    addError(
      result,
      'laterality',
      'Laterality is required',
      'REQUIRED'
    );
  } else {
    const validLateralities = Object.values(Laterality);
    if (!validLateralities.includes(metadata.laterality as Laterality)) {
      addError(
        result,
        'laterality',
        `Invalid laterality. Must be one of: ${validLateralities.join(', ')}`,
        'INVALID_VALUE'
      );
    }
  }
  
  return result;
}

// ============================================================================
// BATCH VALIDATION
// ============================================================================

/**
 * Validate multiple images with their metadata
 * 
 * @param files - Array of files to validate
 * @param metadata - Array of metadata corresponding to files
 * @returns ValidationResult with indexed errors for each file
 */
export function validateImageBatch(
  files: File[],
  metadata: ImageMetadataInput[]
): ValidationResult {
  const result = createValidationResult();
  
  // Empty check
  if (!files || files.length === 0) {
    addError(result, 'files', 'At least one image is required', 'REQUIRED');
    return result;
  }
  
  // Max images check
  if (files.length > MAX_IMAGES_PER_CASE) {
    addError(
      result,
      'files',
      `Maximum ${MAX_IMAGES_PER_CASE} images allowed per case`,
      'TOO_MANY_FILES'
    );
  }
  
  // Metadata count mismatch
  if (!metadata || files.length !== metadata.length) {
    addError(
      result,
      'metadata',
      'Each image must have corresponding metadata',
      'METADATA_MISMATCH'
    );
    return result;
  }
  
  // Validate each file and metadata
  const duplicateCheck = new Map<string, number>();
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const meta = metadata[i];
    
    // Validate file
    const fileResult = validateImageFile(file);
    if (!fileResult.isValid) {
      fileResult.errors.forEach(error => {
        const indexedError: FieldError = {
          ...error,
          field: `files[${i}].${error.field}`,
          index: i,
        };
        result.errors.push(indexedError);
      });
      result.isValid = false;
    }
    
    // Validate metadata
    const metaResult = validateImageMetadata(meta);
    if (!metaResult.isValid) {
      metaResult.errors.forEach(error => {
        const indexedError: FieldError = {
          ...error,
          field: `metadata[${i}].${error.field}`,
          index: i,
        };
        result.errors.push(indexedError);
      });
      result.isValid = false;
    }
    
    // Check for duplicate view/laterality combinations
    if (meta?.viewType && meta?.laterality) {
      const key = `${meta.laterality}-${meta.viewType}`;
      if (duplicateCheck.has(key)) {
        addWarning(
          result,
          `Duplicate ${meta.laterality} ${meta.viewType} view at index ${i} (first at index ${duplicateCheck.get(key)})`
        );
      } else {
        duplicateCheck.set(key, i);
      }
    }
  }
  
  // Check for standard 4-view completeness
  const hasRCC = metadata.some(m => m.viewType === ViewType.CC && m.laterality === Laterality.RIGHT);
  const hasLCC = metadata.some(m => m.viewType === ViewType.CC && m.laterality === Laterality.LEFT);
  const hasRMLO = metadata.some(m => m.viewType === ViewType.MLO && m.laterality === Laterality.RIGHT);
  const hasLMLO = metadata.some(m => m.viewType === ViewType.MLO && m.laterality === Laterality.LEFT);
  
  if (!(hasRCC && hasLCC && hasRMLO && hasLMLO)) {
    const missing: string[] = [];
    if (!hasRCC) missing.push('RCC');
    if (!hasLCC) missing.push('LCC');
    if (!hasRMLO) missing.push('RMLO');
    if (!hasLMLO) missing.push('LMLO');
    
    addWarning(
      result,
      `Incomplete standard 4-view set. Missing: ${missing.join(', ')}`
    );
  }
  
  return result;
}

// ============================================================================
// CASE NUMBER VALIDATION
// ============================================================================

/** Case number pattern: CV-YYYY-NNNNNN */
export const CASE_NUMBER_PATTERN = /^CV-\d{4}-\d{6}$/;

/**
 * Validate case number format
 * 
 * @param caseNumber - Case number to validate
 * @returns ValidationResult
 */
export function validateCaseNumber(
  caseNumber: string | null | undefined
): ValidationResult {
  const result = createValidationResult();
  
  if (isEmpty(caseNumber)) {
    addError(result, 'caseNumber', 'Case number is required', 'REQUIRED');
    return result;
  }
  
  if (!CASE_NUMBER_PATTERN.test(caseNumber!)) {
    addError(
      result,
      'caseNumber',
      'Invalid case number format. Expected: CV-YYYY-NNNNNN',
      'INVALID_FORMAT'
    );
  }
  
  return result;
}

// ============================================================================
// COMPOSITE VALIDATORS
// ============================================================================

/**
 * Validate all case creation inputs
 * 
 * @param patient - Patient info
 * @param history - Clinical history
 * @returns Combined ValidationResult
 */
export function validateCaseCreation(
  patient: Partial<PatientInfo> | null | undefined,
  history: Partial<ClinicalHistory> | null | undefined
): ValidationResult {
  const result = createValidationResult();
  
  const patientResult = validatePatientInfo(patient);
  const historyResult = validateClinicalHistory(history);
  
  // Merge results
  if (!patientResult.isValid) {
    result.isValid = false;
    result.errors.push(...patientResult.errors);
  }
  result.warnings.push(...patientResult.warnings);
  
  if (!historyResult.isValid) {
    result.isValid = false;
    result.errors.push(...historyResult.errors);
  }
  result.warnings.push(...historyResult.warnings);
  
  return result;
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Sanitize filename by removing potentially dangerous characters
 * Removes XSS vectors, path traversal sequences, and null bytes
 * 
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    // Remove null bytes
    .replace(/\x00/g, '')
    // Remove path traversal sequences
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '_')
    // Remove HTML/script tags
    .replace(/<[^>]*>/g, '')
    // Only allow safe characters
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    // Collapse multiple underscores
    .replace(/_{2,}/g, '_')
    // Truncate to max length
    .substring(0, 255);
}

/**
 * Format validation errors for display
 * 
 * @param result - Validation result
 * @returns Array of formatted error strings
 */
export function formatValidationErrors(result: ValidationResult): string[] {
  return result.errors.map(error => {
    const prefix = error.index !== undefined ? `[${error.index}] ` : '';
    return `${prefix}${error.field}: ${error.message}`;
  });
}
