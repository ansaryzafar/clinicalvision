/**
 * Report Operations Test Suite
 * 
 * Phase 6: Reporting System
 * 
 * Tests report generation functionality:
 * - BI-RADS assessment validation
 * - Report content generation
 * - Recommendation computation
 * - Report finalization
 * - Digital signature handling
 */

import {
  BiRadsAssessment,
  BreastAssessment,
  BreastComposition,
  BiRadsCategory,
  BiRadsValues,
  ClinicalCase,
  PatientInfo,
  ClinicalHistory,
  WorkflowState,
  ClinicalWorkflowStep,
  ConsolidatedFinding,
  FindingType,
  Laterality,
  GeneratedReport,
  ReportStatus,
  EMPTY_PATIENT_INFO,
  EMPTY_CLINICAL_HISTORY,
} from '../../types/case.types';

import {
  validateBiRadsAssessment,
  createDefaultAssessment,
  updateBreastAssessment,
  calculateOverallCategory,
  generateRecommendation,
  generateImpression,
  generateReportContent,
  validateReportForFinalization,
  createGeneratedReport,
  canGenerateReport,
  finalizeReport,
  signReport,
  getBiRadsRiskPercentage,
  requiresBiopsy,
  getFollowUpInterval,
  formatReportSection,
  ReportValidationResult,
  ReportGenerationOptions,
} from '../reportOperations';

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

const createMockPatientInfo = (overrides?: Partial<PatientInfo>): PatientInfo => ({
  mrn: 'MRN-001',
  firstName: 'Jane',
  lastName: 'Doe',
  dateOfBirth: '1970-05-15',
  gender: 'F',
  ...overrides,
});

const createMockClinicalHistory = (overrides?: Partial<ClinicalHistory>): ClinicalHistory => ({
  familyHistoryBreastCancer: false,
  personalHistoryBreastCancer: false,
  previousBiopsy: false,
  clinicalIndication: 'Screening mammogram',
  comparisonAvailable: true,
  ...overrides,
});

const createMockBreastAssessment = (
  overrides?: Partial<BreastAssessment>
): BreastAssessment => ({
  composition: BreastComposition.B,
  biRadsCategory: BiRadsValues.NEGATIVE,
  ...overrides,
});

const createMockBiRadsAssessment = (
  overrides?: Partial<BiRadsAssessment>
): BiRadsAssessment => ({
  rightBreast: createMockBreastAssessment(),
  leftBreast: createMockBreastAssessment(),
  overallCategory: BiRadsValues.NEGATIVE,
  impression: 'Negative bilateral mammogram.',
  recommendation: 'Continue routine annual screening.',
  comparedWithPrior: true,
  ...overrides,
});

const createMockWorkflowState = (
  overrides?: Partial<WorkflowState>
): WorkflowState => ({
  currentStep: ClinicalWorkflowStep.REPORT_GENERATION,
  completedSteps: [
    ClinicalWorkflowStep.PATIENT_REGISTRATION,
    ClinicalWorkflowStep.CLINICAL_HISTORY,
    ClinicalWorkflowStep.IMAGE_UPLOAD,
    ClinicalWorkflowStep.IMAGE_VERIFICATION,
    ClinicalWorkflowStep.BATCH_AI_ANALYSIS,
    ClinicalWorkflowStep.FINDINGS_REVIEW,
    ClinicalWorkflowStep.BIRADS_ASSESSMENT,
  ],
  status: 'in_progress',
  startedAt: '2026-02-21T10:00:00Z',
  lastModifiedAt: '2026-02-21T11:00:00Z',
  isLocked: false,
  ...overrides,
});

const createMockConsolidatedFinding = (
  overrides?: Partial<ConsolidatedFinding>
): ConsolidatedFinding => ({
  id: 'finding-001',
  laterality: Laterality.RIGHT,
  findingType: FindingType.MASS,
  visibleInViews: ['img-rcc', 'img-rmlo'],
  aiCorrelatedRegions: ['region-001'],
  createdAt: '2026-02-21T10:30:00Z',
  updatedAt: '2026-02-21T10:30:00Z',
  ...overrides,
});

const createMockClinicalCase = (
  overrides?: Partial<ClinicalCase>
): ClinicalCase => ({
  id: 'case-001',
  caseNumber: 'CV-2026-000001',
  patient: createMockPatientInfo(),
  clinicalHistory: createMockClinicalHistory(),
  images: [
    // Default with at least one image to pass validation
    {
      id: 'img-001',
      filename: 'RCC.dcm',
      fileSize: 1024000,
      mimeType: 'application/dicom',
      localUrl: 'blob:http://localhost/img1',
      viewType: 'CC' as any,
      laterality: 'R' as any,
      uploadStatus: 'uploaded' as any,
    },
  ],
  analysisResults: [],
  consolidatedFindings: [],
  workflow: createMockWorkflowState(),
  audit: {
    createdBy: 'radiologist-001',
    createdAt: '2026-02-21T10:00:00Z',
    modifications: [],
  },
  ...overrides,
});

