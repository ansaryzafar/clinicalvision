/**
 * Case Operations Tests
 * 
 * Comprehensive test suite for clinical case creation and management.
 * Follows TDD methodology - these tests define expected behavior.
 * 
 * @jest-environment jsdom
 */

import {
  ClinicalWorkflowStep,
  ClinicalCase,
  PatientInfo,
  ClinicalHistory,
  MammogramImage,
  ViewType,
  Laterality,
  Result,
  EMPTY_PATIENT_INFO,
  EMPTY_CLINICAL_HISTORY,
} from '../../types/case.types';

import {
  createClinicalCase,
  generateCaseNumber,
  generateUUID,
  CreateCaseOptions,
} from '../caseOperations';

import { assertFailure } from '../../types/resultHelpers';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const TEST_USER_ID = 'user-123';

function createValidPatientInfo(overrides: Partial<PatientInfo> = {}): PatientInfo {
  return {
    mrn: 'MRN123456',
    firstName: 'Jane',
    lastName: 'Smith',
    dateOfBirth: '1980-05-15',
    gender: 'F',
    ...overrides,
  };
}

function createValidClinicalHistory(overrides: Partial<ClinicalHistory> = {}): ClinicalHistory {
  return {
    clinicalIndication: 'Screening mammogram',
    familyHistoryBreastCancer: false,
    personalHistoryBreastCancer: false,
    previousBiopsy: false,
    comparisonAvailable: false,
    ...overrides,
  };
}

// ============================================================================
// CASE NUMBER GENERATION TESTS
// ============================================================================

describe('generateCaseNumber', () => {
  it('should generate a case number in CV-YYYY-XXXXXX format', () => {
    const caseNumber = generateCaseNumber();
    const currentYear = new Date().getFullYear();
    
    expect(caseNumber).toMatch(/^CV-\d{4}-\d{6}$/);
    expect(caseNumber.substring(3, 7)).toBe(currentYear.toString());
  });
  
  it('should generate unique case numbers', () => {
    const caseNumbers = new Set<string>();
    for (let i = 0; i < 100; i++) {
      caseNumbers.add(generateCaseNumber());
    }
    expect(caseNumbers.size).toBe(100);
  });
  
  it('should generate case numbers with sequential-like appearance', () => {
    const caseNumber = generateCaseNumber();
    const sequencePart = caseNumber.split('-')[2];
    expect(sequencePart.length).toBe(6);
    expect(parseInt(sequencePart, 10)).toBeGreaterThan(0);
  });
});

// ============================================================================
// UUID GENERATION TESTS
// ============================================================================

describe('generateUUID', () => {
  it('should generate a valid UUID v4 format', () => {
    const uuid = generateUUID();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid).toMatch(uuidRegex);
  });
  
  it('should generate unique UUIDs', () => {
    const uuids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      uuids.add(generateUUID());
    }
    expect(uuids.size).toBe(1000);
  });
});

// ============================================================================
// CREATE CLINICAL CASE - HAPPY PATH TESTS
// ============================================================================

