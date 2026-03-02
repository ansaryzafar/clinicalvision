/**
 * ClinicalVision Case Types - Redesigned Workflow
 * 
 * This module defines the core types for the redesigned clinical workflow.
 * Follows ACR BI-RADS 5th Edition standards and supports multi-image mammography.
 * 
 * @version 2.0
 * @author ClinicalVision Development Team
 */

// ============================================================================
// RESULT TYPE PATTERN
// For type-safe error handling without exceptions
// ============================================================================

/**
 * Result type for operations that can fail
 * Prevents runtime errors by making failure explicit in the type system
 */
export type Result<T, E = Error> =
  | { success: true; data: T; warnings?: string[] }
  | { success: false; error: E };

/**
 * Create a successful result
 * @template T - The data type
 * @template E - The error type (for type compatibility)
 */
export function success<T, E = Error>(data: T, warnings?: string[]): Result<T, E> {
  return { success: true, data, warnings };
}

/**
 * Create a failure result
 */
export function failure<E = Error>(error: E): Result<never, E> {
  return { success: false, error };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  WORKFLOW_ERROR = 'WORKFLOW_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERSISTENCE_ERROR = 'PERSISTENCE_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  UPLOAD_ERROR = 'UPLOAD_ERROR',
  ANALYSIS_ERROR = 'ANALYSIS_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  /** Analysis failed - used when batch or single image analysis fails */
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
  /** Invalid workflow state - used when workflow step doesn't allow action */
  INVALID_WORKFLOW_STATE = 'INVALID_WORKFLOW_STATE',
  /** No case loaded - used when an operation requires an active case */
  NO_CASE = 'NO_CASE',
}

export interface FieldError {
  field: string;
  message: string;
  code?: string;
  index?: number; // For array fields
}

export interface ValidationError extends Error {
  name: 'ValidationError';
  code: ErrorCode.VALIDATION_ERROR;
  errors: FieldError[];
}

export interface WorkflowError extends Error {
  name: 'WorkflowError';
  code: ErrorCode.WORKFLOW_ERROR;
  currentStep: ClinicalWorkflowStep;
  attemptedStep?: ClinicalWorkflowStep;
}

// ============================================================================
// WORKFLOW STEP ENUM - Redesigned Clinical Order
// ============================================================================

/**
 * Clinical Workflow Steps - Patient-First Order
 * 
 * This enum defines the correct clinical workflow order:
 * 1. Patient info FIRST (clinical context before imaging)
 * 2. Image upload (supports multiple images)
 * 3. AI analysis (batch processing)
 * 4. Radiologist review and assessment
 * 5. Report generation and finalization
 */
export enum ClinicalWorkflowStep {
  // Phase 1: Case Setup
  PATIENT_REGISTRATION = 'patient_registration',
  CLINICAL_HISTORY = 'clinical_history',
  
  // Phase 2: Imaging
  IMAGE_UPLOAD = 'image_upload',
  IMAGE_VERIFICATION = 'image_verification',
  
  // Phase 3: AI Analysis
  BATCH_AI_ANALYSIS = 'batch_ai_analysis',
  FINDINGS_REVIEW = 'findings_review',
  
  // Phase 4: Reporting
  BIRADS_ASSESSMENT = 'birads_assessment',
  REPORT_GENERATION = 'report_generation',
  
  // Phase 6: Completion
  FINALIZE = 'finalize',
  DIGITAL_SIGNATURE = 'digital_signature',
}

/**
 * Step index for ordering comparisons
 */
export const STEP_INDEX: Record<ClinicalWorkflowStep, number> = {
  [ClinicalWorkflowStep.PATIENT_REGISTRATION]: 0,
  [ClinicalWorkflowStep.CLINICAL_HISTORY]: 1,
  [ClinicalWorkflowStep.IMAGE_UPLOAD]: 2,
  [ClinicalWorkflowStep.IMAGE_VERIFICATION]: 3,
  [ClinicalWorkflowStep.BATCH_AI_ANALYSIS]: 4,
  [ClinicalWorkflowStep.FINDINGS_REVIEW]: 5,
  [ClinicalWorkflowStep.BIRADS_ASSESSMENT]: 6,
  [ClinicalWorkflowStep.REPORT_GENERATION]: 7,
  [ClinicalWorkflowStep.FINALIZE]: 8,
  [ClinicalWorkflowStep.DIGITAL_SIGNATURE]: 9,
};

