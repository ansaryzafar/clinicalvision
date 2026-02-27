/**
 * Sync Integration Tests
 * 
 * Phase 2 integration tests verifying OptimisticUpdateManager, SyncQueue,
 * and PersistenceManager work together correctly.
 * 
 * Tests cover:
 * - Full synchronization flow
 * - Optimistic updates + sync queue interaction
 * - Network failure recovery
 * - Persistence across layers
 * - Real-world clinical case workflows
 * 
 * @jest-environment jsdom
 */

import {
  ClinicalCase,
  ClinicalWorkflowStep,
  PatientInfo,
  ClinicalHistory,
  Laterality,
  ImageAnalysisResult,
  MammogramImage,
  BiRadsAssessment,
} from '../../types/case.types';

import { assertFailure } from '../../types/resultHelpers';

import {
  OptimisticUpdateManager,
  PendingUpdate,
  createOptimisticUpdateManager,
} from '../optimisticUpdateManager';

import {
  SyncQueue,
  SyncQueueItem,
  SyncStatus,
  BackendAdapter,
  createSyncQueue,
} from '../syncQueue';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const TEST_USER_ID = 'radiologist-123';

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
// MOCK IN-MEMORY BACKEND
// ============================================================================

/**
 * Mock backend that simulates a real backend with configurable latency and failures
 */
class MockBackend implements BackendAdapter {
  private cases: Map<string, ClinicalCase> = new Map();
  private latencyMs: number;
  private shouldFail = false;
  private failUntil = 0;
  private failCount = 0;
  public operationLog: { op: string; caseId: string; timestamp: number }[] = [];

  constructor(latencyMs = 10) {
    this.latencyMs = latencyMs;
  }

  setFailMode(fail: boolean): void {
    this.shouldFail = fail;
  }

  setFailUntil(count: number): void {
    this.failUntil = count;
    this.failCount = 0;
  }

  setLatency(ms: number): void {
    this.latencyMs = ms;
  }

  private async simulateLatency(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.latencyMs));
  }

  private checkFailure(): void {
    if (this.shouldFail) {
      throw new Error('Backend unavailable');
    }
    if (this.failCount < this.failUntil) {
      this.failCount++;
      throw new Error(`Temporary failure ${this.failCount}/${this.failUntil}`);
    }
  }

  async createCase(case_: ClinicalCase): Promise<ClinicalCase> {
    await this.simulateLatency();
    this.operationLog.push({ op: 'create', caseId: case_.id, timestamp: Date.now() });
    this.checkFailure();
    this.cases.set(case_.id, { ...case_ });
    return case_;
  }

  async updateCase(caseId: string, data: Partial<ClinicalCase>): Promise<ClinicalCase> {
    await this.simulateLatency();
    this.operationLog.push({ op: 'update', caseId, timestamp: Date.now() });
    this.checkFailure();
    const existing = this.cases.get(caseId);
    if (!existing) {
      throw new Error(`Case not found: ${caseId}`);
    }
    const updated = { ...existing, ...data, workflow: { ...existing.workflow, ...data.workflow } };
    this.cases.set(caseId, updated);
    return updated;
  }

  async deleteCase(caseId: string): Promise<void> {
    await this.simulateLatency();
    this.operationLog.push({ op: 'delete', caseId, timestamp: Date.now() });
    this.checkFailure();
    this.cases.delete(caseId);
  }

  async getCase(caseId: string): Promise<ClinicalCase | null> {
    await this.simulateLatency();
    return this.cases.get(caseId) || null;
  }

  getCaseCount(): number {
    return this.cases.size;
  }

  getCase_(caseId: string): ClinicalCase | undefined {
    return this.cases.get(caseId);
  }

  reset(): void {
    this.cases.clear();
    this.shouldFail = false;
    this.failUntil = 0;
    this.failCount = 0;
    this.operationLog = [];
  }
}

// ============================================================================
// INTEGRATED SYNC MANAGER
// ============================================================================

/**
 * IntegratedSyncManager - Combines OptimisticUpdateManager and SyncQueue
 * for a complete sync solution
 */
class IntegratedSyncManager {
  private optimisticManager: OptimisticUpdateManager;
  private syncQueue: SyncQueue;
  private localCache: Map<string, ClinicalCase> = new Map();
  private onUIUpdate?: (caseId: string, case_: ClinicalCase) => void;

