/**
 * Result<T, E> Type-Safe Narrowing Helpers
 * 
 * These helpers provide type-safe access to Result<T, E> discriminated union
 * branches without triggering TS2339 "Property does not exist" warnings.
 * 
 * Used across production code and test assertions where the success/failure
 * status is known but TypeScript's control flow analysis cannot infer it
 * (especially when strict mode is disabled).
 * 
 * @module resultHelpers
 */

import { Result } from './case.types';

/** Extracted failure shape for internal use */
type FailureBranch<E> = { success: false; error: E };
/** Extracted success branch for internal use */
type SuccessBranch<T> = { success: true; data: T; warnings?: string[] };

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard that narrows a Result to its success branch.
 * Use in `if` blocks to safely access `result.data`.
 */
export function isSuccess<T, E>(result: Result<T, E>): result is SuccessBranch<T> {
  return result.success;
}

/**
 * Type guard that narrows a Result to its failure branch.
 * Use in `if` blocks to safely access `result.error`.
 */
export function isFailure<T, E>(result: Result<T, E>): result is FailureBranch<E> {
  return !result.success;
}

// ============================================================================
// ASSERTION HELPERS (for tests)
// ============================================================================

/**
 * Asserts that a Result is successful and returns its data.
 * Throws if the result is a failure.
 */
export function assertSuccess<T, E>(result: Result<T, E>): T {
  if (!result.success) {
    const fail = result as FailureBranch<E>;
    const errorMsg = fail.error instanceof Error
      ? fail.error.message
      : String(fail.error);
    throw new Error(`Expected success but got failure: ${errorMsg}`);
  }
  return result.data;
}

/**
 * Asserts that a Result is a failure and returns its error.
 * Throws if the result is successful.
 */
export function assertFailure<T, E>(result: Result<T, E>): E {
  if (result.success) {
    throw new Error(`Expected failure but got success with data: ${JSON.stringify(result.data)}`);
  }
  return (result as FailureBranch<E>).error;
}

// ============================================================================
// EXTRACTION HELPERS (for production code)
// ============================================================================

/**
 * Returns the data from a success Result, or throws the error.
 * Use in production code where failure should be exceptional.
 */
export function getDataOrThrow<T, E>(result: Result<T, E>): T {
  if (result.success) {
    return result.data;
  }
  const fail = result as FailureBranch<E>;
  if (fail.error instanceof Error) {
    throw fail.error;
  }
  throw new Error('Operation failed');
}

/**
 * Returns the error from a failure Result, or throws.
 * Use when you need to extract the error for logging/display.
 */
export function getErrorOrThrow<T, E>(result: Result<T, E>): E {
  if (!result.success) {
    return (result as FailureBranch<E>).error;
  }
  throw new Error('Expected failure but got success');
}
