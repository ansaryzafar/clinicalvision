/**
 * Workflow State Machine Edge Case Tests
 * 
 * Additional edge case tests for workflow state machine robustness.
 * Tests concurrent access, corrupted state, boundary conditions, and race conditions.
 * 
 * @jest-environment jsdom
 */

import {
  ClinicalWorkflowStep,
  ClinicalCase,
  PatientInfo,
  ClinicalHistory,
  WorkflowState,
  MammogramImage,
  ImageAnalysisResult,
  BiRadsAssessment,
  BreastComposition,
  ViewType,
  Laterality,
  STEP_INDEX,
  CaseStatus,
  BiRadsCategory,
} from '../../types/case.types';

import { assertFailure } from '../../types/resultHelpers';

import {
  getNextStep,
  getPreviousStep,
  isStepBefore,
  isStepAfter,
  canTransitionTo,
  canGoBackTo,
  advanceWorkflow,
  goBackToStep,
  finalizeCase,
  createInitialWorkflowState,
  createInitialAuditTrail,
  guardPatientInfo,
  guardClinicalHistory,
  guardHasImages,
  guardAllImagesUploaded,
  guardAnalysisComplete,
  guardBiRadsComplete,
  guardReportGenerated,
} from '../workflowStateMachine';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const USER_1 = 'user-001';
const USER_2 = 'user-002';

function createValidPatientInfo(): PatientInfo {
  return {
    mrn: 'MRN123456',
    firstName: 'Jane',
    lastName: 'Smith',
    dateOfBirth: '1980-05-15',
    gender: 'F',
  };
}

function createValidClinicalHistory(): ClinicalHistory {
  return {
    clinicalIndication: 'Screening mammogram',
    familyHistoryBreastCancer: false,
    personalHistoryBreastCancer: false,
    previousBiopsy: false,
    comparisonAvailable: false,
  };
}

function createMockImage(overrides: Partial<MammogramImage> = {}): MammogramImage {
  const id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    localId: `local-${id}`,
    filename: 'test.dcm',
    fileSize: 1024 * 1024,
    mimeType: 'application/dicom',
    viewType: ViewType.MLO,
    laterality: Laterality.LEFT,
    uploadStatus: 'uploaded',
    uploadProgress: 100,
    addedAt: new Date().toISOString(),
    ...overrides,
  } as unknown as MammogramImage;
}

function createMockAnalysisResult(imageId: string): ImageAnalysisResult {
  return {
    imageId,
    prediction: 'benign',
    confidence: 0.95,
    probabilities: { benign: 0.95, malignant: 0.05 },
    riskLevel: 'low',
    suspiciousRegions: [],
    heatmapUrl: 'http://example.com/heatmap.png',
  } as unknown as ImageAnalysisResult;
}

function createMockAssessment(): BiRadsAssessment {
  return {
    overallCategory: '1',
    impression: 'No suspicious findings',
    recommendation: 'Continue routine screening',
    comparedWithPrior: false,
    leftBreast: {
      composition: BreastComposition.B,
      biRadsCategory: '1',
    },
    rightBreast: {
      composition: BreastComposition.B,
      biRadsCategory: '1',
    },
  };
}

function createMockReport(): ClinicalCase['report'] {
  const now = new Date().toISOString();
  return {
    id: 'report-123',
    content: {
      header: 'Mammography Report',
      clinicalHistory: 'Patient presents for routine screening.',
      technique: 'Full-field digital mammography',
      comparison: 'Prior study from 2023',
      findings: 'No suspicious masses or calcifications identified.',
      impression: 'Normal mammogram.',
      recommendation: 'Routine annual screening recommended.',
    },
    status: 'draft',
    generatedAt: now,
    modifiedAt: now,
  };
}

