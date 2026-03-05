/**
 * Workflow Utilities Tests
 *
 * Tests for derived workflow state calculations including:
 * - isStepActuallyCompleted: data-driven step completion
 * - getCompletionPercentage: progress bar calculation
 * - getCompletedSteps: visible step counting
 *
 * Bug fix validation:
 * - Finalized/completed sessions MUST return 100% (not 86%)
 * - In-progress sessions derive percentage from actual step data
 *
 * @jest-environment jsdom
 */

import {
  isStepActuallyCompleted,
  getCompletionPercentage,
  getCompletedSteps,
  getCompletedVisibleStepsCount,
} from '../workflowUtils';
import { AnalysisSession, WorkflowStep, WorkflowMode, BIRADS } from '../../types/clinical.types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createSession(overrides: Partial<AnalysisSession> = {}): AnalysisSession {
  return {
    sessionId: 'test-session-001',
    patientInfo: {
      patientId: '',
      name: undefined,
      dateOfBirth: undefined,
      gender: undefined,
      medicalRecordNumber: undefined,
    },
    studyInfo: {
      studyId: 'study-001',
      studyDate: '2026-01-01',
      studyDescription: 'Mammography Screening',
      modality: 'MG',
    },
    images: [],
    findings: [],
    storedAnalysisResults: undefined,
    assessment: {
      biradsCategory: undefined,
      impression: '',
      recommendation: '',
    },
    workflow: {
      mode: 'clinical',
      currentStep: 0,
      completedSteps: [],
      status: 'in-progress',
      startedAt: '2026-01-01T00:00:00Z',
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
      createdAt: '2026-01-01T00:00:00Z',
      createdBy: 'radiologist',
      lastModified: '2026-01-01T00:00:00Z',
      modifiedBy: 'radiologist',
      version: 1,
      autoSaveEnabled: true,
    },
    ...overrides,
  };
}

/**
 * Create a session that mimics a bridge-converted finalized case.
 * This is the exact shape that caseSessionBridge.ts produces:
 * - mode: 'clinical'
 * - status: 'finalized'
 * - measurements: [] (always empty — bridge doesn't map measurements)
 * - All other data populated
 */
function createBridgedFinalizedSession(): AnalysisSession {
  return createSession({
    patientInfo: {
      patientId: 'DEMO-001',
      name: 'Jane Doe',
      dateOfBirth: '1965-03-15',
      gender: 'F',
      medicalRecordNumber: 'DEMO-001',
    },
    images: [
      {
        imageId: 'img-rcc',
        fileName: 'RCC_001.png',
        fileSize: 2048000,
        uploadDate: '2026-01-01T01:00:00Z',
        viewType: 'CC' as any,
        laterality: 'R' as any,
        analyzed: true,
      },
    ],
    findings: [
      {
        findingId: 'finding-001',
        findingType: 'mass' as any,
        location: {
          quadrant: 'upper-outer' as any,
          clockPosition: 10,
          depth: 'middle' as any,
          breast: 'right',
        },
        description: 'Suspicious mass',
        biradsCategory: BIRADS.SUSPICIOUS_MODERATE,
        aiConfidence: 0.87,
        status: 'confirmed',
      },
    ],
    storedAnalysisResults: {
      prediction: 'malignant',
      confidence: 0.87,
      probabilities: { benign: 0.13, malignant: 0.87 },
      riskLevel: 'high',
      processingTimeMs: 1234,
      modelVersion: 'v2.1.0',
      analyzedAt: '2026-01-01T02:00:00Z',
    },
    assessment: {
      biradsCategory: BIRADS.SUSPICIOUS_MODERATE,
      impression: 'Suspicious mass right breast',
      recommendation: 'Biopsy recommended',
    },
    workflow: {
      mode: 'clinical',
      currentStep: 6,
      completedSteps: [
        WorkflowStep.UPLOAD,
        WorkflowStep.AI_ANALYSIS,
        WorkflowStep.PATIENT_INFO,
        WorkflowStep.ASSESSMENT,
        WorkflowStep.REPORT,
        WorkflowStep.FINALIZE,
      ],
      status: 'finalized',
      startedAt: '2026-01-01T00:00:00Z',
      stepHistory: [],
    },
    measurements: [], // ← Bridge always produces empty measurements
  });
}

// ============================================================================
// TESTS: getCompletionPercentage
// ============================================================================

