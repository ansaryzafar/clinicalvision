/**
 * useLoadDemoCase.test.ts — TDD tests for the demo case loading hook.
 *
 * Tests that the hook correctly:
 *  1. Loads case info from the demo data service
 *  2. Maps demo data to workflow types via demoDataMapper
 *  3. Creates a case in the clinical context
 *  4. Advances the workflow to IMAGE_UPLOAD
 *  5. Fetches demo PNG images and adds them to the case
 *  6. Reports loading/error states
 */

import { renderHook, act } from '@testing-library/react';
import type { DemoCaseInfo } from '../../services/demoDataService';

// ============================================================================
// Mock setup
// ============================================================================

// Mock ClinicalCaseContext
const mockCreateCase = jest.fn();
const mockAdvanceWorkflow = jest.fn();
const mockAddImage = jest.fn();

jest.mock('../../contexts/ClinicalCaseContext', () => ({
  useClinicalCase: () => ({
    createCase: mockCreateCase,
    advanceWorkflow: mockAdvanceWorkflow,
    addImage: mockAddImage,
    currentCase: null,
  }),
}));

// Mock createMammogramImage
const mockCreateMammogramImage = jest.fn();
jest.mock('../../utils/imageUploadOperations', () => ({
  createMammogramImage: (...args: unknown[]) => mockCreateMammogramImage(...args),
}));

// Mock global fetch for image loading
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// ============================================================================
// Mock DemoDataService via auto-mock + manual implementation per test
// ============================================================================

jest.mock('../../services/demoDataService');

// Use require() to get the mocked module after jest.mock
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DemoDataService } = require('../../services/demoDataService');

// Track the mock instance methods (re-created in beforeEach)
let mockGetManifest: jest.Mock;
let mockGetCaseInfo: jest.Mock;

// Import the hook under test (after all mocks are declared)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useLoadDemoCase } = require('../useLoadDemoCase');

// ============================================================================
// Test fixtures
// ============================================================================

const MOCK_DEMO_CASE: DemoCaseInfo = {
  caseId: 'DEMO-001',
  version: '2.0.0',
  patient: {
    mrn: 'DEMO-001',
    firstName: 'Jane',
    lastName: 'Thompson',
    middleInitial: 'A',
    dateOfBirth: '1968-03-15',
    sex: 'F',
  },
  clinicalHistory: {
    indication: 'Routine annual screening mammography',
    priorStudies: 'Annual screening — no prior findings',
    brcaStatus: 'Negative',
    familyHistory: 'No significant family history',
    symptoms: 'None — asymptomatic screening',
    hormoneTherapy: 'None',
    priorBiopsies: 'None',
  },
  expectedOutcome: {
    biRads: '1 or 2',
    description: 'Normal/Benign',
    pathology: 'BENIGN',
  },
  images: [
    { filename: 'DEMO-001_RIGHT_CC', viewType: 'CC', laterality: 'R', formats: ['png'], source: 'CBIS-DDSM' },
    { filename: 'DEMO-001_RIGHT_MLO', viewType: 'MLO', laterality: 'R', formats: ['png'], source: 'CBIS-DDSM' },
    { filename: 'DEMO-001_LEFT_CC', viewType: 'CC', laterality: 'L', formats: ['png'], source: 'CBIS-DDSM' },
    { filename: 'DEMO-001_LEFT_MLO', viewType: 'MLO', laterality: 'L', formats: ['png'], source: 'CBIS-DDSM' },
  ],
};

const MOCK_MANIFEST = {
  version: '2.0.0',
  totalCases: 3,
  totalImages: 10,
  cases: [
    { id: 'DEMO-001', label: 'Normal', difficulty: 'Easy' as const, views: 4, path: '/demo-data/case-1-normal/' },
    { id: 'DEMO-002', label: 'Suspicious', difficulty: 'Intermediate' as const, views: 4, path: '/demo-data/case-2-suspicious/' },
    { id: 'DEMO-003', label: 'Calcification', difficulty: 'Advanced' as const, views: 2, path: '/demo-data/case-3-calcification/' },
  ],
};

// ============================================================================
// Setup / Teardown
// ============================================================================

beforeEach(() => {
  jest.clearAllMocks();

  // Re-create mock instance methods each test
  mockGetManifest = jest.fn().mockResolvedValue(MOCK_MANIFEST);
  mockGetCaseInfo = jest.fn().mockResolvedValue(MOCK_DEMO_CASE);

  // Wire DemoDataService constructor to return our mock methods
  DemoDataService.mockImplementation(() => ({
    getManifest: mockGetManifest,
    getCaseInfo: mockGetCaseInfo,
    clearCache: jest.fn(),
    isAvailable: jest.fn(),
  }));

  // Default: createCase succeeds
  mockCreateCase.mockResolvedValue({
    success: true,
    data: { id: 'case-uuid-1', workflow: { currentStep: 'PATIENT_REGISTRATION' } },
  });

  // Default: advanceWorkflow succeeds
  mockAdvanceWorkflow.mockReturnValue({
    success: true,
    data: { id: 'case-uuid-1' },
  });

  // Default: addImage succeeds
  mockAddImage.mockReturnValue({
    success: true,
    data: { id: 'case-uuid-1' },
  });

  // Default: createMammogramImage succeeds
  mockCreateMammogramImage.mockReturnValue({
    success: true,
    data: { id: 'img-1', viewType: 'CC', laterality: 'R', uploadStatus: 'uploaded' },
  });

  // Default: fetch returns a blob
  mockFetch.mockResolvedValue({
    ok: true,
    blob: () => Promise.resolve(new Blob(['fake-png'], { type: 'image/png' })),
  });
});

