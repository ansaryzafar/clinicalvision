/**
 * demoDataMapper.ts — Maps DemoCaseInfo to ClinicalVision workflow types.
 *
 * Handles the field name mismatches and type conversions between
 * the demo case JSON schema and the workflow's PatientInfo / ClinicalHistory
 * interfaces.
 *
 * Key conversions:
 *   - DemoPatient.sex → PatientInfo.gender
 *   - DemoClinicalHistory.indication (string) → ClinicalHistory.clinicalIndication (enum-like)
 *   - DemoClinicalHistory.familyHistory (string) → ClinicalHistory.familyHistoryBreastCancer (boolean)
 *   - DemoClinicalHistory.brcaStatus (string) → ClinicalHistory.brca1Positive/brca2Positive (booleans)
 *   - DemoClinicalHistory.priorBiopsies (string) → ClinicalHistory.previousBiopsy (boolean) + biopsyResults
 *   - DemoClinicalHistory.symptoms (string) → ClinicalHistory.symptoms (string[])
 */

import type { PatientInfo, ClinicalHistory } from '../types/case.types';
import type {
  DemoCaseInfo,
  DemoPatient,
  DemoClinicalHistory,
} from '../services/demoDataService';

// Re-export for tests and consumers
export const DEMO_DATA_BASE_PATH = '/demo-data';
const DEMO_DATA_BASE_PATH_VALUE = DEMO_DATA_BASE_PATH;

// ============================================================================
// Image upload spec (for programmatic loading)
// ============================================================================

export interface DemoImageUploadSpec {
  url: string;
  filename: string;
  viewType: 'CC' | 'MLO' | 'SPOT' | 'MAG';
  laterality: 'R' | 'L';
}

// ============================================================================
// Patient mapping
// ============================================================================

/**
 * Map DemoPatient → PatientInfo.
 * Handles: sex→gender, drops middleInitial.
 */
export function mapDemoPatientToPatientInfo(demo: DemoPatient): PatientInfo {
  const validGenders = new Set(['F', 'M', 'O']);
  const gender = validGenders.has(demo.sex) ? (demo.sex as 'F' | 'M' | 'O') : 'F';

  return {
    mrn: demo.mrn,
    firstName: demo.firstName,
    lastName: demo.lastName,
    dateOfBirth: demo.dateOfBirth,
    gender,
  };
}

// ============================================================================
// Clinical history mapping
// ============================================================================

/**
 * Map a free-text indication string to the closest CLINICAL_INDICATION_OPTIONS value.
 */
function mapIndicationToEnum(indication: string): string {
  const lower = indication.toLowerCase();

  // Check follow-up / prior abnormal BEFORE screening (they may contain "screening")
  if (lower.includes('follow') || lower.includes('calcif') || lower.includes('noted on prior')) {
    return 'Follow-up - prior abnormal';
  }
  if (lower.includes('palpable') || lower.includes('mass') || lower.includes('lump')) {
    return 'Diagnostic - palpable mass';
  }
  if (lower.includes('discharge') || lower.includes('nipple')) {
    return 'Diagnostic - nipple discharge';
  }
  if (lower.includes('skin')) {
    return 'Diagnostic - skin changes';
  }
  if (lower.includes('pain')) {
    return 'Diagnostic - pain';
  }
  if (lower.includes('high-risk') || lower.includes('high risk') || lower.includes('brca')) {
    return 'High-risk screening';
  }
  if (lower.includes('screening') || lower.includes('routine')) {
    return 'Screening mammogram';
  }
  if (lower.includes('implant')) {
    return 'Breast implant evaluation';
  }
  return 'Other';
}

/**
 * Parse family history string to boolean — true if mentions cancer.
 */
function parseFamilyHistoryPositive(history: string): boolean {
  const lower = history.toLowerCase();
  return lower.includes('cancer') || lower.includes('brca') || lower.includes('malignant');
}

/**
 * Parse BRCA status string → { brca1: boolean, brca2: boolean }.
 */
function parseBrcaStatus(status: string): { brca1: boolean; brca2: boolean } {
  const lower = status.toLowerCase();
  if (lower.includes('negative') || lower.includes('unknown') || lower === 'none') {
    return { brca1: false, brca2: false };
  }
  return {
    brca1: lower.includes('brca1'),
    brca2: lower.includes('brca2'),
  };
}

