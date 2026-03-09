/**
 * debouncedPersistence — Debounced localStorage writer.
 *
 * Problem: ClinicalCaseContext serialises the full case store (including
 *          56×56 attention-map arrays) to localStorage on EVERY state change.
 *          With 4-image cases this is ~100 KB of JSON.stringify per tick.
 *
 * Solution: Batch writes and flush after a configurable debounce interval.
 *           Default is 3 000 ms — long enough to absorb rapid-fire state
 *           updates (slider drags, window/level, etc.) without noticeably
 *           delaying persistence.
 *
 * Usage:
 *   import { debouncedPersist, cancelPersist } from 'utils/debouncedPersistence';
 *   debouncedPersist('caseStore', storeValue);
 *   // On unmount / cleanup:
 *   cancelPersist();
 */

const DEBOUNCE_MS = 3_000;

/** Pending timer IDs keyed by storage key. */
const timers: Record<string, ReturnType<typeof setTimeout>> = {};

/**
 * Write `value` to localStorage under `key` after a debounce window.
 * Rapid consecutive calls reset the timer so only the LAST value is persisted.
 */
export function debouncedPersist(key: string, value: unknown): void {
  // Cancel any pending write for the same key
  if (timers[key] !== undefined) {
    clearTimeout(timers[key]);
  }

  timers[key] = setTimeout(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage quota exceeded — silently drop
    }
    delete timers[key];
  }, DEBOUNCE_MS);
}

/**
 * Cancel ALL pending writes.  Call on component unmount / cleanup.
 */
export function cancelPersist(): void {
  for (const key of Object.keys(timers)) {
    clearTimeout(timers[key]);
    delete timers[key];
  }
}

/**
 * Flush a specific key immediately (useful for beforeunload).
 */
export function flushPersist(key: string, value: unknown): void {
  if (timers[key] !== undefined) {
    clearTimeout(timers[key]);
    delete timers[key];
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // silently drop
  }
}