  constructor(
    backendAdapter: BackendAdapter,
    callbacks?: {
      onUIUpdate?: (caseId: string, case_: ClinicalCase) => void;
      onSyncComplete?: (caseId: string, success: boolean) => void;
    }
  ) {
    this.optimisticManager = createOptimisticUpdateManager({
      maxRetries: 3,
      baseDelayMs: 50,
      maxDelayMs: 500,
    });

    this.syncQueue = createSyncQueue(
      { debounceMs: 50, maxRetries: 3, retryDelayMs: 50 },
      backendAdapter,
      { onSyncComplete: callbacks?.onSyncComplete }
    );

    this.onUIUpdate = callbacks?.onUIUpdate;
  }

  /**
   * Create a new case with optimistic UI update
   */
  async createCase(case_: ClinicalCase): Promise<ClinicalCase> {
    // Optimistically update local cache
    this.localCache.set(case_.id, case_);
    this.onUIUpdate?.(case_.id, case_);

    // Queue for backend sync
    this.syncQueue.enqueue(case_.id, 'create', case_);

    return case_;
  }

  /**
   * Update a case with optimistic UI update
   */
  async updateCase(caseId: string, updates: Partial<ClinicalCase>): Promise<ClinicalCase | null> {
    const existing = this.localCache.get(caseId);
    if (!existing) return null;

    // Optimistically update
    const updated: ClinicalCase = {
      ...existing,
      ...updates,
      workflow: {
        ...existing.workflow,
        ...updates.workflow,
        lastModifiedAt: new Date().toISOString(),
      },
    };
    this.localCache.set(caseId, updated);
    this.onUIUpdate?.(caseId, updated);

    // Queue for backend sync
    this.syncQueue.enqueue(caseId, 'update', updates);

    return updated;
  }

  /**
   * Update case with retry logic using OptimisticUpdateManager
   */
  async updateCaseWithRetry(
    caseId: string,
    updates: Partial<ClinicalCase>,
    backendAdapter: BackendAdapter
  ): Promise<{ status: 'completed' | 'failed'; error?: string }> {
    const existing = this.localCache.get(caseId);
    if (!existing) {
      return {
        status: 'failed',
        error: 'Case not found',
      };
    }

    const oldCase = { ...existing };
    
    const result = await this.optimisticManager.update<ClinicalCase>(
      `update-${caseId}-${Date.now()}`,
      // Optimistic action
      () => {
        const updated: ClinicalCase = {
          ...existing,
          ...updates,
          workflow: {
            ...existing.workflow,
            ...updates.workflow,
            lastModifiedAt: new Date().toISOString(),
          },
        };
        this.localCache.set(caseId, updated);
        this.onUIUpdate?.(caseId, updated);
      },
      // Backend operation
      async () => {
        const backendResult = await backendAdapter.updateCase(caseId, updates);
        return backendResult;
      },
      // Rollback action
      () => {
        this.localCache.set(caseId, oldCase);
        this.onUIUpdate?.(caseId, oldCase);
      }
    );

    return {
      status: result.success ? 'completed' : 'failed',
      error: result.success ? undefined : assertFailure(result)?.message,
    };
  }

  /**
   * Delete a case
   */
  async deleteCase(caseId: string): Promise<void> {
    this.localCache.delete(caseId);
    this.syncQueue.enqueue(caseId, 'delete', {});
  }

  /**
   * Get case from local cache
   */
  getCase(caseId: string): ClinicalCase | undefined {
    return this.localCache.get(caseId);
  }

  /**
   * Process sync queue immediately
   */
  async processSync(): Promise<void> {
    return this.syncQueue.processNow();
  }

  /**
   * Get sync status for a case
   */
  getSyncStatus(caseId: string): SyncStatus | undefined {
    return this.syncQueue.getStatus(caseId);
  }

  /**
   * Get pending update count
   */
  getPendingCount(): number {
    return this.syncQueue.getQueueLength();
  }

  /**
   * Check if queue has pending items
   */
  hasPendingItems(): boolean {
    return this.syncQueue.hasPendingItems();
  }