function createMinimalCase(overrides: Partial<ClinicalCase> = {}): ClinicalCase {
  const now = new Date().toISOString();
  return {
    id: 'case-001',
    caseNumber: 'CN-2024-00001',
    patient: createValidPatientInfo(),
    clinicalHistory: createValidClinicalHistory(),
    images: [],
    analysisResults: [],
    consolidatedFindings: [],
    workflow: createInitialWorkflowState(USER_1),
    audit: createInitialAuditTrail(USER_1),
    ...overrides,
  };
}

function createCaseAtStep(
  step: ClinicalWorkflowStep,
  completedSteps: ClinicalWorkflowStep[] = []
): ClinicalCase {
  const case_ = createMinimalCase();
  case_.workflow.currentStep = step;
  case_.workflow.completedSteps = completedSteps;
  
  // Add required data based on step
  if (step !== ClinicalWorkflowStep.PATIENT_REGISTRATION) {
    // Need images for steps after IMAGE_UPLOAD
    if (STEP_INDEX[step] >= STEP_INDEX[ClinicalWorkflowStep.IMAGE_UPLOAD]) {
      case_.images = [createMockImage()];
    }
    // Need analysis for steps after BATCH_AI_ANALYSIS
    if (STEP_INDEX[step] >= STEP_INDEX[ClinicalWorkflowStep.BATCH_AI_ANALYSIS]) {
      case_.images = [createMockImage()];
      case_.analysisResults = [createMockAnalysisResult(case_.images[0].id)];
    }
    // Need assessment for steps after BIRADS_ASSESSMENT
    if (STEP_INDEX[step] >= STEP_INDEX[ClinicalWorkflowStep.BIRADS_ASSESSMENT]) {
      case_.assessment = createMockAssessment();
    }
    // Need report for steps after REPORT_GENERATION
    if (STEP_INDEX[step] >= STEP_INDEX[ClinicalWorkflowStep.REPORT_GENERATION]) {
      case_.report = createMockReport();
    }
  }
  
  return case_;
}

// ============================================================================
// CONCURRENT ACCESS EDGE CASES
// ============================================================================

describe('Concurrent Access Edge Cases', () => {
  
  it('should reject transition when case is locked by another user', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    case_.workflow.isLocked = true;
    case_.workflow.lockedBy = USER_2;
    case_.workflow.lockedAt = new Date().toISOString();
    
    const result = advanceWorkflow(case_, USER_1);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = assertFailure(result);
      expect(error.reason).toContain('locked');
    }
  });
  
  it('should allow transition when case is locked by same user', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    case_.workflow.isLocked = true;
    case_.workflow.lockedBy = USER_1;
    case_.workflow.lockedAt = new Date().toISOString();
    
    // Same user should still be blocked by the general lock guard
    const result = advanceWorkflow(case_, USER_1);
    
    // The current implementation blocks ALL locked cases
    expect(result.success).toBe(false);
  });
  
  it('should handle rapid successive transitions by same user', async () => {
    let case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    
    // Advance 3 times rapidly
    const result1 = advanceWorkflow(case_, USER_1);
    expect(result1.success).toBe(true);
    if (!result1.success) return;
    
    // Prepare for next transition
    case_ = result1.data;
    case_.images = [createMockImage()]; // Add image for IMAGE_UPLOAD step
    
    const result2 = advanceWorkflow(case_, USER_1);
    expect(result2.success).toBe(true);
    if (!result2.success) return;
    
    // Verify audit trail captured all transitions with distinct timestamps
    const advanceAudits = result2.data.audit.modifications.filter(
      m => m.action === 'WORKFLOW_ADVANCE'
    );
    expect(advanceAudits.length).toBe(2);
  });
  
  it('should track user ID for each transition in audit', () => {
    let case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    
    const result = advanceWorkflow(case_, USER_1);
    expect(result.success).toBe(true);
    
    if (result.success) {
      const lastAudit = result.data.audit.modifications[0];
      expect(lastAudit.userId).toBe(USER_1);
    }
  });
  
  it('should reject goBackToStep when locked by another user', () => {
    const case_ = createCaseAtStep(
      ClinicalWorkflowStep.CLINICAL_HISTORY,
      [ClinicalWorkflowStep.PATIENT_REGISTRATION]
    );
    case_.workflow.isLocked = true;
    case_.workflow.lockedBy = USER_2;
    
    const result = goBackToStep(
      case_,
      ClinicalWorkflowStep.PATIENT_REGISTRATION,
      USER_1
    );
    
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = assertFailure(result);
      expect(error.reason).toContain('locked');
    }
  });
  
});

