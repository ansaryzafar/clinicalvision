/**
 * Case → Session Bridge — Timestamp Preservation Tests
 *
 * Phase 1 TDD tests specifically for the timestamp preservation fix.
 * Validates that bridge sync operations preserve original case timestamps
 * instead of overwriting them with "now".
 *
 * These tests complement the existing caseSessionBridge.test.ts suite.
 *
 * @jest-environment jsdom
 */

import {
  clinicalCaseToSession,
  syncCaseToSessionService,
  syncAllCasesToSessionService,
} from '../caseSessionBridge';
import { clinicalSessionService } from '../clinicalSession.service';
import {
  ClinicalCase,
  ClinicalWorkflowStep,
  EMPTY_PATIENT_INFO,
  EMPTY_CLINICAL_HISTORY,
} from '../../types/case.types';

// ============================================================================
// HELPERS
// ============================================================================

function createCaseWithTimestamps(
  id: string,
  createdAt: string,
  lastModifiedAt: string,
  status: string = 'draft',
): ClinicalCase {
  return {
    id,
    caseNumber: `CV-2026-${id}`,
    patient: {
      ...EMPTY_PATIENT_INFO,
      mrn: `MRN-${id}`,
      firstName: 'Test',
      lastName: 'Patient',
    },
    clinicalHistory: {
      ...EMPTY_CLINICAL_HISTORY,
      clinicalIndication: 'Testing',
    },
    images: [],
    analysisResults: [],
    consolidatedFindings: [],
    workflow: {
      currentStep: ClinicalWorkflowStep.PATIENT_REGISTRATION,
      completedSteps: [],
      status,
      startedAt: createdAt,
      lastModifiedAt: lastModifiedAt,
      isLocked: false,
    },
    audit: {
      createdBy: 'test-user',
      createdAt: createdAt,
      lastModifiedBy: 'test-user',
      lastModifiedAt: lastModifiedAt,
      modifications: [],
    },
  } as ClinicalCase;
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() => {
  clinicalSessionService.clearAllSessions();
  localStorage.clear();
});

afterEach(() => {
  clinicalSessionService.clearAllSessions();
  localStorage.clear();
});

// ============================================================================
// TESTS
// ============================================================================