describe('getCompletionPercentage', () => {
  it('returns 0 for null session', () => {
    expect(getCompletionPercentage(null, 'clinical')).toBe(0);
    expect(getCompletionPercentage(null, 'quick')).toBe(0);
  });

  it('returns 100% for finalized session regardless of step data', () => {
    // This is THE critical bug fix: a finalized bridged session with empty
    // measurements was returning 86% (6/7 steps).  It MUST be 100%.
    const session = createBridgedFinalizedSession();
    expect(session.measurements).toEqual([]); // Confirm measurements are empty
    expect(session.workflow.status).toBe('finalized');
    expect(getCompletionPercentage(session, 'clinical')).toBe(100);
  });

  it('returns 100% for completed session regardless of step data', () => {
    const session = createBridgedFinalizedSession();
    session.workflow.status = 'completed';
    expect(getCompletionPercentage(session, 'clinical')).toBe(100);
  });

  it('returns 100% for finalized session in quick mode', () => {
    const session = createBridgedFinalizedSession();
    expect(getCompletionPercentage(session, 'quick')).toBe(100);
  });

  it('derives percentage from actual step data for in-progress sessions', () => {
    // In-progress session with only patientId filled → should derive from data
    const session = createSession({
      patientInfo: {
        patientId: 'MRN-001',
        name: undefined,
        dateOfBirth: undefined,
        gender: undefined,
        medicalRecordNumber: undefined,
      },
      workflow: {
        mode: 'clinical',
        currentStep: 2,
        completedSteps: [],
        status: 'in-progress',
        startedAt: '2026-01-01T00:00:00Z',
        stepHistory: [],
      },
    });
    // Only PATIENT_INFO is complete (1/7 clinical steps) = ~14%
    expect(getCompletionPercentage(session, 'clinical')).toBe(14);
  });

  it('returns 0% for empty in-progress session', () => {
    const session = createSession();
    expect(getCompletionPercentage(session, 'clinical')).toBe(0);
  });

  it('correctly counts only completed steps for in-progress clinical sessions', () => {
    const session = createSession({
      patientInfo: {
        patientId: 'MRN-001',
        name: 'Test',
        dateOfBirth: undefined,
        gender: undefined,
        medicalRecordNumber: undefined,
      },
      images: [
        {
          imageId: 'img-1',
          fileName: 'test.png',
          fileSize: 1024,
          uploadDate: '2026-01-01',
          analyzed: true,
        },
      ],
      storedAnalysisResults: {
        prediction: 'benign',
        confidence: 0.95,
        probabilities: { benign: 0.95, malignant: 0.05 },
        riskLevel: 'low',
        processingTimeMs: 500,
        modelVersion: 'v1.0',
        analyzedAt: '2026-01-01',
      },
      workflow: {
        mode: 'clinical',
        currentStep: 3,
        completedSteps: [],
        status: 'in-progress',
        startedAt: '2026-01-01T00:00:00Z',
        stepHistory: [],
      },
    });
    // UPLOAD ✓, AI_ANALYSIS ✓, PATIENT_INFO ✓ = 3/7 ≈ 43%
    expect(getCompletionPercentage(session, 'clinical')).toBe(43);
  });
});

// ============================================================================
// TESTS: isStepActuallyCompleted
// ============================================================================

