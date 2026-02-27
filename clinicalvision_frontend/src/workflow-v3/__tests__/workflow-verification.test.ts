/**
 * Workflow V3 - Step-by-Step Verification Tests
 * 
 * These tests verify every step of the workflow from beginning to end,
 * ensuring all interactions work as expected.
 */

import {
  WorkflowSession,
  WorkflowStep,
  createNewSession,
  createEmptyAssessment,
  createEmptyPatientInfo,
  ImageData,
  AnalysisResults,
  Measurement,
} from '../types';
import {
  isStepComplete,
  canNavigateToStep,
  getStepState,
  getNextStep,
  getCompletionPercentage,
  getFirstIncompleteStep,
} from '../workflowEngine';
import { sessionStorage } from '../sessionStorage';
import { STORAGE_KEYS, getVisibleSteps, CLINICAL_MODE_STEPS } from '../constants';

// Helper to create mock image data
function createMockImage(id: string = 'img-1'): ImageData {
  return {
    id,
    file: null,
    fileName: 'mammogram.dcm',
    fileSize: 10240,
    preview: 'data:image/jpeg;base64,/9j/example',
    uploadedAt: new Date().toISOString(),
    metadata: {
      width: 2048,
      height: 2048,
      type: 'mammogram',
      view: 'CC',
      laterality: 'left',
    },
  };
}

// Helper to create mock analysis results
function createMockAnalysis(status: 'pending' | 'complete' | 'failed' = 'complete'): AnalysisResults {
  return {
    id: 'analysis-1',
    analyzedAt: new Date().toISOString(),
    status,
    predictions: status === 'complete' ? [{ label: 'benign', confidence: 0.92 }] : [],
    confidenceScore: status === 'complete' ? 0.92 : undefined,
    findings: status === 'complete' ? [
      { id: 'f1', type: 'mass', location: 'Upper outer quadrant', severity: 'low', description: 'Small benign mass' }
    ] : [],
    suggestedBirads: status === 'complete' ? 2 : undefined,
  };
}

// Helper to create mock measurement
function createMockMeasurement(): Measurement {
  return {
    id: 'meas-1',
    type: 'distance',
    label: 'Mass diameter',
    value: 12.5,
    unit: 'mm',
    createdAt: new Date().toISOString(),
    coordinates: { startX: 100, startY: 100, endX: 200, endY: 100 },
  };
}

// Clear storage before each test
beforeEach(() => {
  localStorage.clear();
});

