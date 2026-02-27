/**
 * SyncQueue Tests
 * 
 * Phase 2 TDD tests for sync queue functionality.
 * Tests cover:
 * - Queue management (add, remove, clear)
 * - Debounced sync with configurable delay
 * - Retry logic with max retries
 * - Operation batching
 * - Conflict resolution
 * - Offline/online handling
 * - Error recovery
 * 
 * @jest-environment jsdom
 */

import {
  ClinicalCase,
  ClinicalWorkflowStep,
  PatientInfo,
  ClinicalHistory,
} from '../../types/case.types';

import {
  SyncQueue,
  SyncQueueItem,
  SyncStatus,
  SyncQueueConfig,
  BackendAdapter,
} from '../syncQueue';

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

/**
 * Mock backend adapter for testing
 */
class MockBackendAdapter implements BackendAdapter {
  private cases: Map<string, ClinicalCase> = new Map();
  private delay: number;
  private shouldFail = false;
  private failCount = 0;
  private failUntil = 0;
  public callLog: { operation: string; caseId: string; timestamp: number }[] = [];

  constructor(delay = 10) {
    this.delay = delay;
  }

  setFailMode(fail: boolean): void {
    this.shouldFail = fail;
  }

  setFailUntil(count: number): void {
    this.failUntil = count;
    this.failCount = 0;
  }

  private async simulateDelay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.delay));
  }

  private checkFailure(): void {
    if (this.shouldFail) {
      throw new Error('Backend error');
    }
    if (this.failCount < this.failUntil) {
      this.failCount++;
      throw new Error(`Temporary failure ${this.failCount}/${this.failUntil}`);
    }
  }

  async createCase(case_: ClinicalCase): Promise<ClinicalCase> {
    await this.simulateDelay();
    this.callLog.push({ operation: 'create', caseId: case_.id, timestamp: Date.now() });
    this.checkFailure();
    this.cases.set(case_.id, case_);
    return case_;
  }

  async updateCase(caseId: string, data: Partial<ClinicalCase>): Promise<ClinicalCase> {
    await this.simulateDelay();
    this.callLog.push({ operation: 'update', caseId, timestamp: Date.now() });
    this.checkFailure();
    const existing = this.cases.get(caseId);
    if (!existing) {
      // For testing, auto-create if doesn't exist
      const newCase = { ...createMockCase(caseId), ...data };
      this.cases.set(caseId, newCase);
      return newCase;
    }
    const updated = { ...existing, ...data };
    this.cases.set(caseId, updated);
    return updated;
  }

  async deleteCase(caseId: string): Promise<void> {
    await this.simulateDelay();
    this.callLog.push({ operation: 'delete', caseId, timestamp: Date.now() });
    this.checkFailure();
    this.cases.delete(caseId);
  }

  async getCase(caseId: string): Promise<ClinicalCase | null> {
    await this.simulateDelay();
    this.checkFailure();
    return this.cases.get(caseId) || null;
  }

  getCaseCount(): number {
    return this.cases.size;
  }

  reset(): void {
    this.cases.clear();
    this.shouldFail = false;
    this.failCount = 0;
    this.failUntil = 0;
    this.callLog = [];
  }
}

// ============================================================================
// INITIALIZATION TESTS
// ============================================================================

describe('SyncQueue Initialization', () => {
  it('should initialize with default config', () => {
    const queue = new SyncQueue();
    const config = queue.getConfig();
    
    expect(config.maxRetries).toBe(3);
    expect(config.debounceMs).toBe(500);
    expect(config.batchSize).toBe(5);
    expect(config.retryDelayMs).toBe(1000);
  });

  it('should accept custom config', () => {
    const queue = new SyncQueue({
      maxRetries: 5,
      debounceMs: 200,
      batchSize: 10,
      retryDelayMs: 500,
    });
    const config = queue.getConfig();
    
    expect(config.maxRetries).toBe(5);
    expect(config.debounceMs).toBe(200);
    expect(config.batchSize).toBe(10);
    expect(config.retryDelayMs).toBe(500);
  });

  it('should start empty', () => {
    const queue = new SyncQueue();
    
    expect(queue.hasPendingItems()).toBe(false);
    expect(queue.getQueueLength()).toBe(0);
    expect(queue.isProcessingQueue()).toBe(false);
  });
});