/**
 * Check if prior biopsies string indicates an actual biopsy.
 */
function hasPriorBiopsy(priorBiopsies: string | undefined): boolean {
  if (!priorBiopsies) return false;
  const lower = priorBiopsies.toLowerCase().trim();
  return lower !== 'none' && lower !== '' && lower !== 'n/a';
}

/**
 * Check if symptoms string indicates actual symptoms.
 */
function hasActualSymptoms(symptoms: string | undefined): boolean {
  if (!symptoms) return false;
  const lower = symptoms.toLowerCase().trim();
  return (
    lower !== 'none' &&
    lower !== '' &&
    !lower.startsWith('none') &&
    !lower.includes('asymptomatic')
  );
}

/**
 * Check if prior studies suggest comparison imaging is available.
 */
function hasComparisonAvailable(priorStudies: string): boolean {
  const lower = priorStudies.toLowerCase();
  // Exclude phrases that indicate NO prior findings
  if (lower.includes('no prior') || lower.includes('no findings') || lower.includes('none')) {
    return false;
  }
  return (
    lower.includes('prior') ||
    lower.includes('previous') ||
    lower.includes('months ago') ||
    lower.includes('years ago') ||
    lower.includes('bi-rads') ||
    lower.includes('biopsy')
  );
}

/**
 * Map DemoClinicalHistory → ClinicalHistory.
 * Handles all the string→boolean and string→enum conversions.
 */
export function mapDemoClinicalHistoryToClinicalHistory(
  demo: DemoClinicalHistory,
): ClinicalHistory {
  const brca = parseBrcaStatus(demo.brcaStatus);
  const hasBiopsy = hasPriorBiopsy(demo.priorBiopsies);

  // Build additional notes from family history and BRCA details
  const notesParts: string[] = [];
  if (parseFamilyHistoryPositive(demo.familyHistory)) {
    notesParts.push(`Family history: ${demo.familyHistory}`);
  }
  if (brca.brca1 || brca.brca2) {
    notesParts.push(`BRCA status: ${demo.brcaStatus}`);
  }
  if (demo.hormoneTherapy && demo.hormoneTherapy.toLowerCase() !== 'none') {
    notesParts.push(`Hormone therapy: ${demo.hormoneTherapy}`);
  }

  const result: ClinicalHistory = {
    clinicalIndication: mapIndicationToEnum(demo.indication),
    familyHistoryBreastCancer: parseFamilyHistoryPositive(demo.familyHistory),
    personalHistoryBreastCancer: false, // Demo cases don't have personal history
    brca1Positive: brca.brca1,
    brca2Positive: brca.brca2,
    previousBiopsy: hasBiopsy,
    comparisonAvailable: hasComparisonAvailable(demo.priorStudies),
  };

  if (hasBiopsy && demo.priorBiopsies) {
    result.biopsyResults = demo.priorBiopsies;
  }

  if (hasActualSymptoms(demo.symptoms)) {
    result.symptoms = [demo.symptoms];
  }

  if (notesParts.length > 0) {
    result.additionalNotes = notesParts.join('. ');
  }

  return result;
}

// ============================================================================
// Full case mapping
// ============================================================================

export interface CreateCaseInput {
  patient: PatientInfo;
  clinicalHistory: ClinicalHistory;
}

/**
 * Map a full DemoCaseInfo to the data needed to call createCase().
 */
export function mapDemoCaseToCreateCaseInput(demoCase: DemoCaseInfo): CreateCaseInput {
  return {
    patient: mapDemoPatientToPatientInfo(demoCase.patient),
    clinicalHistory: mapDemoClinicalHistoryToClinicalHistory(demoCase.clinicalHistory),
  };
}

// ============================================================================
// Image mapping
// ============================================================================

/**
 * Map demo images to upload specifications with full URLs.
 */
export function mapDemoImagesToUploadSpec(
  demoCase: DemoCaseInfo,
  caseDir: string,
): DemoImageUploadSpec[] {
  return demoCase.images.map((img) => ({
    url: `${DEMO_DATA_BASE_PATH_VALUE}/${caseDir}/png/${img.filename}.png`,
    filename: img.filename,
    viewType: img.viewType,
    laterality: img.laterality,
  }));
}