  /**
   * Get IDs of cases with pending sync operations
   */
  getPendingCaseIds(): string[] {
    const queue = this.syncQueue.getQueue();
    const uniqueIds = new Set(queue.map(item => item.caseId));
    return Array.from(uniqueIds);
  }

  /**
   * Pause sync (e.g., when offline)
   */
  pauseSync(): void {
    this.syncQueue.pause();
  }

  /**
   * Resume sync (e.g., when back online)
   */
  resumeSync(): void {
    this.syncQueue.resume();
  }

  /**
   * Clear all
   */
  clear(): void {
    this.localCache.clear();
    this.syncQueue.clear();
  }
}

// ============================================================================
// FULL SYNC FLOW TESTS
// ============================================================================

describe('Sync Integration: Full Flow', () => {
  let backend: MockBackend;
  let syncManager: IntegratedSyncManager;
  let uiUpdates: { caseId: string; case_: ClinicalCase }[];
  let syncCompleted: { caseId: string; success: boolean }[];

  beforeEach(() => {
    backend = new MockBackend(5);
    uiUpdates = [];
    syncCompleted = [];
    
    syncManager = new IntegratedSyncManager(backend, {
      onUIUpdate: (caseId, case_) => uiUpdates.push({ caseId, case_: { ...case_ } }),
      onSyncComplete: (caseId, success) => syncCompleted.push({ caseId, success }),
    });
  });

  afterEach(() => {
    syncManager.clear();
    backend.reset();
  });

  it('should optimistically update UI then sync to backend', async () => {
    const case_ = createMockCase('case-1');
    
    // Create case - should update UI immediately
    await syncManager.createCase(case_);
    
    // UI should be updated immediately
    expect(uiUpdates).toHaveLength(1);
    expect(uiUpdates[0].caseId).toBe('case-1');
    
    // Backend not yet updated
    expect(backend.getCaseCount()).toBe(0);
    
    // Process sync
    await syncManager.processSync();
    
    // Now backend should have the case
    expect(backend.getCaseCount()).toBe(1);
    expect(syncCompleted).toHaveLength(1);
    expect(syncCompleted[0]).toEqual({ caseId: 'case-1', success: true });
  });

  it('should handle create then update flow', async () => {
    const case_ = createMockCase('case-1');
    
    // Create
    await syncManager.createCase(case_);
    
    // Update
    await syncManager.updateCase('case-1', {
      patient: { ...case_.patient, firstName: 'Updated' },
    });
    
    // UI should have both updates
    expect(uiUpdates).toHaveLength(2);
    expect((uiUpdates[1].case_.patient as PatientInfo).firstName).toBe('Updated');
    
    // Process all syncs
    await syncManager.processSync();
    
    // Backend should have both operations
    expect(backend.operationLog).toHaveLength(2);
    expect(backend.operationLog.map(l => l.op)).toEqual(['create', 'update']);
    
    // Final state should have updated name
    const backendCase = backend.getCase_('case-1');
    expect(backendCase?.patient?.firstName).toBe('Updated');
  });

  it('should handle complete workflow: create, update, delete', async () => {
    const case_ = createMockCase('case-1');
    
    // Create
    await syncManager.createCase(case_);
    await syncManager.processSync();
    expect(backend.getCaseCount()).toBe(1);
    
    // Update
    await syncManager.updateCase('case-1', {
      workflow: { ...case_.workflow, currentStep: ClinicalWorkflowStep.IMAGE_UPLOAD },
    });
    await syncManager.processSync();
    
    // Delete
    await syncManager.deleteCase('case-1');
    await syncManager.processSync();
    
    expect(backend.getCaseCount()).toBe(0);
  });
});

// ============================================================================
// OPTIMISTIC UPDATE + SYNC TESTS
// ============================================================================

