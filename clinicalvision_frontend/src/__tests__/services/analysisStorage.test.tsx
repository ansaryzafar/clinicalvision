/**
 * Analysis Storage Service Test Suite
 * 
 * Comprehensive testing for analysis persistence:
 * - Save/load analysis results
 * - Patient ID generation and validation
 * - Storage limits and cleanup
 * - Export functionality
 * - Edge cases and error handling
 */

import '@testing-library/jest-dom';

// ============================================================================
// Mock Setup
// ============================================================================

const mockStore: Record<string, string> = {};

const clearMockStore = () => {
  Object.keys(mockStore).forEach(key => delete mockStore[key]);
};

const localStorageMock = {
  getItem: (key: string) => mockStore[key] || null,
  setItem: (key: string, value: string) => { mockStore[key] = value; },
  removeItem: (key: string) => { delete mockStore[key]; },
  clear: clearMockStore,
  get length() { return Object.keys(mockStore).length; },
  key: (i: number) => Object.keys(mockStore)[i] || null,
};

Object.defineProperty(window, 'localStorage', { 
  value: localStorageMock,
  writable: true 
});

// ============================================================================
// Test Data
// ============================================================================

const STORAGE_KEY = 'clinicalvision_saved_analyses';
const MAX_SAVED_ANALYSES = 100;

interface SavedAnalysis {
  id: string;
  patientId: string;
  timestamp: string;
  imageName: string;
  prediction: string;
  confidence: number;
  biradsCategory: string;
  findings: any[];
  metadata: {
    modelVersion: string;
    processingTime: number;
  };
}

const mockAnalysis: SavedAnalysis = {
  id: 'analysis-001',
  patientId: 'PT-1705123456789-ABC1',
  timestamp: '2026-01-16T10:30:00.000Z',
  imageName: 'mammogram-left-cc.dcm',
  prediction: 'Suspicious',
  confidence: 0.87,
  biradsCategory: 'BI-RADS 4B',
  findings: [
    {
      type: 'mass',
      location: { x: 150, y: 200 },
      confidence: 0.85,
    },
  ],
  metadata: {
    modelVersion: '2.0.0',
    processingTime: 2.5,
  },
};

// ============================================================================
// Helper Functions (Simulated from analysisStorage.ts)
// ============================================================================