// ============================================================================
// VALIDATION TESTS
// ============================================================================

describe('BiRads Assessment Validation', () => {
  describe('validateBiRadsAssessment', () => {
    it('should return valid for complete assessment', () => {
      const assessment = createMockBiRadsAssessment();
      const result = validateBiRadsAssessment(assessment);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require impression text', () => {
      const assessment = createMockBiRadsAssessment({ impression: '' });
      const result = validateBiRadsAssessment(assessment);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'impression' })
      );
    });

    it('should require recommendation text', () => {
      const assessment = createMockBiRadsAssessment({ recommendation: '' });
      const result = validateBiRadsAssessment(assessment);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'recommendation' })
      );
    });

    it('should require breast composition for each breast', () => {
      const assessment = createMockBiRadsAssessment({
        rightBreast: { ...createMockBreastAssessment(), composition: '' as BreastComposition },
      });
      const result = validateBiRadsAssessment(assessment);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'rightBreast.composition' })
      );
    });

    it('should require BI-RADS category for each breast', () => {
      const assessment = createMockBiRadsAssessment({
        leftBreast: { ...createMockBreastAssessment(), biRadsCategory: '' as BiRadsCategory },
      });
      const result = validateBiRadsAssessment(assessment);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'leftBreast.biRadsCategory' })
      );
    });

    it('should require overall category', () => {
      const assessment = createMockBiRadsAssessment({
        overallCategory: '' as BiRadsCategory,
      });
      const result = validateBiRadsAssessment(assessment);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'overallCategory' })
      );
    });

    it('should warn if overall category is lower than individual breast categories', () => {
      const assessment = createMockBiRadsAssessment({
        rightBreast: createMockBreastAssessment({ biRadsCategory: BiRadsValues.SUSPICIOUS_LOW }),
        overallCategory: BiRadsValues.NEGATIVE,
      });
      const result = validateBiRadsAssessment(assessment);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => /overall.*category/i.test(w))).toBe(true);
    });

    it('should require follow-up interval for BI-RADS 3', () => {
      const assessment = createMockBiRadsAssessment({
        rightBreast: createMockBreastAssessment({ biRadsCategory: BiRadsValues.PROBABLY_BENIGN }),
        overallCategory: BiRadsValues.PROBABLY_BENIGN,
        followUpInterval: undefined,
      });
      const result = validateBiRadsAssessment(assessment);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => /follow-up.*interval/i.test(w))).toBe(true);
    });
  });
});

// ============================================================================
// DEFAULT ASSESSMENT CREATION TESTS
// ============================================================================

describe('Default Assessment Creation', () => {
  describe('createDefaultAssessment', () => {
    it('should create assessment with default values', () => {
      const assessment = createDefaultAssessment();
      
      expect(assessment.rightBreast.composition).toBe(BreastComposition.B);
      expect(assessment.leftBreast.composition).toBe(BreastComposition.B);
      expect(assessment.rightBreast.biRadsCategory).toBe(BiRadsValues.INCOMPLETE);
      expect(assessment.leftBreast.biRadsCategory).toBe(BiRadsValues.INCOMPLETE);
      expect(assessment.overallCategory).toBe(BiRadsValues.INCOMPLETE);
      expect(assessment.impression).toBe('');
      expect(assessment.recommendation).toBe('');
      expect(assessment.comparedWithPrior).toBe(false);
    });

    it('should create assessment from suggested BI-RADS', () => {
      const assessment = createDefaultAssessment(BiRadsValues.NEGATIVE);
      
      expect(assessment.overallCategory).toBe(BiRadsValues.NEGATIVE);
      expect(assessment.rightBreast.biRadsCategory).toBe(BiRadsValues.NEGATIVE);
      expect(assessment.leftBreast.biRadsCategory).toBe(BiRadsValues.NEGATIVE);
    });
  });

  describe('updateBreastAssessment', () => {
    it('should update right breast assessment', () => {
      const assessment = createMockBiRadsAssessment();
      const updated = updateBreastAssessment(assessment, 'right', {
        biRadsCategory: BiRadsValues.PROBABLY_BENIGN,
      });
      
      expect(updated.rightBreast.biRadsCategory).toBe(BiRadsValues.PROBABLY_BENIGN);
      expect(updated.leftBreast.biRadsCategory).toBe(assessment.leftBreast.biRadsCategory);
    });

    it('should update left breast assessment', () => {
      const assessment = createMockBiRadsAssessment();
      const updated = updateBreastAssessment(assessment, 'left', {
        composition: BreastComposition.C,
      });
      
      expect(updated.leftBreast.composition).toBe(BreastComposition.C);
      expect(updated.rightBreast.composition).toBe(assessment.rightBreast.composition);
    });

    it('should auto-update overall category when breast changes', () => {
      const assessment = createMockBiRadsAssessment({
        rightBreast: createMockBreastAssessment({ biRadsCategory: BiRadsValues.NEGATIVE }),
        leftBreast: createMockBreastAssessment({ biRadsCategory: BiRadsValues.NEGATIVE }),
        overallCategory: BiRadsValues.NEGATIVE,
      });
      
      const updated = updateBreastAssessment(assessment, 'right', {
        biRadsCategory: BiRadsValues.SUSPICIOUS_MODERATE,
      });
      
      expect(updated.overallCategory).toBe(BiRadsValues.SUSPICIOUS_MODERATE);
    });
  });
});