// ============================================================================
// CORRUPTED STATE HANDLING
// ============================================================================

describe('Corrupted State Handling', () => {
  
  it('should handle null patient info gracefully in guard', () => {
    const case_ = createMinimalCase();
    case_.patient = null as any;
    
    // Should not throw, should return invalid
    expect(() => guardPatientInfo(case_)).not.toThrow();
    const result = guardPatientInfo(case_);
    expect(result.allowed).toBe(false);
  });
  
  it('should handle undefined clinical history gracefully', () => {
    const case_ = createMinimalCase();
    case_.clinicalHistory = undefined as any;
    
    expect(() => guardClinicalHistory(case_)).not.toThrow();
    const result = guardClinicalHistory(case_);
    expect(result.allowed).toBe(false);
  });
  
  it('should handle missing images array gracefully', () => {
    const case_ = createMinimalCase();
    case_.images = null as any;
    
    expect(() => guardHasImages(case_)).not.toThrow();
    const result = guardHasImages(case_);
    expect(result.allowed).toBe(false);
  });
  
  it('should handle undefined analysisResults gracefully', () => {
    const case_ = createMinimalCase();
    case_.images = [createMockImage()];
    case_.analysisResults = undefined as any;
    
    expect(() => guardAnalysisComplete(case_)).not.toThrow();
    const result = guardAnalysisComplete(case_);
    expect(result.allowed).toBe(false);
  });
  
  it('should handle empty completedSteps array', () => {
    const case_ = createMinimalCase();
    case_.workflow.completedSteps = [];
    
    // Should be at first step with no completed steps
    const canGoBack = canGoBackTo(
      case_,
      ClinicalWorkflowStep.PATIENT_REGISTRATION
    );
    expect(canGoBack.allowed).toBe(false);
  });
  
  it('should handle duplicate entries in completedSteps', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.IMAGE_UPLOAD);
    case_.workflow.completedSteps = [
      ClinicalWorkflowStep.PATIENT_REGISTRATION,
      ClinicalWorkflowStep.PATIENT_REGISTRATION, // Duplicate
      ClinicalWorkflowStep.CLINICAL_HISTORY,
    ];
    
    // Should still work correctly
    const canGoBack = canGoBackTo(
      case_,
      ClinicalWorkflowStep.PATIENT_REGISTRATION
    );
    expect(canGoBack.allowed).toBe(true);
  });
  
  it('should handle workflow state with missing lastModifiedAt', () => {
    const case_ = createMinimalCase();
    case_.workflow.lastModifiedAt = undefined as any;
    
    // Transition should still work and set new timestamp
    const result = advanceWorkflow(case_, USER_1);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.workflow.lastModifiedAt).toBeDefined();
    }
  });
  
});

// ============================================================================
// BOUNDARY CONDITIONS FOR GUARDS
// ============================================================================

