/**
 * DiagnosticWorkstation Session Management Test Suite
 * 
 * Tests session restore and management:
 * - Session restoration from storedAnalysisResults
 * - Image preview restoration
 * - Double-restore prevention
 * - Pending session data processing
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { InferenceResponse } from '../../services/api';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock localStorage
const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] || null,
  setItem: (key: string, value: string) => { localStorageStore[key] = value; },
  removeItem: (key: string) => { delete localStorageStore[key]; },
  clear: () => Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ============================================================================
// Test Data
// ============================================================================

interface StoredAnalysisResult {
  prediction: 'benign' | 'malignant';
  confidence: number;
  probabilities: { benign: number; malignant: number };
  riskLevel: 'low' | 'moderate' | 'high';
  processingTimeMs: number;
  modelVersion?: string;
  explanation?: any;
  analyzedAt: string;
}

interface ImageMetadata {
  imageId: string;
  fileName: string;
  fileSize: number;
  uploadDate: string;
  viewType: string;
  laterality: string;
  imageDataUrl?: string;
  thumbnail?: string;
  analyzed: boolean;
}

interface MockSession {
  sessionId: string;
  storedAnalysisResults?: StoredAnalysisResult;
  images?: ImageMetadata[];
  workflow: {
    mode: 'quick' | 'clinical';
    currentStep: number;
    completedSteps: number[];
    status: string;
    startedAt: string;
  };
}

const mockStoredAnalysisResults: StoredAnalysisResult = {
  prediction: 'benign',
  confidence: 0.92,
  probabilities: { benign: 0.92, malignant: 0.08 },
  riskLevel: 'low',
  processingTimeMs: 1234,
  modelVersion: 'v12',
  explanation: { suspicious_regions: [] },
  analyzedAt: '2026-01-15T10:30:00.000Z',
};

const mockImageWithDataUrl: ImageMetadata = {
  imageId: 'img_001',
  fileName: 'mammogram.png',
  fileSize: 1024000,
  uploadDate: '2026-01-15T10:00:00.000Z',
  viewType: 'CC',
  laterality: 'L',
  imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...',
  thumbnail: 'data:image/jpeg;base64,/9j/4AAQSkZJRgAB...',
  analyzed: true,
};

const mockImageWithThumbnailOnly: ImageMetadata = {
  imageId: 'img_002',
  fileName: 'mammogram2.png',
  fileSize: 2048000,
  uploadDate: '2026-01-15T11:00:00.000Z',
  viewType: 'MLO',
  laterality: 'R',
  thumbnail: 'data:image/jpeg;base64,/9j/4AAQSkZJRgAB...',
  analyzed: true,
};

const mockSessionWithResults: MockSession = {
  sessionId: 'session_test_001',
  storedAnalysisResults: mockStoredAnalysisResults,
  images: [mockImageWithDataUrl],
  workflow: {
    mode: 'clinical',
    currentStep: 2,
    completedSteps: [0, 1],
    status: 'in-progress',
    startedAt: '2026-01-15T10:00:00.000Z',
  },
};

// ============================================================================
// Session Restore Logic (Extracted for Testing)
// ============================================================================

class SessionRestoreManager {
  private restoredSessionIdRef: string | null = null;
  private analysisResults: InferenceResponse | null = null;
  private restoredImagePreview: string | null = null;
  private isRestoredSession: boolean = false;

  /**
   * Check if session should be restored
   */
  shouldRestoreSession(
    currentSession: MockSession | null,
    existingAnalysisResults: InferenceResponse | null
  ): boolean {
    if (!currentSession) return false;
    
    const sessionId = currentSession.sessionId;
    const hasStoredResults = !!currentSession.storedAnalysisResults;
    const alreadyRestored = this.restoredSessionIdRef === sessionId;
    const hasAnalysisResults = !!existingAnalysisResults;

    return sessionId && hasStoredResults && !alreadyRestored && !hasAnalysisResults;
  }

  /**
   * Restore session analysis results
   */
  restoreSession(currentSession: MockSession): {
    analysisResults: InferenceResponse;
    imagePreview: string | null;
  } {
    if (!currentSession.storedAnalysisResults) {
      throw new Error('No stored results to restore');
    }

    // Mark session as restored
    this.restoredSessionIdRef = currentSession.sessionId;
    this.isRestoredSession = true;

    // Convert stored results to InferenceResponse format
    const restoredResults: InferenceResponse = {
      prediction: currentSession.storedAnalysisResults.prediction,
      confidence: currentSession.storedAnalysisResults.confidence,
      probabilities: currentSession.storedAnalysisResults.probabilities,
      risk_level: currentSession.storedAnalysisResults.riskLevel,
      inference_time_ms: currentSession.storedAnalysisResults.processingTimeMs,
      model_version: currentSession.storedAnalysisResults.modelVersion || 'v12',
      explanation: currentSession.storedAnalysisResults.explanation || { suspicious_regions: [] },
    } as unknown as InferenceResponse;

    this.analysisResults = restoredResults;

    // Restore image preview
    let imagePreview: string | null = null;
    const primaryImage = currentSession.images?.[0];
    
    if (primaryImage?.imageDataUrl) {
      imagePreview = primaryImage.imageDataUrl;
    } else if (primaryImage?.thumbnail) {
      imagePreview = primaryImage.thumbnail;
    }

    this.restoredImagePreview = imagePreview;

    return { analysisResults: restoredResults, imagePreview };
  }

  /**
   * Get current state
   */
  getState() {
    return {
      restoredSessionId: this.restoredSessionIdRef,
      analysisResults: this.analysisResults,
      restoredImagePreview: this.restoredImagePreview,
      isRestoredSession: this.isRestoredSession,
    };
  }

  /**
   * Reset for new analysis
   */
  reset() {
    this.restoredSessionIdRef = null;
    this.analysisResults = null;
    this.restoredImagePreview = null;
    this.isRestoredSession = false;
  }
}

