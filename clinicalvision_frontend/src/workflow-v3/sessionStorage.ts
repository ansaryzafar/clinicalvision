/**
 * Session Storage - V3
 * 
 * This is the ONLY module that touches localStorage.
 * All session persistence goes through here.
 * 
 * Design Principles:
 * 1. Immediate persistence - no deferred saves
 * 2. Single source of truth for storage keys
 * 3. Graceful error handling for malformed data
 * 4. No business logic - just CRUD operations
 */

import { STORAGE_KEYS } from './constants';
import { WorkflowSession, isValidSession } from './types';

// Type for the sessions map in localStorage
type SessionsMap = Record<string, WorkflowSession>;

/**
 * Read all sessions from localStorage
 * Returns empty object if data is missing or malformed
 */
function readSessionsMap(): SessionsMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!raw) return {};
    
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    
    // Filter out invalid sessions
    const validSessions: SessionsMap = {};
    for (const [id, session] of Object.entries(parsed)) {
      if (isValidSession(session)) {
        validSessions[id] = session as WorkflowSession;
      }
    }
    
    return validSessions;
  } catch (error) {
    console.error('[sessionStorage] Error reading sessions:', error);
    return {};
  }
}

/**
 * Write sessions map to localStorage
 */
function writeSessionsMap(sessions: SessionsMap): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch (error) {
    console.error('[sessionStorage] Error writing sessions:', error);
    // In production, might want to show user notification
  }
}

/**
 * Session Storage API
 * 
 * All operations are synchronous and immediate.
 * No caching - always read from/write to localStorage directly.
 */
export const sessionStorage = {
  /**
   * Save a session to localStorage
   * Updates the updatedAt timestamp automatically
   */
  saveSession(session: WorkflowSession): void {
    const sessions = readSessionsMap();
    
    // Update timestamp
    const sessionToSave: WorkflowSession = {
      ...session,
      updatedAt: new Date().toISOString(),
    };
    
    sessions[session.id] = sessionToSave;
    writeSessionsMap(sessions);
  },

  /**
   * Get a session by ID
   * Returns null if not found
   */
  getSession(id: string): WorkflowSession | null {
    const sessions = readSessionsMap();
    return sessions[id] || null;
  },

  /**
   * Get all sessions, sorted by updatedAt descending (newest first)
   */
  getAllSessions(): WorkflowSession[] {
    const sessions = readSessionsMap();
    const sessionList = Object.values(sessions);
    
    // Sort by updatedAt descending
    return sessionList.sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });
  },

  /**
   * Delete a session by ID
   * No-op if session doesn't exist
   */
  deleteSession(id: string): void {
    const sessions = readSessionsMap();
    delete sessions[id];
    writeSessionsMap(sessions);
    
    // Also clear current session if it matches
    if (this.getCurrentSessionId() === id) {
      this.clearCurrentSession();
    }
  },

  /**
   * Get the current session ID
   * Returns null if not set
   */
  getCurrentSessionId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION_ID);
    } catch {
      return null;
    }
  },

  /**
   * Set the current session ID
   */
  setCurrentSessionId(id: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION_ID, id);
    } catch (error) {
      console.error('[sessionStorage] Error setting current session:', error);
    }
  },

  /**
   * Clear the current session ID
   */
  clearCurrentSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION_ID);
    } catch (error) {
      console.error('[sessionStorage] Error clearing current session:', error);
    }
  },

  /**
   * Clear all session data (for debugging/testing)
   */
  clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSIONS);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION_ID);
    } catch (error) {
      console.error('[sessionStorage] Error clearing all:', error);
    }
  },

  /**
   * Check if a session exists
   */
  hasSession(id: string): boolean {
    const sessions = readSessionsMap();
    return id in sessions;
  },

  /**
   * Get total session count
   */
  getSessionCount(): number {
    const sessions = readSessionsMap();
    return Object.keys(sessions).length;
  },
};

// Export type for the storage API
export type SessionStorageAPI = typeof sessionStorage;
