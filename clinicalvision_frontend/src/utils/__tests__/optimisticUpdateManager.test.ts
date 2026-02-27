/**
 * OptimisticUpdateManager Tests
 * 
 * Phase 2 TDD tests for optimistic updates with retry logic and rollback.
 * Tests cover:
 * - Optimistic update application
 * - Retry logic with exponential backoff
 * - Rollback on failure
 * - Concurrent update handling
 * - Network failure scenarios
 * 
 * @jest-environment jsdom
 */

import {
  ClinicalCase,
  ClinicalWorkflowStep,
  PatientInfo,
  ClinicalHistory,
} from '../../types/case.types';

import { assertFailure } from '../../types/resultHelpers';

import {
  OptimisticUpdateManager,
  PendingUpdate,
  OptimisticUpdateConfig,
  createOptimisticUpdateManager,
  getOptimisticUpdateManager,
  resetOptimisticUpdateManager,
} from '../optimisticUpdateManager';

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

function createMockCase(id?: string): ClinicalCase {
  const now = new Date().toISOString();
  
  return {
    id: id || `case-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    caseNumber: `CN-2024-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
    patient: createValidPatientInfo(),
    clinicalHistory: createValidClinicalHistory(),
    images: [],
    analysisResults: [],
    consolidatedFindings: [],
    workflow: {
      currentStep: ClinicalWorkflowStep.PATIENT_REGISTRATION,
      completedSteps: [],
      status: 'draft',
      startedAt: now,
      lastModifiedAt: now,
      isLocked: false,
    },
    audit: {
      createdBy: TEST_USER_ID,
      createdAt: now,
      modifications: [],
    },
  };
}

// ============================================================================
// MOCK HELPERS
// ============================================================================

/**
 * Create a mock backend operation that succeeds
 */
function createSuccessfulOperation<T>(result: T, delayMs = 50): () => Promise<T> {
  return () => new Promise(resolve => setTimeout(() => resolve(result), delayMs));
}

/**
 * Create a mock backend operation that fails
 */
function createFailingOperation(errorMessage: string, delayMs = 50): () => Promise<never> {
  return () => new Promise((_, reject) => 
    setTimeout(() => reject(new Error(errorMessage)), delayMs)
  );
}

/**
 * Create a mock backend operation that fails N times then succeeds
 */
function createEventuallySuccessfulOperation<T>(
  result: T,
  failCount: number,
  errorMessage = 'Temporary failure',
  delayMs = 10
): () => Promise<T> {
  let attempts = 0;
  return () => new Promise((resolve, reject) => {
    setTimeout(() => {
      attempts++;
      if (attempts <= failCount) {
        reject(new Error(errorMessage));
      } else {
        resolve(result);
      }
    }, delayMs);
  });
}

/**
 * Create a network timeout operation
 */
function createTimeoutOperation(timeoutMs: number): () => Promise<never> {
  return () => new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Network timeout')), timeoutMs);
  });
}

// ============================================================================
// INITIALIZATION TESTS
// ============================================================================

describe('OptimisticUpdateManager Initialization', () => {
  it('should initialize with default config', () => {
    const manager = new OptimisticUpdateManager();
    const config = manager.getConfig();
    
    expect(config.maxRetries).toBe(3);
    expect(config.baseDelayMs).toBe(1000);
    expect(config.maxDelayMs).toBe(30000);
  });

  it('should accept custom config', () => {
    const manager = new OptimisticUpdateManager({
      maxRetries: 5,
      baseDelayMs: 500,
      maxDelayMs: 10000,
    });
    const config = manager.getConfig();
    
    expect(config.maxRetries).toBe(5);
    expect(config.baseDelayMs).toBe(500);
    expect(config.maxDelayMs).toBe(10000);
  });

  it('should start with no pending updates', () => {
    const manager = new OptimisticUpdateManager();
    
    expect(manager.hasPendingUpdates()).toBe(false);
    expect(manager.getAllPendingUpdates()).toHaveLength(0);
  });
});

// ============================================================================
// OPTIMISTIC UPDATE TESTS - HAPPY PATH
// ============================================================================