/**
 * Total number of workflow steps
 */
export const TOTAL_WORKFLOW_STEPS = 10;

/**
 * Step configuration for UI display
 */
export interface StepConfig {
  step: ClinicalWorkflowStep;
  label: string;
  description: string;
  icon: string;
  isRequired: boolean;
  phase: 'setup' | 'imaging' | 'analysis' | 'review' | 'reporting' | 'completion';
}

export const WORKFLOW_STEP_CONFIG: StepConfig[] = [
  {
    step: ClinicalWorkflowStep.PATIENT_REGISTRATION,
    label: 'Patient Registration',
    description: 'Enter patient demographics',
    icon: 'person_add',
    isRequired: true,
    phase: 'setup',
  },
  {
    step: ClinicalWorkflowStep.CLINICAL_HISTORY,
    label: 'Clinical History',
    description: 'Record risk factors and symptoms',
    icon: 'history',
    isRequired: true,
    phase: 'setup',
  },
  {
    step: ClinicalWorkflowStep.IMAGE_UPLOAD,
    label: 'Image Upload',
    description: 'Upload mammogram images',
    icon: 'upload_file',
    isRequired: true,
    phase: 'imaging',
  },
  {
    step: ClinicalWorkflowStep.IMAGE_VERIFICATION,
    label: 'Verify Images',
    description: 'Confirm view types and laterality',
    icon: 'verified',
    isRequired: true,
    phase: 'imaging',
  },
  {
    step: ClinicalWorkflowStep.BATCH_AI_ANALYSIS,
    label: 'AI Analysis',
    description: 'Run AI on all images',
    icon: 'psychology',
    isRequired: true,
    phase: 'analysis',
  },
  {
    step: ClinicalWorkflowStep.FINDINGS_REVIEW,
    label: 'Image Analysis',
    description: 'Review and analyze findings with the imaging suite',
    icon: 'biotech',
    isRequired: true,
    phase: 'analysis',
  },
  {
    step: ClinicalWorkflowStep.BIRADS_ASSESSMENT,
    label: 'BI-RADS Assessment',
    description: 'Assign BI-RADS categories',
    icon: 'assessment',
    isRequired: true,
    phase: 'reporting',
  },
  {
    step: ClinicalWorkflowStep.REPORT_GENERATION,
    label: 'Generate Report',
    description: 'Create clinical report',
    icon: 'description',
    isRequired: true,
    phase: 'reporting',
  },
  {
    step: ClinicalWorkflowStep.FINALIZE,
    label: 'Finalize',
    description: 'Final review before signing',
    icon: 'task_alt',
    isRequired: true,
    phase: 'completion',
  },
  {
    step: ClinicalWorkflowStep.DIGITAL_SIGNATURE,
    label: 'Sign Report',
    description: 'Apply digital signature',
    icon: 'draw',
    isRequired: true,
    phase: 'completion',
  },
];

// ============================================================================
// PATIENT INFORMATION
// ============================================================================

/**
 * Patient demographics - HIPAA compliant structure
 */
export interface PatientInfo {
  /** Medical Record Number - Primary identifier */
  mrn: string;
  
  /** Patient first name */
  firstName: string;
  
  /** Patient last name */
  lastName: string;
  
  /** Date of birth in ISO 8601 format (YYYY-MM-DD) */
  dateOfBirth: string;
  
  /** Gender - M/F/O for Other */
  gender: 'F' | 'M' | 'O';
  
  /** Optional contact phone */
  phone?: string;
  
  /** Optional contact email */
  email?: string;
  
  /** Insurance provider name */
  insuranceProvider?: string;
  
  /** Insurance ID number */
  insuranceId?: string;
}