describe('isStepActuallyCompleted', () => {
  it('returns false for null session', () => {
    expect(isStepActuallyCompleted(null, WorkflowStep.UPLOAD)).toBe(false);
  });

  describe('UPLOAD step', () => {
    it('complete when images exist', () => {
      const session = createSession({
        images: [{ imageId: '1', fileName: 'test.png', fileSize: 1024, uploadDate: '2026-01-01' }],
      });
      expect(isStepActuallyCompleted(session, WorkflowStep.UPLOAD)).toBe(true);
    });

    it('incomplete when no images', () => {
      const session = createSession();
      expect(isStepActuallyCompleted(session, WorkflowStep.UPLOAD)).toBe(false);
    });
  });

  describe('PATIENT_INFO step', () => {
    it('complete when patientId has content', () => {
      const session = createSession({
        patientInfo: { patientId: 'MRN-001', name: undefined, dateOfBirth: undefined, gender: undefined, medicalRecordNumber: undefined },
      });
      expect(isStepActuallyCompleted(session, WorkflowStep.PATIENT_INFO)).toBe(true);
    });

    it('incomplete when patientId is empty string', () => {
      const session = createSession({
        patientInfo: { patientId: '', name: undefined, dateOfBirth: undefined, gender: undefined, medicalRecordNumber: undefined },
      });
      expect(isStepActuallyCompleted(session, WorkflowStep.PATIENT_INFO)).toBe(false);
    });

    it('incomplete when patientId is whitespace', () => {
      const session = createSession({
        patientInfo: { patientId: '   ', name: undefined, dateOfBirth: undefined, gender: undefined, medicalRecordNumber: undefined },
      });
      expect(isStepActuallyCompleted(session, WorkflowStep.PATIENT_INFO)).toBe(false);
    });
  });

  describe('MEASUREMENTS step', () => {
    it('complete when measurements exist', () => {
      const session = createSession({
        measurements: [{ id: 'm1' } as any],
      });
      expect(isStepActuallyCompleted(session, WorkflowStep.MEASUREMENTS)).toBe(true);
    });

    it('incomplete when measurements are empty', () => {
      const session = createSession({ measurements: [] });
      expect(isStepActuallyCompleted(session, WorkflowStep.MEASUREMENTS)).toBe(false);
    });
  });

  describe('FINALIZE step', () => {
    it('complete when status is finalized', () => {
      const session = createSession({
        workflow: { mode: 'clinical', currentStep: 6, completedSteps: [], status: 'finalized', startedAt: '', stepHistory: [] },
      });
      expect(isStepActuallyCompleted(session, WorkflowStep.FINALIZE)).toBe(true);
    });

    it('complete when status is completed', () => {
      const session = createSession({
        workflow: { mode: 'clinical', currentStep: 6, completedSteps: [], status: 'completed', startedAt: '', stepHistory: [] },
      });
      expect(isStepActuallyCompleted(session, WorkflowStep.FINALIZE)).toBe(true);
    });

    it('incomplete when status is in-progress', () => {
      const session = createSession({
        workflow: { mode: 'clinical', currentStep: 3, completedSteps: [], status: 'in-progress', startedAt: '', stepHistory: [] },
      });
      expect(isStepActuallyCompleted(session, WorkflowStep.FINALIZE)).toBe(false);
    });
  });
});

// ============================================================================
// TESTS: getCompletedSteps
// ============================================================================

describe('getCompletedSteps', () => {
  it('returns empty array for null session', () => {
    expect(getCompletedSteps(null)).toEqual([]);
  });

  it('returns all steps that have actual data', () => {
    const session = createBridgedFinalizedSession();
    const completed = getCompletedSteps(session);
    // Should include everything EXCEPT MEASUREMENTS (empty array in bridge)
    expect(completed).toContain(WorkflowStep.UPLOAD);
    expect(completed).toContain(WorkflowStep.AI_ANALYSIS);
    expect(completed).toContain(WorkflowStep.PATIENT_INFO);
    expect(completed).toContain(WorkflowStep.ASSESSMENT);
    expect(completed).toContain(WorkflowStep.REPORT);
    expect(completed).toContain(WorkflowStep.FINALIZE);
    // MEASUREMENTS should NOT be in the list (bridge always sets [])
    expect(completed).not.toContain(WorkflowStep.MEASUREMENTS);
    // 6 out of 7 steps have data
    expect(completed).toHaveLength(6);
  });
});

// ============================================================================
// REGRESSION TESTS: Bridge Scenario
// ============================================================================

describe('Bridge scenario — finalized cases', () => {
  it('bridge-produced session with empty measurements returns 100% when finalized', () => {
    // This test documents the exact bug scenario from production:
    // caseSessionBridge always sets measurements: [] and mode: 'clinical'
    // which caused 6/7 = 86% before the fix.
    const session = createBridgedFinalizedSession();
    
    // Verify the problematic shape
    expect(session.workflow.mode).toBe('clinical');
    expect(session.measurements).toEqual([]);
    expect(session.workflow.status).toBe('finalized');
    
    // Before fix: would have returned 86
    // After fix: must return 100
    expect(getCompletionPercentage(session, 'clinical')).toBe(100);
  });

  it('bridge-produced in-progress session still derives from step data', () => {
    const session = createBridgedFinalizedSession();
    session.workflow.status = 'in-progress';
    
    // When in-progress, derives from actual data:
    // UPLOAD ✓, AI_ANALYSIS ✓, PATIENT_INFO ✓, MEASUREMENTS ✗ (empty),
    // ASSESSMENT ✓, REPORT ✓, FINALIZE ✗ (not finalized/completed) = 5/7 ≈ 71%
    expect(getCompletionPercentage(session, 'clinical')).toBe(71);
  });
});