// ============================================================================
// Pending Session Data Manager (Tests the ref pattern)
// ============================================================================

interface PendingSessionData {
  results: InferenceResponse;
  file: File;
  imageDataUrl?: string;
  thumbnail?: string;
}

class PendingSessionDataManager {
  private pendingData: PendingSessionData | null = null;
  private processedSessionIds: Set<string> = new Set();

  setPendingData(data: PendingSessionData) {
    this.pendingData = data;
  }

  getPendingData(): PendingSessionData | null {
    return this.pendingData;
  }

  /**
   * Process pending data when session becomes available
   */
  processPendingData(sessionId: string): PendingSessionData | null {
    if (!this.pendingData) return null;
    if (this.processedSessionIds.has(sessionId)) return null;

    const data = this.pendingData;
    this.pendingData = null; // Clear immediately
    this.processedSessionIds.add(sessionId);
    
    return data;
  }

  hasPendingData(): boolean {
    return this.pendingData !== null;
  }

  wasProcessed(sessionId: string): boolean {
    return this.processedSessionIds.has(sessionId);
  }

  reset() {
    this.pendingData = null;
    this.processedSessionIds.clear();
  }
}

// ============================================================================
// Test Suites
// ============================================================================

describe('SessionRestoreManager', () => {
  let manager: SessionRestoreManager;

  beforeEach(() => {
    manager = new SessionRestoreManager();
  });

  describe('shouldRestoreSession', () => {
    test('returns true when session has stored results and not yet restored', () => {
      const result = manager.shouldRestoreSession(mockSessionWithResults, null);
      expect(result).toBe(true);
    });

    test('returns false when no current session', () => {
      const result = manager.shouldRestoreSession(null, null);
      expect(result).toBe(false);
    });

    test('returns false when no stored results', () => {
      const sessionWithoutResults: MockSession = {
        ...mockSessionWithResults,
        storedAnalysisResults: undefined,
      };
      
      const result = manager.shouldRestoreSession(sessionWithoutResults, null);
      expect(result).toBe(false);
    });

    test('returns false when already restored same session', () => {
      // First restore
      manager.restoreSession(mockSessionWithResults);
      
      // Check again
      const result = manager.shouldRestoreSession(mockSessionWithResults, null);
      expect(result).toBe(false);
    });

    test('returns false when analysis results already exist', () => {
      const existingResults: InferenceResponse = {
        prediction: 'malignant',
        confidence: 0.85,
        probabilities: { benign: 0.15, malignant: 0.85 },
        risk_level: 'high',
        inference_time_ms: 2000,
        model_version: 'v12',
      } as unknown as InferenceResponse;
      
      const result = manager.shouldRestoreSession(mockSessionWithResults, existingResults);
      expect(result).toBe(false);
    });

    test('returns true for different session after one was restored', () => {
      // Restore first session
      manager.restoreSession(mockSessionWithResults);
      
      // Check different session
      const differentSession: MockSession = {
        ...mockSessionWithResults,
        sessionId: 'session_test_002',
      };
      
      const result = manager.shouldRestoreSession(differentSession, null);
      expect(result).toBe(true);
    });
  });

  describe('restoreSession', () => {
    test('restores analysis results with correct format', () => {
      const { analysisResults } = manager.restoreSession(mockSessionWithResults);
      
      expect(analysisResults.prediction).toBe('benign');
      expect(analysisResults.confidence).toBe(0.92);
      expect(analysisResults.probabilities).toEqual({ benign: 0.92, malignant: 0.08 });
      expect(analysisResults.risk_level).toBe('low');
      expect(analysisResults.inference_time_ms).toBe(1234);
      expect(analysisResults.model_version).toBe('v12');
    });

    test('restores image preview from imageDataUrl', () => {
      const { imagePreview } = manager.restoreSession(mockSessionWithResults);
      
      expect(imagePreview).toBe(mockImageWithDataUrl.imageDataUrl);
    });

    test('falls back to thumbnail when imageDataUrl missing', () => {
      const sessionWithThumbnailOnly: MockSession = {
        ...mockSessionWithResults,
        images: [mockImageWithThumbnailOnly],
      };
      
      const { imagePreview } = manager.restoreSession(sessionWithThumbnailOnly);
      
      expect(imagePreview).toBe(mockImageWithThumbnailOnly.thumbnail);
    });

    test('returns null imagePreview when no images', () => {
      const sessionWithoutImages: MockSession = {
        ...mockSessionWithResults,
        images: [],
      };
      
      const { imagePreview } = manager.restoreSession(sessionWithoutImages);
      
      expect(imagePreview).toBeNull();
    });

    test('marks session as restored', () => {
      manager.restoreSession(mockSessionWithResults);
      
      const state = manager.getState();
      expect(state.isRestoredSession).toBe(true);
      expect(state.restoredSessionId).toBe('session_test_001');
    });

    test('throws error when no stored results', () => {
      const sessionWithoutResults: MockSession = {
        ...mockSessionWithResults,
        storedAnalysisResults: undefined,
      };
      
      expect(() => manager.restoreSession(sessionWithoutResults)).toThrow();
    });
  });

  describe('reset', () => {
    test('clears all state', () => {
      manager.restoreSession(mockSessionWithResults);
      manager.reset();
      
      const state = manager.getState();
      expect(state.restoredSessionId).toBeNull();
      expect(state.analysisResults).toBeNull();
      expect(state.restoredImagePreview).toBeNull();
      expect(state.isRestoredSession).toBe(false);
    });

    test('allows restoration of same session after reset', () => {
      manager.restoreSession(mockSessionWithResults);
      manager.reset();
      
      const shouldRestore = manager.shouldRestoreSession(mockSessionWithResults, null);
      expect(shouldRestore).toBe(true);
    });
  });
});

