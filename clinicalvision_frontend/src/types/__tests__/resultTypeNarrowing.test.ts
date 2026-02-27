/**
 * Phase H TDD Tests: Result<T> Type-Safe Narrowing Helpers
 * 
 * These test utilities enable type-safe access to Result<T, E> error/data
 * without TS warnings. Essential for eliminating ~80+ TS2339 warnings
 * where .error is accessed on a non-narrowed Result<T>.
 */

import {
  Result,
  success,
  failure,
  ValidationError,
  ErrorCode,
  FieldError,
} from '../case.types';

import {
  assertSuccess,
  assertFailure,
  getErrorOrThrow,
  getDataOrThrow,
  isFailure,
  isSuccess,
} from '../resultHelpers';

// ============================================================================
// HELPER: assertSuccess
// ============================================================================

describe('assertSuccess', () => {
  it('narrows to success branch and returns data', () => {
    const result: Result<string> = success('hello');
    const data = assertSuccess(result);
    expect(data).toBe('hello');
  });

  it('throws on failure result', () => {
    const result: Result<string> = failure(new Error('oops'));
    expect(() => assertSuccess(result)).toThrow('Expected success but got failure');
  });

  it('preserves complex data types', () => {
    const result: Result<{ name: string; count: number }> = success({ name: 'test', count: 42 });
    const data = assertSuccess(result);
    expect(data.name).toBe('test');
    expect(data.count).toBe(42);
  });

  it('returns warnings from success result', () => {
    const result: Result<string> = success('data', ['minor issue']);
    const data = assertSuccess(result);
    expect(data).toBe('data');
    // The warnings are accessible on the original result since it's narrowed
    if (result.success) {
      expect(result.warnings).toEqual(['minor issue']);
    }
  });
});

// ============================================================================
// HELPER: assertFailure
// ============================================================================

describe('assertFailure', () => {
  it('narrows to failure branch and returns error', () => {
    const result: Result<string> = failure(new Error('fail'));
    const error = assertFailure(result);
    expect(error.message).toBe('fail');
  });

  it('throws on success result', () => {
    const result: Result<string> = success('ok');
    expect(() => assertFailure(result)).toThrow('Expected failure but got success');
  });

  it('returns typed validation errors', () => {
    const fieldErrors: FieldError[] = [
      { field: 'name', message: 'Required' },
    ];
    const validationError: ValidationError = {
      name: 'ValidationError',
      message: 'Validation failed',
      code: ErrorCode.VALIDATION_ERROR,
      errors: fieldErrors,
    };
    const result: Result<string, ValidationError> = failure(validationError);
    const error = assertFailure(result);
    expect(error.name).toBe('ValidationError');
    expect(error.errors).toHaveLength(1);
    expect(error.errors[0].field).toBe('name');
  });

  it('preserves custom error types', () => {
    interface CustomError {
      code: string;
      details: string[];
    }
    const result: Result<number, CustomError> = failure({ code: 'CUSTOM', details: ['a', 'b'] });
    const error = assertFailure(result);
    expect(error.code).toBe('CUSTOM');
    expect(error.details).toEqual(['a', 'b']);
  });
});

// ============================================================================
// HELPER: getDataOrThrow / getErrorOrThrow (non-test assertion versions)
// ============================================================================

describe('getDataOrThrow', () => {
  it('returns data from success result', () => {
    const result: Result<number> = success(42);
    expect(getDataOrThrow(result)).toBe(42);
  });

  it('throws the error from failure result', () => {
    const result: Result<number> = failure(new Error('computation failed'));
    expect(() => getDataOrThrow(result)).toThrow('computation failed');
  });

  it('throws with custom message for non-Error failures', () => {
    const result: Result<number, string> = failure('string error');
    expect(() => getDataOrThrow(result)).toThrow('Operation failed');
  });
});

describe('getErrorOrThrow', () => {
  it('returns error from failure result', () => {
    const result: Result<string> = failure(new Error('fail'));
    const err = getErrorOrThrow(result);
    expect(err.message).toBe('fail');
  });

  it('throws on success result', () => {
    const result: Result<string> = success('ok');
    expect(() => getErrorOrThrow(result)).toThrow('Expected failure');
  });
});

// ============================================================================
// HELPER: isSuccess / isFailure type guards
// ============================================================================

describe('isSuccess', () => {
  it('returns true for success results', () => {
    expect(isSuccess(success('ok'))).toBe(true);
  });

  it('returns false for failure results', () => {
    expect(isSuccess(failure(new Error('no')))).toBe(false);
  });

  it('narrows type in conditional block', () => {
    const result: Result<string> = success('typed');
    if (isSuccess(result)) {
      // TS should know result.data exists here
      expect(result.data).toBe('typed');
    }
  });
});

describe('isFailure', () => {
  it('returns true for failure results', () => {
    expect(isFailure(failure(new Error('yes')))).toBe(true);
  });

  it('returns false for success results', () => {
    expect(isFailure(success('no'))).toBe(false);
  });

  it('narrows type in conditional block', () => {
    const result: Result<string> = failure(new Error('typed'));
    if (isFailure(result)) {
      // TS should know result.error exists here
      expect(result.error.message).toBe('typed');
    }
  });
});