describe('createClinicalCase', () => {
  describe('successful creation', () => {
    it('should create a case with valid patient info and clinical history', () => {
      const patientInfo = createValidPatientInfo();
      const clinicalHistory = createValidClinicalHistory();
      
      const result = createClinicalCase(patientInfo, clinicalHistory, TEST_USER_ID);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.patient).toEqual(patientInfo);
        expect(result.data.clinicalHistory).toEqual(clinicalHistory);
      }
    });
    
    it('should generate unique id and caseNumber', () => {
      const result = createClinicalCase(
        createValidPatientInfo(),
        createValidClinicalHistory(),
        TEST_USER_ID
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBeDefined();
        expect(result.data.id.length).toBeGreaterThan(0);
        expect(result.data.caseNumber).toMatch(/^CV-\d{4}-\d{6}$/);
      }
    });
    
    it('should initialize workflow at PATIENT_REGISTRATION step', () => {
      const result = createClinicalCase(
        createValidPatientInfo(),
        createValidClinicalHistory(),
        TEST_USER_ID
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.workflow.currentStep).toBe(ClinicalWorkflowStep.PATIENT_REGISTRATION);
        expect(result.data.workflow.completedSteps).toEqual([]);
        expect(result.data.workflow.status).toBe('draft');
      }
    });
    
    it('should initialize empty arrays for images, analysis, and findings', () => {
      const result = createClinicalCase(
        createValidPatientInfo(),
        createValidClinicalHistory(),
        TEST_USER_ID
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.images).toEqual([]);
        expect(result.data.analysisResults).toEqual([]);
        expect(result.data.consolidatedFindings).toEqual([]);
      }
    });
    
    it('should create audit trail with creator info', () => {
      const result = createClinicalCase(
        createValidPatientInfo(),
        createValidClinicalHistory(),
        TEST_USER_ID
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.audit.createdBy).toBe(TEST_USER_ID);
        expect(result.data.audit.createdAt).toBeDefined();
        expect(new Date(result.data.audit.createdAt).getTime()).not.toBeNaN();
        expect(result.data.audit.modifications).toEqual([]);
      }
    });
    
    it('should set workflow timestamps correctly', () => {
      const before = new Date().toISOString();
      
      const result = createClinicalCase(
        createValidPatientInfo(),
        createValidClinicalHistory(),
        TEST_USER_ID
      );
      
      const after = new Date().toISOString();
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.workflow.startedAt).toBeDefined();
        expect(result.data.workflow.lastModifiedAt).toBeDefined();
        expect(result.data.workflow.startedAt >= before).toBe(true);
        expect(result.data.workflow.startedAt <= after).toBe(true);
      }
    });
    
    it('should NOT have backendId initially (assigned after backend save)', () => {
      const result = createClinicalCase(
        createValidPatientInfo(),
        createValidClinicalHistory(),
        TEST_USER_ID
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.backendId).toBeUndefined();
      }
    });
  });
  
  // ============================================================================
  // PATIENT INFO VALIDATION TESTS
  // ============================================================================
  
  describe('patient info validation', () => {
    it('should fail with empty MRN', () => {
      const patientInfo = createValidPatientInfo({ mrn: '' });
      const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.name).toBe('ValidationError');
        expect(error.errors).toContainEqual(
          expect.objectContaining({ field: 'mrn' })
        );
      }
    });
    
    it('should fail with invalid MRN format (too short)', () => {
      const patientInfo = createValidPatientInfo({ mrn: 'AB12' });
      const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors).toContainEqual(
          expect.objectContaining({ field: 'mrn' })
        );
      }
    });
    
    it('should fail with invalid MRN format (too long)', () => {
      const patientInfo = createValidPatientInfo({ mrn: 'A'.repeat(25) });
      const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors).toContainEqual(
          expect.objectContaining({ field: 'mrn' })
        );
      }
    });
    
    it('should fail with invalid MRN format (special characters)', () => {
      const patientInfo = createValidPatientInfo({ mrn: 'MRN!@#$%' });
      const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors).toContainEqual(
          expect.objectContaining({ field: 'mrn' })
        );
      }
    });
    
    it('should fail with empty firstName', () => {
      const patientInfo = createValidPatientInfo({ firstName: '' });
      const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors).toContainEqual(
          expect.objectContaining({ field: 'firstName' })
        );
      }
    });
    
    it('should fail with whitespace-only firstName', () => {
      const patientInfo = createValidPatientInfo({ firstName: '   ' });
      const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors).toContainEqual(
          expect.objectContaining({ field: 'firstName' })
        );
      }
    });
    
    it('should fail with empty lastName', () => {
      const patientInfo = createValidPatientInfo({ lastName: '' });
      const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors).toContainEqual(
          expect.objectContaining({ field: 'lastName' })
        );
      }
    });
    
    it('should fail with invalid date of birth format', () => {
      const patientInfo = createValidPatientInfo({ dateOfBirth: '15-05-1980' });
      const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors).toContainEqual(
          expect.objectContaining({ field: 'dateOfBirth' })
        );
      }
    });
    
    it('should fail with future date of birth', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const patientInfo = createValidPatientInfo({ 
        dateOfBirth: futureDate.toISOString().split('T')[0] 
      });
      const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors).toContainEqual(
          expect.objectContaining({ field: 'dateOfBirth' })
        );
      }
    });
    
    it('should fail with impossible date (Feb 30)', () => {
      const patientInfo = createValidPatientInfo({ dateOfBirth: '1980-02-30' });
      const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors).toContainEqual(
          expect.objectContaining({ field: 'dateOfBirth' })
        );
      }
    });
    
    it('should accept names with hyphens', () => {
      const patientInfo = createValidPatientInfo({ lastName: 'Smith-Jones' });
      const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
      
      expect(result.success).toBe(true);
    });
    
    it('should accept names with apostrophes', () => {
      const patientInfo = createValidPatientInfo({ lastName: "O'Brien" });
      const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
      
      expect(result.success).toBe(true);
    });
    
    it('should fail with names containing XSS patterns', () => {
      const patientInfo = createValidPatientInfo({ firstName: '<script>alert(1)</script>' });
      const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors).toContainEqual(
          expect.objectContaining({ field: 'firstName' })
        );
      }
    });
    
    it('should fail with names containing control characters', () => {
      const patientInfo = createValidPatientInfo({ firstName: 'Jane\u0000' });
      const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors).toContainEqual(
          expect.objectContaining({ field: 'firstName' })
        );
      }
    });
    
    it('should accumulate multiple validation errors', () => {
      const patientInfo = createValidPatientInfo({ 
        mrn: '',
        firstName: '',
        lastName: '',
        dateOfBirth: ''
      });
      const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors.length).toBeGreaterThanOrEqual(4);
      }
    });
  });
  
  // ============================================================================
  // CLINICAL HISTORY VALIDATION TESTS
  // ============================================================================
  
  describe('clinical history validation', () => {
    it('should fail with empty clinical indication', () => {
      const clinicalHistory = createValidClinicalHistory({ clinicalIndication: '' });
      const result = createClinicalCase(createValidPatientInfo(), clinicalHistory, TEST_USER_ID);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors).toContainEqual(
          expect.objectContaining({ field: 'clinicalIndication' })
        );
      }
    });
    
    it('should fail with whitespace-only clinical indication', () => {
      const clinicalHistory = createValidClinicalHistory({ clinicalIndication: '   ' });
      const result = createClinicalCase(createValidPatientInfo(), clinicalHistory, TEST_USER_ID);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors).toContainEqual(
          expect.objectContaining({ field: 'clinicalIndication' })
        );
      }
    });
    
    it('should accept valid clinical indication from standard options', () => {
      const clinicalHistory = createValidClinicalHistory({ 
        clinicalIndication: 'Diagnostic - palpable mass' 
      });
      const result = createClinicalCase(createValidPatientInfo(), clinicalHistory, TEST_USER_ID);
      
      expect(result.success).toBe(true);
    });
    
    it('should accept custom clinical indication', () => {
      const clinicalHistory = createValidClinicalHistory({ 
        clinicalIndication: 'Post-surgical follow-up after lumpectomy' 
      });
      const result = createClinicalCase(createValidPatientInfo(), clinicalHistory, TEST_USER_ID);
      
      expect(result.success).toBe(true);
    });
    
    it('should fail with XSS in clinical indication', () => {
      const clinicalHistory = createValidClinicalHistory({ 
        clinicalIndication: '<img onerror="alert(1)" src="x">' 
      });
      const result = createClinicalCase(createValidPatientInfo(), clinicalHistory, TEST_USER_ID);
      
      expect(result.success).toBe(false);
    });
    
    it('should validate boolean fields exist (familyHistoryBreastCancer)', () => {
      const clinicalHistory = { 
        ...createValidClinicalHistory(),
        familyHistoryBreastCancer: undefined as unknown as boolean 
      };
      const result = createClinicalCase(createValidPatientInfo(), clinicalHistory, TEST_USER_ID);
      
      // Should either normalize to false or fail validation
      if (result.success) {
        expect(result.data.clinicalHistory.familyHistoryBreastCancer).toBe(false);
      }
    });
  });
  
  // ============================================================================
  // USER ID VALIDATION TESTS
  // ============================================================================
  
  describe('user ID validation', () => {
    it('should fail with empty user ID', () => {
      const result = createClinicalCase(
        createValidPatientInfo(),
        createValidClinicalHistory(),
        ''
      );
      
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors).toContainEqual(
          expect.objectContaining({ field: 'userId' })
        );
      }
    });
    
    it('should fail with whitespace-only user ID', () => {
      const result = createClinicalCase(
        createValidPatientInfo(),
        createValidClinicalHistory(),
        '   '
      );
      
      expect(result.success).toBe(false);
    });
    
    it('should accept valid user ID formats', () => {
      const validUserIds = ['user-123', 'user@example.com', '12345', 'abc_def-123'];
      
      for (const userId of validUserIds) {
        const result = createClinicalCase(
          createValidPatientInfo(),
          createValidClinicalHistory(),
          userId
        );
        expect(result.success).toBe(true);
      }
    });
  });
  
  // ============================================================================
  // OPTIONS TESTS
  // ============================================================================
  
  describe('create options', () => {
    it('should accept custom case ID if provided', () => {
      const customId = 'custom-case-id-123';
      const result = createClinicalCase(
        createValidPatientInfo(),
        createValidClinicalHistory(),
        TEST_USER_ID,
        { customId }
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(customId);
      }
    });
    
    it('should accept custom case number if provided', () => {
      const customCaseNumber = 'CV-2026-999999';
      const result = createClinicalCase(
        createValidPatientInfo(),
        createValidClinicalHistory(),
        TEST_USER_ID,
        { customCaseNumber }
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.caseNumber).toBe(customCaseNumber);
      }
    });
    
    it('should accept pre-existing backendId', () => {
      const backendId = 42;
      const result = createClinicalCase(
        createValidPatientInfo(),
        createValidClinicalHistory(),
        TEST_USER_ID,
        { backendId }
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.backendId).toBe(String(backendId));
      }
    });
  });
  
  // ============================================================================
  // EDGE CASES AND ROBUSTNESS TESTS
  // ============================================================================
  
  describe('edge cases and robustness', () => {
    it('should handle null patient info gracefully', () => {
      const result = createClinicalCase(
        null as unknown as PatientInfo,
        createValidClinicalHistory(),
        TEST_USER_ID
      );
      
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.name).toBe('ValidationError');
      }
    });
    
    it('should handle undefined patient info gracefully', () => {
      const result = createClinicalCase(
        undefined as unknown as PatientInfo,
        createValidClinicalHistory(),
        TEST_USER_ID
      );
      
      expect(result.success).toBe(false);
    });
    
    it('should handle null clinical history gracefully', () => {
      const result = createClinicalCase(
        createValidPatientInfo(),
        null as unknown as ClinicalHistory,
        TEST_USER_ID
      );
      
      expect(result.success).toBe(false);
    });
    
    it('should handle undefined clinical history gracefully', () => {
      const result = createClinicalCase(
        createValidPatientInfo(),
        undefined as unknown as ClinicalHistory,
        TEST_USER_ID
      );
      
      expect(result.success).toBe(false);
    });
    
    it('should trim whitespace from patient name fields', () => {
      const patientInfo = createValidPatientInfo({ 
        firstName: '  Jane  ',
        lastName: '  Smith  '
      });
      const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.patient.firstName).toBe('Jane');
        expect(result.data.patient.lastName).toBe('Smith');
      }
    });
    
    it('should normalize MRN to uppercase', () => {
      const patientInfo = createValidPatientInfo({ mrn: 'mrn123456' });
      const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.patient.mrn).toBe('MRN123456');
      }
    });
    
    it('should create multiple independent cases', () => {
      const result1 = createClinicalCase(
        createValidPatientInfo({ mrn: 'MRN111111' }),
        createValidClinicalHistory(),
        TEST_USER_ID
      );
      const result2 = createClinicalCase(
        createValidPatientInfo({ mrn: 'MRN222222' }),
        createValidClinicalHistory(),
        TEST_USER_ID
      );
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      if (result1.success && result2.success) {
        expect(result1.data.id).not.toBe(result2.data.id);
        expect(result1.data.caseNumber).not.toBe(result2.data.caseNumber);
      }
    });
    
    it('should handle very long but valid field values', () => {
      const patientInfo = createValidPatientInfo({ 
        firstName: 'A'.repeat(50), // 50 chars - valid
        lastName: 'B'.repeat(50),  // 50 chars - valid
      });
      const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
      
      expect(result.success).toBe(true);
    });
    
    it('should fail with excessively long field values', () => {
      const patientInfo = createValidPatientInfo({ 
        firstName: 'A'.repeat(150) // 150 chars - too long
      });
      const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
      
      expect(result.success).toBe(false);
    });
    
    it('should handle special but valid Unicode names', () => {
      const patientInfo = createValidPatientInfo({ 
        firstName: 'José',
        lastName: 'García-Müller'
      });
      const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
      
      expect(result.success).toBe(true);
    });
    
    it('should reject names with bidirectional override characters', () => {
      const patientInfo = createValidPatientInfo({ 
        firstName: 'Jane\u202E' // Right-to-left override
      });
      const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
      
      expect(result.success).toBe(false);
    });
    
    it('should reject names with zero-width characters', () => {
      const patientInfo = createValidPatientInfo({ 
        firstName: 'Jane\u200B' // Zero-width space
      });
      const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
      
      expect(result.success).toBe(false);
    });
  });
  
  // ============================================================================
  // IMMUTABILITY TESTS
  // ============================================================================
  
  describe('immutability', () => {
    it('should not mutate original patient info', () => {
      const patientInfo = createValidPatientInfo();
      const originalMrn = patientInfo.mrn;
      
      createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
      
      expect(patientInfo.mrn).toBe(originalMrn);
    });
    
    it('should not mutate original clinical history', () => {
      const clinicalHistory = createValidClinicalHistory();
      const originalIndication = clinicalHistory.clinicalIndication;
      
      createClinicalCase(createValidPatientInfo(), clinicalHistory, TEST_USER_ID);
      
      expect(clinicalHistory.clinicalIndication).toBe(originalIndication);
    });
    
    it('should create independent case objects', () => {
      const patientInfo = createValidPatientInfo();
      const clinicalHistory = createValidClinicalHistory();
      
      const result1 = createClinicalCase(patientInfo, clinicalHistory, TEST_USER_ID);
      const result2 = createClinicalCase(patientInfo, clinicalHistory, TEST_USER_ID);
      
      if (result1.success && result2.success) {
        result1.data.patient.firstName = 'Modified';
        expect(result2.data.patient.firstName).toBe('Jane');
      }
    });
  });
  
  // ============================================================================
  // CONCURRENT CREATION TESTS
  // ============================================================================
  
  describe('concurrent creation', () => {
    it('should generate unique IDs even with rapid creation', () => {
      const results: Result<ClinicalCase>[] = [];
      
      for (let i = 0; i < 50; i++) {
        results.push(createClinicalCase(
          createValidPatientInfo({ mrn: `MRN${i.toString().padStart(6, '0')}` }),
          createValidClinicalHistory(),
          TEST_USER_ID
        ));
      }
      
      const successfulCases = results
        .filter((r): r is { success: true; data: ClinicalCase } => r.success)
        .map(r => r.data);
      
      const ids = new Set(successfulCases.map(c => c.id));
      const caseNumbers = new Set(successfulCases.map(c => c.caseNumber));
      
      expect(ids.size).toBe(50);
      expect(caseNumbers.size).toBe(50);
    });
  });
});