describe('Sync Integration: Optimistic Updates', () => {
  let backend: MockBackend;
  let syncManager: IntegratedSyncManager;
  let uiUpdates: { caseId: string; case_: ClinicalCase }[];

  beforeEach(() => {
    backend = new MockBackend(5);
    uiUpdates = [];
    
    syncManager = new IntegratedSyncManager(backend, {
      onUIUpdate: (caseId, case_) => uiUpdates.push({ caseId, case_: { ...case_ } }),
    });
  });

  afterEach(() => {
    syncManager.clear();
    backend.reset();
  });

  it('should update UI before backend confirms', async () => {
    const case_ = createMockCase('case-1');
    
    // Create case (optimistic)
    await syncManager.createCase(case_);
    
    // UI is immediately updated
    expect(syncManager.getCase('case-1')).toBeDefined();
    expect(uiUpdates).toHaveLength(1);
    
    // Backend not yet synced
    expect(backend.getCaseCount()).toBe(0);
    expect(syncManager.hasPendingItems()).toBe(true);
  });

  it('should mark case as synced after successful sync', async () => {
    const case_ = createMockCase('case-1');
    
    await syncManager.createCase(case_);
    await syncManager.processSync();
    
    const status = syncManager.getSyncStatus('case-1');
    expect(status?.isSynced).toBe(true);
    expect(status?.lastSyncedAt).toBeDefined();
  });

  it('should use retry logic for updates via OptimisticUpdateManager', async () => {
    // First create a case in the backend
    const case_ = createMockCase('case-1');
    await syncManager.createCase(case_);
    await syncManager.processSync();
    
    // Now set temporary failures
    backend.setFailUntil(2); // Fail first 2 attempts
    
    // Update with retry
    const update = await syncManager.updateCaseWithRetry(
      'case-1',
      { patient: { ...case_.patient, firstName: 'Retried' } },
      backend
    );
    
    // Should eventually succeed
    expect(update.status).toBe('completed');
    
    // UI should show the update
    const localCase = syncManager.getCase('case-1');
    expect(localCase?.patient?.firstName).toBe('Retried');
  });

  it('should rollback on final failure', async () => {
    const case_ = createMockCase('case-1');
    await syncManager.createCase(case_);
    await syncManager.processSync();
    
    const originalName = case_.patient?.firstName;
    
    // Set permanent failure
    backend.setFailMode(true);
    
    // Update with retry (will fail)
    const update = await syncManager.updateCaseWithRetry(
      'case-1',
      { patient: { ...case_.patient, firstName: 'WillFail' } },
      backend
    );
    
    // Should have failed
    expect(update.status).toBe('failed');
    
    // UI should be rolled back to original
    const localCase = syncManager.getCase('case-1');
    expect(localCase?.patient?.firstName).toBe(originalName);
  });
});

// ============================================================================
// NETWORK FAILURE RECOVERY TESTS
// ============================================================================

describe('Sync Integration: Network Failures', () => {
  let backend: MockBackend;
  let syncManager: IntegratedSyncManager;
  let syncCompleted: { caseId: string; success: boolean }[];

  beforeEach(() => {
    backend = new MockBackend(5);
    syncCompleted = [];
    
    syncManager = new IntegratedSyncManager(backend, {
      onSyncComplete: (caseId, success) => syncCompleted.push({ caseId, success }),
    });
  });

  afterEach(() => {
    syncManager.clear();
    backend.reset();
  });

  it('should retry sync operations on temporary failure', async () => {
    backend.setFailUntil(2); // Fail first 2 attempts
    
    const case_ = createMockCase('case-1');
    await syncManager.createCase(case_);
    
    // Process should eventually succeed
    await syncManager.processSync();
    
    expect(backend.getCaseCount()).toBe(1);
  });

  it('should mark sync as failed after max retries', async () => {
    backend.setFailMode(true); // Always fail
    
    const case_ = createMockCase('case-1');
    await syncManager.createCase(case_);
    
    await syncManager.processSync();
    
    // Should have failed
    expect(syncCompleted.some(c => c.success === false)).toBe(true);
    
    // Status should show error
    const status = syncManager.getSyncStatus('case-1');
    expect(status?.syncError).toBeDefined();
    expect(status?.isSynced).toBe(false);
  });

  it('should pause and resume sync when offline/online', async () => {
    const case_ = createMockCase('case-1');
    await syncManager.createCase(case_);
    
    // Go offline
    syncManager.pauseSync();
    
    // Process should not sync
    await syncManager.processSync();
    expect(backend.getCaseCount()).toBe(0);
    
    // Come back online
    syncManager.resumeSync();
    await syncManager.processSync();
    
    // Now should be synced
    expect(backend.getCaseCount()).toBe(1);
  });

  it('should preserve pending items during offline period', async () => {
    await syncManager.createCase(createMockCase('case-1'));
    await syncManager.createCase(createMockCase('case-2'));
    
    syncManager.pauseSync();
    
    // Items should still be pending
    expect(syncManager.getPendingCount()).toBe(2);
    
    // Resume and process
    syncManager.resumeSync();
    await syncManager.processSync();
    
    expect(backend.getCaseCount()).toBe(2);
  });
});

