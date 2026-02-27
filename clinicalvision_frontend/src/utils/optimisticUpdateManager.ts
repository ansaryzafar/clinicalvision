/**
 * Optimistic Update Manager
 * 
 * Implements optimistic updates with retry logic and rollback support.
 * 
 * Key features:
 * - Immediate UI updates (optimistic)
 * - Automatic retry with exponential backoff
 * - Rollback on final failure
 * - Pending update tracking
 * - Cancellation support
 * 
 * @module optimisticUpdateManager
 */

import { Result, success, failure } from '../types/case.types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Pending update tracking
 */
export interface PendingUpdate {
  id: string;
  status: 'pending' | 'retrying' | 'completed' | 'failed';
  retryCount: number;
  rollback: () => void;
  timestamp: number;
  lastError?: string;
}

/**
 * Optimistic update configuration
 */
export interface OptimisticUpdateConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay for exponential backoff (ms) */
  baseDelayMs: number;
  /** Maximum delay cap (ms) */
  maxDelayMs: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: OptimisticUpdateConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

// ============================================================================
// OPTIMISTIC UPDATE MANAGER
// ============================================================================

/**
 * OptimisticUpdateManager - Manages optimistic updates with retry and rollback
 * 
 * Usage:
 * ```typescript
 * const manager = new OptimisticUpdateManager();
 * 
 * const result = await manager.update(
 *   'update-123',
 *   () => { localState.name = 'New Name'; },  // Optimistic action
 *   () => api.updateCase({ name: 'New Name' }), // Backend operation
 *   () => { localState.name = originalName; }  // Rollback action
 * );
 * 
 * if (!result.success) {
 *   console.error('Update failed:', result.error);
 * }
 * ```
 */
export class OptimisticUpdateManager {
  private pendingUpdates: Map<string, PendingUpdate> = new Map();
  private config: OptimisticUpdateConfig;

