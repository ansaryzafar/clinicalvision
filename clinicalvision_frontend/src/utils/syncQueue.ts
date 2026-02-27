/**
 * SyncQueue Module
 * 
 * Phase 2 implementation for background synchronization with backend.
 * Provides:
 * - Queue management with priority support
 * - Debounced sync to reduce API calls
 * - Retry logic with configurable max retries
 * - Operation batching
 * - Conflict resolution (deduplication)
 * - Offline/online handling (pause/resume)
 * - State persistence (hydrate/export)
 */

import { ClinicalCase } from '../types/case.types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Sync operation type
 */
export type SyncOperation = 'create' | 'update' | 'delete';

/**
 * Sync queue item
 */
export interface SyncQueueItem {
  id: string;
  caseId: string;
  operation: SyncOperation;
  data: Partial<ClinicalCase>;
  timestamp: string;
  retries: number;
  lastError?: string;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Sync status for a case
 */
export interface SyncStatus {
  caseId: string;
  isSynced: boolean;
  lastSyncedAt?: string;
  pendingChanges: number;
  syncError?: string;
}

/**
 * Sync queue configuration
 */
export interface SyncQueueConfig {
  /** Maximum retry attempts (default: 3) */
  maxRetries: number;
  /** Debounce delay in ms (default: 500) */
  debounceMs: number;
  /** Number of items to process per batch (default: 5) */
  batchSize: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelayMs: number;
}

/**
 * Backend adapter interface for sync operations
 */
export interface BackendAdapter {
  createCase(case_: ClinicalCase): Promise<ClinicalCase>;
  updateCase(caseId: string, data: Partial<ClinicalCase>): Promise<ClinicalCase>;
  deleteCase(caseId: string): Promise<void>;
  getCase(caseId: string): Promise<ClinicalCase | null>;
}

/**
 * Sync queue callbacks
 */
export interface SyncQueueCallbacks {
  /** Called when a sync operation completes (success or failure) */
  onSyncComplete?: (caseId: string, success: boolean) => void;
  /** Called when the queue changes */
  onQueueChange?: (queue: SyncQueueItem[]) => void;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generate unique ID for queue items
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// SYNC QUEUE IMPLEMENTATION
// ============================================================================

/**
 * SyncQueue - Manages background synchronization with backend
 * 
 * Features:
 * - Queue management with add/remove/clear operations
 * - Priority support (high items processed first)
 * - Debounced sync to batch operations
 * - Retry logic with configurable max retries
 * - Pause/resume for offline handling
 * - State persistence for recovery after reload
 * 
 * @example
 * ```typescript
 * const queue = new SyncQueue(
 *   { debounceMs: 500, maxRetries: 3 },
 *   backendAdapter,
 *   { onSyncComplete: (caseId, success) => console.log(caseId, success) }
 * );
 * 
 * // Add an update to the queue
 * queue.enqueue('case-123', 'update', updatedData);
 * 
 * // Queue will auto-process after debounce delay
 * // Or process immediately
 * await queue.processNow();
 * ```
 */
export class SyncQueue {
  private queue: SyncQueueItem[] = [];
  private syncStatus: Map<string, SyncStatus> = new Map();
  private isProcessing = false;
  private debounceTimer: NodeJS.Timeout | null = null;
  private config: SyncQueueConfig;
  private backendAdapter: BackendAdapter | null;
  private onSyncComplete?: (caseId: string, success: boolean) => void;
  private onQueueChange?: (queue: SyncQueueItem[]) => void;
  private isPaused = false;

  constructor(
    config: Partial<SyncQueueConfig> = {},
    backendAdapter: BackendAdapter | null = null,
    callbacks?: SyncQueueCallbacks
  ) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      debounceMs: config.debounceMs ?? 500,
      batchSize: config.batchSize ?? 5,
      retryDelayMs: config.retryDelayMs ?? 1000,
    };
    this.backendAdapter = backendAdapter;
    this.onSyncComplete = callbacks?.onSyncComplete;
    this.onQueueChange = callbacks?.onQueueChange;
  }

  // ==========================================================================
  // QUEUE MANAGEMENT
  // ==========================================================================