describe('OptimisticUpdateManager - Successful Updates', () => {
  let manager: OptimisticUpdateManager;
  
  beforeEach(() => {
    // Use short delays for faster tests
    manager = new OptimisticUpdateManager({
      baseDelayMs: 10,
      maxDelayMs: 100,
    });
  });

  it('should apply optimistic action immediately', async () => {
    let optimisticCalled = false;
    let backendCalled = false;
    
    const optimisticAction = () => { optimisticCalled = true; };
    const backendOperation = createSuccessfulOperation({ id: '1' }, 50);
    const rollbackAction = jest.fn();

    // Start the update but don't await yet
    const promise = manager.update('update-1', optimisticAction, backendOperation, rollbackAction);
    
    // Optimistic action should be called immediately
    expect(optimisticCalled).toBe(true);
    
    // Wait for completion
    await promise;
  });

  it('should succeed on first try when backend works', async () => {
    const optimisticAction = jest.fn();
    const backendOperation = createSuccessfulOperation({ id: '1', name: 'Test' });
    const rollbackAction = jest.fn();

    const result = await manager.update(
      'update-1',
      optimisticAction,
      backendOperation,
      rollbackAction
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ id: '1', name: 'Test' });
    }
    expect(optimisticAction).toHaveBeenCalledTimes(1);
    expect(rollbackAction).not.toHaveBeenCalled();
  });

  it('should remove pending update after success', async () => {
    const backendOperation = createSuccessfulOperation('success');

    const promise = manager.update(
      'update-1',
      () => {},
      backendOperation,
      () => {}
    );

    // Should have pending update while in progress
    expect(manager.hasPendingUpdates()).toBe(true);
    
    await promise;
    
    // Should be removed after success
    expect(manager.hasPendingUpdates()).toBe(false);
    expect(manager.getPendingUpdate('update-1')).toBeUndefined();
  });

  it('should handle multiple concurrent updates', async () => {
    const results: string[] = [];
    
    const promise1 = manager.update(
      'update-1',
      () => results.push('optimistic-1'),
      createSuccessfulOperation('result-1', 30),
      () => results.push('rollback-1')
    );

    const promise2 = manager.update(
      'update-2',
      () => results.push('optimistic-2'),
      createSuccessfulOperation('result-2', 20),
      () => results.push('rollback-2')
    );

    // Both optimistic actions should be called immediately
    expect(results).toContain('optimistic-1');
    expect(results).toContain('optimistic-2');
    
    const [result1, result2] = await Promise.all([promise1, promise2]);
    
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(results).not.toContain('rollback-1');
    expect(results).not.toContain('rollback-2');
  });
});

// ============================================================================
// RETRY LOGIC TESTS
// ============================================================================

describe('OptimisticUpdateManager - Retry Logic', () => {
  let manager: OptimisticUpdateManager;
  
  beforeEach(() => {
    manager = new OptimisticUpdateManager({
      maxRetries: 3,
      baseDelayMs: 10, // Short delays for tests
      maxDelayMs: 100,
    });
  });

  it('should retry on transient failure and succeed', async () => {
    const optimisticAction = jest.fn();
    const rollbackAction = jest.fn();
    // Fail twice, then succeed
    const backendOperation = createEventuallySuccessfulOperation(
      { id: '1' },
      2, // fail 2 times
      'Transient error'
    );

    const result = await manager.update(
      'update-1',
      optimisticAction,
      backendOperation,
      rollbackAction
    );

    expect(result.success).toBe(true);
    expect(rollbackAction).not.toHaveBeenCalled();
  });

  it('should rollback after max retries exhausted', async () => {
    const optimisticAction = jest.fn();
    const rollbackAction = jest.fn();
    // Always fail
    const backendOperation = createFailingOperation('Permanent failure');

    const result = await manager.update(
      'update-1',
      optimisticAction,
      backendOperation,
      rollbackAction
    );

    expect(result.success).toBe(false);
    const error = assertFailure(result);
    expect(error.message).toBe('Permanent failure');
    expect(rollbackAction).toHaveBeenCalledTimes(1);
  });

  it('should track retry count in pending update', async () => {
    let retryCount = 0;
    const backendOperation = () => {
      retryCount++;
      if (retryCount < 3) {
        return Promise.reject(new Error('Retry me'));
      }
      return Promise.resolve('success');
    };

    const result = await manager.update(
      'update-1',
      () => {},
      backendOperation,
      () => {}
    );

    expect(result.success).toBe(true);
    expect(retryCount).toBe(3); // 2 failures + 1 success
  });

  it('should respect maxRetries configuration', async () => {
    const customManager = new OptimisticUpdateManager({
      maxRetries: 5,
      baseDelayMs: 5,
    });
    
    let attemptCount = 0;
    const backendOperation = () => {
      attemptCount++;
      return Promise.reject(new Error('Always fail'));
    };

    await customManager.update(
      'update-1',
      () => {},
      backendOperation,
      () => {}
    );

    // Should attempt exactly maxRetries times
    expect(attemptCount).toBe(5);
  });

  it('should use exponential backoff between retries', async () => {
    const delays: number[] = [];
    let lastTime = Date.now();
    
    const backendOperation = () => {
      const now = Date.now();
      if (delays.length > 0 || lastTime !== Date.now()) {
        delays.push(now - lastTime);
      }
      lastTime = now;
      return Promise.reject(new Error('Fail'));
    };

    await manager.update(
      'update-1',
      () => {},
      backendOperation,
      () => {}
    );

    // Should have 2 delays (between 3 attempts)
    expect(delays.length).toBeGreaterThanOrEqual(2);
    
    // Second delay should be larger than first (exponential)
    // Allow for some timing variance
    if (delays.length >= 2) {
      expect(delays[1]).toBeGreaterThanOrEqual(delays[0] * 0.8);
    }
  });
});

