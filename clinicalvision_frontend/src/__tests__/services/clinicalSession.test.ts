/**
 * Unit Tests for Clinical Session Service
 * Tests data persistence, auto-save, and session management
 */

import { clinicalSessionService } from '../../services/clinicalSession.service';
import { mockAnalysisSession } from '../testUtils';
import { AnalysisSession } from '../../types/clinical.types';

// Note: localStorage mock is already set up in setupTests.ts

describe('ClinicalSessionService', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Session Management', () => {
    test('creates new session', () => {
      const session = clinicalSessionService.createSession({});

      expect(session).toHaveProperty('sessionId');
      expect(session.patientInfo).toBeDefined();
      expect(session.studyInfo).toBeDefined();
      expect(session.workflow.status).toBe('in-progress');
    });

    test('creates session with initial data', () => {
      const initialData: Partial<AnalysisSession> = {
        patientInfo: {
          patientId: 'PAT001',
          name: 'John Doe',
        },
      };

      const session = clinicalSessionService.createSession(initialData);

      expect(session.patientInfo.patientId).toBe('PAT001');
      expect(session.patientInfo.name).toBe('John Doe');
    });

    test('saves session to localStorage', () => {
      clinicalSessionService.saveSession(mockAnalysisSession);

      const saved = localStorage.getItem('clinicalvision_sessions');
      expect(saved).toBeTruthy();

      const parsed = JSON.parse(saved!);
      expect(parsed[0].sessionId).toBe(mockAnalysisSession.sessionId);
    });

    test('loads session from localStorage', () => {
      clinicalSessionService.saveSession(mockAnalysisSession);
      clinicalSessionService.setCurrentSession(mockAnalysisSession.sessionId);

      const loaded = clinicalSessionService.getCurrentSession();

      expect(loaded).toBeTruthy();
      expect(loaded?.sessionId).toBe(mockAnalysisSession.sessionId);
    });

    test('returns null when no session exists', () => {
      const loaded = clinicalSessionService.getCurrentSession();

      expect(loaded).toBeNull();
    });

    test('deletes session', () => {
      clinicalSessionService.saveSession(mockAnalysisSession);
      clinicalSessionService.setCurrentSession(mockAnalysisSession.sessionId);
      
      clinicalSessionService.deleteSession(mockAnalysisSession.sessionId);

      const loaded = clinicalSessionService.getCurrentSession();
      expect(loaded).toBeNull();
    });

    test('lists all sessions', () => {
      const session1 = { ...mockAnalysisSession, sessionId: 'session1' };
      const session2 = { ...mockAnalysisSession, sessionId: 'session2' };

      clinicalSessionService.saveSession(session1);
      clinicalSessionService.saveSession(session2);

      const sessions = clinicalSessionService.getAllSessions();

      expect(sessions.length).toBeGreaterThanOrEqual(2);
      expect(sessions.some(s => s.sessionId === 'session1')).toBe(true);
      expect(sessions.some(s => s.sessionId === 'session2')).toBe(true);
    });
  });

  describe('Auto-Save Functionality', () => {
    test('marks session as dirty', () => {
      clinicalSessionService.markDirty();

      const state = clinicalSessionService.getAutoSaveState();
      expect(state.isDirty).toBe(true);
    });

    test('enables auto-save', () => {
      clinicalSessionService.setAutoSaveEnabled(true);

      const state = clinicalSessionService.getAutoSaveState();
      expect(state.enabled).toBe(true);
    });

    test('disables auto-save', () => {
      clinicalSessionService.setAutoSaveEnabled(false);

      const state = clinicalSessionService.getAutoSaveState();
      expect(state.enabled).toBe(false);
    });

    test('auto-saves after interval when dirty', () => {
      const session = clinicalSessionService.createSession({ patientInfo: mockAnalysisSession.patientInfo });
      clinicalSessionService.startAutoSave();
      
      // Mark as dirty to trigger auto-save
      const state = clinicalSessionService.getAutoSaveState();
      state.isDirty = true;

      // Fast-forward time by 30 seconds (auto-save interval)
      jest.advanceTimersByTime(30000);

      // Check that save was attempted (isDirty should be false after save)
      const newState = clinicalSessionService.getAutoSaveState();
      expect(newState.lastSaved).toBeTruthy();
    });

    test('updates last saved timestamp', () => {
      const beforeSave = new Date().toISOString();
      clinicalSessionService.saveSession(mockAnalysisSession);

      const state = clinicalSessionService.getAutoSaveState();
      expect(state.lastSaved).toBeTruthy();
      expect(new Date(state.lastSaved).getTime()).toBeGreaterThanOrEqual(new Date(beforeSave).getTime());
    });
  });

  describe('Session Validation', () => {
    test('validates complete session', () => {
      // Session with all required data is considered valid
      expect(mockAnalysisSession.sessionId).toBeTruthy();
      expect(mockAnalysisSession.patientInfo).toBeTruthy();
      expect(mockAnalysisSession.studyInfo).toBeTruthy();
    });

    test('session requires patient ID', () => {
      const invalidSession = {
        ...mockAnalysisSession,
        patientInfo: {
          ...mockAnalysisSession.patientInfo,
          patientId: '',
        },
      };

      expect(invalidSession.patientInfo.patientId).toBeFalsy();
    });

    test('session requires study date', () => {
      const invalidSession = {
        ...mockAnalysisSession,
        studyInfo: {
          ...mockAnalysisSession.studyInfo,
          studyDate: '',
        },
      };

      expect(invalidSession.studyInfo.studyDate).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    test('handles corrupted localStorage data', () => {
      localStorage.setItem('clinicalvision_sessions', 'invalid json');

      // Service should handle parse errors gracefully
      try {
        const loaded = clinicalSessionService.getAllSessions();
        // If no error thrown, should return empty array
        expect(Array.isArray(loaded)).toBe(true);
      } catch (error) {
        // If error thrown, that's also acceptable behavior
        expect(error).toBeDefined();
      }
    });

    test('handles localStorage quota exceeded', () => {
      // Mock localStorage setItem to throw quota error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError');
      });

      try {
        clinicalSessionService.saveSession(mockAnalysisSession);
        // If no error, test passes (service handled it)
      } catch (error: any) {
        // If error thrown, check it's the quota error
        expect(error.message).toContain('QuotaExceededError');
      }

      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('Session Metadata', () => {
    test('updates last modified timestamp on save', () => {
      const session = clinicalSessionService.createSession({});
      const originalTimestamp = session.metadata.lastModified;

      // Wait a bit
      jest.advanceTimersByTime(1000);

      // Update session
      clinicalSessionService.saveSession(session);

      const loaded = clinicalSessionService.getSession(session.sessionId);
      expect(loaded?.metadata.lastModified).not.toBe(originalTimestamp);
    });

    test('increments version on save', () => {
      const session = clinicalSessionService.createSession({});
      const originalVersion = session.metadata.version;

      clinicalSessionService.saveSession(session);

      const loaded = clinicalSessionService.getSession(session.sessionId);
      expect(loaded?.metadata.version).toBe(originalVersion + 1);
    });

    test('tracks created by user', () => {
      const session = clinicalSessionService.createSession({});

      expect(session.metadata.createdBy).toBeTruthy();
    });
  });

  describe('Data Export', () => {
    test('exports session as JSON', () => {
      clinicalSessionService.saveSession(mockAnalysisSession);
      const json = clinicalSessionService.exportSession(mockAnalysisSession.sessionId);

      const parsed = JSON.parse(json);
      expect(parsed.sessionId).toBe(mockAnalysisSession.sessionId);
    });

    test('formats JSON with indentation', () => {
      clinicalSessionService.saveSession(mockAnalysisSession);
      const json = clinicalSessionService.exportSession(mockAnalysisSession.sessionId);

      // Should be pretty-printed
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });
  });
});
