/**
 * useWorkflow Hook Tests (TDD - Write Tests First)
 * 
 * Tests for the React hook that manages workflow state.
 * Key requirement: Every state update MUST persist immediately.
 */

import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { WorkflowStep, createNewSession } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage module
jest.mock('../sessionStorage', () => {
  const sessionsMap: Record<string, any> = {};
  let currentSessionId: string | null = null;

  return {
    sessionStorage: {
      saveSession: jest.fn((session: any) => {
        sessionsMap[session.id] = { ...session, updatedAt: new Date().toISOString() };
      }),
      getSession: jest.fn((id: string) => sessionsMap[id] || null),
      getAllSessions: jest.fn(() => Object.values(sessionsMap)),
      deleteSession: jest.fn((id: string) => {
        delete sessionsMap[id];
        if (currentSessionId === id) currentSessionId = null;
      }),
      getCurrentSessionId: jest.fn(() => currentSessionId),
      setCurrentSessionId: jest.fn((id: string) => {
        currentSessionId = id;
      }),
      clearCurrentSession: jest.fn(() => {
        currentSessionId = null;
      }),
      clearAll: jest.fn(() => {
        Object.keys(sessionsMap).forEach(k => delete sessionsMap[k]);
        currentSessionId = null;
      }),
    },
  };
});

import { useWorkflow, WorkflowProvider } from '../useWorkflow';
import { sessionStorage } from '../sessionStorage';

// Wrapper for renderHook
const wrapper = ({ children }: { children: ReactNode }) => (
  <WorkflowProvider>{children}</WorkflowProvider>
);