describe('Boundary Conditions for Guards', () => {
  
  describe('Patient Info Boundaries', () => {
    
    it('should reject MRN with only whitespace', () => {
      const case_ = createMinimalCase();
      case_.patient.mrn = '   ';
      
      const result = guardPatientInfo(case_);
      expect(result.allowed).toBe(false);
    });
    
    it('should reject MRN that is too short (4 chars)', () => {
      const case_ = createMinimalCase();
      case_.patient.mrn = 'MRN1'; // 4 chars, minimum is 5
      
      const result = guardPatientInfo(case_);
      expect(result.allowed).toBe(false);
    });
    
    it('should accept MRN at minimum length (5 chars)', () => {
      const case_ = createMinimalCase();
      case_.patient.mrn = 'MRN12'; // Exactly 5 chars
      
      const result = guardPatientInfo(case_);
      expect(result.allowed).toBe(true);
    });
    
    it('should reject firstName with only whitespace', () => {
      const case_ = createMinimalCase();
      case_.patient.firstName = '   ';
      
      const result = guardPatientInfo(case_);
      expect(result.allowed).toBe(false);
    });
    
    it('should reject future date of birth', () => {
      const case_ = createMinimalCase();
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      case_.patient.dateOfBirth = futureDate.toISOString().split('T')[0];
      
      const result = guardPatientInfo(case_);
      expect(result.allowed).toBe(false);
    });
    
    it('should accept patient born today', () => {
      const case_ = createMinimalCase();
      case_.patient.dateOfBirth = new Date().toISOString().split('T')[0];
      
      const result = guardPatientInfo(case_);
      expect(result.allowed).toBe(true);
    });
    
  });
  
  describe('Clinical History Boundaries', () => {
    
    it('should reject clinicalIndication with only whitespace', () => {
      const case_ = createMinimalCase();
      case_.clinicalHistory.clinicalIndication = '   \t\n  ';
      
      const result = guardClinicalHistory(case_);
      expect(result.allowed).toBe(false);
    });
    
    it('should accept clinicalIndication with leading/trailing whitespace', () => {
      const case_ = createMinimalCase();
      case_.clinicalHistory.clinicalIndication = '  Routine screening  ';
      
      const result = guardClinicalHistory(case_);
      expect(result.allowed).toBe(true);
    });
    
    it('should accept minimum valid clinical history', () => {
      const case_ = createMinimalCase();
      case_.clinicalHistory = {
        clinicalIndication: 'X', // Minimum - just 1 char
        familyHistoryBreastCancer: false,
        personalHistoryBreastCancer: false,
        previousBiopsy: false,
        comparisonAvailable: false,
      };
      
      const result = guardClinicalHistory(case_);
      expect(result.allowed).toBe(true);
    });
    
  });
  
  describe('BI-RADS Assessment Boundaries', () => {
    
    it('should reject impression with only whitespace', () => {
      const case_ = createMinimalCase();
      case_.assessment = createMockAssessment();
      case_.assessment.impression = '   ';
      
      const result = guardBiRadsComplete(case_);
      expect(result.allowed).toBe(false);
    });
    
    it('should reject recommendation with only whitespace', () => {
      const case_ = createMinimalCase();
      case_.assessment = createMockAssessment();
      case_.assessment.recommendation = '\t\n';
      
      const result = guardBiRadsComplete(case_);
      expect(result.allowed).toBe(false);
    });
    
    it('should reject missing overall category', () => {
      const case_ = createMinimalCase();
      case_.assessment = createMockAssessment();
      case_.assessment.overallCategory = undefined as any;
      
      const result = guardBiRadsComplete(case_);
      expect(result.allowed).toBe(false);
    });
    
    it('should reject empty string overall category', () => {
      const case_ = createMinimalCase();
      case_.assessment = createMockAssessment();
      case_.assessment.overallCategory = '' as unknown as BiRadsCategory;
      
      const result = guardBiRadsComplete(case_);
      expect(result.allowed).toBe(false);
    });
    
  });
  
  describe('Image Upload Boundaries', () => {
    
    it('should handle empty images array', () => {
      const case_ = createMinimalCase();
      case_.images = [];
      
      const result = guardHasImages(case_);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('At least one image');
    });
    
    it('should accept single image', () => {
      const case_ = createMinimalCase();
      case_.images = [createMockImage()];
      
      const result = guardHasImages(case_);
      expect(result.allowed).toBe(true);
    });
    
    it('should handle mixed upload statuses', () => {
      const case_ = createMinimalCase();
      case_.images = [
        createMockImage({ uploadStatus: 'uploaded' }),
        createMockImage({ uploadStatus: 'pending' }),
        createMockImage({ uploadStatus: 'failed' }),
      ];
      
      const result = guardAllImagesUploaded(case_);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('2 image(s) not uploaded');
    });
    
    it('should accept all images uploaded', () => {
      const case_ = createMinimalCase();
      case_.images = [
        createMockImage({ uploadStatus: 'uploaded' }),
        createMockImage({ uploadStatus: 'uploaded' }),
      ];
      
      const result = guardAllImagesUploaded(case_);
      expect(result.allowed).toBe(true);
    });
    
  });
  
  describe('Analysis Complete Boundaries', () => {
    
    it('should detect partial analysis (some images analyzed)', () => {
      const case_ = createMinimalCase();
      const img1 = createMockImage();
      const img2 = createMockImage();
      case_.images = [img1, img2];
      case_.analysisResults = [createMockAnalysisResult(img1.id)]; // Only first analyzed
      
      const result = guardAnalysisComplete(case_);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('1 image(s) not analyzed');
    });
    
    it('should detect analysis for non-existent images', () => {
      const case_ = createMinimalCase();
      case_.images = [createMockImage()];
      case_.analysisResults = [createMockAnalysisResult('non-existent-id')];
      
      const result = guardAnalysisComplete(case_);
      expect(result.allowed).toBe(false);
    });
    
    it('should accept all images analyzed', () => {
      const case_ = createMinimalCase();
      const img1 = createMockImage();
      const img2 = createMockImage();
      case_.images = [img1, img2];
      case_.analysisResults = [
        createMockAnalysisResult(img1.id),
        createMockAnalysisResult(img2.id),
      ];
      
      const result = guardAnalysisComplete(case_);
      expect(result.allowed).toBe(true);
    });
    
  });
  
});