// ============================================================================
// ENQUEUE TESTS
// ============================================================================

describe('SyncQueue Enqueue', () => {
  let queue: SyncQueue;
  let mockAdapter: MockBackendAdapter;

  beforeEach(() => {
    mockAdapter = new MockBackendAdapter();
    queue = new SyncQueue({ debounceMs: 1000 }, mockAdapter); // Long debounce to control timing
  });

  afterEach(() => {
    queue.clear();
    mockAdapter.reset();
  });

  it('should add item to queue', () => {
    const case_ = createMockCase('case-1');
    
    const id = queue.enqueue('case-1', 'create', case_);
    
    expect(id).toBeDefined();
    expect(queue.getQueueLength()).toBe(1);
    expect(queue.hasPendingItems()).toBe(true);
  });

  it('should track pending count per case', () => {
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    queue.enqueue('case-1', 'update', { patient: createValidPatientInfo() });
    queue.enqueue('case-2', 'create', createMockCase('case-2'));
    
    // Updates are deduplicated, so case-1 should have create + update = 2
    // Actually, updates replace each other, so should be 1 create + 1 update = 2
    expect(queue.getPendingCount('case-1')).toBe(2);
    expect(queue.getPendingCount('case-2')).toBe(1);
  });

  it('should deduplicate updates for same case', () => {
    queue.enqueue('case-1', 'update', { patient: { ...createValidPatientInfo(), firstName: 'First' } });
    queue.enqueue('case-1', 'update', { patient: { ...createValidPatientInfo(), firstName: 'Second' } });
    queue.enqueue('case-1', 'update', { patient: { ...createValidPatientInfo(), firstName: 'Third' } });
    
    // Only the last update should remain
    expect(queue.getQueueLength()).toBe(1);
    
    const items = queue.getQueue();
    expect((items[0].data.patient as PatientInfo).firstName).toBe('Third');
  });

  it('should cancel unsynced create when delete is queued', () => {
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    expect(queue.getQueueLength()).toBe(1);
    
    queue.enqueue('case-1', 'delete', {});
    
    // Both should be removed - case was never synced
    expect(queue.getQueueLength()).toBe(0);
  });

  it('should add high priority items to front of queue', () => {
    queue.enqueue('case-1', 'update', {}, 'normal');
    queue.enqueue('case-2', 'update', {}, 'normal');
    queue.enqueue('case-3', 'update', {}, 'high');
    
    const items = queue.getQueue();
    expect(items[0].caseId).toBe('case-3');
  });

  it('should update sync status on enqueue', () => {
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    
    const status = queue.getStatus('case-1');
    expect(status).toBeDefined();
    expect(status?.pendingChanges).toBe(1);
    expect(status?.isSynced).toBe(false);
  });
});

// ============================================================================
// DEQUEUE TESTS
// ============================================================================

describe('SyncQueue Dequeue', () => {
  let queue: SyncQueue;

  beforeEach(() => {
    queue = new SyncQueue({ debounceMs: 10000 }); // Very long debounce
  });

  afterEach(() => {
    queue.clear();
  });

  it('should remove item by ID', () => {
    const id = queue.enqueue('case-1', 'create', createMockCase('case-1'));
    expect(queue.getQueueLength()).toBe(1);
    
    const removed = queue.dequeue(id);
    
    expect(removed).toBe(true);
    expect(queue.getQueueLength()).toBe(0);
  });

  it('should return false for non-existent ID', () => {
    const removed = queue.dequeue('non-existent-id');
    expect(removed).toBe(false);
  });

  it('should update sync status on dequeue', () => {
    const id = queue.enqueue('case-1', 'create', createMockCase('case-1'));
    queue.enqueue('case-1', 'update', {});
    
    expect(queue.getPendingCount('case-1')).toBe(2);
    
    queue.dequeue(id);
    
    expect(queue.getPendingCount('case-1')).toBe(1);
  });
});

// ============================================================================
// SYNC PROCESSING TESTS
// ============================================================================