  /**
   * Add an operation to the sync queue
   * 
   * @param caseId - The case ID to sync
   * @param operation - The operation type (create/update/delete)
   * @param data - The data to sync
   * @param priority - Optional priority (high items go first)
   * @returns The queue item ID
   */
  enqueue(
    caseId: string,
    operation: SyncOperation,
    data: Partial<ClinicalCase>,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): string {
    const item: SyncQueueItem = {
      id: generateId(),
      caseId,
      operation,
      data,
      timestamp: new Date().toISOString(),
      retries: 0,
      priority,
    };

    // Deduplicate: remove existing updates for same case
    if (operation === 'update') {
      this.queue = this.queue.filter(
        q => !(q.caseId === caseId && q.operation === 'update')
      );
    }

    // Handle delete superseding create
    if (operation === 'delete') {
      const createIndex = this.queue.findIndex(
        q => q.caseId === caseId && q.operation === 'create'
      );
      if (createIndex !== -1) {
        // Case was created but not synced, just remove it
        this.queue.splice(createIndex, 1);
        this.notifyQueueChange();
        return item.id;
      }
    }

    // Add to queue with priority ordering
    if (priority === 'high') {
      this.queue.unshift(item);
    } else {
      this.queue.push(item);
    }

    this.updateSyncStatus(caseId, { pendingChanges: this.getPendingCount(caseId) });
    this.notifyQueueChange();
    this.scheduleSyncDebounced();

    return item.id;
  }

  /**
   * Remove an item from the queue
   * 
   * @param itemId - The queue item ID to remove
   * @returns True if removed, false if not found
   */
  dequeue(itemId: string): boolean {
    const index = this.queue.findIndex(q => q.id === itemId);
    if (index !== -1) {
      const item = this.queue[index];
      this.queue.splice(index, 1);
      this.updateSyncStatus(item.caseId, {
        pendingChanges: this.getPendingCount(item.caseId),
      });
      this.notifyQueueChange();
      return true;
    }
    return false;
  }

  /**
   * Clear all items from the queue
   */
  clear(): void {
    this.queue = [];
    this.syncStatus.clear();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.notifyQueueChange();
  }

  /**
   * Get current queue (copy)
   */
  getQueue(): SyncQueueItem[] {
    return [...this.queue];
  }

  // ==========================================================================
  // STATUS QUERIES
  // ==========================================================================

  /**
   * Get the number of pending operations for a case
   */
  getPendingCount(caseId: string): number {
    return this.queue.filter(q => q.caseId === caseId).length;
  }

  /**
   * Get the total queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Get sync status for a case
   */
  getStatus(caseId: string): SyncStatus | undefined {
    return this.syncStatus.get(caseId);
  }

  /**
   * Check if any items are pending
   */
  hasPendingItems(): boolean {
    return this.queue.length > 0;
  }

  /**
   * Check if currently processing
   */
  isProcessingQueue(): boolean {
    return this.isProcessing;
  }

  /**
   * Get configuration
   */
  getConfig(): SyncQueueConfig {
    return { ...this.config };
  }

  // ==========================================================================
  // PAUSE/RESUME
  // ==========================================================================