// ============================================================================
// DATE OF BIRTH BOUNDARY TESTS
// ============================================================================

describe('date of birth boundary validation', () => {
  it('should accept a patient born today (newborn)', () => {
    const today = new Date().toISOString().split('T')[0];
    const patientInfo = createValidPatientInfo({ dateOfBirth: today });
    const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
    
    expect(result.success).toBe(true);
  });
  
  it('should accept a patient born 120 years ago (edge case)', () => {
    const oldDate = new Date();
    oldDate.setFullYear(oldDate.getFullYear() - 120);
    const patientInfo = createValidPatientInfo({ 
      dateOfBirth: oldDate.toISOString().split('T')[0] 
    });
    const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
    
    expect(result.success).toBe(true);
  });
  
  it('should warn for patient born more than 120 years ago', () => {
    const veryOldDate = new Date();
    veryOldDate.setFullYear(veryOldDate.getFullYear() - 130);
    const patientInfo = createValidPatientInfo({ 
      dateOfBirth: veryOldDate.toISOString().split('T')[0] 
    });
    const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
    
    // Should succeed but with warning
    if (result.success) {
      expect(result.warnings?.some(w => w.includes('age'))).toBe(true);
    }
  });
  
  it('should handle leap year dates correctly', () => {
    const patientInfo = createValidPatientInfo({ dateOfBirth: '2000-02-29' });
    const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
    
    expect(result.success).toBe(true);
  });
  
  it('should reject invalid leap year date (Feb 29 in non-leap year)', () => {
    const patientInfo = createValidPatientInfo({ dateOfBirth: '2001-02-29' });
    const result = createClinicalCase(patientInfo, createValidClinicalHistory(), TEST_USER_ID);
    
    expect(result.success).toBe(false);
  });
});

// Helper for the test fixture
function createValidPatientInfoHelper(overrides: Partial<PatientInfo> = {}): PatientInfo {
  return {
    mrn: 'MRN123456',
    firstName: 'Jane',
    lastName: 'Smith',
    dateOfBirth: '1980-05-15',
    gender: 'F',
    ...overrides,
  };
}

function createValidClinicalHistoryHelper(overrides: Partial<ClinicalHistory> = {}): ClinicalHistory {
  return {
    clinicalIndication: 'Screening mammogram',
    familyHistoryBreastCancer: false,
    personalHistoryBreastCancer: false,
    previousBiopsy: false,
    comparisonAvailable: false,
    ...overrides,
  };
}
