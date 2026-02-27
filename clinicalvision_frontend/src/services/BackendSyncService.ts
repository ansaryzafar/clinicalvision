/**
 * BackendSyncService
 *
 * Phase F, Step F.1 — Robust backend synchronization service with:
 *   - Operation queuing (FIFO)
 *   - Retry with exponential backoff
 *   - Offline detection and resume
 *   - Status change notifications
 *   - Graceful disposal
 *
 * Design:
 *   Caller enqueues operations (create/update/delete/finalize) via convenience
 *   methods. The service processes them sequentially, retrying transient failures
 *   up to `maxRetries` times with exponential backoff (1s, 2s, 4s, …).
 *   When the browser goes offline, processing pauses and resumes on reconnect.
 *
 *   Implementation uses a non-blocking, timer-driven approach for testability
 *   with Jest fake timers. Each queue drain step is a single microtask; retry
 *   delays use setTimeout so they're controlled by jest.advanceTimersByTime().
 *
 * @module BackendSyncService
 */

// ============================================================================
// PUBLIC TYPES
// ============================================================================

/** Possible sync statuses */
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

/** Operation types that can be queued */
export type SyncOperationType = 'create' | 'update' | 'delete' | 'finalize' | 'add_image' | 'add_finding' | 'store_analysis';

/** A single sync operation in the queue */
export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  payload: unknown;
  retryCount: number;
  createdAt: number;
}

/** Error information exposed to callers */
export interface SyncError {
  message: string;
  operationId: string;
  operationType: SyncOperationType;
  timestamp: number;
}

/** Configuration options */
export interface BackendSyncServiceOptions {
  /** Maximum number of retries per operation (default: 3) */
  maxRetries?: number;
  /** Base backoff delay in ms (default: 1000) */
  baseBackoffMs?: number;
  /** Maximum backoff delay in ms (default: 30000) */
  maxBackoffMs?: number;
}

/** Executor function type — the actual backend call */
export type SyncExecutor = (operation: SyncOperation) => Promise<void>;

/** Status change listener */
export type StatusChangeListener = (status: SyncStatus) => void;

// ============================================================================
// IMPLEMENTATION
// ============================================================================

let operationCounter = 0;

function generateOpId(): string {
  return `sync-op-${++operationCounter}-${Date.now()}`;
}

export class BackendSyncService {
  // Configuration
  private readonly executor: SyncExecutor;
  private readonly maxRetries: number;
  private readonly baseBackoffMs: number;
  private readonly maxBackoffMs: number;

  // State
  private queue: SyncOperation[] = [];
  private failedOps: SyncOperation[] = [];
  private status: SyncStatus = 'idle';
  private processing = false;
  private disposed = false;
  private lastError: SyncError | null = null;
  private isOffline = false;

  // Listeners
  private statusListeners: Set<StatusChangeListener> = new Set();

  // Deferred resolvers for pending operations
  private pendingResolvers = new Map<
    string,
    { resolve: () => void; reject: (err: Error) => void }
  >();

  // Event handlers (stored for cleanup)
  private handleOffline: () => void;
  private handleOnline: () => void;

  // Timer refs for cleanup
  private retryTimers = new Set<ReturnType<typeof setTimeout>>();

