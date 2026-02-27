/**
 * useSettings Hook - Global Application Settings
 * 
 * Provides centralized settings management that persists to localStorage
 * and can be consumed by any component in the application.
 * 
 * Based on Paton et al. 2021 (J Med Internet Res):
 * - Settings should have clear, immediate effects
 * - Changes should maintain system predictability
 * - User control should be obvious and reversible
 * 
 * Based on Nielsen's Heuristic #3 (User Control & Freedom):
 * - Easy to change/revert settings
 * - Clear feedback on what each setting does
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Application Settings Interface
 * Each setting is documented with its purpose and effect
 */
export interface AppSettings {
  // ===================
  // DISPLAY SETTINGS
  // ===================
  /** Theme mode: light or dark */
  theme: 'light' | 'dark';
  
  /** High contrast mode for better accessibility */
  highContrastMode: boolean;
  
  /** Enable smooth animations (disable for motion sensitivity) */
  enableAnimations: boolean;

  // ===================
  // ANALYSIS BEHAVIOR
  // ===================
  /** Automatically start AI analysis when image is uploaded */
  autoAnalyzeOnUpload: boolean;
  
  /** Show AI attention heatmap overlay on images */
  showAttentionHeatmap: boolean;
  
  /** Default opacity for heatmap overlay (0-100) */
  defaultHeatmapOpacity: number;
  
  /** Minimum confidence level (%) for flagging findings */
  defaultConfidenceThreshold: number;
  
  /** Show detailed analysis metrics panel */
  showDetailedMetrics: boolean;

  // ===================
  // WORKFLOW PREFERENCES  
  // ===================
  /** Auto-save analysis sessions to prevent data loss */
  autoSaveSession: boolean;
  
  /** Auto-save interval in seconds */
  autoSaveIntervalSeconds: number;
  
  /** Show contextual tips and guidance */
  showQuickTips: boolean;
  
  /** Confirm before discarding unsaved changes */
  confirmBeforeDiscard: boolean;
  
  /** Default view mode for image viewer */
  defaultViewMode: 'original' | 'overlay' | 'split';

  // ===================
  // NOTIFICATION SETTINGS
  // ===================
  /** Show desktop notifications for completed analyses */
  notifyOnAnalysisComplete: boolean;
  
  /** Play sound for notifications */
  playSoundOnNotification: boolean;
}

/**
 * Default settings - optimized for clinical workflow
 */
export const DEFAULT_SETTINGS: AppSettings = {
  // Display
  theme: 'dark', // Dark mode is better for medical imaging
  highContrastMode: false,
  enableAnimations: true,
  
  // Analysis
  autoAnalyzeOnUpload: true, // Fast workflow
  showAttentionHeatmap: true,
  defaultHeatmapOpacity: 50, // 50% default opacity
  defaultConfidenceThreshold: 70, // 70% minimum for clinical flags
  showDetailedMetrics: true,
  
  // Workflow
  autoSaveSession: true, // Prevent data loss
  autoSaveIntervalSeconds: 30,
  showQuickTips: true, // Help new users
  confirmBeforeDiscard: true, // Prevent accidental loss
  defaultViewMode: 'overlay',
  
  // Notifications
  notifyOnAnalysisComplete: true,
  playSoundOnNotification: false, // Off by default in clinical environment
};

const SETTINGS_KEY = 'clinicalvision_settings_v2';

// Singleton pattern for settings state - ensures all components stay in sync
let globalSettings: AppSettings = { ...DEFAULT_SETTINGS };
let listeners: Set<(settings: AppSettings) => void> = new Set();
let initialized = false;

/**
 * Initialize settings from localStorage
 */
const initSettings = () => {
  if (initialized || typeof window === 'undefined') return;
  
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to handle new settings added in updates
      globalSettings = { ...DEFAULT_SETTINGS, ...parsed };
    }
    
    // Migrate from old settings key if exists
    const oldSaved = localStorage.getItem('clinicalvision_settings');
    if (oldSaved && !saved) {
      const oldParsed = JSON.parse(oldSaved);
      // Map old settings to new structure
      globalSettings = {
        ...DEFAULT_SETTINGS,
        theme: oldParsed.theme || DEFAULT_SETTINGS.theme,
        highContrastMode: oldParsed.highContrastMode || false,
        autoAnalyzeOnUpload: oldParsed.autoAnalyzeOnUpload ?? true,
        showAttentionHeatmap: oldParsed.showAttentionHeatmap ?? true,
        defaultConfidenceThreshold: (oldParsed.defaultConfidenceThreshold || 0.7) * 100,
        autoSaveSession: oldParsed.autoSaveSession ?? true,
        showQuickTips: oldParsed.showQuickTips ?? true,
      };
      // Save migrated settings
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(globalSettings));
      // Remove old key
      localStorage.removeItem('clinicalvision_settings');
    }
    
    initialized = true;
  } catch (e) {
    console.error('Failed to load settings:', e);
    initialized = true;
  }
};

