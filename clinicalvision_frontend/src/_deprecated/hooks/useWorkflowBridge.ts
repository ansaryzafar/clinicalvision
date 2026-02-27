/**
 * useWorkflowBridge Hook
 * 
 * Bridges the gap between the legacy workflow-v3 system (useLegacyWorkflow)
 * and the redesigned ClinicalCaseContext (useClinicalCase).
 * 
 * Strategy:
 * - If ClinicalCaseContext has an active case (`currentCase` is not null),
 *   map its data to the legacy AnalysisSession shape so existing pages/components
 *   can consume it without modification.
 * - If no clinical case is active, fall back to the legacy workflow system.
 * - Provides the same API surface as useLegacyWorkflow, enabling drop-in replacement.
 * 
 * Usage:
 *   // Before (old):
 *   const { currentSession, updateSessionData, ... } = useLegacyWorkflow();
 *   
 *   // After (bridge):
 *   const { currentSession, updateSessionData, ... } = useWorkflowBridge();
 * 
 * Migration path:
 * 1. Replace useLegacyWorkflow() with useWorkflowBridge() in page components
 * 2. Components automatically use ClinicalCaseContext when a case is loaded
 * 3. Components fall back to workflow-v3 when no case exists (backward compat)
 * 4. Once all pages are migrated, the fallback can be removed
 */

import { useCallback, useMemo } from 'react';
import { useClinicalCase } from '../contexts/ClinicalCaseContext';
import { useLegacyWorkflow } from '../workflow-v3';
import type {
  AnalysisSession,
  WorkflowStep as LegacyWorkflowStep,
  WorkflowMode as LegacyWorkflowMode,
  WorkflowStatus,
  PatientInfo as LegacyPatientInfo,
  Finding,
  ImageMetadata,
  StoredAnalysisResult,
  BIRADS,
} from '../types/clinical.types';
import { WorkflowStep as LegacyWorkflowStepEnum } from '../types/clinical.types';
import type {
  ClinicalCase,
  PatientInfo as CasePatientInfo,
  ClinicalHistory,
  MammogramImage,
  ImageAnalysisResult,
  ConsolidatedFinding,
  BiRadsAssessment,
  ClinicalWorkflowStep,
  BiRadsCategory,
} from '../types/case.types';

// ============================================================================
// TYPE MAPPING UTILITIES
// ============================================================================

/**
 * Maps ClinicalCase patient info → legacy PatientInfo
 */