  constructor(executor: SyncExecutor, options: BackendSyncServiceOptions = {}) {
    this.executor = executor;
    this.maxRetries = options.maxRetries ?? 3;
    this.baseBackoffMs = options.baseBackoffMs ?? 1000;
    this.maxBackoffMs = options.maxBackoffMs ?? 30000;

    // Bind offline/online listeners
    this.handleOffline = () => {
      this.isOffline = true;
      this.setStatus('offline');
    };
    this.handleOnline = () => {
      this.isOffline = false;
      // Resume processing if there are pending items
      if (this.queue.length > 0 || this.failedOps.length > 0) {
        this.setStatus('syncing');
        this.scheduleProcessNext();
      } else {
        this.setStatus(this.lastError ? 'error' : 'idle');
      }
    };

    window.addEventListener('offline', this.handleOffline);
    window.addEventListener('online', this.handleOnline);

    // Check initial online state
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.isOffline = true;
      this.setStatus('offline');
    }
  }

  // ==========================================================================
  // PUBLIC API — Enqueue operations
  // ==========================================================================

  syncCreate(payload: unknown): Promise<void> {
    return this.enqueue('create', payload);
  }

  syncUpdate(payload: unknown): Promise<void> {
    return this.enqueue('update', payload);
  }

  syncDelete(payload: unknown): Promise<void> {
    return this.enqueue('delete', payload);
  }

  syncFinalize(payload: unknown): Promise<void> {
    return this.enqueue('finalize', payload);
  }

  syncAddImage(payload: unknown): Promise<void> {
    return this.enqueue('add_image', payload);
  }

  syncAddFinding(payload: unknown): Promise<void> {
    return this.enqueue('add_finding', payload);
  }

  syncStoreAnalysis(payload: unknown): Promise<void> {
    return this.enqueue('store_analysis', payload);
  }

  // ==========================================================================
  // PUBLIC API — Status and introspection
  // ==========================================================================

  getStatus(): SyncStatus {
    return this.status;
  }

  getPendingCount(): number {
    return this.queue.length + this.failedOps.length;
  }

  getLastError(): SyncError | null {
    return this.lastError;
  }

  /**
   * Subscribe to status changes. Returns an unsubscribe function.
   */
  onStatusChange(listener: StatusChangeListener): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  // ==========================================================================
  // PUBLIC API — Retry and disposal
  // ==========================================================================

  /**
   * Re-enqueue all failed operations for another attempt.
   */
  retryAll(): Promise<void> {
    if (this.disposed) return Promise.resolve();

    const toRetry = [...this.failedOps];
    this.failedOps = [];
    this.lastError = null;

    if (toRetry.length === 0) return Promise.resolve();

    // Reset retry counts and re-enqueue
    const promises: Promise<void>[] = [];
    for (const op of toRetry) {
      const resetOp: SyncOperation = { ...op, retryCount: 0 };
      promises.push(this.enqueueOp(resetOp));
    }

    return Promise.all(promises).then(() => {});
  }

  /**
   * Dispose the service: remove listeners, clear timers, resolve pending.
   */
  dispose(): void {
    this.disposed = true;

    // Remove event listeners
    window.removeEventListener('offline', this.handleOffline);
    window.removeEventListener('online', this.handleOnline);

    // Clear retry timers
    for (const timer of this.retryTimers) {
      clearTimeout(timer);
    }
    this.retryTimers.clear();

    // Resolve all pending promises (fire-and-forget — don't reject)
    for (const [, resolver] of this.pendingResolvers) {
      resolver.resolve();
    }
    this.pendingResolvers.clear();

    // Clear queues
    this.queue = [];
    this.failedOps = [];
    this.statusListeners.clear();
  }

  // ==========================================================================
  // PRIVATE — Queue management
  // ==========================================================================

  private enqueue(type: SyncOperationType, payload: unknown): Promise<void> {
    if (this.disposed) {
      return Promise.resolve();
    }

    const op: SyncOperation = {
      id: generateOpId(),
      type,
      payload,
      retryCount: 0,
      createdAt: Date.now(),
    };

    return this.enqueueOp(op);
  }

  private enqueueOp(op: SyncOperation): Promise<void> {
    if (this.disposed) return Promise.resolve();

    return new Promise<void>((resolve) => {
      this.pendingResolvers.set(op.id, { resolve, reject: () => resolve() });
      this.queue.push(op);

      if (!this.isOffline) {
        this.scheduleProcessNext();
      }
    });
  }

  /**
   * Non-blocking: schedule processNext on the microtask queue.
   * This enables tests with fake timers to control execution flow.
   */
  private scheduleProcessNext(): void {
    if (this.processing || this.disposed || this.isOffline) return;
    Promise.resolve().then(() => this.processNext());
  }

  /**
   * Process the next operation at the head of the queue.
   * After processing, schedules itself again if more items remain.
   */
  private async processNext(): Promise<void> {
    if (this.processing || this.disposed || this.isOffline) return;
    if (this.queue.length === 0) {
      // Nothing to do — update status
      if (this.failedOps.length > 0) {
        this.setStatus('error');
      } else if (this.status === 'syncing') {
        this.setStatus('synced');
      }
      return;
    }

    this.processing = true;
    const op = this.queue[0];
    this.setStatus('syncing');

    try {
      await this.executor(op);

      // Success — remove from queue and resolve
      this.queue.shift();
      this.resolveOp(op.id);
      this.processing = false;

      // Continue processing remaining items
      if (this.queue.length > 0) {
        this.scheduleProcessNext();
      } else {
        // All done
        if (this.failedOps.length > 0) {
          this.setStatus('error');
        } else {
          this.setStatus('synced');
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.processing = false;

      if (op.retryCount < this.maxRetries) {
        // Schedule retry with exponential backoff
        op.retryCount++;
        const backoffMs = Math.min(
          this.baseBackoffMs * Math.pow(2, op.retryCount - 1),
          this.maxBackoffMs
        );

        this.setStatus('error');

        // Remove from queue head — will be re-inserted after backoff via setTimeout
        this.queue.shift();

        const timer = setTimeout(() => {
          this.retryTimers.delete(timer);
          if (!this.disposed && !this.isOffline) {
            this.queue.unshift(op);
            this.scheduleProcessNext();
          }
        }, backoffMs);
        this.retryTimers.add(timer);
      } else {
        // Max retries exceeded — move to failed
        this.queue.shift();
        this.failedOps.push(op);

        this.lastError = {
          message: error.message,
          operationId: op.id,
          operationType: op.type,
          timestamp: Date.now(),
        };

        this.setStatus('error');

        // Resolve the promise (fire-and-forget — service handles errors internally)
        this.resolveOp(op.id);

        // Continue with next item if any
        if (this.queue.length > 0) {
          this.scheduleProcessNext();
        }
      }
    }
  }

  private resolveOp(opId: string): void {
    const resolver = this.pendingResolvers.get(opId);
    if (resolver) {
      resolver.resolve();
      this.pendingResolvers.delete(opId);
    }
  }

  // ==========================================================================
  // PRIVATE — Status management
  // ==========================================================================

  private setStatus(newStatus: SyncStatus): void {
    if (this.status === newStatus) return;
    this.status = newStatus;
    for (const listener of this.statusListeners) {
      try {
        listener(newStatus);
      } catch {
        // Listener errors must not break the service
      }
    }
  }
}