// Initialize on module load
initSettings();

/**
 * Notify all listeners of settings change
 */
const notifyListeners = () => {
  listeners.forEach(listener => {
    try {
      listener(globalSettings);
    } catch (e) {
      console.error('Error in settings listener:', e);
    }
  });
};

/**
 * Save settings to localStorage
 */
const persistSettings = () => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(globalSettings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
};

/**
 * Hook to access and modify application settings
 * All components using this hook will stay in sync automatically
 */
export const useSettings = () => {
  const [settings, setLocalSettings] = useState<AppSettings>(globalSettings);

  useEffect(() => {
    // Ensure settings are initialized
    initSettings();
    setLocalSettings(globalSettings);
    
    // Subscribe to settings changes from other components
    const listener = (newSettings: AppSettings) => {
      setLocalSettings({ ...newSettings });
    };
    listeners.add(listener);
    
    return () => {
      listeners.delete(listener);
    };
  }, []);

  /**
   * Update a single setting
   */
  const updateSetting = useCallback(<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    globalSettings = { ...globalSettings, [key]: value };
    persistSettings();
    notifyListeners();
  }, []);

  /**
   * Update multiple settings at once
   */
  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    globalSettings = { ...globalSettings, ...newSettings };
    persistSettings();
    notifyListeners();
  }, []);

  /**
   * Reset all settings to defaults
   */
  const resetSettings = useCallback(() => {
    globalSettings = { ...DEFAULT_SETTINGS };
    persistSettings();
    notifyListeners();
  }, []);

  /**
   * Reset a specific category of settings
   */
  const resetCategory = useCallback((category: 'display' | 'analysis' | 'workflow' | 'notifications') => {
    const categoryDefaults: Record<string, Partial<AppSettings>> = {
      display: {
        theme: DEFAULT_SETTINGS.theme,
        highContrastMode: DEFAULT_SETTINGS.highContrastMode,
        enableAnimations: DEFAULT_SETTINGS.enableAnimations,
      },
      analysis: {
        autoAnalyzeOnUpload: DEFAULT_SETTINGS.autoAnalyzeOnUpload,
        showAttentionHeatmap: DEFAULT_SETTINGS.showAttentionHeatmap,
        defaultHeatmapOpacity: DEFAULT_SETTINGS.defaultHeatmapOpacity,
        defaultConfidenceThreshold: DEFAULT_SETTINGS.defaultConfidenceThreshold,
        showDetailedMetrics: DEFAULT_SETTINGS.showDetailedMetrics,
      },
      workflow: {
        autoSaveSession: DEFAULT_SETTINGS.autoSaveSession,
        autoSaveIntervalSeconds: DEFAULT_SETTINGS.autoSaveIntervalSeconds,
        showQuickTips: DEFAULT_SETTINGS.showQuickTips,
        confirmBeforeDiscard: DEFAULT_SETTINGS.confirmBeforeDiscard,
        defaultViewMode: DEFAULT_SETTINGS.defaultViewMode,
      },
      notifications: {
        notifyOnAnalysisComplete: DEFAULT_SETTINGS.notifyOnAnalysisComplete,
        playSoundOnNotification: DEFAULT_SETTINGS.playSoundOnNotification,
      },
    };
    
    globalSettings = { ...globalSettings, ...categoryDefaults[category] };
    persistSettings();
    notifyListeners();
  }, []);

  return {
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
    resetCategory,
  };
};

/**
 * Get current settings without subscribing to updates
 * Useful for one-time reads in event handlers or effects
 */
export const getSettings = (): AppSettings => {
  initSettings();
  return { ...globalSettings };
};

/**
 * Check if a specific setting has been changed from default
 */
export const isSettingModified = <K extends keyof AppSettings>(key: K): boolean => {
  return globalSettings[key] !== DEFAULT_SETTINGS[key];
};

/**
 * Get count of modified settings
 */
export const getModifiedSettingsCount = (): number => {
  return (Object.keys(DEFAULT_SETTINGS) as Array<keyof AppSettings>).filter(
    key => globalSettings[key] !== DEFAULT_SETTINGS[key]
  ).length;
};

export default useSettings;
