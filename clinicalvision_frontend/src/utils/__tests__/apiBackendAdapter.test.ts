/**
 * ApiBackendAdapter Tests (Phase C, Steps C.3 & C.4)
 *
 * TDD tests for the adapter that bridges the API service to
 * PersistenceManager / SyncQueue BackendAdapter interfaces.
 *
 * @jest-environment jsdom
 */

// Mock the api module
jest.mock('../../services/api', () => ({
  api: {
    createCase: jest.fn(),
    getCase: jest.fn(),
    listCases: jest.fn(),
    updateCase: jest.fn(),
    deleteCase: jest.fn(),
    advanceWorkflow: jest.fn(),
    finalizeCase: jest.fn(),
  },
}));

import { api } from '../../services/api';
import { createApiBackendAdapter } from '../apiBackendAdapter';
import type { ClinicalCase, PatientInfo, ClinicalHistory } from '../../types/case.types';

const mockApi = api as jest.Mocked<typeof api>;

// ============================================================================
// FIXTURES
// ============================================================================

const BACKEND_ID = '550e8400-e29b-41d4-a716-446655440000';

function createMockBackendResponse(overrides: Record<string, any> = {}) {
  return {
    id: BACKEND_ID,
    case_number: 'CV-2025-000001',
    patient_mrn: 'MRN123456',
    patient_first_name: 'Jane',
    patient_last_name: 'Smith',
    patient_dob: '1980-05-15',
    patient_sex: 'F',
    clinical_history: { clinicalIndication: 'Screening mammogram' },
    workflow_current_step: 'PATIENT_REGISTRATION',
    workflow_status: 'in_progress',
    workflow_completed_steps: [],
    workflow_locked: false,
    birads_assessment: null,
    report_content: null,
    signed_at: null,
    signature_hash: null,
    images: [],
    findings: [],
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
    ...overrides,
  };
}

function createMinimalCase(): ClinicalCase {
  return {
    id: 'local-case-001',
    caseNumber: 'CV-2025-000001',
    patient: {
      mrn: 'MRN123456',
      firstName: 'Jane',
      lastName: 'Smith',
      dateOfBirth: '1980-05-15',
      gender: 'F',
    } as PatientInfo,
    clinicalHistory: {
      clinicalIndication: 'Screening mammogram',
      familyHistoryBreastCancer: false,
      personalHistoryBreastCancer: false,
      previousBiopsy: false,
      comparisonAvailable: false,
    } as ClinicalHistory,
    images: [],
    analysisResults: [],
    consolidatedFindings: [],
    workflow: {
      currentStep: 'PATIENT_REGISTRATION' as any,
      completedSteps: [],
      status: 'in_progress' as any,
      isLocked: false,
      startedAt: '2025-01-15T10:00:00Z',
      lastModifiedAt: '2025-01-15T10:00:00Z',
    },
    audit: {
      createdBy: 'test-user',
      createdAt: '2025-01-15T10:00:00Z',
      lastModifiedBy: 'test-user',
      lastModifiedAt: '2025-01-15T10:00:00Z',
      modifications: [],
    },
  } as ClinicalCase;
}

// ============================================================================
// TESTS
// ============================================================================

describe('ApiBackendAdapter (C.3 / C.4)', () => {
  let adapter: ReturnType<typeof createApiBackendAdapter>;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = createApiBackendAdapter();
  });

  describe('createCase', () => {
    it('should call api.createCase with converted request', async () => {
      mockApi.createCase.mockResolvedValue(createMockBackendResponse());

      await adapter.createCase(createMinimalCase());

      expect(mockApi.createCase).toHaveBeenCalledTimes(1);
      const callArgs = mockApi.createCase.mock.calls[0][0];
      expect(callArgs.patient_first_name).toBe('Jane');
      expect(callArgs.patient_last_name).toBe('Smith');
      expect(callArgs.patient_mrn).toBe('MRN123456');
    });

    it('should return ClinicalCase with backendId set', async () => {
      mockApi.createCase.mockResolvedValue(
        createMockBackendResponse({ id: BACKEND_ID })
      );

      const result = await adapter.createCase(createMinimalCase());

      expect(result.backendId).toBe(BACKEND_ID);
      expect(result.id).toBe('local-case-001'); // Preserves local ID
    });
  });

  describe('updateCase', () => {
    it('should call api.updateCase with converted request', async () => {
      mockApi.updateCase.mockResolvedValue(createMockBackendResponse());

      await adapter.updateCase(BACKEND_ID, {
        patient: { firstName: 'Janet' } as PatientInfo,
      });

      expect(mockApi.updateCase).toHaveBeenCalledTimes(1);
      expect(mockApi.updateCase.mock.calls[0][0]).toBe(BACKEND_ID);
    });

    it('should return case with backendId', async () => {
      mockApi.updateCase.mockResolvedValue(
        createMockBackendResponse({ id: BACKEND_ID })
      );

      const result = await adapter.updateCase(BACKEND_ID, {
        patient: { firstName: 'Janet' } as PatientInfo,
      });

      expect(result.backendId).toBe(BACKEND_ID);
    });
  });

  describe('deleteCase', () => {
    it('should call api.deleteCase', async () => {
      mockApi.deleteCase.mockResolvedValue(undefined);

      await adapter.deleteCase(BACKEND_ID);

      expect(mockApi.deleteCase).toHaveBeenCalledWith(BACKEND_ID);
    });
  });

  describe('getCase', () => {
    it('should call api.getCase and return null (hydration not yet implemented)', async () => {
      mockApi.getCase.mockResolvedValue(createMockBackendResponse());

      const result = await adapter.getCase(BACKEND_ID);

      expect(mockApi.getCase).toHaveBeenCalledWith(BACKEND_ID);
      // Full hydration is deferred — returns null for now
      expect(result).toBeNull();
    });

    it('should return null when backend throws', async () => {
      mockApi.getCase.mockRejectedValue(new Error('Not found'));

      const result = await adapter.getCase('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('listCases', () => {
    it('should return empty array (full hydration deferred)', async () => {
      const result = await adapter.listCases('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('adapter interface conformance', () => {
    it('should satisfy PersistenceManager BackendAdapter interface', () => {
      expect(typeof adapter.createCase).toBe('function');
      expect(typeof adapter.updateCase).toBe('function');
      expect(typeof adapter.deleteCase).toBe('function');
      expect(typeof adapter.getCase).toBe('function');
      expect(typeof adapter.listCases).toBe('function');
    });

    it('should satisfy SyncQueue BackendAdapter interface', () => {
      expect(typeof adapter.createCase).toBe('function');
      expect(typeof adapter.updateCase).toBe('function');
      expect(typeof adapter.deleteCase).toBe('function');
      expect(typeof adapter.getCase).toBe('function');
    });
  });
});