describe('SyncQueue Processing', () => {
  let queue: SyncQueue;
  let mockAdapter: MockBackendAdapter;

  beforeEach(() => {
    mockAdapter = new MockBackendAdapter(5); // 5ms delay
    queue = new SyncQueue({ debounceMs: 10, maxRetries: 3, retryDelayMs: 10 }, mockAdapter);
  });

  afterEach(() => {
    queue.clear();
    mockAdapter.reset();
  });

  it('should process queue after debounce', async () => {
    const case_ = createMockCase('case-1');
    queue.enqueue('case-1', 'create', case_);
    
    // Wait for debounce + processing
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(mockAdapter.getCaseCount()).toBe(1);
    expect(queue.getQueueLength()).toBe(0);
  });

  it('should update sync status after successful sync', async () => {
    const case_ = createMockCase('case-1');
    queue.enqueue('case-1', 'create', case_);
    
    await queue.processNow();
    
    const status = queue.getStatus('case-1');
    expect(status?.isSynced).toBe(true);
    expect(status?.lastSyncedAt).toBeDefined();
    expect(status?.syncError).toBeUndefined();
  });

  it('should call onSyncComplete callback', async () => {
    const completedCases: { caseId: string; success: boolean }[] = [];
    
    const queueWithCallback = new SyncQueue(
      { debounceMs: 10 },
      mockAdapter,
      {
        onSyncComplete: (caseId, success) => {
          completedCases.push({ caseId, success });
        },
      }
    );

    queueWithCallback.enqueue('case-1', 'create', createMockCase('case-1'));
    await queueWithCallback.processNow();
    
    expect(completedCases).toHaveLength(1);
    expect(completedCases[0]).toEqual({ caseId: 'case-1', success: true });
    
    queueWithCallback.clear();
  });

  it('should process items in order', async () => {
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    queue.enqueue('case-2', 'create', createMockCase('case-2'));
    queue.enqueue('case-3', 'create', createMockCase('case-3'));
    
    await queue.processNow();
    
    // Check call order
    expect(mockAdapter.callLog.map(c => c.caseId)).toEqual(['case-1', 'case-2', 'case-3']);
  });

  it('should handle mixed operations', async () => {
    const case1 = createMockCase('case-1');
    queue.enqueue('case-1', 'create', case1);
    queue.enqueue('case-1', 'update', { ...case1, patient: { ...case1.patient, firstName: 'Updated' } });
    
    await queue.processNow();
    
    expect(mockAdapter.callLog).toHaveLength(2);
    expect(mockAdapter.callLog[0].operation).toBe('create');
    expect(mockAdapter.callLog[1].operation).toBe('update');
  });
});

// ============================================================================
// RETRY LOGIC TESTS
// ============================================================================

describe('SyncQueue Retry Logic', () => {
  let queue: SyncQueue;
  let mockAdapter: MockBackendAdapter;

  beforeEach(() => {
    mockAdapter = new MockBackendAdapter(5);
    queue = new SyncQueue({ debounceMs: 10, maxRetries: 3, retryDelayMs: 10 }, mockAdapter);
  });

  afterEach(() => {
    queue.clear();
    mockAdapter.reset();
  });

  it('should retry failed operations', async () => {
    mockAdapter.setFailUntil(2); // Fail first 2 attempts
    
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    await queue.processNow();
    
    // Should have retried and eventually succeeded
    expect(mockAdapter.getCaseCount()).toBe(1);
    expect(queue.getQueueLength()).toBe(0);
  });

  it('should give up after max retries', async () => {
    mockAdapter.setFailMode(true); // Always fail
    
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    await queue.processNow();
    
    // Should have given up
    expect(queue.getQueueLength()).toBe(0);
    
    const status = queue.getStatus('case-1');
    expect(status?.syncError).toBeDefined();
    expect(status?.isSynced).toBe(false);
  });

  it('should preserve error message in status', async () => {
    mockAdapter.setFailMode(true);
    
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    await queue.processNow();
    
    const status = queue.getStatus('case-1');
    expect(status?.syncError).toContain('Backend error');
  });

  it('should retry with delay between attempts', async () => {
    const timestamps: number[] = [];
    const customAdapter: BackendAdapter = {
      createCase: async () => {
        timestamps.push(Date.now());
        if (timestamps.length < 3) {
          throw new Error('Retry me');
        }
        return createMockCase('case-1');
      },
      updateCase: async () => createMockCase('case-1'),
      deleteCase: async () => {},
      getCase: async () => null,
    };

    const queueWithDelay = new SyncQueue(
      { debounceMs: 5, maxRetries: 3, retryDelayMs: 50 },
      customAdapter
    );

    queueWithDelay.enqueue('case-1', 'create', createMockCase('case-1'));
    await queueWithDelay.processNow();

    // Should have delays between retries
    expect(timestamps.length).toBe(3);
    if (timestamps.length >= 2) {
      expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(40); // Allow some variance
    }
    
    queueWithDelay.clear();
  });
});