/**
 * Default/empty patient info for initialization
 */
export const EMPTY_PATIENT_INFO: PatientInfo = {
  mrn: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: 'F',
};

// ============================================================================
// CLINICAL HISTORY
// ============================================================================

/**
 * Clinical history - Risk factors and presentation
 */
export interface ClinicalHistory {
  // Risk Factors
  /** Family history of breast cancer */
  familyHistoryBreastCancer: boolean;
  
  /** Personal history of breast cancer */
  personalHistoryBreastCancer: boolean;
  
  /** BRCA1 mutation positive */
  brca1Positive?: boolean;
  
  /** BRCA2 mutation positive */
  brca2Positive?: boolean;
  
  /** Previous breast biopsy */
  previousBiopsy: boolean;
  
  /** Previous biopsy results if applicable */
  biopsyResults?: string;
  
  // Clinical Presentation
  /** Clinical indication (Screening, Diagnostic, etc.) */
  clinicalIndication: string;
  
  /** Current symptoms */
  symptoms?: string[];
  
  // Prior Studies
  /** Date of prior mammogram */
  priorMammogramDate?: string;
  
  /** Prior mammogram findings */
  priorMammogramFinding?: string;
  
  /** Whether prior study is available for comparison */
  comparisonAvailable: boolean;
  
  /** Additional clinical notes */
  additionalNotes?: string;
}

/**
 * Default/empty clinical history
 */
export const EMPTY_CLINICAL_HISTORY: ClinicalHistory = {
  familyHistoryBreastCancer: false,
  personalHistoryBreastCancer: false,
  previousBiopsy: false,
  clinicalIndication: '',
  comparisonAvailable: false,
};

/**
 * Clinical indication options
 */
export const CLINICAL_INDICATION_OPTIONS = [
  'Screening mammogram',
  'Diagnostic - palpable mass',
  'Diagnostic - nipple discharge',
  'Diagnostic - skin changes',
  'Diagnostic - pain',
  'Follow-up - prior abnormal',
  'Follow-up - post-treatment',
  'High-risk screening',
  'Breast implant evaluation',
  'Other',
] as const;

/**
 * Symptom options
 */
export const SYMPTOM_OPTIONS = [
  'Palpable mass/lump',
  'Nipple discharge',
  'Nipple inversion',
  'Skin thickening',
  'Skin dimpling',
  'Skin erythema',
  'Breast pain/tenderness',
  'Axillary mass',
  'Asymmetry noticed by patient',
  'None',
] as const;

// ============================================================================
// MAMMOGRAM IMAGE TYPES
// ============================================================================

/**
 * Standard mammogram view types
 */
export enum ViewType {
  // Standard views
  CC = 'CC',       // Craniocaudal
  MLO = 'MLO',     // Mediolateral Oblique
  
  // Additional standard views
  ML = 'ML',       // Mediolateral (true lateral)
  LM = 'LM',       // Lateromedial
  
  // Extended views
  XCCL = 'XCCL',   // Exaggerated CC Lateral
  XCCM = 'XCCM',   // Exaggerated CC Medial
  
  // Special views
  SPOT = 'SPOT',   // Spot compression
  MAG = 'MAG',     // Magnification
  TAN = 'TAN',     // Tangential
  CV = 'CV',       // Cleavage view
  ID = 'ID',       // Implant displaced (Eklund)
}

/**
 * View type display labels
 */
export const VIEW_TYPE_LABELS: Record<ViewType, string> = {
  [ViewType.CC]: 'Craniocaudal (CC)',
  [ViewType.MLO]: 'Mediolateral Oblique (MLO)',
  [ViewType.ML]: 'Mediolateral (ML)',
  [ViewType.LM]: 'Lateromedial (LM)',
  [ViewType.XCCL]: 'Exaggerated CC Lateral',
  [ViewType.XCCM]: 'Exaggerated CC Medial',
  [ViewType.SPOT]: 'Spot Compression',
  [ViewType.MAG]: 'Magnification',
  [ViewType.TAN]: 'Tangential',
  [ViewType.CV]: 'Cleavage View',
  [ViewType.ID]: 'Implant Displaced',
};

