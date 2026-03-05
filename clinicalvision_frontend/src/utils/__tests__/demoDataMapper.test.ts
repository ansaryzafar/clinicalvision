/**
 * demoDataMapper.test.ts — TDD tests for mapping DemoCaseInfo → workflow types.
 *
 * Tests the mapping layer that converts demo case JSON schema
 * to the ClinicalVision workflow's PatientInfo and ClinicalHistory
 * types, handling field name mismatches and type conversions.
 */
import {
  mapDemoPatientToPatientInfo,
  mapDemoClinicalHistoryToClinicalHistory,
  mapDemoCaseToCreateCaseInput,
  mapDemoImagesToUploadSpec,
  DEMO_DATA_BASE_PATH,
} from '../../utils/demoDataMapper';
import type { DemoCaseInfo, DemoPatient, DemoClinicalHistory } from '../../services/demoDataService';

// ============================================================================
// Test Fixtures
// ============================================================================

const DEMO_PATIENT_NORMAL: DemoPatient = {
  mrn: 'DEMO-001',
  firstName: 'Jane',
  lastName: 'Thompson',
  middleInitial: 'A',
  dateOfBirth: '1968-03-15',
  sex: 'F',
};

const DEMO_PATIENT_SUSPICIOUS: DemoPatient = {
  mrn: 'DEMO-002',
  firstName: 'Maria',
  lastName: 'Chen',
  middleInitial: 'R',
  dateOfBirth: '1975-09-22',
  sex: 'F',
};

const DEMO_CLINICAL_HISTORY_NORMAL: DemoClinicalHistory = {
  indication: 'Routine annual screening mammography',
  priorStudies: 'Annual screening — no prior findings',
  brcaStatus: 'Negative',
  familyHistory: 'No significant family history',
  symptoms: 'None — asymptomatic screening',
  hormoneTherapy: 'None',
  priorBiopsies: 'None',
};

const DEMO_CLINICAL_HISTORY_SUSPICIOUS: DemoClinicalHistory = {
  indication: 'Palpable mass, right breast, 2 o\'clock position',
  priorStudies: 'Previous benign biopsy (2023)',
  brcaStatus: 'Unknown',
  familyHistory: 'Mother — breast cancer at age 52',
  symptoms: 'Palpable lump in right breast, no nipple discharge',
  hormoneTherapy: 'None',
  priorBiopsies: 'Right breast, benign fibroadenoma (2023)',
};

const DEMO_CLINICAL_HISTORY_CALC: DemoClinicalHistory = {
  indication: 'Calcifications noted on prior screening',
  priorStudies: 'Screening 6 months ago — BI-RADS 3',
  brcaStatus: 'Positive (BRCA1)',
  familyHistory: 'Sister — breast cancer at age 45, maternal aunt — ovarian cancer',
  symptoms: 'No palpable mass — calcifications on imaging only',
  hormoneTherapy: 'None',
  priorBiopsies: 'None',
};

const FULL_DEMO_CASE: DemoCaseInfo = {
  caseId: 'DEMO-001',
  version: '2.0.0',
  patient: DEMO_PATIENT_NORMAL,
  clinicalHistory: DEMO_CLINICAL_HISTORY_NORMAL,
  expectedOutcome: {
    biRads: '1 or 2',
    description: 'Normal/Benign — no suspicious findings expected',
    pathology: 'BENIGN',
  },
  images: [
    { filename: 'DEMO-001_RIGHT_CC', viewType: 'CC', laterality: 'R', formats: ['png'], source: 'CBIS-DDSM' },
    { filename: 'DEMO-001_RIGHT_MLO', viewType: 'MLO', laterality: 'R', formats: ['png'], source: 'CBIS-DDSM' },
    { filename: 'DEMO-001_LEFT_CC', viewType: 'CC', laterality: 'L', formats: ['png'], source: 'CBIS-DDSM' },
    { filename: 'DEMO-001_LEFT_MLO', viewType: 'MLO', laterality: 'L', formats: ['png'], source: 'CBIS-DDSM' },
  ],
};

// ============================================================================
// Patient Mapping Tests
// ============================================================================

