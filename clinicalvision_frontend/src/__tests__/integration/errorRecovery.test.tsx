/**
 * Error Recovery Integration Tests - Phase E.4
 * 
 * Tests the system's resilience to failures:
 * 1. Corrupt localStorage → schema validation rejects and recovers
 * 2. localStorage full/unavailable → error handling
 * 3. Invalid session data → isValidSession filter
 * 4. Concurrent session corruption → state integrity
 * 5. Browser crash simulation → session recovery from localStorage
 * 6. Provider error boundary → graceful degradation
 * 7. Hook error state management
 */

import React, { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import {
  WorkflowStep,
  WorkflowSession,
  Measurement,
  createNewSession,
  isValidSession,
} from '../../workflow-v3/types';
import { sessionStorage } from '../../workflow-v3/sessionStorage';
import { STORAGE_KEYS } from '../../workflow-v3/constants';
import { WorkflowProvider, useWorkflow } from '../../workflow-v3/useWorkflow';

// ============================================================================
// TEST SETUP
// ============================================================================

beforeEach(() => {
  window.localStorage.clear();
  jest.restoreAllMocks();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <WorkflowProvider>{children}</WorkflowProvider>
);

// ============================================================================
// 1. CORRUPT LOCALSTORAGE DATA
// ============================================================================

describe('Error Recovery: Corrupt localStorage', () => {
  it('should handle malformed JSON in localStorage gracefully', () => {
    // Write garbage to localStorage
    window.localStorage.setItem(STORAGE_KEYS.SESSIONS, 'NOT_VALID_JSON{{{');
    window.localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION_ID, 'fake-id');

    // sessionStorage.getSession should not crash — it should return null or throw safely
    expect(() => {
      sessionStorage.getSession('fake-id');
    }).not.toThrow();
  });

  it('should reject sessions with missing required fields', () => {
    // Create a session-like object missing critical fields
    const badSession = {
      id: 'test-bad',
      createdAt: new Date().toISOString(),
      // missing: updatedAt, currentStep, mode, status, images, etc.
    };

    expect(isValidSession(badSession)).toBe(false);
  });

  it('should reject sessions with invalid step values', () => {
    const badSession = {
      ...createNewSession('clinical'),
      currentStep: 999, // Invalid WorkflowStep
    };

    // isValidSession should reject this
    expect(isValidSession(badSession)).toBe(false);
  });

  it('should reject sessions with invalid mode', () => {
    const badSession = {
      ...createNewSession('clinical'),
      mode: 'turbo' as any, // Invalid mode
    };

    expect(isValidSession(badSession)).toBe(false);
  });

  it('should reject sessions with invalid status', () => {
    const badSession = {
      ...createNewSession('clinical'),
      status: 'exploded' as any, // Invalid status
    };

    expect(isValidSession(badSession)).toBe(false);
  });

  it('should reject sessions where images is not an array', () => {
    const badSession = {
      ...createNewSession('clinical'),
      images: 'not-an-array' as any,
    };

    expect(isValidSession(badSession)).toBe(false);
  });

  it('should reject sessions where measurements is not an array', () => {
    const badSession = {
      ...createNewSession('clinical'),
      measurements: { bad: true } as any,
    };

    expect(isValidSession(badSession)).toBe(false);
  });

  it('should accept valid sessions', () => {
    const goodSession = createNewSession('clinical');
    expect(isValidSession(goodSession)).toBe(true);
  });

  it('should handle corrupt session in localStorage and still mount provider', async () => {
    // Write a corrupt session map to localStorage
    const corruptData = JSON.stringify({
      'session-corrupt': {
        id: 'session-corrupt',
        // Missing most required fields
      },
    });
    window.localStorage.setItem(STORAGE_KEYS.SESSIONS, corruptData);
    window.localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION_ID, 'session-corrupt');

    // Provider should still mount — the corrupt session should be filtered out
    const { result } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Session should be null (corrupt session was rejected)
    expect(result.current.session).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});

// ============================================================================
// 2. LOCALSTORAGE UNAVAILABLE / FULL
// ============================================================================

describe('Error Recovery: localStorage Failures', () => {
  it('should handle localStorage.setItem throwing (quota exceeded)', async () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    act(() => {
      result.current.createSession('clinical');
    });

    // Now make setItem throw
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = jest.fn(() => {
      throw new DOMException('QuotaExceededError');
    });

    // updateSession should NOT crash (sessionStorage catches internally)
    expect(() => {
      act(() => {
        result.current.updateSession({
          images: [
            {
              id: 'img-1',
              file: null,
              fileName: 'test.dcm',
              fileSize: 1024,
              preview: '',
              uploadedAt: new Date().toISOString(),
              metadata: { width: 100, height: 100, type: 'dicom' },
            },
          ],
        });
      });
    }).not.toThrow();

    // In-memory state still updated (persistence failed silently)
    expect(result.current.session?.images).toHaveLength(1);

    // Restore
    Storage.prototype.setItem = originalSetItem;
  });

  it('should handle localStorage.getItem throwing', () => {
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = jest.fn(() => {
      throw new Error('SecurityError: localStorage access denied');
    });

    // sessionStorage should handle this gracefully
    expect(() => {
      sessionStorage.getSession('any-id');
    }).not.toThrow();

    Storage.prototype.getItem = originalGetItem;
  });
});

// ============================================================================
// 3. SCHEMA VALIDATION ON READ
// ============================================================================

describe('Error Recovery: Session Schema Validation', () => {
  it('should filter out invalid sessions when reading all sessions', () => {
    // Write a mix of valid and invalid sessions
    const validSession = createNewSession('clinical');
    const invalidSession = {
      id: 'bad-session',
      createdAt: 'not-a-date',
      // Missing most fields
    };

    const sessionsMap = {
      [validSession.id]: validSession,
      'bad-session': invalidSession,
    };

    window.localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessionsMap));

    // getAllSessions should only return the valid one
    const sessions = sessionStorage.getAllSessions();
    const validIds = sessions.map((s) => s.id);
    expect(validIds).toContain(validSession.id);
    expect(validIds).not.toContain('bad-session');
  });

  it('should not crash on empty localStorage', () => {
    window.localStorage.clear();

    expect(() => sessionStorage.getAllSessions()).not.toThrow();
    expect(sessionStorage.getAllSessions()).toEqual([]);
    expect(sessionStorage.getCurrentSessionId()).toBeNull();
  });

  it('should handle null session storage data', () => {
    window.localStorage.setItem(STORAGE_KEYS.SESSIONS, 'null');

    expect(() => sessionStorage.getAllSessions()).not.toThrow();
  });
});

