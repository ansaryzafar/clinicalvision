/**
 * Phase 2 — Semantic Page Separation Tests
 *
 * Tests for Bug #2 (Full Data Redundancy) fix.
 *
 * Validates that:
 * 1. clinicalSessionService provides `getActiveSessions()` and `getCompletedSessions()`
 * 2. Active sessions have status: 'pending' | 'in-progress' | 'paused'
 * 3. Completed sessions have status: 'completed' | 'reviewed' | 'finalized'
 * 4. The two sets are mutually exclusive (no overlap)
 * 5. Together they cover ALL sessions
 * 6. `markSessionCompleted()` transitions a session from active → completed pool
 *
 * @jest-environment jsdom
 */

import { clinicalSessionService } from '../clinicalSession.service';
import { AnalysisSession, WorkflowStep, WorkflowStatus } from '../../types/clinical.types';

// ============================================================================
// HELPERS
// ============================================================================

function createSessionWithStatus(id: string, status: WorkflowStatus): AnalysisSession {
  return {
    sessionId: id,
    patientInfo: { patientId: `PAT-${id}` },
    studyInfo: {
      studyId: `study_${id}`,
      studyDate: '2026-01-15',
      studyDescription: 'Test Study',
      modality: 'MG',
    },
    images: [],
    findings: [],
    assessment: { impression: '', recommendation: '' },
    workflow: {
      mode: 'clinical',
      currentStep: WorkflowStep.UPLOAD,
      completedSteps: [],
      status,
      startedAt: '2026-01-15T00:00:00Z',
      stepHistory: [],
    },
    measurements: [],
    viewerSettings: {
      windowLevel: { width: 255, center: 128 },
      zoom: 1.0,
      rotation: 0,
      gridEnabled: false,
      gridSpacing: 5,
      calibration: 10,
    },
    metadata: {
      createdAt: '2026-01-15T00:00:00Z',
      createdBy: 'test',
      lastModified: '2026-01-15T00:00:00Z',
      modifiedBy: 'test',
      version: 1,
      autoSaveEnabled: true,
    },
  } as AnalysisSession;
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() => {
  clinicalSessionService.clearAllSessions();
  localStorage.clear();
});

afterEach(() => {
  clinicalSessionService.stopAutoSave();
  clinicalSessionService.clearAllSessions();
  localStorage.clear();
});

// ============================================================================
// TESTS
// ============================================================================