describe('mapDemoPatientToPatientInfo', () => {
  it('maps mrn correctly', () => {
    const result = mapDemoPatientToPatientInfo(DEMO_PATIENT_NORMAL);
    expect(result.mrn).toBe('DEMO-001');
  });

  it('maps firstName and lastName', () => {
    const result = mapDemoPatientToPatientInfo(DEMO_PATIENT_NORMAL);
    expect(result.firstName).toBe('Jane');
    expect(result.lastName).toBe('Thompson');
  });

  it('maps dateOfBirth', () => {
    const result = mapDemoPatientToPatientInfo(DEMO_PATIENT_NORMAL);
    expect(result.dateOfBirth).toBe('1968-03-15');
  });

  it('maps sex to gender field', () => {
    // Demo uses "sex", workflow uses "gender"
    const result = mapDemoPatientToPatientInfo(DEMO_PATIENT_NORMAL);
    expect(result.gender).toBe('F');
  });

  it('handles all valid gender values', () => {
    expect(mapDemoPatientToPatientInfo({ ...DEMO_PATIENT_NORMAL, sex: 'M' }).gender).toBe('M');
    expect(mapDemoPatientToPatientInfo({ ...DEMO_PATIENT_NORMAL, sex: 'F' }).gender).toBe('F');
  });

  it('defaults to F for unknown sex values', () => {
    const result = mapDemoPatientToPatientInfo({ ...DEMO_PATIENT_NORMAL, sex: 'X' });
    expect(result.gender).toBe('F');
  });

  it('does not include middleInitial (not in PatientInfo)', () => {
    const result = mapDemoPatientToPatientInfo(DEMO_PATIENT_NORMAL);
    expect(result).not.toHaveProperty('middleInitial');
  });

  it('produces a valid PatientInfo shape', () => {
    const result = mapDemoPatientToPatientInfo(DEMO_PATIENT_SUSPICIOUS);
    expect(result).toEqual({
      mrn: 'DEMO-002',
      firstName: 'Maria',
      lastName: 'Chen',
      dateOfBirth: '1975-09-22',
      gender: 'F',
    });
  });
});

// ============================================================================
// Clinical History Mapping Tests
// ============================================================================

describe('mapDemoClinicalHistoryToClinicalHistory', () => {
  describe('clinicalIndication mapping', () => {
    it('maps screening indication to "Screening mammogram"', () => {
      const result = mapDemoClinicalHistoryToClinicalHistory(DEMO_CLINICAL_HISTORY_NORMAL);
      expect(result.clinicalIndication).toBe('Screening mammogram');
    });

    it('maps palpable mass to "Diagnostic - palpable mass"', () => {
      const result = mapDemoClinicalHistoryToClinicalHistory(DEMO_CLINICAL_HISTORY_SUSPICIOUS);
      expect(result.clinicalIndication).toBe('Diagnostic - palpable mass');
    });

    it('maps calcification follow-up to "Follow-up - prior abnormal"', () => {
      const result = mapDemoClinicalHistoryToClinicalHistory(DEMO_CLINICAL_HISTORY_CALC);
      expect(result.clinicalIndication).toBe('Follow-up - prior abnormal');
    });
  });

  describe('familyHistoryBreastCancer mapping', () => {
    it('is false for "No significant family history"', () => {
      const result = mapDemoClinicalHistoryToClinicalHistory(DEMO_CLINICAL_HISTORY_NORMAL);
      expect(result.familyHistoryBreastCancer).toBe(false);
    });

    it('is true when family history mentions breast cancer', () => {
      const result = mapDemoClinicalHistoryToClinicalHistory(DEMO_CLINICAL_HISTORY_SUSPICIOUS);
      expect(result.familyHistoryBreastCancer).toBe(true);
    });

    it('is true when family history mentions ovarian cancer', () => {
      const result = mapDemoClinicalHistoryToClinicalHistory(DEMO_CLINICAL_HISTORY_CALC);
      expect(result.familyHistoryBreastCancer).toBe(true);
    });
  });

  describe('personalHistoryBreastCancer mapping', () => {
    it('is false when no prior malignancy mentioned', () => {
      const result = mapDemoClinicalHistoryToClinicalHistory(DEMO_CLINICAL_HISTORY_NORMAL);
      expect(result.personalHistoryBreastCancer).toBe(false);
    });
  });

  describe('BRCA status mapping', () => {
    it('both false for Negative brca', () => {
      const result = mapDemoClinicalHistoryToClinicalHistory(DEMO_CLINICAL_HISTORY_NORMAL);
      expect(result.brca1Positive).toBe(false);
      expect(result.brca2Positive).toBe(false);
    });

    it('brca1Positive true for "Positive (BRCA1)"', () => {
      const result = mapDemoClinicalHistoryToClinicalHistory(DEMO_CLINICAL_HISTORY_CALC);
      expect(result.brca1Positive).toBe(true);
      expect(result.brca2Positive).toBe(false);
    });

    it('both false for "Unknown"', () => {
      const result = mapDemoClinicalHistoryToClinicalHistory(DEMO_CLINICAL_HISTORY_SUSPICIOUS);
      expect(result.brca1Positive).toBe(false);
      expect(result.brca2Positive).toBe(false);
    });
  });

  describe('previousBiopsy mapping', () => {
    it('is false when priorBiopsies is "None"', () => {
      const result = mapDemoClinicalHistoryToClinicalHistory(DEMO_CLINICAL_HISTORY_NORMAL);
      expect(result.previousBiopsy).toBe(false);
      expect(result.biopsyResults).toBeUndefined();
    });

    it('is true when priorBiopsies has content', () => {
      const result = mapDemoClinicalHistoryToClinicalHistory(DEMO_CLINICAL_HISTORY_SUSPICIOUS);
      expect(result.previousBiopsy).toBe(true);
      expect(result.biopsyResults).toBe('Right breast, benign fibroadenoma (2023)');
    });
  });

  describe('symptoms mapping', () => {
    it('is undefined for asymptomatic screening', () => {
      const result = mapDemoClinicalHistoryToClinicalHistory(DEMO_CLINICAL_HISTORY_NORMAL);
      expect(result.symptoms).toBeUndefined();
    });

    it('maps non-"None" symptoms to array', () => {
      const result = mapDemoClinicalHistoryToClinicalHistory(DEMO_CLINICAL_HISTORY_SUSPICIOUS);
      expect(result.symptoms).toEqual(['Palpable lump in right breast, no nipple discharge']);
    });
  });

  describe('comparisonAvailable mapping', () => {
    it('is false for no prior studies', () => {
      const result = mapDemoClinicalHistoryToClinicalHistory(DEMO_CLINICAL_HISTORY_NORMAL);
      expect(result.comparisonAvailable).toBe(false);
    });

    it('is true when prior mammogram/screening exists', () => {
      const result = mapDemoClinicalHistoryToClinicalHistory(DEMO_CLINICAL_HISTORY_CALC);
      expect(result.comparisonAvailable).toBe(true);
    });
  });

  describe('additionalNotes', () => {
    it('includes family history detail when positive', () => {
      const result = mapDemoClinicalHistoryToClinicalHistory(DEMO_CLINICAL_HISTORY_CALC);
      expect(result.additionalNotes).toContain('Sister');
      expect(result.additionalNotes).toContain('BRCA1');
    });
  });
});