// ============================================================================
// 4. CONCURRENT STATE INTEGRITY
// ============================================================================

describe('Error Recovery: State Integrity', () => {
  it('should handle rapid updateSession calls without data loss', async () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    act(() => {
      result.current.createSession('clinical');
    });

    // Rapid sequential updates
    act(() => {
      result.current.updateSession({
        images: [
          {
            id: 'img-1',
            file: null,
            fileName: 'a.dcm',
            fileSize: 1024,
            preview: '',
            uploadedAt: new Date().toISOString(),
            metadata: { width: 100, height: 100, type: 'dicom' },
          },
        ],
      });
    });

    act(() => {
      result.current.updateSession({
        patientInfo: {
          id: 'PAT-001',
          name: 'Test',
          dateOfBirth: '1980-01-01',
          gender: 'female',
          clinicalHistory: {
            previousMammograms: false,
            familyHistory: false,
            priorBiopsies: false,
            hormoneTherapy: false,
          },
        },
      });
    });

    act(() => {
      result.current.updateSession({
        measurements: [{ id: 'm1', type: 'distance', value: 5, unit: 'mm', imageId: 'img-1' } as unknown as Measurement],
      });
    });

    // All three updates should be reflected
    expect(result.current.session?.images).toHaveLength(1);
    expect(result.current.session?.patientInfo.id).toBe('PAT-001');
    expect(result.current.session?.measurements).toHaveLength(1);
  });

  it('should not allow updateSession to corrupt other fields', async () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    act(() => {
      result.current.createSession('clinical');
    });

    const originalId = result.current.session!.id;
    const originalMode = result.current.session!.mode;

    // Update one field
    act(() => {
      result.current.updateSession({
        images: [
          {
            id: 'img-1',
            file: null,
            fileName: 'test.dcm',
            fileSize: 1024,
            preview: '',
            uploadedAt: new Date().toISOString(),
            metadata: { width: 100, height: 100, type: 'dicom' },
          },
        ],
      });
    });

    // Other fields should be unchanged
    expect(result.current.session?.id).toBe(originalId);
    expect(result.current.session?.mode).toBe(originalMode);
    expect(result.current.session?.patientInfo).toBeDefined();
    expect(result.current.session?.measurements).toEqual([]);
  });
});