// ============================================================================
// OVERALL CATEGORY CALCULATION TESTS
// ============================================================================

describe('Overall Category Calculation', () => {
  describe('calculateOverallCategory', () => {
    it('should return the higher of two categories', () => {
      expect(calculateOverallCategory(BiRadsValues.NEGATIVE, BiRadsValues.BENIGN))
        .toBe(BiRadsValues.BENIGN);
    });

    it('should handle 4A/4B/4C subcategories correctly', () => {
      expect(calculateOverallCategory(BiRadsValues.SUSPICIOUS_LOW, BiRadsValues.SUSPICIOUS_HIGH))
        .toBe(BiRadsValues.SUSPICIOUS_HIGH);
    });

    it('should return BI-RADS 0 if either breast is incomplete', () => {
      expect(calculateOverallCategory(BiRadsValues.INCOMPLETE, BiRadsValues.NEGATIVE))
        .toBe(BiRadsValues.INCOMPLETE);
      expect(calculateOverallCategory(BiRadsValues.HIGHLY_SUGGESTIVE, BiRadsValues.INCOMPLETE))
        .toBe(BiRadsValues.INCOMPLETE);
    });

    it('should handle same categories', () => {
      expect(calculateOverallCategory(BiRadsValues.PROBABLY_BENIGN, BiRadsValues.PROBABLY_BENIGN))
        .toBe(BiRadsValues.PROBABLY_BENIGN);
    });

    it('should prioritize higher-risk categories', () => {
      const cases: [BiRadsCategory, BiRadsCategory, BiRadsCategory][] = [
        [BiRadsValues.NEGATIVE, BiRadsValues.HIGHLY_SUGGESTIVE, BiRadsValues.HIGHLY_SUGGESTIVE],
        [BiRadsValues.BENIGN, BiRadsValues.SUSPICIOUS_LOW, BiRadsValues.SUSPICIOUS_LOW],
        [BiRadsValues.PROBABLY_BENIGN, BiRadsValues.SUSPICIOUS_MODERATE, BiRadsValues.SUSPICIOUS_MODERATE],
      ];
      
      cases.forEach(([right, left, expected]) => {
        expect(calculateOverallCategory(right, left)).toBe(expected);
      });
    });
  });
});

// ============================================================================
// RECOMMENDATION GENERATION TESTS
// ============================================================================