describe('PendingSessionDataManager', () => {
  let manager: PendingSessionDataManager;

  const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
  const mockResults: InferenceResponse = {
    prediction: 'benign',
    confidence: 0.9,
    probabilities: { benign: 0.9, malignant: 0.1 },
    risk_level: 'low',
    inference_time_ms: 1000,
    model_version: 'v12',
  } as unknown as InferenceResponse;

  beforeEach(() => {
    manager = new PendingSessionDataManager();
  });

  describe('setPendingData', () => {
    test('stores pending data', () => {
      manager.setPendingData({
        results: mockResults,
        file: mockFile,
        imageDataUrl: 'data:image/png;base64,...',
      });
      
      expect(manager.hasPendingData()).toBe(true);
    });

    test('getPendingData returns stored data', () => {
      const data = {
        results: mockResults,
        file: mockFile,
        imageDataUrl: 'data:image/png;base64,...',
      };
      
      manager.setPendingData(data);
      
      expect(manager.getPendingData()).toEqual(data);
    });
  });

  describe('processPendingData', () => {
    test('returns pending data and clears it', () => {
      const data = {
        results: mockResults,
        file: mockFile,
      };
      
      manager.setPendingData(data);
      const processed = manager.processPendingData('session_001');
      
      expect(processed).toEqual(data);
      expect(manager.hasPendingData()).toBe(false);
    });

    test('returns null when no pending data', () => {
      const processed = manager.processPendingData('session_001');
      
      expect(processed).toBeNull();
    });

    test('prevents double processing', () => {
      manager.setPendingData({
        results: mockResults,
        file: mockFile,
      });
      
      manager.processPendingData('session_001');
      
      // Set new pending data
      manager.setPendingData({
        results: mockResults,
        file: mockFile,
      });
      
      // Try to process same session again
      const result = manager.processPendingData('session_001');
      
      expect(result).toBeNull();
      expect(manager.wasProcessed('session_001')).toBe(true);
    });

    test('allows processing different sessions', () => {
      manager.setPendingData({ results: mockResults, file: mockFile });
      manager.processPendingData('session_001');
      
      manager.setPendingData({ results: mockResults, file: mockFile });
      const result = manager.processPendingData('session_002');
      
      expect(result).not.toBeNull();
    });
  });

  describe('reset', () => {
    test('clears pending data and processed sessions', () => {
      manager.setPendingData({ results: mockResults, file: mockFile });
      manager.processPendingData('session_001');
      manager.reset();
      
      expect(manager.hasPendingData()).toBe(false);
      expect(manager.wasProcessed('session_001')).toBe(false);
    });
  });
});