// ============================================================================
// 5. BROWSER CRASH RECOVERY SIMULATION
// ============================================================================

describe('Error Recovery: Crash Recovery', () => {
  it('should recover mid-workflow session after provider remount', async () => {
    // Create and progress a session
    const { result, unmount } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    act(() => {
      result.current.createSession('clinical');
    });

    act(() => {
      result.current.updateSession({
        images: [
          {
            id: 'img-1',
            file: null,
            fileName: 'test.dcm',
            fileSize: 5242880,
            preview: '',
            uploadedAt: new Date().toISOString(),
            metadata: { width: 3328, height: 4096, type: 'dicom' },
          },
        ],
      });
    });

    act(() => {
      result.current.navigateToStep(WorkflowStep.AI_ANALYSIS);
    });

    const sessionId = result.current.session!.id;

    // Simulate crash (abrupt unmount without cleanup)
    unmount();

    // "Restart" the application
    const { result: recovered } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    // Session should be recovered
    expect(recovered.current.session).not.toBeNull();
    expect(recovered.current.session?.id).toBe(sessionId);
    expect(recovered.current.session?.currentStep).toBe(WorkflowStep.AI_ANALYSIS);
    expect(recovered.current.session?.images).toHaveLength(1);
  });
});

// ============================================================================
// 6. HOOK ERROR STATE MANAGEMENT
// ============================================================================

describe('Error Recovery: Hook Error Handling', () => {
  it('should start with no error', async () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.error).toBeNull();
  });

  it('should allow clearing errors via clearError', async () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Start with no error
    expect(result.current.error).toBeNull();

    // Verify clearError doesn't crash even when no error exists
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should not crash when updateSession is called with no session', async () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // No session created, update should be a no-op
    act(() => {
      result.current.updateSession({ images: [] });
    });

    expect(result.current.session).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should return false when navigating with no session', async () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    let navResult = false;
    act(() => {
      navResult = result.current.navigateToStep(WorkflowStep.UPLOAD);
    });

    expect(navResult).toBe(false);
  });

  it('should handle delete with no active session', async () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Should not crash
    act(() => {
      result.current.deleteSession();
    });

    expect(result.current.session).toBeNull();
  });
});

// ============================================================================
// 7. EDGE CASES
// ============================================================================

describe('Error Recovery: Edge Cases', () => {
  it('should handle creating session when one already exists', async () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    act(() => {
      result.current.createSession('clinical');
    });

    const firstId = result.current.session!.id;

    // Create another session (should replace)
    act(() => {
      result.current.createSession('quick');
    });

    expect(result.current.session?.id).not.toBe(firstId);
    expect(result.current.session?.mode).toBe('quick');
  });

  it('should handle isValidSession with completely wrong types', () => {
    expect(isValidSession(null)).toBe(false);
    expect(isValidSession(undefined)).toBe(false);
    expect(isValidSession(42)).toBe(false);
    expect(isValidSession('string')).toBe(false);
    expect(isValidSession([])).toBe(false);
    expect(isValidSession({})).toBe(false);
  });

  it('should handle empty string session ID', () => {
    const result = sessionStorage.getSession('');
    expect(result).toBeNull();
  });

  it('should handle very long session data without crashing', async () => {
    const { result } = renderHook(() => useWorkflow(), { wrapper });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    act(() => {
      result.current.createSession('clinical');
    });

    // Create many images
    const manyImages = Array.from({ length: 50 }, (_, i) => ({
      id: `img-${i}`,
      file: null,
      fileName: `image-${i}.dcm`,
      fileSize: 5242880,
      preview: '',
      uploadedAt: new Date().toISOString(),
      metadata: { width: 3328, height: 4096, type: 'dicom' },
    }));

    act(() => {
      result.current.updateSession({ images: manyImages });
    });

    expect(result.current.session?.images).toHaveLength(50);
  });
});
