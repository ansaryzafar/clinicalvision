/**
 * Case → Session Bridge Tests
 *
 * Validates that ClinicalCase objects are correctly converted
 * to AnalysisSession objects and synced to clinicalSessionService.
 *
 * This is the critical bridge that makes completed cases visible
 * in the CasesDashboard, PatientRecords, and ClinicalDashboard.
 *
 * @jest-environment jsdom
 */

import {
  clinicalCaseToSession,
  syncCaseToSessionService,
  syncAllCasesToSessionService,
  removeCaseFromSessionService,
} from '../caseSessionBridge';
import { clinicalSessionService } from '../clinicalSession.service';
import {
  ClinicalCase,
  ClinicalWorkflowStep,
  ViewType,
  Laterality,
  EMPTY_PATIENT_INFO,
  EMPTY_CLINICAL_HISTORY,
} from '../../types/case.types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createMinimalCase(overrides: Partial<ClinicalCase> = {}): ClinicalCase {
  return {
    id: 'case-001',
    caseNumber: 'CV-2026-001',
    patient: {
      ...EMPTY_PATIENT_INFO,
      mrn: 'DEMO-001',
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '1965-03-15',
      gender: 'F',
    },
    clinicalHistory: {
      ...EMPTY_CLINICAL_HISTORY,
      clinicalIndication: 'Screening Mammography',
    },
    images: [],
    analysisResults: [],
    consolidatedFindings: [],
    workflow: {
      currentStep: ClinicalWorkflowStep.PATIENT_REGISTRATION,
      completedSteps: [],
      status: 'draft',
      startedAt: '2026-01-01T00:00:00Z',
      lastModifiedAt: '2026-01-01T00:00:00Z',
      isLocked: false,
    },
    audit: {
      createdBy: 'radiologist',
      createdAt: '2026-01-01T00:00:00Z',
      modifications: [],
    },
    ...overrides,
  };
}

function createCompletedCase(): ClinicalCase {
  return createMinimalCase({
    id: 'case-completed-001',
    caseNumber: 'CV-2026-COMPLETED',
    images: [
      {
        id: 'img-rcc',
        filename: 'RCC_001.png',
        fileSize: 2048000,
        mimeType: 'image/png',
        localUrl: 'blob:http://localhost/rcc',
        viewType: ViewType.CC,
        laterality: Laterality.RIGHT,
        uploadStatus: 'completed' as any,
        uploadedAt: '2026-01-01T01:00:00Z',
      },
    ],
    analysisResults: [
      {
        imageId: 'img-rcc',
        prediction: 'malignant',
        confidence: 0.87,
        probabilities: { benign: 0.13, malignant: 0.87 },
        riskLevel: 'high',
        suspiciousRegions: [],
        modelVersion: 'v2.1.0',
        processingTimeMs: 1234,
        analyzedAt: '2026-01-01T02:00:00Z',
      },
    ],
    consolidatedFindings: [
      {
        id: 'finding-001',
        laterality: Laterality.RIGHT,
        clockPosition: 10,
        findingType: 'mass' as any,
        visibleInViews: ['img-rcc'],
        aiCorrelatedRegions: [],
        individualBiRads: '4B',
        aiConfidence: 0.87,
        shape: 'irregular',
        margin: 'spiculated',
        radiologistNotes: 'Suspicious mass 10 o\'clock',
        createdAt: '2026-01-01T02:00:00Z',
        updatedAt: '2026-01-01T02:00:00Z',
      },
    ],
    aiSuggestedBiRads: '4B',
    assessment: {
      rightBreast: {
        composition: 'c' as any,
        biRadsCategory: '4B',
        findings: [],
      },
      leftBreast: {
        composition: 'c' as any,
        biRadsCategory: '1',
        findings: [],
      },
      overallCategory: '4B',
      impression: 'Suspicious mass right breast 10 o\'clock',
      recommendation: 'Tissue sampling recommended',
      comparedWithPrior: false,
    },
    report: {
      id: 'rpt-001',
      content: {
        header: 'ClinicalVision Mammography Report',
        clinicalHistory: 'Screening',
        technique: 'Standard 2D mammography',
        comparison: 'None',
        findings: 'Irregular spiculated mass',
        impression: 'BI-RADS 4B',
        recommendation: 'Biopsy recommended',
      },
      status: 'signed',
      generatedAt: '2026-01-01T03:00:00Z',
      modifiedAt: '2026-01-01T03:00:00Z',
    },
    workflow: {
      currentStep: ClinicalWorkflowStep.DIGITAL_SIGNATURE,
      completedSteps: [
        ClinicalWorkflowStep.PATIENT_REGISTRATION,
        ClinicalWorkflowStep.CLINICAL_HISTORY,
        ClinicalWorkflowStep.IMAGE_UPLOAD,
        ClinicalWorkflowStep.IMAGE_VERIFICATION,
        ClinicalWorkflowStep.BATCH_AI_ANALYSIS,
        ClinicalWorkflowStep.FINDINGS_REVIEW,
        ClinicalWorkflowStep.BIRADS_ASSESSMENT,
        ClinicalWorkflowStep.REPORT_GENERATION,
        ClinicalWorkflowStep.FINALIZE,
        ClinicalWorkflowStep.DIGITAL_SIGNATURE,
      ],
      status: 'finalized',
      startedAt: '2026-01-01T00:00:00Z',
      lastModifiedAt: '2026-01-01T04:00:00Z',
      completedAt: '2026-01-01T04:00:00Z',
      finalizedAt: '2026-01-01T04:00:00Z',
      isLocked: true,
    },
    audit: {
      createdBy: 'radiologist',
      createdAt: '2026-01-01T00:00:00Z',
      lastModifiedBy: 'radiologist',
      lastModifiedAt: '2026-01-01T04:00:00Z',
      signedBy: 'Dr. Smith',
      signedAt: '2026-01-01T04:00:00Z',
      signatureHash: 'abc123def456',
      modifications: [
        { timestamp: '2026-01-01T01:00:00Z', userId: 'radiologist', action: 'image_upload' },
        { timestamp: '2026-01-01T02:00:00Z', userId: 'radiologist', action: 'analysis_complete' },
      ],
    },
  });
}

