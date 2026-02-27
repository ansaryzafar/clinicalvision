/**
 * Workflow V3 Adapter
 * 
 * Bridge between V3 types and the legacy clinical.types.ts types.
 * This allows gradual migration without breaking existing components.
 */

import {
  WorkflowSession,
  WorkflowStep as V3WorkflowStep,
  WorkflowMode as V3WorkflowMode,
  ImageData as V3ImageData,
  AnalysisResults as V3AnalysisResults,
  PatientInfo as V3PatientInfo,
  Assessment as V3Assessment,
  createNewSession,
  createEmptyPatientInfo,
  createEmptyAssessment,
} from './index';

import {
  WorkflowStep as LegacyWorkflowStep,
  WorkflowMode as LegacyWorkflowMode,
  AnalysisSession,
  StoredAnalysisResult,
  ImageMetadata,
} from '../types/clinical.types';

// ============================================================================
// STEP MAPPING
// ============================================================================

/**
 * Convert legacy WorkflowStep to V3 WorkflowStep
 * Both are identical enums (0-6), so direct mapping works
 */
export function toV3Step(legacyStep: LegacyWorkflowStep): V3WorkflowStep {
  return legacyStep as unknown as V3WorkflowStep;
}

/**
 * Convert V3 WorkflowStep to legacy WorkflowStep
 */
export function toLegacyStep(v3Step: V3WorkflowStep): LegacyWorkflowStep {
  return v3Step as unknown as LegacyWorkflowStep;
}

// ============================================================================
// MODE MAPPING
// ============================================================================

/**
 * Convert legacy mode to V3 mode
 */
export function toV3Mode(legacyMode: LegacyWorkflowMode): V3WorkflowMode {
  return legacyMode as V3WorkflowMode;
}

/**
 * Convert V3 mode to legacy mode
 */
export function toLegacyMode(v3Mode: V3WorkflowMode): LegacyWorkflowMode {
  return v3Mode as LegacyWorkflowMode;
}

// ============================================================================
// IMAGE DATA CONVERSION
// ============================================================================

/**
 * Convert legacy ImageMetadata to V3 ImageData
 */
export function toV3ImageData(legacyImage: ImageMetadata): V3ImageData {
  return {
    id: legacyImage.imageId,
    file: null, // Files can't be persisted, only metadata
    fileName: legacyImage.fileName,
    fileSize: legacyImage.fileSize,
    preview: legacyImage.thumbnail || legacyImage.imageDataUrl || '',
    uploadedAt: legacyImage.uploadDate,
    metadata: {
      width: 0, // Not tracked in legacy
      height: 0,
      type: 'mammogram',
      view: legacyImage.viewType as 'CC' | 'MLO' | undefined,
      laterality: legacyImage.laterality === 'L' ? 'left' : legacyImage.laterality === 'R' ? 'right' : undefined,
    },
  };
}

/**
 * Convert V3 ImageData to legacy ImageMetadata
 */
export function toLegacyImageInfo(v3Image: V3ImageData): ImageMetadata {
  return {
    imageId: v3Image.id,
    fileName: v3Image.fileName,
    fileSize: v3Image.fileSize,
    uploadDate: v3Image.uploadedAt,
    viewType: (v3Image.metadata.view || 'CC') as ImageMetadata['viewType'],
    laterality: v3Image.metadata.laterality === 'left' ? 'L' : v3Image.metadata.laterality === 'right' ? 'R' : 'L',
    analyzed: false, // Set based on analysisResults
    imageDataUrl: v3Image.preview,
    thumbnail: v3Image.preview,
  };
}

// ============================================================================
// ANALYSIS RESULTS CONVERSION
// ============================================================================

/**
 * Convert legacy StoredAnalysisResult to V3 AnalysisResults
 */