describe('Session Restore Integration', () => {
  test('complete workflow: upload -> save -> restore', () => {
    const restoreManager = new SessionRestoreManager();
    const pendingManager = new PendingSessionDataManager();
    const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
    const mockResults: InferenceResponse = {
      prediction: 'malignant',
      confidence: 0.87,
      probabilities: { benign: 0.13, malignant: 0.87 },
      risk_level: 'high',
      inference_time_ms: 1500,
      model_version: 'v12',
    } as unknown as InferenceResponse;

    // Step 1: Upload and analysis complete
    pendingManager.setPendingData({
      results: mockResults,
      file: mockFile,
      imageDataUrl: 'data:image/png;base64,...',
    });

    // Step 2: Session becomes available
    const pendingData = pendingManager.processPendingData('session_new');
    expect(pendingData).not.toBeNull();

    // Step 3: Create stored results
    const storedResults: StoredAnalysisResult = {
      prediction: pendingData!.results.prediction as 'benign' | 'malignant',
      confidence: pendingData!.results.confidence,
      probabilities: pendingData!.results.probabilities,
      riskLevel: pendingData!.results.risk_level as 'low' | 'moderate' | 'high',
      processingTimeMs: pendingData!.results.inference_time_ms,
      modelVersion: pendingData!.results.model_version,
      analyzedAt: new Date().toISOString(),
    };

    // Step 4: Create session with stored results
    const savedSession: MockSession = {
      sessionId: 'session_new',
      storedAnalysisResults: storedResults,
      images: [{
        imageId: 'img_new',
        fileName: mockFile.name,
        fileSize: mockFile.size,
        uploadDate: new Date().toISOString(),
        viewType: 'CC',
        laterality: 'L',
        imageDataUrl: pendingData!.imageDataUrl,
        analyzed: true,
      }],
      workflow: {
        mode: 'clinical',
        currentStep: 1,
        completedSteps: [0],
        status: 'in-progress',
        startedAt: new Date().toISOString(),
      },
    };

    // Step 5: Later - restore session
    const shouldRestore = restoreManager.shouldRestoreSession(savedSession, null);
    expect(shouldRestore).toBe(true);

    const { analysisResults, imagePreview } = restoreManager.restoreSession(savedSession);
    
    expect(analysisResults.prediction).toBe('malignant');
    expect(analysisResults.confidence).toBe(0.87);
    expect(imagePreview).toBe('data:image/png;base64,...');
  });
});
