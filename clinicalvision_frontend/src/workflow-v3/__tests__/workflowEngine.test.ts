/**
 * Workflow Engine Tests (TDD - Write Tests First)
 * 
 * These tests define the pure business logic for workflow navigation.
 * All functions are pure - no side effects, no localStorage.
 */

import {
  WorkflowSession,
  WorkflowStep,
  createNewSession,
  createEmptyAssessment,
  createEmptyPatientInfo,
  AnalysisResults,
} from '../types';
import {
  isStepComplete,
  canNavigateToStep,
  getStepState,
  getNextStep,
  getPreviousStep,
  getCompletionPercentage,
  validateNavigation,
  getFirstIncompleteStep,
} from '../workflowEngine';

// Helper to create a session with specific state
function createTestSession(overrides: Partial<WorkflowSession> = {}): WorkflowSession {
  return {
    ...createNewSession('clinical'),
    ...overrides,
  };
}

// Helper to create completed analysis results
function createCompletedAnalysis(): AnalysisResults {
  return {
    id: 'analysis-1',
    analyzedAt: new Date().toISOString(),
    status: 'complete',
    predictions: [{ label: 'benign', confidence: 0.95 }],
    confidenceScore: 0.95,
    findings: [],
    suggestedBirads: 2,
  };
}

describe('isStepComplete', () => {
  describe('UPLOAD step', () => {
    it('should return false when no images', () => {
      const session = createTestSession({ images: [] });
      expect(isStepComplete(session, WorkflowStep.UPLOAD)).toBe(false);
    });

    it('should return true when images exist', () => {
      const session = createTestSession({
        images: [{
          id: 'img-1',
          file: null,
          fileName: 'test.dcm',
          fileSize: 1024,
          preview: '',
          uploadedAt: new Date().toISOString(),
          metadata: { width: 100, height: 100, type: 'dicom' },
        }],
      });
      expect(isStepComplete(session, WorkflowStep.UPLOAD)).toBe(true);
    });
  });

  describe('AI_ANALYSIS step', () => {
    it('should return false when analysisResults is null', () => {
      const session = createTestSession({ analysisResults: null });
      expect(isStepComplete(session, WorkflowStep.AI_ANALYSIS)).toBe(false);
    });

    it('should return false when analysis is pending', () => {
      const session = createTestSession({
        analysisResults: {
          id: 'a1',
          analyzedAt: '',
          status: 'pending',
        },
      });
      expect(isStepComplete(session, WorkflowStep.AI_ANALYSIS)).toBe(false);
    });

    it('should return false when analysis failed', () => {
      const session = createTestSession({
        analysisResults: {
          id: 'a1',
          analyzedAt: '',
          status: 'failed',
        },
      });
      expect(isStepComplete(session, WorkflowStep.AI_ANALYSIS)).toBe(false);
    });

    it('should return true when analysis is complete', () => {
      const session = createTestSession({
        analysisResults: createCompletedAnalysis(),
      });
      expect(isStepComplete(session, WorkflowStep.AI_ANALYSIS)).toBe(true);
    });
  });

  describe('PATIENT_INFO step', () => {
    it('should return false when patient ID is empty', () => {
      const session = createTestSession({
        patientInfo: { ...createEmptyPatientInfo(), id: '' },
      });
      expect(isStepComplete(session, WorkflowStep.PATIENT_INFO)).toBe(false);
    });

    it('should return false when patient ID is only whitespace', () => {
      const session = createTestSession({
        patientInfo: { ...createEmptyPatientInfo(), id: '   ' },
      });
      expect(isStepComplete(session, WorkflowStep.PATIENT_INFO)).toBe(false);
    });

    it('should return true when patient ID is set', () => {
      const session = createTestSession({
        patientInfo: { ...createEmptyPatientInfo(), id: 'P12345' },
      });
      expect(isStepComplete(session, WorkflowStep.PATIENT_INFO)).toBe(true);
    });
  });

  describe('MEASUREMENTS step', () => {
    it('should return false when no measurements', () => {
      const session = createTestSession({ measurements: [] });
      expect(isStepComplete(session, WorkflowStep.MEASUREMENTS)).toBe(false);
    });

    it('should return true when measurements exist', () => {
      const session = createTestSession({
        measurements: [{
          id: 'm1',
          type: 'distance',
          label: 'Test',
          value: 10,
          unit: 'mm',
          createdAt: new Date().toISOString(),
        }],
      });
      expect(isStepComplete(session, WorkflowStep.MEASUREMENTS)).toBe(true);
    });
  });

  describe('ASSESSMENT step', () => {
    it('should return false when birads is null', () => {
      const session = createTestSession({
        assessment: { ...createEmptyAssessment(), birads: null },
      });
      expect(isStepComplete(session, WorkflowStep.ASSESSMENT)).toBe(false);
    });

    it('should return true when birads is set (including 0)', () => {
      const session = createTestSession({
        assessment: { ...createEmptyAssessment(), birads: 0 },
      });
      expect(isStepComplete(session, WorkflowStep.ASSESSMENT)).toBe(true);

      session.assessment.birads = 4;
      expect(isStepComplete(session, WorkflowStep.ASSESSMENT)).toBe(true);
    });
  });

  describe('REPORT step', () => {
    it('should return false when impression is empty', () => {
      const session = createTestSession({
        assessment: { ...createEmptyAssessment(), impression: '' },
      });
      expect(isStepComplete(session, WorkflowStep.REPORT)).toBe(false);
    });

    it('should return true when impression has content', () => {
      const session = createTestSession({
        assessment: { ...createEmptyAssessment(), impression: 'No significant findings' },
      });
      expect(isStepComplete(session, WorkflowStep.REPORT)).toBe(true);
    });
  });

  describe('FINALIZE step', () => {
    it('should return false when status is active', () => {
      const session = createTestSession({ status: 'active' });
      expect(isStepComplete(session, WorkflowStep.FINALIZE)).toBe(false);
    });

    it('should return true when status is completed', () => {
      const session = createTestSession({ status: 'completed' });
      expect(isStepComplete(session, WorkflowStep.FINALIZE)).toBe(true);
    });
  });
});

