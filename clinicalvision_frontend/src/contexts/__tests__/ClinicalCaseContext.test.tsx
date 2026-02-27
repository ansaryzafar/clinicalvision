/**
 * ClinicalCaseContext Tests
 * 
 * TDD tests for the ClinicalCaseContext - manages clinical case state and operations.
 * Tests context provider, hooks, state management, and integration with persistence.
 * 
 * @jest-environment jsdom
 */

import React, { useEffect } from 'react';
import { render, screen, waitFor, act, renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  ClinicalCase,
  ClinicalWorkflowStep,
  PatientInfo,
  ClinicalHistory,
  MammogramImage,
  ViewType,
  Laterality,
  CaseStatus,
  WorkflowState,
  AuditTrail,
  BiRadsAssessment,
} from '../../types/case.types';
import { assertFailure } from '../../types/resultHelpers';

// Import the context we'll implement (tests first - TDD)
import {
  ClinicalCaseProvider,
  useClinicalCase,
  ClinicalCaseContextValue,
} from '../ClinicalCaseContext';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const TEST_USER_ID = 'test-user-001';

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

// Helper component to test context
function TestConsumer({ 
  onContext 
}: { 
  onContext: (ctx: ClinicalCaseContextValue) => void 
}) {
  const context = useClinicalCase();
  useEffect(() => {
    onContext(context);
  }, [context, onContext]);
  return null;
}

// Helper to render hook with provider
function renderWithProvider(userId: string = TEST_USER_ID) {
  return renderHook(() => useClinicalCase(), {
    wrapper: ({ children }) => (
      <ClinicalCaseProvider userId={userId}>
        {children}
      </ClinicalCaseProvider>
    ),
  });
}

// ============================================================================
// CONTEXT PROVIDER TESTS
// ============================================================================

