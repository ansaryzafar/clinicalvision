/**
 * Integration Tests - Complete Workflow Scenarios
 * 
 * These tests simulate real user workflows from start to finish.
 * They verify that all components work together correctly.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { WorkflowStep, createNewSession, WorkflowSession } from '../types';
import { sessionStorage } from '../sessionStorage';
import {
  isStepComplete,
  canNavigateToStep,
  getStepState,
  getCompletionPercentage,
} from '../workflowEngine';
import { WorkflowProvider, useWorkflow } from '../useWorkflow';
import { WorkflowStepper } from '../WorkflowStepper';

// ============================================================================
// TEST SETUP
// ============================================================================

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Test component that exposes workflow actions
function TestWorkflowApp({ onReady }: { onReady?: (hook: ReturnType<typeof useWorkflow>) => void }) {
  const workflow = useWorkflow();
  
  React.useEffect(() => {
    if (onReady) {
      onReady(workflow);
    }
  }, [workflow, onReady]);
  
  return (
    <div>
      <WorkflowStepper />
      {workflow.session && (
        <div data-testid="session-info">
          <span data-testid="current-step">{workflow.session.currentStep}</span>
          <span data-testid="mode">{workflow.session.mode}</span>
          <span data-testid="completion">{workflow.completionPercentage}%</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// INTEGRATION TEST: Complete Clinical Workflow
// ============================================================================

describe('Integration: Complete Clinical Workflow', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should complete a full clinical workflow from start to finish', async () => {
    let workflowHook: ReturnType<typeof useWorkflow>;
    
    render(
      <WorkflowProvider>
        <TestWorkflowApp onReady={(hook) => { workflowHook = hook; }} />
      </WorkflowProvider>
    );
    
    // Wait for initialization
    await waitFor(() => {
      expect(workflowHook).toBeDefined();
    });
    
    // Step 1: Create session
    act(() => {
      workflowHook.createSession('clinical');
    });
    
    expect(workflowHook.session).not.toBeNull();
    expect(workflowHook.session?.mode).toBe('clinical');
    expect(workflowHook.session?.currentStep).toBe(WorkflowStep.UPLOAD);
    
    // Verify initial state
    expect(workflowHook.getStepState(WorkflowStep.UPLOAD)).toBe('current');
    expect(workflowHook.getStepState(WorkflowStep.AI_ANALYSIS)).toBe('locked');
    expect(workflowHook.canNavigateToStep(WorkflowStep.AI_ANALYSIS)).toBe(false);
    
    // Step 2: Upload images
    act(() => {
      workflowHook.updateSession({
        images: [{
          id: 'img-1',
          file: null,
          fileName: 'mammogram.dcm',
          fileSize: 2048000,
          preview: 'data:image/png;base64,...',
          uploadedAt: new Date().toISOString(),
          metadata: { width: 3000, height: 3000, type: 'dicom', view: 'CC', laterality: 'left' },
        }],
      });
    });
    
    // UPLOAD should be complete, but still current (BUG #2 FIX VERIFICATION)
    expect(workflowHook.isStepComplete(WorkflowStep.UPLOAD)).toBe(true);
    expect(workflowHook.getStepState(WorkflowStep.UPLOAD)).toBe('current');
    
    // AI_ANALYSIS should now be available
    expect(workflowHook.canNavigateToStep(WorkflowStep.AI_ANALYSIS)).toBe(true);
    expect(workflowHook.getStepState(WorkflowStep.AI_ANALYSIS)).toBe('available');
    
    // Step 3: Navigate to AI Analysis
    act(() => {
      workflowHook.navigateToStep(WorkflowStep.AI_ANALYSIS);
    });
    
    expect(workflowHook.session?.currentStep).toBe(WorkflowStep.AI_ANALYSIS);
    expect(workflowHook.getStepState(WorkflowStep.UPLOAD)).toBe('completed');
    expect(workflowHook.getStepState(WorkflowStep.AI_ANALYSIS)).toBe('current');
    
    // Step 4: Complete AI Analysis
    act(() => {
      workflowHook.updateSession({
        analysisResults: {
          id: 'analysis-1',
          analyzedAt: new Date().toISOString(),
          status: 'complete',
          predictions: [{ label: 'benign', confidence: 0.92 }],
          confidenceScore: 0.92,
          findings: [{ id: 'f1', type: 'mass', location: 'UOQ', severity: 'low', description: 'Small benign mass' }],
          suggestedBirads: 2,
        },
      });
    });
    
    // Should auto-advance to next step (PATIENT_INFO in clinical mode)
    await waitFor(() => {
      expect(workflowHook.session?.currentStep).toBe(WorkflowStep.PATIENT_INFO);
    });
    
    // Step 5: Enter Patient Info
    act(() => {
      workflowHook.updateSession({
        patientInfo: {
          id: 'P-2024-001',
          name: 'Jane Doe',
          dateOfBirth: '1975-03-15',
          gender: 'female',
          clinicalHistory: {
            previousMammograms: true,
            familyHistory: false,
            priorBiopsies: false,
            hormoneTherapy: false,
          },
        },
      });
    });
    
    expect(workflowHook.isStepComplete(WorkflowStep.PATIENT_INFO)).toBe(true);
    
    // Step 6: Navigate to Measurements
    act(() => {
      workflowHook.navigateToStep(WorkflowStep.MEASUREMENTS);
    });
    
    expect(workflowHook.session?.currentStep).toBe(WorkflowStep.MEASUREMENTS);
    
    // Add a measurement
    act(() => {
      workflowHook.updateSession({
        measurements: [{
          id: 'm1',
          type: 'distance',
          label: 'Mass diameter',
          value: 8.5,
          unit: 'mm',
          createdAt: new Date().toISOString(),
          coordinates: { startX: 100, startY: 100, endX: 150, endY: 100 },
        }],
      });
    });
    
    expect(workflowHook.isStepComplete(WorkflowStep.MEASUREMENTS)).toBe(true);
    
    // Step 7: Navigate to Assessment
    act(() => {
      workflowHook.navigateToStep(WorkflowStep.ASSESSMENT);
    });
    
    expect(workflowHook.session?.currentStep).toBe(WorkflowStep.ASSESSMENT);
    
    // Complete assessment
    act(() => {
      workflowHook.updateSession({
        assessment: {
          birads: 2,
          laterality: 'left',
          density: 'B',
          findings: [{
            id: 'af1',
            type: 'mass',
            location: 'Upper outer quadrant',
            description: 'Well-circumscribed benign mass',
            birads: 2,
          }],
          impression: '',
          recommendations: 'Routine screening in 1 year',
          notes: '',
        },
      });
    });
    
    expect(workflowHook.isStepComplete(WorkflowStep.ASSESSMENT)).toBe(true);
    
    // Step 8: Navigate to Report
    act(() => {
      workflowHook.navigateToStep(WorkflowStep.REPORT);
    });
    
    expect(workflowHook.session?.currentStep).toBe(WorkflowStep.REPORT);
    
    // Complete report
    act(() => {
      workflowHook.updateSession({
        assessment: {
          ...workflowHook.session!.assessment,
          impression: 'BI-RADS 2: Benign finding. Well-circumscribed mass in the upper outer quadrant of the left breast, likely a fibroadenoma. Recommend routine screening mammography in 1 year.',
        },
      });
    });
    
    expect(workflowHook.isStepComplete(WorkflowStep.REPORT)).toBe(true);
    
    // Step 9: Navigate to Finalize
    act(() => {
      workflowHook.navigateToStep(WorkflowStep.FINALIZE);
    });
    
    expect(workflowHook.session?.currentStep).toBe(WorkflowStep.FINALIZE);
    
    // Finalize the workflow
    act(() => {
      workflowHook.updateSession({ status: 'completed' });
    });
    
    expect(workflowHook.isStepComplete(WorkflowStep.FINALIZE)).toBe(true);
    expect(workflowHook.completionPercentage).toBe(100);
    
    // Verify all steps are complete
    expect(workflowHook.getStepState(WorkflowStep.UPLOAD)).toBe('completed');
    expect(workflowHook.getStepState(WorkflowStep.AI_ANALYSIS)).toBe('completed');
    expect(workflowHook.getStepState(WorkflowStep.PATIENT_INFO)).toBe('completed');
    expect(workflowHook.getStepState(WorkflowStep.MEASUREMENTS)).toBe('completed');
    expect(workflowHook.getStepState(WorkflowStep.ASSESSMENT)).toBe('completed');
    expect(workflowHook.getStepState(WorkflowStep.REPORT)).toBe('completed');
    expect(workflowHook.getStepState(WorkflowStep.FINALIZE)).toBe('current');
  });
});

// ============================================================================
// INTEGRATION TEST: Session Persistence
// ============================================================================

describe('Integration: Session Persistence', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should persist session data across "page reloads"', async () => {
    // First "session" - create and modify
    const session1 = createNewSession('clinical');
    session1.images = [{
      id: 'img-1',
      file: null,
      fileName: 'test.dcm',
      fileSize: 1024,
      preview: '',
      uploadedAt: new Date().toISOString(),
      metadata: { width: 100, height: 100, type: 'dicom' },
    }];
    session1.patientInfo.id = 'PERSIST-TEST-123';
    session1.currentStep = WorkflowStep.AI_ANALYSIS;
    
    // Save to storage
    sessionStorage.saveSession(session1);
    sessionStorage.setCurrentSessionId(session1.id);
    
    // "Reload" - retrieve from storage
    const retrievedId = sessionStorage.getCurrentSessionId();
    const retrievedSession = sessionStorage.getSession(retrievedId!);
    
    // Verify all data persisted
    expect(retrievedSession).not.toBeNull();
    expect(retrievedSession?.images.length).toBe(1);
    expect(retrievedSession?.patientInfo.id).toBe('PERSIST-TEST-123');
    expect(retrievedSession?.currentStep).toBe(WorkflowStep.AI_ANALYSIS);
  });

  it('should immediately persist every update (Bug #1 fix)', async () => {
    let workflowHook: ReturnType<typeof useWorkflow>;
    
    render(
      <WorkflowProvider>
        <TestWorkflowApp onReady={(hook) => { workflowHook = hook; }} />
      </WorkflowProvider>
    );
    
    await waitFor(() => expect(workflowHook).toBeDefined());
    
    // Create session
    act(() => {
      workflowHook.createSession('clinical');
    });
    
    const sessionId = workflowHook.session!.id;
    
    // Update session
    act(() => {
      workflowHook.updateSession({
        patientInfo: { ...workflowHook.session!.patientInfo, id: 'IMMEDIATE-PERSIST' },
      });
    });
    
    // IMMEDIATELY check localStorage (no waiting for auto-save)
    const savedSession = sessionStorage.getSession(sessionId);
    expect(savedSession?.patientInfo.id).toBe('IMMEDIATE-PERSIST');
  });
});

// ============================================================================
// INTEGRATION TEST: Quick Mode Workflow
// ============================================================================

describe('Integration: Quick Mode Workflow', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should complete quick mode workflow with only 3 steps', async () => {
    let workflowHook: ReturnType<typeof useWorkflow>;
    
    render(
      <WorkflowProvider>
        <TestWorkflowApp onReady={(hook) => { workflowHook = hook; }} />
      </WorkflowProvider>
    );
    
    await waitFor(() => expect(workflowHook).toBeDefined());
    
    // Create quick mode session
    act(() => {
      workflowHook.createSession('quick');
    });
    
    expect(workflowHook.session?.mode).toBe('quick');
    
    // Complete Upload
    act(() => {
      workflowHook.updateSession({
        images: [{
          id: 'img-1',
          file: null,
          fileName: 'quick.dcm',
          fileSize: 1024,
          preview: '',
          uploadedAt: new Date().toISOString(),
          metadata: { width: 100, height: 100, type: 'dicom' },
        }],
      });
    });
    
    act(() => {
      workflowHook.navigateToStep(WorkflowStep.AI_ANALYSIS);
    });
    
    // Complete AI Analysis
    act(() => {
      workflowHook.updateSession({
        analysisResults: {
          id: 'a1',
          analyzedAt: new Date().toISOString(),
          status: 'complete',
          predictions: [],
          confidenceScore: 0.9,
          findings: [],
          suggestedBirads: 1,
        },
      });
    });
    
    // Should auto-advance to Assessment (skipping Patient, Measurements)
    await waitFor(() => {
      expect(workflowHook.session?.currentStep).toBe(WorkflowStep.ASSESSMENT);
    });
    
    // Complete Assessment
    act(() => {
      workflowHook.updateSession({
        assessment: {
          ...workflowHook.session!.assessment,
          birads: 1,
        },
      });
    });
    
    // In quick mode, 3 steps complete should be 100%
    expect(workflowHook.completionPercentage).toBe(100);
  });
});

// ============================================================================
// INTEGRATION TEST: Navigation Validation
// ============================================================================

describe('Integration: Navigation Rules', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should enforce step prerequisites', async () => {
    let workflowHook: ReturnType<typeof useWorkflow>;
    
    render(
      <WorkflowProvider>
        <TestWorkflowApp onReady={(hook) => { workflowHook = hook; }} />
      </WorkflowProvider>
    );
    
    await waitFor(() => expect(workflowHook).toBeDefined());
    
    act(() => {
      workflowHook.createSession('clinical');
    });
    
    // Try to navigate to AI_ANALYSIS without images
    let result: boolean;
    act(() => {
      result = workflowHook.navigateToStep(WorkflowStep.AI_ANALYSIS);
    });
    
    expect(result!).toBe(false);
    expect(workflowHook.session?.currentStep).toBe(WorkflowStep.UPLOAD);
    
    // Add image and try again
    act(() => {
      workflowHook.updateSession({
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
    });
    
    act(() => {
      result = workflowHook.navigateToStep(WorkflowStep.AI_ANALYSIS);
    });
    
    expect(result!).toBe(true);
    expect(workflowHook.session?.currentStep).toBe(WorkflowStep.AI_ANALYSIS);
  });

  it('should allow Patient Info at any time (floating step)', async () => {
    let workflowHook: ReturnType<typeof useWorkflow>;
    
    render(
      <WorkflowProvider>
        <TestWorkflowApp onReady={(hook) => { workflowHook = hook; }} />
      </WorkflowProvider>
    );
    
    await waitFor(() => expect(workflowHook).toBeDefined());
    
    act(() => {
      workflowHook.createSession('clinical');
    });
    
    // Should be able to navigate to Patient Info immediately
    expect(workflowHook.canNavigateToStep(WorkflowStep.PATIENT_INFO)).toBe(true);
    
    let result: boolean;
    act(() => {
      result = workflowHook.navigateToStep(WorkflowStep.PATIENT_INFO);
    });
    
    expect(result!).toBe(true);
    expect(workflowHook.session?.currentStep).toBe(WorkflowStep.PATIENT_INFO);
  });
});

// ============================================================================
// INTEGRATION TEST: Bug Regression Tests
// ============================================================================

describe('Integration: Bug Regression Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('Bug #1: updateSession must save to localStorage immediately', async () => {
    let workflowHook: ReturnType<typeof useWorkflow>;
    
    render(
      <WorkflowProvider>
        <TestWorkflowApp onReady={(hook) => { workflowHook = hook; }} />
      </WorkflowProvider>
    );
    
    await waitFor(() => expect(workflowHook).toBeDefined());
    
    act(() => {
      workflowHook.createSession('clinical');
    });
    
    // Update rapidly
    act(() => {
      workflowHook.updateSession({ patientInfo: { ...workflowHook.session!.patientInfo, id: 'A' } });
    });
    act(() => {
      workflowHook.updateSession({ patientInfo: { ...workflowHook.session!.patientInfo, id: 'B' } });
    });
    act(() => {
      workflowHook.updateSession({ patientInfo: { ...workflowHook.session!.patientInfo, id: 'C' } });
    });
    
    // Final value should be in localStorage immediately
    const saved = sessionStorage.getSession(workflowHook.session!.id);
    expect(saved?.patientInfo.id).toBe('C');
  });

  it('Bug #2: current step shows as current even when complete', () => {
    const session = createNewSession('clinical');
    session.currentStep = WorkflowStep.UPLOAD;
    session.images = [{
      id: 'img-1',
      file: null,
      fileName: 'test.dcm',
      fileSize: 1024,
      preview: '',
      uploadedAt: new Date().toISOString(),
      metadata: { width: 100, height: 100, type: 'dicom' },
    }];
    
    // UPLOAD is complete AND current
    expect(isStepComplete(session, WorkflowStep.UPLOAD)).toBe(true);
    
    // Should show as 'current', NOT 'completed'
    expect(getStepState(session, WorkflowStep.UPLOAD)).toBe('current');
  });

  it('Bug #3: currentStep advances after AI analysis', async () => {
    let workflowHook: ReturnType<typeof useWorkflow>;
    
    render(
      <WorkflowProvider>
        <TestWorkflowApp onReady={(hook) => { workflowHook = hook; }} />
      </WorkflowProvider>
    );
    
    await waitFor(() => expect(workflowHook).toBeDefined());
    
    act(() => {
      workflowHook.createSession('clinical');
    });
    
    act(() => {
      workflowHook.updateSession({
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
    });
    
    act(() => {
      workflowHook.navigateToStep(WorkflowStep.AI_ANALYSIS);
    });
    
    expect(workflowHook.session?.currentStep).toBe(WorkflowStep.AI_ANALYSIS);
    
    // Complete analysis
    act(() => {
      workflowHook.updateSession({
        analysisResults: {
          id: 'a1',
          analyzedAt: new Date().toISOString(),
          status: 'complete',
          predictions: [],
          confidenceScore: 0.9,
          findings: [],
        },
      });
    });
    
    // Should auto-advance
    await waitFor(() => {
      expect(workflowHook.session?.currentStep).not.toBe(WorkflowStep.AI_ANALYSIS);
    });
  });

  it('Bug #4: mode is explicitly set, not from localStorage', async () => {
    // Pre-set clinical mode in "old" storage
    localStorageMock.setItem('clinicalvision_workflow_mode', 'clinical');
    
    let workflowHook: ReturnType<typeof useWorkflow>;
    
    render(
      <WorkflowProvider>
        <TestWorkflowApp onReady={(hook) => { workflowHook = hook; }} />
      </WorkflowProvider>
    );
    
    await waitFor(() => expect(workflowHook).toBeDefined());
    
    // Explicitly create quick mode - should NOT be overridden by localStorage
    act(() => {
      workflowHook.createSession('quick');
    });
    
    expect(workflowHook.session?.mode).toBe('quick');
  });

  it('Bug #5: AI_ANALYSIS accessible after images uploaded', async () => {
    let workflowHook: ReturnType<typeof useWorkflow>;
    
    render(
      <WorkflowProvider>
        <TestWorkflowApp onReady={(hook) => { workflowHook = hook; }} />
      </WorkflowProvider>
    );
    
    await waitFor(() => expect(workflowHook).toBeDefined());
    
    act(() => {
      workflowHook.createSession('clinical');
    });
    
    // Initially locked
    expect(workflowHook.canNavigateToStep(WorkflowStep.AI_ANALYSIS)).toBe(false);
    expect(workflowHook.getStepState(WorkflowStep.AI_ANALYSIS)).toBe('locked');
    
    // Add images
    act(() => {
      workflowHook.updateSession({
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
    });
    
    // Now accessible - uses React state, not stale localStorage
    expect(workflowHook.canNavigateToStep(WorkflowStep.AI_ANALYSIS)).toBe(true);
    expect(workflowHook.getStepState(WorkflowStep.AI_ANALYSIS)).toBe('available');
  });
});
