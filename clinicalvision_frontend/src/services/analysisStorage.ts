/**
 * Analysis Storage Service
 * 
 * Handles saving and retrieving analysis results with patient ID and timestamp
 * Supports both local storage and backend API integration
 */

import { InferenceResponse } from './api';

export interface SavedAnalysis {
  id: string;
  patientId: string;
  timestamp: string;
  imageFileName: string;
  analysisResults: InferenceResponse;
  metadata: {
    savedBy?: string;
    deviceInfo?: string;
    browserInfo?: string;
  };
}

export interface AnalysisMetadata {
  id: string;
  patientId: string;
  timestamp: string;
  imageFileName: string;
  prediction: string;
  confidence: number;
  biRadsCategory?: string;
}

const STORAGE_KEY = 'clinicalvision_analyses';
const MAX_STORED_ANALYSES = 100; // Keep last 100 analyses

/**
 * Generate unique analysis ID
 */
export const generateAnalysisId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `ANALYSIS-${timestamp}-${random.toUpperCase()}`;
};

/**
 * Generate patient ID (if not provided)
 */
export const generatePatientId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7);
  return `PT-${timestamp}-${random.toUpperCase()}`;
};

/**
 * Format timestamp for display
 */
export const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

/**
 * Get device and browser information
 */
const getDeviceInfo = () => {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  
  return {
    deviceInfo: platform,
    browserInfo: userAgent.includes('Chrome') ? 'Chrome' :
                 userAgent.includes('Firefox') ? 'Firefox' :
                 userAgent.includes('Safari') ? 'Safari' :
                 userAgent.includes('Edge') ? 'Edge' : 'Unknown',
  };
};

/**
 * Save analysis to local storage
 */
export const saveAnalysisLocally = (
  patientId: string,
  imageFileName: string,
  analysisResults: InferenceResponse,
  analysisId?: string
): SavedAnalysis => {
  try {
    const id = analysisId || generateAnalysisId();
    const timestamp = new Date().toISOString();
    
    const savedAnalysis: SavedAnalysis = {
      id,
      patientId,
      timestamp,
      imageFileName,
      analysisResults,
      metadata: {
        ...getDeviceInfo(),
      },
    };
    
    // Get existing analyses
    const existing = getAllAnalyses();
    
    // Add new analysis at the beginning
    existing.unshift(savedAnalysis);
    
    // Keep only the last MAX_STORED_ANALYSES
    const trimmed = existing.slice(0, MAX_STORED_ANALYSES);
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    
    console.log(`✅ Analysis saved: ${id} for patient ${patientId}`);
    
    return savedAnalysis;
  } catch (error) {
    console.error('Failed to save analysis locally:', error);
    throw new Error('Failed to save analysis to local storage');
  }
};

/**
 * Get all saved analyses
 */
export const getAllAnalyses = (): SavedAnalysis[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    return JSON.parse(stored) as SavedAnalysis[];
  } catch (error) {
    console.error('Failed to retrieve analyses:', error);
    return [];
  }
};

/**
 * Get analyses metadata (lightweight list)
 */
export const getAnalysesMetadata = (): AnalysisMetadata[] => {
  const analyses = getAllAnalyses();
  
  return analyses.map(analysis => ({
    id: analysis.id,
    patientId: analysis.patientId,
    timestamp: analysis.timestamp,
    imageFileName: analysis.imageFileName,
    prediction: analysis.analysisResults.prediction,
    confidence: analysis.analysisResults.confidence,
    biRadsCategory: undefined, // Can be calculated from prediction and confidence
  }));
};

/**
 * Get analysis by ID
 */
export const getAnalysisById = (id: string): SavedAnalysis | null => {
  const analyses = getAllAnalyses();
  return analyses.find(analysis => analysis.id === id) || null;
};

/**
 * Get analyses by patient ID
 */
export const getAnalysesByPatientId = (patientId: string): SavedAnalysis[] => {
  const analyses = getAllAnalyses();
  return analyses.filter(analysis => analysis.patientId === patientId);
};

/**
 * Delete analysis by ID
 */
export const deleteAnalysis = (id: string): boolean => {
  try {
    const analyses = getAllAnalyses();
    const filtered = analyses.filter(analysis => analysis.id !== id);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    console.log(`🗑️ Analysis deleted: ${id}`);
    
    return true;
  } catch (error) {
    console.error('Failed to delete analysis:', error);
    return false;
  }
};

/**
 * Clear all saved analyses
 */
export const clearAllAnalyses = (): boolean => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ All analyses cleared');
    return true;
  } catch (error) {
    console.error('Failed to clear analyses:', error);
    return false;
  }
};

/**
 * Export analysis as JSON file
 */
export const exportAnalysisAsJson = (analysis: SavedAnalysis): void => {
  try {
    const dataStr = JSON.stringify(analysis, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `analysis-${analysis.patientId}-${analysis.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    console.log(`📥 Analysis exported: ${analysis.id}`);
  } catch (error) {
    console.error('Failed to export analysis:', error);
    throw new Error('Failed to export analysis as JSON');
  }
};

/**
 * Export all analyses as JSON file
 */
export const exportAllAnalysesAsJson = (): void => {
  try {
    const analyses = getAllAnalyses();
    const dataStr = JSON.stringify(analyses, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const timestamp = new Date().toISOString().split('T')[0];
    const link = document.createElement('a');
    link.href = url;
    link.download = `clinicalvision-analyses-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    console.log(`📥 All analyses exported (${analyses.length} items)`);
  } catch (error) {
    console.error('Failed to export all analyses:', error);
    throw new Error('Failed to export analyses');
  }
};

/**
 * Get storage statistics
 */
export const getStorageStats = () => {
  const analyses = getAllAnalyses();
  const totalSize = new Blob([localStorage.getItem(STORAGE_KEY) || '']).size;
  
  return {
    totalAnalyses: analyses.length,
    storageSize: (totalSize / 1024).toFixed(2) + ' KB',
    oldestAnalysis: analyses.length > 0 ? analyses[analyses.length - 1].timestamp : null,
    newestAnalysis: analyses.length > 0 ? analyses[0].timestamp : null,
  };
};

/**
 * Validate patient ID format
 */
export const isValidPatientId = (patientId: string): boolean => {
  // Allow various formats:
  // PT-XXXXX, XXX-XXX-XXXX, or any alphanumeric with dashes
  const pattern = /^[A-Z0-9-]{3,50}$/;
  return pattern.test(patientId);
};

/**
 * Save analysis to backend API (optional)
 */
export const saveAnalysisToBackend = async (
  analysis: SavedAnalysis
): Promise<boolean> => {
  try {
    // TODO: Implement backend API call when ready
    // const response = await api.post('/api/v1/analyses', analysis);
    console.log('⚠️ Backend save not implemented yet');
    return false;
  } catch (error) {
    console.error('Failed to save analysis to backend:', error);
    return false;
  }
};