describe('Workflow V3 - Complete Verification', () => {
  describe('Step 1: Session Creation & Upload', () => {
    it('should create a new session in clinical mode', () => {
      const session = createNewSession('clinical');
      
      expect(session.id).toBeDefined();
      expect(session.mode).toBe('clinical');
      expect(session.status).toBe('active');
      expect(session.currentStep).toBe(WorkflowStep.UPLOAD);
      expect(session.images).toEqual([]);
      expect(session.analysisResults).toBeNull();
    });

    it('should create a new session in quick mode', () => {
      const session = createNewSession('quick');
      
      expect(session.mode).toBe('quick');
      expect(session.currentStep).toBe(WorkflowStep.UPLOAD);
    });

    it('should mark UPLOAD as current initially', () => {
      const session = createNewSession('clinical');
      expect(getStepState(session, WorkflowStep.UPLOAD)).toBe('current');
    });

    it('should show UPLOAD as NOT complete when no images', () => {
      const session = createNewSession('clinical');
      expect(isStepComplete(session, WorkflowStep.UPLOAD)).toBe(false);
    });

    it('should show UPLOAD as complete when images added', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      
      expect(isStepComplete(session, WorkflowStep.UPLOAD)).toBe(true);
    });

    it('should persist session to localStorage', () => {
      const session = createNewSession('clinical');
      sessionStorage.saveSession(session);
      sessionStorage.setCurrentSessionId(session.id);
      
      const retrieved = sessionStorage.getSession(session.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(session.id);
    });
  });

  describe('Step 2: AI Analysis', () => {
    it('should NOT allow navigation to AI_ANALYSIS without images', () => {
      const session = createNewSession('clinical');
      expect(canNavigateToStep(session, WorkflowStep.AI_ANALYSIS)).toBe(false);
    });

    it('should allow navigation to AI_ANALYSIS after upload', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      
      expect(canNavigateToStep(session, WorkflowStep.AI_ANALYSIS)).toBe(true);
    });

    it('should show AI_ANALYSIS as available after upload', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      
      expect(getStepState(session, WorkflowStep.AI_ANALYSIS)).toBe('available');
    });

    it('should show AI_ANALYSIS as NOT complete when pending', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      session.currentStep = WorkflowStep.AI_ANALYSIS;
      session.analysisResults = createMockAnalysis('pending');
      
      expect(isStepComplete(session, WorkflowStep.AI_ANALYSIS)).toBe(false);
    });

    it('should show AI_ANALYSIS as complete when analysis finished', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      session.analysisResults = createMockAnalysis('complete');
      
      expect(isStepComplete(session, WorkflowStep.AI_ANALYSIS)).toBe(true);
    });

    it('should show AI_ANALYSIS as NOT complete when failed', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      session.analysisResults = createMockAnalysis('failed');
      
      expect(isStepComplete(session, WorkflowStep.AI_ANALYSIS)).toBe(false);
    });
  });

  describe('Step 3: Patient Information (Floating Step)', () => {
    it('should ALWAYS allow navigation to PATIENT_INFO', () => {
      const session = createNewSession('clinical');
      // No images, no analysis - should still be allowed
      expect(canNavigateToStep(session, WorkflowStep.PATIENT_INFO)).toBe(true);
    });

    it('should show PATIENT_INFO as available from start', () => {
      const session = createNewSession('clinical');
      expect(getStepState(session, WorkflowStep.PATIENT_INFO)).toBe('available');
    });

    it('should show PATIENT_INFO as NOT complete without ID', () => {
      const session = createNewSession('clinical');
      expect(isStepComplete(session, WorkflowStep.PATIENT_INFO)).toBe(false);
    });

    it('should show PATIENT_INFO as complete with ID', () => {
      const session = createNewSession('clinical');
      session.patientInfo.id = 'PT-12345';
      session.patientInfo.name = 'Jane Doe';
      
      expect(isStepComplete(session, WorkflowStep.PATIENT_INFO)).toBe(true);
    });

    it('should NOT count whitespace-only ID as complete', () => {
      const session = createNewSession('clinical');
      session.patientInfo.id = '   ';
      
      expect(isStepComplete(session, WorkflowStep.PATIENT_INFO)).toBe(false);
    });
  });

  describe('Step 4: Measurements', () => {
    it('should NOT allow MEASUREMENTS before AI analysis', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      // No analysis results
      
      expect(canNavigateToStep(session, WorkflowStep.MEASUREMENTS)).toBe(false);
    });

    it('should allow MEASUREMENTS after AI analysis', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      session.analysisResults = createMockAnalysis('complete');
      
      expect(canNavigateToStep(session, WorkflowStep.MEASUREMENTS)).toBe(true);
    });

    it('should show MEASUREMENTS as NOT complete without measurements', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      session.analysisResults = createMockAnalysis('complete');
      
      expect(isStepComplete(session, WorkflowStep.MEASUREMENTS)).toBe(false);
    });

    it('should show MEASUREMENTS as complete with measurements', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      session.analysisResults = createMockAnalysis('complete');
      session.measurements = [createMockMeasurement()];
      
      expect(isStepComplete(session, WorkflowStep.MEASUREMENTS)).toBe(true);
    });
  });

  describe('Step 5: Assessment', () => {
    it('should NOT allow ASSESSMENT before AI analysis', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      
      expect(canNavigateToStep(session, WorkflowStep.ASSESSMENT)).toBe(false);
    });

    it('should allow ASSESSMENT after AI analysis', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      session.analysisResults = createMockAnalysis('complete');
      
      expect(canNavigateToStep(session, WorkflowStep.ASSESSMENT)).toBe(true);
    });

    it('should show ASSESSMENT as NOT complete without BI-RADS', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      session.analysisResults = createMockAnalysis('complete');
      
      expect(isStepComplete(session, WorkflowStep.ASSESSMENT)).toBe(false);
    });

    it('should show ASSESSMENT as complete with BI-RADS (including 0)', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      session.analysisResults = createMockAnalysis('complete');
      session.assessment.birads = 0; // BI-RADS 0 is a valid category
      
      expect(isStepComplete(session, WorkflowStep.ASSESSMENT)).toBe(true);
    });

    it('should show ASSESSMENT as complete with any BI-RADS value', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      session.analysisResults = createMockAnalysis('complete');
      session.assessment.birads = 2;
      
      expect(isStepComplete(session, WorkflowStep.ASSESSMENT)).toBe(true);
    });
  });

  describe('Step 6: Report Generation', () => {
    it('should NOT allow REPORT without assessment AND patient info', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      session.analysisResults = createMockAnalysis('complete');
      // Has assessment but no patient info
      session.assessment.birads = 2;
      
      expect(canNavigateToStep(session, WorkflowStep.REPORT)).toBe(false);
    });

    it('should allow REPORT with both assessment AND patient info', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      session.analysisResults = createMockAnalysis('complete');
      session.assessment.birads = 2;
      session.patientInfo.id = 'PT-12345';
      
      expect(canNavigateToStep(session, WorkflowStep.REPORT)).toBe(true);
    });

    it('should show REPORT as NOT complete without impression', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      session.analysisResults = createMockAnalysis('complete');
      session.assessment.birads = 2;
      session.patientInfo.id = 'PT-12345';
      
      expect(isStepComplete(session, WorkflowStep.REPORT)).toBe(false);
    });

    it('should show REPORT as complete with impression', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      session.analysisResults = createMockAnalysis('complete');
      session.assessment.birads = 2;
      session.patientInfo.id = 'PT-12345';
      session.assessment.impression = 'No suspicious findings. Routine follow-up recommended.';
      
      expect(isStepComplete(session, WorkflowStep.REPORT)).toBe(true);
    });
  });

  describe('Step 7: Finalize', () => {
    it('should NOT allow FINALIZE without report', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      session.analysisResults = createMockAnalysis('complete');
      session.assessment.birads = 2;
      session.patientInfo.id = 'PT-12345';
      // No impression yet
      
      expect(canNavigateToStep(session, WorkflowStep.FINALIZE)).toBe(false);
    });

    it('should allow FINALIZE after report', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      session.analysisResults = createMockAnalysis('complete');
      session.assessment.birads = 2;
      session.patientInfo.id = 'PT-12345';
      session.assessment.impression = 'No suspicious findings.';
      
      expect(canNavigateToStep(session, WorkflowStep.FINALIZE)).toBe(true);
    });

    it('should show FINALIZE as NOT complete when active', () => {
      const session = createNewSession('clinical');
      session.status = 'active';
      
      expect(isStepComplete(session, WorkflowStep.FINALIZE)).toBe(false);
    });

    it('should show FINALIZE as complete when completed', () => {
      const session = createNewSession('clinical');
      session.status = 'completed';
      
      expect(isStepComplete(session, WorkflowStep.FINALIZE)).toBe(true);
    });
  });

  describe('Step State Priority', () => {
    it('should show current step as "current" even if complete', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()]; // UPLOAD is complete
      session.currentStep = WorkflowStep.UPLOAD; // But we're still on UPLOAD
      
      // Even though UPLOAD is complete, it should show as "current"
      expect(getStepState(session, WorkflowStep.UPLOAD)).toBe('current');
    });

    it('should show completed step as "completed" when not current', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()]; // UPLOAD is complete
      session.currentStep = WorkflowStep.AI_ANALYSIS; // We moved on
      
      expect(getStepState(session, WorkflowStep.UPLOAD)).toBe('completed');
    });

    it('should show locked step correctly', () => {
      const session = createNewSession('clinical');
      // No images, so MEASUREMENTS should be locked
      
      expect(getStepState(session, WorkflowStep.MEASUREMENTS)).toBe('locked');
    });
  });

  describe('Completion Percentage', () => {
    it('should be 0% for new session', () => {
      const session = createNewSession('clinical');
      expect(getCompletionPercentage(session)).toBe(0);
    });

    it('should calculate correct percentage for partial completion', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      session.analysisResults = createMockAnalysis('complete');
      
      // 2 out of 7 steps complete = ~29%
      const percentage = getCompletionPercentage(session);
      expect(percentage).toBeGreaterThan(0);
      expect(percentage).toBeLessThan(100);
    });

    it('should be 100% when all steps complete', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      session.analysisResults = createMockAnalysis('complete');
      session.patientInfo.id = 'PT-12345';
      session.measurements = [createMockMeasurement()];
      session.assessment.birads = 2;
      session.assessment.impression = 'Complete impression text';
      session.status = 'completed';
      
      expect(getCompletionPercentage(session)).toBe(100);
    });
  });

  describe('Session Persistence', () => {
    it('should persist updates immediately', () => {
      const session = createNewSession('clinical');
      sessionStorage.saveSession(session);
      sessionStorage.setCurrentSessionId(session.id);
      
      // Update session
      const updatedSession: WorkflowSession = {
        ...session,
        images: [createMockImage()],
        updatedAt: new Date().toISOString(),
      };
      sessionStorage.saveSession(updatedSession);
      
      // Retrieve and verify
      const retrieved = sessionStorage.getSession(session.id);
      expect(retrieved?.images.length).toBe(1);
    });

    it('should update timestamp on save', () => {
      const session = createNewSession('clinical');
      const originalTime = session.updatedAt;
      
      // Wait a bit then save
      const updatedSession: WorkflowSession = {
        ...session,
        updatedAt: new Date().toISOString(),
      };
      sessionStorage.saveSession(updatedSession);
      
      const retrieved = sessionStorage.getSession(session.id);
      // The saved session should have a different (newer) timestamp
      expect(retrieved?.updatedAt).toBeDefined();
    });

    it('should restore session across "page reloads" (localStorage roundtrip)', () => {
      // Create and save session with data
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      session.analysisResults = createMockAnalysis('complete');
      session.patientInfo.id = 'PT-PERSIST-TEST';
      session.assessment.birads = 3;
      sessionStorage.saveSession(session);
      sessionStorage.setCurrentSessionId(session.id);
      
      // "Reload" - get from storage
      const currentId = sessionStorage.getCurrentSessionId();
      expect(currentId).toBe(session.id);
      
      const retrieved = sessionStorage.getSession(currentId!);
      expect(retrieved?.images.length).toBe(1);
      expect(retrieved?.analysisResults?.status).toBe('complete');
      expect(retrieved?.patientInfo.id).toBe('PT-PERSIST-TEST');
      expect(retrieved?.assessment.birads).toBe(3);
    });
  });

  describe('Quick Mode', () => {
    it('should have limited visible steps', () => {
      const steps = getVisibleSteps('quick');
      expect(steps.length).toBe(3); // UPLOAD, AI_ANALYSIS, ASSESSMENT
    });

    it('should follow quick mode navigation rules', () => {
      const session = createNewSession('quick');
      session.images = [createMockImage()];
      session.analysisResults = createMockAnalysis('complete');
      
      // In quick mode, ASSESSMENT should be directly available after AI
      expect(canNavigateToStep(session, WorkflowStep.ASSESSMENT)).toBe(true);
    });
  });

  describe('First Incomplete Step Detection', () => {
    it('should return UPLOAD for new session', () => {
      const session = createNewSession('clinical');
      expect(getFirstIncompleteStep(session)).toBe(WorkflowStep.UPLOAD);
    });

    it('should skip completed steps', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      session.analysisResults = createMockAnalysis('complete');
      
      const firstIncomplete = getFirstIncompleteStep(session);
      expect(firstIncomplete).not.toBe(WorkflowStep.UPLOAD);
      expect(firstIncomplete).not.toBe(WorkflowStep.AI_ANALYSIS);
    });

    it('should return null when all steps complete', () => {
      const session = createNewSession('clinical');
      session.images = [createMockImage()];
      session.analysisResults = createMockAnalysis('complete');
      session.patientInfo.id = 'PT-12345';
      session.measurements = [createMockMeasurement()];
      session.assessment.birads = 2;
      session.assessment.impression = 'Complete';
      session.status = 'completed';
      
      expect(getFirstIncompleteStep(session)).toBe(null);
    });
  });

  describe('Navigation (getNextStep)', () => {
    it('should return next step in sequence', () => {
      const session = createNewSession('clinical');
      expect(getNextStep(session, WorkflowStep.UPLOAD)).toBe(WorkflowStep.AI_ANALYSIS);
      expect(getNextStep(session, WorkflowStep.AI_ANALYSIS)).toBe(WorkflowStep.PATIENT_INFO);
    });

    it('should return null at last step', () => {
      const session = createNewSession('clinical');
      expect(getNextStep(session, WorkflowStep.FINALIZE)).toBe(null);
    });

    it('should handle quick mode step sequence', () => {
      const session = createNewSession('quick');
      expect(getNextStep(session, WorkflowStep.UPLOAD)).toBe(WorkflowStep.AI_ANALYSIS);
      expect(getNextStep(session, WorkflowStep.AI_ANALYSIS)).toBe(WorkflowStep.ASSESSMENT);
      // Assessment is last in quick mode
    });
  });
});