describe('Recommendation Generation', () => {
  describe('generateRecommendation', () => {
    it('should generate routine screening for BI-RADS 1', () => {
      const recommendation = generateRecommendation(BiRadsValues.NEGATIVE);
      expect(recommendation).toMatch(/routine.*screening/i);
    });

    it('should generate routine screening for BI-RADS 2', () => {
      const recommendation = generateRecommendation(BiRadsValues.BENIGN);
      expect(recommendation).toMatch(/routine.*screening/i);
    });

    it('should recommend short-term follow-up for BI-RADS 3', () => {
      const recommendation = generateRecommendation(BiRadsValues.PROBABLY_BENIGN);
      expect(recommendation).toMatch(/6.*month|short.*term.*follow/i);
    });

    it('should recommend biopsy for BI-RADS 4 categories', () => {
      expect(generateRecommendation(BiRadsValues.SUSPICIOUS_LOW)).toMatch(/biopsy/i);
      expect(generateRecommendation(BiRadsValues.SUSPICIOUS_MODERATE)).toMatch(/biopsy/i);
      expect(generateRecommendation(BiRadsValues.SUSPICIOUS_HIGH)).toMatch(/biopsy/i);
    });

    it('should recommend tissue diagnosis for BI-RADS 5', () => {
      const recommendation = generateRecommendation(BiRadsValues.HIGHLY_SUGGESTIVE);
      expect(recommendation).toMatch(/tissue.*diagnosis|biopsy/i);
    });

    it('should recommend additional imaging for BI-RADS 0', () => {
      const recommendation = generateRecommendation(BiRadsValues.INCOMPLETE);
      expect(recommendation).toMatch(/additional.*imaging/i);
    });

    it('should reference treatment for BI-RADS 6', () => {
      const recommendation = generateRecommendation(BiRadsValues.KNOWN_MALIGNANCY);
      expect(recommendation).toMatch(/treatment|oncolog/i);
    });
  });

  describe('getFollowUpInterval', () => {
    it('should return 12 months for BI-RADS 1-2', () => {
      expect(getFollowUpInterval(BiRadsValues.NEGATIVE)).toBe('12 months');
      expect(getFollowUpInterval(BiRadsValues.BENIGN)).toBe('12 months');
    });

    it('should return 6 months for BI-RADS 3', () => {
      expect(getFollowUpInterval(BiRadsValues.PROBABLY_BENIGN)).toBe('6 months');
    });

    it('should return null for BI-RADS 4-6 (biopsy required)', () => {
      expect(getFollowUpInterval(BiRadsValues.SUSPICIOUS_LOW)).toBeNull();
      expect(getFollowUpInterval(BiRadsValues.HIGHLY_SUGGESTIVE)).toBeNull();
      expect(getFollowUpInterval(BiRadsValues.KNOWN_MALIGNANCY)).toBeNull();
    });

    it('should return null for BI-RADS 0 (needs more imaging)', () => {
      expect(getFollowUpInterval(BiRadsValues.INCOMPLETE)).toBeNull();
    });
  });
});

// ============================================================================
// IMPRESSION GENERATION TESTS
// ============================================================================

describe('Impression Generation', () => {
  describe('generateImpression', () => {
    it('should generate impression with BI-RADS category', () => {
      const assessment = createMockBiRadsAssessment({
        overallCategory: BiRadsValues.NEGATIVE,
      });
      const impression = generateImpression(assessment);
      
      expect(impression).toMatch(/BI-RADS.*1|negative/i);
    });

    it('should mention both breasts if categories differ', () => {
      const assessment = createMockBiRadsAssessment({
        rightBreast: createMockBreastAssessment({ biRadsCategory: BiRadsValues.NEGATIVE }),
        leftBreast: createMockBreastAssessment({ biRadsCategory: BiRadsValues.PROBABLY_BENIGN }),
      });
      const impression = generateImpression(assessment);
      
      expect(impression).toMatch(/right.*breast|left.*breast/i);
    });

    it('should include breast density information', () => {
      const assessment = createMockBiRadsAssessment({
        rightBreast: createMockBreastAssessment({ composition: BreastComposition.D }),
        leftBreast: createMockBreastAssessment({ composition: BreastComposition.D }),
      });
      const impression = generateImpression(assessment);
      
      expect(impression).toMatch(/dense|density/i);
    });

    it('should mention comparison with prior when available', () => {
      const assessment = createMockBiRadsAssessment({
        comparedWithPrior: true,
        priorStudyDate: '2025-02-21',
      });
      const impression = generateImpression(assessment);
      
      expect(impression).toMatch(/compar|prior/i);
    });

    it('should include findings if present', () => {
      const assessment = createMockBiRadsAssessment({
        rightBreast: createMockBreastAssessment({ 
          findings: 'Small benign-appearing calcifications' 
        }),
      });
      const impression = generateImpression(assessment);
      
      expect(impression).toMatch(/calcification/i);
    });
  });
});

// ============================================================================
// RISK UTILITY TESTS
// ============================================================================