/**
 * Breast laterality
 */
export enum Laterality {
  RIGHT = 'R',
  LEFT = 'L',
}

/**
 * Laterality display labels
 */
export const LATERALITY_LABELS: Record<Laterality, string> = {
  [Laterality.RIGHT]: 'Right',
  [Laterality.LEFT]: 'Left',
};

/**
 * Image upload status
 */
export type UploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

/**
 * Single mammogram image with metadata
 */
export interface MammogramImage {
  /** Unique identifier (UUID) */
  id: string;
  
  // File information
  /** Original filename */
  filename: string;
  
  /** File size in bytes */
  fileSize: number;
  
  /** MIME type (image/png, image/jpeg, application/dicom) */
  mimeType: string;
  
  // Storage
  /** Local blob URL for display */
  localUrl: string;
  
  /** Server storage path after upload */
  serverPath?: string;
  
  /** Backend database ID */
  backendImageId?: number;
  
  // Mandatory metadata
  /** View type (CC, MLO, etc.) */
  viewType: ViewType;
  
  /** Laterality (R or L) */
  laterality: Laterality;
  
  // Optional DICOM metadata
  /** Image acquisition date */
  acquisitionDate?: string;
  
  /** Institution name from DICOM */
  institutionName?: string;
  
  /** Manufacturer/model from DICOM */
  manufacturerModel?: string;
  
  /** Image dimensions */
  dimensions?: {
    width: number;
    height: number;
  };
  
  // Upload state
  /** Current upload status */
  uploadStatus: UploadStatus;
  
  /** Upload progress percentage (0-100) */
  uploadProgress?: number;
  
  /** Error message if upload failed */
  uploadError?: string;
  
  /** Timestamp of upload */
  uploadedAt?: string;
}

/**
 * Standard 4-view mammogram configuration
 */
export const STANDARD_VIEWS = [
  { viewType: ViewType.CC, laterality: Laterality.RIGHT, label: 'RCC' },
  { viewType: ViewType.CC, laterality: Laterality.LEFT, label: 'LCC' },
  { viewType: ViewType.MLO, laterality: Laterality.RIGHT, label: 'RMLO' },
  { viewType: ViewType.MLO, laterality: Laterality.LEFT, label: 'LMLO' },
] as const;

/**
 * Maximum number of images per case
 */
export const MAX_IMAGES_PER_CASE = 8;

/**
 * Maximum file size in bytes (50MB)
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Allowed MIME types for upload
 */
export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/dicom',
  'application/octet-stream', // Some DICOM files
] as const;

// ============================================================================
// AI ANALYSIS RESULTS
// ============================================================================

/**
 * Suspicious region detected by AI
 */
export interface SuspiciousRegion {
  /** Bounding box [x, y, width, height] */
  bbox: [number, number, number, number];
  
  /** AI attention score (0-1) */
  attentionScore: number;
  
  /** AI-generated description */
  description?: string;
  
  /** Radiologist confirmation */
  confirmedByRadiologist?: boolean;
  
  /** Radiologist notes */
  radiologistNotes?: string;
}

/**
 * Risk level classification
 */
export type RiskLevel = 'low' | 'moderate' | 'high';

/**
 * Per-image AI analysis result
 */
export interface ImageAnalysisResult {
  /** Links to MammogramImage.id */
  imageId: string;
  
  /** Binary prediction */
  prediction: 'benign' | 'malignant';
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Class probabilities */
  probabilities: {
    benign: number;
    malignant: number;
  };
  
  /** Risk classification */
  riskLevel: RiskLevel;
  
  /** Detected suspicious regions */
  suspiciousRegions: SuspiciousRegion[];
  
  /** AI attention summary text */
  attentionSummary?: string;
  
  /** GradCAM++ attention heatmap (2D array, 0-1 values) for MedicalViewer overlay */
  attentionMap?: number[][];
  
  /** Model uncertainty metrics from MC Dropout */
  uncertainty?: UncertaintyInfo;
  
