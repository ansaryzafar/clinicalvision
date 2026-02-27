/**
 * Clinical Data Types for ClinicalVision
 * Industry-standard structures for medical imaging analysis
 * 
 * Aligned with backend schemas and ACR BI-RADS 5th Edition standards
 */

// ============================================================================
// BI-RADS Assessment Categories (ACR BI-RADS 5th Edition)
// Uses string values to support 4A/4B/4C subdivisions
// ============================================================================

/**
 * BI-RADS Category - String-based enum matching backend
 * Includes clinically-important 4A/4B/4C subdivisions for Category 4
 */
export enum BIRADS {
  INCOMPLETE = '0',           // Need additional imaging
  NEGATIVE = '1',             // No findings
  BENIGN = '2',               // Benign finding
  PROBABLY_BENIGN = '3',      // <2% risk of malignancy
  SUSPICIOUS_LOW = '4A',      // 2-10% risk of malignancy (low suspicion)
  SUSPICIOUS_MODERATE = '4B', // 10-50% risk of malignancy (moderate suspicion)
  SUSPICIOUS_HIGH = '4C',     // 50-95% risk of malignancy (high suspicion)
  HIGHLY_SUGGESTIVE = '5',    // >95% risk of malignancy
  KNOWN_BIOPSY_PROVEN = '6',  // Known malignancy
}

/**
 * @deprecated Use BIRADS enum with string values instead
 * Legacy numeric enum for backward compatibility with existing code
 */
export enum BIRADSLegacy {
  INCOMPLETE = 0,
  NEGATIVE = 1,
  BENIGN = 2,
  PROBABLY_BENIGN = 3,
  SUSPICIOUS = 4,
  HIGHLY_SUGGESTIVE = 5,
  KNOWN_BIOPSY_PROVEN = 6,
}

// Type for all valid BIRADS values (for flexible input handling)
export type BIRADSValue = BIRADS | '0' | '1' | '2' | '3' | '4A' | '4B' | '4C' | '5' | '6';

// BI-RADS Descriptions with 4A/4B/4C subdivisions
// Note: Enum values ('0','1','2','3','4A','4B','4C','5','6') already serve as string keys.
// Only '4' (generic category 4) is added separately — the enum uses 4A/4B/4C subdivisions.
export const BIRADS_DESCRIPTIONS: Record<string, string> = {
  [BIRADS.INCOMPLETE]: 'Incomplete - Need Additional Imaging',
  [BIRADS.NEGATIVE]: 'Negative - No Findings',
  [BIRADS.BENIGN]: 'Benign Finding',
  [BIRADS.PROBABLY_BENIGN]: 'Probably Benign (<2% malignancy risk)',
  [BIRADS.SUSPICIOUS_LOW]: 'Low Suspicion for Malignancy (2-10% risk)',
  [BIRADS.SUSPICIOUS_MODERATE]: 'Moderate Suspicion for Malignancy (10-50% risk)',
  [BIRADS.SUSPICIOUS_HIGH]: 'High Suspicion for Malignancy (50-95% risk)',
  [BIRADS.HIGHLY_SUGGESTIVE]: 'Highly Suggestive of Malignancy (>95% risk)',
  [BIRADS.KNOWN_BIOPSY_PROVEN]: 'Known Biopsy-Proven Malignancy',
  '4': 'Suspicious Abnormality', // Generic category 4 (enum uses 4A/4B/4C subdivisions)
};

// BI-RADS Recommendations with 4A/4B/4C subdivisions
// Note: Enum values serve as string keys. Only '4' (generic) added separately.
export const BIRADS_RECOMMENDATIONS: Record<string, string> = {
  [BIRADS.INCOMPLETE]: 'Additional imaging evaluation needed',
  [BIRADS.NEGATIVE]: 'Routine screening mammography',
  [BIRADS.BENIGN]: 'Routine screening mammography',
  [BIRADS.PROBABLY_BENIGN]: 'Short-term follow-up (6 months) recommended',
  [BIRADS.SUSPICIOUS_LOW]: 'Biopsy should be considered',
  [BIRADS.SUSPICIOUS_MODERATE]: 'Biopsy is recommended',
  [BIRADS.SUSPICIOUS_HIGH]: 'Biopsy is strongly recommended',
  [BIRADS.HIGHLY_SUGGESTIVE]: 'Tissue diagnosis and appropriate action required',
  [BIRADS.KNOWN_BIOPSY_PROVEN]: 'Treatment as clinically appropriate',
  '4': 'Biopsy should be considered', // Generic category 4 (enum uses 4A/4B/4C subdivisions)
};

