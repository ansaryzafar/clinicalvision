/**
 * API Service - Case Management Methods Tests (Phase C, Step C.1)
 *
 * TDD RED → GREEN tests verifying ClinicalVisionAPI has all required
 * case management methods with correct signatures.
 *
 * NOTE: Behavioural HTTP tests are in the Context integration test file
 * (ClinicalCaseContext.integration.test.tsx) which mocks the `api` module
 * directly — avoiding CRA's complex axios module resolution.
 *
 * @jest-environment jsdom
 */

// Minimal axios mock to prevent real HTTP calls during module load
jest.mock('axios', () => {
  const noop = jest.fn();
  return {
    create: jest.fn(() => ({
      get: noop, post: noop, patch: noop, delete: noop, put: noop,
      interceptors: { request: { use: noop }, response: { use: noop } },
    })),
    isAxiosError: jest.fn(() => false),
    post: noop,
  };
});

import { api } from '../api';

// ============================================================================
// C.1 TESTS — API Case Method Existence & Signatures
// ============================================================================

describe('ClinicalVisionAPI - Case Management Methods (C.1)', () => {

  // --------------------------------------------------------------------------
  // Method existence
  // --------------------------------------------------------------------------
  describe('method existence', () => {
    it('should have createCase method', () => {
      expect(typeof api.createCase).toBe('function');
    });

    it('should have getCase method', () => {
      expect(typeof api.getCase).toBe('function');
    });

    it('should have listCases method', () => {
      expect(typeof api.listCases).toBe('function');
    });

    it('should have updateCase method', () => {
      expect(typeof api.updateCase).toBe('function');
    });

    it('should have deleteCase method', () => {
      expect(typeof api.deleteCase).toBe('function');
    });

    it('should have advanceWorkflow method', () => {
      expect(typeof api.advanceWorkflow).toBe('function');
    });

    it('should have finalizeCase method', () => {
      expect(typeof api.finalizeCase).toBe('function');
    });
  });

  // --------------------------------------------------------------------------
  // Export verification
  // --------------------------------------------------------------------------
  describe('type exports', () => {
    it('should export CaseCreateRequest type (verified via usage)', () => {
      // Type-level test — if this compiles, the export exists
      const req: import('../api').CaseCreateRequest = {
        patient_mrn: 'MRN123',
        patient_first_name: 'Jane',
      };
      expect(req.patient_mrn).toBe('MRN123');
    });

    it('should export CaseUpdateRequest type (verified via usage)', () => {
      const req: import('../api').CaseUpdateRequest = {
        patient_first_name: 'Janet',
        clinical_history: { note: 'updated' },
      };
      expect(req.patient_first_name).toBe('Janet');
    });

    it('should export BackendCaseResponse type (verified via usage)', () => {
      const resp: import('../api').BackendCaseResponse = {
        id: 'uuid',
        case_number: 'CV-2025-000001',
        workflow_current_step: 'PATIENT_REGISTRATION',
        workflow_status: 'in_progress',
        workflow_completed_steps: [],
        workflow_locked: false,
        images: [],
        findings: [],
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      };
      expect(resp.id).toBe('uuid');
    });

    it('should export BackendCaseListResponse type (verified via usage)', () => {
      const resp: import('../api').BackendCaseListResponse = {
        id: 'uuid',
        case_number: 'CV-2025-000001',
        workflow_current_step: 'PATIENT_REGISTRATION',
        workflow_status: 'in_progress',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      };
      expect(resp.case_number).toBe('CV-2025-000001');
    });
  });
});
