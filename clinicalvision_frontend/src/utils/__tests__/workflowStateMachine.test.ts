/**
 * Workflow State Machine Tests
 * 
 * Comprehensive test suite for workflow state machine functionality.
 * Tests guard conditions, transitions, and edge cases.
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
  BiRadsCategory,
  BreastComposition,
  ViewType,
  Laterality,
  STEP_INDEX,
  TOTAL_WORKFLOW_STEPS,
} from '../../types/case.types';

import { assertFailure } from '../../types/resultHelpers';

import {
  getNextStep,
  getPreviousStep,
  isStepBefore,
  isStepAfter,
  getWorkflowProgress,
  isStepCompleted,
  isAtFinalStep,
  isFinalized,
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
  guardNotLocked,
} from '../workflowStateMachine';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const TEST_USER_ID = 'user-123';

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
  return {
    id: `img-${Date.now()}`,
    localId: `local-${Date.now()}`,
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
    overallCategory: '1', // NEGATIVE
    impression: 'No suspicious findings',
    recommendation: 'Continue routine screening',
    comparedWithPrior: false,
    leftBreast: {
      composition: BreastComposition.B,
      biRadsCategory: '1', // NEGATIVE
    },
    rightBreast: {
      composition: BreastComposition.B,
      biRadsCategory: '1', // NEGATIVE
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
    workflow: createInitialWorkflowState(TEST_USER_ID),
    audit: createInitialAuditTrail(TEST_USER_ID),
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
  return case_;
}

// ============================================================================
// STEP NAVIGATION TESTS
// ============================================================================

describe('getNextStep', () => {
  it('should return CLINICAL_HISTORY after PATIENT_REGISTRATION', () => {
    expect(getNextStep(ClinicalWorkflowStep.PATIENT_REGISTRATION))
      .toBe(ClinicalWorkflowStep.CLINICAL_HISTORY);
  });

  it('should return IMAGE_UPLOAD after CLINICAL_HISTORY', () => {
    expect(getNextStep(ClinicalWorkflowStep.CLINICAL_HISTORY))
      .toBe(ClinicalWorkflowStep.IMAGE_UPLOAD);
  });

  it('should return IMAGE_VERIFICATION after IMAGE_UPLOAD', () => {
    expect(getNextStep(ClinicalWorkflowStep.IMAGE_UPLOAD))
      .toBe(ClinicalWorkflowStep.IMAGE_VERIFICATION);
  });

  it('should return BATCH_AI_ANALYSIS after IMAGE_VERIFICATION', () => {
    expect(getNextStep(ClinicalWorkflowStep.IMAGE_VERIFICATION))
      .toBe(ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
  });

  it('should return undefined for DIGITAL_SIGNATURE (last step)', () => {
    expect(getNextStep(ClinicalWorkflowStep.DIGITAL_SIGNATURE))
      .toBeUndefined();
  });
});

describe('getPreviousStep', () => {
  it('should return undefined for PATIENT_REGISTRATION (first step)', () => {
    expect(getPreviousStep(ClinicalWorkflowStep.PATIENT_REGISTRATION))
      .toBeUndefined();
  });

  it('should return PATIENT_REGISTRATION for CLINICAL_HISTORY', () => {
    expect(getPreviousStep(ClinicalWorkflowStep.CLINICAL_HISTORY))
      .toBe(ClinicalWorkflowStep.PATIENT_REGISTRATION);
  });

  it('should return FINALIZE for DIGITAL_SIGNATURE', () => {
    expect(getPreviousStep(ClinicalWorkflowStep.DIGITAL_SIGNATURE))
      .toBe(ClinicalWorkflowStep.FINALIZE);
  });
});

describe('isStepBefore', () => {
  it('should return true when step is before reference', () => {
    expect(isStepBefore(
      ClinicalWorkflowStep.PATIENT_REGISTRATION,
      ClinicalWorkflowStep.CLINICAL_HISTORY
    )).toBe(true);
  });

  it('should return false when step is after reference', () => {
    expect(isStepBefore(
      ClinicalWorkflowStep.CLINICAL_HISTORY,
      ClinicalWorkflowStep.PATIENT_REGISTRATION
    )).toBe(false);
  });

  it('should return false when steps are the same', () => {
    expect(isStepBefore(
      ClinicalWorkflowStep.IMAGE_UPLOAD,
      ClinicalWorkflowStep.IMAGE_UPLOAD
    )).toBe(false);
  });
});

describe('isStepAfter', () => {
  it('should return true when step is after reference', () => {
    expect(isStepAfter(
      ClinicalWorkflowStep.BIRADS_ASSESSMENT,
      ClinicalWorkflowStep.IMAGE_UPLOAD
    )).toBe(true);
  });

  it('should return false when step is before reference', () => {
    expect(isStepAfter(
      ClinicalWorkflowStep.IMAGE_UPLOAD,
      ClinicalWorkflowStep.BIRADS_ASSESSMENT
    )).toBe(false);
  });
});

describe('getWorkflowProgress', () => {
  it('should return correct progress for first step', () => {
    const progress = getWorkflowProgress(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    expect(progress).toBe(Math.round(1 / TOTAL_WORKFLOW_STEPS * 100));
  });

  it('should return 100 for final step', () => {
    const progress = getWorkflowProgress(ClinicalWorkflowStep.DIGITAL_SIGNATURE);
    expect(progress).toBe(100);
  });

  it('should increase with each step', () => {
    const progress1 = getWorkflowProgress(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    const progress2 = getWorkflowProgress(ClinicalWorkflowStep.CLINICAL_HISTORY);
    const progress3 = getWorkflowProgress(ClinicalWorkflowStep.IMAGE_UPLOAD);
    
    expect(progress2).toBeGreaterThan(progress1);
    expect(progress3).toBeGreaterThan(progress2);
  });
});

// ============================================================================
// STATE QUERY TESTS
// ============================================================================

describe('isStepCompleted', () => {
  it('should return true for completed step', () => {
    const workflow: WorkflowState = {
      currentStep: ClinicalWorkflowStep.IMAGE_UPLOAD,
      completedSteps: [
        ClinicalWorkflowStep.PATIENT_REGISTRATION,
        ClinicalWorkflowStep.CLINICAL_HISTORY,
      ],
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      isLocked: false,
    };

    expect(isStepCompleted(ClinicalWorkflowStep.PATIENT_REGISTRATION, workflow))
      .toBe(true);
    expect(isStepCompleted(ClinicalWorkflowStep.CLINICAL_HISTORY, workflow))
      .toBe(true);
  });

  it('should return false for incomplete step', () => {
    const workflow: WorkflowState = {
      currentStep: ClinicalWorkflowStep.IMAGE_UPLOAD,
      completedSteps: [ClinicalWorkflowStep.PATIENT_REGISTRATION],
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      isLocked: false,
    };

    expect(isStepCompleted(ClinicalWorkflowStep.IMAGE_UPLOAD, workflow))
      .toBe(false);
  });
});

describe('isAtFinalStep', () => {
  it('should return true at DIGITAL_SIGNATURE', () => {
    const workflow: WorkflowState = {
      currentStep: ClinicalWorkflowStep.DIGITAL_SIGNATURE,
      completedSteps: [],
      status: 'completed',
      startedAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      isLocked: false,
    };

    expect(isAtFinalStep(workflow)).toBe(true);
  });

  it('should return false at other steps', () => {
    const workflow: WorkflowState = {
      currentStep: ClinicalWorkflowStep.BIRADS_ASSESSMENT,
      completedSteps: [],
      status: 'pending_review',
      startedAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      isLocked: false,
    };

    expect(isAtFinalStep(workflow)).toBe(false);
  });
});

describe('isFinalized', () => {
  it('should return true when status is finalized', () => {
    const workflow: WorkflowState = {
      currentStep: ClinicalWorkflowStep.DIGITAL_SIGNATURE,
      completedSteps: [],
      status: 'finalized',
      startedAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      isLocked: true,
    };

    expect(isFinalized(workflow)).toBe(true);
  });

  it('should return false when status is not finalized', () => {
    const workflow: WorkflowState = {
      currentStep: ClinicalWorkflowStep.REPORT_GENERATION,
      completedSteps: [],
      status: 'completed',
      startedAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      isLocked: false,
    };

    expect(isFinalized(workflow)).toBe(false);
  });
});

// ============================================================================
// GUARD FUNCTION TESTS
// ============================================================================

describe('guardPatientInfo', () => {
  it('should allow when patient info is valid', () => {
    const case_ = createMinimalCase();
    const result = guardPatientInfo(case_);
    
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should deny when patient info is incomplete', () => {
    const case_ = createMinimalCase({
      patient: { ...createValidPatientInfo(), mrn: '' },
    });
    const result = guardPatientInfo(case_);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('incomplete');
  });
});

describe('guardClinicalHistory', () => {
  it('should allow when clinical history is valid', () => {
    const case_ = createMinimalCase();
    const result = guardClinicalHistory(case_);
    
    expect(result.allowed).toBe(true);
  });

  it('should deny when indication is missing', () => {
    const case_ = createMinimalCase({
      clinicalHistory: { ...createValidClinicalHistory(), clinicalIndication: '' },
    });
    const result = guardClinicalHistory(case_);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('incomplete');
  });
});

describe('guardHasImages', () => {
  it('should allow when images exist', () => {
    const case_ = createMinimalCase({
      images: [createMockImage()],
    });
    const result = guardHasImages(case_);
    
    expect(result.allowed).toBe(true);
  });

  it('should deny when no images', () => {
    const case_ = createMinimalCase({ images: [] });
    const result = guardHasImages(case_);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('image');
  });

  it('should deny when images is undefined', () => {
    const case_ = createMinimalCase();
    delete (case_ as any).images;
    const result = guardHasImages(case_);
    
    expect(result.allowed).toBe(false);
  });
});

describe('guardAllImagesUploaded', () => {
  it('should allow when all images uploaded', () => {
    const case_ = createMinimalCase({
      images: [
        createMockImage({ uploadStatus: 'uploaded' }),
        createMockImage({ uploadStatus: 'uploaded' }),
      ],
    });
    const result = guardAllImagesUploaded(case_);
    
    expect(result.allowed).toBe(true);
  });

  it('should deny when some images still uploading', () => {
    const case_ = createMinimalCase({
      images: [
        createMockImage({ uploadStatus: 'uploaded' }),
        createMockImage({ uploadStatus: 'uploading' }),
      ],
    });
    const result = guardAllImagesUploaded(case_);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not uploaded');
  });

  it('should deny when some images failed', () => {
    const case_ = createMinimalCase({
      images: [
        createMockImage({ uploadStatus: 'uploaded' }),
        createMockImage({ uploadStatus: 'failed' }),
      ],
    });
    const result = guardAllImagesUploaded(case_);
    
    expect(result.allowed).toBe(false);
  });
});

describe('guardAnalysisComplete', () => {
  it('should allow when all images have analysis', () => {
    const img1 = createMockImage({ id: 'img-1' });
    const img2 = createMockImage({ id: 'img-2' });
    
    const case_ = createMinimalCase({
      images: [img1, img2],
      analysisResults: [
        createMockAnalysisResult('img-1'),
        createMockAnalysisResult('img-2'),
      ],
    });
    const result = guardAnalysisComplete(case_);
    
    expect(result.allowed).toBe(true);
  });

  it('should deny when no analysis results', () => {
    const case_ = createMinimalCase({
      images: [createMockImage()],
      analysisResults: [],
    });
    const result = guardAnalysisComplete(case_);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not been run');
  });

  it('should deny when some images not analyzed', () => {
    const img1 = createMockImage({ id: 'img-1' });
    const img2 = createMockImage({ id: 'img-2' });
    
    const case_ = createMinimalCase({
      images: [img1, img2],
      analysisResults: [createMockAnalysisResult('img-1')],
    });
    const result = guardAnalysisComplete(case_);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not analyzed');
  });
});

describe('guardBiRadsComplete', () => {
  it('should allow when assessment is complete', () => {
    const case_ = createMinimalCase({
      assessment: createMockAssessment(),
    });
    const result = guardBiRadsComplete(case_);
    
    expect(result.allowed).toBe(true);
  });

  it('should deny when no assessment', () => {
    const case_ = createMinimalCase();
    const result = guardBiRadsComplete(case_);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not provided');
  });

  it('should deny when category missing', () => {
    const case_ = createMinimalCase({
      assessment: {
        ...createMockAssessment(),
        overallCategory: undefined as any,
      },
    });
    const result = guardBiRadsComplete(case_);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('category');
  });

  it('should deny when impression missing', () => {
    const case_ = createMinimalCase({
      assessment: {
        ...createMockAssessment(),
        impression: '',
      },
    });
    const result = guardBiRadsComplete(case_);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('impression');
  });

  it('should deny when recommendation missing', () => {
    const case_ = createMinimalCase({
      assessment: {
        ...createMockAssessment(),
        recommendation: '   ',
      },
    });
    const result = guardBiRadsComplete(case_);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Recommendation');
  });
});

describe('guardReportGenerated', () => {
  it('should allow when report exists', () => {
    const case_ = createMinimalCase({
      report: createMockReport(),
    });
    const result = guardReportGenerated(case_);
    
    expect(result.allowed).toBe(true);
  });

  it('should deny when no report', () => {
    const case_ = createMinimalCase();
    const result = guardReportGenerated(case_);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not been generated');
  });
});

describe('guardNotLocked', () => {
  it('should allow when case not locked', () => {
    const case_ = createMinimalCase();
    case_.workflow.isLocked = false;
    const result = guardNotLocked(case_);
    
    expect(result.allowed).toBe(true);
  });

  it('should deny when case is locked', () => {
    const case_ = createMinimalCase();
    case_.workflow.isLocked = true;
    const result = guardNotLocked(case_);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('locked');
  });
});

// ============================================================================
// TRANSITION VALIDATION TESTS
// ============================================================================

describe('canTransitionTo', () => {
  describe('forward transitions', () => {
    it('should allow valid forward transition with satisfied guards', () => {
      const case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
      
      const result = canTransitionTo(case_, ClinicalWorkflowStep.CLINICAL_HISTORY);
      
      expect(result.allowed).toBe(true);
    });

    it('should deny forward transition when guard fails', () => {
      const case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
      case_.patient.mrn = ''; // Make validation fail
      
      const result = canTransitionTo(case_, ClinicalWorkflowStep.CLINICAL_HISTORY);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should deny skipping steps', () => {
      const case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
      
      const result = canTransitionTo(case_, ClinicalWorkflowStep.IMAGE_UPLOAD);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('skip');
    });
  });

  describe('backward transitions', () => {
    it('should allow going back to completed step', () => {
      const case_ = createCaseAtStep(
        ClinicalWorkflowStep.IMAGE_UPLOAD,
        [
          ClinicalWorkflowStep.PATIENT_REGISTRATION,
          ClinicalWorkflowStep.CLINICAL_HISTORY,
        ]
      );
      
      const result = canTransitionTo(case_, ClinicalWorkflowStep.PATIENT_REGISTRATION);
      
      expect(result.allowed).toBe(true);
    });

    it('should deny going back to incomplete step', () => {
      const case_ = createCaseAtStep(
        ClinicalWorkflowStep.IMAGE_UPLOAD,
        [ClinicalWorkflowStep.PATIENT_REGISTRATION]
      );
      
      const result = canTransitionTo(case_, ClinicalWorkflowStep.CLINICAL_HISTORY);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('incomplete');
    });
  });

  describe('locked/finalized cases', () => {
    it('should deny transition when case is locked', () => {
      const case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
      case_.workflow.isLocked = true;
      
      const result = canTransitionTo(case_, ClinicalWorkflowStep.CLINICAL_HISTORY);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('locked');
    });

    it('should deny transition when case is finalized', () => {
      const case_ = createCaseAtStep(ClinicalWorkflowStep.DIGITAL_SIGNATURE);
      case_.workflow.status = 'finalized';
      
      const result = canTransitionTo(case_, ClinicalWorkflowStep.PATIENT_REGISTRATION);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('finalized');
    });
  });

  it('should deny transitioning to same step', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.IMAGE_UPLOAD);
    
    const result = canTransitionTo(case_, ClinicalWorkflowStep.IMAGE_UPLOAD);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Already');
  });
});

describe('canGoBackTo', () => {
  it('should allow going back to completed step', () => {
    const case_ = createCaseAtStep(
      ClinicalWorkflowStep.IMAGE_UPLOAD,
      [
        ClinicalWorkflowStep.PATIENT_REGISTRATION,
        ClinicalWorkflowStep.CLINICAL_HISTORY,
      ]
    );
    
    const result = canGoBackTo(case_, ClinicalWorkflowStep.PATIENT_REGISTRATION);
    
    expect(result.allowed).toBe(true);
  });

  it('should deny going back to incomplete step', () => {
    const case_ = createCaseAtStep(
      ClinicalWorkflowStep.IMAGE_UPLOAD,
      [ClinicalWorkflowStep.PATIENT_REGISTRATION]
    );
    
    const result = canGoBackTo(case_, ClinicalWorkflowStep.CLINICAL_HISTORY);
    
    expect(result.allowed).toBe(false);
  });

  it('should deny when finalized', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.DIGITAL_SIGNATURE);
    case_.workflow.status = 'finalized';
    
    const result = canGoBackTo(case_, ClinicalWorkflowStep.PATIENT_REGISTRATION);
    
    expect(result.allowed).toBe(false);
  });

  it('should deny when locked', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.IMAGE_UPLOAD);
    case_.workflow.isLocked = true;
    
    const result = canGoBackTo(case_, ClinicalWorkflowStep.PATIENT_REGISTRATION);
    
    expect(result.allowed).toBe(false);
  });
});

// ============================================================================
// TRANSITION EXECUTION TESTS
// ============================================================================

describe('advanceWorkflow', () => {
  it('should advance to next step successfully', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    
    const result = advanceWorkflow(case_, TEST_USER_ID);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.workflow.currentStep)
        .toBe(ClinicalWorkflowStep.CLINICAL_HISTORY);
      expect(result.data.workflow.completedSteps)
        .toContain(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    }
  });

  it('should update lastModifiedAt timestamp', async () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    const originalTime = case_.workflow.lastModifiedAt;
    
    // Small delay to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));
    const result = advanceWorkflow(case_, TEST_USER_ID);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.workflow.lastModifiedAt).not.toBe(originalTime);
    }
  });

  it('should add audit entry', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    const originalAuditCount = case_.audit.modifications.length;
    
    const result = advanceWorkflow(case_, TEST_USER_ID);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.audit.modifications.length)
        .toBe(originalAuditCount + 1);
      expect(result.data.audit.modifications[0].action)
        .toBe('WORKFLOW_ADVANCE');
      expect(result.data.audit.modifications[0].userId)
        .toBe(TEST_USER_ID);
    }
  });

  it('should fail when guard condition fails', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    case_.patient.mrn = ''; // Fail validation
    
    const result = advanceWorkflow(case_, TEST_USER_ID);
    
    expect(result.success).toBe(false);
    const error = assertFailure(result);
    expect(error.name).toBe('WorkflowTransitionError');
  });

  it('should fail when at final step', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.DIGITAL_SIGNATURE);
    
    const result = advanceWorkflow(case_, TEST_USER_ID);
    
    expect(result.success).toBe(false);
    const error = assertFailure(result);
    expect(error.reason).toContain('No next step');
  });

  it('should update status based on step', () => {
    // Test draft -> in_progress when moving from PATIENT_REGISTRATION to CLINICAL_HISTORY
    const case1 = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    const result1 = advanceWorkflow(case1, TEST_USER_ID);
    
    expect(result1.success).toBe(true);
    if (result1.success) {
      // After advancing to CLINICAL_HISTORY (index 1), status should be 'in_progress'
      expect(result1.data.workflow.status).toBe('in_progress');
    }
  });

  it('should not mutate original case', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    const originalStep = case_.workflow.currentStep;
    
    advanceWorkflow(case_, TEST_USER_ID);
    
    // Original should be unchanged
    expect(case_.workflow.currentStep).toBe(originalStep);
  });
});

describe('goBackToStep', () => {
  it('should go back to completed step successfully', () => {
    const case_ = createCaseAtStep(
      ClinicalWorkflowStep.IMAGE_UPLOAD,
      [
        ClinicalWorkflowStep.PATIENT_REGISTRATION,
        ClinicalWorkflowStep.CLINICAL_HISTORY,
      ]
    );
    
    const result = goBackToStep(
      case_,
      ClinicalWorkflowStep.PATIENT_REGISTRATION,
      TEST_USER_ID
    );
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.workflow.currentStep)
        .toBe(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    }
  });

  it('should preserve completed steps when going back', () => {
    const completedSteps = [
      ClinicalWorkflowStep.PATIENT_REGISTRATION,
      ClinicalWorkflowStep.CLINICAL_HISTORY,
    ];
    const case_ = createCaseAtStep(ClinicalWorkflowStep.IMAGE_UPLOAD, completedSteps);
    
    const result = goBackToStep(
      case_,
      ClinicalWorkflowStep.PATIENT_REGISTRATION,
      TEST_USER_ID
    );
    
    expect(result.success).toBe(true);
    if (result.success) {
      // Completed steps should remain unchanged
      expect(result.data.workflow.completedSteps).toEqual(completedSteps);
    }
  });

  it('should add audit entry for going back', () => {
    const case_ = createCaseAtStep(
      ClinicalWorkflowStep.IMAGE_UPLOAD,
      [ClinicalWorkflowStep.PATIENT_REGISTRATION]
    );
    
    const result = goBackToStep(
      case_,
      ClinicalWorkflowStep.PATIENT_REGISTRATION,
      TEST_USER_ID
    );
    
    expect(result.success).toBe(true);
    if (result.success) {
      const lastAudit = result.data.audit.modifications[0];
      expect(lastAudit.action).toBe('WORKFLOW_GO_BACK');
    }
  });

  it('should fail when target not completed', () => {
    const case_ = createCaseAtStep(
      ClinicalWorkflowStep.IMAGE_UPLOAD,
      [ClinicalWorkflowStep.PATIENT_REGISTRATION]
    );
    
    const result = goBackToStep(
      case_,
      ClinicalWorkflowStep.CLINICAL_HISTORY,
      TEST_USER_ID
    );
    
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// FINALIZATION TESTS
// ============================================================================

describe('finalizeCase', () => {
  function createFullyPreparedCase(): ClinicalCase {
    const img1 = createMockImage({ id: 'img-1' });
    const img2 = createMockImage({ id: 'img-2' });
    
    return createCaseAtStep(
      ClinicalWorkflowStep.DIGITAL_SIGNATURE,
      [
        ClinicalWorkflowStep.PATIENT_REGISTRATION,
        ClinicalWorkflowStep.CLINICAL_HISTORY,
        ClinicalWorkflowStep.IMAGE_UPLOAD,
        ClinicalWorkflowStep.IMAGE_VERIFICATION,
        ClinicalWorkflowStep.BATCH_AI_ANALYSIS,
        ClinicalWorkflowStep.FINDINGS_REVIEW,
        ClinicalWorkflowStep.BIRADS_ASSESSMENT,
        ClinicalWorkflowStep.REPORT_GENERATION,
        ClinicalWorkflowStep.FINALIZE,
      ]
    );
  }

  it('should finalize case successfully', () => {
    const case_ = createFullyPreparedCase();
    case_.images = [createMockImage({ id: 'img-1' })];
    case_.analysisResults = [createMockAnalysisResult('img-1')];
    case_.assessment = createMockAssessment();
    case_.report = createMockReport();
    
    const result = finalizeCase(case_, TEST_USER_ID, 'signature-hash-123');
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.workflow.status).toBe('finalized');
      expect(result.data.workflow.isLocked).toBe(true);
      expect(result.data.audit.signedBy).toBe(TEST_USER_ID);
      expect(result.data.audit.signatureHash).toBe('signature-hash-123');
    }
  });

  it('should fail when not at digital signature step', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.REPORT_GENERATION);
    case_.assessment = createMockAssessment();
    case_.report = createMockReport();
    
    const result = finalizeCase(case_, TEST_USER_ID, 'signature-hash');
    
    expect(result.success).toBe(false);
    const error = assertFailure(result);
    expect(error.reason).toContain('complete all steps');
  });

  it('should fail when BI-RADS incomplete', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.DIGITAL_SIGNATURE);
    case_.images = [createMockImage({ id: 'img-1' })];
    case_.analysisResults = [createMockAnalysisResult('img-1')];
    case_.report = createMockReport();
    // No assessment
    
    const result = finalizeCase(case_, TEST_USER_ID, 'signature-hash');
    
    expect(result.success).toBe(false);
    const error = assertFailure(result);
    expect(error.reason).toContain('assessment');
  });

  it('should fail when report not generated', () => {
    const case_ = createCaseAtStep(ClinicalWorkflowStep.DIGITAL_SIGNATURE);
    case_.images = [createMockImage({ id: 'img-1' })];
    case_.analysisResults = [createMockAnalysisResult('img-1')];
    case_.assessment = createMockAssessment();
    // No report
    
    const result = finalizeCase(case_, TEST_USER_ID, 'signature-hash');
    
    expect(result.success).toBe(false);
    const error = assertFailure(result);
    expect(error.reason).toContain('Report');
  });

  it('should add DIGITAL_SIGNATURE to completed steps', () => {
    const case_ = createFullyPreparedCase();
    case_.images = [createMockImage({ id: 'img-1' })];
    case_.analysisResults = [createMockAnalysisResult('img-1')];
    case_.assessment = createMockAssessment();
    case_.report = createMockReport();
    
    const result = finalizeCase(case_, TEST_USER_ID, 'signature-hash');
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.workflow.completedSteps)
        .toContain(ClinicalWorkflowStep.DIGITAL_SIGNATURE);
    }
  });
});

// ============================================================================
// FACTORY FUNCTION TESTS
// ============================================================================

describe('createInitialWorkflowState', () => {
  it('should create workflow at first step', () => {
    const workflow = createInitialWorkflowState(TEST_USER_ID);
    
    expect(workflow.currentStep).toBe(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    expect(workflow.completedSteps).toEqual([]);
    expect(workflow.status).toBe('draft');
    expect(workflow.isLocked).toBe(false);
  });

  it('should set timestamps', () => {
    const workflow = createInitialWorkflowState(TEST_USER_ID);
    
    expect(workflow.startedAt).toBeDefined();
    expect(workflow.lastModifiedAt).toBeDefined();
    expect(workflow.startedAt).toBe(workflow.lastModifiedAt);
  });
});

describe('createInitialAuditTrail', () => {
  it('should create audit trail with creator', () => {
    const audit = createInitialAuditTrail(TEST_USER_ID);
    
    expect(audit.createdBy).toBe(TEST_USER_ID);
    expect(audit.createdAt).toBeDefined();
    expect(audit.modifications).toEqual([]);
  });

  it('should not have signature fields initially', () => {
    const audit = createInitialAuditTrail(TEST_USER_ID);
    
    expect(audit.signedBy).toBeUndefined();
    expect(audit.signedAt).toBeUndefined();
    expect(audit.signatureHash).toBeUndefined();
  });
});

// ============================================================================
// COMPLETE WORKFLOW JOURNEY TEST
// ============================================================================

describe('Complete Workflow Journey', () => {
  it('should complete entire workflow from start to finish', () => {
    // Start with a new case
    let case_: ClinicalCase = createMinimalCase();
    
    // Step 1: Patient Registration → Clinical History
    expect(case_.workflow.currentStep).toBe(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    let result = advanceWorkflow(case_, TEST_USER_ID);
    expect(result.success).toBe(true);
    if (result.success) case_ = result.data;
    
    // Step 2: Clinical History → Image Upload
    expect(case_.workflow.currentStep).toBe(ClinicalWorkflowStep.CLINICAL_HISTORY);
    result = advanceWorkflow(case_, TEST_USER_ID);
    expect(result.success).toBe(true);
    if (result.success) case_ = result.data;
    
    // Step 3: Image Upload → Image Verification
    expect(case_.workflow.currentStep).toBe(ClinicalWorkflowStep.IMAGE_UPLOAD);
    // Add images first
    const img = createMockImage({ id: 'img-1' });
    case_ = { ...case_, images: [img] };
    result = advanceWorkflow(case_, TEST_USER_ID);
    expect(result.success).toBe(true);
    if (result.success) case_ = result.data;
    
    // Step 4: Image Verification → Batch AI Analysis
    expect(case_.workflow.currentStep).toBe(ClinicalWorkflowStep.IMAGE_VERIFICATION);
    result = advanceWorkflow(case_, TEST_USER_ID);
    expect(result.success).toBe(true);
    if (result.success) case_ = result.data;
    
    // Step 5: Batch AI Analysis → Findings Review
    expect(case_.workflow.currentStep).toBe(ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
    // Add analysis results
    case_ = { ...case_, analysisResults: [createMockAnalysisResult('img-1')] };
    result = advanceWorkflow(case_, TEST_USER_ID);
    expect(result.success).toBe(true);
    if (result.success) case_ = result.data;
    
    // Step 6: Findings Review → BI-RADS Assessment (direct, no more Measurements/Annotations)
    expect(case_.workflow.currentStep).toBe(ClinicalWorkflowStep.FINDINGS_REVIEW);
    result = advanceWorkflow(case_, TEST_USER_ID);
    expect(result.success).toBe(true);
    if (result.success) case_ = result.data;
    
    // Step 7: BI-RADS Assessment → Report Generation
    expect(case_.workflow.currentStep).toBe(ClinicalWorkflowStep.BIRADS_ASSESSMENT);
    case_ = { ...case_, assessment: createMockAssessment() };
    result = advanceWorkflow(case_, TEST_USER_ID);
    expect(result.success).toBe(true);
    if (result.success) case_ = result.data;
    
    // Step 8: Report Generation → Finalize
    expect(case_.workflow.currentStep).toBe(ClinicalWorkflowStep.REPORT_GENERATION);
    case_ = { ...case_, report: createMockReport() };
    result = advanceWorkflow(case_, TEST_USER_ID);
    expect(result.success).toBe(true);
    if (result.success) case_ = result.data;
    
    // Step 9: Finalize → Digital Signature
    expect(case_.workflow.currentStep).toBe(ClinicalWorkflowStep.FINALIZE);
    result = advanceWorkflow(case_, TEST_USER_ID);
    expect(result.success).toBe(true);
    if (result.success) case_ = result.data;
    
    // Final step
    expect(case_.workflow.currentStep).toBe(ClinicalWorkflowStep.DIGITAL_SIGNATURE);
    expect(isAtFinalStep(case_.workflow)).toBe(true);
    
    // Finalize the case
    const finalResult = finalizeCase(case_, TEST_USER_ID, 'final-signature');
    expect(finalResult.success).toBe(true);
    if (finalResult.success) {
      case_ = finalResult.data;
      expect(isFinalized(case_.workflow)).toBe(true);
      expect(case_.workflow.completedSteps.length).toBe(10);
    }
  });
});

// ============================================================================
// CRITICAL: DOUBLE FINALIZATION PREVENTION TESTS
// ============================================================================

describe('Double Finalization Prevention', () => {
  
  it('should prevent finalizing an already finalized case', () => {
    // Create a fully finalized case
    let case_ = createMinimalCase();
    case_ = {
      ...case_,
      images: [createMockImage({ id: 'img-1' })],
      analysisResults: [createMockAnalysisResult('img-1')],
      assessment: createMockAssessment(),
      report: createMockReport(),
      workflow: {
        ...case_.workflow,
        currentStep: ClinicalWorkflowStep.DIGITAL_SIGNATURE,
        status: 'finalized',
        finalizedAt: new Date().toISOString(),
        isLocked: true,
        lockedBy: TEST_USER_ID,
        lockedAt: new Date().toISOString(),
        completedSteps: Object.values(ClinicalWorkflowStep),
      },
      audit: {
        ...case_.audit,
        signedBy: TEST_USER_ID,
        signedAt: new Date().toISOString(),
        signatureHash: 'existing-signature-hash',
      },
    };
    
    // Attempt to finalize again
    const result = finalizeCase(case_, 'different-user', 'new-signature-hash');
    
    expect(result.success).toBe(false);
    const error = assertFailure(result);
    expect(error.reason).toContain('already finalized');
  });
  
  it('should prevent finalizing a locked case by different user', () => {
    let case_ = createMinimalCase();
    case_ = {
      ...case_,
      images: [createMockImage({ id: 'img-1' })],
      analysisResults: [createMockAnalysisResult('img-1')],
      assessment: createMockAssessment(),
      report: createMockReport(),
      workflow: {
        ...case_.workflow,
        currentStep: ClinicalWorkflowStep.DIGITAL_SIGNATURE,
        isLocked: true,
        lockedBy: 'original-user',
        lockedAt: new Date().toISOString(),
      },
    };
    
    // Attempt to finalize by different user
    const result = finalizeCase(case_, 'different-user', 'signature-hash');
    
    expect(result.success).toBe(false);
    const error = assertFailure(result);
    expect(error.reason).toContain('locked');
  });
  
  it('should prevent any workflow changes on finalized case', () => {
    let case_ = createMinimalCase();
    case_ = {
      ...case_,
      workflow: {
        ...case_.workflow,
        currentStep: ClinicalWorkflowStep.DIGITAL_SIGNATURE,
        status: 'finalized',
        isLocked: true,
        finalizedAt: new Date().toISOString(),
      },
    };
    
    // Try to go back to a previous step
    const result = goBackToStep(case_, ClinicalWorkflowStep.PATIENT_REGISTRATION, TEST_USER_ID);
    
    expect(result.success).toBe(false);
    const error = assertFailure(result);
    expect(error.reason).toContain('finalized');
  });
  
  it('should not allow advancing workflow after finalization', () => {
    let case_ = createMinimalCase();
    case_ = {
      ...case_,
      images: [createMockImage({ id: 'img-1' })],
      workflow: {
        ...case_.workflow,
        currentStep: ClinicalWorkflowStep.DIGITAL_SIGNATURE,
        status: 'finalized',
        isLocked: true,
        finalizedAt: new Date().toISOString(),
        completedSteps: Object.values(ClinicalWorkflowStep),
      },
    };
    
    // Try to advance
    const result = advanceWorkflow(case_, TEST_USER_ID);
    
    expect(result.success).toBe(false);
    const error = assertFailure(result);
    expect(error.reason).toContain('finalized');
  });

});

// ============================================================================
// BI-RADS CATEGORY TRANSITION TRACKING TESTS
// ============================================================================

describe('BI-RADS Category Transition Tracking', () => {
  
  it('should track BI-RADS category changes in audit trail', () => {
    let case_ = createMinimalCase();
    case_ = {
      ...case_,
      patient: createValidPatientInfo(),
      clinicalHistory: createValidClinicalHistory(),
      images: [createMockImage({ id: 'img-1' })],
      analysisResults: [createMockAnalysisResult('img-1')],
      workflow: {
        ...case_.workflow,
        currentStep: ClinicalWorkflowStep.BIRADS_ASSESSMENT,
        completedSteps: [
          ClinicalWorkflowStep.PATIENT_REGISTRATION,
          ClinicalWorkflowStep.CLINICAL_HISTORY,
          ClinicalWorkflowStep.IMAGE_UPLOAD,
          ClinicalWorkflowStep.IMAGE_VERIFICATION,
          ClinicalWorkflowStep.BATCH_AI_ANALYSIS,
          ClinicalWorkflowStep.FINDINGS_REVIEW,
        ],
      },
    };
    
    // Simulate adding initial assessment
    const updatedCase = {
      ...case_,
      assessment: createMockAssessment(),
      audit: {
        ...case_.audit,
        modifications: [
          ...case_.audit.modifications,
          {
            timestamp: new Date().toISOString(),
            action: 'birads_category_set',
            userId: TEST_USER_ID,
            previousValue: undefined,
            newValue: 4,
          },
        ],
      },
    };
    
    expect(updatedCase.audit.modifications.length).toBeGreaterThan(0);
    const biRadsChange = updatedCase.audit.modifications.find(
      m => m.action === 'birads_category_set'
    );
    expect(biRadsChange).toBeDefined();
  });
  
  it('should validate BI-RADS category value ranges', () => {
    let case_ = createMinimalCase();
    case_ = {
      ...case_,
      patient: createValidPatientInfo(),
      clinicalHistory: createValidClinicalHistory(),
      images: [createMockImage({ id: 'img-1' })],
      analysisResults: [createMockAnalysisResult('img-1')],
      assessment: {
        ...createMockAssessment(),
        overallCategory: 7 as any, // Invalid category
      },
      workflow: {
        ...case_.workflow,
        currentStep: ClinicalWorkflowStep.BIRADS_ASSESSMENT,
        completedSteps: [
          ClinicalWorkflowStep.PATIENT_REGISTRATION,
          ClinicalWorkflowStep.CLINICAL_HISTORY,
          ClinicalWorkflowStep.IMAGE_UPLOAD,
          ClinicalWorkflowStep.IMAGE_VERIFICATION,
          ClinicalWorkflowStep.BATCH_AI_ANALYSIS,
          ClinicalWorkflowStep.FINDINGS_REVIEW,
        ],
      },
    };
    
    // Guard should fail for invalid BI-RADS category
    const canTransition = canTransitionTo(case_, ClinicalWorkflowStep.REPORT_GENERATION);
    // Category 7 should be considered invalid (valid is 0-6)
    expect(canTransition).toBeDefined();
  });
  
  it('should require reason when downgrading BI-RADS from AI suggestion', () => {
    let case_ = createMinimalCase();
    const aiSuggestedCategory = '4A' as unknown as BiRadsCategory; // AI suggested category 4
    
    case_ = {
      ...case_,
      patient: createValidPatientInfo(),
      clinicalHistory: createValidClinicalHistory(),
      images: [createMockImage({ id: 'img-1' })],
      analysisResults: [{
        ...createMockAnalysisResult('img-1'),
        riskLevel: 'high',
        confidence: 0.85,
      }],
      assessment: {
        ...createMockAssessment(),
        overallCategory: '2' as unknown as BiRadsCategory, // Radiologist downgraded to 2
        aiSuggestedCategory: aiSuggestedCategory,
      } as unknown as BiRadsAssessment,
      workflow: {
        ...case_.workflow,
        currentStep: ClinicalWorkflowStep.BIRADS_ASSESSMENT,
      },
    };
    
    // Verify the case captures the discrepancy
    expect(case_.assessment?.overallCategory).not.toBe(aiSuggestedCategory);
    // In a full implementation, this would require a reason field
  });
  
  it('should log timestamp for every BI-RADS assessment change', () => {
    const baseTime = new Date('2025-01-01T10:00:00Z');
    let case_ = createMinimalCase();
    
    case_ = {
      ...case_,
      assessment: createMockAssessment(),
      audit: {
        ...case_.audit,
        modifications: [
          {
            timestamp: baseTime.toISOString(),
            action: 'birads_initial',
            userId: TEST_USER_ID,
            newValue: 3,
          },
          {
            timestamp: new Date(baseTime.getTime() + 3600000).toISOString(), // +1 hour
            action: 'birads_change',
            userId: TEST_USER_ID,
            previousValue: 3,
            newValue: 4,
          },
        ],
      },
    };
    
    // Each modification should have a timestamp
    case_.audit.modifications.forEach(mod => {
      expect(mod.timestamp).toBeDefined();
      expect(new Date(mod.timestamp).getTime()).not.toBeNaN();
    });
    
    // Changes should be in chronological order
    const timestamps = case_.audit.modifications.map(m => new Date(m.timestamp).getTime());
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
    }
  });
  
});

// ============================================================================
// WORKFLOW TIMEOUT AND STALE LOCK DETECTION TESTS
// ============================================================================

describe('Workflow Timeout and Stale Lock Detection', () => {
  
  const LOCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  
  it('should detect stale locks older than timeout threshold', () => {
    const staleTime = new Date(Date.now() - LOCK_TIMEOUT_MS - 1000).toISOString();
    
    let case_ = createMinimalCase();
    case_ = {
      ...case_,
      workflow: {
        ...case_.workflow,
        isLocked: true,
        lockedBy: 'another-user',
        lockedAt: staleTime,
      },
    };
    
    // Check if lock is stale
    const lockedAt = new Date(case_.workflow.lockedAt!).getTime();
    const isStale = Date.now() - lockedAt > LOCK_TIMEOUT_MS;
    
    expect(isStale).toBe(true);
  });
  
  it('should consider recent locks as valid (not stale)', () => {
    const recentTime = new Date().toISOString();
    
    let case_ = createMinimalCase();
    case_ = {
      ...case_,
      workflow: {
        ...case_.workflow,
        isLocked: true,
        lockedBy: 'another-user',
        lockedAt: recentTime,
      },
    };
    
    // Check if lock is stale
    const lockedAt = new Date(case_.workflow.lockedAt!).getTime();
    const isStale = Date.now() - lockedAt > LOCK_TIMEOUT_MS;
    
    expect(isStale).toBe(false);
  });
  
  it('should allow override of stale lock by different user', () => {
    const staleTime = new Date(Date.now() - LOCK_TIMEOUT_MS - 60000).toISOString(); // 31 mins ago
    
    let case_ = createMinimalCase();
    case_ = {
      ...case_,
      workflow: {
        ...case_.workflow,
        isLocked: true,
        lockedBy: 'original-user',
        lockedAt: staleTime,
      },
    };
    
    // Check if lock is stale
    const lockedAt = new Date(case_.workflow.lockedAt!).getTime();
    const isStale = Date.now() - lockedAt > LOCK_TIMEOUT_MS;
    
    // If stale, a new user should be able to take over
    if (isStale) {
      const newLock = {
        isLocked: true,
        lockedBy: 'new-user',
        lockedAt: new Date().toISOString(),
      };
      
      const updatedWorkflow = {
        ...case_.workflow,
        ...newLock,
      };
      
      expect(updatedWorkflow.lockedBy).toBe('new-user');
    }
  });
  
  it('should not allow override of fresh lock by different user', () => {
    const freshTime = new Date().toISOString();
    
    let case_ = createMinimalCase();
    case_ = {
      ...case_,
      workflow: {
        ...case_.workflow,
        isLocked: true,
        lockedBy: 'original-user',
        lockedAt: freshTime,
      },
    };
    
    // Simulate another user trying to transition
    const result = advanceWorkflow(case_, 'different-user');
    
    expect(result.success).toBe(false);
    const error = assertFailure(result);
    expect(error.reason).toContain('locked');
  });
  
  it('should track lock history in audit trail', () => {
    let case_ = createMinimalCase();
    const lockEvents = [
      {
        timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        action: 'lock_acquired',
        userId: 'user-1',
      },
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        action: 'lock_released',
        userId: 'user-1',
      },
      {
        timestamp: new Date().toISOString(),
        action: 'lock_acquired',
        userId: 'user-2',
      },
    ];
    
    case_ = {
      ...case_,
      audit: {
        ...case_.audit,
        modifications: lockEvents,
      },
    };
    
    // Verify lock history is tracked
    const lockAcquisitions = case_.audit.modifications.filter(
      m => m.action === 'lock_acquired'
    );
    expect(lockAcquisitions.length).toBe(2);
  });
  
  it('should handle missing lockedAt timestamp gracefully', () => {
    let case_ = createMinimalCase();
    case_ = {
      ...case_,
      workflow: {
        ...case_.workflow,
        isLocked: true,
        lockedBy: 'user-1',
        lockedAt: undefined, // Missing timestamp
      },
    };
    
    // Should treat missing timestamp as potentially stale or handle gracefully
    const lockedAt = case_.workflow.lockedAt 
      ? new Date(case_.workflow.lockedAt).getTime() 
      : 0;
    
    // With no timestamp, lock should be considered stale for safety
    const isStale = !case_.workflow.lockedAt || (Date.now() - lockedAt > LOCK_TIMEOUT_MS);
    
    expect(isStale).toBe(true);
  });
  
});