describe('canNavigateToStep', () => {
  describe('Clinical Mode', () => {
    it('should always allow navigation to UPLOAD', () => {
      const session = createTestSession({ mode: 'clinical' });
      expect(canNavigateToStep(session, WorkflowStep.UPLOAD)).toBe(true);
    });

    it('should allow AI_ANALYSIS only when UPLOAD is complete', () => {
      const session = createTestSession({ mode: 'clinical', images: [] });
      expect(canNavigateToStep(session, WorkflowStep.AI_ANALYSIS)).toBe(false);

      session.images = [{
        id: 'img-1',
        file: null,
        fileName: 'test.dcm',
        fileSize: 1024,
        preview: '',
        uploadedAt: new Date().toISOString(),
        metadata: { width: 100, height: 100, type: 'dicom' },
      }];
      expect(canNavigateToStep(session, WorkflowStep.AI_ANALYSIS)).toBe(true);
    });

    it('should always allow PATIENT_INFO (floating step)', () => {
      const session = createTestSession({ mode: 'clinical' });
      expect(canNavigateToStep(session, WorkflowStep.PATIENT_INFO)).toBe(true);
    });

    it('should allow MEASUREMENTS only when AI_ANALYSIS is complete', () => {
      const session = createTestSession({ 
        mode: 'clinical',
        images: [{ id: 'img-1', file: null, fileName: 'test.dcm', fileSize: 1024, preview: '', uploadedAt: '', metadata: { width: 100, height: 100, type: 'dicom' } }],
        analysisResults: null,
      });
      expect(canNavigateToStep(session, WorkflowStep.MEASUREMENTS)).toBe(false);

      session.analysisResults = createCompletedAnalysis();
      expect(canNavigateToStep(session, WorkflowStep.MEASUREMENTS)).toBe(true);
    });

    it('should allow ASSESSMENT only when AI_ANALYSIS is complete', () => {
      const session = createTestSession({ mode: 'clinical', analysisResults: null });
      expect(canNavigateToStep(session, WorkflowStep.ASSESSMENT)).toBe(false);

      session.analysisResults = createCompletedAnalysis();
      expect(canNavigateToStep(session, WorkflowStep.ASSESSMENT)).toBe(true);
    });

    it('should allow REPORT when ASSESSMENT is complete and patient ID exists', () => {
      const session = createTestSession({
        mode: 'clinical',
        patientInfo: { ...createEmptyPatientInfo(), id: '' },
        assessment: { ...createEmptyAssessment(), birads: null },
      });
      expect(canNavigateToStep(session, WorkflowStep.REPORT)).toBe(false);

      session.assessment.birads = 2;
      expect(canNavigateToStep(session, WorkflowStep.REPORT)).toBe(false); // Still needs patient ID

      session.patientInfo.id = 'P123';
      expect(canNavigateToStep(session, WorkflowStep.REPORT)).toBe(true);
    });

    it('should allow FINALIZE when REPORT is complete', () => {
      const session = createTestSession({
        mode: 'clinical',
        assessment: { ...createEmptyAssessment(), impression: '' },
      });
      expect(canNavigateToStep(session, WorkflowStep.FINALIZE)).toBe(false);

      session.assessment.impression = 'Final report content';
      expect(canNavigateToStep(session, WorkflowStep.FINALIZE)).toBe(true);
    });
  });

  describe('Quick Mode', () => {
    it('should always allow UPLOAD', () => {
      const session = createTestSession({ mode: 'quick' });
      expect(canNavigateToStep(session, WorkflowStep.UPLOAD)).toBe(true);
    });

    it('should allow AI_ANALYSIS when UPLOAD is complete', () => {
      const session = createTestSession({ mode: 'quick', images: [] });
      expect(canNavigateToStep(session, WorkflowStep.AI_ANALYSIS)).toBe(false);

      session.images = [{ id: '1', file: null, fileName: 'x', fileSize: 1, preview: '', uploadedAt: '', metadata: { width: 1, height: 1, type: '' } }];
      expect(canNavigateToStep(session, WorkflowStep.AI_ANALYSIS)).toBe(true);
    });

    it('should allow ASSESSMENT when AI_ANALYSIS is complete', () => {
      const session = createTestSession({ mode: 'quick', analysisResults: null });
      expect(canNavigateToStep(session, WorkflowStep.ASSESSMENT)).toBe(false);

      session.analysisResults = createCompletedAnalysis();
      expect(canNavigateToStep(session, WorkflowStep.ASSESSMENT)).toBe(true);
    });
  });
});