  /** Image dimension metadata for coordinate system transformation */
  imageMetadata?: ImageDimensionMetadata;
  
  /** Confidence explanation text from model */
  confidenceExplanation?: string;
  
  /** Model version used */
  modelVersion: string;
  
  /** Processing time in milliseconds */
  processingTimeMs: number;
  
  /** Analysis timestamp */
  analyzedAt: string;
}

/**
 * Uncertainty metrics from MC Dropout inference (camelCase domain type)
 */
export interface UncertaintyInfo {
  /** Epistemic (model) uncertainty */
  epistemicUncertainty: number;
  /** Aleatoric (data) uncertainty */
  aleatoricUncertainty?: number;
  /** Predictive entropy */
  predictiveEntropy: number;
  /** Mutual information */
  mutualInformation?: number;
  /** Number of MC Dropout samples */
  mcSamples?: number;
  /** Standard deviation across MC samples */
  mcStd?: number;
  /** Whether the case requires human review due to uncertainty */
  requiresHumanReview: boolean;
}

/**
 * Image dimension metadata for coordinate transformation (camelCase domain type)
 */
export interface ImageDimensionMetadata {
  /** Original image width in pixels */
  originalWidth: number;
  /** Original image height in pixels */
  originalHeight: number;
  /** Model input width (typically 224) */
  modelWidth: number;
  /** Model input height (typically 224) */
  modelHeight: number;
  /** Scale factor X (originalWidth / modelWidth) */
  scaleX: number;
  /** Scale factor Y (originalHeight / modelHeight) */
  scaleY: number;
  /** Image aspect ratio */
  aspectRatio: number;
  /** Coordinate system indicator */
  coordinateSystem: 'model' | 'original';
}

// ============================================================================
// CONSOLIDATED FINDINGS
// ============================================================================

/**
 * Breast quadrant
 */
export type BreastQuadrant = 'UOQ' | 'UIQ' | 'LOQ' | 'LIQ' | 'Central' | 'Axillary';

/**
 * Tissue depth
 */
export type TissueDepth = 'Anterior' | 'Middle' | 'Posterior';

/**
 * Finding type categories (BI-RADS lexicon)
 */
export enum FindingType {
  MASS = 'mass',
  CALCIFICATION = 'calcification',
  ARCHITECTURAL_DISTORTION = 'architectural_distortion',
  ASYMMETRY = 'asymmetry',
  FOCAL_ASYMMETRY = 'focal_asymmetry',
  GLOBAL_ASYMMETRY = 'global_asymmetry',
  INTRAMAMMARY_LYMPH_NODE = 'intramammary_lymph_node',
  SKIN_LESION = 'skin_lesion',
  SOLITARY_DILATED_DUCT = 'solitary_dilated_duct',
}

/**
 * Consolidated finding across views
 */
export interface ConsolidatedFinding {
  /** Unique finding ID */
  id: string;
  
  // Location
  /** Which breast */
  laterality: Laterality;
  
  /** Clock position (1-12) */
  clockPosition?: number;
  
  /** Breast quadrant */
  quadrant?: BreastQuadrant;
  
  /** Tissue depth */
  depth?: TissueDepth;
  
  /** Distance from nipple in mm */
  distanceFromNipple?: number;
  
  // Morphology (BI-RADS lexicon)
  /** Finding type */
  findingType: FindingType;
  
  /** Shape descriptor */
  shape?: string;
  
  /** Margin descriptor */
  margin?: string;
  
  /** Density descriptor */
  density?: string;
  
  /** Calcification descriptor */
  calcifications?: string;
  
  /** Associated features */
  associatedFeatures?: string[];
  
  // Size
  /** Size measurements in mm */
  size?: {
    length: number;
    width?: number;
    depth?: number;
  };
  
  // Visibility
  /** Image IDs where this finding is visible */
  visibleInViews: string[];
  
  // AI Correlation
  /** Correlated AI suspicious region IDs */
  aiCorrelatedRegions: string[];
  
  /** AI confidence for this finding */
  aiConfidence?: number;
  