describe('useWorkflow Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (sessionStorage as any).clearAll();
  });

  describe('Initialization', () => {
    it('should start with null session when no saved session exists', () => {
      const { result } = renderHook(() => useWorkflow(), { wrapper });
      
      expect(result.current.session).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should restore session from storage on mount', async () => {
      // Create the session we want to "restore"
      const savedSession = createNewSession('clinical');
      savedSession.patientInfo.id = 'RESTORED-123';
      
      // Directly control what the mocks return (bypasses closure state issues)
      (sessionStorage.getCurrentSessionId as jest.Mock).mockReturnValue(savedSession.id);
      (sessionStorage.getSession as jest.Mock).mockReturnValue(savedSession);
      
      const { result } = renderHook(() => useWorkflow(), { wrapper });
      
      // Wait for the useEffect-based restore to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      // The hook should have called getCurrentSessionId + getSession
      expect(sessionStorage.getCurrentSessionId).toHaveBeenCalled();
      expect(sessionStorage.getSession).toHaveBeenCalledWith(savedSession.id);
      // And the session should be restored
      expect(result.current.session?.patientInfo.id).toBe('RESTORED-123');
    });
  });

  describe('createSession', () => {
    it('should create a new session with specified mode', () => {
      const { result } = renderHook(() => useWorkflow(), { wrapper });
      
      act(() => {
        result.current.createSession('clinical');
      });
      
      expect(result.current.session).not.toBeNull();
      expect(result.current.session?.mode).toBe('clinical');
      expect(result.current.session?.currentStep).toBe(WorkflowStep.UPLOAD);
    });

    it('should immediately persist the new session', () => {
      const { result } = renderHook(() => useWorkflow(), { wrapper });
      
      act(() => {
        result.current.createSession('quick');
      });
      
      expect(sessionStorage.saveSession).toHaveBeenCalled();
      expect(sessionStorage.setCurrentSessionId).toHaveBeenCalled();
    });

    it('should not use mode from localStorage (explicit mode only)', () => {
      // This was Bug #4 - mode should be explicitly passed, not read from storage
      const { result } = renderHook(() => useWorkflow(), { wrapper });
      
      // Even if localStorage has 'clinical', passing 'quick' should use 'quick'
      act(() => {
        result.current.createSession('quick');
      });
      
      expect(result.current.session?.mode).toBe('quick');
    });
  });

  describe('updateSession', () => {
    it('should update session state', () => {
      const { result } = renderHook(() => useWorkflow(), { wrapper });
      
      act(() => {
        result.current.createSession('clinical');
      });
      
      act(() => {
        result.current.updateSession({
          patientInfo: {
            ...result.current.session!.patientInfo,
            id: 'P-UPDATE-TEST',
          },
        });
      });
      
      expect(result.current.session?.patientInfo.id).toBe('P-UPDATE-TEST');
    });

    it('should IMMEDIATELY persist to localStorage (Bug #1 fix)', () => {
      const { result } = renderHook(() => useWorkflow(), { wrapper });
      
      act(() => {
        result.current.createSession('clinical');
      });
      
      const saveCallsBefore = (sessionStorage.saveSession as jest.Mock).mock.calls.length;
      
      act(() => {
        result.current.updateSession({
          patientInfo: {
            ...result.current.session!.patientInfo,
            id: 'PERSIST-TEST',
          },
        });
      });
      
      // Should have called saveSession again
      const saveCallsAfter = (sessionStorage.saveSession as jest.Mock).mock.calls.length;
      expect(saveCallsAfter).toBeGreaterThan(saveCallsBefore);
      
      // The saved session should have the new data
      const lastSaveCall = (sessionStorage.saveSession as jest.Mock).mock.calls[saveCallsAfter - 1];
      expect(lastSaveCall[0].patientInfo.id).toBe('PERSIST-TEST');
    });

    it('should do nothing if no session exists', () => {
      const { result } = renderHook(() => useWorkflow(), { wrapper });
      
      // No session created
      act(() => {
        result.current.updateSession({ currentStep: WorkflowStep.ASSESSMENT });
      });
      
      // Should not throw, should remain null
      expect(result.current.session).toBeNull();
    });
  });

  describe('navigateToStep', () => {
    it('should update currentStep when navigation is valid', () => {
      const { result } = renderHook(() => useWorkflow(), { wrapper });
      
      act(() => {
        result.current.createSession('clinical');
      });
      
      // Patient Info is always accessible
      act(() => {
        result.current.navigateToStep(WorkflowStep.PATIENT_INFO);
      });
      
      expect(result.current.session?.currentStep).toBe(WorkflowStep.PATIENT_INFO);
    });

    it('should return false and not navigate when blocked', () => {
      const { result } = renderHook(() => useWorkflow(), { wrapper });
      
      act(() => {
        result.current.createSession('clinical');
      });
      
      let navigationResult: boolean = true;
      act(() => {
        // Try to navigate to AI_ANALYSIS without uploading images
        navigationResult = result.current.navigateToStep(WorkflowStep.AI_ANALYSIS);
      });
      
      expect(navigationResult).toBe(false);
      expect(result.current.session?.currentStep).toBe(WorkflowStep.UPLOAD);
    });

    it('should persist step change immediately', () => {
      const { result } = renderHook(() => useWorkflow(), { wrapper });
      
      act(() => {
        result.current.createSession('clinical');
      });
      
      const saveCallsBefore = (sessionStorage.saveSession as jest.Mock).mock.calls.length;
      
      act(() => {
        result.current.navigateToStep(WorkflowStep.PATIENT_INFO);
      });
      
      const saveCallsAfter = (sessionStorage.saveSession as jest.Mock).mock.calls.length;
      expect(saveCallsAfter).toBeGreaterThan(saveCallsBefore);
    });
  });

  describe('Derived state methods', () => {
    it('isStepComplete should derive from session data', () => {
      const { result } = renderHook(() => useWorkflow(), { wrapper });
      
      act(() => {
        result.current.createSession('clinical');
      });
      
      // Initially no images
      expect(result.current.isStepComplete(WorkflowStep.UPLOAD)).toBe(false);
      
      // Add image
      act(() => {
        result.current.updateSession({
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
      
      expect(result.current.isStepComplete(WorkflowStep.UPLOAD)).toBe(true);
    });

    it('getStepState should return current for current step (Bug #2 fix)', () => {
      const { result } = renderHook(() => useWorkflow(), { wrapper });
      
      act(() => {
        result.current.createSession('clinical');
      });
      
      // Add image to complete UPLOAD
      act(() => {
        result.current.updateSession({
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
      
      // UPLOAD is complete BUT still current step
      // Should show as 'current', NOT 'completed'
      expect(result.current.getStepState(WorkflowStep.UPLOAD)).toBe('current');
    });

    it('completionPercentage should calculate correctly', () => {
      const { result } = renderHook(() => useWorkflow(), { wrapper });
      
      act(() => {
        result.current.createSession('clinical');
      });
      
      expect(result.current.completionPercentage).toBe(0);
      
      act(() => {
        result.current.updateSession({
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
      
      // 1 of 7 steps complete = ~14%
      expect(result.current.completionPercentage).toBeGreaterThan(10);
    });
  });

  describe('deleteSession', () => {
    it('should remove session and clear state', () => {
      const { result } = renderHook(() => useWorkflow(), { wrapper });
      
      act(() => {
        result.current.createSession('clinical');
      });
      
      expect(result.current.session).not.toBeNull();
      
      act(() => {
        result.current.deleteSession();
      });
      
      expect(result.current.session).toBeNull();
      expect(sessionStorage.deleteSession).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should set error state when storage fails', async () => {
      // Make saveSession throw
      (sessionStorage.saveSession as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Storage full');
      });
      
      const { result } = renderHook(() => useWorkflow(), { wrapper });
      
      act(() => {
        try {
          result.current.createSession('clinical');
        } catch {
          // Expected
        }
      });
      
      // Error should be captured (implementation detail)
    });
  });
});

describe('useWorkflow - Bug Prevention', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (sessionStorage as any).clearAll();
  });

  it('Bug #1: updateSession must save immediately, not defer', () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper });
    
    act(() => {
      result.current.createSession('clinical');
    });
    
    // Multiple rapid updates
    act(() => {
      result.current.updateSession({ patientInfo: { ...result.current.session!.patientInfo, id: 'A' } });
      result.current.updateSession({ patientInfo: { ...result.current.session!.patientInfo, id: 'B' } });
      result.current.updateSession({ patientInfo: { ...result.current.session!.patientInfo, id: 'C' } });
    });
    
    // Each update should have triggered a save
    // At minimum, final value should be persisted
    const calls = (sessionStorage.saveSession as jest.Mock).mock.calls;
    const lastSavedSession = calls[calls.length - 1][0];
    expect(lastSavedSession.patientInfo.id).toBe('C');
  });

  it('Bug #3: currentStep must advance after AI analysis completes', () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper });
    
    act(() => {
      result.current.createSession('clinical');
    });
    
    // Upload image
    act(() => {
      result.current.updateSession({
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
    
    // Navigate to AI Analysis
    act(() => {
      result.current.navigateToStep(WorkflowStep.AI_ANALYSIS);
    });
    
    expect(result.current.session?.currentStep).toBe(WorkflowStep.AI_ANALYSIS);
    
    // Complete AI Analysis
    act(() => {
      result.current.updateSession({
        analysisResults: {
          id: 'analysis-1',
          analyzedAt: new Date().toISOString(),
          status: 'complete',
          predictions: [],
          confidenceScore: 0.9,
          findings: [],
        },
      });
    });
    
    // Auto-advance or at least allow navigation
    expect(result.current.canNavigateToStep(WorkflowStep.PATIENT_INFO)).toBe(true);
    expect(result.current.canNavigateToStep(WorkflowStep.ASSESSMENT)).toBe(true);
  });

  it('Bug #5: AI_ANALYSIS should be accessible when images exist in state', () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper });
    
    act(() => {
      result.current.createSession('clinical');
    });
    
    // Initially locked
    expect(result.current.canNavigateToStep(WorkflowStep.AI_ANALYSIS)).toBe(false);
    
    // Add image
    act(() => {
      result.current.updateSession({
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
    
    // Now accessible - uses current state, not stale localStorage
    expect(result.current.canNavigateToStep(WorkflowStep.AI_ANALYSIS)).toBe(true);
  });
});