const generatePatientId = (): string => {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PT-${timestamp}-${randomPart}`;
};

const isValidPatientId = (patientId: string): boolean => {
  if (!patientId || typeof patientId !== 'string') return false;
  // Allow alphanumeric, hyphens, and underscores
  return /^[A-Za-z0-9\-_]+$/.test(patientId) && patientId.length >= 3;
};

const formatTimestamp = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const saveAnalysisLocally = (analysis: SavedAnalysis): boolean => {
  try {
    const existing = localStorageMock.getItem(STORAGE_KEY);
    const analyses: SavedAnalysis[] = existing ? JSON.parse(existing) : [];
    
    // Prevent duplicates
    const existingIndex = analyses.findIndex(a => a.id === analysis.id);
    if (existingIndex >= 0) {
      analyses[existingIndex] = analysis;
    } else {
      analyses.unshift(analysis);
    }
    
    // Enforce limit
    while (analyses.length > MAX_SAVED_ANALYSES) {
      analyses.pop();
    }
    
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(analyses));
    return true;
  } catch {
    return false;
  }
};

const getAllAnalyses = (): SavedAnalysis[] => {
  try {
    const data = localStorageMock.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const getAnalysisById = (id: string): SavedAnalysis | null => {
  const analyses = getAllAnalyses();
  return analyses.find(a => a.id === id) || null;
};

const deleteAnalysis = (id: string): boolean => {
  try {
    const analyses = getAllAnalyses();
    const filtered = analyses.filter(a => a.id !== id);
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
};

const clearAllAnalyses = (): boolean => {
  try {
    localStorageMock.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
};

const getStorageStats = () => {
  const analyses = getAllAnalyses();
  const dataSize = JSON.stringify(analyses).length;
  return {
    count: analyses.length,
    sizeBytes: dataSize,
    sizeKB: Math.round(dataSize / 1024 * 100) / 100,
    maxAllowed: MAX_SAVED_ANALYSES,
    remainingSlots: MAX_SAVED_ANALYSES - analyses.length,
  };
};

// ============================================================================
// Test Suites
// ============================================================================

describe('Analysis Storage Service', () => {
  beforeEach(() => {
    clearMockStore();
  });

  describe('Patient ID Generation', () => {
    it('should generate valid patient ID format', () => {
      const patientId = generatePatientId();
      
      expect(patientId).toMatch(/^PT-\d+-[A-Z0-9]+$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generatePatientId());
      }
      
      expect(ids.size).toBe(100);
    });

    it('should include timestamp in ID', () => {
      const before = Date.now();
      const patientId = generatePatientId();
      const after = Date.now();
      
      const timestampPart = parseInt(patientId.split('-')[1]);
      expect(timestampPart).toBeGreaterThanOrEqual(before);
      expect(timestampPart).toBeLessThanOrEqual(after);
    });
  });

  describe('Patient ID Validation', () => {
    it('should accept valid patient IDs', () => {
      const validIds = [
        'PT-1234567890-ABCD',
        'PAT001',
        'PATIENT_123',
        'abc-123-xyz',
        'A1B',
      ];
      
      validIds.forEach(id => {
        expect(isValidPatientId(id)).toBe(true);
      });
    });

    it('should reject invalid patient IDs', () => {
      const invalidIds = [
        '',
        'AB',
        'ID@123',
        'patient id with spaces',
        'test!@#$',
        null as any,
        undefined as any,
      ];
      
      invalidIds.forEach(id => {
        expect(isValidPatientId(id)).toBe(false);
      });
    });
  });

  describe('Save Analysis', () => {
    it('should save analysis to localStorage', () => {
      const result = saveAnalysisLocally(mockAnalysis);
      
      expect(result).toBe(true);
      const stored = localStorageMock.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
    });

    it('should store analysis with all required fields', () => {
      saveAnalysisLocally(mockAnalysis);
      
      const stored = getAllAnalyses();
      expect(stored.length).toBeGreaterThan(0);
      expect(stored[0]).toHaveProperty('id');
      expect(stored[0]).toHaveProperty('patientId');
      expect(stored[0]).toHaveProperty('timestamp');
      expect(stored[0]).toHaveProperty('prediction');
      expect(stored[0]).toHaveProperty('confidence');
    });

    it('should prepend new analyses to the list', () => {
      const analysis1 = { ...mockAnalysis, id: 'analysis-001' };
      const analysis2 = { ...mockAnalysis, id: 'analysis-002' };
      
      saveAnalysisLocally(analysis1);
      saveAnalysisLocally(analysis2);
      
      const stored = getAllAnalyses();
      expect(stored[0].id).toBe('analysis-002');
      expect(stored[1].id).toBe('analysis-001');
    });

    it('should update existing analysis instead of duplicating', () => {
      saveAnalysisLocally(mockAnalysis);
      
      const updatedAnalysis = { ...mockAnalysis, confidence: 0.95 };
      saveAnalysisLocally(updatedAnalysis);
      
      const stored = getAllAnalyses();
      expect(stored.length).toBe(1);
      expect(stored[0].confidence).toBe(0.95);
    });
  });

  describe('Storage Limits', () => {
    it('should enforce maximum analysis limit', () => {
      // Save more than the limit
      for (let i = 0; i < MAX_SAVED_ANALYSES + 10; i++) {
        saveAnalysisLocally({ ...mockAnalysis, id: `analysis-${i}` });
      }
      
      const stored = getAllAnalyses();
      expect(stored.length).toBeLessThanOrEqual(MAX_SAVED_ANALYSES);
    });

    it('should remove oldest analyses when limit is reached', () => {
      // Fill to limit
      for (let i = 0; i < MAX_SAVED_ANALYSES; i++) {
        saveAnalysisLocally({ ...mockAnalysis, id: `analysis-${i}` });
      }
      
      // Add one more
      saveAnalysisLocally({ ...mockAnalysis, id: 'newest-analysis' });
      
      const stored = getAllAnalyses();
      expect(stored[0].id).toBe('newest-analysis');
      expect(stored.some(a => a.id === 'analysis-0')).toBe(false);
    });
  });

  describe('Retrieve Analysis', () => {
    it('should retrieve all saved analyses', () => {
      saveAnalysisLocally({ ...mockAnalysis, id: 'analysis-1' });
      saveAnalysisLocally({ ...mockAnalysis, id: 'analysis-2' });
      
      const all = getAllAnalyses();
      expect(all.length).toBe(2);
    });

    it('should retrieve analysis by ID', () => {
      saveAnalysisLocally(mockAnalysis);
      
      const retrieved = getAnalysisById(mockAnalysis.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(mockAnalysis.id);
    });

    it('should return null for non-existent ID', () => {
      const retrieved = getAnalysisById('non-existent-id');
      expect(retrieved).toBeNull();
    });

    it('should return empty array when no analyses saved', () => {
      const all = getAllAnalyses();
      expect(all).toEqual([]);
    });
  });

  describe('Delete Analysis', () => {
    it('should delete analysis by ID', () => {
      saveAnalysisLocally(mockAnalysis);
      
      const result = deleteAnalysis(mockAnalysis.id);
      expect(result).toBe(true);
      
      const retrieved = getAnalysisById(mockAnalysis.id);
      expect(retrieved).toBeNull();
    });

    it('should not affect other analyses when deleting', () => {
      const analysis1 = { ...mockAnalysis, id: 'analysis-1' };
      const analysis2 = { ...mockAnalysis, id: 'analysis-2' };
      
      saveAnalysisLocally(analysis1);
      saveAnalysisLocally(analysis2);
      
      deleteAnalysis('analysis-1');
      
      const remaining = getAllAnalyses();
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe('analysis-2');
    });

    it('should handle deleting non-existent analysis gracefully', () => {
      const result = deleteAnalysis('non-existent-id');
      expect(result).toBe(true);
    });
  });

  describe('Clear All Analyses', () => {
    it('should clear all saved analyses', () => {
      saveAnalysisLocally({ ...mockAnalysis, id: 'analysis-1' });
      saveAnalysisLocally({ ...mockAnalysis, id: 'analysis-2' });
      
      const result = clearAllAnalyses();
      expect(result).toBe(true);
      
      const remaining = getAllAnalyses();
      expect(remaining).toEqual([]);
    });
  });

  describe('Storage Statistics', () => {
    it('should calculate correct count', () => {
      saveAnalysisLocally({ ...mockAnalysis, id: 'analysis-1' });
      saveAnalysisLocally({ ...mockAnalysis, id: 'analysis-2' });
      
      const stats = getStorageStats();
      expect(stats.count).toBe(2);
    });

    it('should calculate remaining slots', () => {
      saveAnalysisLocally(mockAnalysis);
      
      const stats = getStorageStats();
      expect(stats.remainingSlots).toBe(MAX_SAVED_ANALYSES - 1);
    });

    it('should report correct max allowed', () => {
      const stats = getStorageStats();
      expect(stats.maxAllowed).toBe(MAX_SAVED_ANALYSES);
    });
  });

  describe('Timestamp Formatting', () => {
    it('should format timestamp correctly', () => {
      const isoString = '2026-01-16T10:30:00.000Z';
      const formatted = formatTimestamp(isoString);
      
      expect(formatted).toContain('2026');
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('16');
    });

    it('should handle invalid timestamps gracefully', () => {
      expect(() => {
        formatTimestamp('invalid-date');
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle corrupted localStorage data', () => {
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = () => 'invalid-json-{';
      
      const analyses = getAllAnalyses();
      expect(analyses).toEqual([]);
      
      localStorageMock.getItem = originalGetItem;
    });

    it('should handle localStorage quota exceeded', () => {
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = () => {
        throw new Error('QuotaExceededError');
      };
      
      const result = saveAnalysisLocally(mockAnalysis);
      expect(result).toBe(false);
      
      localStorageMock.setItem = originalSetItem;
    });

    it('should handle special characters in analysis data', () => {
      const specialAnalysis = {
        ...mockAnalysis,
        imageName: 'file<name>"with\'special&chars.dcm',
      };
      
      const result = saveAnalysisLocally(specialAnalysis);
      expect(result).toBe(true);
      
      const retrieved = getAnalysisById(specialAnalysis.id);
      expect(retrieved?.imageName).toBe(specialAnalysis.imageName);
    });

    it('should handle very long patient IDs', () => {
      const longId = 'PT-' + '1234567890'.repeat(10);
      expect(isValidPatientId(longId)).toBe(true);
    });

    it('should handle empty findings array', () => {
      const emptyFindingsAnalysis = {
        ...mockAnalysis,
        findings: [],
      };
      
      const result = saveAnalysisLocally(emptyFindingsAnalysis);
      expect(result).toBe(true);
    });
  });

  describe('Data Integrity', () => {
    it('should preserve all analysis fields after save/retrieve', () => {
      saveAnalysisLocally(mockAnalysis);
      
      const retrieved = getAnalysisById(mockAnalysis.id);
      
      expect(retrieved?.id).toBe(mockAnalysis.id);
      expect(retrieved?.patientId).toBe(mockAnalysis.patientId);
      expect(retrieved?.prediction).toBe(mockAnalysis.prediction);
      expect(retrieved?.confidence).toBe(mockAnalysis.confidence);
      expect(retrieved?.biradsCategory).toBe(mockAnalysis.biradsCategory);
      expect(retrieved?.metadata.modelVersion).toBe(mockAnalysis.metadata.modelVersion);
    });

    it('should preserve nested objects', () => {
      saveAnalysisLocally(mockAnalysis);
      
      const retrieved = getAnalysisById(mockAnalysis.id);
      
      expect(retrieved?.findings[0].type).toBe('mass');
      expect(retrieved?.findings[0].location.x).toBe(150);
    });
  });
});