describe('getStepState', () => {
  it('should return "current" for the current step', () => {
    const session = createTestSession({ currentStep: WorkflowStep.UPLOAD });
    expect(getStepState(session, WorkflowStep.UPLOAD)).toBe('current');
  });

  it('should prioritize "current" over "completed"', () => {
    // This is the critical bug fix: even if a step is complete, 
    // if it's the current step, show it as current
    const session = createTestSession({
      currentStep: WorkflowStep.UPLOAD,
      images: [{ id: '1', file: null, fileName: 'x', fileSize: 1, preview: '', uploadedAt: '', metadata: { width: 1, height: 1, type: '' } }],
    });
    
    // UPLOAD is both complete AND current - should show as current
    expect(getStepState(session, WorkflowStep.UPLOAD)).toBe('current');
  });

  it('should return "completed" for completed steps (not current)', () => {
    const session = createTestSession({
      currentStep: WorkflowStep.AI_ANALYSIS,
      images: [{ id: '1', file: null, fileName: 'x', fileSize: 1, preview: '', uploadedAt: '', metadata: { width: 1, height: 1, type: '' } }],
    });
    
    expect(getStepState(session, WorkflowStep.UPLOAD)).toBe('completed');
  });

  it('should return "available" for navigable incomplete steps', () => {
    const session = createTestSession({
      currentStep: WorkflowStep.UPLOAD,
      mode: 'clinical',
    });
    
    // PATIENT_INFO is always navigable in clinical mode
    expect(getStepState(session, WorkflowStep.PATIENT_INFO)).toBe('available');
  });

  it('should return "locked" for non-navigable steps', () => {
    const session = createTestSession({
      currentStep: WorkflowStep.UPLOAD,
      images: [],
      analysisResults: null,
    });
    
    // AI_ANALYSIS is locked because UPLOAD isn't complete
    expect(getStepState(session, WorkflowStep.AI_ANALYSIS)).toBe('locked');
  });
});

describe('getNextStep', () => {
  it('should return next step in clinical mode', () => {
    const session = createTestSession({ mode: 'clinical' });
    expect(getNextStep(session, WorkflowStep.UPLOAD)).toBe(WorkflowStep.AI_ANALYSIS);
    expect(getNextStep(session, WorkflowStep.AI_ANALYSIS)).toBe(WorkflowStep.PATIENT_INFO);
  });

  it('should return next visible step in quick mode', () => {
    const session = createTestSession({ mode: 'quick' });
    expect(getNextStep(session, WorkflowStep.UPLOAD)).toBe(WorkflowStep.AI_ANALYSIS);
    expect(getNextStep(session, WorkflowStep.AI_ANALYSIS)).toBe(WorkflowStep.ASSESSMENT);
  });

  it('should return null at the last step', () => {
    const session = createTestSession({ mode: 'clinical' });
    expect(getNextStep(session, WorkflowStep.FINALIZE)).toBeNull();

    session.mode = 'quick';
    expect(getNextStep(session, WorkflowStep.ASSESSMENT)).toBeNull();
  });
});

