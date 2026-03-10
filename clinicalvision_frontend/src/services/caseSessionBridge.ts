/**
 * Case → Session Bridge
 *
 * Converts ClinicalCase objects (from the 10-step ClinicalWorkflowPageV2)
 * into AnalysisSession objects (consumed by CasesDashboard, PatientRecords,
 * and ClinicalDashboard).
 *
 * WHY THIS EXISTS:
 * The application evolved through multiple iterations, resulting in four
 * separate persistence systems that never communicated:
 *
 *   System 1 – ClinicalCaseContext   → localStorage key "clinicalvision_cases"
 *   System 2 – clinicalSessionService → localStorage key "clinicalvision_sessions"
 *   System 3 – workflow-v3            → localStorage key "clinicalvision_v3_sessions"
 *   System 4 – analysisStorage        → localStorage key "clinicalvision_analyses"
 *
 * The 10-step clinical workflow writes to System 1, but every dashboard
 * reads from System 2.  This bridge closes that gap by converting and
 * syncing ClinicalCase → AnalysisSession whenever a case is persisted.
 *
 * @module caseSessionBridge
 */

import { ClinicalCase, ClinicalWorkflowStep, STEP_INDEX } from '../types/case.types';
import {
  AnalysisSession,
  WorkflowStep as LegacyWorkflowStep,
  WorkflowStatus,
  BIRADS,
  ImageMetadata,
  Finding,
} from '../types/clinical.types';
import { clinicalSessionService } from './clinicalSession.service';

// ============================================================================
// STATUS MAPPING
// ============================================================================

/**
 * Map CaseStatus → WorkflowStatus
 * CaseStatus:    'draft' | 'in_progress' | 'pending_review' | 'completed' | 'finalized'
 * WorkflowStatus: 'pending' | 'in-progress' | 'paused' | 'completed' | 'reviewed' | 'finalized'
 */
function mapCaseStatus(caseStatus: string): WorkflowStatus {
  switch (caseStatus) {
    case 'draft':           return 'pending';
    case 'in_progress':     return 'in-progress';
    case 'pending_review':  return 'in-progress';
    case 'completed':       return 'completed';
    case 'finalized':       return 'finalized';
    default:                return 'in-progress';
  }
}

// ============================================================================
// STEP MAPPING
// ============================================================================

/**
 * Map ClinicalWorkflowStep → legacy WorkflowStep enum
 */
function mapWorkflowStep(step: ClinicalWorkflowStep): LegacyWorkflowStep {
  switch (step) {
    case ClinicalWorkflowStep.PATIENT_REGISTRATION:
    case ClinicalWorkflowStep.CLINICAL_HISTORY:
      return LegacyWorkflowStep.PATIENT_INFO;

    case ClinicalWorkflowStep.IMAGE_UPLOAD:
    case ClinicalWorkflowStep.IMAGE_VERIFICATION:
      return LegacyWorkflowStep.UPLOAD;

    case ClinicalWorkflowStep.BATCH_AI_ANALYSIS:
    case ClinicalWorkflowStep.FINDINGS_REVIEW:
      return LegacyWorkflowStep.AI_ANALYSIS;

    case ClinicalWorkflowStep.BIRADS_ASSESSMENT:
      return LegacyWorkflowStep.ASSESSMENT;

    case ClinicalWorkflowStep.REPORT_GENERATION:
      return LegacyWorkflowStep.REPORT;

    case ClinicalWorkflowStep.FINALIZE:
    case ClinicalWorkflowStep.DIGITAL_SIGNATURE:
      return LegacyWorkflowStep.FINALIZE;

    default:
      return LegacyWorkflowStep.UPLOAD;
  }
}

/**
 * Map completed ClinicalWorkflowSteps → unique legacy WorkflowStep[]
 */
function mapCompletedSteps(steps: ClinicalWorkflowStep[]): LegacyWorkflowStep[] {
  const legacySet = new Set<LegacyWorkflowStep>();
  for (const step of steps) {
    legacySet.add(mapWorkflowStep(step));
  }
  return Array.from(legacySet);
}

// ============================================================================
// IMAGE MAPPING
// ============================================================================

/**
 * Map ClinicalCase images → ImageMetadata[]
 */
function mapImages(clinicalCase: ClinicalCase): ImageMetadata[] {
  return clinicalCase.images.map((img, index) => ({
    imageId: img.id || `img_${index}`,
    fileName: img.filename || `image_${index}.png`,
    fileSize: img.fileSize || 0,
    uploadDate: img.uploadedAt || clinicalCase.audit.createdAt,
    // ViewType/Laterality enum strings are compatible ('CC','MLO','L','R')
    // but TypeScript sees different enum origins — safe to cast
    viewType: img.viewType as string as ImageMetadata['viewType'],
    laterality: img.laterality as string as ImageMetadata['laterality'],
    analyzed: clinicalCase.analysisResults.some(r => r.imageId === img.id),
  })) as ImageMetadata[];
}

// ============================================================================
// FINDINGS MAPPING
// ============================================================================

/**
 * Map ClinicalCase findings → legacy Finding[]
 */
function mapFindings(clinicalCase: ClinicalCase): Finding[] {
  return clinicalCase.consolidatedFindings.map((f, index) => ({
    findingId: f.id || `finding_${index}`,
    // Cast case.types FindingType enum → clinical.types FindingType string union
    findingType: (f.findingType || 'mass') as unknown as Finding['findingType'],
    location: {
      quadrant: f.quadrant as unknown as Finding['location']['quadrant'],
      clockPosition: f.clockPosition,
      depth: f.depth as unknown as Finding['location']['depth'],
      breast: f.laterality === 'L' ? 'left' as const : 'right' as const,
      distanceFromNipple: f.distanceFromNipple,
    },
    description: f.shape ? `${f.findingType} — ${f.shape}${f.margin ? `, ${f.margin}` : ''}` : String(f.findingType),
    biradsCategory: (f.individualBiRads as BIRADS) || BIRADS.INCOMPLETE,
    aiConfidence: f.aiConfidence ?? 0,
    status: 'confirmed' as const,
    notes: f.radiologistNotes,
  }));
}