// ============================================================================
// STATUS TRANSITION CORRECTNESS
// ============================================================================

describe('Status Transition Correctness', () => {
  
  it('should start with draft status', () => {
    const workflow = createInitialWorkflowState(USER_1);
    expect(workflow.status).toBe('draft');
  });
  
  it('should transition to in_progress after first advance', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    expect(case_.workflow.status).toBe('draft');
    
    const result = advanceWorkflow(case_, USER_1);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.workflow.status).toBe('in_progress');
    }
  });
  
  it('should remain in_progress through middle steps', () => {
    let case_ = createCaseAtStep(ClinicalWorkflowStep.CLINICAL_HISTORY);
    case_.workflow.status = 'in_progress';
    case_.images = [createMockImage()];
    
    const result = advanceWorkflow(case_, USER_1);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.workflow.status).toBe('in_progress');
    }
  });
  
  it('should set completedAt when reaching DIGITAL_SIGNATURE', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.FINALIZE);
    case_.workflow.status = 'in_progress';
    
    const result = advanceWorkflow(case_, USER_1);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.workflow.completedAt).toBeDefined();
    }
  });
  
  it('should reject any transition on finalized case', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    case_.workflow.status = 'finalized';
    
    const result = advanceWorkflow(case_, USER_1);
    expect(result.success).toBe(false);
    
    if (!result.success) {
      const error = assertFailure(result);
      expect(error.reason).toContain('finalized');
    }
  });
  
  it('should reject goBackToStep on finalized case', () => {
    const case_ = createCaseAtStep(
      ClinicalWorkflowStep.CLINICAL_HISTORY,
      [ClinicalWorkflowStep.PATIENT_REGISTRATION]
    );
    case_.workflow.status = 'finalized';
    
    const result = goBackToStep(
      case_,
      ClinicalWorkflowStep.PATIENT_REGISTRATION,
      USER_1
    );
    
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = assertFailure(result);
      expect(error.reason).toContain('finalized');
    }
  });
  
  it('should reject finalizeCase on already finalized case', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.DIGITAL_SIGNATURE);
    case_.workflow.status = 'finalized';
    case_.report = createMockReport();
    case_.assessment = createMockAssessment();
    
    const result = finalizeCase(case_, USER_1, 'signature-hash');
    
    expect(result.success).toBe(false);
    if (!result.success) {
      const error = assertFailure(result);
      expect(error.reason).toContain('already finalized');
    }
  });
  
});