/**
 * Utility: Convert legacy numeric BIRADS to string format
 * @param value - Numeric BIRADS value (0-6) or string
 * @returns String BIRADS value compatible with backend
 */
export const convertBIRADSToString = (value: number | string | BIRADS): string => {
  if (typeof value === 'string') return value;
  return String(value);
};

/**
 * Utility: Get BIRADS display string (e.g., "BI-RADS 4A")
 * @param value - BIRADS value
 * @returns Formatted display string
 */
export const getBIRADSDisplayString = (value: BIRADSValue): string => {
  return `BI-RADS ${value}`;
};

/**
 * Utility: Check if BIRADS category requires biopsy consideration
 * @param value - BIRADS value
 * @returns boolean indicating biopsy recommendation
 */
export const requiresBiopsy = (value: BIRADSValue): boolean => {
  const biopsyCategories = ['4A', '4B', '4C', '5', BIRADS.SUSPICIOUS_LOW, BIRADS.SUSPICIOUS_MODERATE, BIRADS.SUSPICIOUS_HIGH, BIRADS.HIGHLY_SUGGESTIVE];
  return biopsyCategories.includes(value as string);
};

/**
 * Utility: Get BIRADS color for UI display
 * @param category - BIRADS value
 * @returns Color hex code
 */
export const getBIRADSColor = (category: BIRADSValue): string => {
  const value = String(category);
  switch (value) {
    case '1':
    case '2':
    case BIRADS.NEGATIVE:
    case BIRADS.BENIGN:
      return '#4caf50'; // Green - benign
    case '3':
    case BIRADS.PROBABLY_BENIGN:
      return '#ff9800'; // Orange - probably benign
    case '4A':
    case BIRADS.SUSPICIOUS_LOW:
      return '#ff5722'; // Deep orange - low suspicion
    case '4B':
    case BIRADS.SUSPICIOUS_MODERATE:
      return '#e91e63'; // Pink - moderate suspicion
    case '4C':
    case BIRADS.SUSPICIOUS_HIGH:
      return '#f44336'; // Red - high suspicion
    case '5':
    case BIRADS.HIGHLY_SUGGESTIVE:
      return '#d32f2f'; // Dark red - highly suggestive
    case '6':
    case BIRADS.KNOWN_BIOPSY_PROVEN:
      return '#9c27b0'; // Purple - known malignancy
    case '0':
    case BIRADS.INCOMPLETE:
    default:
      return '#757575'; // Gray - incomplete/unknown
  }
};

// Patient Demographics
export interface PatientInfo {
  patientId: string;
  name?: string;
  patientName?: string;
  dateOfBirth?: string;
  age?: number;
  gender?: 'M' | 'F' | 'O';
  medicalRecordNumber?: string;
}

// Study/Case Information
export interface StudyInfo {
  studyId: string;
  studyDate: string;
  studyTime?: string;
  studyDescription: string;
  modality: Modality;
  institution?: string;
  referringPhysician?: string;
  performingPhysician?: string;
}

// Modality types - aligned with backend
export type Modality = 'MG' | 'DBT' | 'US' | 'MRI' | 'CT';

export const MODALITY_DESCRIPTIONS: Record<Modality, string> = {
  'MG': 'Mammography',
  'DBT': 'Digital Breast Tomosynthesis',
  'US': 'Ultrasound',
  'MRI': 'Magnetic Resonance Imaging',
  'CT': 'Computed Tomography',
};

// ============================================================================
// Workflow Status Types
// ============================================================================

/** Workflow status for analysis sessions
 * - pending: Case created, no work started
 * - in-progress: Actively being worked on
 * - paused: Temporarily paused (e.g., awaiting additional info)
 * - completed: All steps done
 * - reviewed: Peer-reviewed
 * - finalized: Signed off, read-only
 */