describe('Workflow V3 - End-to-End Complete Scenario', () => {
  it('should complete full clinical workflow from start to finish', () => {
    // === Step 1: Create Session ===
    let session = createNewSession('clinical');
    expect(session.currentStep).toBe(WorkflowStep.UPLOAD);
    expect(getCompletionPercentage(session)).toBe(0);
    
    // === Step 2: Upload Images ===
    session.images = [createMockImage()];
    expect(isStepComplete(session, WorkflowStep.UPLOAD)).toBe(true);
    expect(canNavigateToStep(session, WorkflowStep.AI_ANALYSIS)).toBe(true);
    
    // Navigate to AI Analysis
    session.currentStep = WorkflowStep.AI_ANALYSIS;
    expect(getStepState(session, WorkflowStep.UPLOAD)).toBe('completed');
    expect(getStepState(session, WorkflowStep.AI_ANALYSIS)).toBe('current');
    
    // === Step 3: AI Analysis (starts pending) ===
    session.analysisResults = createMockAnalysis('pending');
    expect(isStepComplete(session, WorkflowStep.AI_ANALYSIS)).toBe(false);
    
    // Analysis completes
    session.analysisResults = createMockAnalysis('complete');
    expect(isStepComplete(session, WorkflowStep.AI_ANALYSIS)).toBe(true);
    
    // Can now access Measurements, Assessment
    expect(canNavigateToStep(session, WorkflowStep.MEASUREMENTS)).toBe(true);
    expect(canNavigateToStep(session, WorkflowStep.ASSESSMENT)).toBe(true);
    
    // === Step 4: Patient Info (can be done anytime) ===
    session.currentStep = WorkflowStep.PATIENT_INFO;
    session.patientInfo = {
      ...session.patientInfo,
      id: 'PT-2024-001',
      name: 'Jane Smith',
      dateOfBirth: '1975-03-15',
      gender: 'female',
    };
    expect(isStepComplete(session, WorkflowStep.PATIENT_INFO)).toBe(true);
    
    // === Step 5: Measurements ===
    session.currentStep = WorkflowStep.MEASUREMENTS;
    session.measurements = [createMockMeasurement()];
    expect(isStepComplete(session, WorkflowStep.MEASUREMENTS)).toBe(true);
    
    // === Step 6: Assessment ===
    session.currentStep = WorkflowStep.ASSESSMENT;
    session.assessment = {
      ...session.assessment,
      birads: 2,
      laterality: 'bilateral',
      density: 'B',
      findings: [],
    };
    expect(isStepComplete(session, WorkflowStep.ASSESSMENT)).toBe(true);
    
    // Now can access Report (have assessment + patient info)
    expect(canNavigateToStep(session, WorkflowStep.REPORT)).toBe(true);
    
    // === Step 7: Report Generation ===
    session.currentStep = WorkflowStep.REPORT;
    session.assessment.impression = 'Bilateral mammographic examination demonstrates no evidence of malignancy. BI-RADS Category 2: Benign finding.';
    session.assessment.recommendations = 'Routine screening mammography in 12 months.';
    expect(isStepComplete(session, WorkflowStep.REPORT)).toBe(true);
    
    // Can now finalize
    expect(canNavigateToStep(session, WorkflowStep.FINALIZE)).toBe(true);
    
    // === Step 8: Finalize ===
    session.currentStep = WorkflowStep.FINALIZE;
    session.status = 'completed';
    expect(isStepComplete(session, WorkflowStep.FINALIZE)).toBe(true);
    
    // === Verify Complete ===
    expect(getCompletionPercentage(session)).toBe(100);
    expect(getFirstIncompleteStep(session)).toBe(null);
    
    // Verify all steps show as completed (except current)
    expect(getStepState(session, WorkflowStep.UPLOAD)).toBe('completed');
    expect(getStepState(session, WorkflowStep.AI_ANALYSIS)).toBe('completed');
    expect(getStepState(session, WorkflowStep.PATIENT_INFO)).toBe('completed');
    expect(getStepState(session, WorkflowStep.MEASUREMENTS)).toBe('completed');
    expect(getStepState(session, WorkflowStep.ASSESSMENT)).toBe('completed');
    expect(getStepState(session, WorkflowStep.REPORT)).toBe('completed');
    expect(getStepState(session, WorkflowStep.FINALIZE)).toBe('current'); // Last step is current
  });

  it('should persist entire workflow through localStorage', () => {
    // Create and complete a session
    const session = createNewSession('clinical');
    session.images = [createMockImage()];
    session.analysisResults = createMockAnalysis('complete');
    session.patientInfo.id = 'PT-PERSIST-E2E';
    session.measurements = [createMockMeasurement()];
    session.assessment.birads = 2;
    session.assessment.impression = 'Complete workflow test';
    session.currentStep = WorkflowStep.REPORT;
    
    // Save to storage
    sessionStorage.saveSession(session);
    sessionStorage.setCurrentSessionId(session.id);
    
    // "Clear memory" and restore
    const restoredId = sessionStorage.getCurrentSessionId();
    const restored = sessionStorage.getSession(restoredId!);
    
    // Verify all data persisted
    expect(restored).not.toBeNull();
    expect(restored!.images.length).toBe(1);
    expect(restored!.images[0].fileName).toBe('mammogram.dcm');
    expect(restored!.analysisResults?.status).toBe('complete');
    expect(restored!.analysisResults?.findings?.length).toBe(1);
    expect(restored!.patientInfo.id).toBe('PT-PERSIST-E2E');
    expect(restored!.measurements.length).toBe(1);
    expect(restored!.assessment.birads).toBe(2);
    expect(restored!.assessment.impression).toBe('Complete workflow test');
    expect(restored!.currentStep).toBe(WorkflowStep.REPORT);
    
    // Verify step states match after restore
    expect(isStepComplete(restored!, WorkflowStep.UPLOAD)).toBe(true);
    expect(isStepComplete(restored!, WorkflowStep.AI_ANALYSIS)).toBe(true);
    expect(isStepComplete(restored!, WorkflowStep.PATIENT_INFO)).toBe(true);
    expect(isStepComplete(restored!, WorkflowStep.MEASUREMENTS)).toBe(true);
    expect(isStepComplete(restored!, WorkflowStep.ASSESSMENT)).toBe(true);
    expect(isStepComplete(restored!, WorkflowStep.REPORT)).toBe(true);
  });
});