// ============================================================================
// CORE BRIDGE FUNCTION
// ============================================================================

/**
 * Convert a ClinicalCase into an AnalysisSession.
 *
 * This is a lossy conversion — ClinicalCase has richer data than
 * AnalysisSession — but it preserves everything the dashboards need
 * to display, filter, search, and export.
 */
export function clinicalCaseToSession(clinicalCase: ClinicalCase): AnalysisSession {
  // Derive BI-RADS from assessment or AI suggestion
  const birads = clinicalCase.assessment?.overallCategory
    || clinicalCase.aiSuggestedBiRads
    || undefined;

  // Map the current step index for legacy stepper compatibility
  const currentStepIndex = STEP_INDEX[clinicalCase.workflow.currentStep] ?? 0;

  // Build stored analysis results from the first image's results (summary level)
  const firstResult = clinicalCase.analysisResults?.[0];
  const storedAnalysisResults = firstResult ? {
    prediction: firstResult.prediction,
    confidence: firstResult.confidence,
    probabilities: {
      benign: firstResult.probabilities?.benign ?? (1 - firstResult.confidence),
      malignant: firstResult.probabilities?.malignant ?? firstResult.confidence,
    },
    riskLevel: firstResult.riskLevel as 'low' | 'moderate' | 'high',
    processingTimeMs: firstResult.processingTimeMs,
    modelVersion: firstResult.modelVersion,
    analyzedAt: firstResult.analyzedAt || clinicalCase.audit.createdAt,
  } : undefined;

  const session: AnalysisSession = {
    sessionId: clinicalCase.id,
    patientInfo: {
      patientId: clinicalCase.patient.mrn || '',
      name: [clinicalCase.patient.firstName, clinicalCase.patient.lastName]
        .filter(Boolean).join(' ') || undefined,
      dateOfBirth: clinicalCase.patient.dateOfBirth || undefined,
      gender: clinicalCase.patient.gender || undefined,
      medicalRecordNumber: clinicalCase.patient.mrn || undefined,
    },
    studyInfo: {
      studyId: clinicalCase.caseNumber || clinicalCase.id,
      studyDate: clinicalCase.audit.createdAt.split('T')[0],
      studyDescription: clinicalCase.clinicalHistory?.clinicalIndication || 'Mammography Screening',
      modality: 'MG',
    },
    images: mapImages(clinicalCase),
    findings: mapFindings(clinicalCase),
    storedAnalysisResults,
    assessment: {
      biradsCategory: birads as BIRADS | undefined,
      impression: clinicalCase.assessment?.impression || clinicalCase.report?.content?.impression || '',
      recommendation: clinicalCase.assessment?.recommendation || clinicalCase.report?.content?.recommendation || '',
    },
    workflow: {
      mode: 'clinical',
      currentStep: currentStepIndex,
      completedSteps: mapCompletedSteps(clinicalCase.workflow.completedSteps),
      status: mapCaseStatus(clinicalCase.workflow.status),
      startedAt: clinicalCase.workflow.startedAt,
      stepHistory: [],
    },
    measurements: [],
    viewerSettings: {
      windowLevel: { width: 255, center: 128 },
      zoom: 1.0,
      rotation: 0,
      gridEnabled: false,
      gridSpacing: 5,
      calibration: 10,
    },
    metadata: {
      createdAt: clinicalCase.audit.createdAt,
      createdBy: clinicalCase.audit.createdBy || 'radiologist',
      lastModified: clinicalCase.workflow.lastModifiedAt || clinicalCase.audit.lastModifiedAt || new Date().toISOString(),
      modifiedBy: clinicalCase.audit.lastModifiedBy || 'radiologist',
      version: clinicalCase.audit.modifications?.length ?? 1,
      autoSaveEnabled: true,
    },
  };

  return session;
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

/**
 * Sync a single ClinicalCase → clinicalSessionService.
 * Call this whenever a ClinicalCase is persisted to localStorage.
 *
 * Uses `preserveTimestamp: true` so that the original case timestamps
 * (from workflow.lastModifiedAt / audit.lastModifiedAt) survive the
 * save operation.  Without this, saveSession() would unconditionally
 * overwrite lastModified with "now", causing all timestamps on the
 * CasesDashboard and PatientRecords pages to show the same time.
 */
export function syncCaseToSessionService(clinicalCase: ClinicalCase): void {
  try {
    const session = clinicalCaseToSession(clinicalCase);
    clinicalSessionService.saveSession(session, { preserveTimestamp: true });
  } catch (err) {
    console.error('[caseSessionBridge] Failed to sync case → session:', clinicalCase.id, err);
  }
}

/**
 * Sync ALL ClinicalCase entries → clinicalSessionService.
 * Used on hydration to ensure dashboards see everything.
 */
export function syncAllCasesToSessionService(cases: ClinicalCase[]): void {
  for (const c of cases) {
    syncCaseToSessionService(c);
  }
}

/**
 * Remove a case from clinicalSessionService by ID.
 */
export function removeCaseFromSessionService(caseId: string): void {
  try {
    clinicalSessionService.deleteSession(caseId);
  } catch (err) {
    console.error('[caseSessionBridge] Failed to remove session:', caseId, err);
  }
}