function mapCasePatientToLegacy(patient: CasePatientInfo): LegacyPatientInfo {
  // Calculate age from dateOfBirth
  const dob = new Date(patient.dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  // Map gender: case.types uses 'F'|'M'|'O', legacy uses 'M'|'F'|'O'
  const genderMap: Record<string, 'M' | 'F' | 'O'> = {
    'M': 'M',
    'F': 'F',
    'O': 'O',
  };

  return {
    patientId: patient.mrn,
    patientName: `${patient.firstName} ${patient.lastName}`.trim(),
    name: `${patient.firstName} ${patient.lastName}`.trim(),
    age,
    gender: genderMap[patient.gender] || 'O',
    dateOfBirth: patient.dateOfBirth,
  };
}

/**
 * Maps legacy PatientInfo → ClinicalCase patient info
 */
function mapLegacyPatientToCase(legacy: Partial<LegacyPatientInfo>): Partial<CasePatientInfo> {
  const result: Partial<CasePatientInfo> = {};
  // Allow extended legacy fields that may exist at runtime but not in the strict type
  const ext = legacy as Record<string, unknown>;

  if (legacy.patientId) result.mrn = legacy.patientId;
  if (legacy.name || legacy.patientName) {
    const fullName = legacy.name || legacy.patientName || '';
    const parts = fullName.trim().split(/\s+/);
    result.firstName = parts[0] || '';
    result.lastName = parts.slice(1).join(' ') || '';
  }
  if (legacy.dateOfBirth) result.dateOfBirth = legacy.dateOfBirth;
  if (legacy.gender) {
    const genderMap: Record<string, 'F' | 'M' | 'O'> = {
      'Male': 'M', 'male': 'M', 'M': 'M',
      'Female': 'F', 'female': 'F', 'F': 'F',
      'Other': 'O', 'other': 'O', 'O': 'O',
    };
    result.gender = genderMap[legacy.gender] || 'O';
  }
  if (ext.contactNumber) result.phone = String(ext.contactNumber);
  if (ext.email) result.email = String(ext.email);

  return result;
}

/**
 * Maps ClinicalCase MammogramImage[] → legacy ImageMetadata[]
 */
function mapCaseImagesToLegacy(images: MammogramImage[]): ImageMetadata[] {
  return images.map((img) => ({
    imageId: img.id,
    fileName: img.filename,
    fileSize: img.fileSize,
    imageDataUrl: img.localUrl,
    thumbnail: img.localUrl,
    viewType: (img.viewType as string as ImageMetadata['viewType']) || undefined,
    laterality: (img.laterality as string as ImageMetadata['laterality']) || undefined,
    uploadDate: img.uploadedAt || new Date().toISOString(),
  }));
}

/**
 * Maps ClinicalCase analysisResults → legacy StoredAnalysisResult
 * The legacy system stores a single result, case.types stores per-image array.
 * We aggregate into the first/primary result.
 */
function mapCaseAnalysisToLegacy(results: ImageAnalysisResult[]): StoredAnalysisResult | undefined {
  if (!results || results.length === 0) return undefined;

  // Use the first result as the primary, aggregate regions from all
  const primary = results[0];
  const allRegions = results.flatMap((r) =>
    r.suspiciousRegions.map((sr) => ({
      bbox: sr.bbox as [number, number, number, number],
      attention_score: sr.attentionScore,
      description: sr.description,
    }))
  );

  return {
    prediction: primary.prediction,
    confidence: primary.confidence,
    probabilities: primary.probabilities,
    riskLevel: primary.riskLevel,
    processingTimeMs: primary.processingTimeMs,
    modelVersion: primary.modelVersion,
    analyzedAt: primary.analyzedAt,
    explanation: {
      suspicious_regions: allRegions,
      attention_summary: primary.attentionSummary,
    },
  };
}

/**
 * Maps ClinicalCase consolidatedFindings → legacy Finding[]
 */
function mapCaseFindingsToLegacy(findings: ConsolidatedFinding[]): Finding[] {
  return findings.map((f) => ({
    findingId: f.id,
    findingType: (f.findingType || 'mass') as unknown as Finding['findingType'],
    location: {
      quadrant: (f.quadrant || undefined) as Finding['location']['quadrant'],
      clockPosition: f.clockPosition || undefined,
      depth: (f.depth || undefined) as Finding['location']['depth'],
      breast: (f.laterality === 'L' ? 'left' : 'right') as 'left' | 'right',
      description: `${f.quadrant || ''} ${f.laterality || ''}`.trim() || undefined,
    },
    description: f.radiologistNotes || '',
    aiConfidence: f.aiConfidence || 0,
    status: 'confirmed' as const,
    riskLevel: (f.aiConfidence || 0) > 0.7 ? 'high' as const : 
              (f.aiConfidence || 0) > 0.3 ? 'moderate' as const : 'low' as const,
    biRads: f.individualBiRads ? parseInt(f.individualBiRads, 10) || undefined : undefined,
  } as Finding));
}

/**
 * Maps ClinicalWorkflowStep → legacy step number (0-6)
 */
function mapCaseStepToLegacyIndex(step: ClinicalWorkflowStep): number {
  const stepMap: Record<string, number> = {
    'patient_registration': 2, // PATIENT_INFO
    'clinical_history': 2,     // Still patient-related phase
    'image_upload': 0,         // UPLOAD
    'image_verification': 0,   // Still upload phase
    'batch_ai_analysis': 1,    // AI_ANALYSIS
    'findings_review': 3,      // MEASUREMENTS (closest)
    'measurements': 3,         // MEASUREMENTS
    'annotations': 3,          // Still measurements phase
    'birads_assessment': 4,    // ASSESSMENT
    'report_generation': 5,    // REPORT
    'finalize': 6,             // FINALIZE
    'digital_signature': 6,    // Still finalize phase
  };
  return stepMap[step] ?? 0;
}

/**
 * Maps ClinicalCase.workflow.status → legacy WorkflowStatus
 */
function mapCaseStatusToLegacy(status: string): WorkflowStatus {
  const statusMap: Record<string, WorkflowStatus> = {
    'draft': 'in-progress',
    'in_progress': 'in-progress',
    'pending_review': 'reviewed',
    'completed': 'completed',
    'finalized': 'finalized',
  };
  return statusMap[status] || 'in-progress';
}

/**
 * Maps BI-RADS string category → legacy numeric BIRADS
 */
function mapBiRadsToLegacy(category?: BiRadsCategory): BIRADS | undefined {
  if (!category) return undefined;
  // Handle 4A/4B/4C → 4
  const numStr = category.replace(/[ABC]/i, '');
  const num = parseInt(numStr, 10);
  return isNaN(num) ? undefined : num as unknown as BIRADS;
}

// ============================================================================
// BRIDGE HOOK
// ============================================================================

/**
 * Main bridge hook — drop-in replacement for useLegacyWorkflow().
 * Returns the SAME API surface, so existing components work without changes.
 */
export function useWorkflowBridge() {
  // Try to get clinical case context
  let clinicalCase: ClinicalCase | null = null;
  let clinicalCaseCtx: ReturnType<typeof useClinicalCase> | null = null;

  try {
    clinicalCaseCtx = useClinicalCase();
    clinicalCase = clinicalCaseCtx.currentCase;
  } catch {
    // ClinicalCaseProvider might not be in tree yet — safe fallback
    clinicalCase = null;
    clinicalCaseCtx = null;
  }

  // Always call the legacy hook (for fallback and to satisfy React's rules of hooks)
  const legacy = useLegacyWorkflow();

  // Determine which system to use
  const useClinical = clinicalCase !== null && clinicalCaseCtx !== null;

  // ========================================================================
  // MAP ClinicalCase → AnalysisSession (legacy shape)
  // ========================================================================

  const currentSession = useMemo<AnalysisSession | null>(() => {
    if (!useClinical || !clinicalCase) {
      return legacy.currentSession;
    }

    return {
      sessionId: clinicalCase.id,
      patientInfo: mapCasePatientToLegacy(clinicalCase.patient),
      studyInfo: {
        studyId: clinicalCase.caseNumber,
        studyDate: clinicalCase.workflow.startedAt,
        studyDescription: 'Mammography Screening',
        accessionNumber: clinicalCase.caseNumber,
        modality: 'MG',
        institutionName: '',
        referringPhysician: '',
      },
      images: mapCaseImagesToLegacy(clinicalCase.images),
      activeImageId: clinicalCase.images[0]?.id,
      findings: mapCaseFindingsToLegacy(clinicalCase.consolidatedFindings),
      storedAnalysisResults: mapCaseAnalysisToLegacy(clinicalCase.analysisResults),
      assessment: {
        biradsCategory: mapBiRadsToLegacy(clinicalCase.assessment?.overallCategory),
        impression: clinicalCase.assessment?.impression || '',
        recommendation: clinicalCase.assessment?.recommendation || '',
      },
      workflow: {
        mode: 'clinical' as LegacyWorkflowMode,
        currentStep: mapCaseStepToLegacyIndex(clinicalCase.workflow.currentStep),
        completedSteps: clinicalCase.workflow.completedSteps.map(
          (s) => mapCaseStepToLegacyIndex(s) as unknown as LegacyWorkflowStep
        ),
        status: mapCaseStatusToLegacy(clinicalCase.workflow.status),
      },
      measurements: [],
      viewerSettings: {
        windowLevel: { width: 400, center: 200 },
        zoom: 1.0,
        rotation: 0,
        gridEnabled: false,
        gridSpacing: 10,
        calibration: 1.0,
      },
      metadata: {
        createdAt: clinicalCase.audit.createdAt,
        createdBy: clinicalCase.audit.createdBy,
        lastModified: clinicalCase.workflow.lastModifiedAt,
        modifiedBy: clinicalCase.audit.lastModifiedBy || clinicalCase.audit.createdBy,
        version: clinicalCase.audit.modifications.length + 1,
        autoSaveEnabled: true,
      },
    };
  }, [useClinical, clinicalCase, legacy.currentSession]);

  // ========================================================================
  // SESSION DATA UPDATES (write path)
  // ========================================================================

  const updateSessionData = useCallback((updates: Partial<AnalysisSession>) => {
    if (!useClinical || !clinicalCaseCtx) {
      legacy.updateSessionData(updates);
      return;
    }

    // Route updates to appropriate ClinicalCaseContext methods
    if (updates.patientInfo) {
      clinicalCaseCtx.updatePatientInfo(mapLegacyPatientToCase(updates.patientInfo));
    }

    if (updates.assessment) {
      // Assessment updates need to be mapped to BiRadsAssessment
      if (clinicalCase?.assessment) {
        const biRadsNum = updates.assessment.biradsCategory;
        const category = biRadsNum !== undefined ? String(biRadsNum) as BiRadsCategory : clinicalCase.assessment.overallCategory;
        clinicalCaseCtx.updateAssessment({
          ...clinicalCase.assessment,
          overallCategory: category,
          impression: updates.assessment.impression ?? clinicalCase.assessment.impression,
          recommendation: updates.assessment.recommendation ?? clinicalCase.assessment.recommendation,
        });
      }
    }
  }, [useClinical, clinicalCaseCtx, clinicalCase, legacy]);

  // ========================================================================
  // NAVIGATION
  // ========================================================================

  const advanceToStep = useCallback((step: LegacyWorkflowStep): boolean => {
    if (!useClinical || !clinicalCaseCtx) {
      return legacy.advanceToStep(step);
    }

    // In clinical case mode, advance to next step sequentially
    const result = clinicalCaseCtx.advanceWorkflow();
    return result.success;
  }, [useClinical, clinicalCaseCtx, legacy]);

  const navigateToStep = advanceToStep;

  // ========================================================================
  // SESSION MANAGEMENT
  // ========================================================================

  const createNewSession = useCallback((initialData?: Partial<AnalysisSession>) => {
    if (!useClinical || !clinicalCaseCtx) {
      return legacy.createNewSession(initialData);
    }

    // For clinical case system, create a new case
    const patient: CasePatientInfo = {
      mrn: initialData?.patientInfo?.patientId || '',
      firstName: '',
      lastName: '',
      dateOfBirth: initialData?.patientInfo?.dateOfBirth || '',
      gender: 'O',
    };

    const history: ClinicalHistory = {
      familyHistoryBreastCancer: false,
      personalHistoryBreastCancer: false,
      previousBiopsy: false,
      clinicalIndication: '',
      comparisonAvailable: false,
    };

    if (initialData?.patientInfo?.name) {
      const parts = initialData.patientInfo.name.trim().split(/\s+/);
      patient.firstName = parts[0] || '';
      patient.lastName = parts.slice(1).join(' ') || '';
    }

    clinicalCaseCtx.createCase(patient, history);
    return null; // Returns asynchronously via context state
  }, [useClinical, clinicalCaseCtx, legacy]);

  // ========================================================================
  // STEP COMPLETION STATE
  // ========================================================================

  const isStepCompleted = useCallback((step: LegacyWorkflowStep): boolean => {
    if (!useClinical || !clinicalCaseCtx) {
      return legacy.isStepCompleted(step);
    }
    // Map legacy step to clinical steps and check if any are completed
    const stepIndex = typeof step === 'number' ? step : 0;
    const clinicalSteps: Record<number, string[]> = {
      0: ['image_upload', 'image_verification'],
      1: ['batch_ai_analysis'],
      2: ['patient_registration', 'clinical_history'],
      3: ['measurements', 'annotations', 'findings_review'],
      4: ['birads_assessment'],
      5: ['report_generation'],
      6: ['finalize', 'digital_signature'],
    };
    const relevantSteps = clinicalSteps[stepIndex] || [];
    return relevantSteps.some((s) => clinicalCaseCtx!.isStepCompleted(s as ClinicalWorkflowStep));
  }, [useClinical, clinicalCaseCtx, legacy]);

  const canAdvanceToStep = useCallback((step: LegacyWorkflowStep): boolean => {
    if (!useClinical) return legacy.canAdvanceToStep(step);
    // In clinical workflow, can go back to any completed step or advance to next
    return true; // Simplified — the state machine handles guards
  }, [useClinical, legacy]);

  const getStepState = useCallback((step: LegacyWorkflowStep) => {
    if (!useClinical || !clinicalCase) return legacy.getStepState(step);
    const stepIndex = typeof step === 'number' ? step : 0;
    const currentLegacyStep = mapCaseStepToLegacyIndex(clinicalCase.workflow.currentStep);
    if (stepIndex === currentLegacyStep) return 'current' as const;
    if (isStepCompleted(step)) return 'completed' as const;
    if (stepIndex < currentLegacyStep) return 'available' as const;
    return 'locked' as const;
  }, [useClinical, clinicalCase, legacy, isStepCompleted]);

  // ========================================================================
  // IMAGE MANAGEMENT
  // ========================================================================

  const addImages = useCallback(async (files: File[]) => {
    if (!useClinical || !clinicalCaseCtx) {
      return legacy.addImages(files);
    }
    // Convert Files to MammogramImage objects and add via context
    for (const file of files) {
      const image: MammogramImage = {
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        localUrl: URL.createObjectURL(file),
        viewType: 'unknown' as any,
        laterality: 'unknown' as any,
        uploadStatus: 'uploaded',
      };
      clinicalCaseCtx.addImage(image);
    }
  }, [useClinical, clinicalCaseCtx, legacy]);

  const deleteImage = useCallback((imageId: string) => {
    if (!useClinical || !clinicalCaseCtx) {
      return legacy.deleteImage(imageId);
    }
    clinicalCaseCtx.removeImage(imageId);
  }, [useClinical, clinicalCaseCtx, legacy]);

  const updateImage = useCallback((imageId: string, updates: Partial<ImageMetadata>) => {
    if (!useClinical || !clinicalCaseCtx) {
      return legacy.updateImage(imageId, updates);
    }
    const imageUpdates: Partial<MammogramImage> = {};
    if (updates.fileName) imageUpdates.filename = updates.fileName;
    if (updates.viewType) imageUpdates.viewType = updates.viewType as any;
    if (updates.laterality) {
      imageUpdates.laterality = updates.laterality === 'L' ? 'left' : 
                                 updates.laterality === 'R' ? 'right' : 'unknown' as any;
    }
    clinicalCaseCtx.updateImage(imageId, imageUpdates);
  }, [useClinical, clinicalCaseCtx, legacy]);

  const setActiveImage = useCallback((imageId: string) => {
    if (!useClinical) {
      return legacy.setActiveImage(imageId);
    }
    // ClinicalCaseContext doesn't track active image — it's a viewer concern
    // Store in local state or let the viewer component handle it
  }, [useClinical, legacy]);

  // ========================================================================
  // FINDING MANAGEMENT
  // ========================================================================

  const addFinding = useCallback((finding: any) => {
    if (!useClinical || !clinicalCaseCtx || !clinicalCase) {
      return legacy.addFinding(finding);
    }
    // Map legacy finding to ConsolidatedFinding
    const consolidatedFinding: ConsolidatedFinding = {
      id: finding.findingId || `finding_${Date.now()}`,
      laterality: finding.location?.laterality || 'left',
      quadrant: finding.location?.quadrant,
      clockPosition: finding.location?.clockPosition,
      findingType: finding.findingType || 'mass',
      radiologistNotes: finding.description || '',
      aiConfidence: finding.aiConfidence,
      visibleInViews: [],
      aiCorrelatedRegions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add via updateAnalysisResults (adds to consolidatedFindings)
    clinicalCaseCtx.updateAnalysisResults(
      clinicalCase.analysisResults,
      [...clinicalCase.consolidatedFindings, consolidatedFinding],
    );
  }, [useClinical, clinicalCaseCtx, clinicalCase, legacy]);

  const updateFinding = useCallback((findingId: string, updates: any) => {
    if (!useClinical || !clinicalCaseCtx || !clinicalCase) {
      return legacy.updateFinding(findingId, updates);
    }
    const updatedFindings = clinicalCase.consolidatedFindings.map((f) =>
      f.id === findingId
        ? { ...f, ...updates, updatedAt: new Date().toISOString() }
        : f
    );
    clinicalCaseCtx.updateAnalysisResults(
      clinicalCase.analysisResults,
      updatedFindings,
    );
  }, [useClinical, clinicalCaseCtx, clinicalCase, legacy]);

  const deleteFinding = useCallback((findingId: string) => {
    if (!useClinical || !clinicalCaseCtx || !clinicalCase) {
      return legacy.deleteFinding(findingId);
    }
    const updatedFindings = clinicalCase.consolidatedFindings.filter(
      (f) => f.id !== findingId
    );
    clinicalCaseCtx.updateAnalysisResults(
      clinicalCase.analysisResults,
      updatedFindings,
    );
  }, [useClinical, clinicalCaseCtx, clinicalCase, legacy]);

  // ========================================================================
  // MISC OPERATIONS (delegated to legacy or no-op)
  // ========================================================================

  const workflowMode = useMemo<LegacyWorkflowMode>(() => {
    return useClinical ? 'clinical' : legacy.workflowMode;
  }, [useClinical, legacy.workflowMode]);

  const setWorkflowMode = useCallback((mode: LegacyWorkflowMode) => {
    if (!useClinical) legacy.setWorkflowMode(mode);
    // Clinical cases are always 'clinical' mode — no-op
  }, [useClinical, legacy]);

  const completionPercentage = useMemo(() => {
    if (!useClinical || !clinicalCaseCtx) return legacy.completionPercentage;
    return clinicalCaseCtx.getWorkflowProgress();
  }, [useClinical, clinicalCaseCtx, legacy.completionPercentage]);

  const autoSaveState = useMemo(() => ({
    isDirty: false,
    lastSaved: clinicalCase?.workflow.lastModifiedAt || new Date().toISOString(),
    savingInProgress: false,
    enabled: true,
  }), [clinicalCase?.workflow.lastModifiedAt]);

  const deleteCurrentSession = useCallback(() => {
    if (!useClinical) {
      legacy.deleteCurrentSession();
      return;
    }
    clinicalCaseCtx?.clearCurrentCase();
  }, [useClinical, clinicalCaseCtx, legacy]);

  const completeWorkflow = useCallback(() => {
    if (!useClinical || !clinicalCaseCtx) {
      legacy.completeWorkflow();
      return;
    }
    // Advance through remaining steps
    clinicalCaseCtx.advanceWorkflow();
  }, [useClinical, clinicalCaseCtx, legacy]);

  const getVisibleWorkflowSteps = useCallback(() => {
    if (!useClinical) return legacy.getVisibleWorkflowSteps();
    // Clinical cases always show all 7 legacy steps
    return [
      LegacyWorkflowStepEnum.UPLOAD,
      LegacyWorkflowStepEnum.AI_ANALYSIS,
      LegacyWorkflowStepEnum.PATIENT_INFO,
      LegacyWorkflowStepEnum.MEASUREMENTS,
      LegacyWorkflowStepEnum.ASSESSMENT,
      LegacyWorkflowStepEnum.REPORT,
      LegacyWorkflowStepEnum.FINALIZE,
    ];
  }, [useClinical, legacy]);

  const getCurrentStepIndex = useCallback(() => {
    if (!useClinical || !clinicalCase) return legacy.getCurrentStepIndex();
    return mapCaseStepToLegacyIndex(clinicalCase.workflow.currentStep);
  }, [useClinical, clinicalCase, legacy]);

  // ========================================================================
  // RETURN — Same shape as useLegacyWorkflow
  // ========================================================================

  return {
    // State
    currentSession,
    isLoading: useClinical ? (clinicalCaseCtx?.isLoading ?? false) : legacy.isLoading,
    error: useClinical ? (clinicalCaseCtx?.error?.message ?? null) : legacy.error,
    autoSaveState: useClinical ? autoSaveState : legacy.autoSaveState,

    // Mode
    workflowMode,
    setWorkflowMode,

    // Actions
    createNewSession,
    updateSessionData,
    advanceToStep,
    navigateToStep,
    deleteSession: legacy.deleteSession, // Fallback — clinical uses clearCurrentCase
    deleteCurrentSession,
    clearError: useClinical ? (clinicalCaseCtx?.clearError ?? legacy.clearError) : legacy.clearError,
    markStepCompleted: legacy.markStepCompleted, // No-op in both systems
    completeWorkflow,
    loadSession: legacy.loadSession, // Not yet needed for clinical cases
    saveSession: legacy.saveSession, // No-op — auto-save
    enableAutoSave: legacy.enableAutoSave, // No-op
    forceSave: legacy.forceSave, // No-op

    // Image management
    addImages,
    updateImage,
    deleteImage,
    setActiveImage,

    // Finding management
    addFinding,
    updateFinding,
    deleteFinding,

    // Derived state
    isStepCompleted,
    canAdvanceToStep,
    getStepState,
    completionPercentage,
    getVisibleWorkflowSteps,
    validateStepData: legacy.validateStepData,
    getCurrentStepIndex,

    // V3 direct access (preserved for backward compat)
    v3Session: legacy.v3Session,
    v3UpdateSession: legacy.v3UpdateSession,

    // NEW: Direct access to clinical case context (for components ready to migrate fully)
    clinicalCase: useClinical ? clinicalCase : null,
    clinicalCaseCtx: useClinical ? clinicalCaseCtx : null,
    isUsingClinicalCase: useClinical,
  };
}

export type WorkflowBridgeHook = ReturnType<typeof useWorkflowBridge>;