export type WorkflowStatus = 'pending' | 'in-progress' | 'paused' | 'completed' | 'reviewed' | 'finalized';

// Image View Types
export type ViewType = 'CC' | 'MLO' | 'LM' | 'ML' | 'XCCL' | 'Mag' | 'Spot' | 'Other';
export type Laterality = 'L' | 'R' | 'B';

// Image Information
export interface ImageMetadata {
  imageId: string;
  fileName: string;
  fileSize: number;
  uploadDate: string;
  seriesNumber?: number;
  instanceNumber?: number;
  viewType?: ViewType; // Craniocaudal, Mediolateral Oblique, Magnification, etc.
  laterality?: Laterality; // Left, Right, Bilateral
  acquisitionDate?: string;
  imageType?: string;
  rows?: number;
  cols?: number;
  pixelSpacing?: [number, number]; // mm
  filePath?: string;
  thumbnail?: string; // Base64 thumbnail for quick display
  imageDataUrl?: string; // Full Base64 image data for persistence (may be large)
  analyzed?: boolean; // Has AI analysis been run on this image?
  analysisDate?: string;
  notes?: string; // User notes about this specific image
}

// Stored AI Analysis Results (for session persistence)
export interface StoredAnalysisResult {
  prediction: 'benign' | 'malignant';
  confidence: number;
  probabilities: {
    benign: number;
    malignant: number;
  };
  riskLevel: 'low' | 'moderate' | 'high';
  processingTimeMs?: number;
  modelVersion?: string;
  explanation?: {
    suspicious_regions: Array<{
      bbox: [number, number, number, number];
      attention_score: number;
      description?: string;
    }>;
    attention_summary?: string;
  };
  visualizationDataUrl?: string; // Base64 visualization with overlays
  analyzedAt: string;
}

// ============================================================================
// Finding/Lesion Information - Aligned with backend schemas
// ============================================================================

/** Breast quadrant locations (backend compatible) */
export type BreastQuadrant = 'UOQ' | 'UIQ' | 'LOQ' | 'LIQ' | 'central' | 'subareolar' | 'axillary_tail';

/** Tissue depth within breast */
export type TissueDepth = 'anterior' | 'middle' | 'posterior';

/** Finding status - workflow state */
export type FindingStatus = 'pending' | 'reviewed' | 'confirmed' | 'dismissed';

/** Finding type categories */
export type FindingType = 'mass' | 'calcification' | 'asymmetry' | 'distortion' | 'other';

/**
 * Standardized location format supporting both:
 * - Clock position (radiologist preference)
 * - Quadrant notation (backend compatible)
 */
export interface FindingLocation {
  // Clock position notation (preferred for clinical)
  clockPosition?: number; // 1-12 o'clock
  distanceFromNipple?: number; // cm from nipple
  
  // Quadrant notation (backend compatible)
  quadrant?: BreastQuadrant;
  
  // Additional context
  breast?: 'left' | 'right';
  depth?: TissueDepth;
  
  // Free-text description for complex locations
  description?: string;
}

export interface Finding {
  findingId: string;
  findingType: FindingType;
  location: FindingLocation;
  coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  measurements?: {
    maxDiameter: number; // mm
    minDiameter?: number; // mm
    area?: number; // mm²
    volume?: number; // mm³ (for 3D imaging)
  };
  description?: string;
  characteristics?: {
    shape?: 'oval' | 'round' | 'irregular' | string;
    margin?: 'circumscribed' | 'obscured' | 'microlobulated' | 'indistinct' | 'spiculated' | string;
    density?: 'high' | 'equal' | 'low' | 'fat-containing' | string;
    calcificationType?: 'typically_benign' | 'suspicious' | 'highly_suggestive' | string;
    distribution?: 'diffuse' | 'regional' | 'grouped' | 'linear' | 'segmental' | string;
  };
  aiConfidence?: number; // 0-1
  aiAttentionScore?: number; // 0-1
  biradsCategory?: BIRADSValue; // Per-finding BI-RADS (if applicable)
  status: FindingStatus;
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: string;

  // Convenience aliases for dashboard consumption
  // These are computed/derived fields populated by normalizeFinding()
  riskLevel?: 'low' | 'moderate' | 'high';  // Derived from biradsCategory
  biRads?: number;                            // Numeric alias for biradsCategory
  confidence?: number;                        // Alias for aiConfidence (0-100 scale)
}

