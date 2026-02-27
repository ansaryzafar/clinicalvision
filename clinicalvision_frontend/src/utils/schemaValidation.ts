/**
 * Schema Validation Utilities for ClinicalVision
 * 
 * Provides validation functions aligned with backend Pydantic schemas
 * and database constraints for robust data integrity.
 */

import {
  BIRADS,
  BIRADSValue,
  Finding,
  FindingLocation,
  PatientInfo,
  StudyInfo,
  ClinicalReport,
  ReportStatus,
  Modality,
  AnalysisSession,
} from '../types/clinical.types';

// ============================================================================
// Validation Result Types
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// ============================================================================
// BIRADS Validation
// ============================================================================

/** All valid BIRADS values */
const VALID_BIRADS_VALUES = ['0', '1', '2', '3', '4A', '4B', '4C', '5', '6'];

/**
 * Validate a BIRADS value
 */
export const validateBIRADS = (value: unknown): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (value === undefined || value === null) {
    errors.push({
      field: 'birads',
      message: 'BI-RADS value is required',
      code: 'BIRADS_REQUIRED',
    });
  } else {
    const strValue = String(value);
    if (!VALID_BIRADS_VALUES.includes(strValue)) {
      errors.push({
        field: 'birads',
        message: `Invalid BI-RADS value: ${strValue}. Must be one of: ${VALID_BIRADS_VALUES.join(', ')}`,
        code: 'BIRADS_INVALID',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Convert legacy numeric BIRADS to new string format
 */
export const normalizeBIRADS = (value: number | string): BIRADSValue => {
  if (typeof value === 'number') {
    if (value === 4) {
      // Default to 4B (moderate suspicion) for legacy category 4
      return BIRADS.SUSPICIOUS_MODERATE;
    }
    return String(value) as BIRADSValue;
  }
  return value as BIRADSValue;
};

// ============================================================================
// Patient Info Validation
// ============================================================================

/**
 * Validate patient information
 */
export const validatePatientInfo = (patient: Partial<PatientInfo>): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required fields
  if (!patient.patientId?.trim()) {
    errors.push({
      field: 'patientId',
      message: 'Patient ID is required',
      code: 'PATIENT_ID_REQUIRED',
    });
  }

  // Age validation (aligned with backend: ge=0, le=150)
  if (patient.age !== undefined) {
    if (patient.age < 0 || patient.age > 150) {
      errors.push({
        field: 'age',
        message: 'Age must be between 0 and 150',
        code: 'AGE_OUT_OF_RANGE',
      });
    }
    if (patient.age < 18 || patient.age > 100) {
      warnings.push({
        field: 'age',
        message: `Age ${patient.age} is outside typical screening range (18-100)`,
        suggestion: 'Please verify the age is correct',
      });
    }
  }

  // Gender validation
  if (patient.gender && !['M', 'F', 'O'].includes(patient.gender)) {
    errors.push({
      field: 'gender',
      message: 'Gender must be M, F, or O',
      code: 'GENDER_INVALID',
    });
  }

  // Date of birth format (ISO 8601)
  if (patient.dateOfBirth) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(patient.dateOfBirth)) {
      errors.push({
        field: 'dateOfBirth',
        message: 'Date of birth must be in YYYY-MM-DD format',
        code: 'DOB_INVALID_FORMAT',
      });
    } else {
      const dob = new Date(patient.dateOfBirth);
      const now = new Date();
      if (dob > now) {
        errors.push({
          field: 'dateOfBirth',
          message: 'Date of birth cannot be in the future',
          code: 'DOB_FUTURE',
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// ============================================================================
// Study Info Validation
// ============================================================================

const VALID_MODALITIES: Modality[] = ['MG', 'DBT', 'US', 'MRI', 'CT'];

/**
 * Validate study information
 */
export const validateStudyInfo = (study: Partial<StudyInfo>): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required fields
  if (!study.studyId?.trim()) {
    errors.push({
      field: 'studyId',
      message: 'Study ID is required',
      code: 'STUDY_ID_REQUIRED',
    });
  }

  if (!study.studyDate) {
    errors.push({
      field: 'studyDate',
      message: 'Study date is required',
      code: 'STUDY_DATE_REQUIRED',
    });
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(study.studyDate)) {
      errors.push({
        field: 'studyDate',
        message: 'Study date must be in YYYY-MM-DD format',
        code: 'STUDY_DATE_INVALID_FORMAT',
      });
    }
  }

  if (!study.studyDescription?.trim()) {
    warnings.push({
      field: 'studyDescription',
      message: 'Study description is recommended for clinical documentation',
    });
  }

  // Modality validation
  if (study.modality && !VALID_MODALITIES.includes(study.modality)) {
    errors.push({
      field: 'modality',
      message: `Invalid modality: ${study.modality}. Must be one of: ${VALID_MODALITIES.join(', ')}`,
      code: 'MODALITY_INVALID',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// ============================================================================
// Finding Validation
// ============================================================================

const VALID_FINDING_TYPES = ['mass', 'calcification', 'asymmetry', 'distortion', 'other'];
const VALID_FINDING_STATUSES = ['pending', 'reviewed', 'confirmed', 'dismissed'];
const VALID_QUADRANTS = ['UOQ', 'UIQ', 'LOQ', 'LIQ', 'central', 'subareolar', 'axillary_tail'];

/**
 * Validate finding location
 */
export const validateFindingLocation = (location: Partial<FindingLocation>): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Must have at least one location method
  const hasClockPosition = location.clockPosition !== undefined;
  const hasQuadrant = location.quadrant !== undefined;
  const hasDescription = location.description !== undefined;

  if (!hasClockPosition && !hasQuadrant && !hasDescription) {
    errors.push({
      field: 'location',
      message: 'Finding location must specify clock position, quadrant, or description',
      code: 'LOCATION_REQUIRED',
    });
  }

  // Clock position validation (1-12)
  if (hasClockPosition) {
    if (location.clockPosition! < 1 || location.clockPosition! > 12) {
      errors.push({
        field: 'location.clockPosition',
        message: 'Clock position must be between 1 and 12',
        code: 'CLOCK_POSITION_INVALID',
      });
    }
  }

  // Distance from nipple validation (0-20 cm typical)
  if (location.distanceFromNipple !== undefined) {
    if (location.distanceFromNipple < 0) {
      errors.push({
        field: 'location.distanceFromNipple',
        message: 'Distance from nipple cannot be negative',
        code: 'DISTANCE_NEGATIVE',
      });
    }
    if (location.distanceFromNipple > 20) {
      warnings.push({
        field: 'location.distanceFromNipple',
        message: `Distance from nipple (${location.distanceFromNipple} cm) is unusually large`,
        suggestion: 'Please verify measurement',
      });
    }
  }

  // Quadrant validation
  if (hasQuadrant && !VALID_QUADRANTS.includes(location.quadrant!)) {
    errors.push({
      field: 'location.quadrant',
      message: `Invalid quadrant: ${location.quadrant}. Must be one of: ${VALID_QUADRANTS.join(', ')}`,
      code: 'QUADRANT_INVALID',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate a finding
 */
export const validateFinding = (finding: Partial<Finding>): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required fields
  if (!finding.findingId?.trim()) {
    errors.push({
      field: 'findingId',
      message: 'Finding ID is required',
      code: 'FINDING_ID_REQUIRED',
    });
  }

  if (!finding.findingType) {
    errors.push({
      field: 'findingType',
      message: 'Finding type is required',
      code: 'FINDING_TYPE_REQUIRED',
    });
  } else if (!VALID_FINDING_TYPES.includes(finding.findingType)) {
    errors.push({
      field: 'findingType',
      message: `Invalid finding type: ${finding.findingType}`,
      code: 'FINDING_TYPE_INVALID',
    });
  }

  // Location validation
  if (finding.location) {
    const locationResult = validateFindingLocation(finding.location);
    errors.push(...locationResult.errors);
    warnings.push(...locationResult.warnings);
  } else {
    errors.push({
      field: 'location',
      message: 'Finding location is required',
      code: 'LOCATION_REQUIRED',
    });
  }

  // Status validation
  if (finding.status && !VALID_FINDING_STATUSES.includes(finding.status)) {
    errors.push({
      field: 'status',
      message: `Invalid finding status: ${finding.status}`,
      code: 'STATUS_INVALID',
    });
  }

  // Confidence validation (0-1)
  if (finding.aiConfidence !== undefined) {
    if (finding.aiConfidence < 0 || finding.aiConfidence > 1) {
      errors.push({
        field: 'aiConfidence',
        message: 'AI confidence must be between 0 and 1',
        code: 'CONFIDENCE_OUT_OF_RANGE',
      });
    }
  }

  // Measurement validation
  if (finding.measurements?.maxDiameter !== undefined) {
    if (finding.measurements.maxDiameter <= 0) {
      errors.push({
        field: 'measurements.maxDiameter',
        message: 'Maximum diameter must be positive',
        code: 'MEASUREMENT_INVALID',
      });
    }
    if (finding.measurements.maxDiameter > 200) {
      warnings.push({
        field: 'measurements.maxDiameter',
        message: `Maximum diameter (${finding.measurements.maxDiameter}mm) is unusually large`,
        suggestion: 'Please verify measurement',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// ============================================================================
// Report Validation
// ============================================================================

const VALID_REPORT_STATUSES: ReportStatus[] = [
  'draft', 'pending_review', 'reviewed', 'approved', 'signed', 'amended', 'cancelled'
];

/**
 * Validate clinical report
 */
export const validateClinicalReport = (report: Partial<ClinicalReport>): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required fields
  if (!report.reportId?.trim()) {
    errors.push({
      field: 'reportId',
      message: 'Report ID is required',
      code: 'REPORT_ID_REQUIRED',
    });
  }

  if (!report.impression?.trim()) {
    errors.push({
      field: 'impression',
      message: 'Clinical impression is required',
      code: 'IMPRESSION_REQUIRED',
    });
  } else if (report.impression.length < 10) {
    warnings.push({
      field: 'impression',
      message: 'Clinical impression seems too brief',
      suggestion: 'Consider providing more detail',
    });
  }

  // BIRADS validation
  if (report.biradsAssessment !== undefined) {
    const biradsResult = validateBIRADS(report.biradsAssessment);
    errors.push(...biradsResult.errors);
    warnings.push(...biradsResult.warnings);
  } else {
    errors.push({
      field: 'biradsAssessment',
      message: 'BI-RADS assessment is required',
      code: 'BIRADS_REQUIRED',
    });
  }

  // Status validation
  if (report.status && !VALID_REPORT_STATUSES.includes(report.status)) {
    errors.push({
      field: 'status',
      message: `Invalid report status: ${report.status}`,
      code: 'STATUS_INVALID',
    });
  }

  // Validate that signed reports have required fields
  if (report.status === 'signed') {
    if (!report.signedAt) {
      errors.push({
        field: 'signedAt',
        message: 'Signed reports must have a signature timestamp',
        code: 'SIGNED_TIMESTAMP_REQUIRED',
      });
    }
    if (!report.radiologistName?.trim()) {
      errors.push({
        field: 'radiologistName',
        message: 'Signed reports must have radiologist name',
        code: 'RADIOLOGIST_REQUIRED',
      });
    }
  }

  // Validate amendment has reason
  if (report.status === 'amended' && !report.amendmentReason?.trim()) {
    errors.push({
      field: 'amendmentReason',
      message: 'Amended reports must include amendment reason',
      code: 'AMENDMENT_REASON_REQUIRED',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// ============================================================================
// ISO 8601 Timestamp Validation
// ============================================================================

/**
 * Validate ISO 8601 timestamp format
 */
export const validateISO8601Timestamp = (timestamp: string | undefined, fieldName: string): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!timestamp) {
    return { isValid: true, errors, warnings };
  }

  // ISO 8601 regex (supports various formats)
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;

  if (!iso8601Regex.test(timestamp)) {
    errors.push({
      field: fieldName,
      message: `Invalid timestamp format: ${timestamp}. Expected ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)`,
      code: 'TIMESTAMP_INVALID_FORMAT',
    });
  } else {
    // Validate it's a real date
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      errors.push({
        field: fieldName,
        message: `Invalid date value: ${timestamp}`,
        code: 'TIMESTAMP_INVALID_DATE',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// ============================================================================
// File Validation (aligned with backend constraints)
// ============================================================================

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/dicom',
  'application/octet-stream', // DICOM files often have this
];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.dcm', '.dicom'];

/**
 * Validate uploaded file
 */
export const validateUploadFile = (file: File): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Size validation
  if (file.size > MAX_FILE_SIZE_BYTES) {
    errors.push({
      field: 'file',
      message: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed (50MB)`,
      code: 'FILE_TOO_LARGE',
    });
  }

  if (file.size === 0) {
    errors.push({
      field: 'file',
      message: 'File is empty',
      code: 'FILE_EMPTY',
    });
  }

  // Type validation
  const fileName = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
  const hasValidMimeType = ALLOWED_MIME_TYPES.includes(file.type) || file.type === '';

  if (!hasValidExtension && !hasValidMimeType) {
    errors.push({
      field: 'file',
      message: `Invalid file format: ${file.type || 'unknown'}. Allowed: PNG, JPG, DICOM`,
      code: 'FILE_INVALID_TYPE',
    });
  }

  // DICOM file warning
  if (fileName.endsWith('.dcm') || fileName.endsWith('.dicom')) {
    warnings.push({
      field: 'file',
      message: 'DICOM files may take longer to process',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// ============================================================================
// Comprehensive Session Validation
// ============================================================================

/**
 * Validate an entire analysis session
 */
export const validateAnalysisSession = (session: Partial<AnalysisSession>): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate patient info
  if (session.patientInfo) {
    const patientResult = validatePatientInfo(session.patientInfo);
    errors.push(...patientResult.errors.map(e => ({ ...e, field: `patientInfo.${e.field}` })));
    warnings.push(...patientResult.warnings.map(w => ({ ...w, field: `patientInfo.${w.field}` })));
  }

  // Validate study info
  if (session.studyInfo) {
    const studyResult = validateStudyInfo(session.studyInfo);
    errors.push(...studyResult.errors.map(e => ({ ...e, field: `studyInfo.${e.field}` })));
    warnings.push(...studyResult.warnings.map(w => ({ ...w, field: `studyInfo.${w.field}` })));
  }

  // Validate findings
  if (session.findings) {
    session.findings.forEach((finding, index) => {
      const findingResult = validateFinding(finding);
      errors.push(...findingResult.errors.map(e => ({ ...e, field: `findings[${index}].${e.field}` })));
      warnings.push(...findingResult.warnings.map(w => ({ ...w, field: `findings[${index}].${w.field}` })));
    });
  }

  // Validate assessment BIRADS
  if (session.assessment?.biradsCategory) {
    const biradsResult = validateBIRADS(session.assessment.biradsCategory);
    errors.push(...biradsResult.errors.map(e => ({ ...e, field: `assessment.${e.field}` })));
    warnings.push(...biradsResult.warnings.map(w => ({ ...w, field: `assessment.${w.field}` })));
  }

  // Check for images
  if (!session.images || session.images.length === 0) {
    warnings.push({
      field: 'images',
      message: 'No images uploaded yet',
      suggestion: 'Upload at least one image to proceed',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// ============================================================================
// Export all validation functions
// ============================================================================

const schemaValidation = {
  validateBIRADS,
  normalizeBIRADS,
  validatePatientInfo,
  validateStudyInfo,
  validateFindingLocation,
  validateFinding,
  validateClinicalReport,
  validateISO8601Timestamp,
  validateUploadFile,
  validateAnalysisSession,
};

export default schemaValidation;