export function toV3AnalysisResults(legacy: StoredAnalysisResult): V3AnalysisResults {
  return {
    id: `analysis_${Date.now()}`,
    analyzedAt: legacy.analyzedAt,
    status: 'complete',
    predictions: [{
      label: legacy.prediction,
      confidence: legacy.confidence,
    }],
    confidenceScore: legacy.confidence,
    findings: legacy.explanation?.suspicious_regions?.map((region, index) => ({
      id: `finding_${index}`,
      type: 'mass',
      location: region.description || 'Unknown',
      severity: legacy.riskLevel as 'low' | 'medium' | 'high',
      description: region.description || '',
    })) || [],
    suggestedBirads: legacy.riskLevel === 'high' ? 4 : legacy.riskLevel === 'moderate' ? 3 : 2,
  };
}

/**
 * Convert V3 AnalysisResults to legacy StoredAnalysisResult
 */
export function toLegacyAnalysisResult(v3: V3AnalysisResults): StoredAnalysisResult {
  const prediction = v3.predictions?.[0];
  return {
    prediction: (prediction?.label || 'benign') as 'benign' | 'malignant',
    confidence: v3.confidenceScore || prediction?.confidence || 0,
    probabilities: {
      benign: prediction?.label === 'benign' ? prediction.confidence : 1 - (prediction?.confidence || 0),
      malignant: prediction?.label === 'malignant' ? prediction.confidence : 1 - (prediction?.confidence || 0),
    },
    riskLevel: v3.findings?.some(f => f.severity === 'high') ? 'high' : 
               v3.findings?.some(f => f.severity === 'medium') ? 'moderate' : 'low',
    processingTimeMs: 0, // Not tracked in V3
    modelVersion: 'v3',
    analyzedAt: v3.analyzedAt,
    explanation: {
      suspicious_regions: v3.findings?.map(f => ({
        bbox: [0, 0, 0, 0] as [number, number, number, number],
        attention_score: 0,
        description: f.description,
      })) || [],
    },
  };
}

// ============================================================================
// SESSION CONVERSION
// ============================================================================

/**
 * Convert V3 WorkflowSession to legacy AnalysisSession format
 * For components that still expect the old format
 */
export function toLegacySession(v3Session: WorkflowSession): Partial<AnalysisSession> {
  return {
    sessionId: v3Session.id,
    createdAt: v3Session.createdAt,
    updatedAt: v3Session.updatedAt,
    workflow: {
      mode: toLegacyMode(v3Session.mode),
      currentStep: toLegacyStep(v3Session.currentStep),
      completedSteps: [], // Derived in V3, not stored
      status: v3Session.status === 'completed' ? 'finalized' : 'in-progress',
      startedAt: v3Session.createdAt,
    },
    images: v3Session.images.map(toLegacyImageInfo),
    storedAnalysisResults: v3Session.analysisResults 
      ? toLegacyAnalysisResult(v3Session.analysisResults)
      : undefined,
    patientInfo: v3Session.patientInfo.id ? {
      patientId: v3Session.patientInfo.id,
      name: v3Session.patientInfo.name,
      patientName: v3Session.patientInfo.name,
      dateOfBirth: v3Session.patientInfo.dateOfBirth,
      gender: (v3Session.patientInfo.gender === 'male' ? 'M' : v3Session.patientInfo.gender === 'female' ? 'F' : 'O') as 'M' | 'F' | 'O' | undefined,
    } : undefined,
    assessment: v3Session.assessment.birads !== null ? {
      biradsCategory: v3Session.assessment.birads as unknown as import('../types/clinical.types').BIRADS,
      impression: v3Session.assessment.impression,
      recommendation: v3Session.assessment.recommendations,
    } : undefined,
  } as Partial<AnalysisSession>;
}

// ============================================================================
// HOOK ADAPTER
// ============================================================================

/**
 * Create a legacy-compatible interface from V3 hook
 * This allows components to use the same API while V3 runs underneath
 */
export interface LegacyWorkflowAdapter {
  currentSession: Partial<AnalysisSession> | null;
  workflowMode: LegacyWorkflowMode;
  setWorkflowMode: (mode: LegacyWorkflowMode) => void;
  updateSessionData: (updates: Partial<AnalysisSession>) => void;
  advanceToStep: (step: LegacyWorkflowStep) => boolean;
  createNewSession: (initialData?: Partial<AnalysisSession>) => void;
  error: string | null;
  clearError: () => void;
}
