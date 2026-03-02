/**
 * DemoDataService — Fetches and caches demo data packages
 *
 * Loads demo clinical cases from the public/demo-data/ directory.
 * Provides typed access to manifest, case info, and image URLs.
 *
 * Design:
 *  - Uses native fetch() for static file access (no Axios needed)
 *  - Caches manifest and case info to avoid redundant network calls
 *  - Throws DemoDataError with descriptive messages on failure
 *  - Stateless aside from cache — safe to instantiate per-component
 */

// ============================================================================
// Types — match the schema from test_demo_data_package.py and prepare_demo_data.py
// ============================================================================

export interface DemoCaseSummary {
  id: string;
  label: string;
  difficulty: 'Easy' | 'Intermediate' | 'Advanced';
  views: number;
  path: string;
}

export interface DemoManifest {
  version: string;
  generatedAt: string;
  description: string;
  totalCases: number;
  totalImages: number;
  formats: string[];
  cases: DemoCaseSummary[];
}

export interface DemoPatient {
  mrn: string;
  firstName: string;
  lastName: string;
  middleInitial?: string;
  dateOfBirth: string;
  sex: string;
}

export interface DemoClinicalHistory {
  indication: string;
  priorStudies: string;
  brcaStatus: string;
  familyHistory: string;
  symptoms: string;
  hormoneTherapy?: string;
  priorBiopsies?: string;
}

export interface DemoExpectedOutcome {
  biRads: string;
  description: string;
  pathology: 'BENIGN' | 'MALIGNANT';
}

export interface DemoImage {
  filename: string;
  viewType: 'CC' | 'MLO' | 'SPOT' | 'MAG';
  laterality: 'R' | 'L';
  formats: string[];
  source?: string;
  originalCaseId?: string;
  metadata?: Record<string, unknown>;
}

export interface DemoCaseInfo {
  caseId: string;
  version: string;
  patient: DemoPatient;
  clinicalHistory: DemoClinicalHistory;
  expectedOutcome: DemoExpectedOutcome;
  images: DemoImage[];
}

// ============================================================================
// Constants
// ============================================================================

export const DEMO_DATA_BASE_PATH = '/demo-data';

// ============================================================================
// Error class
// ============================================================================

export class DemoDataError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'DemoDataError';
  }
}

// ============================================================================
// Service
// ============================================================================

export class DemoDataService {
  private manifestCache: DemoManifest | null = null;
  private caseInfoCache: Map<string, DemoCaseInfo> = new Map();

  /**
   * Fetch the demo data manifest. Cached after first successful load.
   */
  async getManifest(): Promise<DemoManifest> {
    if (this.manifestCache) {
      return this.manifestCache;
    }

    const url = `${DEMO_DATA_BASE_PATH}/manifest.json`;

    let response: Response;
    try {
      response = await fetch(url);
    } catch (err) {
      throw new DemoDataError(
        'Failed to load demo data — network error. Check that demo data files are available.',
        err,
      );
    }

    if (!response.ok) {
      throw new DemoDataError(
        `Failed to load demo data manifest (HTTP ${response.status}). ` +
        `Ensure demo-data/manifest.json is present in the public directory.`,
      );
    }

    let data: DemoManifest;
    try {
      data = await response.json();
    } catch (err) {
      throw new DemoDataError(
        'Demo data manifest is not valid JSON.',
        err,
      );
    }

    this.manifestCache = data;
    return data;
  }

  /**
   * Fetch detailed case info for a specific demo case.
   * Resolves the case path from the manifest first.
   */
  async getCaseInfo(caseId: string): Promise<DemoCaseInfo> {
    if (this.caseInfoCache.has(caseId)) {
      return this.caseInfoCache.get(caseId)!;
    }

    // Load manifest to find the case path
    const manifest = await this.getManifest();
    const caseSummary = manifest.cases.find(c => c.id === caseId);

    if (!caseSummary) {
      throw new DemoDataError(
        `Demo case "${caseId}" not found in manifest. ` +
        `Available cases: ${manifest.cases.map(c => c.id).join(', ')}`,
      );
    }

    // Normalize path: ensure no trailing slash, then append /case-info.json
    const basePath = caseSummary.path.replace(/\/$/, '');
    const url = `${basePath}/case-info.json`;

    let response: Response;
    try {
      response = await fetch(url);
    } catch (err) {
      throw new DemoDataError(
        `Failed to load case info for ${caseId} — network error.`,
        err,
      );
    }

    if (!response.ok) {
      throw new DemoDataError(
        `Failed to load case info for ${caseId} (HTTP ${response.status}).`,
      );
    }

    const data: DemoCaseInfo = await response.json();
    this.caseInfoCache.set(caseId, data);
    return data;
  }

  /**
   * Construct the URL for a demo image file.
   *
   * @param caseDir - The case directory name (e.g., "case-1-normal")
   * @param filename - The image filename without extension (e.g., "DEMO-001_RIGHT_CC")
   * @param format - The file format ("png" or "dcm")
   */
  getDemoImageUrl(caseDir: string, filename: string, format: string): string {
    const formatDir = format === 'dcm' ? 'dicom' : format;
    return `${DEMO_DATA_BASE_PATH}/${caseDir}/${formatDir}/${filename}.${format}`;
  }

  /**
   * Check if demo data is available (manifest loads successfully).
   * Does not throw — returns false on any failure.
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.getManifest();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear all cached data. Forces re-fetch on next access.
   */
  clearCache(): void {
    this.manifestCache = null;
    this.caseInfoCache.clear();
  }
}

// Singleton for convenience (components can also instantiate their own)
export const demoDataService = new DemoDataService();