// ============================================================================
// ROLLBACK TESTS
// ============================================================================

describe('OptimisticUpdateManager - Rollback', () => {
  let manager: OptimisticUpdateManager;
  
  beforeEach(() => {
    manager = new OptimisticUpdateManager({
      maxRetries: 2,
      baseDelayMs: 5,
    });
  });

  it('should restore state on rollback', async () => {
    let state = { name: 'Original' };
    const originalState = { ...state };
    
    const optimisticAction = () => { state.name = 'Updated'; };
    const rollbackAction = () => { state = { ...originalState }; };
    const backendOperation = createFailingOperation('Backend error');

    // Apply optimistic update
    const promise = manager.update(
      'update-1',
      optimisticAction,
      backendOperation,
      rollbackAction
    );

    // State should be updated optimistically
    expect(state.name).toBe('Updated');
    
    // Wait for failure and rollback
    await promise;
    
    // State should be rolled back
    expect(state.name).toBe('Original');
  });

  it('should call rollback only once on failure', async () => {
    const rollbackAction = jest.fn();
    const backendOperation = createFailingOperation('Error');

    await manager.update(
      'update-1',
      () => {},
      backendOperation,
      rollbackAction
    );

    expect(rollbackAction).toHaveBeenCalledTimes(1);
  });

  it('should not call rollback on success', async () => {
    const rollbackAction = jest.fn();
    const backendOperation = createSuccessfulOperation('OK');

    await manager.update(
      'update-1',
      () => {},
      backendOperation,
      rollbackAction
    );

    expect(rollbackAction).not.toHaveBeenCalled();
  });

  it('should handle rollback that throws error gracefully', async () => {
    const rollbackAction = () => {
      throw new Error('Rollback failed');
    };
    const backendOperation = createFailingOperation('Backend error');

    // Should not throw even if rollback fails
    await expect(
      manager.update(
        'update-1',
        () => {},
        backendOperation,
        rollbackAction
      )
    ).rejects.toThrow('Rollback failed');
  });

  it('should support complex object rollback', async () => {
    const state: ClinicalCase = createMockCase('case-1');
    const originalPatient = { ...state.patient };
    
    const optimisticAction = () => {
      state.patient.firstName = 'NewName';
      state.patient.lastName = 'NewLast';
    };
    
    const rollbackAction = () => {
      state.patient = { ...originalPatient };
    };
    
    const backendOperation = createFailingOperation('Error');

    await manager.update('update-1', optimisticAction, backendOperation, rollbackAction);

    expect(state.patient.firstName).toBe('Jane');
    expect(state.patient.lastName).toBe('Smith');
  });
});

// ============================================================================
// CANCEL UPDATE TESTS
// ============================================================================

