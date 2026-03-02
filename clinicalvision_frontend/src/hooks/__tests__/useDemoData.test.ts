/**
 * TDD Tests for useDemoData Hook — Phase 2 Frontend Integration
 *
 * React hook wrapping DemoDataService to provide demo data to components
 * with loading/error states and caching.
 *
 * Usage:
 *   npx react-scripts test --testPathPattern="useDemoData" --watchAll=false
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { useDemoData, UseDemoDataResult } from '../../hooks/useDemoData';
import { DemoDataService } from '../../services/demoDataService';

// ============================================================================
// Mock DemoDataService
// ============================================================================

jest.mock('../../services/demoDataService');

const MockDemoDataService = DemoDataService as jest.MockedClass<typeof DemoDataService>;

const MOCK_CASES = [
  { id: 'DEMO-001', label: 'Normal / Benign Screening', difficulty: 'Easy' as const, views: 4, path: '/demo-data/case-1-normal/' },
  { id: 'DEMO-002', label: 'Suspicious Mass Finding', difficulty: 'Intermediate' as const, views: 6, path: '/demo-data/case-2-suspicious/' },
  { id: 'DEMO-003', label: 'Calcification Follow-up', difficulty: 'Advanced' as const, views: 2, path: '/demo-data/case-3-calcification/' },
];

const MOCK_MANIFEST = {
  version: '1.0.0',
  generatedAt: '2026-02-28T12:00:00.000Z',
  description: 'ClinicalVision AI Demo Data Package',
  totalCases: 3,
  totalImages: 12,
  formats: ['DICOM (.dcm)', 'PNG (.png)'],
  cases: MOCK_CASES,
};

const MOCK_CASE_INFO = {
  caseId: 'DEMO-001',
  version: '1.0.0',
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
  },
  expectedOutcome: {
    biRads: '1 or 2',
    description: 'Normal/Benign — no suspicious findings',
    pathology: 'BENIGN',
  },
  images: [
    { filename: 'DEMO-001_RIGHT_CC', viewType: 'CC', laterality: 'R', formats: ['dcm', 'png'] },
    { filename: 'DEMO-001_LEFT_CC', viewType: 'CC', laterality: 'L', formats: ['dcm', 'png'] },
    { filename: 'DEMO-001_RIGHT_MLO', viewType: 'MLO', laterality: 'R', formats: ['dcm', 'png'] },
    { filename: 'DEMO-001_LEFT_MLO', viewType: 'MLO', laterality: 'L', formats: ['dcm', 'png'] },
  ],
};

// ============================================================================
// Setup
// ============================================================================

beforeEach(() => {
  MockDemoDataService.mockClear();
});

// ============================================================================
// Tests — Hook Return Shape
// ============================================================================

describe('useDemoData — Return Shape', () => {
  beforeEach(() => {
    MockDemoDataService.prototype.getManifest = jest.fn().mockResolvedValue(MOCK_MANIFEST);
    MockDemoDataService.prototype.isAvailable = jest.fn().mockResolvedValue(true);
  });

  it('returns an object with required fields', async () => {
    const { result } = renderHook(() => useDemoData());

    // Check shape immediately (before loading completes)
    expect(result.current).toHaveProperty('cases');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('isAvailable');
    expect(result.current).toHaveProperty('loadCaseInfo');
  });

  it('cases is initially an empty array', () => {
    const { result } = renderHook(() => useDemoData());
    expect(result.current.cases).toEqual([]);
  });

  it('isLoading is initially true', () => {
    const { result } = renderHook(() => useDemoData());
    expect(result.current.isLoading).toBe(true);
  });

  it('error is initially null', () => {
    const { result } = renderHook(() => useDemoData());
    expect(result.current.error).toBeNull();
  });
});

// ============================================================================
// Tests — Successful Loading
// ============================================================================

describe('useDemoData — Successful Loading', () => {
  beforeEach(() => {
    MockDemoDataService.prototype.getManifest = jest.fn().mockResolvedValue(MOCK_MANIFEST);
    MockDemoDataService.prototype.isAvailable = jest.fn().mockResolvedValue(true);
  });

  it('loads demo cases after mount', async () => {
    const { result } = renderHook(() => useDemoData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.cases).toHaveLength(3);
    expect(result.current.error).toBeNull();
  });

  it('returns case summaries with correct IDs', async () => {
    const { result } = renderHook(() => useDemoData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const ids = result.current.cases.map(c => c.id);
    expect(ids).toContain('DEMO-001');
    expect(ids).toContain('DEMO-002');
    expect(ids).toContain('DEMO-003');
  });

  it('sets isAvailable to true when manifest loads', async () => {
    const { result } = renderHook(() => useDemoData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAvailable).toBe(true);
  });
});

// ============================================================================
// Tests — Error Handling
// ============================================================================

describe('useDemoData — Error Handling', () => {
  it('sets error when manifest fails to load', async () => {
    MockDemoDataService.prototype.getManifest = jest.fn().mockRejectedValue(
      new Error('Failed to load demo data manifest')
    );
    MockDemoDataService.prototype.isAvailable = jest.fn().mockResolvedValue(false);

    const { result } = renderHook(() => useDemoData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.cases).toEqual([]);
    expect(result.current.isAvailable).toBe(false);
  });

  it('sets isAvailable to false on error', async () => {
    MockDemoDataService.prototype.getManifest = jest.fn().mockRejectedValue(
      new Error('Network error')
    );
    MockDemoDataService.prototype.isAvailable = jest.fn().mockResolvedValue(false);

    const { result } = renderHook(() => useDemoData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAvailable).toBe(false);
  });
});

// ============================================================================
// Tests — loadCaseInfo()
// ============================================================================

describe('useDemoData — loadCaseInfo()', () => {
  beforeEach(() => {
    MockDemoDataService.prototype.getManifest = jest.fn().mockResolvedValue(MOCK_MANIFEST);
    MockDemoDataService.prototype.isAvailable = jest.fn().mockResolvedValue(true);
    MockDemoDataService.prototype.getCaseInfo = jest.fn().mockResolvedValue(MOCK_CASE_INFO);
  });

  it('returns detailed case info for a valid case ID', async () => {
    const { result } = renderHook(() => useDemoData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const caseInfo = await act(async () => {
      return result.current.loadCaseInfo('DEMO-001');
    });

    expect(caseInfo).toBeTruthy();
    expect(caseInfo!.caseId).toBe('DEMO-001');
    expect(caseInfo!.patient.firstName).toBe('Jane');
    expect(caseInfo!.images).toHaveLength(4);
  });

  it('returns null for an unknown case ID', async () => {
    MockDemoDataService.prototype.getCaseInfo = jest.fn().mockRejectedValue(
      new Error('Case DEMO-999 not found')
    );

    const { result } = renderHook(() => useDemoData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const caseInfo = await act(async () => {
      return result.current.loadCaseInfo('DEMO-999');
    });

    expect(caseInfo).toBeNull();
  });

  it('loadCaseInfo is a function', async () => {
    const { result } = renderHook(() => useDemoData());
    expect(typeof result.current.loadCaseInfo).toBe('function');
  });
});

// ============================================================================
// Tests — autoLoad option
// ============================================================================

describe('useDemoData — autoLoad option', () => {
  beforeEach(() => {
    MockDemoDataService.prototype.getManifest = jest.fn().mockResolvedValue(MOCK_MANIFEST);
    MockDemoDataService.prototype.isAvailable = jest.fn().mockResolvedValue(true);
  });

  it('does NOT fetch manifest when autoLoad is false', async () => {
    const { result } = renderHook(() => useDemoData({ autoLoad: false }));

    // Wait a tick to ensure no async action was started
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.cases).toEqual([]);
    expect(MockDemoDataService.prototype.getManifest).not.toHaveBeenCalled();
  });

  it('fetches manifest when autoLoad is true (default)', async () => {
    const { result } = renderHook(() => useDemoData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(MockDemoDataService.prototype.getManifest).toHaveBeenCalled();
    expect(result.current.cases).toHaveLength(3);
  });
});
