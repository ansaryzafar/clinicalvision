/**
 * Session Storage Tests (TDD - Write Tests First)
 *
 * These tests define the expected behavior of sessionStorage.
 * Implementation follows to make these tests pass.
 *
 * FIX (Phase E): Uses jsdom's native localStorage instead of a broken
 * Object.defineProperty mock.  jest.spyOn is used only where call
 * verification is needed, and is restored in afterEach so each test
 * starts with a clean slate.
 */

import { STORAGE_KEYS } from '../constants';
import {
  WorkflowSession,
  WorkflowStep,
  createNewSession,
} from '../types';

// Use jsdom's native localStorage — just clear it between tests
import { sessionStorage } from '../sessionStorage';

describe('sessionStorage', () => {
  beforeEach(() => {
    // Clear jsdom's native localStorage between tests
    window.localStorage.clear();
  });

  describe('saveSession', () => {
    it('should save a session to localStorage', () => {
      const session = createNewSession('clinical');

      sessionStorage.saveSession(session);

      // Verify data was persisted by reading back from native localStorage
      const savedRaw = window.localStorage.getItem(STORAGE_KEYS.SESSIONS);
      expect(savedRaw).not.toBeNull();
      const savedData = JSON.parse(savedRaw!);
      expect(savedData[session.id]).toBeDefined();
      expect(savedData[session.id].id).toBe(session.id);
    });

    it('should update the updatedAt timestamp', () => {
      const session = createNewSession('clinical');

      sessionStorage.saveSession(session);

      const savedRaw = window.localStorage.getItem(STORAGE_KEYS.SESSIONS);
      const savedData = JSON.parse(savedRaw!);
      expect(savedData[session.id].updatedAt).toBeDefined();
    });

    it('should preserve existing sessions when saving a new one', () => {
      const session1 = createNewSession('clinical');
      const session2 = createNewSession('quick');

      sessionStorage.saveSession(session1);
      sessionStorage.saveSession(session2);

      const allSessions = sessionStorage.getAllSessions();
      expect(allSessions.length).toBe(2);
    });
  });

  describe('getSession', () => {
    it('should return null for non-existent session', () => {
      const result = sessionStorage.getSession('non-existent-id');
      expect(result).toBeNull();
    });

    it('should retrieve a saved session', () => {
      const session = createNewSession('clinical');
      sessionStorage.saveSession(session);

      const retrieved = sessionStorage.getSession(session.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(session.id);
      expect(retrieved?.mode).toBe('clinical');
    });

    it('should return session with all original data intact', () => {
      const session = createNewSession('clinical');
      session.images = [
        {
          id: 'img-1',
          file: null,
          fileName: 'test.dcm',
          fileSize: 1024,
          preview: 'data:image/png;base64,abc',
          uploadedAt: new Date().toISOString(),
          metadata: { width: 100, height: 100, type: 'dicom' },
        },
      ];
      session.patientInfo.id = 'P12345';
      session.patientInfo.name = 'Test Patient';

      sessionStorage.saveSession(session);
      const retrieved = sessionStorage.getSession(session.id);

      expect(retrieved?.images.length).toBe(1);
      expect(retrieved?.images[0].fileName).toBe('test.dcm');
      expect(retrieved?.patientInfo.id).toBe('P12345');
      expect(retrieved?.patientInfo.name).toBe('Test Patient');
    });
  });

  describe('getAllSessions', () => {
    it('should return empty array when no sessions exist', () => {
      const sessions = sessionStorage.getAllSessions();
      expect(sessions).toEqual([]);
    });

    it('should return all saved sessions', () => {
      const session1 = createNewSession('clinical');
      const session2 = createNewSession('quick');
      const session3 = createNewSession('clinical');

      sessionStorage.saveSession(session1);
      sessionStorage.saveSession(session2);
      sessionStorage.saveSession(session3);

      const allSessions = sessionStorage.getAllSessions();
      expect(allSessions.length).toBe(3);
    });

    it('should return sessions sorted by updatedAt descending', () => {
      const session1 = createNewSession('clinical');
      const session2 = createNewSession('clinical');
      const session3 = createNewSession('clinical');

      sessionStorage.saveSession(session1);
      sessionStorage.saveSession(session2);
      sessionStorage.saveSession(session3);

      const allSessions = sessionStorage.getAllSessions();
      expect(allSessions.length).toBe(3);

      // Verify sorted descending by updatedAt
      for (let i = 0; i < allSessions.length - 1; i++) {
        const a = new Date(allSessions[i].updatedAt).getTime();
        const b = new Date(allSessions[i + 1].updatedAt).getTime();
        expect(a).toBeGreaterThanOrEqual(b);
      }
    });
  });

  describe('deleteSession', () => {
    it('should remove a session from storage', () => {
      const session = createNewSession('clinical');
      sessionStorage.saveSession(session);

      expect(sessionStorage.getSession(session.id)).not.toBeNull();

      sessionStorage.deleteSession(session.id);

      expect(sessionStorage.getSession(session.id)).toBeNull();
    });

    it('should not affect other sessions when deleting one', () => {
      const session1 = createNewSession('clinical');
      const session2 = createNewSession('quick');

      sessionStorage.saveSession(session1);
      sessionStorage.saveSession(session2);

      sessionStorage.deleteSession(session1.id);

      expect(sessionStorage.getSession(session1.id)).toBeNull();
      expect(sessionStorage.getSession(session2.id)).not.toBeNull();
    });

    it('should not throw when deleting non-existent session', () => {
      expect(() => {
        sessionStorage.deleteSession('non-existent-id');
      }).not.toThrow();
    });
  });

  describe('getCurrentSessionId / setCurrentSessionId', () => {
    it('should return null when no current session is set', () => {
      const result = sessionStorage.getCurrentSessionId();
      expect(result).toBeNull();
    });

    it('should store and retrieve current session ID', () => {
      const sessionId = 'test-session-123';

      sessionStorage.setCurrentSessionId(sessionId);
      const retrieved = sessionStorage.getCurrentSessionId();

      expect(retrieved).toBe(sessionId);
    });
  });

  describe('clearCurrentSession', () => {
    it('should remove the current session ID', () => {
      sessionStorage.setCurrentSessionId('test-session');
      expect(sessionStorage.getCurrentSessionId()).toBe('test-session');

      sessionStorage.clearCurrentSession();

      expect(sessionStorage.getCurrentSessionId()).toBeNull();
    });
  });

  describe('persistence verification', () => {
    it('should persist data that survives "page reload"', () => {
      const session = createNewSession('clinical');
      session.patientInfo.id = 'PERSIST-TEST';
      sessionStorage.saveSession(session);
      sessionStorage.setCurrentSessionId(session.id);

      const currentId = sessionStorage.getCurrentSessionId();
      const retrieved = sessionStorage.getSession(currentId!);

      expect(retrieved?.patientInfo.id).toBe('PERSIST-TEST');
    });
  });

  describe('data integrity', () => {
    it('should handle malformed JSON in localStorage gracefully', () => {
      window.localStorage.setItem(STORAGE_KEYS.SESSIONS, 'not valid json');

      expect(() => sessionStorage.getAllSessions()).not.toThrow();
      expect(sessionStorage.getAllSessions()).toEqual([]);
    });

    it('should handle empty object in localStorage', () => {
      window.localStorage.setItem(STORAGE_KEYS.SESSIONS, '{}');

      expect(sessionStorage.getAllSessions()).toEqual([]);
    });
  });
});

describe('sessionStorage - Edge Cases', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('should handle session with null analysisResults', () => {
    const session = createNewSession('clinical');
    session.analysisResults = null;

    sessionStorage.saveSession(session);
    const retrieved = sessionStorage.getSession(session.id);

    expect(retrieved?.analysisResults).toBeNull();
  });

  it('should handle session with complex nested data', () => {
    const session = createNewSession('clinical');
    session.assessment = {
      birads: 4,
      laterality: 'left',
      density: 'C',
      findings: [
        {
          id: 'f1',
          type: 'mass',
          location: 'UOQ',
          description: 'Irregular mass',
          birads: 4,
        },
      ],
      impression: 'Suspicious findings',
      recommendations: 'Biopsy recommended',
      notes: 'Follow up in 6 months',
    };

    sessionStorage.saveSession(session);
    const retrieved = sessionStorage.getSession(session.id);

    expect(retrieved?.assessment.birads).toBe(4);
    expect(retrieved?.assessment.findings.length).toBe(1);
    expect(retrieved?.assessment.findings[0].type).toBe('mass');
  });

  it('should preserve step enum values correctly', () => {
    const session = createNewSession('clinical');
    session.currentStep = WorkflowStep.ASSESSMENT;

    sessionStorage.saveSession(session);
    const retrieved = sessionStorage.getSession(session.id);

    expect(retrieved?.currentStep).toBe(WorkflowStep.ASSESSMENT);
    expect(retrieved?.currentStep).toBe(4);
  });
});