  // Assessment
  /** Individual BI-RADS for this finding */
  individualBiRads?: string;
  
  // Notes
  /** Radiologist notes */
  radiologistNotes?: string;
  
  /** Creation timestamp */
  createdAt: string;
  
  /** Last update timestamp */
  updatedAt: string;
}

// ============================================================================
// BI-RADS ASSESSMENT
// ============================================================================

/**
 * Breast composition categories (BI-RADS 5th Edition)
 */
export enum BreastComposition {
  A = 'a', // Almost entirely fatty
  B = 'b', // Scattered fibroglandular densities
  C = 'c', // Heterogeneously dense
  D = 'd', // Extremely dense
}

/**
 * Breast composition descriptions
 */
export const BREAST_COMPOSITION_DESCRIPTIONS: Record<BreastComposition, string> = {
  [BreastComposition.A]: 'Almost entirely fatty',
  [BreastComposition.B]: 'Scattered areas of fibroglandular density',
  [BreastComposition.C]: 'Heterogeneously dense',
  [BreastComposition.D]: 'Extremely dense',
};

/**
 * BI-RADS categories with 4A/4B/4C subdivisions
 */
export type BiRadsCategory = '0' | '1' | '2' | '3' | '4A' | '4B' | '4C' | '5' | '6';

/**
 * BI-RADS category constants for programmatic use
 */
export const BiRadsValues = {
  INCOMPLETE: '0' as BiRadsCategory,
  NEGATIVE: '1' as BiRadsCategory,
  BENIGN: '2' as BiRadsCategory,
  PROBABLY_BENIGN: '3' as BiRadsCategory,
  SUSPICIOUS_LOW: '4A' as BiRadsCategory,
  SUSPICIOUS_MODERATE: '4B' as BiRadsCategory,
  SUSPICIOUS_HIGH: '4C' as BiRadsCategory,
  HIGHLY_SUGGESTIVE: '5' as BiRadsCategory,
  KNOWN_MALIGNANCY: '6' as BiRadsCategory,
} as const;

/**
 * BI-RADS category descriptions
 */
export const BIRADS_CATEGORY_DESCRIPTIONS: Record<BiRadsCategory, string> = {
  '0': 'Incomplete - Additional imaging needed',
  '1': 'Negative - No findings',
  '2': 'Benign',
  '3': 'Probably Benign',
  '4A': 'Low Suspicion for Malignancy',
  '4B': 'Moderate Suspicion for Malignancy',
  '4C': 'High Suspicion for Malignancy',
  '5': 'Highly Suggestive of Malignancy',
  '6': 'Known Biopsy-Proven Malignancy',
};

/**
 * BI-RADS malignancy risk ranges
 */
export const BIRADS_RISK_RANGES: Record<BiRadsCategory, string> = {
  '0': 'N/A',
  '1': '0%',
  '2': '0%',
  '3': '≤2%',
  '4A': '2-10%',
  '4B': '10-50%',
  '4C': '50-95%',
  '5': '>95%',
  '6': '100%',
};

/**
 * Per-breast assessment
 */
export interface BreastAssessment {
  /** Breast composition */
  composition: BreastComposition;
  
  /** BI-RADS category */
  biRadsCategory: BiRadsCategory;
  
  /** Findings summary for this breast */
  findings?: string;
}

/**
 * Complete BI-RADS assessment
 */
export interface BiRadsAssessment {
  /** Right breast assessment */
  rightBreast: BreastAssessment;
  
  /** Left breast assessment */
  leftBreast: BreastAssessment;
  
  /** Overall BI-RADS category (highest of both) */
  overallCategory: BiRadsCategory;
  
  /** Clinical impression */
  impression: string;
  
  /** Management recommendation */
  recommendation: string;
  
  /** Follow-up interval if applicable */
  followUpInterval?: string;
  
  // Comparison
  /** Whether compared with prior study */
  comparedWithPrior: boolean;
  
  /** Prior study date */
  priorStudyDate?: string;
  
  /** Change from prior */
  changeFromPrior?: 'stable' | 'improved' | 'worse' | 'new';
}

