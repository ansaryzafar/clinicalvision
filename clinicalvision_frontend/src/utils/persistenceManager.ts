/**
 * Persistence Manager
 * 
 * Implements multi-layer persistence strategy:
 * Layer 1: Memory (instant)
 * Layer 2: Session Storage (tab-safe)
 * Layer 3: Local Storage (persistent)
 * Layer 4: Backend API (server sync)
 * 
 * Includes optimistic updates and sync queue management.
 * 
 * @module persistenceManager
 */

import {
  ClinicalCase,
  Result,
  success,
  failure,
  ErrorCode,
} from '../types/case.types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Persistence layer enumeration
 */
export enum PersistenceLayer {
  MEMORY = 'memory',
  SESSION = 'session',
  LOCAL = 'local',
  BACKEND = 'backend',
}

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
 * Persistence error
 */
export interface PersistenceError extends Error {
  name: 'PersistenceError';
  code: ErrorCode;
  layer: PersistenceLayer;
  operation: string;
}

/**
 * Persistence configuration
 */
export interface PersistenceConfig {
  /** Enable session storage layer */
  useSessionStorage: boolean;
  /** Enable local storage layer */
  useLocalStorage: boolean;
  /** Enable backend sync */
  useBackendSync: boolean;
  /** Maximum sync retries */
  maxRetries: number;
  /** Sync debounce delay in ms */
  syncDebounceMs: number;
  /** Local storage key prefix */
  storageKeyPrefix: string;
}

/**
 * Backend API adapter interface
 */