// Analysis Session
export interface AnalysisSession {
  sessionId: string;
  patientInfo: PatientInfo;
  studyInfo: StudyInfo;
  images: ImageMetadata[]; // Array of images with full metadata
  activeImageId?: string; // Currently selected image for viewing/analysis
  findings: Finding[];
  // Stored AI analysis results for session persistence
  storedAnalysisResults?: StoredAnalysisResult;
  assessment: {
    biradsCategory?: BIRADS;
    impression: string;
    recommendation: string;
  };
  workflow: {
    mode: WorkflowMode; // 'quick' or 'clinical'
    currentStep: number;
    completedSteps: WorkflowStep[];
    status: WorkflowStatus;
    startedAt?: string; // Track workflow timing for KLM analysis
    stepHistory?: Array<{ step: WorkflowStep; enteredAt: string; duration?: number }>;
  };
  measurements: Array<{
    measurementId: string;
    imageId: string;
    type: 'distance' | 'area' | 'angle';
    points: Array<{ x: number; y: number }>;
    value: number;
    unit: 'mm' | 'cm' | 'degrees';
    label?: string;
  }>;
  viewerSettings: {
    windowLevel: { width: number; center: number };
    zoom: number;
    rotation: number;
    gridEnabled: boolean;
    gridSpacing: number;
    calibration: number;
  };
  metadata: {
    createdAt: string;
    createdBy: string;
    lastModified: string;
    modifiedBy: string;
    version: number;
    autoSaveEnabled: boolean;
  };
}

// ============================================================================
// Report Status - Aligned with backend ReportStatusEnum
// ============================================================================

/** Report workflow status - matches backend ReportStatusEnum */
export type ReportStatus = 
  | 'draft'           // Being created/edited (DRAFT)
  | 'pending_review'  // Awaiting peer review (PENDING_REVIEW)
  | 'reviewed'        // Peer reviewed (REVIEWED)
  | 'approved'        // Final approved report (APPROVED)
  | 'signed'          // Digitally signed (SIGNED)
  | 'amended'         // Amended after signing (AMENDED)
  | 'cancelled';      // Cancelled (CANCELLED)

/** Report type - matches backend ReportTypeEnum */
export type ReportType = 
  | 'BIRADS'
  | 'DIAGNOSTIC'
  | 'SCREENING'
  | 'COMPARISON'
  | 'CONSULTATION'
  | 'FOLLOW_UP';

/** Legacy status type for backward compatibility */
export type LegacyReportStatus = 'draft' | 'preliminary' | 'final' | 'amended';

/**
 * Map legacy status to new status
 */
export const mapLegacyReportStatus = (legacy: LegacyReportStatus): ReportStatus => {
  switch (legacy) {
    case 'draft': return 'draft';
    case 'preliminary': return 'pending_review';
    case 'final': return 'signed';
    case 'amended': return 'amended';
    default: return 'draft';
  }
};

// Clinical Report - Aligned with backend ClinicalReport model
export interface ClinicalReport {
  reportId: string;
  sessionId: string;
  studyId?: string; // Backend uses study_id
  patientInfo: PatientInfo;
  studyInfo: StudyInfo;
  
  // Report content
  clinicalHistory?: string;
  technique: string;
  comparison?: string;
  findings: Finding[];
  impression: string;
  biradsAssessment: BIRADS;
  recommendation: string;
  
  // Workflow
  reportType?: ReportType;
  status: ReportStatus;
  
  // Author and reviewers (aligned with backend)
  radiologistName: string;
  authorId?: string;
  reviewerId?: string;
  approverId?: string;
  
  // Timestamps
  reportDate: string;
  reportTime: string;
  draftedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  signedAt?: string;
  
  // Versioning (aligned with backend)
  version?: number;
  parentReportId?: string; // For amendments
  amendmentReason?: string;
  
  // Digital signature
  signature?: string;
  
  // AI integration
  aiAssisted?: boolean;
  aiConfidence?: number;
  aiFindingsReviewed?: boolean;
  