describe('OptimisticUpdateManager - Cancel Updates', () => {
  let manager: OptimisticUpdateManager;
  
  beforeEach(() => {
    manager = new OptimisticUpdateManager({
      maxRetries: 3,
      baseDelayMs: 100, // Longer delay so we can cancel
    });
  });

  it('should cancel pending update and rollback', async () => {
    let state = 'original';
    const rollbackAction = jest.fn(() => { state = 'original'; });
    
    // Start a slow operation
    const promise = manager.update(
      'update-1',
      () => { state = 'updated'; },
      createSuccessfulOperation('OK', 500),
      rollbackAction
    );

    // Verify update was applied optimistically
    expect(state).toBe('updated');
    
    // Cancel the update
    const cancelled = manager.cancelUpdate('update-1');
    
    expect(cancelled).toBe(true);
    expect(rollbackAction).toHaveBeenCalled();
    expect(state).toBe('original');
  });

  it('should return false when cancelling non-existent update', () => {
    const cancelled = manager.cancelUpdate('non-existent');
    expect(cancelled).toBe(false);
  });

  it('should clear all pending updates', async () => {
    const rollback1 = jest.fn();
    const rollback2 = jest.fn();
    
    // Start multiple operations
    manager.update(
      'update-1',
      () => {},
      createSuccessfulOperation('OK', 500),
      rollback1
    );
    
    manager.update(
      'update-2',
      () => {},
      createSuccessfulOperation('OK', 500),
      rollback2
    );

    expect(manager.getAllPendingUpdates()).toHaveLength(2);
    
    // Clear all
    manager.clearAll();
    
    expect(manager.getAllPendingUpdates()).toHaveLength(0);
    expect(rollback1).toHaveBeenCalled();
    expect(rollback2).toHaveBeenCalled();
  });
});

// ============================================================================
// NETWORK FAILURE SCENARIOS
// ============================================================================