// ============================================================================
// Tests
// ============================================================================

describe('useLoadDemoCase', () => {
  describe('initial state', () => {
    it('returns isLoading=false initially', () => {
      const { result } = renderHook(() => useLoadDemoCase());
      expect(result.current.isLoading).toBe(false);
    });

    it('returns error=null initially', () => {
      const { result } = renderHook(() => useLoadDemoCase());
      expect(result.current.error).toBeNull();
    });

    it('exposes a loadDemoCase function', () => {
      const { result } = renderHook(() => useLoadDemoCase());
      expect(typeof result.current.loadDemoCase).toBe('function');
    });
  });

  describe('loadDemoCase — happy path', () => {
    it('isLoading is false after completion', async () => {
      const { result } = renderHook(() => useLoadDemoCase());

      await act(async () => {
        await result.current.loadDemoCase('DEMO-001');
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('calls getCaseInfo with the correct caseId', async () => {
      const { result } = renderHook(() => useLoadDemoCase());

      await act(async () => {
        await result.current.loadDemoCase('DEMO-001');
      });

      expect(mockGetCaseInfo).toHaveBeenCalledWith('DEMO-001');
    });

    it('calls createCase with mapped patient and clinical history', async () => {
      const { result } = renderHook(() => useLoadDemoCase());

      await act(async () => {
        await result.current.loadDemoCase('DEMO-001');
      });

      expect(mockCreateCase).toHaveBeenCalledTimes(1);
      const [patient, clinicalHistory, options] = mockCreateCase.mock.calls[0];
      expect(patient.gender).toBe('F');
      expect(patient.mrn).toBe('DEMO-001');
      expect(patient.firstName).toBe('Jane');
      expect(patient.lastName).toBe('Thompson');
      expect(clinicalHistory.clinicalIndication).toBeTruthy();
      expect(options?.skipValidation).toBe(true);
    });

    it('advances workflow twice to reach IMAGE_UPLOAD', async () => {
      const { result } = renderHook(() => useLoadDemoCase());

      await act(async () => {
        await result.current.loadDemoCase('DEMO-001');
      });

      expect(mockAdvanceWorkflow).toHaveBeenCalledTimes(2);
    });

    it('fetches each demo image PNG', async () => {
      const { result } = renderHook(() => useLoadDemoCase());

      await act(async () => {
        await result.current.loadDemoCase('DEMO-001');
      });

      expect(mockFetch).toHaveBeenCalledTimes(4);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('DEMO-001_RIGHT_CC.png')
      );
    });

    it('creates a MammogramImage for each fetched image', async () => {
      const { result } = renderHook(() => useLoadDemoCase());

      await act(async () => {
        await result.current.loadDemoCase('DEMO-001');
      });

      expect(mockCreateMammogramImage).toHaveBeenCalledTimes(4);
    });

    it('calls addImage for each created MammogramImage', async () => {
      const { result } = renderHook(() => useLoadDemoCase());

      await act(async () => {
        await result.current.loadDemoCase('DEMO-001');
      });

      expect(mockAddImage).toHaveBeenCalledTimes(4);
    });

    it('returns success=true on completion', async () => {
      const { result } = renderHook(() => useLoadDemoCase());

      let success = false;
      await act(async () => {
        success = await result.current.loadDemoCase('DEMO-001');
      });

      expect(success).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe('loadDemoCase — error handling', () => {
    it('returns false and sets error when getCaseInfo fails', async () => {
      mockGetCaseInfo.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useLoadDemoCase());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.loadDemoCase('DEMO-001');
      });

      expect(success).toBe(false);
      expect(result.current.error).toContain('Network error');
      expect(result.current.isLoading).toBe(false);
    });

    it('returns false when createCase fails', async () => {
      mockCreateCase.mockResolvedValue({
        success: false,
        error: { message: 'Validation error' },
      });

      const { result } = renderHook(() => useLoadDemoCase());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.loadDemoCase('DEMO-001');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    it('continues loading remaining images if one fetch fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          blob: () => Promise.resolve(new Blob(['img1'], { type: 'image/png' })),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        .mockResolvedValueOnce({
          ok: true,
          blob: () => Promise.resolve(new Blob(['img3'], { type: 'image/png' })),
        })
        .mockResolvedValueOnce({
          ok: true,
          blob: () => Promise.resolve(new Blob(['img4'], { type: 'image/png' })),
        });

      const { result } = renderHook(() => useLoadDemoCase());

      await act(async () => {
        await result.current.loadDemoCase('DEMO-001');
      });

      expect(mockCreateMammogramImage).toHaveBeenCalledTimes(3);
      expect(mockAddImage).toHaveBeenCalledTimes(3);
    });
  });

  describe('case directory resolution', () => {
    it('resolves case directory from manifest path', async () => {
      const { result } = renderHook(() => useLoadDemoCase());

      await act(async () => {
        await result.current.loadDemoCase('DEMO-001');
      });

      expect(mockFetch.mock.calls.length).toBeGreaterThan(0);
      const firstCallUrl = mockFetch.mock.calls[0][0];
      expect(firstCallUrl).toContain('/demo-data/case-1-normal/');
    });
  });
});