describe('Risk Utilities', () => {
  describe('getBiRadsRiskPercentage', () => {
    it('should return 0 for BI-RADS 1-2', () => {
      expect(getBiRadsRiskPercentage(BiRadsValues.NEGATIVE)).toBe(0);
      expect(getBiRadsRiskPercentage(BiRadsValues.BENIGN)).toBe(0);
    });

    it('should return appropriate ranges for BI-RADS 4 subcategories', () => {
      expect(getBiRadsRiskPercentage(BiRadsValues.SUSPICIOUS_LOW)).toBeGreaterThan(2);
      expect(getBiRadsRiskPercentage(BiRadsValues.SUSPICIOUS_LOW)).toBeLessThanOrEqual(10);
      
      expect(getBiRadsRiskPercentage(BiRadsValues.SUSPICIOUS_MODERATE)).toBeGreaterThan(10);
      expect(getBiRadsRiskPercentage(BiRadsValues.SUSPICIOUS_MODERATE)).toBeLessThanOrEqual(50);
      
      expect(getBiRadsRiskPercentage(BiRadsValues.SUSPICIOUS_HIGH)).toBeGreaterThan(50);
      expect(getBiRadsRiskPercentage(BiRadsValues.SUSPICIOUS_HIGH)).toBeLessThanOrEqual(95);
    });

    it('should return >95 for BI-RADS 5', () => {
      expect(getBiRadsRiskPercentage(BiRadsValues.HIGHLY_SUGGESTIVE)).toBeGreaterThan(95);
    });

    it('should return 100 for BI-RADS 6', () => {
      expect(getBiRadsRiskPercentage(BiRadsValues.KNOWN_MALIGNANCY)).toBe(100);
    });
  });

  describe('requiresBiopsy', () => {
    it('should return false for BI-RADS 0-3', () => {
      expect(requiresBiopsy(BiRadsValues.INCOMPLETE)).toBe(false);
      expect(requiresBiopsy(BiRadsValues.NEGATIVE)).toBe(false);
      expect(requiresBiopsy(BiRadsValues.BENIGN)).toBe(false);
      expect(requiresBiopsy(BiRadsValues.PROBABLY_BENIGN)).toBe(false);
    });

    it('should return true for BI-RADS 4-5', () => {
      expect(requiresBiopsy(BiRadsValues.SUSPICIOUS_LOW)).toBe(true);
      expect(requiresBiopsy(BiRadsValues.SUSPICIOUS_MODERATE)).toBe(true);
      expect(requiresBiopsy(BiRadsValues.SUSPICIOUS_HIGH)).toBe(true);
      expect(requiresBiopsy(BiRadsValues.HIGHLY_SUGGESTIVE)).toBe(true);
    });

    it('should return false for BI-RADS 6 (already biopsied)', () => {
      expect(requiresBiopsy(BiRadsValues.KNOWN_MALIGNANCY)).toBe(false);
    });
  });
});

// ============================================================================
// REPORT CONTENT GENERATION TESTS
// ============================================================================