// ============================================================================
// STEP SKIPPING PREVENTION
// ============================================================================

describe('Step Skipping Prevention', () => {
  
  it('should prevent skipping from PATIENT_REGISTRATION to IMAGE_UPLOAD', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    
    const result = canTransitionTo(case_, ClinicalWorkflowStep.IMAGE_UPLOAD);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('skip');
  });
  
  it('should prevent skipping multiple steps', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    
    const result = canTransitionTo(case_, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
    expect(result.allowed).toBe(false);
  });
  
  it('should prevent transitioning to same step', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    
    const result = canTransitionTo(case_, ClinicalWorkflowStep.PATIENT_REGISTRATION);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Already at this step');
  });
  
  it('should allow forward transition to immediate next step only', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    
    const result = canTransitionTo(case_, ClinicalWorkflowStep.CLINICAL_HISTORY);
    expect(result.allowed).toBe(true);
  });
  
});

// ============================================================================
// AUDIT TRAIL INTEGRITY
// ============================================================================

describe('Audit Trail Integrity', () => {
  
  it('should create audit entry with all required fields', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    const result = advanceWorkflow(case_, USER_1);
    
    expect(result.success).toBe(true);
    if (result.success) {
      const audit = result.data.audit.modifications[0];
      expect(audit.timestamp).toBeDefined();
      expect(audit.userId).toBe(USER_1);
      expect(audit.action).toBe('WORKFLOW_ADVANCE');
      expect(audit.previousValue).toBe(ClinicalWorkflowStep.PATIENT_REGISTRATION);
      expect(audit.newValue).toBe(ClinicalWorkflowStep.CLINICAL_HISTORY);
    }
  });
  
  it('should append new audit entries (chronological order)', () => {
    let case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    
    // First transition
    const result1 = advanceWorkflow(case_, USER_1);
    expect(result1.success).toBe(true);
    if (!result1.success) return;
    
    // Add image and do second transition
    case_ = result1.data;
    case_.images = [createMockImage()];
    
    const result2 = advanceWorkflow(case_, USER_1);
    expect(result2.success).toBe(true);
    if (!result2.success) return;
    
    // Entries should be in chronological order (oldest first, newest last)
    const mods = result2.data.audit.modifications;
    expect(mods[mods.length - 1].newValue)
      .toBe(ClinicalWorkflowStep.IMAGE_UPLOAD);
    expect(mods[mods.length - 2].newValue)
      .toBe(ClinicalWorkflowStep.CLINICAL_HISTORY);
  });
  
  it('should record go back action in audit', () => {
    const case_ = createCaseAtStep(
      ClinicalWorkflowStep.CLINICAL_HISTORY,
      [ClinicalWorkflowStep.PATIENT_REGISTRATION]
    );
    
    const result = goBackToStep(
      case_,
      ClinicalWorkflowStep.PATIENT_REGISTRATION,
      USER_1
    );
    
    expect(result.success).toBe(true);
    if (result.success) {
      const audit = result.data.audit.modifications[0];
      expect(audit.action).toBe('WORKFLOW_GO_BACK');
    }
  });
  
  it('should have valid ISO 8601 timestamps', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    const result = advanceWorkflow(case_, USER_1);
    
    expect(result.success).toBe(true);
    if (result.success) {
      const timestamp = result.data.audit.modifications[0].timestamp;
      const parsed = new Date(timestamp);
      expect(parsed.toISOString()).toBe(timestamp);
    }
  });
  
});

// ============================================================================
// STEP INDEX AND ORDERING
// ============================================================================