// ============================================================================
// GENERATED REPORT
// ============================================================================

/**
 * Report status
 */
export type ReportStatus = 'draft' | 'pending_review' | 'reviewed' | 'signed' | 'amended';

/**
 * Generated clinical report
 */
export interface GeneratedReport {
  /** Report ID */
  id: string;
  
  /** Report content (structured) */
  content: {
    header: string;
    clinicalHistory: string;
    technique: string;
    comparison: string;
    findings: string;
    impression: string;
    recommendation: string;
  };
  
  /** Report status */
  status: ReportStatus;
  
  /** PDF URL if generated */
  pdfUrl?: string;
  
  /** Generated timestamp */
  generatedAt: string;
  
  /** Last modified timestamp */
  modifiedAt: string;
}

// ============================================================================
// WORKFLOW STATE
// ============================================================================

/**
 * Case workflow status
 */
export type CaseStatus = 'draft' | 'in_progress' | 'pending_review' | 'completed' | 'finalized';

/**
 * Workflow state management
 */
export interface WorkflowState {
  /** Current workflow step */
  currentStep: ClinicalWorkflowStep;
  
  /** Array of completed steps */
  completedSteps: ClinicalWorkflowStep[];
  
  /** Overall case status */
  status: CaseStatus;
  
  // Timestamps
  /** When workflow started */
  startedAt: string;
  
  /** Last modification time */
  lastModifiedAt: string;
  
  /** When completed (if applicable) */
  completedAt?: string;
  
  /** When finalized (if applicable) */
  finalizedAt?: string;
  
  // Lock state
  /** Whether case is locked for editing */
  isLocked: boolean;
  
  /** User ID who locked the case */
  lockedBy?: string;
  
  /** When case was locked */
  lockedAt?: string;
}

// ============================================================================
// AUDIT TRAIL
// ============================================================================

/**
 * Single audit entry
 */
export interface AuditEntry {
  /** When the action occurred */
  timestamp: string;
  
  /** User who performed the action */
  userId: string;
  
  /** Action description */
  action: string;
  
  /** Field that was changed (if applicable) */
  field?: string;
  
  /** Previous value */
  previousValue?: unknown;
  
  /** New value */
  newValue?: unknown;
}

/**
 * Complete audit trail
 */
export interface AuditTrail {
  /** User who created the case */
  createdBy: string;
  
  /** Creation timestamp */
  createdAt: string;
  
  /** User who last modified the case */
  lastModifiedBy?: string;
  
  /** Last modification timestamp */
  lastModifiedAt?: string;
  
  /** Array of modifications */
  modifications: AuditEntry[];
  
  // Digital signature
  /** User who signed the report */
  signedBy?: string;
  
  /** Signature timestamp */
  signedAt?: string;
  
  /** Signature hash for verification */
  signatureHash?: string;
}

// ============================================================================
// CLINICAL CASE - MAIN ENTITY
// ============================================================================

/**
 * Complete Clinical Case
 * This is the primary entity for the redesigned workflow
 */
export interface ClinicalCase {
  // Identifiers
  /** Unique ID (UUID) */
  id: string;
  
  /** Human-readable case number (e.g., "CV-2026-001234") */
  caseNumber: string;
  
  /** Backend database ID (UUID from PostgreSQL) */
  backendId?: string;
  
  // Patient & History
  /** Patient demographics */
  patient: PatientInfo;
  
  /** Clinical history */
  clinicalHistory: ClinicalHistory;
  
  // Images
  /** Array of all mammogram images */
  images: MammogramImage[];
  
  // AI Analysis
  /** Per-image AI analysis results */
  analysisResults: ImageAnalysisResult[];
  
  // Findings
  /** Consolidated findings across views */
  consolidatedFindings: ConsolidatedFinding[];
  
  // Assessment
  /** BI-RADS assessment */
  assessment?: BiRadsAssessment;
  
  // Report
  /** Generated clinical report */
  report?: GeneratedReport;
  
  // Workflow
  /** Workflow state */
  workflow: WorkflowState;
  
