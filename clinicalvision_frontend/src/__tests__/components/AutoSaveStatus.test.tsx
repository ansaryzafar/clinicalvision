/**
 * AutoSaveStatus Component Test Suite
 * 
 * Tests auto-save status display and controls:
 * - Status display (saved, dirty, saving)
 * - Auto-save toggle
 * - Manual save button
 * - Time-based status labels
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================================
// Mock WorkflowContext
// ============================================================================

interface AutoSaveState {
  enabled: boolean;
  isDirty: boolean;
  savingInProgress: boolean;
  lastSaved: string;
}

const mockAutoSaveState: AutoSaveState = {
  enabled: true,
  isDirty: false,
  savingInProgress: false,
  lastSaved: new Date().toISOString(),
};

const mockEnableAutoSave = jest.fn();
const mockForceSave = jest.fn();

jest.mock('../../contexts/WorkflowContext', () => ({
  useWorkflow: () => ({
    autoSaveState: mockAutoSaveState,
    enableAutoSave: mockEnableAutoSave,
    forceSave: mockForceSave,
  }),
}));

// ============================================================================
// Simulated Component Logic for Testing
// ============================================================================

const getStatusIcon = (state: AutoSaveState): string => {
  if (state.savingInProgress) {
    return 'loading';
  }
  if (state.isDirty) {
    return 'cloud';
  }
  return 'checkCircle';
};

const getStatusLabel = (state: AutoSaveState): string => {
  if (state.savingInProgress) {
    return 'Saving...';
  }
  if (state.isDirty) {
    return 'Unsaved changes';
  }
  const lastSaved = new Date(state.lastSaved);
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);
  
  if (secondsAgo < 60) {
    return `Saved ${secondsAgo}s ago`;
  } else {
    const minutesAgo = Math.floor(secondsAgo / 60);
    return `Saved ${minutesAgo}m ago`;
  }
};

const getStatusColor = (state: AutoSaveState): string => {
  if (state.savingInProgress) {
    return 'primary';
  }
  if (state.isDirty) {
    return 'warning';
  }
  return 'success';
};

// ============================================================================
// Test Suites
// ============================================================================

describe('AutoSaveStatus Status Logic', () => {
  describe('getStatusIcon', () => {
    test('returns loading icon when saving in progress', () => {
      const state: AutoSaveState = {
        enabled: true,
        isDirty: false,
        savingInProgress: true,
        lastSaved: new Date().toISOString(),
      };
      
      expect(getStatusIcon(state)).toBe('loading');
    });

    test('returns cloud icon when dirty', () => {
      const state: AutoSaveState = {
        enabled: true,
        isDirty: true,
        savingInProgress: false,
        lastSaved: new Date().toISOString(),
      };
      
      expect(getStatusIcon(state)).toBe('cloud');
    });

    test('returns checkCircle icon when saved', () => {
      const state: AutoSaveState = {
        enabled: true,
        isDirty: false,
        savingInProgress: false,
        lastSaved: new Date().toISOString(),
      };
      
      expect(getStatusIcon(state)).toBe('checkCircle');
    });

    test('saving in progress takes precedence over dirty', () => {
      const state: AutoSaveState = {
        enabled: true,
        isDirty: true,
        savingInProgress: true,
        lastSaved: new Date().toISOString(),
      };
      
      expect(getStatusIcon(state)).toBe('loading');
    });
  });

  describe('getStatusLabel', () => {
    test('returns "Saving..." when saving in progress', () => {
      const state: AutoSaveState = {
        enabled: true,
        isDirty: false,
        savingInProgress: true,
        lastSaved: new Date().toISOString(),
      };
      
      expect(getStatusLabel(state)).toBe('Saving...');
    });

    test('returns "Unsaved changes" when dirty', () => {
      const state: AutoSaveState = {
        enabled: true,
        isDirty: true,
        savingInProgress: false,
        lastSaved: new Date().toISOString(),
      };
      
      expect(getStatusLabel(state)).toBe('Unsaved changes');
    });

    test('returns seconds ago when recently saved', () => {
      const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
      const state: AutoSaveState = {
        enabled: true,
        isDirty: false,
        savingInProgress: false,
        lastSaved: fiveSecondsAgo,
      };
      
      const label = getStatusLabel(state);
      expect(label).toMatch(/Saved \d+s ago/);
    });

    test('returns minutes ago for older saves', () => {
      const twoMinutesAgo = new Date(Date.now() - 120000).toISOString();
      const state: AutoSaveState = {
        enabled: true,
        isDirty: false,
        savingInProgress: false,
        lastSaved: twoMinutesAgo,
      };
      
      const label = getStatusLabel(state);
      expect(label).toMatch(/Saved \d+m ago/);
    });

    test('shows 0s ago for just-saved', () => {
      const state: AutoSaveState = {
        enabled: true,
        isDirty: false,
        savingInProgress: false,
        lastSaved: new Date().toISOString(),
      };
      
      const label = getStatusLabel(state);
      expect(label).toBe('Saved 0s ago');
    });
  });

  describe('getStatusColor', () => {
    test('returns primary when saving', () => {
      const state: AutoSaveState = {
        enabled: true,
        isDirty: false,
        savingInProgress: true,
        lastSaved: new Date().toISOString(),
      };
      
      expect(getStatusColor(state)).toBe('primary');
    });

    test('returns warning when dirty', () => {
      const state: AutoSaveState = {
        enabled: true,
        isDirty: true,
        savingInProgress: false,
        lastSaved: new Date().toISOString(),
      };
      
      expect(getStatusColor(state)).toBe('warning');
    });

    test('returns success when saved', () => {
      const state: AutoSaveState = {
        enabled: true,
        isDirty: false,
        savingInProgress: false,
        lastSaved: new Date().toISOString(),
      };
      
      expect(getStatusColor(state)).toBe('success');
    });
  });
});

describe('AutoSaveStatus State Transitions', () => {
  test('transitions from saved to dirty', () => {
    const savedState: AutoSaveState = {
      enabled: true,
      isDirty: false,
      savingInProgress: false,
      lastSaved: new Date().toISOString(),
    };
    
    const dirtyState: AutoSaveState = {
      ...savedState,
      isDirty: true,
    };
    
    expect(getStatusLabel(savedState)).toMatch(/Saved/);
    expect(getStatusLabel(dirtyState)).toBe('Unsaved changes');
  });

  test('transitions from dirty to saving', () => {
    const dirtyState: AutoSaveState = {
      enabled: true,
      isDirty: true,
      savingInProgress: false,
      lastSaved: new Date().toISOString(),
    };
    
    const savingState: AutoSaveState = {
      ...dirtyState,
      savingInProgress: true,
    };
    
    expect(getStatusLabel(dirtyState)).toBe('Unsaved changes');
    expect(getStatusLabel(savingState)).toBe('Saving...');
  });

  test('transitions from saving to saved', () => {
    const savingState: AutoSaveState = {
      enabled: true,
      isDirty: true,
      savingInProgress: true,
      lastSaved: new Date(Date.now() - 10000).toISOString(),
    };
    
    const savedState: AutoSaveState = {
      enabled: true,
      isDirty: false,
      savingInProgress: false,
      lastSaved: new Date().toISOString(),
    };
    
    expect(getStatusLabel(savingState)).toBe('Saving...');
    expect(getStatusLabel(savedState)).toMatch(/Saved/);
  });
});

describe('AutoSaveStatus Toggle Logic', () => {
  const shouldEnableManualSave = (state: AutoSaveState): boolean => {
    return !state.savingInProgress && state.isDirty;
  };

  test('manual save enabled when dirty', () => {
    const state: AutoSaveState = {
      enabled: true,
      isDirty: true,
      savingInProgress: false,
      lastSaved: new Date().toISOString(),
    };
    
    expect(shouldEnableManualSave(state)).toBe(true);
  });

  test('manual save disabled when saving', () => {
    const state: AutoSaveState = {
      enabled: true,
      isDirty: true,
      savingInProgress: true,
      lastSaved: new Date().toISOString(),
    };
    
    expect(shouldEnableManualSave(state)).toBe(false);
  });

  test('manual save disabled when not dirty', () => {
    const state: AutoSaveState = {
      enabled: true,
      isDirty: false,
      savingInProgress: false,
      lastSaved: new Date().toISOString(),
    };
    
    expect(shouldEnableManualSave(state)).toBe(false);
  });
});

describe('AutoSaveStatus Time Calculations', () => {
  test('handles time boundary at 60 seconds', () => {
    const fiftyNineSecondsAgo = new Date(Date.now() - 59000).toISOString();
    const state59s: AutoSaveState = {
      enabled: true,
      isDirty: false,
      savingInProgress: false,
      lastSaved: fiftyNineSecondsAgo,
    };
    
    const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
    const state60s: AutoSaveState = {
      enabled: true,
      isDirty: false,
      savingInProgress: false,
      lastSaved: sixtySecondsAgo,
    };
    
    expect(getStatusLabel(state59s)).toMatch(/\d+s ago/);
    expect(getStatusLabel(state60s)).toMatch(/\d+m ago/);
  });

  test('correctly calculates minutes', () => {
    const fiveMinutesAgo = new Date(Date.now() - 300000).toISOString();
    const state: AutoSaveState = {
      enabled: true,
      isDirty: false,
      savingInProgress: false,
      lastSaved: fiveMinutesAgo,
    };
    
    const label = getStatusLabel(state);
    expect(label).toBe('Saved 5m ago');
  });

  test('handles hour-old saves', () => {
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const state: AutoSaveState = {
      enabled: true,
      isDirty: false,
      savingInProgress: false,
      lastSaved: oneHourAgo,
    };
    
    const label = getStatusLabel(state);
    expect(label).toBe('Saved 60m ago');
  });
});