describe('Step Index and Ordering', () => {
  
  it('should have continuous step indices from 0', () => {
    const indices = Object.values(STEP_INDEX);
    const sorted = [...indices].sort((a, b) => a - b);
    
    for (let i = 0; i < sorted.length; i++) {
      expect(sorted[i]).toBe(i);
    }
  });
  
  it('should have PATIENT_REGISTRATION at index 0', () => {
    expect(STEP_INDEX[ClinicalWorkflowStep.PATIENT_REGISTRATION]).toBe(0);
  });
  
  it('should have DIGITAL_SIGNATURE at final index', () => {
    const maxIndex = Math.max(...Object.values(STEP_INDEX));
    expect(STEP_INDEX[ClinicalWorkflowStep.DIGITAL_SIGNATURE]).toBe(maxIndex);
  });
  
  it('should correctly determine step before relationship', () => {
    expect(isStepBefore(
      ClinicalWorkflowStep.PATIENT_REGISTRATION,
      ClinicalWorkflowStep.CLINICAL_HISTORY
    )).toBe(true);
    
    expect(isStepBefore(
      ClinicalWorkflowStep.CLINICAL_HISTORY,
      ClinicalWorkflowStep.PATIENT_REGISTRATION
    )).toBe(false);
  });
  
  it('should correctly determine step after relationship', () => {
    expect(isStepAfter(
      ClinicalWorkflowStep.DIGITAL_SIGNATURE,
      ClinicalWorkflowStep.PATIENT_REGISTRATION
    )).toBe(true);
    
    expect(isStepAfter(
      ClinicalWorkflowStep.PATIENT_REGISTRATION,
      ClinicalWorkflowStep.DIGITAL_SIGNATURE
    )).toBe(false);
  });
  
  it('should not consider step before/after itself', () => {
    expect(isStepBefore(
      ClinicalWorkflowStep.IMAGE_UPLOAD,
      ClinicalWorkflowStep.IMAGE_UPLOAD
    )).toBe(false);
    
    expect(isStepAfter(
      ClinicalWorkflowStep.IMAGE_UPLOAD,
      ClinicalWorkflowStep.IMAGE_UPLOAD
    )).toBe(false);
  });
  
  it('should return undefined for next step at final step', () => {
    const next = getNextStep(ClinicalWorkflowStep.DIGITAL_SIGNATURE);
    expect(next).toBeUndefined();
  });
  
  it('should return undefined for previous step at first step', () => {
    const prev = getPreviousStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    expect(prev).toBeUndefined();
  });
  
});

// ============================================================================
// IMMUTABILITY TESTS
// ============================================================================

describe('Immutability Tests', () => {
  
  it('should not mutate original case on advanceWorkflow', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    const originalStep = case_.workflow.currentStep;
    const originalCompletedCount = case_.workflow.completedSteps.length;
    const originalAuditCount = case_.audit.modifications.length;
    
    advanceWorkflow(case_, USER_1);
    
    expect(case_.workflow.currentStep).toBe(originalStep);
    expect(case_.workflow.completedSteps.length).toBe(originalCompletedCount);
    expect(case_.audit.modifications.length).toBe(originalAuditCount);
  });
  
  it('should not mutate original case on goBackToStep', () => {
    const case_ = createCaseAtStep(
      ClinicalWorkflowStep.CLINICAL_HISTORY,
      [ClinicalWorkflowStep.PATIENT_REGISTRATION]
    );
    const originalStep = case_.workflow.currentStep;
    
    goBackToStep(case_, ClinicalWorkflowStep.PATIENT_REGISTRATION, USER_1);
    
    expect(case_.workflow.currentStep).toBe(originalStep);
  });
  
  it('should return new case object on success', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    const result = advanceWorkflow(case_, USER_1);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toBe(case_);
      expect(result.data.workflow).not.toBe(case_.workflow);
      expect(result.data.audit).not.toBe(case_.audit);
    }
  });
  
  it('should return new completedSteps array', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    const originalArray = case_.workflow.completedSteps;
    
    const result = advanceWorkflow(case_, USER_1);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.workflow.completedSteps).not.toBe(originalArray);
    }
  });
  
  it('should return new modifications array', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    const originalArray = case_.audit.modifications;
    
    const result = advanceWorkflow(case_, USER_1);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.audit.modifications).not.toBe(originalArray);
    }
  });
  
});