// ============================================================================
// Full Case Mapping Tests
// ============================================================================

describe('mapDemoCaseToCreateCaseInput', () => {
  it('returns patient and clinicalHistory', () => {
    const result = mapDemoCaseToCreateCaseInput(FULL_DEMO_CASE);
    expect(result).toHaveProperty('patient');
    expect(result).toHaveProperty('clinicalHistory');
  });

  it('patient has all required fields', () => {
    const { patient } = mapDemoCaseToCreateCaseInput(FULL_DEMO_CASE);
    expect(patient.mrn).toBe('DEMO-001');
    expect(patient.firstName).toBe('Jane');
    expect(patient.lastName).toBe('Thompson');
    expect(patient.dateOfBirth).toBe('1968-03-15');
    expect(patient.gender).toBe('F');
  });

  it('clinicalHistory has required fields', () => {
    const { clinicalHistory } = mapDemoCaseToCreateCaseInput(FULL_DEMO_CASE);
    expect(clinicalHistory.clinicalIndication).toBeTruthy();
    expect(typeof clinicalHistory.familyHistoryBreastCancer).toBe('boolean');
    expect(typeof clinicalHistory.personalHistoryBreastCancer).toBe('boolean');
    expect(typeof clinicalHistory.previousBiopsy).toBe('boolean');
    expect(typeof clinicalHistory.comparisonAvailable).toBe('boolean');
  });
});

// ============================================================================
// Image URL Mapping Tests
// ============================================================================

describe('mapDemoImagesToUploadSpec', () => {
  it('returns correct number of image specs', () => {
    const result = mapDemoImagesToUploadSpec(FULL_DEMO_CASE, 'case-1-normal');
    expect(result).toHaveLength(4);
  });

  it('each spec has url, filename, viewType, laterality', () => {
    const result = mapDemoImagesToUploadSpec(FULL_DEMO_CASE, 'case-1-normal');
    for (const spec of result) {
      expect(spec).toHaveProperty('url');
      expect(spec).toHaveProperty('filename');
      expect(spec).toHaveProperty('viewType');
      expect(spec).toHaveProperty('laterality');
    }
  });

  it('constructs correct URL path', () => {
    const result = mapDemoImagesToUploadSpec(FULL_DEMO_CASE, 'case-1-normal');
    expect(result[0].url).toBe(`${DEMO_DATA_BASE_PATH}/case-1-normal/png/DEMO-001_RIGHT_CC.png`);
  });

  it('preserves view type and laterality', () => {
    const result = mapDemoImagesToUploadSpec(FULL_DEMO_CASE, 'case-1-normal');
    const rcc = result.find(s => s.filename === 'DEMO-001_RIGHT_CC');
    expect(rcc?.viewType).toBe('CC');
    expect(rcc?.laterality).toBe('R');
  });
});