describe('getPreviousStep', () => {
  it('should return previous step in clinical mode', () => {
    const session = createTestSession({ mode: 'clinical' });
    expect(getPreviousStep(session, WorkflowStep.AI_ANALYSIS)).toBe(WorkflowStep.UPLOAD);
    expect(getPreviousStep(session, WorkflowStep.PATIENT_INFO)).toBe(WorkflowStep.AI_ANALYSIS);
  });

  it('should return null at the first step', () => {
    const session = createTestSession({ mode: 'clinical' });
    expect(getPreviousStep(session, WorkflowStep.UPLOAD)).toBeNull();
  });
});

describe('getCompletionPercentage', () => {
  it('should return 0 for empty session', () => {
    const session = createTestSession();
    expect(getCompletionPercentage(session)).toBe(0);
  });

  it('should calculate percentage based on completed steps', () => {
    const session = createTestSession({
      mode: 'clinical',
      images: [{ id: '1', file: null, fileName: 'x', fileSize: 1, preview: '', uploadedAt: '', metadata: { width: 1, height: 1, type: '' } }],
      analysisResults: createCompletedAnalysis(),
    });
    
    // 2 out of 7 steps complete = ~28.57%
    const percentage = getCompletionPercentage(session);
    expect(percentage).toBeGreaterThan(20);
    expect(percentage).toBeLessThan(35);
  });

  it('should return 100 when all steps complete', () => {
    const session = createTestSession({
      mode: 'clinical',
      status: 'completed',
      images: [{ id: '1', file: null, fileName: 'x', fileSize: 1, preview: '', uploadedAt: '', metadata: { width: 1, height: 1, type: '' } }],
      analysisResults: createCompletedAnalysis(),
      patientInfo: { ...createEmptyPatientInfo(), id: 'P123' },
      measurements: [{ id: 'm1', type: 'distance', label: 'Test', value: 10, unit: 'mm', createdAt: '' }],
      assessment: { ...createEmptyAssessment(), birads: 2, impression: 'Normal' },
    });
    
    expect(getCompletionPercentage(session)).toBe(100);
  });
});

describe('validateNavigation', () => {
  it('should return valid for allowed navigation', () => {
    const session = createTestSession({ currentStep: WorkflowStep.UPLOAD });
    const result = validateNavigation(session, WorkflowStep.PATIENT_INFO);
    
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should return invalid with reason for blocked navigation', () => {
    const session = createTestSession({
      currentStep: WorkflowStep.UPLOAD,
      images: [],
    });
    const result = validateNavigation(session, WorkflowStep.AI_ANALYSIS);
    
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
    expect(result.missingRequirements).toContain('Upload images');
  });

  it('should provide helpful message for REPORT step', () => {
    const session = createTestSession({
      mode: 'clinical',
      patientInfo: createEmptyPatientInfo(),
      assessment: createEmptyAssessment(),
    });
    const result = validateNavigation(session, WorkflowStep.REPORT);
    
    expect(result.valid).toBe(false);
    expect(result.missingRequirements).toContain('Complete assessment');
    expect(result.missingRequirements).toContain('Enter patient ID');
  });
});

describe('getFirstIncompleteStep', () => {
  it('should return UPLOAD for new session', () => {
    const session = createTestSession();
    expect(getFirstIncompleteStep(session)).toBe(WorkflowStep.UPLOAD);
  });

  it('should skip completed steps', () => {
    const session = createTestSession({
      images: [{ id: '1', file: null, fileName: 'x', fileSize: 1, preview: '', uploadedAt: '', metadata: { width: 1, height: 1, type: '' } }],
    });
    expect(getFirstIncompleteStep(session)).toBe(WorkflowStep.AI_ANALYSIS);
  });

  it('should return null when all steps complete', () => {
    const session = createTestSession({
      mode: 'clinical',
      status: 'completed',
      images: [{ id: '1', file: null, fileName: 'x', fileSize: 1, preview: '', uploadedAt: '', metadata: { width: 1, height: 1, type: '' } }],
      analysisResults: createCompletedAnalysis(),
      patientInfo: { ...createEmptyPatientInfo(), id: 'P123' },
      measurements: [{ id: 'm1', type: 'distance', label: 'Test', value: 10, unit: 'mm', createdAt: '' }],
      assessment: { ...createEmptyAssessment(), birads: 2, impression: 'Normal' },
    });
    
    expect(getFirstIncompleteStep(session)).toBeNull();
  });
});