  // Audit
  /** Audit trail */
  audit: AuditTrail;
}

/**
 * Case creation input (minimal required fields)
 */
export interface CreateCaseInput {
  patient: PatientInfo;
  clinicalHistory: ClinicalHistory;
}

/**
 * Image upload input
 */
export interface ImageUploadInput {
  file: File;
  viewType: ViewType;
  laterality: Laterality;
}

// ============================================================================
// SYNC STATE
// ============================================================================

/**
 * Synchronization status
 */
export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error';

/**
 * Pending sync operation
 */
export interface PendingSyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  caseId: string;
  data: Partial<ClinicalCase>;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: FieldError[];
  warnings: string[];
}

/**
 * Empty validation result factory
 */
export function createValidationResult(): ValidationResult {
  return {
    isValid: true,
    errors: [],
    warnings: [],
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Deep partial type for partial updates
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Case update input
 */
export type CaseUpdateInput = DeepPartial<ClinicalCase>;

// ============================================================================
// BATCH ANALYSIS TYPES - Phase 5
// ============================================================================

/**
 * Analysis job status for a single image
 */
export type AnalysisJobStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Single image analysis job
 */
export interface AnalysisJob {
  /** Image ID being analyzed */
  imageId: string;
  
  /** Current job status */
  status: AnalysisJobStatus;
  
  /** Progress percentage (0-100) */
  progress: number;
  
  /** Job start time */
  startedAt?: string;
  
  /** Job completion time */
  completedAt?: string;
  
  /** Error message if failed */
  error?: string;
  
  /** Analysis result if completed */
  result?: ImageAnalysisResult;
}

/**
 * Batch analysis result - overall summary
 */
export interface BatchAnalysisResult {
  /** Total images analyzed */
  totalImages: number;
  
  /** Successfully completed count */
  completedCount: number;
  
  /** Failed count */
  failedCount: number;
  
  /** All analysis results */
  results: ImageAnalysisResult[];
  
  /** Consolidated findings across views */
  consolidatedFindings: ConsolidatedFinding[];
  
  /** AI-suggested BI-RADS category */
  suggestedBiRads?: BiRadsCategory;
  
  /** Total processing time in ms */
  totalProcessingTimeMs: number;
  
  /** Batch start time */
  startedAt: string;
  
  /** Batch completion time */
  completedAt: string;
  
  /** Any warnings generated */
  warnings?: string[];
}

/**
 * Batch analysis error
 */
export interface BatchAnalysisError extends Error {
  name: 'BatchAnalysisError';
  code: ErrorCode.ANALYSIS_ERROR;
  failedImages?: string[];
  partialResults?: ImageAnalysisResult[];
}

/**
 * Create a batch analysis error
 */
export function createBatchAnalysisError(
  message: string,
  failedImages?: string[],
  partialResults?: ImageAnalysisResult[]
): BatchAnalysisError {
  const error = new Error(message) as BatchAnalysisError;
  error.name = 'BatchAnalysisError';
  error.code = ErrorCode.ANALYSIS_ERROR;
  error.failedImages = failedImages;
  error.partialResults = partialResults;
  return error;
}

/**
 * Analysis progress callback
 */
export type AnalysisProgressCallback = (
  progress: number,
  currentJob?: AnalysisJob
) => void;

/**
 * Batch analysis options
 */
export interface BatchAnalysisOptions {
  /** Maximum parallel analyses (default: 4) */
  concurrencyLimit?: number;
  
  /** Timeout per image in ms (default: 180000, must match API_TIMEOUT in api.ts) */
  timeoutPerImage?: number;
  
  /** Progress callback */
  onProgress?: AnalysisProgressCallback;
  
  /** Whether to continue on individual failures */
  continueOnError?: boolean;
  
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
}

/**
 * Default batch analysis options
 */
export const DEFAULT_BATCH_ANALYSIS_OPTIONS: Required<Omit<BatchAnalysisOptions, 'onProgress' | 'abortSignal'>> = {
  concurrencyLimit: 4,
  timeoutPerImage: 180000,
  continueOnError: true,
};