describe('ClinicalCaseContext', () => {
  
  describe('Provider', () => {
    
    it('should render children without errors', () => {
      render(
        <ClinicalCaseProvider userId={TEST_USER_ID}>
          <div data-testid="child">Test</div>
        </ClinicalCaseProvider>
      );
      
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });
    
    it('should throw error when useClinicalCase used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useClinicalCase());
      }).toThrow('useClinicalCase must be used within ClinicalCaseProvider');
      
      consoleSpy.mockRestore();
    });
    
    it('should provide context value to children', () => {
      let receivedContext: ClinicalCaseContextValue | null = null;
      
      render(
        <ClinicalCaseProvider userId={TEST_USER_ID}>
          <TestConsumer onContext={(ctx) => { receivedContext = ctx; }} />
        </ClinicalCaseProvider>
      );
      
      expect(receivedContext).not.toBeNull();
      expect(receivedContext!.userId).toBe(TEST_USER_ID);
    });
    
    it('should initialize with null currentCase', () => {
      const { result } = renderWithProvider();
      
      expect(result.current.currentCase).toBeNull();
    });
    
    it('should initialize with loading false', () => {
      const { result } = renderWithProvider();
      
      expect(result.current.isLoading).toBe(false);
    });
    
    it('should initialize with no error', () => {
      const { result } = renderWithProvider();
      
      expect(result.current.error).toBeNull();
    });
    
  });
  
  // ============================================================================
  // CASE CREATION TESTS
  // ============================================================================
  
  describe('createCase', () => {
    
    it('should create a new case with valid patient info and history', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        const createResult = await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
        
        expect(createResult.success).toBe(true);
      });
      
      expect(result.current.currentCase).not.toBeNull();
    });
    
    it('should set currentCase after creation', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      expect(result.current.currentCase).not.toBeNull();
      expect(result.current.currentCase!.patient.mrn).toBe('MRN123456');
    });
    
    it('should return failure for invalid patient info', async () => {
      const { result } = renderWithProvider();
      
      const invalidPatient: PatientInfo = {
        mrn: '', // Invalid - empty
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: '1980-05-15',
        gender: 'F',
      };
      
      await act(async () => {
        const createResult = await result.current.createCase(
          invalidPatient,
          createValidClinicalHistory()
        );
        
        expect(createResult.success).toBe(false);
      });
      
      // currentCase should remain null
      expect(result.current.currentCase).toBeNull();
    });
    
    it('should generate unique case numbers', async () => {
      const { result } = renderWithProvider();
      
      let caseNumber1: string = '';
      let caseNumber2: string = '';
      
      await act(async () => {
        const result1 = await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
        if (result1.success) {
          caseNumber1 = result1.data.caseNumber;
        }
      });
      
      // Clear and create another
      await act(async () => {
        result.current.clearCurrentCase();
      });
      
      await act(async () => {
        const result2 = await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
        if (result2.success) {
          caseNumber2 = result2.data.caseNumber;
        }
      });
      
      expect(caseNumber1).not.toBe(caseNumber2);
    });
    
    it('should initialize workflow at PATIENT_REGISTRATION step', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      expect(result.current.currentCase!.workflow.currentStep)
        .toBe(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    });
    
    it('should set workflow status to draft', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      expect(result.current.currentCase!.workflow.status).toBe('draft');
    });
    
    it('should create audit trail with createdBy user', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      expect(result.current.currentCase!.audit.createdBy).toBe(TEST_USER_ID);
    });
    
  });
  
  // ============================================================================
  // WORKFLOW OPERATIONS TESTS
  // ============================================================================
  
  describe('advanceWorkflow', () => {
    
    it('should advance to next step when guards pass', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      await act(async () => {
        const advanceResult = result.current.advanceWorkflow();
        expect(advanceResult.success).toBe(true);
      });
      
      expect(result.current.currentCase!.workflow.currentStep)
        .toBe(ClinicalWorkflowStep.CLINICAL_HISTORY);
    });
    
    it('should fail when no case is loaded', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        const advanceResult = result.current.advanceWorkflow();
        
        expect(advanceResult.success).toBe(false);
        const error: Error = assertFailure(advanceResult) as Error;
        expect(error.message).toContain('No case loaded');
      });
    });
    
    it('should update completedSteps on advance', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      await act(async () => {
        result.current.advanceWorkflow();
      });
      
      expect(result.current.currentCase!.workflow.completedSteps)
        .toContain(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    });
    
    it('should update lastModifiedAt on advance', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      const originalModified = result.current.currentCase!.workflow.lastModifiedAt;
      
      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await act(async () => {
        result.current.advanceWorkflow();
      });
      
      expect(result.current.currentCase!.workflow.lastModifiedAt)
        .not.toBe(originalModified);
    });
    
  });
  
  describe('goBackToStep', () => {
    
    it('should go back to completed step', async () => {
      const { result } = renderWithProvider();
      
      // Create case first
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      // Then advance in separate act
      await act(async () => {
        result.current.advanceWorkflow();
      });
      
      expect(result.current.currentCase!.workflow.currentStep)
        .toBe(ClinicalWorkflowStep.CLINICAL_HISTORY);
      
      await act(async () => {
        const backResult = result.current.goBackToStep(
          ClinicalWorkflowStep.PATIENT_REGISTRATION
        );
        expect(backResult.success).toBe(true);
      });
      
      expect(result.current.currentCase!.workflow.currentStep)
        .toBe(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    });
    
    it('should fail when going back to uncompleted step', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      await act(async () => {
        const backResult = result.current.goBackToStep(
          ClinicalWorkflowStep.IMAGE_UPLOAD // Not completed
        );
        expect(backResult.success).toBe(false);
      });
    });
    
    it('should fail when no case is loaded', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        const backResult = result.current.goBackToStep(
          ClinicalWorkflowStep.PATIENT_REGISTRATION
        );
        expect(backResult.success).toBe(false);
      });
    });
    
  });
  
  // ============================================================================
  // PATIENT UPDATE TESTS
  // ============================================================================
  
  describe('updatePatientInfo', () => {
    
    it('should update patient info on current case', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      await act(async () => {
        const updateResult = result.current.updatePatientInfo({
          firstName: 'Janet',
        });
        expect(updateResult.success).toBe(true);
      });
      
      expect(result.current.currentCase!.patient.firstName).toBe('Janet');
    });
    
    it('should reject invalid patient update', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      await act(async () => {
        const updateResult = result.current.updatePatientInfo({
          mrn: '', // Invalid - empty
        });
        expect(updateResult.success).toBe(false);
      });
      
      // Original MRN should be preserved
      expect(result.current.currentCase!.patient.mrn).toBe('MRN123456');
    });
    
    it('should fail when no case is loaded', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        const updateResult = result.current.updatePatientInfo({
          firstName: 'Janet',
        });
        expect(updateResult.success).toBe(false);
      });
    });
    
    it('should add audit entry for patient update', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      const originalAuditCount = result.current.currentCase!.audit.modifications.length;
      
      await act(async () => {
        result.current.updatePatientInfo({ firstName: 'Janet' });
      });
      
      expect(result.current.currentCase!.audit.modifications.length)
        .toBe(originalAuditCount + 1);
    });
    
  });
  
  describe('updateClinicalHistory', () => {
    
    it('should update clinical history', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      await act(async () => {
        const updateResult = result.current.updateClinicalHistory({
          familyHistoryBreastCancer: true,
        });
        expect(updateResult.success).toBe(true);
      });
      
      expect(result.current.currentCase!.clinicalHistory.familyHistoryBreastCancer)
        .toBe(true);
    });
    
    it('should reject invalid clinical history update', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      await act(async () => {
        const updateResult = result.current.updateClinicalHistory({
          clinicalIndication: '', // Invalid - empty
        });
        expect(updateResult.success).toBe(false);
      });
    });
    
  });
  
  // ============================================================================
  // IMAGE OPERATIONS TESTS
  // ============================================================================
  
  describe('addImage', () => {
    
    /**
     * Helper to advance case to IMAGE_UPLOAD step
     * Images can only be added at IMAGE_UPLOAD or IMAGE_VERIFICATION steps
     */
    async function advanceToImageUploadStep(result: any) {
      // PATIENT_REGISTRATION -> CLINICAL_HISTORY
      await act(async () => {
        result.current.advanceWorkflow();
      });
      // CLINICAL_HISTORY -> IMAGE_UPLOAD
      await act(async () => {
        result.current.advanceWorkflow();
      });
    }
    
    it('should add image to current case at IMAGE_UPLOAD step', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      // Advance to IMAGE_UPLOAD step
      await advanceToImageUploadStep(result);
      
      const mockImage = createMockImage();
      
      await act(async () => {
        const addResult = result.current.addImage(mockImage);
        expect(addResult.success).toBe(true);
      });
      
      expect(result.current.currentCase!.images.length).toBe(1);
    });
    
    it('should fail when no case is loaded', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        const addResult = result.current.addImage(createMockImage());
        expect(addResult.success).toBe(false);
      });
    });
    
    it('should fail when not at IMAGE_UPLOAD or IMAGE_VERIFICATION step', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      // Don't advance - stays at PATIENT_REGISTRATION
      
      await act(async () => {
        const addResult = result.current.addImage(createMockImage());
        expect(addResult.success).toBe(false);
        const error: Error = assertFailure(addResult) as Error;
        expect(error.message).toContain('cannot be added at step');
      });
    });
    
    it('should allow adding multiple images', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      // Advance to IMAGE_UPLOAD step
      await advanceToImageUploadStep(result);
      
      // Add images one at a time in separate act blocks
      await act(async () => {
        result.current.addImage(createMockImage({ viewType: ViewType.CC, laterality: Laterality.LEFT }));
      });
      await act(async () => {
        result.current.addImage(createMockImage({ viewType: ViewType.MLO, laterality: Laterality.LEFT }));
      });
      await act(async () => {
        result.current.addImage(createMockImage({ viewType: ViewType.CC, laterality: Laterality.RIGHT }));
      });
      await act(async () => {
        result.current.addImage(createMockImage({ viewType: ViewType.MLO, laterality: Laterality.RIGHT }));
      });
      
      expect(result.current.currentCase!.images.length).toBe(4);
    });
    
    it('P1: should handle rapid sequential addImage calls within a single act (stale closure fix)', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      // Advance to IMAGE_UPLOAD step
      await advanceToImageUploadStep(result);
      
      // Simulate what MultiImageUpload.handleUpload does: 
      // call addImage multiple times in a SINGLE act block (synchronous loop)
      const images = [
        createMockImage({ id: 'rapid-1', viewType: ViewType.CC, laterality: Laterality.RIGHT }),
        createMockImage({ id: 'rapid-2', viewType: ViewType.CC, laterality: Laterality.LEFT }),
        createMockImage({ id: 'rapid-3', viewType: ViewType.MLO, laterality: Laterality.RIGHT }),
        createMockImage({ id: 'rapid-4', viewType: ViewType.MLO, laterality: Laterality.LEFT }),
      ];
      
      await act(async () => {
        for (const img of images) {
          const addResult = result.current.addImage(img);
          expect(addResult.success).toBe(true);
        }
      });
      
      // ALL 4 images must be present — not just the last one
      expect(result.current.currentCase!.images.length).toBe(4);
      expect(result.current.currentCase!.images.map(i => i.id)).toEqual(
        expect.arrayContaining(['rapid-1', 'rapid-2', 'rapid-3', 'rapid-4'])
      );
    });
    
  });
  
  describe('removeImage', () => {
    
    /**
     * Helper to advance case to IMAGE_UPLOAD step
     */
    async function advanceToImageUploadStep(result: any) {
      // PATIENT_REGISTRATION -> CLINICAL_HISTORY
      await act(async () => {
        result.current.advanceWorkflow();
      });
      // CLINICAL_HISTORY -> IMAGE_UPLOAD
      await act(async () => {
        result.current.advanceWorkflow();
      });
    }
    
    it('should remove image by id', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      // Advance to IMAGE_UPLOAD step
      await advanceToImageUploadStep(result);
      
      const image = createMockImage();
      
      await act(async () => {
        result.current.addImage(image);
      });
      
      expect(result.current.currentCase!.images.length).toBe(1);
      
      await act(async () => {
        const removeResult = result.current.removeImage(image.id);
        expect(removeResult.success).toBe(true);
      });
      
      expect(result.current.currentCase!.images.length).toBe(0);
    });
    
    it('should fail when removing non-existent image', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      // Advance to IMAGE_UPLOAD step
      await advanceToImageUploadStep(result);
      
      await act(async () => {
        const removeResult = result.current.removeImage('non-existent-id');
        expect(removeResult.success).toBe(false);
      });
    });
    
    it('should fail when not at IMAGE_UPLOAD or IMAGE_VERIFICATION step', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      // Don't advance - stays at PATIENT_REGISTRATION
      
      await act(async () => {
        const removeResult = result.current.removeImage('any-id');
        expect(removeResult.success).toBe(false);
        const error: Error = assertFailure(removeResult) as Error;
        expect(error.message).toContain('cannot be removed at step');
      });
    });
    
  });
  
  // ============================================================================
  // CASE LOADING TESTS
  // ============================================================================
  
  describe('loadCase', () => {
    
    it('should load case and set as currentCase', async () => {
      const { result } = renderWithProvider();
      
      // Create a case first
      let caseId: string = '';
      await act(async () => {
        const createResult = await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
        if (createResult.success) {
          caseId = createResult.data.id;
        }
      });
      
      // Clear current case
      await act(async () => {
        result.current.clearCurrentCase();
      });
      
      expect(result.current.currentCase).toBeNull();
      
      // Load the case
      await act(async () => {
        const loadResult = await result.current.loadCase(caseId);
        expect(loadResult.success).toBe(true);
      });
      
      expect(result.current.currentCase).not.toBeNull();
      expect(result.current.currentCase!.id).toBe(caseId);
    });
    
    it('should fail when case not found', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        const loadResult = await result.current.loadCase('non-existent-id');
        expect(loadResult.success).toBe(false);
      });
    });
    
    it('should set isLoading during load operation', async () => {
      const { result } = renderWithProvider();
      
      // Create a case
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      const caseId = result.current.currentCase!.id;
      
      await act(async () => {
        result.current.clearCurrentCase();
      });
      
      // Note: In real implementation, isLoading would be true during the async operation
      // This is more of an integration test that depends on implementation
      await act(async () => {
        await result.current.loadCase(caseId);
      });
      
      // After load completes, isLoading should be false
      expect(result.current.isLoading).toBe(false);
    });
    
  });
  
  describe('clearCurrentCase', () => {
    
    it('should clear the current case', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      expect(result.current.currentCase).not.toBeNull();
      
      await act(async () => {
        result.current.clearCurrentCase();
      });
      
      expect(result.current.currentCase).toBeNull();
    });
    
  });
  
  // ============================================================================
  // FINALIZATION TESTS
  // ============================================================================
  
  describe('finalizeCase', () => {
    
    it('should fail when case not at DIGITAL_SIGNATURE step', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      await act(async () => {
        const finalizeResult = await result.current.finalizeCase('signature-hash');
        expect(finalizeResult.success).toBe(false);
      });
    });
    
    it('should fail when no case is loaded', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        const finalizeResult = await result.current.finalizeCase('signature-hash');
        expect(finalizeResult.success).toBe(false);
      });
    });
    
  });
  
  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================
  
  describe('Error Handling', () => {
    
    it('should clear error when clearError called', async () => {
      const { result } = renderWithProvider();
      
      // Trigger an error
      await act(async () => {
        await result.current.loadCase('non-existent');
      });
      
      // Error might be set depending on implementation
      await act(async () => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });
    
  });
  
  // ============================================================================
  // WORKFLOW HELPERS TESTS
  // ============================================================================
  
  describe('Workflow Helpers', () => {
    
    it('should return correct workflow progress', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      // At PATIENT_REGISTRATION (step 0), progress should be ~8%
      const progress = result.current.getWorkflowProgress();
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(20);
    });
    
    it('should check if step is completed', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      expect(result.current.isStepCompleted(ClinicalWorkflowStep.PATIENT_REGISTRATION))
        .toBe(false);
      
      await act(async () => {
        result.current.advanceWorkflow();
      });
      
      expect(result.current.isStepCompleted(ClinicalWorkflowStep.PATIENT_REGISTRATION))
        .toBe(true);
    });
    
    it('should check if at final step', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      expect(result.current.isAtFinalStep()).toBe(false);
    });
    
    it('should check if case is finalized', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      expect(result.current.isFinalized()).toBe(false);
    });
    
  });
  
  // ============================================================================
  // IMMUTABILITY TESTS
  // ============================================================================
  
  describe('Immutability', () => {
    
    it('should create new case objects on updates', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      const originalCase = result.current.currentCase;
      
      // Update patient info through proper method
      await act(async () => {
        result.current.updatePatientInfo({ firstName: 'Janet' });
      });
      
      // Should be a new object reference
      expect(result.current.currentCase).not.toBe(originalCase);
      expect(result.current.currentCase!.patient.firstName).toBe('Janet');
    });
    
  });

  // ============================================================================
  // ASSESSMENT OPERATIONS TESTS
  // ============================================================================

  describe('updateAssessment', () => {
    
    it('should update the BI-RADS assessment', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      const assessment = {
        rightBreast: {
          composition: 'b' as const,
          biRadsCategory: '2' as const,
        },
        leftBreast: {
          composition: 'c' as const,
          biRadsCategory: '1' as const,
        },
        overallCategory: '2' as const,
        impression: 'Benign findings.',
        recommendation: 'Routine annual screening.',
        comparedToPrior: false,
      };
      
      await act(async () => {
        result.current.updateAssessment(assessment as unknown as BiRadsAssessment);
      });
      
      expect(result.current.currentCase?.assessment).toEqual(assessment);
    });
    
    it('should return error when no case is loaded', async () => {
      const { result } = renderWithProvider();
      
      const assessment = {
        rightBreast: {
          composition: 'b' as const,
          biRadsCategory: '2' as const,
        },
        leftBreast: {
          composition: 'b' as const,
          biRadsCategory: '1' as const,
        },
        overallCategory: '2' as const,
        impression: 'Test',
        recommendation: 'Test',
        comparedToPrior: false,
      };
      
      let updateResult: any;
      await act(async () => {
        updateResult = result.current.updateAssessment(assessment as unknown as BiRadsAssessment);
      });
      
      expect(updateResult.success).toBe(false);
      expect(updateResult.error?.code).toBe('NO_CASE');
    });
    
    it('should update the workflow step after assessment', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      const assessment = {
        rightBreast: {
          composition: 'b' as const,
          biRadsCategory: '1' as const,
        },
        leftBreast: {
          composition: 'b' as const,
          biRadsCategory: '1' as const,
        },
        overallCategory: '1' as const,
        impression: 'Normal.',
        recommendation: 'Annual screening.',
        comparedToPrior: false,
      };
      
      await act(async () => {
        result.current.updateAssessment(assessment as unknown as BiRadsAssessment);
      });
      
      expect(result.current.currentCase?.workflow.completedSteps).toContain('birads_assessment');
    });
    
  });

  // ============================================================================
  // REPORT OPERATIONS TESTS
  // ============================================================================

  describe('updateReport', () => {
    
    it('should update the generated report', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      const report = {
        id: 'report-001',
        status: 'draft' as const,
        content: {
          header: 'MAMMOGRAPHY REPORT',
          clinicalHistory: 'Screening.',
          technique: '4-view digital mammography.',
          comparison: 'None.',
          findings: 'Unremarkable.',
          impression: 'BI-RADS 1.',
          recommendation: 'Annual screening.',
        },
        generatedAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      };
      
      await act(async () => {
        result.current.updateReport(report);
      });
      
      expect(result.current.currentCase?.report).toEqual(report);
    });
    
    it('should return error when no case is loaded', async () => {
      const { result } = renderWithProvider();
      
      const report = {
        id: 'report-001',
        status: 'draft' as const,
        content: {
          header: 'Test',
          clinicalHistory: 'Test',
          technique: 'Test',
          comparison: 'Test',
          findings: 'Test',
          impression: 'Test',
          recommendation: 'Test',
        },
        generatedAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      };
      
      let updateResult: any;
      await act(async () => {
        updateResult = result.current.updateReport(report);
      });
      
      expect(updateResult.success).toBe(false);
      expect(updateResult.error?.code).toBe('NO_CASE');
    });
    
  });

  describe('generateReport', () => {
    
    it('should generate a report from the current case', async () => {
      const { result } = renderWithProvider();
      
      // Create case and set assessment
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      const assessment = {
        rightBreast: {
          composition: 'b' as const,
          biRadsCategory: '1' as const,
        },
        leftBreast: {
          composition: 'b' as const,
          biRadsCategory: '1' as const,
        },
        overallCategory: '1' as const,
        impression: 'Negative bilateral mammogram.',
        recommendation: 'Routine annual screening.',
        comparedToPrior: false,
      };
      
      await act(async () => {
        result.current.updateAssessment(assessment as unknown as BiRadsAssessment);
      });
      
      await act(async () => {
        result.current.generateReport();
      });
      
      expect(result.current.currentCase?.report).toBeDefined();
      expect(result.current.currentCase?.report?.status).toBe('draft');
    });
    
    it('should return error when no case is loaded', async () => {
      const { result } = renderWithProvider();
      
      let generateResult: any;
      await act(async () => {
        generateResult = result.current.generateReport();
      });
      
      expect(generateResult.success).toBe(false);
      expect(generateResult.error?.code).toBe('NO_CASE');
    });
    
  });

  describe('finalizeReport', () => {
    
    it('should finalize a draft report', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      // Set up assessment and generate report
      const assessment = {
        rightBreast: {
          composition: 'b' as const,
          biRadsCategory: '1' as const,
        },
        leftBreast: {
          composition: 'b' as const,
          biRadsCategory: '1' as const,
        },
        overallCategory: '1' as const,
        impression: 'Negative.',
        recommendation: 'Annual screening.',
        comparedToPrior: false,
      };
      
      await act(async () => {
        result.current.updateAssessment(assessment as unknown as BiRadsAssessment);
        result.current.generateReport();
      });
      
      await act(async () => {
        result.current.finalizeReport();
      });
      
      expect(result.current.currentCase?.report?.status).toBe('pending_review');
    });
    
  });

  describe('signReport', () => {
    
    it('should sign a pending_review report', async () => {
      const { result } = renderWithProvider();
      
      await act(async () => {
        await result.current.createCase(
          createValidPatientInfo(),
          createValidClinicalHistory()
        );
      });
      
      // Set up assessment and generate report
      const assessment = {
        rightBreast: {
          composition: 'b' as const,
          biRadsCategory: '1' as const,
        },
        leftBreast: {
          composition: 'b' as const,
          biRadsCategory: '1' as const,
        },
        overallCategory: '1' as const,
        impression: 'Negative.',
        recommendation: 'Annual screening.',
        comparedToPrior: false,
      };
      
      // Sequence operations across separate act blocks so React state flushes between each
      await act(async () => {
        result.current.updateAssessment(assessment as unknown as BiRadsAssessment);
      });
      
      await act(async () => {
        result.current.generateReport();
      });
      
      await act(async () => {
        result.current.finalizeReport();
      });
      
      expect(result.current.currentCase?.report?.status).toBe('pending_review');
      
      await act(async () => {
        result.current.signReport('signature-hash-123');
      });
      
      expect(result.current.currentCase?.report?.status).toBe('signed');
    });
    
  });
  
});
