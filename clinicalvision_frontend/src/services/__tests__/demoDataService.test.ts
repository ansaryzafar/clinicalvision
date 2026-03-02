/**
 * TDD Tests for DemoDataService — Phase 2 Frontend Integration
 *
 * Defines the contract for loading demo data packages from the
 * public/demo-data/ directory. The service fetches manifest.json
 * and per-case case-info.json files, provides typed results, and
 * caches data to avoid redundant network requests.
 *
 * Usage:
 *   npx react-scripts test --testPathPattern="demoDataService" --watchAll=false
 */

import {
  DemoDataService,
  DemoManifest,
  DemoCaseSummary,
  DemoCaseInfo,
  DemoPatient,
  DemoClinicalHistory,
  DemoExpectedOutcome,
  DemoImage,
  DEMO_DATA_BASE_PATH,
} from '../demoDataService';

// ============================================================================
// Test Fixtures — must match the schema from test_demo_data_package.py
// ============================================================================

const MOCK_MANIFEST: DemoManifest = {
  version: '1.0.0',
  generatedAt: '2026-02-28T12:00:00.000Z',
  description: 'ClinicalVision AI Demo Data Package',
  totalCases: 3,
  totalImages: 12,
  formats: ['DICOM (.dcm)', 'PNG (.png)'],
  cases: [
    { id: 'DEMO-001', label: 'Normal / Benign Screening', difficulty: 'Easy', views: 4, path: '/demo-data/case-1-normal/' },
    { id: 'DEMO-002', label: 'Suspicious Mass Finding', difficulty: 'Intermediate', views: 6, path: '/demo-data/case-2-suspicious/' },
    { id: 'DEMO-003', label: 'Calcification Follow-up', difficulty: 'Advanced', views: 2, path: '/demo-data/case-3-calcification/' },
  ],
};

const MOCK_CASE_INFO: DemoCaseInfo = {
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
// Setup — mock global fetch
// ============================================================================

const originalFetch = global.fetch;

beforeEach(() => {
  // Reset fetch mock before each test
  global.fetch = jest.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
});

// Helper to create a successful fetch Response
function mockFetchResponse(data: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Not Found',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    clone: () => mockFetchResponse(data, ok, status),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
  } as Response;
}

// ============================================================================
// Tests — Module Exports
// ============================================================================

describe('DemoDataService — Module Exports', () => {
  it('exports DemoDataService class', () => {
    expect(DemoDataService).toBeDefined();
    expect(typeof DemoDataService).toBe('function');
  });

  it('exports DEMO_DATA_BASE_PATH constant', () => {
    expect(DEMO_DATA_BASE_PATH).toBeDefined();
    expect(typeof DEMO_DATA_BASE_PATH).toBe('string');
    expect(DEMO_DATA_BASE_PATH).toBe('/demo-data');
  });

  it('can be instantiated', () => {
    const service = new DemoDataService();
    expect(service).toBeInstanceOf(DemoDataService);
  });
});

// ============================================================================
// Tests — getManifest()
// ============================================================================