  // Quality metrics
  readingTimeMinutes?: number;
  complexityScore?: number; // 1-5
  
  // Critical finding flag
  criticalFinding?: boolean;
  notificationSent?: boolean;
  
  // Associated images
  images: Array<{
    imageId: string;
    caption: string;
    annotations: string[];
  }>;
}

/**
 * Workflow Mode - Based on Nielsen's "Flexibility and efficiency of use" heuristic
 * Supports both novice users (full workflow) and expert users (quick analysis)
 * 
 * Reference: Paton et al. (2021) - HCI modeling for digital health systems
 */
export type WorkflowMode = 'quick' | 'clinical';

export const WORKFLOW_MODE_CONFIG = {
  quick: {
    label: 'Quick Analysis',
    description: 'Fast screening mode - upload and analyze immediately',
    icon: 'bolt',
    requiredSteps: ['UPLOAD', 'AI_ANALYSIS'],
    optionalSteps: ['PATIENT_INFO', 'ASSESSMENT'],
  },
  clinical: {
    label: 'Clinical Workflow',
    description: 'Complete diagnostic workflow with full documentation',
    icon: 'medical_services',
    requiredSteps: ['PATIENT_INFO', 'UPLOAD', 'AI_ANALYSIS', 'ASSESSMENT', 'REPORT', 'FINALIZE'],
    optionalSteps: ['MEASUREMENTS'],
  },
};

/**
 * Workflow Steps - Streamlined 7-step clinical workflow
 * Merged REVIEW_FINDINGS into AI_ANALYSIS (reduces cognitive load per VoxLogicA UI thesis)
 * 
 * Progressive Disclosure: Show only relevant steps based on workflow mode
 */
export enum WorkflowStep {
  UPLOAD = 0,          // Start with upload for quick mode (reduces time-to-value)
  AI_ANALYSIS = 1,     // AI detection + review combined
  PATIENT_INFO = 2,    // Can be filled after analysis in quick mode
  MEASUREMENTS = 3,    // Optional detailed measurements
  ASSESSMENT = 4,      // BI-RADS categorization
  REPORT = 5,          // Generate clinical report
  FINALIZE = 6,        // Sign and complete
}

/**
 * Step configuration with HCI-optimized labels and descriptions
 * Following Nielsen's "Match between system and the real world" heuristic
 */
export const WORKFLOW_STEPS = [
  { 
    step: WorkflowStep.UPLOAD, 
    label: 'Upload', 
    description: 'Upload mammogram images', 
    icon: 'upload',
    quickModeVisible: true,
    clinicalModeVisible: true,
    helpText: 'Drag and drop or click to upload PNG, JPG, or DICOM files',
  },
  { 
    step: WorkflowStep.AI_ANALYSIS, 
    label: 'AI Analysis', 
    description: 'AI detection and findings review', 
    icon: 'smart_toy',
    quickModeVisible: true,
    clinicalModeVisible: true,
    helpText: 'AI automatically detects suspicious regions. Review and confirm findings.',
  },
  { 
    step: WorkflowStep.PATIENT_INFO, 
    label: 'Patient Info', 
    description: 'Patient demographics and study details', 
    icon: 'person',
    quickModeVisible: false, // Hidden in quick mode stepper but accessible
    clinicalModeVisible: true,
    helpText: 'Required for clinical reports. Can be added before finalizing.',
  },
  { 
    step: WorkflowStep.MEASUREMENTS, 
    label: 'Measurements', 
    description: 'Measure lesion dimensions', 
    icon: 'straighten',
    quickModeVisible: false,
    clinicalModeVisible: true,
    helpText: 'Use calipers to measure suspicious areas. Optional step.',
  },
  { 
    step: WorkflowStep.ASSESSMENT, 
    label: 'Assessment', 
    description: 'BI-RADS category and impression', 
    icon: 'assessment',
    quickModeVisible: true,
    clinicalModeVisible: true,
    helpText: 'Assign BI-RADS category and clinical recommendation.',
  },
  { 
    step: WorkflowStep.REPORT, 
    label: 'Report', 
    description: 'Generate clinical report', 
    icon: 'description',
    quickModeVisible: false,
    clinicalModeVisible: true,
    helpText: 'Create structured clinical report for patient records.',
  },
  { 
    step: WorkflowStep.FINALIZE, 
    label: 'Finalize', 
    description: 'Sign and complete case', 
    icon: 'check_circle',
    quickModeVisible: false,
    clinicalModeVisible: true,
    helpText: 'Review all information and finalize the case.',
  },
];