describe('Report Content Generation', () => {
  describe('generateReportContent', () => {
    it('should generate all required sections', () => {
      const clinicalCase = createMockClinicalCase({
        assessment: createMockBiRadsAssessment(),
      });
      
      const content = generateReportContent(clinicalCase);
      
      expect(content.header).toBeTruthy();
      expect(content.clinicalHistory).toBeTruthy();
      expect(content.technique).toBeTruthy();
      expect(content.findings).toBeTruthy();
      expect(content.impression).toBeTruthy();
      expect(content.recommendation).toBeTruthy();
    });

    it('should include patient information in header', () => {
      const clinicalCase = createMockClinicalCase({
        patient: createMockPatientInfo({ 
          firstName: 'Jane', 
          lastName: 'Smith',
          mrn: 'MRN-12345',
        }),
      });
      
      const content = generateReportContent(clinicalCase);
      
      expect(content.header).toMatch(/Jane/);
      expect(content.header).toMatch(/Smith/);
      expect(content.header).toMatch(/MRN-12345/);
    });

    it('should include clinical history', () => {
      const clinicalCase = createMockClinicalCase({
        clinicalHistory: createMockClinicalHistory({
          familyHistoryBreastCancer: true,
          clinicalIndication: 'High-risk screening',
        }),
      });
      
      const content = generateReportContent(clinicalCase);
      
      expect(content.clinicalHistory).toMatch(/family.*history|history.*breast.*cancer/i);
      expect(content.clinicalHistory).toMatch(/high.*risk/i);
    });

    it('should include technique section with modality', () => {
      const content = generateReportContent(createMockClinicalCase());
      expect(content.technique).toMatch(/mammogra|digital/i);
    });

    it('should include comparison when available', () => {
      const clinicalCase = createMockClinicalCase({
        clinicalHistory: createMockClinicalHistory({
          comparisonAvailable: true,
          priorMammogramDate: '2025-02-21',
        }),
      });
      
      const content = generateReportContent(clinicalCase);
      expect(content.comparison).toMatch(/2025|prior/i);
    });

    it('should state no comparison when not available', () => {
      const clinicalCase = createMockClinicalCase({
        clinicalHistory: createMockClinicalHistory({
          comparisonAvailable: false,
        }),
      });
      
      const content = generateReportContent(clinicalCase);
      expect(content.comparison).toMatch(/no.*comparison|not.*available/i);
    });

    it('should format findings from consolidated findings', () => {
      const clinicalCase = createMockClinicalCase({
        consolidatedFindings: [
          createMockConsolidatedFinding({
            laterality: Laterality.RIGHT,
            findingType: FindingType.MASS,
            clockPosition: 10,
          }),
        ],
      });
      
      const content = generateReportContent(clinicalCase);
      expect(content.findings).toMatch(/right.*breast|mass|10.*o'clock/i);
    });

    it('should include impression from assessment', () => {
      const clinicalCase = createMockClinicalCase({
        assessment: createMockBiRadsAssessment({
          impression: 'No mammographic evidence of malignancy.',
        }),
      });
      
      const content = generateReportContent(clinicalCase);
      expect(content.impression).toMatch(/malignancy/i);
    });

    it('should include recommendation from assessment', () => {
      const clinicalCase = createMockClinicalCase({
        assessment: createMockBiRadsAssessment({
          recommendation: 'Continue routine annual screening.',
        }),
      });
      
      const content = generateReportContent(clinicalCase);
      expect(content.recommendation).toMatch(/routine.*screening/i);
    });
  });

  describe('formatReportSection', () => {
    it('should format section with label', () => {
      const formatted = formatReportSection('FINDINGS', 'No suspicious findings.');
      expect(formatted).toContain('FINDINGS');
      expect(formatted).toContain('No suspicious findings.');
    });

    it('should handle empty content', () => {
      const formatted = formatReportSection('COMPARISON', '');
      expect(formatted).toBe('');
    });
  });
});

// ============================================================================
// REPORT VALIDATION TESTS
// ============================================================================

describe('Report Validation', () => {
  describe('canGenerateReport', () => {
    it('should return true when all prerequisites are met', () => {
      const clinicalCase = createMockClinicalCase({
        patient: createMockPatientInfo(),
        images: [{ id: 'img-1' } as any],
        assessment: createMockBiRadsAssessment(),
        workflow: createMockWorkflowState({
          completedSteps: [
            ClinicalWorkflowStep.PATIENT_REGISTRATION,
            ClinicalWorkflowStep.IMAGE_UPLOAD,
            ClinicalWorkflowStep.BATCH_AI_ANALYSIS,
            ClinicalWorkflowStep.BIRADS_ASSESSMENT,
          ],
        }),
      });
      
      const result = canGenerateReport(clinicalCase);
      expect(result.canGenerate).toBe(true);
    });

    it('should return false without patient info', () => {
      const clinicalCase = createMockClinicalCase({
        patient: EMPTY_PATIENT_INFO,
      });
      
      const result = canGenerateReport(clinicalCase);
      expect(result.canGenerate).toBe(false);
      expect(result.missingRequirements).toContain('patient');
    });

    it('should return false without images', () => {
      const clinicalCase = createMockClinicalCase({
        images: [],
      });
      
      const result = canGenerateReport(clinicalCase);
      expect(result.canGenerate).toBe(false);
      expect(result.missingRequirements).toContain('images');
    });

    it('should return false without BI-RADS assessment', () => {
      const clinicalCase = createMockClinicalCase({
        assessment: undefined,
      });
      
      const result = canGenerateReport(clinicalCase);
      expect(result.canGenerate).toBe(false);
      expect(result.missingRequirements).toContain('assessment');
    });

    it('should return false if BIRADS_ASSESSMENT step not completed', () => {
      const clinicalCase = createMockClinicalCase({
        assessment: createMockBiRadsAssessment(),
        workflow: createMockWorkflowState({
          completedSteps: [
            ClinicalWorkflowStep.PATIENT_REGISTRATION,
            ClinicalWorkflowStep.IMAGE_UPLOAD,
          ],
        }),
      });
      
      const result = canGenerateReport(clinicalCase);
      expect(result.canGenerate).toBe(false);
    });
  });

  describe('validateReportForFinalization', () => {
    it('should return valid for complete report', () => {
      const report: GeneratedReport = {
        id: 'report-001',
        content: {
          header: 'Header content',
          clinicalHistory: 'History content',
          technique: 'Technique content',
          comparison: 'Comparison content',
          findings: 'Findings content',
          impression: 'Impression content',
          recommendation: 'Recommendation content',
        },
        status: 'draft',
        generatedAt: '2026-02-21T10:00:00Z',
        modifiedAt: '2026-02-21T10:00:00Z',
      };
      
      const result = validateReportForFinalization(report);
      expect(result.isValid).toBe(true);
    });

    it('should be invalid without impression', () => {
      const report: GeneratedReport = {
        id: 'report-001',
        content: {
          header: 'Header',
          clinicalHistory: 'History',
          technique: 'Technique',
          comparison: 'Comparison',
          findings: 'Findings',
          impression: '',
          recommendation: 'Recommendation',
        },
        status: 'draft',
        generatedAt: '2026-02-21T10:00:00Z',
        modifiedAt: '2026-02-21T10:00:00Z',
      };
      
      const result = validateReportForFinalization(report);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'content.impression' })
      );
    });

    it('should be invalid without recommendation', () => {
      const report: GeneratedReport = {
        id: 'report-001',
        content: {
          header: 'Header',
          clinicalHistory: 'History',
          technique: 'Technique',
          comparison: 'Comparison',
          findings: 'Findings',
          impression: 'Impression',
          recommendation: '',
        },
        status: 'draft',
        generatedAt: '2026-02-21T10:00:00Z',
        modifiedAt: '2026-02-21T10:00:00Z',
      };
      
      const result = validateReportForFinalization(report);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'content.recommendation' })
      );
    });

    it('should not allow finalizing already finalized report', () => {
      const report: GeneratedReport = {
        id: 'report-001',
        content: {
          header: 'Header',
          clinicalHistory: 'History',
          technique: 'Technique',
          comparison: 'Comparison',
          findings: 'Findings',
          impression: 'Impression',
          recommendation: 'Recommendation',
        },
        status: 'signed',
        generatedAt: '2026-02-21T10:00:00Z',
        modifiedAt: '2026-02-21T10:00:00Z',
      };
      
      const result = validateReportForFinalization(report);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'status' })
      );
    });
  });
});