describe('DemoDataService — getManifest()', () => {
  it('fetches manifest.json from the correct path', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockFetchResponse(MOCK_MANIFEST)
    );

    const service = new DemoDataService();
    await service.getManifest();

    expect(global.fetch).toHaveBeenCalledWith('/demo-data/manifest.json');
  });

  it('returns a typed DemoManifest object', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockFetchResponse(MOCK_MANIFEST)
    );

    const service = new DemoDataService();
    const manifest = await service.getManifest();

    expect(manifest.version).toBe('1.0.0');
    expect(manifest.totalCases).toBe(3);
    expect(manifest.totalImages).toBe(12);
    expect(manifest.cases).toHaveLength(3);
  });

  it('returns cases with required fields', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockFetchResponse(MOCK_MANIFEST)
    );

    const service = new DemoDataService();
    const manifest = await service.getManifest();

    for (const c of manifest.cases) {
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('label');
      expect(c).toHaveProperty('difficulty');
      expect(c).toHaveProperty('views');
      expect(c).toHaveProperty('path');
    }
  });

  it('caches manifest after first fetch', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockFetchResponse(MOCK_MANIFEST)
    );

    const service = new DemoDataService();
    await service.getManifest();
    await service.getManifest();
    await service.getManifest();

    // fetch should only be called once (subsequent calls use cache)
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('throws DemoDataError on network failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new TypeError('Failed to fetch')
    );

    const service = new DemoDataService();
    await expect(service.getManifest()).rejects.toThrow(/demo data/i);
  });

  it('throws DemoDataError on HTTP 404', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockFetchResponse(null, false, 404)
    );

    const service = new DemoDataService();
    await expect(service.getManifest()).rejects.toThrow(/manifest/i);
  });

  it('throws DemoDataError on invalid JSON response', async () => {
    const badResponse = {
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
      headers: new Headers(),
    } as unknown as Response;

    (global.fetch as jest.Mock).mockResolvedValueOnce(badResponse);

    const service = new DemoDataService();
    await expect(service.getManifest()).rejects.toThrow();
  });
});

// ============================================================================
// Tests — getCaseInfo()
// ============================================================================

describe('DemoDataService — getCaseInfo()', () => {
  it('fetches case-info.json from the correct directory', async () => {
    // Must fetch manifest first to resolve case path
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockFetchResponse(MOCK_MANIFEST))
      .mockResolvedValueOnce(mockFetchResponse(MOCK_CASE_INFO));

    const service = new DemoDataService();
    await service.getCaseInfo('DEMO-001');

    // Second fetch call should be for case-info.json
    expect(global.fetch).toHaveBeenCalledWith(
      '/demo-data/case-1-normal/case-info.json'
    );
  });

  it('returns a typed DemoCaseInfo object', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockFetchResponse(MOCK_MANIFEST))
      .mockResolvedValueOnce(mockFetchResponse(MOCK_CASE_INFO));

    const service = new DemoDataService();
    const info = await service.getCaseInfo('DEMO-001');

    expect(info.caseId).toBe('DEMO-001');
    expect(info.patient.firstName).toBe('Jane');
    expect(info.clinicalHistory.indication).toContain('screening');
    expect(info.expectedOutcome.pathology).toBe('BENIGN');
    expect(info.images).toHaveLength(4);
  });

  it('returns images with correct structure', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockFetchResponse(MOCK_MANIFEST))
      .mockResolvedValueOnce(mockFetchResponse(MOCK_CASE_INFO));

    const service = new DemoDataService();
    const info = await service.getCaseInfo('DEMO-001');

    for (const img of info.images) {
      expect(img).toHaveProperty('filename');
      expect(img).toHaveProperty('viewType');
      expect(img).toHaveProperty('laterality');
      expect(img).toHaveProperty('formats');
      expect(['CC', 'MLO', 'SPOT', 'MAG']).toContain(img.viewType);
      expect(['R', 'L']).toContain(img.laterality);
    }
  });

  it('throws on unknown case ID', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockFetchResponse(MOCK_MANIFEST)
    );

    const service = new DemoDataService();
    await expect(service.getCaseInfo('DEMO-999')).rejects.toThrow(/not found/i);
  });

  it('caches case info after first fetch', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockFetchResponse(MOCK_MANIFEST))
      .mockResolvedValueOnce(mockFetchResponse(MOCK_CASE_INFO));

    const service = new DemoDataService();
    await service.getCaseInfo('DEMO-001');
    await service.getCaseInfo('DEMO-001');

    // 1 manifest fetch + 1 case-info fetch = 2 total
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

// ============================================================================
// Tests — getDemoImageUrl()
// ============================================================================