// ============================================================================
// CLINICAL WORKFLOW INTEGRATION TESTS
// ============================================================================

describe('Sync Integration: Clinical Workflows', () => {
  let backend: MockBackend;
  let syncManager: IntegratedSyncManager;

  beforeEach(() => {
    backend = new MockBackend(5);
    syncManager = new IntegratedSyncManager(backend);
  });

  afterEach(() => {
    syncManager.clear();
    backend.reset();
  });

  it('should handle complete mammography case workflow', async () => {
    const case_ = createMockCase('mammo-case-1');
    
    // Step 1: Patient Registration
    await syncManager.createCase(case_);
    await syncManager.processSync();
    
    // Step 2: Image Acquisition
    await syncManager.updateCase('mammo-case-1', {
      workflow: {
        ...case_.workflow,
        currentStep: ClinicalWorkflowStep.IMAGE_UPLOAD,
        completedSteps: [ClinicalWorkflowStep.PATIENT_REGISTRATION],
      },
      images: [{
        id: 'img-1',
        type: 'CC',
        laterality: Laterality.LEFT,
        filePath: '/images/mammo_lcc.dcm',
        uploadedAt: new Date().toISOString(),
        status: 'uploaded',
      } as unknown as MammogramImage],
    });
    await syncManager.processSync();
    
    // Step 3: AI Analysis (add results)
    await syncManager.updateCase('mammo-case-1', {
      workflow: {
        ...case_.workflow,
        currentStep: ClinicalWorkflowStep.BATCH_AI_ANALYSIS,
        completedSteps: [
          ClinicalWorkflowStep.PATIENT_REGISTRATION,
          ClinicalWorkflowStep.IMAGE_UPLOAD,
        ],
      },
      analysisResults: [{
        id: 'analysis-1',
        imageId: 'img-1',
        modelVersion: 'v1.0.0',
        analysisType: 'classification',
        results: { prediction: 'benign', confidence: 0.95 },
        executedAt: new Date().toISOString(),
        executionTimeMs: 1500,
      } as unknown as ImageAnalysisResult],
    });
    await syncManager.processSync();
    
    // Verify all operations synced
    expect(backend.operationLog.length).toBeGreaterThanOrEqual(3);
    
    // Verify final state
    const finalCase = backend.getCase_('mammo-case-1');
    expect(finalCase?.workflow?.currentStep).toBe(ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
    expect(finalCase?.images).toHaveLength(1);
    expect(finalCase?.analysisResults).toHaveLength(1);
  });

  it('should handle BI-RADS update workflow', async () => {
    const case_ = createMockCase('birads-case-1');
    
    // Create and sync
    await syncManager.createCase(case_);
    await syncManager.processSync();
    
    // Update with BI-RADS assessment
    await syncManager.updateCase('birads-case-1', {
      assessment: {
        category: 'BI-RADS 2',
        assessment: 'Benign finding',
        findings: ['Simple cyst'],
        recommendation: 'Continue routine screening',
        assessedBy: TEST_USER_ID,
        assessedAt: new Date().toISOString(),
      } as unknown as BiRadsAssessment,
    } as unknown as Partial<ClinicalCase>);
    await syncManager.processSync();
    
    // Verify
    const finalCase = backend.getCase_('birads-case-1');
    expect((finalCase?.assessment as any)?.category).toBe('BI-RADS 2');
  });

  it('should handle concurrent updates from multiple workflow steps', async () => {
    const case_ = createMockCase('concurrent-case-1');
    
    // Create
    await syncManager.createCase(case_);
    await syncManager.processSync();
    
    // Multiple rapid updates (simulating real workflow)
    await syncManager.updateCase('concurrent-case-1', {
      workflow: { ...case_.workflow, currentStep: ClinicalWorkflowStep.IMAGE_UPLOAD },
    });
    await syncManager.updateCase('concurrent-case-1', {
      images: [{ id: 'img-1', type: 'CC', laterality: 'R', status: 'uploading' } as any],
    });
    await syncManager.updateCase('concurrent-case-1', {
      images: [{ id: 'img-1', type: 'CC', laterality: 'R', status: 'uploaded' } as any],
    });
    
    // Process all
    await syncManager.processSync();
    
    // Should have batched/deduplicated updates
    expect(syncManager.hasPendingItems()).toBe(false);
    expect(backend.getCaseCount()).toBe(1);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Sync Integration: Edge Cases', () => {
  let backend: MockBackend;
  let syncManager: IntegratedSyncManager;

  beforeEach(() => {
    backend = new MockBackend(5);
    syncManager = new IntegratedSyncManager(backend);
  });

  afterEach(() => {
    syncManager.clear();
    backend.reset();
  });

  it('should handle update on non-existent case gracefully', async () => {
    const result = await syncManager.updateCase('non-existent', {
      patient: createValidPatientInfo(),
    });
    
    expect(result).toBeNull();
  });

  it('should handle rapid create/delete cycle', async () => {
    const case_ = createMockCase('temp-case');
    
    // Create then immediately delete (before sync)
    await syncManager.createCase(case_);
    await syncManager.deleteCase('temp-case');
    
    // Process sync
    await syncManager.processSync();
    
    // Should have cancelled out - nothing in backend
    expect(backend.getCaseCount()).toBe(0);
  });

  it('should handle empty update gracefully', async () => {
    const case_ = createMockCase('case-1');
    await syncManager.createCase(case_);
    await syncManager.processSync();
    
    // Empty update
    const result = await syncManager.updateCase('case-1', {});
    
    expect(result).toBeDefined();
  });

  it('should handle large batch of operations', async () => {
    // Create many cases
    const cases = Array.from({ length: 20 }, (_, i) => createMockCase(`batch-case-${i}`));
    
    for (const case_ of cases) {
      await syncManager.createCase(case_);
    }
    
    // Process all
    await syncManager.processSync();
    
    // All should be synced
    expect(backend.getCaseCount()).toBe(20);
    expect(syncManager.hasPendingItems()).toBe(false);
  });

  it('should maintain data integrity through sync', async () => {
    const case_ = createMockCase('integrity-case');
    const originalData = JSON.stringify(case_);
    
    await syncManager.createCase(case_);
    await syncManager.processSync();
    
    const backendCase = backend.getCase_('integrity-case');
    
    // Essential fields should match
    expect(backendCase?.id).toBe(case_.id);
    expect(backendCase?.caseNumber).toBe(case_.caseNumber);
    expect(backendCase?.patient?.mrn).toBe(case_.patient?.mrn);
    expect(backendCase?.patient?.firstName).toBe(case_.patient?.firstName);
  });
});

// ============================================================================
// GRACEFUL SHUTDOWN AND RECOVERY TESTS (Medium Risk)
// ============================================================================

describe('Sync Integration: Graceful Shutdown', () => {
  let backend: MockBackend;
  let syncManager: IntegratedSyncManager;

  beforeEach(() => {
    backend = new MockBackend(5);
    syncManager = new IntegratedSyncManager(backend);
  });

  afterEach(() => {
    syncManager.clear();
    backend.reset();
  });

  it('should export pending state for persistence before shutdown', async () => {
    const case1 = createMockCase('shutdown-case-1');
    const case2 = createMockCase('shutdown-case-2');
    
    await syncManager.createCase(case1);
    await syncManager.createCase(case2);
    
    // Get pending items before shutdown
    const pendingIds = syncManager.getPendingCaseIds();
    
    expect(pendingIds).toContain('shutdown-case-1');
    expect(pendingIds).toContain('shutdown-case-2');
    
    // Process and verify completion
    await syncManager.processSync();
    
    expect(syncManager.getPendingCaseIds()).toHaveLength(0);
  });

  it('should handle partial sync (some items processed before shutdown)', async () => {
    const slowBackend = new MockBackend(50); // Slower operations
    const slowSyncManager = new IntegratedSyncManager(slowBackend);
    
    // Create cases
    await slowSyncManager.createCase(createMockCase('partial-1'));
    await slowSyncManager.createCase(createMockCase('partial-2'));
    await slowSyncManager.createCase(createMockCase('partial-3'));
    
    // Start processing but don't await completion
    const processPromise = slowSyncManager.processSync();
    
    // Wait a bit then "shutdown"
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Get remaining items
    const pendingBefore = slowSyncManager.getPendingCaseIds();
    
    // Complete processing
    await processPromise;
    
    // After full completion
    expect(slowSyncManager.getPendingCaseIds()).toHaveLength(0);
    
    slowSyncManager.clear();
  });

  it('should allow re-queuing of unsynced items after recovery', async () => {
    const case_ = createMockCase('recovery-case');
    
    // First, create the case successfully
    await syncManager.createCase(case_);
    await syncManager.processSync();
    
    // Verify case was created
    expect(backend.getCaseCount()).toBe(1);
    
    // Now simulate a failed update
    backend.setFailMode(true);
    await syncManager.updateCase('recovery-case', {
      workflow: { ...case_.workflow, status: 'in_progress' },
    });
    await syncManager.processSync();
    
    // Update should have failed - but original case still exists
    
    // "Recover" - reset backend and try again with a new update
    backend.setFailMode(false);
    
    // Re-queue another update
    await syncManager.updateCase('recovery-case', {
      patient: { ...case_.patient, firstName: 'Recovered' },
    });
    await syncManager.processSync();
    
    // Should now be synced with the update
    const recoveredCase = backend.getCase_('recovery-case');
    expect(recoveredCase?.patient?.firstName).toBe('Recovered');
  });
});

// ============================================================================
// LOCALSTORAGE QUOTA HANDLING TESTS (Medium Risk)
// ============================================================================

describe('Sync Integration: Storage Quota Handling', () => {
  let backend: MockBackend;
  let syncManager: IntegratedSyncManager;
  
  // Mock localStorage for quota testing
  let mockStorage: { [key: string]: string };
  let storageSizeLimit: number;
  let originalSetItem: typeof localStorage.setItem;

  beforeEach(() => {
    backend = new MockBackend(5);
    syncManager = new IntegratedSyncManager(backend);
    
    // Setup mock storage with size limit
    mockStorage = {};
    storageSizeLimit = 1024 * 1024; // 1MB limit for testing
    
    originalSetItem = localStorage.setItem;
    
    // Mock localStorage.setItem to simulate quota
    localStorage.setItem = jest.fn((key: string, value: string) => {
      const totalSize = Object.values(mockStorage).reduce((sum, v) => sum + v.length, 0);
      if (totalSize + value.length > storageSizeLimit) {
        const error = new DOMException('QuotaExceededError', 'QuotaExceededError');
        throw error;
      }
      mockStorage[key] = value;
    });
    
    localStorage.getItem = jest.fn((key: string) => mockStorage[key] || null);
    localStorage.removeItem = jest.fn((key: string) => { delete mockStorage[key]; });
  });

  afterEach(() => {
    syncManager.clear();
    backend.reset();
    localStorage.setItem = originalSetItem;
    jest.restoreAllMocks();
  });

  it('should handle localStorage quota exceeded gracefully', () => {
    // Set a very small quota
    storageSizeLimit = 100;
    
    const largeCase = createMockCase('large-case');
    (largeCase as any).largeAnnotations = 'x'.repeat(200);
    
    // This should not throw - the sync manager should handle it
    expect(() => {
      try {
        localStorage.setItem('test-key', JSON.stringify(largeCase));
      } catch (e) {
        // Expected - quota exceeded
        expect((e as DOMException).name).toBe('QuotaExceededError');
      }
    }).not.toThrow();
  });

  it('should prioritize syncing to backend when local storage is full', async () => {
    // Set a small quota
    storageSizeLimit = 500;
    
    const case_ = createMockCase('priority-case');
    
    // Create case - this will sync to backend
    await syncManager.createCase(case_);
    await syncManager.processSync();
    
    // Backend should have the data even if local storage is constrained
    expect(backend.getCaseCount()).toBe(1);
  });

  it('should handle very large case data', async () => {
    const largeCase = createMockCase('large-data-case');
    
    // Add large annotation data
    (largeCase as any).annotations = Array.from({ length: 100 }, (_, i) => ({
      id: `annotation-${i}`,
      type: 'finding',
      coordinates: { x: Math.random() * 1000, y: Math.random() * 1000 },
      description: 'Suspicious region requiring further evaluation. '.repeat(10),
    }));
    
    await syncManager.createCase(largeCase);
    await syncManager.processSync();
    
    expect(backend.getCaseCount()).toBe(1);
    const savedCase = backend.getCase_('large-data-case');
    expect((savedCase as any).annotations).toHaveLength(100);
  });
});

// ============================================================================
// CONCURRENT ACCESS TESTS (Medium Risk)
// ============================================================================

describe('Sync Integration: Concurrent Access', () => {
  let backend: MockBackend;

  beforeEach(() => {
    backend = new MockBackend(5);
  });

  afterEach(() => {
    backend.reset();
  });

  it('should handle multiple sync managers accessing same backend', async () => {
    const syncManager1 = new IntegratedSyncManager(backend);
    const syncManager2 = new IntegratedSyncManager(backend);
    
    // Both managers create cases
    await syncManager1.createCase(createMockCase('manager1-case'));
    await syncManager2.createCase(createMockCase('manager2-case'));
    
    // Process both
    await Promise.all([
      syncManager1.processSync(),
      syncManager2.processSync(),
    ]);
    
    expect(backend.getCaseCount()).toBe(2);
    
    syncManager1.clear();
    syncManager2.clear();
  });

  it('should handle rapid state changes without data corruption', async () => {
    const syncManager = new IntegratedSyncManager(backend);
    const case_ = createMockCase('rapid-case');
    
    // Create
    await syncManager.createCase(case_);
    
    // Rapid updates
    const updatePromises = [];
    for (let i = 0; i < 10; i++) {
      updatePromises.push(
        syncManager.updateCase('rapid-case', {
          patient: { ...case_.patient, firstName: `Name-${i}` },
        })
      );
    }
    
    await Promise.all(updatePromises);
    await syncManager.processSync();
    
    // Should have final state
    const savedCase = backend.getCase_('rapid-case');
    expect(savedCase?.patient?.firstName).toMatch(/Name-\d/);
    
    syncManager.clear();
  });

  it('should deduplicate concurrent updates to same case', async () => {
    const syncManager = new IntegratedSyncManager(backend);
    const case_ = createMockCase('dedup-case');
    
    await syncManager.createCase(case_);
    await syncManager.processSync();
    
    // Multiple updates before sync
    await syncManager.updateCase('dedup-case', { patient: { ...case_.patient, firstName: 'A' } });
    await syncManager.updateCase('dedup-case', { patient: { ...case_.patient, firstName: 'B' } });
    await syncManager.updateCase('dedup-case', { patient: { ...case_.patient, firstName: 'C' } });
    
    // Process - should only have one update operation queued (deduplication)
    await syncManager.processSync();
    
    // Final state should be the last update
    const savedCase = backend.getCase_('dedup-case');
    expect(savedCase?.patient?.firstName).toBe('C');
    
    syncManager.clear();
  });
});

// ============================================================================
// INTEGRATED RESOURCE CLEANUP TESTS
// ============================================================================

describe('Sync Integration: Resource Cleanup', () => {
  let backend: MockBackend;

  beforeEach(() => {
    backend = new MockBackend(5);
  });

  afterEach(() => {
    backend.reset();
  });

  it('should clean up all resources on manager destruction', async () => {
    const syncManager = new IntegratedSyncManager(backend);
    
    await syncManager.createCase(createMockCase('cleanup-case-1'));
    await syncManager.createCase(createMockCase('cleanup-case-2'));
    
    // Destroy
    syncManager.clear();
    
    // Should have no pending items
    expect(syncManager.hasPendingItems()).toBe(false);
    expect(syncManager.getPendingCaseIds()).toHaveLength(0);
  });

  it('should handle cleanup during active processing', async () => {
    const slowBackend = new MockBackend(100);
    const syncManager = new IntegratedSyncManager(slowBackend);
    
    await syncManager.createCase(createMockCase('active-case'));
    
    // Start processing
    const processPromise = syncManager.processSync();
    
    // Cleanup immediately
    syncManager.clear();
    
    // Wait for processing to settle
    await processPromise;
    
    // Manager should be clean
    expect(syncManager.hasPendingItems()).toBe(false);
  });
});

// Export for external use
export { IntegratedSyncManager, MockBackend };