// ============================================================================
// REPORT CREATION TESTS
// ============================================================================

describe('Report Creation', () => {
  describe('createGeneratedReport', () => {
    it('should create report with all content sections', () => {
      const clinicalCase = createMockClinicalCase({
        assessment: createMockBiRadsAssessment(),
      });
      
      const result = createGeneratedReport(clinicalCase);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBeTruthy();
        expect(result.data.status).toBe('draft');
        expect(result.data.content.header).toBeTruthy();
        expect(result.data.content.impression).toBeTruthy();
        expect(result.data.generatedAt).toBeTruthy();
      }
    });

    it('should fail without assessment', () => {
      const clinicalCase = createMockClinicalCase({
        assessment: undefined,
      });
      
      const result = createGeneratedReport(clinicalCase);
      
      expect(result.success).toBe(false);
    });

    it('should include options when provided', () => {
      const clinicalCase = createMockClinicalCase({
        assessment: createMockBiRadsAssessment(),
      });
      
      const options: ReportGenerationOptions = {
        includeAIResults: true,
        includeHeatmaps: true,
        templateType: 'detailed',
      };
      
      const result = createGeneratedReport(clinicalCase, options);
      
      expect(result.success).toBe(true);
    });

    it('should generate unique report IDs', () => {
      const clinicalCase = createMockClinicalCase({
        assessment: createMockBiRadsAssessment(),
      });
      
      const result1 = createGeneratedReport(clinicalCase);
      const result2 = createGeneratedReport(clinicalCase);
      
      expect(result1.success && result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.data.id).not.toBe(result2.data.id);
      }
    });
  });
});

// ============================================================================
// REPORT FINALIZATION TESTS
// ============================================================================