/**
 * Get visible steps for a workflow mode
 * Implements Progressive Disclosure (VoxLogicA UI thesis Section 2.4.3)
 */
export const getVisibleSteps = (mode: WorkflowMode) => {
  return WORKFLOW_STEPS.filter(step => 
    mode === 'quick' ? step.quickModeVisible : step.clinicalModeVisible
  );
};

/**
 * Get step by enum value
 */
export const getStepConfig = (step: WorkflowStep) => {
  return WORKFLOW_STEPS.find(s => s.step === step);
};

// ============================================================================
// Finding Helper Functions — Safe Computed Property Derivation
// ============================================================================

/**
 * Map a BIRADS category value to a risk level string.
 * 
 * Mapping (ACR BI-RADS 5th Edition):
 * - 0 (Incomplete), 1 (Negative), 2 (Benign) → 'low'
 * - 3 (Probably Benign) → 'moderate'
 * - 4A, 4B, 4C, 4, 5, 6 → 'high'
 * - undefined/null → 'low' (safe default)
 */
export const getRiskLevel = (biradsCategory: BIRADSValue | undefined | null): 'low' | 'moderate' | 'high' => {
  if (biradsCategory == null) return 'low';
  
  const value = String(biradsCategory);
  
  // Low risk: Categories 0 (incomplete), 1 (negative), 2 (benign)
  if (value === '0' || value === '1' || value === '2') return 'low';
  
  // Moderate risk: Category 3 (probably benign, <2% malignancy)
  if (value === '3') return 'moderate';
  
  // High risk: Categories 4 (all subdivisions), 5, 6
  if (value.startsWith('4') || value === '5' || value === '6') return 'high';
  
  return 'low'; // Unknown values default to low (safe for clinical display)
};

/**
 * Convert a BIRADS category value to its numeric equivalent.
 * Handles 4A/4B/4C → 4 mapping.
 * 
 * @param biradsCategory - BIRADS value or undefined
 * @returns Numeric BIRADS (0-6), defaults to 0 for undefined
 */
export const getNumericBirads = (biradsCategory: BIRADSValue | undefined | null): number => {
  if (biradsCategory == null) return 0;
  
  const value = String(biradsCategory);
  
  // 4A, 4B, 4C all map to numeric 4
  if (value.startsWith('4')) return 4;
  
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Normalize AI confidence to a 0-100 integer scale.
 * Handles both 0-1 (model output) and 0-100 (display) ranges.
 * 
 * @param aiConfidence - Confidence value (0-1 or 0-100) or undefined
 * @returns Integer 0-100, clamped and rounded
 */
export const getNormalizedConfidence = (aiConfidence: number | undefined | null): number => {
  if (aiConfidence == null) return 0;
  
  // Determine if value is in 0-1 range (model output) or 0-100 range (display)
  const normalized = aiConfidence > 0 && aiConfidence <= 1
    ? Math.round(aiConfidence * 100)
    : Math.round(aiConfidence);
  
  // Clamp to valid range
  return Math.max(0, Math.min(100, normalized));
};

/**
 * Enrich a Finding with computed convenience aliases.
 * Does NOT mutate the original — returns a new object.
 * 
 * Preserves any existing alias values (explicit > computed).
 * 
 * @param finding - The source Finding object
 * @returns A new Finding with riskLevel, biRads, and confidence populated
 */
export const normalizeFinding = (finding: Finding): Finding => {
  return {
    ...finding,
    riskLevel: finding.riskLevel ?? getRiskLevel(finding.biradsCategory),
    biRads: finding.biRads ?? getNumericBirads(finding.biradsCategory),
    confidence: finding.confidence ?? getNormalizedConfidence(finding.aiConfidence),
  };
};

// Auto-save state
export interface AutoSaveState {
  enabled: boolean;
  interval: number; // seconds
  lastSaved: string;
  isDirty: boolean;
  savingInProgress: boolean;
}