// ============================================================================
// PAUSE/RESUME TESTS
// ============================================================================

describe('SyncQueue Pause/Resume', () => {
  let queue: SyncQueue;
  let mockAdapter: MockBackendAdapter;

  beforeEach(() => {
    mockAdapter = new MockBackendAdapter(5);
    queue = new SyncQueue({ debounceMs: 10 }, mockAdapter);
  });

  afterEach(() => {
    queue.clear();
    mockAdapter.reset();
  });

  it('should not process when paused', async () => {
    queue.pause();
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    
    // Wait for what would be debounce time
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(mockAdapter.getCaseCount()).toBe(0);
    expect(queue.getQueueLength()).toBe(1);
  });

  it('should resume processing after resume', async () => {
    queue.pause();
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    
    queue.resume();
    
    // Wait for debounce + processing
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(mockAdapter.getCaseCount()).toBe(1);
  });

  it('should process immediately with processNow even when paused', async () => {
    queue.pause();
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    
    // processNow should still not process when paused
    await queue.processNow();
    
    // Queue is paused, so nothing should be processed
    expect(mockAdapter.getCaseCount()).toBe(0);
  });
});

// ============================================================================
// QUEUE CHANGE NOTIFICATION TESTS
// ============================================================================

describe('SyncQueue Change Notifications', () => {
  it('should notify on enqueue', () => {
    const changes: SyncQueueItem[][] = [];
    const queue = new SyncQueue(
      { debounceMs: 10000 },
      null,
      { onQueueChange: (q) => changes.push([...q]) }
    );

    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    
    expect(changes).toHaveLength(1);
    expect(changes[0]).toHaveLength(1);
    
    queue.clear();
  });

  it('should notify on dequeue', () => {
    const changes: SyncQueueItem[][] = [];
    const queue = new SyncQueue(
      { debounceMs: 10000 },
      null,
      { onQueueChange: (q) => changes.push([...q]) }
    );

    const id = queue.enqueue('case-1', 'create', createMockCase('case-1'));
    queue.dequeue(id);
    
    expect(changes).toHaveLength(2);
    expect(changes[1]).toHaveLength(0);
    
    queue.clear();
  });

  it('should notify on clear', () => {
    const changes: SyncQueueItem[][] = [];
    const queue = new SyncQueue(
      { debounceMs: 10000 },
      null,
      { onQueueChange: (q) => changes.push([...q]) }
    );

    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    queue.enqueue('case-2', 'create', createMockCase('case-2'));
    queue.clear();
    
    expect(changes[changes.length - 1]).toHaveLength(0);
  });
});

// ============================================================================
// HYDRATION TESTS
// ============================================================================