describe('caseSessionBridge — timestamp preservation', () => {
  // ==========================================================================
  // syncCaseToSessionService — the critical fix
  // ==========================================================================
  describe('syncCaseToSessionService preserves original timestamps', () => {
    it('should preserve lastModified from the ClinicalCase when syncing', () => {
      const originalModified = '2025-06-10T09:30:00Z';
      const clinicalCase = createCaseWithTimestamps('ts-1', '2025-06-01T00:00:00Z', originalModified);

      syncCaseToSessionService(clinicalCase);

      const sessions = clinicalSessionService.getAllSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].metadata.lastModified).toBe(originalModified);
    });

    it('should preserve createdAt from the ClinicalCase when syncing', () => {
      const originalCreated = '2025-03-15T08:00:00Z';
      const clinicalCase = createCaseWithTimestamps('ts-2', originalCreated, '2025-03-20T14:00:00Z');

      syncCaseToSessionService(clinicalCase);

      const session = clinicalSessionService.getSession('ts-2')!;
      expect(session.metadata.createdAt).toBe(originalCreated);
    });

    it('should preserve version from audit.modifications length', () => {
      const clinicalCase = createCaseWithTimestamps('ts-3', '2025-01-01T00:00:00Z', '2025-01-05T00:00:00Z');
      // Add 3 modifications to the audit trail
      clinicalCase.audit.modifications = [
        { timestamp: '2025-01-02T00:00:00Z', userId: 'test', action: 'update_1' },
        { timestamp: '2025-01-03T00:00:00Z', userId: 'test', action: 'update_2' },
        { timestamp: '2025-01-04T00:00:00Z', userId: 'test', action: 'update_3' },
      ];

      syncCaseToSessionService(clinicalCase);

      const session = clinicalSessionService.getSession('ts-3')!;
      expect(session.metadata.version).toBe(3);
    });

    it('should NOT bump lastModified to "now" after syncing (the core bug fix)', () => {
      const pastTimestamp = '2024-01-15T10:00:00Z'; // over a year ago
      const clinicalCase = createCaseWithTimestamps('ts-old', '2024-01-01T00:00:00Z', pastTimestamp);

      syncCaseToSessionService(clinicalCase);

      const session = clinicalSessionService.getSession('ts-old')!;
      // The critical assertion: lastModified should be the ORIGINAL timestamp,
      // NOT "now". If this fails, the bug is still present.
      const now = new Date();
      const savedDate = new Date(session.metadata.lastModified);
      const diffMs = now.getTime() - savedDate.getTime();

      // The saved timestamp should be from the past (>1 year ago), not "now"
      expect(diffMs).toBeGreaterThan(365 * 24 * 60 * 60 * 1000); // more than 1 year ago
      expect(session.metadata.lastModified).toBe(pastTimestamp);
    });
  });

  // ==========================================================================
  // syncAllCasesToSessionService — bulk timestamp preservation
  // ==========================================================================
  describe('syncAllCasesToSessionService preserves all timestamps', () => {
    it('should preserve unique timestamps for each case after bulk sync', () => {
      const cases = [
        createCaseWithTimestamps('bulk-1', '2025-01-01T00:00:00Z', '2025-01-10T08:00:00Z'),
        createCaseWithTimestamps('bulk-2', '2025-02-01T00:00:00Z', '2025-02-15T12:30:00Z'),
        createCaseWithTimestamps('bulk-3', '2025-03-01T00:00:00Z', '2025-03-20T16:45:00Z'),
      ];

      syncAllCasesToSessionService(cases);

      const sessions = clinicalSessionService.getAllSessions();
      expect(sessions).toHaveLength(3);

      const s1 = clinicalSessionService.getSession('bulk-1')!;
      const s2 = clinicalSessionService.getSession('bulk-2')!;
      const s3 = clinicalSessionService.getSession('bulk-3')!;

      expect(s1.metadata.lastModified).toBe('2025-01-10T08:00:00Z');
      expect(s2.metadata.lastModified).toBe('2025-02-15T12:30:00Z');
      expect(s3.metadata.lastModified).toBe('2025-03-20T16:45:00Z');
    });

    it('should NOT make all timestamps identical after bulk sync (the bug symptom)', () => {
      const cases = [
        createCaseWithTimestamps('uniq-1', '2025-01-01T00:00:00Z', '2025-01-15T10:00:00Z'),
        createCaseWithTimestamps('uniq-2', '2025-03-01T00:00:00Z', '2025-03-15T14:00:00Z'),
        createCaseWithTimestamps('uniq-3', '2025-06-01T00:00:00Z', '2025-06-15T18:00:00Z'),
      ];

      syncAllCasesToSessionService(cases);

      const sessions = clinicalSessionService.getAllSessions();
      const timestamps = sessions.map(s => s.metadata.lastModified);
      const uniqueTimestamps = new Set(timestamps);

      // All 3 timestamps should be DIFFERENT (not all "now")
      expect(uniqueTimestamps.size).toBe(3);
    });

    it('should preserve timestamps even after repeated sync calls', () => {
      const clinicalCase = createCaseWithTimestamps('repeat-1', '2025-01-01T00:00:00Z', '2025-01-10T08:00:00Z');

      // Sync the same case 5 times (simulates repeated hydration)
      for (let i = 0; i < 5; i++) {
        syncCaseToSessionService(clinicalCase);
      }

      const session = clinicalSessionService.getSession('repeat-1')!;
      expect(session.metadata.lastModified).toBe('2025-01-10T08:00:00Z');
      // Version should also NOT be inflated by repeated syncs
      expect(session.metadata.version).toBe(0); // modifications.length === 0
    });
  });

  // ==========================================================================
  // clinicalCaseToSession — timestamp mapping correctness
  // ==========================================================================
  describe('clinicalCaseToSession timestamp mapping', () => {
    it('should prefer workflow.lastModifiedAt for lastModified', () => {
      const clinicalCase = createCaseWithTimestamps('map-1', '2025-01-01T00:00:00Z', '2025-06-15T12:00:00Z');
      clinicalCase.audit.lastModifiedAt = '2025-05-01T00:00:00Z'; // older
      clinicalCase.workflow.lastModifiedAt = '2025-06-15T12:00:00Z'; // newer

      const session = clinicalCaseToSession(clinicalCase);

      expect(session.metadata.lastModified).toBe('2025-06-15T12:00:00Z');
    });

    it('should fall back to audit.lastModifiedAt when workflow.lastModifiedAt is missing', () => {
      const clinicalCase = createCaseWithTimestamps('map-2', '2025-01-01T00:00:00Z', '');
      clinicalCase.workflow.lastModifiedAt = ''; // empty
      clinicalCase.audit.lastModifiedAt = '2025-04-01T08:00:00Z';

      const session = clinicalCaseToSession(clinicalCase);

      expect(session.metadata.lastModified).toBe('2025-04-01T08:00:00Z');
    });

    it('should map createdAt from audit.createdAt', () => {
      const clinicalCase = createCaseWithTimestamps('map-3', '2024-12-25T00:00:00Z', '2025-01-01T00:00:00Z');

      const session = clinicalCaseToSession(clinicalCase);

      expect(session.metadata.createdAt).toBe('2024-12-25T00:00:00Z');
    });
  });
});
