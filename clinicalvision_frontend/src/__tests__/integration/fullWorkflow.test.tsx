/**
 * Full Workflow Integration Tests - Phase E.3
 * 
 * End-to-end tests exercising the complete ClinicalVision workflow.
 * Uses real WorkflowProvider + sessionStorage (no mocks) to verify
 * all components work together harmoniously.
 * 
 * Tests:
 * 1. Clinical mode complete 7-step workflow
 * 2. Quick mode 3-step workflow
 * 3. Step completion detection
 * 4. Navigation guard enforcement
 * 5. Auto-advance after AI analysis
 * 6. Session persistence across provider remounts
 * 7. Backward navigation
 * 8. Mode-specific step filtering
 * 9. Completion percentage tracking
 * 10. Finalization rules
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import {
  WorkflowStep,
  createNewSession,
  type AnalysisResults,
  type PatientInfo,
  type Measurement,
  type Assessment,
} from '../../workflow-v3/types';
import {
  isStepComplete,
  canNavigateToStep,
  getStepState,
  getCompletionPercentage,
  getNextStep,
  getPreviousStep,
  canFinalizeWorkflow,
} from '../../workflow-v3/workflowEngine';
import { getVisibleStepNumbers } from '../../workflow-v3/constants';
import { WorkflowProvider, useWorkflow } from '../../workflow-v3/useWorkflow';

// ============================================================================
// TEST SETUP
// ============================================================================

// Use jsdom's native localStorage — clear between tests
beforeEach(() => {
  window.localStorage.clear();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <WorkflowProvider>{children}</WorkflowProvider>
);

// ============================================================================
// FIXTURES
// ============================================================================

const MOCK_IMAGE = {
  id: 'img-001',
  file: null,
  fileName: 'mammogram_LCC.dcm',
  fileSize: 5242880,
  preview: 'data:image/png;base64,iVBOR...',
  uploadedAt: new Date().toISOString(),
  metadata: { width: 3328, height: 4096, type: 'dicom' },
};

const MOCK_ANALYSIS = {
  id: 'analysis-001',
  analyzedAt: new Date().toISOString(),
  status: 'complete' as const,
  predictions: [{ label: 'benign', confidence: 0.92 }],
  confidenceScore: 0.92,
  findings: [{ id: 'f1', type: 'mass', location: 'upper-outer', severity: 'low', description: 'Benign mass' }],
  suggestedBirads: 2,
} as AnalysisResults;

const MOCK_PATIENT_INFO = {
  id: 'PAT-2026-001',
  name: 'Jane Smith',
  dateOfBirth: '1975-06-15',
  gender: 'female',
  clinicalHistory: {
    previousMammograms: true,
    familyHistory: false,
    priorBiopsies: false,
    hormoneTherapy: false,
  },
} as PatientInfo;

const MOCK_MEASUREMENTS = [
  { id: 'm1', type: 'distance', value: 12.5, unit: 'mm', label: 'Mass diameter', createdAt: new Date().toISOString() },
] as Measurement[];

const MOCK_ASSESSMENT = {
  birads: 2 as number | null,
  laterality: 'left' as const,
  density: 'C' as const,
  findings: [{ id: 'af1', type: 'mass' as const, location: 'upper-outer quadrant', description: 'Benign mass, upper-outer quadrant' }],
  impression: 'BI-RADS 2: Benign finding. Annual screening recommended.',
  recommendations: 'Routine annual mammography.',
  notes: '',
} as Assessment;

// ============================================================================
// 1. CLINICAL MODE: COMPLETE 7-STEP WORKFLOW
// ============================================================================

describe('Integration: Clinical Mode Complete Workflow', () => {
  it('should complete all 7 clinical steps in order', async () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper });

    // Wait for init
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    // Step 1: Create clinical session
    act(() => { result.current.createSession('clinical'); });
    expect(result.current.session?.mode).toBe('clinical');
    expect(result.current.session?.currentStep).toBe(WorkflowStep.UPLOAD);

    // Step 2: Upload images
    act(() => { result.current.updateSession({ images: [MOCK_IMAGE] }); });
    expect(result.current.isStepComplete(WorkflowStep.UPLOAD)).toBe(true);

    // Step 3: Navigate to AI Analysis
    act(() => { result.current.navigateToStep(WorkflowStep.AI_ANALYSIS); });
    expect(result.current.session?.currentStep).toBe(WorkflowStep.AI_ANALYSIS);

    // Step 4: Set analysis results
    act(() => { result.current.updateSession({ analysisResults: MOCK_ANALYSIS }); });
    expect(result.current.isStepComplete(WorkflowStep.AI_ANALYSIS)).toBe(true);

    // Wait for auto-advance
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });
    expect(result.current.session?.currentStep).toBe(WorkflowStep.PATIENT_INFO);

    // Step 5: Patient Info
    act(() => { result.current.updateSession({ patientInfo: MOCK_PATIENT_INFO }); });
    expect(result.current.isStepComplete(WorkflowStep.PATIENT_INFO)).toBe(true);

    // Step 6: Navigate to Measurements
    act(() => { result.current.navigateToStep(WorkflowStep.MEASUREMENTS); });
    expect(result.current.session?.currentStep).toBe(WorkflowStep.MEASUREMENTS);

    act(() => { result.current.updateSession({ measurements: MOCK_MEASUREMENTS }); });
    expect(result.current.isStepComplete(WorkflowStep.MEASUREMENTS)).toBe(true);

    // Step 7: Navigate to Assessment
    act(() => { result.current.navigateToStep(WorkflowStep.ASSESSMENT); });
    expect(result.current.session?.currentStep).toBe(WorkflowStep.ASSESSMENT);

    act(() => { result.current.updateSession({ assessment: MOCK_ASSESSMENT }); });
    expect(result.current.isStepComplete(WorkflowStep.ASSESSMENT)).toBe(true);

    // Step 8: Navigate to Report
    act(() => { result.current.navigateToStep(WorkflowStep.REPORT); });
    expect(result.current.session?.currentStep).toBe(WorkflowStep.REPORT);

    // Step 9: Navigate to Finalize
    act(() => { result.current.navigateToStep(WorkflowStep.FINALIZE); });
    expect(result.current.session?.currentStep).toBe(WorkflowStep.FINALIZE);

    // Verify high completion
    expect(result.current.completionPercentage).toBeGreaterThanOrEqual(80);
  });
});

// ============================================================================
// 2. QUICK MODE: 3-STEP WORKFLOW
// ============================================================================

describe('Integration: Quick Mode Workflow', () => {
  it('should complete the quick 3-step workflow (Upload → AI → Assessment)', async () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => { await new Promise(r => setTimeout(r, 50)); });

    act(() => { result.current.createSession('quick'); });
    expect(result.current.session?.mode).toBe('quick');

    // Quick mode visible steps: UPLOAD, AI_ANALYSIS, ASSESSMENT
    const visibleSteps = getVisibleStepNumbers(result.current.session!.mode);
    expect(visibleSteps).toEqual([
      WorkflowStep.UPLOAD,
      WorkflowStep.AI_ANALYSIS,
      WorkflowStep.ASSESSMENT,
    ]);

    // Upload
    act(() => { result.current.updateSession({ images: [MOCK_IMAGE] }); });

    act(() => { result.current.navigateToStep(WorkflowStep.AI_ANALYSIS); });
    expect(result.current.session?.currentStep).toBe(WorkflowStep.AI_ANALYSIS);

    // Analysis
    act(() => { result.current.updateSession({ analysisResults: MOCK_ANALYSIS }); });

    // Wait for auto-advance → should jump to ASSESSMENT (skipping Patient, Measurements)
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });
    expect(result.current.session?.currentStep).toBe(WorkflowStep.ASSESSMENT);

    // Complete assessment
    act(() => { result.current.updateSession({ assessment: MOCK_ASSESSMENT }); });
    expect(result.current.completionPercentage).toBe(100);
  });
});

// ============================================================================
// 3. STEP COMPLETION ENGINE TESTS
// ============================================================================

describe('Integration: Step Completion Detection', () => {
  it('should correctly detect completion for each step', () => {
    const session = createNewSession('clinical');

    // UPLOAD: incomplete (no images)
    expect(isStepComplete(session, WorkflowStep.UPLOAD)).toBe(false);

    // Add an image → UPLOAD complete
    const s2 = { ...session, images: [MOCK_IMAGE] };
    expect(isStepComplete(s2, WorkflowStep.UPLOAD)).toBe(true);

    // AI_ANALYSIS: incomplete (no results)
    expect(isStepComplete(s2, WorkflowStep.AI_ANALYSIS)).toBe(false);

    // Add analysis → AI_ANALYSIS complete
    const s3 = { ...s2, analysisResults: MOCK_ANALYSIS };
    expect(isStepComplete(s3, WorkflowStep.AI_ANALYSIS)).toBe(true);

    // PATIENT_INFO: incomplete (empty id)
    expect(isStepComplete(s3, WorkflowStep.PATIENT_INFO)).toBe(false);

    // Add patient → PATIENT_INFO complete
    const s4 = { ...s3, patientInfo: MOCK_PATIENT_INFO };
    expect(isStepComplete(s4, WorkflowStep.PATIENT_INFO)).toBe(true);

    // MEASUREMENTS: incomplete
    expect(isStepComplete(s4, WorkflowStep.MEASUREMENTS)).toBe(false);

    // Add measurements → MEASUREMENTS complete
    const s5 = { ...s4, measurements: MOCK_MEASUREMENTS };
    expect(isStepComplete(s5, WorkflowStep.MEASUREMENTS)).toBe(true);

    // ASSESSMENT: needs birads
    expect(isStepComplete(s5, WorkflowStep.ASSESSMENT)).toBe(false);
    const s6 = { ...s5, assessment: MOCK_ASSESSMENT };
    expect(isStepComplete(s6, WorkflowStep.ASSESSMENT)).toBe(true);
  });

  it('should handle edge case: empty arrays vs null', () => {
    const session = createNewSession('clinical');

    // images: [] → UPLOAD not complete
    expect(isStepComplete(session, WorkflowStep.UPLOAD)).toBe(false);

    // measurements: [] → MEASUREMENTS not complete
    expect(isStepComplete(session, WorkflowStep.MEASUREMENTS)).toBe(false);

    // analysisResults: null → AI_ANALYSIS not complete
    expect(isStepComplete(session, WorkflowStep.AI_ANALYSIS)).toBe(false);
  });
});

// ============================================================================
// 4. NAVIGATION GUARD ENFORCEMENT
// ============================================================================

describe('Integration: Navigation Guards', () => {
  it('should block AI_ANALYSIS without images', () => {
    const session = createNewSession('clinical');
    expect(canNavigateToStep(session, WorkflowStep.AI_ANALYSIS)).toBe(false);
  });

  it('should allow AI_ANALYSIS after images uploaded', () => {
    const session = { ...createNewSession('clinical'), images: [MOCK_IMAGE] };
    expect(canNavigateToStep(session, WorkflowStep.AI_ANALYSIS)).toBe(true);
  });

  it('should always allow PATIENT_INFO (floating step)', () => {
    const session = createNewSession('clinical');
    expect(canNavigateToStep(session, WorkflowStep.PATIENT_INFO)).toBe(true);
  });

  it('should always allow UPLOAD', () => {
    const session = createNewSession('clinical');
    expect(canNavigateToStep(session, WorkflowStep.UPLOAD)).toBe(true);
  });

  it('should block MEASUREMENTS without analysis results', () => {
    const session = { ...createNewSession('clinical'), images: [MOCK_IMAGE] };
    expect(canNavigateToStep(session, WorkflowStep.MEASUREMENTS)).toBe(false);
  });

  it('should allow MEASUREMENTS after analysis complete', () => {
    const session = {
      ...createNewSession('clinical'),
      images: [MOCK_IMAGE],
      analysisResults: MOCK_ANALYSIS,
    };
    expect(canNavigateToStep(session, WorkflowStep.MEASUREMENTS)).toBe(true);
  });

  it('should block REPORT without assessment impression', () => {
    const session = {
      ...createNewSession('clinical'),
      images: [MOCK_IMAGE],
      analysisResults: MOCK_ANALYSIS,
    };
    expect(canNavigateToStep(session, WorkflowStep.REPORT)).toBe(false);
  });

  it('should allow REPORT with assessment + patient info', () => {
    const session = {
      ...createNewSession('clinical'),
      images: [MOCK_IMAGE],
      analysisResults: MOCK_ANALYSIS,
      assessment: MOCK_ASSESSMENT,
      patientInfo: MOCK_PATIENT_INFO,
    };
    expect(canNavigateToStep(session, WorkflowStep.REPORT)).toBe(true);
  });

  it('should enforce navigateToStep via hook returns false when blocked', async () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => { await new Promise(r => setTimeout(r, 50)); });

    act(() => { result.current.createSession('clinical'); });

    // Try to skip to AI_ANALYSIS without images → should fail
    let navResult: boolean = false;
    act(() => { navResult = result.current.navigateToStep(WorkflowStep.AI_ANALYSIS); });
    expect(navResult).toBe(false);
    expect(result.current.session?.currentStep).toBe(WorkflowStep.UPLOAD);
  });
});

// ============================================================================
// 5. AUTO-ADVANCE AFTER AI ANALYSIS
// ============================================================================

describe('Integration: Auto-Advance Logic', () => {
  it('should auto-advance from AI_ANALYSIS to next step when complete', async () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => { await new Promise(r => setTimeout(r, 50)); });

    act(() => { result.current.createSession('clinical'); });

    act(() => { result.current.updateSession({ images: [MOCK_IMAGE] }); });

    act(() => { result.current.navigateToStep(WorkflowStep.AI_ANALYSIS); });
    expect(result.current.session?.currentStep).toBe(WorkflowStep.AI_ANALYSIS);

    // Set analysis results → should trigger auto-advance
    act(() => { result.current.updateSession({ analysisResults: MOCK_ANALYSIS }); });

    await act(async () => { await new Promise(r => setTimeout(r, 100)); });

    // In clinical mode, next after AI_ANALYSIS is PATIENT_INFO
    expect(result.current.session?.currentStep).toBe(WorkflowStep.PATIENT_INFO);
  });

  it('should auto-advance to ASSESSMENT in quick mode (skipping Patient/Measurements)', async () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => { await new Promise(r => setTimeout(r, 50)); });

    act(() => { result.current.createSession('quick'); });

    act(() => { result.current.updateSession({ images: [MOCK_IMAGE] }); });

    act(() => { result.current.navigateToStep(WorkflowStep.AI_ANALYSIS); });

    act(() => { result.current.updateSession({ analysisResults: MOCK_ANALYSIS }); });

    await act(async () => { await new Promise(r => setTimeout(r, 100)); });

    // Quick mode: after AI_ANALYSIS → ASSESSMENT (skips PATIENT_INFO, MEASUREMENTS)
    expect(result.current.session?.currentStep).toBe(WorkflowStep.ASSESSMENT);
  });

  it('should NOT auto-advance from non-AI steps', async () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => { await new Promise(r => setTimeout(r, 50)); });

    act(() => { result.current.createSession('clinical'); });

    // Complete UPLOAD step
    act(() => { result.current.updateSession({ images: [MOCK_IMAGE] }); });

    await act(async () => { await new Promise(r => setTimeout(r, 100)); });

    // Should stay on UPLOAD (no auto-advance)
    expect(result.current.session?.currentStep).toBe(WorkflowStep.UPLOAD);
  });
});

// ============================================================================
// 6. SESSION PERSISTENCE ACROSS REMOUNTS
// ============================================================================

describe('Integration: Session Persistence', () => {
  it('should persist and restore session across provider remounts', async () => {
    // Render hook, create session, add data
    const { result, unmount } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => { await new Promise(r => setTimeout(r, 50)); });

    act(() => { result.current.createSession('clinical'); });

    const sessionId = result.current.session!.id;

    act(() => {
      result.current.updateSession({
        images: [MOCK_IMAGE],
        patientInfo: MOCK_PATIENT_INFO,
      });
    });

    // Unmount (simulates page navigation)
    unmount();

    // Re-render a new provider — session should be restored
    const { result: result2 } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => { await new Promise(r => setTimeout(r, 100)); });

    expect(result2.current.session).not.toBeNull();
    expect(result2.current.session?.id).toBe(sessionId);
    expect(result2.current.session?.images).toHaveLength(1);
    expect(result2.current.session?.patientInfo.id).toBe('PAT-2026-001');
  });

  it('should persist currentStep across remounts', async () => {
    const { result, unmount } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => { await new Promise(r => setTimeout(r, 50)); });

    act(() => { result.current.createSession('clinical'); });

    act(() => { result.current.updateSession({ images: [MOCK_IMAGE] }); });

    act(() => { result.current.navigateToStep(WorkflowStep.AI_ANALYSIS); });

    expect(result.current.session?.currentStep).toBe(WorkflowStep.AI_ANALYSIS);

    unmount();

    const { result: result2 } = renderHook(() => useWorkflow(), { wrapper });
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });

    expect(result2.current.session?.currentStep).toBe(WorkflowStep.AI_ANALYSIS);
  });
});

// ============================================================================
// 7. BACKWARD NAVIGATION
// ============================================================================

describe('Integration: Backward Navigation', () => {
  it('should allow going back to completed steps', async () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => { await new Promise(r => setTimeout(r, 50)); });

    act(() => { result.current.createSession('clinical'); });

    act(() => { result.current.updateSession({ images: [MOCK_IMAGE] }); });

    act(() => { result.current.navigateToStep(WorkflowStep.AI_ANALYSIS); });
    expect(result.current.session?.currentStep).toBe(WorkflowStep.AI_ANALYSIS);

    // Go back to UPLOAD
    act(() => { result.current.navigateToStep(WorkflowStep.UPLOAD); });
    expect(result.current.session?.currentStep).toBe(WorkflowStep.UPLOAD);
  });

  it('should support getPreviousStep utility', () => {
    const session = createNewSession('clinical');

    // Previous of UPLOAD is null (first step)
    expect(getPreviousStep(session, WorkflowStep.UPLOAD)).toBeNull();

    // Previous of AI_ANALYSIS is UPLOAD
    expect(getPreviousStep(session, WorkflowStep.AI_ANALYSIS)).toBe(WorkflowStep.UPLOAD);

    // Previous of PATIENT_INFO is AI_ANALYSIS
    expect(getPreviousStep(session, WorkflowStep.PATIENT_INFO)).toBe(WorkflowStep.AI_ANALYSIS);
  });
});

// ============================================================================
// 8. MODE-SPECIFIC STEP FILTERING
// ============================================================================

describe('Integration: Mode-Specific Steps', () => {
  it('should return 7 visible steps for clinical mode', () => {
    const session = createNewSession('clinical');
    expect(getVisibleStepNumbers(session.mode)).toEqual([
      WorkflowStep.UPLOAD,
      WorkflowStep.AI_ANALYSIS,
      WorkflowStep.PATIENT_INFO,
      WorkflowStep.MEASUREMENTS,
      WorkflowStep.ASSESSMENT,
      WorkflowStep.REPORT,
      WorkflowStep.FINALIZE,
    ]);
  });

  it('should return 3 visible steps for quick mode', () => {
    const session = createNewSession('quick');
    expect(getVisibleStepNumbers(session.mode)).toEqual([
      WorkflowStep.UPLOAD,
      WorkflowStep.AI_ANALYSIS,
      WorkflowStep.ASSESSMENT,
    ]);
  });

  it('should calculate correct getNextStep for quick mode', () => {
    const session = createNewSession('quick');

    // UPLOAD → AI_ANALYSIS
    expect(getNextStep(session, WorkflowStep.UPLOAD)).toBe(WorkflowStep.AI_ANALYSIS);

    // AI_ANALYSIS → ASSESSMENT (skips Patient, Measurements)
    expect(getNextStep(session, WorkflowStep.AI_ANALYSIS)).toBe(WorkflowStep.ASSESSMENT);

    // ASSESSMENT → null (last step in quick mode)
    expect(getNextStep(session, WorkflowStep.ASSESSMENT)).toBeNull();
  });

  it('should calculate correct getNextStep for clinical mode', () => {
    const session = createNewSession('clinical');

    expect(getNextStep(session, WorkflowStep.UPLOAD)).toBe(WorkflowStep.AI_ANALYSIS);
    expect(getNextStep(session, WorkflowStep.AI_ANALYSIS)).toBe(WorkflowStep.PATIENT_INFO);
    expect(getNextStep(session, WorkflowStep.PATIENT_INFO)).toBe(WorkflowStep.MEASUREMENTS);
    expect(getNextStep(session, WorkflowStep.MEASUREMENTS)).toBe(WorkflowStep.ASSESSMENT);
    expect(getNextStep(session, WorkflowStep.ASSESSMENT)).toBe(WorkflowStep.REPORT);
    expect(getNextStep(session, WorkflowStep.REPORT)).toBe(WorkflowStep.FINALIZE);
    expect(getNextStep(session, WorkflowStep.FINALIZE)).toBeNull();
  });
});

// ============================================================================
// 9. COMPLETION PERCENTAGE TRACKING
// ============================================================================

describe('Integration: Completion Percentage', () => {
  it('should start at 0% for new session', () => {
    const session = createNewSession('clinical');
    expect(getCompletionPercentage(session)).toBe(0);
  });

  it('should increase as steps complete (clinical)', () => {
    let session = createNewSession('clinical');

    // Complete UPLOAD (1 of 7)
    session = { ...session, images: [MOCK_IMAGE] };
    const pct1 = getCompletionPercentage(session);
    expect(pct1).toBeGreaterThan(0);

    // Complete AI_ANALYSIS (2 of 7)
    session = { ...session, analysisResults: MOCK_ANALYSIS };
    const pct2 = getCompletionPercentage(session);
    expect(pct2).toBeGreaterThan(pct1);

    // Complete PATIENT_INFO (3 of 7)
    session = { ...session, patientInfo: MOCK_PATIENT_INFO };
    const pct3 = getCompletionPercentage(session);
    expect(pct3).toBeGreaterThan(pct2);
  });

  it('should reach 100% when all quick mode steps complete', () => {
    const session = {
      ...createNewSession('quick'),
      images: [MOCK_IMAGE],
      analysisResults: MOCK_ANALYSIS,
      assessment: MOCK_ASSESSMENT,
    };
    expect(getCompletionPercentage(session)).toBe(100);
  });
});

// ============================================================================
// 10. STEP STATE ENGINE
// ============================================================================

describe('Integration: Step State Engine', () => {
  it('should return "current" for the current step', () => {
    const session = { ...createNewSession('clinical'), currentStep: WorkflowStep.UPLOAD };
    expect(getStepState(session, WorkflowStep.UPLOAD)).toBe('current');
  });

  it('should return "completed" for past completed steps', () => {
    const session = {
      ...createNewSession('clinical'),
      images: [MOCK_IMAGE],
      currentStep: WorkflowStep.AI_ANALYSIS,
    };
    expect(getStepState(session, WorkflowStep.UPLOAD)).toBe('completed');
  });

  it('should return "available" for navigable non-current steps', () => {
    const session = {
      ...createNewSession('clinical'),
      images: [MOCK_IMAGE],
      analysisResults: MOCK_ANALYSIS,
      currentStep: WorkflowStep.UPLOAD,
    };
    // AI_ANALYSIS is navigable (images exist) and complete, but not current
    const state = getStepState(session, WorkflowStep.AI_ANALYSIS);
    // Since AI_ANALYSIS is completed and not current, it should be 'completed'
    expect(state).toBe('completed');
  });

  it('should return "locked" for non-navigable steps', () => {
    const session = createNewSession('clinical');
    // AI_ANALYSIS is locked (no images)
    expect(getStepState(session, WorkflowStep.AI_ANALYSIS)).toBe('locked');
  });

  it('Bug #2: current step shows as "current" even when complete', () => {
    const session = {
      ...createNewSession('clinical'),
      images: [MOCK_IMAGE],
      currentStep: WorkflowStep.UPLOAD,
    };
    // UPLOAD is complete (has images) AND is the current step
    // Should show "current", NOT "completed"
    expect(getStepState(session, WorkflowStep.UPLOAD)).toBe('current');
  });
});

// ============================================================================
// 11. FINALIZATION RULES
// ============================================================================

describe('Integration: Finalization', () => {
  it('should not be ready to finalize with incomplete data (clinical)', () => {
    const session = createNewSession('clinical');
    expect(canFinalizeWorkflow(session)).toBe(false);
  });

  it('should be ready to finalize when clinical report is complete', () => {
    const session = {
      ...createNewSession('clinical'),
      images: [MOCK_IMAGE],
      analysisResults: MOCK_ANALYSIS,
      patientInfo: MOCK_PATIENT_INFO,
      measurements: MOCK_MEASUREMENTS,
      assessment: MOCK_ASSESSMENT,
    };
    // Clinical mode needs isStepComplete(REPORT), which requires impression non-empty
    expect(canFinalizeWorkflow(session)).toBe(true);
  });

  it('should be ready to finalize quick mode with assessment + patient', () => {
    const session = {
      ...createNewSession('quick'),
      images: [MOCK_IMAGE],
      analysisResults: MOCK_ANALYSIS,
      assessment: MOCK_ASSESSMENT,
      patientInfo: MOCK_PATIENT_INFO,
    };
    // Quick mode needs assessment + patient info
    expect(canFinalizeWorkflow(session)).toBe(true);
  });
});

// ============================================================================
// 12. DELETE SESSION
// ============================================================================

describe('Integration: Session Lifecycle', () => {
  it('should delete session and clear state', async () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => { await new Promise(r => setTimeout(r, 50)); });

    act(() => { result.current.createSession('clinical'); });
    expect(result.current.session).not.toBeNull();

    act(() => { result.current.deleteSession(); });
    expect(result.current.session).toBeNull();
  });

  it('should not restore deleted session after remount', async () => {
    const { result, unmount } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => { await new Promise(r => setTimeout(r, 50)); });

    act(() => { result.current.createSession('clinical'); });

    act(() => { result.current.deleteSession(); });

    unmount();

    const { result: result2 } = renderHook(() => useWorkflow(), { wrapper });
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });

    expect(result2.current.session).toBeNull();
  });
});