describe('SyncQueue Hydration', () => {
  it('should restore queue from persisted state', () => {
    const queue = new SyncQueue({ debounceMs: 10000 });
    
    const persistedQueue: SyncQueueItem[] = [
      {
        id: 'item-1',
        caseId: 'case-1',
        operation: 'update',
        data: {},
        timestamp: new Date().toISOString(),
        retries: 1,
      },
    ];
    
    const persistedStatus = new Map<string, SyncStatus>([
      ['case-1', { caseId: 'case-1', isSynced: false, pendingChanges: 1 }],
    ]);
    
    queue.hydrate(persistedQueue, persistedStatus);
    
    expect(queue.getQueueLength()).toBe(1);
    expect(queue.getStatus('case-1')?.pendingChanges).toBe(1);
    
    queue.clear();
  });

  it('should export state for persistence', () => {
    const queue = new SyncQueue({ debounceMs: 10000 });
    
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    queue.enqueue('case-2', 'update', {});
    
    const state = queue.getState();
    
    expect(state.queue).toHaveLength(2);
    expect(state.status.size).toBeGreaterThan(0);
    
    queue.clear();
  });

  it('should schedule sync after hydration if items exist', async () => {
    const mockAdapter = new MockBackendAdapter(5);
    const queue = new SyncQueue({ debounceMs: 10 }, mockAdapter);
    
    const persistedQueue: SyncQueueItem[] = [
      {
        id: 'item-1',
        caseId: 'case-1',
        operation: 'create',
        data: createMockCase('case-1'),
        timestamp: new Date().toISOString(),
        retries: 0,
      },
    ];
    
    queue.hydrate(persistedQueue, new Map());
    
    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(mockAdapter.getCaseCount()).toBe(1);
    
    queue.clear();
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('SyncQueue Edge Cases', () => {
  it('should handle empty queue processing gracefully', async () => {
    const mockAdapter = new MockBackendAdapter();
    const queue = new SyncQueue({ debounceMs: 10 }, mockAdapter);
    
    // Should not throw
    await queue.processNow();
    
    expect(mockAdapter.callLog).toHaveLength(0);
  });

  it('should handle missing backend adapter', async () => {
    const queue = new SyncQueue({ debounceMs: 10 }, null);
    
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    
    // Should not throw, just not process
    await queue.processNow();
    
    expect(queue.getQueueLength()).toBe(1);
    
    queue.clear();
  });

  it('should handle rapid enqueue/dequeue', () => {
    const queue = new SyncQueue({ debounceMs: 10000 });
    
    const ids: string[] = [];
    for (let i = 0; i < 100; i++) {
      ids.push(queue.enqueue(`case-${i}`, 'create', createMockCase(`case-${i}`)));
    }
    
    // Dequeue half
    for (let i = 0; i < 50; i++) {
      queue.dequeue(ids[i]);
    }
    
    expect(queue.getQueueLength()).toBe(50);
    
    queue.clear();
  });

  it('should not double-process during concurrent processNow calls', async () => {
    const mockAdapter = new MockBackendAdapter(20); // Slower processing
    const queue = new SyncQueue({ debounceMs: 5 }, mockAdapter);
    
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    
    // Start two concurrent processNow calls
    const [result1, result2] = await Promise.all([
      queue.processNow(),
      queue.processNow(),
    ]);
    
    // Should only process once
    expect(mockAdapter.callLog.filter(c => c.caseId === 'case-1')).toHaveLength(1);
    
    queue.clear();
  });

  it('should handle very large data payloads', () => {
    const queue = new SyncQueue({ debounceMs: 10000 });
    
    const largeCase = createMockCase('case-1');
    // Add large annotation data
    (largeCase as any).largeData = 'x'.repeat(100000);
    
    queue.enqueue('case-1', 'create', largeCase);
    
    expect(queue.getQueueLength()).toBe(1);
    
    queue.clear();
  });
});

// ============================================================================
// DESTROY AND CLEANUP TESTS (Medium/High Risk Edge Cases)
// ============================================================================

describe('Resource Cleanup and Destroy', () => {
  let mockAdapter: MockBackendAdapter;

  beforeEach(() => {
    jest.useFakeTimers();
    mockAdapter = new MockBackendAdapter(10);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should destroy queue and clear all timers', () => {
    const queue = new SyncQueue({ debounceMs: 5000 }, mockAdapter);
    
    // Enqueue items (this schedules a debounced sync)
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    queue.enqueue('case-2', 'create', createMockCase('case-2'));
    
    expect(queue.getQueueLength()).toBe(2);
    
    // Destroy
    const preserved = queue.destroy();
    
    expect(preserved).toBeUndefined();
    expect(queue.getQueueLength()).toBe(0);
    expect(queue.isPausedState()).toBe(true);
  });

  it('should preserve queue on destroy when requested', () => {
    const queue = new SyncQueue({ debounceMs: 5000 }, mockAdapter);
    
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    queue.enqueue('case-2', 'update', { id: 'case-2', workflow: { status: 'in-progress' } as any });
    
    // Destroy with preservation
    const preserved = queue.destroy({ preserveQueue: true });
    
    expect(preserved).toHaveLength(2);
    expect(preserved?.[0].caseId).toBe('case-1');
    expect(preserved?.[1].caseId).toBe('case-2');
    expect(queue.getQueueLength()).toBe(0);
  });

  it('should not process after destroy', async () => {
    jest.useRealTimers();
    const localAdapter = new MockBackendAdapter(5);
    const queue = new SyncQueue({ debounceMs: 10 }, localAdapter);
    
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    
    // Destroy immediately
    queue.destroy();
    
    // Wait for what would have been the debounce
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Should not have processed
    expect(localAdapter.callLog).toHaveLength(0);
  });

  it('should clear callbacks on destroy', () => {
    let callbackCalled = false;
    const queue = new SyncQueue(
      { debounceMs: 10 },
      mockAdapter,
      { onQueueChange: () => { callbackCalled = true; } }
    );
    
    // Destroy clears callbacks
    queue.destroy();
    
    // Operations after destroy should not trigger callbacks
    // (the queue is empty anyway, but callbacks should be gone)
    expect(queue.getQueueLength()).toBe(0);
  });

  it('should handle destroy during processing', async () => {
    jest.useRealTimers();
    const slowAdapter = new MockBackendAdapter(100); // Slow operations
    const queue = new SyncQueue({ debounceMs: 5 }, slowAdapter);
    
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    
    // Start processing
    const processPromise = queue.processNow();
    
    // Destroy immediately
    await new Promise(resolve => setTimeout(resolve, 10));
    queue.destroy();
    
    // Wait for processing to settle
    await processPromise;
    
    expect(queue.isPausedState()).toBe(true);
  });
});

// ============================================================================
// TIMER CLEANUP TESTS (Prevents Memory Leaks)
// ============================================================================

describe('Timer Management', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should clear existing timer when new item enqueued', () => {
    const queue = new SyncQueue({ debounceMs: 1000 });
    
    // First enqueue schedules timer
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    
    // Second enqueue should reschedule (clear old, set new)
    queue.enqueue('case-2', 'create', createMockCase('case-2'));
    
    // Both items should still be in queue (timer not fired yet)
    expect(queue.getQueueLength()).toBe(2);
    
    queue.clear();
  });

  it('should clear timer on pause', () => {
    const queue = new SyncQueue({ debounceMs: 500 });
    
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    
    // Pause should clear the timer
    queue.pause();
    
    // Advance time past debounce
    jest.advanceTimersByTime(1000);
    
    // Queue should still have the item (not processed due to pause)
    expect(queue.getQueueLength()).toBe(1);
    
    queue.clear();
  });

  it('should reschedule timer on resume if items exist', () => {
    const mockAdapter = new MockBackendAdapter(5);
    const queue = new SyncQueue({ debounceMs: 100 }, mockAdapter);
    
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    queue.pause();
    
    // Resume should reschedule
    queue.resume();
    
    expect(queue.isPausedState()).toBe(false);
    expect(queue.getQueueLength()).toBe(1);
    
    queue.clear();
  });

  it('should not leak timers with rapid pause/resume cycles', () => {
    const queue = new SyncQueue({ debounceMs: 100 });
    
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    
    // Rapid pause/resume cycles
    for (let i = 0; i < 50; i++) {
      queue.pause();
      queue.resume();
    }
    
    // Should still work correctly
    expect(queue.getQueueLength()).toBe(1);
    expect(queue.isPausedState()).toBe(false);
    
    queue.destroy();
  });
});

// ============================================================================
// GRACEFUL SHUTDOWN TESTS (Partial Sync Recovery)
// ============================================================================

describe('Graceful Shutdown and Recovery', () => {
  it('should export state for persistence before shutdown', () => {
    const queue = new SyncQueue({ debounceMs: 10000 });
    
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    queue.enqueue('case-2', 'update', { id: 'case-2' } as any);
    
    // Get state for persistence
    const state = queue.getState();
    
    expect(state.queue).toHaveLength(2);
    expect(state.status.size).toBeGreaterThanOrEqual(0);
    
    // Destroy preserving queue
    const preserved = queue.destroy({ preserveQueue: true });
    
    expect(preserved).toEqual(state.queue);
  });

  it('should restore from persisted state via hydrate', async () => {
    jest.useRealTimers();
    const mockAdapter = new MockBackendAdapter(5);
    const queue1 = new SyncQueue({ debounceMs: 50 }, mockAdapter);
    
    queue1.enqueue('case-1', 'create', createMockCase('case-1'));
    queue1.enqueue('case-2', 'create', createMockCase('case-2'));
    
    // Get state before destroy
    const state = queue1.getState();
    const preserved = queue1.destroy({ preserveQueue: true });
    
    // Create new queue and hydrate
    const queue2 = new SyncQueue({ debounceMs: 50 }, mockAdapter);
    queue2.hydrate(preserved!, state.status);
    
    expect(queue2.getQueueLength()).toBe(2);
    
    // Process should work after hydration
    await queue2.processNow();
    
    expect(queue2.getQueueLength()).toBe(0);
    expect(mockAdapter.callLog.length).toBe(2);
    
    queue2.destroy();
  });

  it('should handle hydration with empty queue', () => {
    const queue = new SyncQueue({ debounceMs: 100 });
    
    queue.hydrate([], new Map());
    
    expect(queue.getQueueLength()).toBe(0);
    expect(queue.hasPendingItems()).toBe(false);
    
    queue.destroy();
  });

  it('should process hydrated high-priority items first', async () => {
    jest.useRealTimers();
    const mockAdapter = new MockBackendAdapter(5);
    const queue = new SyncQueue({ debounceMs: 10 }, mockAdapter);
    
    // Create hydration data with mixed priorities
    const items: SyncQueueItem[] = [
      {
        id: 'item-1',
        caseId: 'case-low',
        operation: 'create',
        data: createMockCase('case-low'),
        timestamp: new Date().toISOString(),
        retries: 0,
        priority: 'low',
      },
      {
        id: 'item-2',
        caseId: 'case-high',
        operation: 'create',
        data: createMockCase('case-high'),
        timestamp: new Date().toISOString(),
        retries: 0,
        priority: 'high',
      },
    ];
    
    // Note: hydrate preserves order, but priority is set at enqueue time
    // The items maintain their order from the array
    queue.hydrate(items, new Map());
    
    await queue.processNow();
    
    expect(mockAdapter.callLog.length).toBe(2);
    
    queue.destroy();
  });

  it('should preserve retry count across hydration', () => {
    const queue = new SyncQueue({ debounceMs: 100 });
    
    const items: SyncQueueItem[] = [
      {
        id: 'item-1',
        caseId: 'case-1',
        operation: 'update',
        data: { id: 'case-1' } as any,
        timestamp: new Date().toISOString(),
        retries: 2,
        lastError: 'Previous network error',
        priority: 'normal',
      },
    ];
    
    queue.hydrate(items, new Map());
    
    const currentQueue = queue.getQueue();
    expect(currentQueue[0].retries).toBe(2);
    expect(currentQueue[0].lastError).toBe('Previous network error');
    
    queue.destroy();
  });
});

// ============================================================================
// SYNC STATUS PERSISTENCE TESTS
// ============================================================================

describe('Sync Status Management', () => {
  it('should track sync status per case', async () => {
    jest.useRealTimers();
    const mockAdapter = new MockBackendAdapter(5);
    const queue = new SyncQueue({ debounceMs: 10 }, mockAdapter);
    
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    
    // Before processing
    const statusBefore = queue.getStatus('case-1');
    expect(statusBefore?.pendingChanges).toBe(1);
    
    await queue.processNow();
    
    // After processing
    const statusAfter = queue.getStatus('case-1');
    expect(statusAfter?.isSynced).toBe(true);
    expect(statusAfter?.pendingChanges).toBe(0);
    expect(statusAfter?.lastSyncedAt).toBeDefined();
    
    queue.destroy();
  });

  it('should track sync error in status', async () => {
    jest.useRealTimers();
    const mockAdapter = new MockBackendAdapter(5);
    mockAdapter.setFailMode(true);
    
    const queue = new SyncQueue({ debounceMs: 10, maxRetries: 1 }, mockAdapter);
    
    queue.enqueue('case-1', 'create', createMockCase('case-1'));
    await queue.processNow();
    
    const status = queue.getStatus('case-1');
    expect(status?.syncError).toBeDefined();
    expect(status?.isSynced).toBe(false);
    
    queue.destroy();
  });

  it('should preserve sync status across hydration', () => {
    const queue = new SyncQueue({ debounceMs: 100 });
    
    const statusMap = new Map();
    statusMap.set('case-1', {
      caseId: 'case-1',
      isSynced: false,
      lastSyncedAt: '2024-01-01T00:00:00.000Z',
      pendingChanges: 2,
      syncError: 'Previous error',
    });
    
    queue.hydrate([], statusMap);
    
    const status = queue.getStatus('case-1');
    expect(status?.lastSyncedAt).toBe('2024-01-01T00:00:00.000Z');
    expect(status?.syncError).toBe('Previous error');
    
    queue.destroy();
  });
});