  /**
   * Pause sync processing (e.g., when going offline)
   */
  pause(): void {
    this.isPaused = true;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Resume sync processing (e.g., when coming back online)
   */
  resume(): void {
    this.isPaused = false;
    if (this.queue.length > 0) {
      this.scheduleSyncDebounced();
    }
  }

  /**
   * Check if queue is paused
   */
  isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * Destroy the queue and clean up all resources
   * 
   * Call this when unmounting a component or cleaning up.
   * This clears all timers and resets state but preserves the queue
   * for potential export before destruction.
   * 
   * @param options - Options for destruction
   * @param options.preserveQueue - If true, returns the queue before clearing
   * @returns The queue items if preserveQueue is true, undefined otherwise
   */
  destroy(options?: { preserveQueue?: boolean }): SyncQueueItem[] | undefined {
    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Mark as paused to prevent any further processing
    this.isPaused = true;
    this.isProcessing = false;

    // Optionally preserve queue for export
    const preservedQueue = options?.preserveQueue ? [...this.queue] : undefined;

    // Clear state
    this.queue = [];
    this.syncStatus.clear();
    this.onSyncComplete = undefined;
    this.onQueueChange = undefined;

    return preservedQueue;
  }

  // ==========================================================================
  // PROCESSING
  // ==========================================================================

  /**
   * Process the queue immediately (bypass debounce)
   */
  async processNow(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    return this.processQueue();
  }

  /**
   * Process the sync queue
   */
  private async processQueue(): Promise<void> {
    if (this.isPaused || !this.backendAdapter || this.queue.length === 0) {
      return;
    }

    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process in batches
      while (this.queue.length > 0 && !this.isPaused) {
        const batch = this.queue.slice(0, this.config.batchSize);
        
        for (const item of batch) {
          const success = await this.processItem(item);

          if (success) {
            this.queue.shift();
            this.updateSyncStatus(item.caseId, {
              lastSyncedAt: new Date().toISOString(),
              pendingChanges: this.getPendingCount(item.caseId),
              syncError: undefined,
              isSynced: this.getPendingCount(item.caseId) === 0,
            });
          } else {
            item.retries++;
            if (item.retries >= this.config.maxRetries) {
              // Remove from queue, mark as failed
              this.queue.shift();
              this.updateSyncStatus(item.caseId, {
                syncError: item.lastError || 'Max retries exceeded',
                pendingChanges: this.getPendingCount(item.caseId),
                isSynced: false,
              });
            } else {
              // Wait before retry
              await this.sleep(this.config.retryDelayMs);
              break; // Break batch, will retry this item next
            }
          }

          this.onSyncComplete?.(item.caseId, success);
          this.notifyQueueChange();
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single item
   */
  private async processItem(item: SyncQueueItem): Promise<boolean> {
    if (!this.backendAdapter) return false;

    try {
      switch (item.operation) {
        case 'create':
          await this.backendAdapter.createCase(item.data as ClinicalCase);
          break;
        case 'update':
          await this.backendAdapter.updateCase(item.caseId, item.data);
          break;
        case 'delete':
          await this.backendAdapter.deleteCase(item.caseId);
          break;
      }
      return true;
    } catch (error) {
      item.lastError = error instanceof Error ? error.message : 'Unknown error';
      return false;
    }
  }

  /**
   * Schedule sync with debouncing
   */
  private scheduleSyncDebounced(): void {
    if (this.isPaused) return;
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.processQueue();
    }, this.config.debounceMs);
  }

  // ==========================================================================
  // INTERNAL HELPERS
  // ==========================================================================

  /**
   * Update sync status for a case
   */
  private updateSyncStatus(caseId: string, updates: Partial<SyncStatus>): void {
    const current = this.syncStatus.get(caseId) || {
      caseId,
      isSynced: false,
      pendingChanges: 0,
    };
    this.syncStatus.set(caseId, {
      ...current,
      ...updates,
    });
  }

  /**
   * Notify queue change listeners
   */
  private notifyQueueChange(): void {
    this.onQueueChange?.(this.getQueue());
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==========================================================================
  // PERSISTENCE
  // ==========================================================================

  /**
   * Hydrate from persisted state
   * 
   * @param queue - Persisted queue items
   * @param status - Persisted sync status
   */
  hydrate(queue: SyncQueueItem[], status: Map<string, SyncStatus>): void {
    this.queue = [...queue];
    this.syncStatus = new Map(status);
    if (this.queue.length > 0) {
      this.scheduleSyncDebounced();
    }
  }

  /**
   * Get state for persistence
   * 
   * @returns Current queue and status state
   */
  getState(): { queue: SyncQueueItem[]; status: Map<string, SyncStatus> } {
    return {
      queue: this.getQueue(),
      status: new Map(this.syncStatus),
    };
  }

  /**
   * Set backend adapter
   */
  setBackendAdapter(adapter: BackendAdapter | null): void {
    this.backendAdapter = adapter;
    if (adapter && this.queue.length > 0 && !this.isPaused) {
      this.scheduleSyncDebounced();
    }
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let defaultSyncQueue: SyncQueue | null = null;

/**
 * Create a new SyncQueue instance
 */
export function createSyncQueue(
  config?: Partial<SyncQueueConfig>,
  backendAdapter?: BackendAdapter | null,
  callbacks?: SyncQueueCallbacks
): SyncQueue {
  return new SyncQueue(config, backendAdapter || null, callbacks);
}

/**
 * Get the default SyncQueue singleton
 */
export function getSyncQueue(
  config?: Partial<SyncQueueConfig>,
  backendAdapter?: BackendAdapter | null,
  callbacks?: SyncQueueCallbacks
): SyncQueue {
  if (!defaultSyncQueue) {
    defaultSyncQueue = new SyncQueue(config, backendAdapter || null, callbacks);
  }
  return defaultSyncQueue;
}

/**
 * Reset the default SyncQueue singleton (for testing)
 */
export function resetSyncQueue(): void {
  if (defaultSyncQueue) {
    defaultSyncQueue.clear();
  }
  defaultSyncQueue = null;
}