describe('Semantic Page Separation', () => {
  // ==========================================================================
  // ACTIVE STATUSES: 'pending' | 'in-progress' | 'paused'
  // ==========================================================================
  const ACTIVE_STATUSES: WorkflowStatus[] = ['pending', 'in-progress', 'paused'];
  // COMPLETED STATUSES: 'completed' | 'reviewed' | 'finalized'
  const COMPLETED_STATUSES: WorkflowStatus[] = ['completed', 'reviewed', 'finalized'];
  const ALL_STATUSES: WorkflowStatus[] = [...ACTIVE_STATUSES, ...COMPLETED_STATUSES];

  describe('getActiveSessions()', () => {
    it('should return only sessions with active statuses (pending, in-progress, paused)', () => {
      // Create one session for each status
      ALL_STATUSES.forEach((status) => {
        const session = createSessionWithStatus(`sess-${status}`, status);
        clinicalSessionService.saveSession(session, { preserveTimestamp: true });
      });

      const activeSessions = clinicalSessionService.getActiveSessions();
      const activeIds = activeSessions.map(s => s.sessionId).sort();

      expect(activeIds).toEqual(['sess-in-progress', 'sess-paused', 'sess-pending']);
    });

    it('should return empty array when there are only completed sessions', () => {
      COMPLETED_STATUSES.forEach((status) => {
        clinicalSessionService.saveSession(
          createSessionWithStatus(`completed-${status}`, status),
          { preserveTimestamp: true },
        );
      });

      expect(clinicalSessionService.getActiveSessions()).toHaveLength(0);
    });

    it('should return all sessions when all are active', () => {
      ACTIVE_STATUSES.forEach((status) => {
        clinicalSessionService.saveSession(
          createSessionWithStatus(`active-${status}`, status),
          { preserveTimestamp: true },
        );
      });

      expect(clinicalSessionService.getActiveSessions()).toHaveLength(3);
    });

    it('should return empty array when no sessions exist', () => {
      expect(clinicalSessionService.getActiveSessions()).toHaveLength(0);
    });
  });

  describe('getCompletedSessions()', () => {
    it('should return only sessions with completed statuses (completed, reviewed, finalized)', () => {
      ALL_STATUSES.forEach((status) => {
        clinicalSessionService.saveSession(
          createSessionWithStatus(`sess-${status}`, status),
          { preserveTimestamp: true },
        );
      });

      const completedSessions = clinicalSessionService.getCompletedSessions();
      const completedIds = completedSessions.map(s => s.sessionId).sort();

      expect(completedIds).toEqual(['sess-completed', 'sess-finalized', 'sess-reviewed']);
    });

    it('should return empty array when there are only active sessions', () => {
      ACTIVE_STATUSES.forEach((status) => {
        clinicalSessionService.saveSession(
          createSessionWithStatus(`active-${status}`, status),
          { preserveTimestamp: true },
        );
      });

      expect(clinicalSessionService.getCompletedSessions()).toHaveLength(0);
    });

    it('should return all sessions when all are completed', () => {
      COMPLETED_STATUSES.forEach((status) => {
        clinicalSessionService.saveSession(
          createSessionWithStatus(`done-${status}`, status),
          { preserveTimestamp: true },
        );
      });

      expect(clinicalSessionService.getCompletedSessions()).toHaveLength(3);
    });

    it('should return empty array when no sessions exist', () => {
      expect(clinicalSessionService.getCompletedSessions()).toHaveLength(0);
    });
  });

  // ==========================================================================
  // MUTUAL EXCLUSIVITY — active ∩ completed = ∅
  // ==========================================================================
  describe('mutual exclusivity', () => {
    it('active and completed sets should have zero overlap', () => {
      ALL_STATUSES.forEach((status) => {
        clinicalSessionService.saveSession(
          createSessionWithStatus(`sess-${status}`, status),
          { preserveTimestamp: true },
        );
      });

      const activeIds = new Set(
        clinicalSessionService.getActiveSessions().map(s => s.sessionId),
      );
      const completedIds = new Set(
        clinicalSessionService.getCompletedSessions().map(s => s.sessionId),
      );

      // No ID should appear in both sets
      const intersection = [...activeIds].filter(id => completedIds.has(id));
      expect(intersection).toHaveLength(0);
    });

    it('active + completed should equal getAllSessions', () => {
      ALL_STATUSES.forEach((status) => {
        clinicalSessionService.saveSession(
          createSessionWithStatus(`sess-${status}`, status),
          { preserveTimestamp: true },
        );
      });

      const allIds = clinicalSessionService.getAllSessions().map(s => s.sessionId).sort();
      const combinedIds = [
        ...clinicalSessionService.getActiveSessions().map(s => s.sessionId),
        ...clinicalSessionService.getCompletedSessions().map(s => s.sessionId),
      ].sort();

      expect(combinedIds).toEqual(allIds);
    });
  });

  // ==========================================================================
  // markSessionCompleted — transition from active → completed
  // ==========================================================================
  describe('markSessionCompleted()', () => {
    it('should change session status to "completed"', () => {
      const session = createSessionWithStatus('transition-1', 'in-progress');
      clinicalSessionService.saveSession(session, { preserveTimestamp: true });

      clinicalSessionService.markSessionCompleted('transition-1');

      const saved = clinicalSessionService.getSession('transition-1')!;
      expect(saved.workflow.status).toBe('completed');
    });

    it('should move session from getActiveSessions to getCompletedSessions', () => {
      const session = createSessionWithStatus('transition-2', 'in-progress');
      clinicalSessionService.saveSession(session, { preserveTimestamp: true });

      // Before: should be in active, not in completed
      expect(clinicalSessionService.getActiveSessions().map(s => s.sessionId))
        .toContain('transition-2');
      expect(clinicalSessionService.getCompletedSessions().map(s => s.sessionId))
        .not.toContain('transition-2');

      clinicalSessionService.markSessionCompleted('transition-2');

      // After: should be in completed, not in active
      expect(clinicalSessionService.getActiveSessions().map(s => s.sessionId))
        .not.toContain('transition-2');
      expect(clinicalSessionService.getCompletedSessions().map(s => s.sessionId))
        .toContain('transition-2');
    });

    it('should update lastModified when completing a session (genuine edit)', () => {
      const session = createSessionWithStatus('transition-3', 'pending');
      session.metadata.lastModified = '2025-01-01T00:00:00Z'; // old timestamp
      clinicalSessionService.saveSession(session, { preserveTimestamp: true });

      clinicalSessionService.markSessionCompleted('transition-3');

      const saved = clinicalSessionService.getSession('transition-3')!;
      // lastModified should be bumped (this is a real user action)
      expect(saved.metadata.lastModified).not.toBe('2025-01-01T00:00:00Z');
    });

    it('should be idempotent — calling on already-completed session should not break', () => {
      const session = createSessionWithStatus('transition-4', 'completed');
      clinicalSessionService.saveSession(session, { preserveTimestamp: true });

      // Should not throw
      expect(() => clinicalSessionService.markSessionCompleted('transition-4')).not.toThrow();

      const saved = clinicalSessionService.getSession('transition-4')!;
      expect(saved.workflow.status).toBe('completed');
    });

    it('should handle non-existent session gracefully', () => {
      expect(() => clinicalSessionService.markSessionCompleted('non-existent')).not.toThrow();
    });

    it('should work for "pending" sessions', () => {
      const session = createSessionWithStatus('from-pending', 'pending');
      clinicalSessionService.saveSession(session, { preserveTimestamp: true });

      clinicalSessionService.markSessionCompleted('from-pending');

      expect(clinicalSessionService.getSession('from-pending')!.workflow.status).toBe('completed');
      expect(clinicalSessionService.getCompletedSessions().map(s => s.sessionId))
        .toContain('from-pending');
    });

    it('should work for "paused" sessions', () => {
      const session = createSessionWithStatus('from-paused', 'paused');
      clinicalSessionService.saveSession(session, { preserveTimestamp: true });

      clinicalSessionService.markSessionCompleted('from-paused');

      expect(clinicalSessionService.getSession('from-paused')!.workflow.status).toBe('completed');
      expect(clinicalSessionService.getCompletedSessions().map(s => s.sessionId))
        .toContain('from-paused');
    });
  });

  // ==========================================================================
  // STRESS / EDGE CASES
  // ==========================================================================
  describe('edge cases', () => {
    it('should handle large dataset (50 sessions split across statuses)', () => {
      for (let i = 0; i < 50; i++) {
        const status = ALL_STATUSES[i % ALL_STATUSES.length];
        clinicalSessionService.saveSession(
          createSessionWithStatus(`stress-${i}`, status),
          { preserveTimestamp: true },
        );
      }

      const active = clinicalSessionService.getActiveSessions();
      const completed = clinicalSessionService.getCompletedSessions();
      const all = clinicalSessionService.getAllSessions();

      expect(active.length + completed.length).toBe(all.length);
      expect(all.length).toBe(50);
    });

    it('should reflect real-time changes — delete active session, counts update', () => {
      const session = createSessionWithStatus('delete-me', 'in-progress');
      clinicalSessionService.saveSession(session, { preserveTimestamp: true });
      expect(clinicalSessionService.getActiveSessions()).toHaveLength(1);

      clinicalSessionService.deleteSession('delete-me');
      expect(clinicalSessionService.getActiveSessions()).toHaveLength(0);
    });
  });
});