describe('Report Finalization', () => {
  describe('finalizeReport', () => {
    it('should update status to pending_review', () => {
      const report: GeneratedReport = {
        id: 'report-001',
        content: {
          header: 'Header',
          clinicalHistory: 'History',
          technique: 'Technique',
          comparison: 'Comparison',
          findings: 'Findings',
          impression: 'Impression',
          recommendation: 'Recommendation',
        },
        status: 'draft',
        generatedAt: '2026-02-21T10:00:00Z',
        modifiedAt: '2026-02-21T10:00:00Z',
      };
      
      const result = finalizeReport(report);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('pending_review');
        expect(new Date(result.data.modifiedAt).getTime())
          .toBeGreaterThanOrEqual(new Date(report.modifiedAt).getTime());
      }
    });

    it('should fail for incomplete report', () => {
      const report: GeneratedReport = {
        id: 'report-001',
        content: {
          header: '',
          clinicalHistory: '',
          technique: '',
          comparison: '',
          findings: '',
          impression: '',
          recommendation: '',
        },
        status: 'draft',
        generatedAt: '2026-02-21T10:00:00Z',
        modifiedAt: '2026-02-21T10:00:00Z',
      };
      
      const result = finalizeReport(report);
      
      expect(result.success).toBe(false);
    });

    it('should fail for already signed report', () => {
      const report: GeneratedReport = {
        id: 'report-001',
        content: {
          header: 'Header',
          clinicalHistory: 'History',
          technique: 'Technique',
          comparison: 'Comparison',
          findings: 'Findings',
          impression: 'Impression',
          recommendation: 'Recommendation',
        },
        status: 'signed',
        generatedAt: '2026-02-21T10:00:00Z',
        modifiedAt: '2026-02-21T10:00:00Z',
      };
      
      const result = finalizeReport(report);
      
      expect(result.success).toBe(false);
    });
  });

  describe('signReport', () => {
    it('should update status to signed', () => {
      const report: GeneratedReport = {
        id: 'report-001',
        content: {
          header: 'Header',
          clinicalHistory: 'History',
          technique: 'Technique',
          comparison: 'Comparison',
          findings: 'Findings',
          impression: 'Impression',
          recommendation: 'Recommendation',
        },
        status: 'reviewed',
        generatedAt: '2026-02-21T10:00:00Z',
        modifiedAt: '2026-02-21T10:00:00Z',
      };
      
      const result = signReport(report, 'radiologist-001', 'password123');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('signed');
      }
    });

    it('should require reviewed status', () => {
      const report: GeneratedReport = {
        id: 'report-001',
        content: {
          header: 'Header',
          clinicalHistory: 'History',
          technique: 'Technique',
          comparison: 'Comparison',
          findings: 'Findings',
          impression: 'Impression',
          recommendation: 'Recommendation',
        },
        status: 'draft',
        generatedAt: '2026-02-21T10:00:00Z',
        modifiedAt: '2026-02-21T10:00:00Z',
      };
      
      const result = signReport(report, 'radiologist-001', 'password123');
      
      expect(result.success).toBe(false);
    });

    it('should require valid user credentials', () => {
      const report: GeneratedReport = {
        id: 'report-001',
        content: {
          header: 'Header',
          clinicalHistory: 'History',
          technique: 'Technique',
          comparison: 'Comparison',
          findings: 'Findings',
          impression: 'Impression',
          recommendation: 'Recommendation',
        },
        status: 'reviewed',
        generatedAt: '2026-02-21T10:00:00Z',
        modifiedAt: '2026-02-21T10:00:00Z',
      };
      
      const result = signReport(report, '', 'password123');
      
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// EDGE CASES & ERROR HANDLING
// ============================================================================

describe('Edge Cases and Error Handling', () => {
  describe('validateBiRadsAssessment with edge cases', () => {
    it('should handle null assessment gracefully', () => {
      const result = validateBiRadsAssessment(null);
      expect(result.isValid).toBe(false);
    });

    it('should handle undefined assessment gracefully', () => {
      const result = validateBiRadsAssessment(undefined);
      expect(result.isValid).toBe(false);
    });

    it('should handle partial assessment', () => {
      const partialAssessment = {
        rightBreast: createMockBreastAssessment(),
        // missing leftBreast
      } as BiRadsAssessment;
      
      const result = validateBiRadsAssessment(partialAssessment);
      expect(result.isValid).toBe(false);
    });
  });

  describe('generateReportContent with edge cases', () => {
    it('should handle case with no findings', () => {
      const clinicalCase = createMockClinicalCase({
        consolidatedFindings: [],
        assessment: createMockBiRadsAssessment(),
      });
      
      const content = generateReportContent(clinicalCase);
      expect(content.findings).toMatch(/no.*finding|negative/i);
    });

    it('should handle case with no assessment', () => {
      const clinicalCase = createMockClinicalCase({
        assessment: undefined,
      });
      
      const content = generateReportContent(clinicalCase);
      expect(content.impression).toMatch(/assessment.*pending|not.*completed/i);
    });

    it('should sanitize special characters in patient names', () => {
      const clinicalCase = createMockClinicalCase({
        patient: createMockPatientInfo({
          firstName: 'Jane<script>',
          lastName: "O'Brien",
        }),
      });
      
      const content = generateReportContent(clinicalCase);
      expect(content.header).not.toContain('<script>');
      expect(content.header).toContain("O'Brien");
    });
  });

  describe('createGeneratedReport with edge cases', () => {
    it('should handle very long impression text', () => {
      const longImpression = 'A'.repeat(10000);
      const clinicalCase = createMockClinicalCase({
        assessment: createMockBiRadsAssessment({
          impression: longImpression,
        }),
      });
      
      const result = createGeneratedReport(clinicalCase);
      expect(result.success).toBe(true);
    });

    it('should handle special characters in findings', () => {
      const clinicalCase = createMockClinicalCase({
        consolidatedFindings: [
          createMockConsolidatedFinding({
            radiologistNotes: 'Size: 1.5cm × 2.0cm, ≥95% probability',
          }),
        ],
        assessment: createMockBiRadsAssessment(),
      });
      
      const result = createGeneratedReport(clinicalCase);
      expect(result.success).toBe(true);
    });
  });
});