describe('DemoDataService — getDemoImageUrl()', () => {
  it('returns correct PNG URL for a demo image', () => {
    const service = new DemoDataService();
    const url = service.getDemoImageUrl('case-1-normal', 'DEMO-001_RIGHT_CC', 'png');
    expect(url).toBe('/demo-data/case-1-normal/png/DEMO-001_RIGHT_CC.png');
  });

  it('returns correct DICOM URL for a demo image', () => {
    const service = new DemoDataService();
    const url = service.getDemoImageUrl('case-1-normal', 'DEMO-001_LEFT_MLO', 'dcm');
    expect(url).toBe('/demo-data/case-1-normal/dicom/DEMO-001_LEFT_MLO.dcm');
  });

  it('constructs URLs from case path without double slashes', () => {
    const service = new DemoDataService();
    const url = service.getDemoImageUrl('case-2-suspicious', 'DEMO-002_RIGHT_SPOT', 'png');
    expect(url).not.toContain('//');
    // But should start with /
    expect(url).toMatch(/^\/demo-data\//);
  });
});

// ============================================================================
// Tests — clearCache()
// ============================================================================

describe('DemoDataService — clearCache()', () => {
  it('forces re-fetch after cache is cleared', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockFetchResponse(MOCK_MANIFEST)
    );

    const service = new DemoDataService();
    await service.getManifest();
    service.clearCache();
    await service.getManifest();

    // Should have fetched twice because cache was cleared
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('clears both manifest and case info cache', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockFetchResponse(MOCK_MANIFEST))
      .mockResolvedValueOnce(mockFetchResponse(MOCK_CASE_INFO))
      .mockResolvedValueOnce(mockFetchResponse(MOCK_MANIFEST))
      .mockResolvedValueOnce(mockFetchResponse(MOCK_CASE_INFO));

    const service = new DemoDataService();
    await service.getCaseInfo('DEMO-001');
    service.clearCache();
    await service.getCaseInfo('DEMO-001');

    // 2 manifest fetches + 2 case-info fetches = 4 total
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });
});

// ============================================================================
// Tests — isAvailable()
// ============================================================================

describe('DemoDataService — isAvailable()', () => {
  it('returns true when manifest is loadable', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockFetchResponse(MOCK_MANIFEST)
    );

    const service = new DemoDataService();
    const available = await service.isAvailable();
    expect(available).toBe(true);
  });

  it('returns false when manifest fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new TypeError('Failed to fetch')
    );

    const service = new DemoDataService();
    const available = await service.isAvailable();
    expect(available).toBe(false);
  });

  it('returns false on HTTP 404', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockFetchResponse(null, false, 404)
    );

    const service = new DemoDataService();
    const available = await service.isAvailable();
    expect(available).toBe(false);
  });
});

// ============================================================================
// Tests — Type contracts
// ============================================================================

describe('DemoDataService — Type Contracts', () => {
  it('DemoCaseSummary has all required fields', () => {
    const summary: DemoCaseSummary = MOCK_MANIFEST.cases[0];
    const requiredKeys: (keyof DemoCaseSummary)[] = [
      'id', 'label', 'difficulty', 'views', 'path',
    ];
    for (const key of requiredKeys) {
      expect(summary).toHaveProperty(key);
    }
  });

  it('DemoPatient has all required fields', () => {
    const patient: DemoPatient = MOCK_CASE_INFO.patient;
    const requiredKeys: (keyof DemoPatient)[] = [
      'mrn', 'firstName', 'lastName', 'dateOfBirth', 'sex',
    ];
    for (const key of requiredKeys) {
      expect(patient).toHaveProperty(key);
    }
  });

  it('DemoImage has all required fields', () => {
    const image: DemoImage = MOCK_CASE_INFO.images[0];
    const requiredKeys: (keyof DemoImage)[] = [
      'filename', 'viewType', 'laterality', 'formats',
    ];
    for (const key of requiredKeys) {
      expect(image).toHaveProperty(key);
    }
  });

  it('difficulty values are constrained', () => {
    const validDifficulties = ['Easy', 'Intermediate', 'Advanced'];
    for (const c of MOCK_MANIFEST.cases) {
      expect(validDifficulties).toContain(c.difficulty);
    }
  });

  it('pathology values are constrained', () => {
    const validPathologies = ['BENIGN', 'MALIGNANT'];
    expect(validPathologies).toContain(MOCK_CASE_INFO.expectedOutcome.pathology);
  });
});