  constructor(config: Partial<OptimisticUpdateConfig> = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? DEFAULT_CONFIG.maxRetries,
      baseDelayMs: config.baseDelayMs ?? DEFAULT_CONFIG.baseDelayMs,
      maxDelayMs: config.maxDelayMs ?? DEFAULT_CONFIG.maxDelayMs,
    };
  }

  /**
   * Perform an optimistic update with retry and rollback support
   * 
   * @param updateId - Unique identifier for this update operation
   * @param optimisticAction - Synchronous function to apply the update immediately
   * @param backendOperation - Async function to persist the change to backend
   * @param rollbackAction - Synchronous function to undo the optimistic update
   * @returns Result with the backend response data or error
   */
  async update<T>(
    updateId: string,
    optimisticAction: () => void,
    backendOperation: () => Promise<T>,
    rollbackAction: () => void
  ): Promise<Result<T, Error>> {
    // Step 1: Apply optimistic update immediately
    // This throws if the action fails, which is intentional
    optimisticAction();

    // Step 2: Track pending update
    const pending: PendingUpdate = {
      id: updateId,
      status: 'pending',
      retryCount: 0,
      rollback: rollbackAction,
      timestamp: Date.now(),
    };
    this.pendingUpdates.set(updateId, pending);

    // Step 3: Execute backend operation with retry
    try {
      const result = await this.executeWithRetry(backendOperation, updateId);
      pending.status = 'completed';
      this.pendingUpdates.delete(updateId);
      return success(result);
    } catch (error) {
      // Step 4: Rollback on final failure
      pending.status = 'failed';
      pending.lastError = error instanceof Error ? error.message : 'Unknown error';
      
      // Rollback - this may throw, which is intentional to surface rollback errors
      rollbackAction();
      
      this.pendingUpdates.delete(updateId);
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Execute operation with retry and exponential backoff
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    updateId: string
  ): Promise<T> {
    const pending = this.pendingUpdates.get(updateId);
    if (!pending) {
      throw new Error('Update not found in pending queue');
    }

    while (pending.retryCount < this.config.maxRetries) {
      try {
        return await operation();
      } catch (error) {
        pending.retryCount++;
        pending.status = 'retrying';
        pending.lastError = error instanceof Error ? error.message : 'Unknown error';

        if (pending.retryCount >= this.config.maxRetries) {
          throw error;
        }

        // Exponential backoff with jitter
        const delay = this.calculateBackoff(pending.retryCount);
        await this.sleep(delay);
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Calculate exponential backoff delay with jitter
   * 
   * Formula: min(baseDelay * 2^(retryCount - 1) + jitter, maxDelay)
   * 
   * @param retryCount - Current retry attempt number (1-based)
   * @returns Delay in milliseconds
   */
  private calculateBackoff(retryCount: number): number {
    // Base delay * 2^(retryCount - 1)
    const exponentialDelay = this.config.baseDelayMs * Math.pow(2, retryCount - 1);
    
    // Add 0-30% jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * exponentialDelay;
    
    // Cap at maxDelayMs
    const delay = Math.min(exponentialDelay + jitter, this.config.maxDelayMs);
    
    return delay;
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get a specific pending update by ID
   */
  getPendingUpdate(updateId: string): PendingUpdate | undefined {
    return this.pendingUpdates.get(updateId);
  }

  /**
   * Get all pending updates
   */
  getAllPendingUpdates(): PendingUpdate[] {
    return Array.from(this.pendingUpdates.values());
  }

  /**
   * Check if there are any pending updates
   */
  hasPendingUpdates(): boolean {
    return this.pendingUpdates.size > 0;
  }

  /**
   * Get count of pending updates
   */
  getPendingCount(): number {
    return this.pendingUpdates.size;
  }

  /**
   * Cancel a pending update and trigger rollback
   * 
   * Note: This only works if the update is still in the pending queue.
   * If the backend operation has completed, cancellation has no effect.
   * 
   * @param updateId - ID of the update to cancel
   * @returns true if the update was found and cancelled, false otherwise
   */
  cancelUpdate(updateId: string): boolean {
    const pending = this.pendingUpdates.get(updateId);
    if (pending) {
      pending.rollback();
      this.pendingUpdates.delete(updateId);
      return true;
    }
    return false;
  }

  /**
   * Clear all pending updates and trigger rollbacks
   * 
   * Use this for emergency cleanup, e.g., when user navigates away
   */
  clearAll(): void {
    this.pendingUpdates.forEach(pending => {
      if (pending.status !== 'completed') {
        try {
          pending.rollback();
        } catch (e) {
          // Log but continue clearing other updates
          console.error('Rollback failed during clearAll:', e);
        }
      }
    });
    this.pendingUpdates.clear();
  }

  /**
   * Get the current configuration
   */
  getConfig(): OptimisticUpdateConfig {
    return { ...this.config };
  }

  /**
   * Update configuration at runtime
   */
  setConfig(config: Partial<OptimisticUpdateConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Destroy the manager and clean up all resources
   * 
   * Unlike clearAll(), this method prepares the manager for garbage collection
   * and does not trigger rollbacks. Use this when the component unmounts
   * and you want to export the pending state for persistence.
   * 
   * @param options - Options for destruction
   * @param options.triggerRollbacks - If true, triggers rollbacks before destroy (default: false)
   * @returns Array of pending update IDs that were in progress
   */
  destroy(options?: { triggerRollbacks?: boolean }): string[] {
    const pendingIds = Array.from(this.pendingUpdates.keys());

    if (options?.triggerRollbacks) {
      this.clearAll();
    } else {
      this.pendingUpdates.clear();
    }

    return pendingIds;
  }

  /**
   * Check if there are any updates in retrying state
   */
  hasRetryingUpdates(): boolean {
    return Array.from(this.pendingUpdates.values()).some(
      p => p.status === 'retrying'
    );
  }

  /**
   * Get IDs of all pending updates for persistence
   */
  getPendingIds(): string[] {
    return Array.from(this.pendingUpdates.keys());
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create an OptimisticUpdateManager with optional custom configuration
 */
export function createOptimisticUpdateManager(
  config?: Partial<OptimisticUpdateConfig>
): OptimisticUpdateManager {
  return new OptimisticUpdateManager(config);
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let defaultInstance: OptimisticUpdateManager | null = null;

/**
 * Get the default OptimisticUpdateManager instance (singleton)
 */
export function getOptimisticUpdateManager(): OptimisticUpdateManager {
  if (!defaultInstance) {
    defaultInstance = new OptimisticUpdateManager();
  }
  return defaultInstance;
}

/**
 * Reset the default instance (for testing)
 */
export function resetOptimisticUpdateManager(): void {
  if (defaultInstance) {
    defaultInstance.clearAll();
    defaultInstance = null;
  }
}