// ============================================================================
// CLEANUP
// ============================================================================

beforeEach(() => {
  clinicalSessionService.clearAllSessions();
});

afterEach(() => {
  clinicalSessionService.clearAllSessions();
});

// ============================================================================
// TESTS: clinicalCaseToSession
// ============================================================================

describe('caseSessionBridge', () => {
  describe('clinicalCaseToSession', () => {
    it('should convert a minimal ClinicalCase to a valid AnalysisSession', () => {
      const session = clinicalCaseToSession(createMinimalCase());

      expect(session.sessionId).toBe('case-001');
      expect(session.patientInfo.patientId).toBe('DEMO-001');
      expect(session.patientInfo.name).toBe('Jane Doe');
      expect(session.patientInfo.dateOfBirth).toBe('1965-03-15');
      expect(session.patientInfo.gender).toBe('F');
      expect(session.studyInfo.studyId).toBe('CV-2026-001');
      expect(session.studyInfo.modality).toBe('MG');
      expect(session.images).toHaveLength(0);
      expect(session.findings).toHaveLength(0);
      expect(session.workflow.status).toBe('pending');
    });

    it('should map finalized CaseStatus to "finalized" WorkflowStatus', () => {
      const completedCase = createCompletedCase();
      const session = clinicalCaseToSession(completedCase);

      expect(session.workflow.status).toBe('finalized');
    });

    it('should map in_progress CaseStatus to "in-progress" WorkflowStatus', () => {
      const inProgress = createMinimalCase({ workflow: { ...createMinimalCase().workflow, status: 'in_progress' } });
      const session = clinicalCaseToSession(inProgress);

      expect(session.workflow.status).toBe('in-progress');
    });

    it('should map images with correct metadata', () => {
      const session = clinicalCaseToSession(createCompletedCase());

      expect(session.images).toHaveLength(1);
      expect(session.images[0].imageId).toBe('img-rcc');
      expect(session.images[0].fileName).toBe('RCC_001.png');
      expect(session.images[0].analyzed).toBe(true);
    });

    it('should map findings with correct structure', () => {
      const session = clinicalCaseToSession(createCompletedCase());

      expect(session.findings).toHaveLength(1);
      expect(session.findings[0].findingId).toBe('finding-001');
      expect(session.findings[0].biradsCategory).toBe('4B');
      expect(session.findings[0].aiConfidence).toBe(0.87);
      expect(session.findings[0].status).toBe('confirmed');
    });

    it('should map BI-RADS assessment from the case assessment', () => {
      const session = clinicalCaseToSession(createCompletedCase());

      expect(session.assessment.biradsCategory).toBe('4B');
      expect(session.assessment.impression).toBe('Suspicious mass right breast 10 o\'clock');
      expect(session.assessment.recommendation).toBe('Tissue sampling recommended');
    });

    it('should map AI analysis results as stored analysis results', () => {
      const session = clinicalCaseToSession(createCompletedCase());

      expect(session.storedAnalysisResults).toBeDefined();
      expect(session.storedAnalysisResults!.prediction).toBe('malignant');
      expect(session.storedAnalysisResults!.confidence).toBe(0.87);
      expect(session.storedAnalysisResults!.probabilities.malignant).toBe(0.87);
      expect(session.storedAnalysisResults!.riskLevel).toBe('high');
    });

    it('should preserve metadata timestamps', () => {
      const session = clinicalCaseToSession(createCompletedCase());

      expect(session.metadata.createdAt).toBe('2026-01-01T00:00:00Z');
      expect(session.metadata.lastModified).toBe('2026-01-01T04:00:00Z');
      expect(session.metadata.createdBy).toBe('radiologist');
    });

    it('should map completed steps to legacy step enum values', () => {
      const session = clinicalCaseToSession(createCompletedCase());

      // All 10 clinical steps map to 7 legacy steps (many-to-one)
      expect(session.workflow.completedSteps.length).toBeGreaterThan(0);
      expect(session.workflow.completedSteps.length).toBeLessThanOrEqual(7);
    });

    it('should handle a case with no assessment or report gracefully', () => {
      const bare = createMinimalCase();
      const session = clinicalCaseToSession(bare);

      expect(session.assessment.biradsCategory).toBeUndefined();
      expect(session.assessment.impression).toBe('');
      expect(session.assessment.recommendation).toBe('');
      expect(session.storedAnalysisResults).toBeUndefined();
    });

    it('should use clinical indication for study description', () => {
      const session = clinicalCaseToSession(createMinimalCase());
      expect(session.studyInfo.studyDescription).toBe('Screening Mammography');
    });
  });

  // ==========================================================================
  // TESTS: syncCaseToSessionService
  // ==========================================================================

  describe('syncCaseToSessionService', () => {
    it('should save a converted session to clinicalSessionService', () => {
      const clinicalCase = createCompletedCase();
      syncCaseToSessionService(clinicalCase);

      const allSessions = clinicalSessionService.getAllSessions();
      expect(allSessions.length).toBe(1);
      expect(allSessions[0].sessionId).toBe('case-completed-001');
    });

    it('should make the case visible via getAllSessions', () => {
      const clinicalCase = createCompletedCase();
      syncCaseToSessionService(clinicalCase);

      const sessions = clinicalSessionService.getAllSessions();
      const found = sessions.find(s => s.sessionId === 'case-completed-001');
      expect(found).toBeDefined();
      expect(found!.patientInfo.patientId).toBe('DEMO-001');
      expect(found!.workflow.status).toBe('finalized');
    });

    it('should update an existing session if called again with same ID', () => {
      const clinicalCase = createCompletedCase();
      syncCaseToSessionService(clinicalCase);

      // Update assessment
      const updated = {
        ...clinicalCase,
        assessment: {
          ...clinicalCase.assessment!,
          impression: 'Updated impression after re-review',
        },
      };
      syncCaseToSessionService(updated);

      const sessions = clinicalSessionService.getAllSessions();
      expect(sessions.length).toBe(1);
      expect(sessions[0].assessment.impression).toBe('Updated impression after re-review');
    });

    it('should not throw on malformed case data', () => {
      const broken = { id: 'broken', caseNumber: 'X', patient: null } as any;
      // Should not throw — graceful degradation
      expect(() => syncCaseToSessionService(broken)).not.toThrow();
    });
  });

  // ==========================================================================
  // TESTS: syncAllCasesToSessionService
  // ==========================================================================

  describe('syncAllCasesToSessionService', () => {
    it('should sync multiple cases to clinicalSessionService', () => {
      const case1 = createMinimalCase({ id: 'case-A', caseNumber: 'CV-A' });
      const case2 = createMinimalCase({ id: 'case-B', caseNumber: 'CV-B' });
      const case3 = createCompletedCase();

      syncAllCasesToSessionService([case1, case2, case3]);

      const sessions = clinicalSessionService.getAllSessions();
      expect(sessions.length).toBe(3);

      const ids = sessions.map(s => s.sessionId).sort();
      expect(ids).toEqual(['case-A', 'case-B', 'case-completed-001']);
    });

    it('should handle empty array without error', () => {
      expect(() => syncAllCasesToSessionService([])).not.toThrow();
      expect(clinicalSessionService.getAllSessions()).toHaveLength(0);
    });
  });

  // ==========================================================================
  // TESTS: removeCaseFromSessionService
  // ==========================================================================

  describe('removeCaseFromSessionService', () => {
    it('should remove a synced case from clinicalSessionService', () => {
      const clinicalCase = createCompletedCase();
      syncCaseToSessionService(clinicalCase);
      expect(clinicalSessionService.getAllSessions()).toHaveLength(1);

      removeCaseFromSessionService('case-completed-001');
      expect(clinicalSessionService.getAllSessions()).toHaveLength(0);
    });

    it('should not throw when removing a non-existent case', () => {
      expect(() => removeCaseFromSessionService('non-existent')).not.toThrow();
    });
  });

  // ==========================================================================
  // TESTS: End-to-end data preservation
  // ==========================================================================

  describe('data preservation guarantee', () => {
    it('should preserve patient MRN through the bridge', () => {
      const c = createCompletedCase();
      syncCaseToSessionService(c);
      const session = clinicalSessionService.getAllSessions()[0];
      expect(session.patientInfo.patientId).toBe(c.patient.mrn);
    });

    it('should preserve patient full name through the bridge', () => {
      const c = createCompletedCase();
      syncCaseToSessionService(c);
      const session = clinicalSessionService.getAllSessions()[0];
      expect(session.patientInfo.name).toBe(`${c.patient.firstName} ${c.patient.lastName}`);
    });

    it('should preserve AI prediction through the bridge', () => {
      const c = createCompletedCase();
      syncCaseToSessionService(c);
      const session = clinicalSessionService.getAllSessions()[0];
      expect(session.storedAnalysisResults!.prediction).toBe('malignant');
      expect(session.storedAnalysisResults!.confidence).toBe(0.87);
    });

    it('should preserve BI-RADS assessment through the bridge', () => {
      const c = createCompletedCase();
      syncCaseToSessionService(c);
      const session = clinicalSessionService.getAllSessions()[0];
      expect(session.assessment.biradsCategory).toBe('4B');
    });

    it('should preserve workflow status through the bridge', () => {
      const c = createCompletedCase();
      syncCaseToSessionService(c);
      const session = clinicalSessionService.getAllSessions()[0];
      expect(session.workflow.status).toBe('finalized');
    });

    it('should preserve creation timestamp through the bridge', () => {
      const c = createCompletedCase();
      syncCaseToSessionService(c);
      const session = clinicalSessionService.getAllSessions()[0];
      expect(session.metadata.createdAt).toBe(c.audit.createdAt);
    });

    it('should ensure synced sessions persist across service reads', () => {
      // This simulates the scenario: workflow writes case → dashboard reads sessions
      const case1 = createMinimalCase({ id: 'persistent-1' });
      const case2 = createCompletedCase();

      syncCaseToSessionService(case1);
      syncCaseToSessionService(case2);

      // Simulate "another component" reading from the service
      const dashboardData = clinicalSessionService.getAllSessions();
      expect(dashboardData).toHaveLength(2);
      expect(dashboardData.some(s => s.sessionId === 'persistent-1')).toBe(true);
      expect(dashboardData.some(s => s.sessionId === 'case-completed-001')).toBe(true);
    });
  });
});