export interface BackendAdapter {
  createCase(case_: ClinicalCase): Promise<ClinicalCase>;
  updateCase(caseId: string, data: Partial<ClinicalCase>): Promise<ClinicalCase>;
  deleteCase(caseId: string): Promise<void>;
  getCase(caseId: string): Promise<ClinicalCase | null>;
  listCases(userId: string): Promise<ClinicalCase[]>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: PersistenceConfig = {
  useSessionStorage: true,
  useLocalStorage: true,
  useBackendSync: true,
  maxRetries: 3,
  syncDebounceMs: 1000,
  storageKeyPrefix: 'clinicalvision_',
};

const STORAGE_KEYS = {
  CASES: 'cases',
  SYNC_QUEUE: 'sync_queue',
  SYNC_STATUS: 'sync_status',
} as const;

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

/**
 * Safely parse JSON from storage
 */
function safeJsonParse<T>(json: string | null, defaultValue: T): T {
  if (!json) return defaultValue;
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Check if storage is available
 */
function isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
  try {
    const storage = window[type];
    const testKey = '__storage_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// MEMORY STORE
// ============================================================================

/**
 * In-memory case store (Layer 1)
 */
class MemoryStore {
  private cases: Map<string, ClinicalCase> = new Map();
  private listeners: Set<(cases: ClinicalCase[]) => void> = new Set();

  get(caseId: string): ClinicalCase | undefined {
    return this.cases.get(caseId);
  }

  getAll(): ClinicalCase[] {
    return Array.from(this.cases.values());
  }

  set(case_: ClinicalCase): void {
    this.cases.set(case_.id, case_);
    this.notifyListeners();
  }

  delete(caseId: string): boolean {
    const deleted = this.cases.delete(caseId);
    if (deleted) {
      this.notifyListeners();
    }
    return deleted;
  }

  clear(): void {
    this.cases.clear();
    this.notifyListeners();
  }

  has(caseId: string): boolean {
    return this.cases.has(caseId);
  }

  subscribe(listener: (cases: ClinicalCase[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const cases = this.getAll();
    this.listeners.forEach(listener => listener(cases));
  }

  /** Hydrate from external source */
  hydrate(cases: ClinicalCase[]): void {
    cases.forEach(c => this.cases.set(c.id, c));
    this.notifyListeners();
  }
}

// ============================================================================
// STORAGE ADAPTER
// ============================================================================

/**
 * Storage adapter for browser storage APIs (Layer 2 & 3)
 */
class StorageAdapter {
  constructor(
    private storage: Storage,
    private prefix: string
  ) {}

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  getCases(): Map<string, ClinicalCase> {
    const key = this.getKey(STORAGE_KEYS.CASES);
    const data = safeJsonParse<Record<string, ClinicalCase>>(
      this.storage.getItem(key),
      {}
    );
    return new Map(Object.entries(data));
  }

  saveCases(cases: Map<string, ClinicalCase>): void {
    const key = this.getKey(STORAGE_KEYS.CASES);
    const data = Object.fromEntries(cases);
    this.storage.setItem(key, JSON.stringify(data));
  }

  getCase(caseId: string): ClinicalCase | undefined {
    return this.getCases().get(caseId);
  }

  saveCase(case_: ClinicalCase): void {
    const cases = this.getCases();
    cases.set(case_.id, case_);
    this.saveCases(cases);
  }

  /**
   * Save case with quota error handling
   * Returns false if storage quota is exceeded
   */
  safeSaveCase(case_: ClinicalCase): { success: boolean; error?: string } {
    try {
      this.saveCase(case_);
      return { success: true };
    } catch (error) {
      if (error instanceof DOMException && 
          (error.name === 'QuotaExceededError' || error.code === 22)) {
        return { success: false, error: 'Storage quota exceeded' };
      }
      throw error;
    }
  }

  deleteCase(caseId: string): boolean {
    const cases = this.getCases();
    const deleted = cases.delete(caseId);
    if (deleted) {
      this.saveCases(cases);
    }
    return deleted;
  }

  getSyncQueue(): SyncQueueItem[] {
    const key = this.getKey(STORAGE_KEYS.SYNC_QUEUE);
    return safeJsonParse<SyncQueueItem[]>(this.storage.getItem(key), []);
  }

  saveSyncQueue(queue: SyncQueueItem[]): void {
    const key = this.getKey(STORAGE_KEYS.SYNC_QUEUE);
    this.storage.setItem(key, JSON.stringify(queue));
  }

  getSyncStatus(): Map<string, SyncStatus> {
    const key = this.getKey(STORAGE_KEYS.SYNC_STATUS);
    const data = safeJsonParse<Record<string, SyncStatus>>(
      this.storage.getItem(key),
      {}
    );
    return new Map(Object.entries(data));
  }

  saveSyncStatus(status: Map<string, SyncStatus>): void {
    const key = this.getKey(STORAGE_KEYS.SYNC_STATUS);
    const data = Object.fromEntries(status);
    this.storage.setItem(key, JSON.stringify(data));
  }

  clear(): void {
    const keysToRemove = [
      this.getKey(STORAGE_KEYS.CASES),
      this.getKey(STORAGE_KEYS.SYNC_QUEUE),
      this.getKey(STORAGE_KEYS.SYNC_STATUS),
    ];
    keysToRemove.forEach(key => this.storage.removeItem(key));
  }
}

// ============================================================================
// SYNC MANAGER
// ============================================================================

/**
 * Simple mutex for preventing concurrent operations
 */
class AsyncMutex {
  private locked = false;
  private waitQueue: (() => void)[] = [];

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }
    
    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      next?.();
    } else {
      this.locked = false;
    }
  }
}

/**
 * Manages background sync operations with the backend
 * Uses mutex to prevent race conditions during concurrent sync operations
 */
class SyncManager {
  private queue: SyncQueueItem[] = [];
  private syncStatus: Map<string, SyncStatus> = new Map();
  private isProcessing = false;
  private debounceTimer: NodeJS.Timeout | null = null;
  private mutex = new AsyncMutex(); // Race condition protection

  constructor(
    private config: PersistenceConfig,
    private backendAdapter: BackendAdapter | null,
    private onSyncComplete?: (caseId: string, success: boolean) => void
  ) {}

  /**
   * Queue a sync operation
   */
  queueOperation(
    caseId: string,
    operation: SyncOperation,
    data: Partial<ClinicalCase>
  ): void {
    const item: SyncQueueItem = {
      id: generateId(),
      caseId,
      operation,
      data,
      timestamp: new Date().toISOString(),
      retries: 0,
    };

    // Remove any existing operations for this case if updating
    if (operation === 'update') {
      this.queue = this.queue.filter(
        q => !(q.caseId === caseId && q.operation === 'update')
      );
    }

    this.queue.push(item);
    this.updateSyncStatus(caseId, { pendingChanges: this.getPendingCount(caseId) });
    this.scheduleSyncDebounced();
  }

  /**
   * Get number of pending operations for a case
   */
  getPendingCount(caseId: string): number {
    return this.queue.filter(q => q.caseId === caseId).length;
  }

  /**
   * Get sync status for a case
   */
  getStatus(caseId: string): SyncStatus | undefined {
    return this.syncStatus.get(caseId);
  }

  /**
   * Check if a case has pending changes
   */
  hasPendingChanges(caseId: string): boolean {
    return this.getPendingCount(caseId) > 0;
  }

  /**
   * Process the sync queue with mutex protection against race conditions
   */
  async processQueue(): Promise<void> {
    if (!this.backendAdapter || this.queue.length === 0) {
      return;
    }

    // Acquire mutex to prevent concurrent queue processing
    await this.mutex.acquire();
    
    if (this.isProcessing) {
      // Another call got the mutex first and is still processing
      this.mutex.release();
      return;
    }

    this.isProcessing = true;

    try {
      // Process items one at a time to maintain order
      while (this.queue.length > 0) {
        const item = this.queue[0];
        const success = await this.processItem(item);

        if (success) {
          this.queue.shift(); // Remove processed item
          this.updateSyncStatus(item.caseId, {
            lastSyncedAt: new Date().toISOString(),
            pendingChanges: this.getPendingCount(item.caseId),
            syncError: undefined,
            isSynced: true,
          });
        } else {
          item.retries++;
          if (item.retries >= this.config.maxRetries) {
            // Move to end of queue or discard
            this.queue.shift();
            this.updateSyncStatus(item.caseId, {
              syncError: item.lastError || 'Max retries exceeded',
              pendingChanges: this.getPendingCount(item.caseId),
            });
          } else {
            // Keep in queue for retry
            break;
          }
        }

        this.onSyncComplete?.(item.caseId, success);
      }
    } finally {
      this.isProcessing = false;
      this.mutex.release();
    }
  }

  /**
   * Process a single sync item
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
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.processQueue();
    }, this.config.syncDebounceMs);
  }

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
      isSynced: updates.pendingChanges === 0 && !updates.syncError,
    });
  }

  /**
   * Hydrate queue from storage
   */
  hydrate(queue: SyncQueueItem[], status: Map<string, SyncStatus>): void {
    this.queue = queue;
    this.syncStatus = status;
    // Start processing if items exist
    if (this.queue.length > 0) {
      this.scheduleSyncDebounced();
    }
  }

  /**
   * Get current queue state for persistence
   */
  getQueueState(): { queue: SyncQueueItem[]; status: Map<string, SyncStatus> } {
    return {
      queue: [...this.queue],
      status: new Map(this.syncStatus),
    };
  }

  /**
   * Force sync now (bypasses debounce)
   */
  forceSync(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    return this.processQueue();
  }

  /**
   * Clear all pending operations
   */
  clear(): void {
    this.queue = [];
    this.syncStatus.clear();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}

// ============================================================================
// PERSISTENCE MANAGER
// ============================================================================

/**
 * Main persistence manager coordinating all storage layers
 */
export class PersistenceManager {
  private memoryStore: MemoryStore;
  private sessionAdapter: StorageAdapter | null = null;
  private localAdapter: StorageAdapter | null = null;
  private syncManager: SyncManager;
  private config: PersistenceConfig;
  private initialized = false;

  constructor(
    config: Partial<PersistenceConfig> = {},
    private backendAdapter: BackendAdapter | null = null
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.memoryStore = new MemoryStore();
    this.syncManager = new SyncManager(
      this.config,
      this.backendAdapter,
      (caseId, success) => this.onSyncComplete(caseId, success)
    );
  }

  /**
   * Initialize persistence layers
   */
  initialize(): Result<void, PersistenceError> {
    try {
      // Initialize session storage if available and enabled
      if (this.config.useSessionStorage && isStorageAvailable('sessionStorage')) {
        this.sessionAdapter = new StorageAdapter(
          sessionStorage,
          this.config.storageKeyPrefix
        );
      }

      // Initialize local storage if available and enabled
      if (this.config.useLocalStorage && isStorageAvailable('localStorage')) {
        this.localAdapter = new StorageAdapter(
          localStorage,
          this.config.storageKeyPrefix
        );
      }

      // Hydrate memory store from storage
      this.hydrateFromStorage();

      this.initialized = true;
      return success(undefined);
    } catch (error) {
      return failure(this.createError(
        PersistenceLayer.MEMORY,
        'initialize',
        error instanceof Error ? error.message : 'Initialization failed'
      ));
    }
  }

  /**
   * Hydrate memory store from available storage layers
   */
  private hydrateFromStorage(): void {
    // Priority: Local storage (persisted) > Session storage (tab-specific)
    let cases = new Map<string, ClinicalCase>();

    // Try local storage first
    if (this.localAdapter) {
      cases = this.localAdapter.getCases();
    }

    // Merge with session storage (newer takes precedence)
    if (this.sessionAdapter) {
      const sessionCases = this.sessionAdapter.getCases();
      sessionCases.forEach((case_, id) => {
        const existing = cases.get(id);
        if (!existing || case_.workflow.lastModifiedAt > existing.workflow.lastModifiedAt) {
          cases.set(id, case_);
        }
      });
    }

    // Hydrate memory store
    this.memoryStore.hydrate(Array.from(cases.values()));

    // Hydrate sync queue from local storage
    if (this.localAdapter) {
      const queue = this.localAdapter.getSyncQueue();
      const status = this.localAdapter.getSyncStatus();
      this.syncManager.hydrate(queue, status);
    }
  }

  /**
   * Save a case (optimistic - writes to all layers)
   */
  saveCase(case_: ClinicalCase): Result<ClinicalCase, PersistenceError> {
    if (!this.initialized) {
      return failure(this.createError(
        PersistenceLayer.MEMORY,
        'saveCase',
        'Persistence manager not initialized'
      ));
    }

    try {
      const isNew = !this.memoryStore.has(case_.id);

      // Layer 1: Memory (instant)
      this.memoryStore.set(case_);

      // Layer 2: Session Storage (tab-safe)
      if (this.sessionAdapter) {
        const sessionResult = this.sessionAdapter.safeSaveCase(case_);
        if (!sessionResult.success) {
          // Log warning but don't fail - memory store succeeded
          console.warn('Session storage quota exceeded for case:', case_.id);
        }
      }

      // Layer 3: Local Storage (persistent)
      if (this.localAdapter) {
        const localResult = this.localAdapter.safeSaveCase(case_);
        if (!localResult.success) {
          return failure(this.createError(
            PersistenceLayer.LOCAL,
            'saveCase',
            'Storage quota exceeded. Please clear some old cases or free up storage space.'
          ));
        }
      }

      // Layer 4: Backend (async via queue)
      if (this.config.useBackendSync) {
        this.syncManager.queueOperation(
          case_.id,
          isNew ? 'create' : 'update',
          case_
        );
        this.persistSyncState();
      }

      return success(case_);
    } catch (error) {
      // Check for quota exceeded error
      if (error instanceof DOMException && 
          (error.name === 'QuotaExceededError' || error.code === 22)) {
        return failure(this.createError(
          PersistenceLayer.LOCAL,
          'saveCase',
          'Storage quota exceeded. Please clear some old cases or free up storage space.'
        ));
      }
      return failure(this.createError(
        PersistenceLayer.MEMORY,
        'saveCase',
        error instanceof Error ? error.message : 'Save failed'
      ));
    }
  }

  /**
   * Get a case by ID
   */
  getCase(caseId: string): Result<ClinicalCase | null, PersistenceError> {
    if (!this.initialized) {
      return failure(this.createError(
        PersistenceLayer.MEMORY,
        'getCase',
        'Persistence manager not initialized'
      ));
    }

    try {
      // Try memory first (fastest)
      let case_ = this.memoryStore.get(caseId);

      // Fall back to session storage
      if (!case_ && this.sessionAdapter) {
        case_ = this.sessionAdapter.getCase(caseId);
        if (case_) {
          this.memoryStore.set(case_);
        }
      }

      // Fall back to local storage
      if (!case_ && this.localAdapter) {
        case_ = this.localAdapter.getCase(caseId);
        if (case_) {
          this.memoryStore.set(case_);
          this.sessionAdapter?.saveCase(case_);
        }
      }

      return success(case_ || null);
    } catch (error) {
      return failure(this.createError(
        PersistenceLayer.MEMORY,
        'getCase',
        error instanceof Error ? error.message : 'Get failed'
      ));
    }
  }

  /**
   * Get all cases
   */
  getAllCases(): Result<ClinicalCase[], PersistenceError> {
    if (!this.initialized) {
      return failure(this.createError(
        PersistenceLayer.MEMORY,
        'getAllCases',
        'Persistence manager not initialized'
      ));
    }

    try {
      return success(this.memoryStore.getAll());
    } catch (error) {
      return failure(this.createError(
        PersistenceLayer.MEMORY,
        'getAllCases',
        error instanceof Error ? error.message : 'Get all failed'
      ));
    }
  }

  /**
   * Delete a case
   */
  deleteCase(caseId: string): Result<void, PersistenceError> {
    if (!this.initialized) {
      return failure(this.createError(
        PersistenceLayer.MEMORY,
        'deleteCase',
        'Persistence manager not initialized'
      ));
    }

    try {
      // Delete from all layers
      this.memoryStore.delete(caseId);
      this.sessionAdapter?.deleteCase(caseId);
      this.localAdapter?.deleteCase(caseId);

      // Queue backend deletion
      if (this.config.useBackendSync) {
        this.syncManager.queueOperation(caseId, 'delete', {});
        this.persistSyncState();
      }

      return success(undefined);
    } catch (error) {
      return failure(this.createError(
        PersistenceLayer.MEMORY,
        'deleteCase',
        error instanceof Error ? error.message : 'Delete failed'
      ));
    }
  }

  /**
   * Update a case with partial data
   */
  updateCase(
    caseId: string,
    updates: Partial<ClinicalCase>
  ): Result<ClinicalCase, PersistenceError> {
    const getResult = this.getCase(caseId);
    if (!getResult.success) {
      return failure((getResult as { success: false; error: PersistenceError }).error);
    }

    const existingCase = getResult.data;
    if (!existingCase) {
      return failure(this.createError(
        PersistenceLayer.MEMORY,
        'updateCase',
        `Case ${caseId} not found`
      ));
    }

    // Merge updates
    const updatedCase: ClinicalCase = {
      ...existingCase,
      ...updates,
      workflow: {
        ...existingCase.workflow,
        ...(updates.workflow || {}),
        lastModifiedAt: new Date().toISOString(),
      },
    };

    return this.saveCase(updatedCase);
  }

  /**
   * Get sync status for a case
   */
  getSyncStatus(caseId: string): SyncStatus | undefined {
    return this.syncManager.getStatus(caseId);
  }

  /**
   * Check if case has pending sync
   */
  hasPendingSync(caseId: string): boolean {
    return this.syncManager.hasPendingChanges(caseId);
  }

  /**
   * Force sync all pending changes
   */
  async forceSyncAll(): Promise<void> {
    await this.syncManager.forceSync();
  }

  /**
   * Subscribe to case changes
   */
  subscribe(listener: (cases: ClinicalCase[]) => void): () => void {
    return this.memoryStore.subscribe(listener);
  }

  /**
   * Clear all stored data
   */
  clear(): Result<void, PersistenceError> {
    try {
      this.memoryStore.clear();
      this.sessionAdapter?.clear();
      this.localAdapter?.clear();
      this.syncManager.clear();
      return success(undefined);
    } catch (error) {
      return failure(this.createError(
        PersistenceLayer.MEMORY,
        'clear',
        error instanceof Error ? error.message : 'Clear failed'
      ));
    }
  }

  /**
   * Persist sync state to local storage
   */
  private persistSyncState(): void {
    if (this.localAdapter) {
      const { queue, status } = this.syncManager.getQueueState();
      this.localAdapter.saveSyncQueue(queue);
      this.localAdapter.saveSyncStatus(status);
    }
  }

  /**
   * Handle sync completion
   */
  private onSyncComplete(caseId: string, success: boolean): void {
    this.persistSyncState();
  }

  /**
   * Create a persistence error
   */
  private createError(
    layer: PersistenceLayer,
    operation: string,
    message: string
  ): PersistenceError {
    const error = new Error(message) as PersistenceError;
    error.name = 'PersistenceError';
    error.code = ErrorCode.PERSISTENCE_ERROR;
    error.layer = layer;
    error.operation = operation;
    return error;
  }

  /**
   * Load cases from backend (full refresh)
   */
  async loadFromBackend(userId: string): Promise<Result<ClinicalCase[], PersistenceError>> {
    if (!this.backendAdapter) {
      return failure(this.createError(
        PersistenceLayer.BACKEND,
        'loadFromBackend',
        'Backend adapter not configured'
      ));
    }

    try {
      const cases = await this.backendAdapter.listCases(userId);
      
      // Update all layers
      cases.forEach(case_ => {
        this.memoryStore.set(case_);
        this.sessionAdapter?.saveCase(case_);
        this.localAdapter?.saveCase(case_);
      });

      return success(cases);
    } catch (error) {
      return failure(this.createError(
        PersistenceLayer.BACKEND,
        'loadFromBackend',
        error instanceof Error ? error.message : 'Backend load failed'
      ));
    }
  }

  /**
   * Check if persistence is available
   */
  isAvailable(): { memory: boolean; session: boolean; local: boolean; backend: boolean } {
    return {
      memory: true,
      session: this.sessionAdapter !== null,
      local: this.localAdapter !== null,
      backend: this.backendAdapter !== null,
    };
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): { caseCount: number; estimatedSizeBytes: number } {
    const cases = this.memoryStore.getAll();
    const caseCount = cases.length;
    
    // Estimate size by serializing
    let estimatedSizeBytes = 0;
    try {
      estimatedSizeBytes = JSON.stringify(cases).length * 2; // UTF-16
    } catch {
      estimatedSizeBytes = 0;
    }
    
    return { caseCount, estimatedSizeBytes };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a persistence manager with default configuration
 */
export function createPersistenceManager(
  config?: Partial<PersistenceConfig>,
  backendAdapter?: BackendAdapter
): PersistenceManager {
  const manager = new PersistenceManager(config, backendAdapter ?? null);
  manager.initialize();
  return manager;
}

// ============================================================================
// MOCK BACKEND ADAPTER (for testing)
// ============================================================================

/**
 * Mock backend adapter for testing
 */
export class MockBackendAdapter implements BackendAdapter {
  private cases: Map<string, ClinicalCase> = new Map();
  private delay: number;
  private shouldFail = false;

  constructor(delay = 100) {
    this.delay = delay;
  }

  setFailMode(fail: boolean): void {
    this.shouldFail = fail;
  }

  private async simulateDelay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.delay));
  }

  async createCase(case_: ClinicalCase): Promise<ClinicalCase> {
    await this.simulateDelay();
    if (this.shouldFail) throw new Error('Backend error');
    this.cases.set(case_.id, case_);
    return case_;
  }

  async updateCase(caseId: string, data: Partial<ClinicalCase>): Promise<ClinicalCase> {
    await this.simulateDelay();
    if (this.shouldFail) throw new Error('Backend error');
    const existing = this.cases.get(caseId);
    if (!existing) throw new Error('Case not found');
    const updated = { ...existing, ...data };
    this.cases.set(caseId, updated);
    return updated;
  }

  async deleteCase(caseId: string): Promise<void> {
    await this.simulateDelay();
    if (this.shouldFail) throw new Error('Backend error');
    this.cases.delete(caseId);
  }

  async getCase(caseId: string): Promise<ClinicalCase | null> {
    await this.simulateDelay();
    if (this.shouldFail) throw new Error('Backend error');
    return this.cases.get(caseId) || null;
  }

  async listCases(userId: string): Promise<ClinicalCase[]> {
    await this.simulateDelay();
    if (this.shouldFail) throw new Error('Backend error');
    return Array.from(this.cases.values()).filter(
      c => c.audit.createdBy === userId
    );
  }

  // Test helpers
  getCaseCount(): number {
    return this.cases.size;
  }

  reset(): void {
    this.cases.clear();
    this.shouldFail = false;
  }
}