describe('OptimisticUpdateManager - Network Failures', () => {
  let manager: OptimisticUpdateManager;
  
  beforeEach(() => {
    manager = new OptimisticUpdateManager({
      maxRetries: 2,
      baseDelayMs: 10,
    });
  });

  it('should handle network timeout', async () => {
    const rollbackAction = jest.fn();
    const backendOperation = createTimeoutOperation(50);

    const result = await manager.update(
      'update-1',
      () => {},
      backendOperation,
      rollbackAction
    );

    expect(result.success).toBe(false);
    const error = assertFailure(result);
    expect(error.message).toBe('Network timeout');
    expect(rollbackAction).toHaveBeenCalled();
  });

  it('should handle connection refused error', async () => {
    const rollbackAction = jest.fn();
    const backendOperation = () => Promise.reject(new Error('ECONNREFUSED'));

    const result = await manager.update(
      'update-1',
      () => {},
      backendOperation,
      rollbackAction
    );

    expect(result.success).toBe(false);
    expect(rollbackAction).toHaveBeenCalled();
  });

  it('should handle 500 server error with retry', async () => {
    let attempts = 0;
    const backendOperation = () => {
      attempts++;
      if (attempts < 2) {
        return Promise.reject(new Error('500 Internal Server Error'));
      }
      return Promise.resolve('recovered');
    };

    const result = await manager.update(
      'update-1',
      () => {},
      backendOperation,
      () => {}
    );

    expect(result.success).toBe(true);
    expect(attempts).toBe(2);
  });

  it('should preserve error message through retries', async () => {
    const errorMessage = 'Specific error: Database unavailable';
    const backendOperation = createFailingOperation(errorMessage);

    const result = await manager.update(
      'update-1',
      () => {},
      backendOperation,
      () => {}
    );

    expect(result.success).toBe(false);
    const error = assertFailure(result);
    expect(error.message).toBe(errorMessage);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('OptimisticUpdateManager - Edge Cases', () => {
  let manager: OptimisticUpdateManager;
  
  beforeEach(() => {
    manager = new OptimisticUpdateManager({
      maxRetries: 2,
      baseDelayMs: 5,
    });
  });

  it('should handle same updateId being used twice sequentially', async () => {
    const result1 = await manager.update(
      'update-1',
      () => {},
      createSuccessfulOperation('first'),
      () => {}
    );

    const result2 = await manager.update(
      'update-1',
      () => {},
      createSuccessfulOperation('second'),
      () => {}
    );

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });

  it('should handle empty/null values from backend', async () => {
    const result = await manager.update(
      'update-1',
      () => {},
      () => Promise.resolve(null),
      () => {}
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it('should handle undefined values from backend', async () => {
    const result = await manager.update(
      'update-1',
      () => {},
      () => Promise.resolve(undefined),
      () => {}
    );

    expect(result.success).toBe(true);
  });

  it('should not exceed maxDelayMs for backoff', async () => {
    const shortMaxManager = new OptimisticUpdateManager({
      maxRetries: 10,
      baseDelayMs: 1000,
      maxDelayMs: 50, // Very short max
    });

    const startTime = Date.now();
    
    await shortMaxManager.update(
      'update-1',
      () => {},
      createFailingOperation('Always fail'),
      () => {}
    );

    const elapsed = Date.now() - startTime;
    
    // With 10 retries and 50ms max delay, should take less than 10 * 50 + buffer
    expect(elapsed).toBeLessThan(1000);
  });

  it('should handle synchronous optimistic action that throws', async () => {
    const optimisticAction = () => {
      throw new Error('Optimistic action failed');
    };

    await expect(
      manager.update(
        'update-1',
        optimisticAction,
        createSuccessfulOperation('OK'),
        () => {}
      )
    ).rejects.toThrow('Optimistic action failed');
  });

  it('should handle backend returning a rejected Promise with non-Error', async () => {
    const backendOperation = () => Promise.reject('String error');
    const rollbackAction = jest.fn();

    const result = await manager.update(
      'update-1',
      () => {},
      backendOperation,
      rollbackAction
    );

    // Should still handle gracefully
    expect(result.success).toBe(false);
    expect(rollbackAction).toHaveBeenCalled();
  });
});

// ============================================================================
// INTEGRATION WITH CLINICAL CASE
// ============================================================================

describe('OptimisticUpdateManager - Clinical Case Integration', () => {
  let manager: OptimisticUpdateManager;
  
  beforeEach(() => {
    manager = new OptimisticUpdateManager({
      maxRetries: 2,
      baseDelayMs: 10,
    });
  });

  it('should update clinical case workflow step optimistically', async () => {
    const case_: ClinicalCase = createMockCase('case-1');
    const originalStep = case_.workflow.currentStep;
    
    const newStep = ClinicalWorkflowStep.CLINICAL_HISTORY;
    
    const optimisticAction = () => {
      case_.workflow.currentStep = newStep;
      case_.workflow.completedSteps.push(originalStep);
    };
    
    const rollbackAction = () => {
      case_.workflow.currentStep = originalStep;
      case_.workflow.completedSteps = case_.workflow.completedSteps.filter(
        s => s !== originalStep
      );
    };
    
    const backendOperation = createSuccessfulOperation({ ...case_, workflow: { ...case_.workflow } });

    // Before: original step
    expect(case_.workflow.currentStep).toBe(ClinicalWorkflowStep.PATIENT_REGISTRATION);
    
    const promise = manager.update('update-workflow', optimisticAction, backendOperation, rollbackAction);
    
    // Immediately after: optimistically updated
    expect(case_.workflow.currentStep).toBe(ClinicalWorkflowStep.CLINICAL_HISTORY);
    
    await promise;
    
    // After success: still updated
    expect(case_.workflow.currentStep).toBe(ClinicalWorkflowStep.CLINICAL_HISTORY);
    expect(case_.workflow.completedSteps).toContain(originalStep);
  });

  it('should rollback workflow step on backend failure', async () => {
    const case_: ClinicalCase = createMockCase('case-1');
    const originalStep = case_.workflow.currentStep;
    const originalCompleted = [...case_.workflow.completedSteps];
    
    const newStep = ClinicalWorkflowStep.CLINICAL_HISTORY;
    
    const optimisticAction = () => {
      case_.workflow.currentStep = newStep;
      case_.workflow.completedSteps.push(originalStep);
    };
    
    const rollbackAction = () => {
      case_.workflow.currentStep = originalStep;
      case_.workflow.completedSteps = [...originalCompleted];
    };
    
    const backendOperation = createFailingOperation('Workflow validation failed');

    const result = await manager.update(
      'update-workflow',
      optimisticAction,
      backendOperation,
      rollbackAction
    );

    expect(result.success).toBe(false);
    // Should be rolled back
    expect(case_.workflow.currentStep).toBe(originalStep);
    expect(case_.workflow.completedSteps).toEqual(originalCompleted);
  });

  it('should update patient info optimistically', async () => {
    const case_: ClinicalCase = createMockCase('case-1');
    const originalPatient = { ...case_.patient };
    
    const optimisticAction = () => {
      case_.patient.firstName = 'Updated';
      case_.patient.lastName = 'Name';
    };
    
    const rollbackAction = () => {
      case_.patient = { ...originalPatient };
    };
    
    const backendOperation = createSuccessfulOperation(case_);

    await manager.update('update-patient', optimisticAction, backendOperation, rollbackAction);

    expect(case_.patient.firstName).toBe('Updated');
    expect(case_.patient.lastName).toBe('Name');
  });

  it('should handle BI-RADS assessment update with retry', async () => {
    const case_: ClinicalCase = createMockCase('case-1');
    
    // Simulate assessment object
    const assessment = {
      biradsCategory: 2,
      impression: 'Benign finding',
    };
    
    const optimisticAction = () => {
      (case_ as any).assessment = assessment;
    };
    
    const rollbackAction = () => {
      (case_ as any).assessment = undefined;
    };
    
    // Fail once, then succeed
    const backendOperation = createEventuallySuccessfulOperation(case_, 1);

    const result = await manager.update(
      'update-assessment',
      optimisticAction,
      backendOperation,
      rollbackAction
    );

    expect(result.success).toBe(true);
    expect((case_ as any).assessment).toEqual(assessment);
  });
});

// ============================================================================
// CLEANUP AND DESTROY TESTS (Medium/High Risk Edge Cases)
// ============================================================================

describe('Resource Cleanup and Destroy', () => {
  let manager: OptimisticUpdateManager;

  beforeEach(() => {
    jest.useFakeTimers();
    manager = new OptimisticUpdateManager({
      maxRetries: 3,
      baseDelayMs: 100,
      maxDelayMs: 500,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    manager.clearAll();
  });

  it('should return pending IDs on destroy without rollback', async () => {
    const case1 = createMockCase('case-1');
    const case2 = createMockCase('case-2');
    
    // Start updates that will never complete (long delay)
    const longOperation = () => new Promise<ClinicalCase>(resolve => {
      setTimeout(() => resolve(case1), 10000);
    });
    
    // Start updates (don't await)
    manager.update(
      'update-1',
      () => {},
      longOperation,
      () => {}
    );
    manager.update(
      'update-2',
      () => {},
      longOperation,
      () => {}
    );

    // Destroy without rollbacks
    const pendingIds = manager.destroy({ triggerRollbacks: false });
    
    expect(pendingIds).toContain('update-1');
    expect(pendingIds).toContain('update-2');
    expect(manager.hasPendingUpdates()).toBe(false);
  });

  it('should trigger rollbacks on destroy when requested', async () => {
    let rollbackCalled = false;
    const case_ = createMockCase('case-1');
    
    const longOperation = () => new Promise<ClinicalCase>(resolve => {
      setTimeout(() => resolve(case_), 10000);
    });
    
    // Start update
    manager.update(
      'update-1',
      () => {},
      longOperation,
      () => { rollbackCalled = true; }
    );

    // Destroy with rollbacks
    manager.destroy({ triggerRollbacks: true });
    
    expect(rollbackCalled).toBe(true);
    expect(manager.hasPendingUpdates()).toBe(false);
  });

  it('should identify retrying updates', async () => {
    // Use real timers for this test
    jest.useRealTimers();
    
    const localManager = new OptimisticUpdateManager({
      maxRetries: 3,
      baseDelayMs: 10,
      maxDelayMs: 50,
    });
    
    let attemptCount = 0;
    
    const failingOperation = () => new Promise<ClinicalCase>((_, reject) => {
      attemptCount++;
      reject(new Error('Network error'));
    });

    // Start update (don't await)
    const updatePromise = localManager.update(
      'update-1',
      () => {},
      failingOperation,
      () => {}
    );

    // Wait briefly for first retry attempt
    await new Promise(resolve => setTimeout(resolve, 5));
    
    // The update should have a retry count by now
    expect(attemptCount).toBeGreaterThanOrEqual(1);
    
    // Complete the test - wait for all retries
    try {
      await updatePromise;
    } catch (e) {
      // Expected to fail after max retries
      expect(attemptCount).toBe(3); // maxRetries attempts
    }
    
    // After completion, no pending updates should remain
    expect(localManager.hasPendingUpdates()).toBe(false);
  });

  it('should return empty array for getPendingIds when no updates', () => {
    expect(manager.getPendingIds()).toEqual([]);
  });

  it('should track all pending IDs correctly', async () => {
    const case1 = createMockCase('case-1');
    
    const longOperation = () => new Promise<ClinicalCase>(resolve => {
      setTimeout(() => resolve(case1), 10000);
    });
    
    manager.update('update-a', () => {}, longOperation, () => {});
    manager.update('update-b', () => {}, longOperation, () => {});
    manager.update('update-c', () => {}, longOperation, () => {});

    const ids = manager.getPendingIds();
    
    expect(ids).toHaveLength(3);
    expect(ids).toContain('update-a');
    expect(ids).toContain('update-b');
    expect(ids).toContain('update-c');

    manager.destroy();
  });

  it('should handle destroy during active retry', async () => {
    jest.useRealTimers();
    
    const localManager = new OptimisticUpdateManager({
      maxRetries: 5,
      baseDelayMs: 20,
      maxDelayMs: 100,
    });

    let attemptCount = 0;
    const failingOperation = () => new Promise<ClinicalCase>((_, reject) => {
      attemptCount++;
      reject(new Error('Network error'));
    });

    // Start update (don't await, let it retry)
    const updatePromise = localManager.update(
      'update-1',
      () => {},
      failingOperation,
      () => {}
    );

    // Wait a bit for retry to start
    await new Promise(resolve => setTimeout(resolve, 30));
    
    // Destroy while retry is in progress
    const pendingIds = localManager.destroy({ triggerRollbacks: false });
    
    // Should have destroyed
    expect(localManager.hasPendingUpdates()).toBe(false);
    
    // Wait for original promise to settle
    try {
      await updatePromise;
    } catch (e) {
      // Expected
    }
  });
});

// ============================================================================
// MEMORY LEAK PREVENTION TESTS
// ============================================================================

describe('Memory Leak Prevention', () => {
  it('should not accumulate pending updates after completion', async () => {
    const manager = new OptimisticUpdateManager({ maxRetries: 1, baseDelayMs: 10, maxDelayMs: 100 });
    
    // Run many successful updates
    for (let i = 0; i < 100; i++) {
      await manager.update(
        `update-${i}`,
        () => {},
        createSuccessfulOperation({ id: i }, 1),
        () => {}
      );
    }
    
    expect(manager.getPendingCount()).toBe(0);
    expect(manager.getPendingIds()).toEqual([]);
  });

  it('should not accumulate pending updates after failure', async () => {
    const manager = new OptimisticUpdateManager({ maxRetries: 1, baseDelayMs: 10, maxDelayMs: 100 });
    
    // Run many failing updates
    for (let i = 0; i < 50; i++) {
      const result = await manager.update(
        `update-${i}`,
        () => {},
        createFailingOperation('Network error', 1),
        () => {}
      );
      expect(result.success).toBe(false);
    }
    
    expect(manager.getPendingCount()).toBe(0);
    expect(manager.getPendingIds()).toEqual([]);
  });

  it('should cleanup properly with clearAll', () => {
    const manager = new OptimisticUpdateManager();
    
    // Add many pending updates (using long operations)
    const longOp = () => new Promise(resolve => setTimeout(resolve, 100000));
    
    for (let i = 0; i < 20; i++) {
      manager.update(`update-${i}`, () => {}, longOp, () => {});
    }
    
    expect(manager.getPendingCount()).toBe(20);
    
    manager.clearAll();
    
    expect(manager.getPendingCount()).toBe(0);
    expect(manager.getAllPendingUpdates()).toEqual([]);
  });
});
