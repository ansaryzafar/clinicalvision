/**
 * BackendSyncService TDD Tests
 *
 * Phase F, Step F.1 — Backend adapter with queue, retry, backoff, and offline support.
 *
 * Timer Strategy:
 *   The service uses Promise.resolve().then() for scheduling and setTimeout for
 *   backoff delays. Tests use jest.useFakeTimers() and a flush() helper that
 *   advances timers and drains the microtask queue to deterministically step
 *   through the async processing pipeline.
 *
 * @jest-environment jsdom
 */

import {
  BackendSyncService,
  SyncStatus,
  SyncOperation,
  SyncOperationType,
} from '../BackendSyncService';

// ============================================================================
// TIMER HELPERS
// ============================================================================

/**
 * Flush one round of microtasks + pending timers.
 * Call repeatedly to step through async queue processing.
 */
async function flush(): Promise<void> {
  // Drain the microtask queue (Promise.resolve callbacks)
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  // Run any pending setTimeout callbacks
  jest.runAllTimers();
  // Drain again for callbacks scheduled by timers
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

/**
 * Advance timers by a specific amount and flush microtasks.
 */
async function advanceAndFlush(ms: number): Promise<void> {
  jest.advanceTimersByTime(ms);
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

// ============================================================================
// MOCK EXECUTOR
// ============================================================================

function createMockExecutor() {
  const calls: Array<{ type: SyncOperationType; payload: unknown }> = [];
  let failCount = 0;
  let rejectWith: Error | null = null;

  const executor = async (op: SyncOperation): Promise<void> => {
    calls.push({ type: op.type, payload: op.payload });

    if (failCount > 0) {
      failCount--;
      throw rejectWith || new Error('Mock sync failure');
    }
  };

  return {
    executor,
    calls,
    /** Make the next N calls fail */
    failNext(n: number, error?: Error) {
      failCount = n;
      rejectWith = error || null;
    },
    reset() {
      calls.length = 0;
      failCount = 0;
      rejectWith = null;
    },
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('BackendSyncService', () => {
  let service: BackendSyncService;
  let mock: ReturnType<typeof createMockExecutor>;

  beforeEach(() => {
    jest.useFakeTimers();
    mock = createMockExecutor();
    service = new BackendSyncService(mock.executor);
    // Ensure we start "online"
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    service.dispose();
    jest.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // Test 1: Initial status is 'idle'
  // --------------------------------------------------------------------------
  it('should initialize with idle status', () => {
    expect(service.getStatus()).toBe('idle' as SyncStatus);
    expect(service.getPendingCount()).toBe(0);
  });

  // --------------------------------------------------------------------------
  // Test 2: syncCreate enqueues and executes a CREATE operation
  // --------------------------------------------------------------------------
  it('should enqueue and execute a CREATE operation via syncCreate', async () => {
    const payload = { caseId: 'local-1', data: { patient_first_name: 'Jane' } };

    service.syncCreate(payload);
    await flush();

    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].type).toBe('create');
    expect(mock.calls[0].payload).toEqual(payload);
    expect(service.getStatus()).toBe('synced' as SyncStatus);
  });

  // --------------------------------------------------------------------------
  // Test 3: syncUpdate enqueues and executes an UPDATE operation
  // --------------------------------------------------------------------------
  it('should enqueue and execute an UPDATE operation via syncUpdate', async () => {
    const payload = { caseId: 'local-1', data: { patient_last_name: 'Doe' } };

    service.syncUpdate(payload);
    await flush();

    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].type).toBe('update');
    expect(mock.calls[0].payload).toEqual(payload);
  });

  // --------------------------------------------------------------------------
  // Test 4: syncDelete enqueues and executes a DELETE operation
  // --------------------------------------------------------------------------
  it('should enqueue and execute a DELETE operation via syncDelete', async () => {
    const payload = { caseId: 'local-1' };

    service.syncDelete(payload);
    await flush();

    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].type).toBe('delete');
    expect(mock.calls[0].payload).toEqual(payload);
  });

  // --------------------------------------------------------------------------
  // Test 5: syncFinalize enqueues and executes a FINALIZE operation
  // --------------------------------------------------------------------------
  it('should enqueue and execute a FINALIZE operation via syncFinalize', async () => {
    const payload = { caseId: 'local-1', signatureHash: 'abc123' };

    service.syncFinalize(payload);
    await flush();

    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].type).toBe('finalize');
    expect(mock.calls[0].payload).toEqual(payload);
  });

  // --------------------------------------------------------------------------
  // Test 6: Status transitions: idle → syncing → synced
  // --------------------------------------------------------------------------
  it('should transition status from idle to syncing to synced', async () => {
    const statuses: SyncStatus[] = [];
    service.onStatusChange((s) => statuses.push(s));

    service.syncCreate({ caseId: 'local-1', data: {} });

    // After microtask flush, processNext should have run
    await flush();

    expect(statuses).toContain('syncing');
    expect(statuses).toContain('synced');
    expect(service.getStatus()).toBe('synced' as SyncStatus);
  });

  // --------------------------------------------------------------------------
  // Test 7: Retry on transient failure with exponential backoff
  // --------------------------------------------------------------------------
  it('should retry failed operations with exponential backoff', async () => {
    // Fail the first 2 attempts, succeed on 3rd
    mock.failNext(2);

    service.syncCreate({ caseId: 'local-1', data: {} });

    // 1st attempt — immediate (microtask), fails
    await advanceAndFlush(0);
    expect(mock.calls).toHaveLength(1);
    expect(service.getStatus()).toBe('error' as SyncStatus);

    // 2nd attempt — after 1s backoff (retry 1, backoff = 1000ms), fails
    await advanceAndFlush(1000);
    // Need another flush for the processNext scheduled by the timer callback
    await advanceAndFlush(0);
    expect(mock.calls).toHaveLength(2);

    // 3rd attempt — after 2s backoff (retry 2, backoff = 2000ms), succeeds
    await advanceAndFlush(2000);
    await advanceAndFlush(0);
    expect(mock.calls).toHaveLength(3);
    expect(service.getStatus()).toBe('synced' as SyncStatus);
  });

  // --------------------------------------------------------------------------
  // Test 8: Max retry limit — gives up after maxRetries
  // --------------------------------------------------------------------------
  it('should give up after maxRetries and set status to error', async () => {
    // Create service with maxRetries=2
    service.dispose();
    service = new BackendSyncService(mock.executor, { maxRetries: 2 });

    // Fail all attempts
    mock.failNext(10);

    service.syncCreate({ caseId: 'local-1', data: {} });

    // 1st attempt (fails)
    await advanceAndFlush(0);
    expect(mock.calls).toHaveLength(1);

    // 2nd attempt — retry 1, after 1s backoff
    await advanceAndFlush(1000);
    await advanceAndFlush(0);
    expect(mock.calls).toHaveLength(2);

    // 3rd attempt — retry 2, after 2s backoff
    await advanceAndFlush(2000);
    await advanceAndFlush(0);
    expect(mock.calls).toHaveLength(3);

    // Should not retry further
    await advanceAndFlush(10000);
    expect(mock.calls).toHaveLength(3); // 1 initial + 2 retries = 3

    expect(service.getStatus()).toBe('error' as SyncStatus);
    expect(service.getPendingCount()).toBe(1); // 1 in failedOps
  });

  // --------------------------------------------------------------------------
  // Test 9: Queue processes operations in FIFO order
  // --------------------------------------------------------------------------
  it('should process queued operations in FIFO order', async () => {
    const payload1 = { caseId: 'local-1', data: { step: 1 } };
    const payload2 = { caseId: 'local-2', data: { step: 2 } };
    const payload3 = { caseId: 'local-3', data: { step: 3 } };

    service.syncCreate(payload1);
    service.syncUpdate(payload2);
    service.syncDelete(payload3);

    // Flush multiple rounds to process all 3 items
    await flush();
    await flush();
    await flush();

    expect(mock.calls).toHaveLength(3);
    expect(mock.calls[0].type).toBe('create');
    expect(mock.calls[0].payload).toEqual(payload1);
    expect(mock.calls[1].type).toBe('update');
    expect(mock.calls[1].payload).toEqual(payload2);
    expect(mock.calls[2].type).toBe('delete');
    expect(mock.calls[2].payload).toEqual(payload3);
  });

  // --------------------------------------------------------------------------
  // Test 10: Pending count tracks unprocessed operations
  // --------------------------------------------------------------------------
  it('should track pending count correctly', async () => {
    // Go offline so items queue without processing
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });
    window.dispatchEvent(new Event('offline'));

    service.syncCreate({ caseId: '1', data: {} });
    service.syncUpdate({ caseId: '2', data: {} });
    service.syncDelete({ caseId: '3' });

    expect(service.getPendingCount()).toBe(3);

    // Come back online and process all
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
    window.dispatchEvent(new Event('online'));

    await flush();
    await flush();
    await flush();

    expect(service.getPendingCount()).toBe(0);
  });

  // --------------------------------------------------------------------------
  // Test 11: Offline detection sets status to 'offline'
  // --------------------------------------------------------------------------
  it('should detect offline state and set status to offline', () => {
    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });
    window.dispatchEvent(new Event('offline'));

    expect(service.getStatus()).toBe('offline' as SyncStatus);

    // Come back online
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
    window.dispatchEvent(new Event('online'));

    // Should resume (back to idle since no pending ops)
    expect(service.getStatus()).not.toBe('offline');
  });

  // --------------------------------------------------------------------------
  // Test 12: Operations queued while offline are processed when online
  // --------------------------------------------------------------------------
  it('should queue operations while offline and process when back online', async () => {
    // Go offline
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });
    window.dispatchEvent(new Event('offline'));

    service.syncCreate({ caseId: 'local-1', data: {} });

    // Nothing should have been called
    await advanceAndFlush(100);
    expect(mock.calls).toHaveLength(0);
    expect(service.getPendingCount()).toBe(1);

    // Come back online
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
    window.dispatchEvent(new Event('online'));

    await flush();
    await flush();

    expect(mock.calls).toHaveLength(1);
    expect(service.getStatus()).toBe('synced' as SyncStatus);
  });

  // --------------------------------------------------------------------------
  // Test 13: retryAll re-processes failed operations
  // --------------------------------------------------------------------------
  it('should re-process failed operations via retryAll', async () => {
    service.dispose();
    service = new BackendSyncService(mock.executor, { maxRetries: 0 });

    mock.failNext(1);

    service.syncCreate({ caseId: 'local-1', data: {} });
    await flush();

    expect(service.getStatus()).toBe('error' as SyncStatus);
    expect(mock.calls).toHaveLength(1);

    // Retry — should succeed now (mock no longer failing)
    service.retryAll();
    await flush();
    await flush();

    expect(mock.calls).toHaveLength(2);
    expect(service.getStatus()).toBe('synced' as SyncStatus);
  });

  // --------------------------------------------------------------------------
  // Test 14: dispose cleans up listeners and stops processing
  // --------------------------------------------------------------------------
  it('should clean up on dispose and stop processing', async () => {
    // Queue something but dispose before processing completes
    service.syncCreate({ caseId: 'local-1', data: {} });

    // Process the first
    await flush();
    expect(mock.calls).toHaveLength(1);

    // Dispose
    service.dispose();

    // New operations after dispose should be no-ops
    service.syncCreate({ caseId: 'local-2', data: {} });
    await flush();

    // Only the first call should have gone through
    expect(mock.calls).toHaveLength(1);
  });

  // --------------------------------------------------------------------------
  // Test 15: onStatusChange callback fires on each transition
  // --------------------------------------------------------------------------
  it('should notify listeners via onStatusChange', async () => {
    const listener = jest.fn();
    const unsubscribe = service.onStatusChange(listener);

    service.syncCreate({ caseId: 'local-1', data: {} });
    await flush();

    expect(listener).toHaveBeenCalled();

    // Verify we received at least syncing and synced
    const statuses = listener.mock.calls.map((c: unknown[]) => c[0]);
    expect(statuses).toContain('syncing');
    expect(statuses).toContain('synced');

    // Unsubscribe should stop notifications
    unsubscribe();
    listener.mockClear();

    service.syncUpdate({ caseId: 'local-2', data: {} });
    await flush();

    expect(listener).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Test 16: getLastError returns the last sync error
  // --------------------------------------------------------------------------
  it('should expose the last sync error via getLastError', async () => {
    service.dispose();
    service = new BackendSyncService(mock.executor, { maxRetries: 0 });

    const errorMsg = 'Network timeout';
    mock.failNext(1, new Error(errorMsg));

    service.syncCreate({ caseId: 'local-1', data: {} });
    await flush();

    const lastError = service.getLastError();
    expect(lastError).not.toBeNull();
    expect(lastError!.message).toContain(errorMsg);
  });

  // --------------------------------------------------------------------------
  // Test 17: Operations preserve their type through the queue
  // --------------------------------------------------------------------------
  it('should preserve operation types through the queue lifecycle', async () => {
    service.syncCreate({ caseId: '1', data: {} });
    service.syncUpdate({ caseId: '2', data: {} });
    service.syncFinalize({ caseId: '3', signatureHash: 'sig' });
    service.syncDelete({ caseId: '4' });

    // Flush multiple rounds for sequential processing
    await flush();
    await flush();
    await flush();
    await flush();

    const types = mock.calls.map((c) => c.type);
    expect(types).toEqual(['create', 'update', 'finalize', 'delete']);
  });
});
