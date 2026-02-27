/**
 * Auto-Save Status Component
 * Displays auto-save state and provides manual save control
 */

import React from 'react';
import { Box, Chip, IconButton, Tooltip, CircularProgress } from '@mui/material';
import { Save, CheckCircle, Cloud, CloudOff } from '@mui/icons-material';
import { useLegacyWorkflow } from '../../workflow-v3';

export const AutoSaveStatus: React.FC = () => {
  const { autoSaveState, enableAutoSave, forceSave } = useLegacyWorkflow();

  const getStatusIcon = () => {
    if (autoSaveState.savingInProgress) {
      return <CircularProgress size={16} />;
    }
    if (autoSaveState.isDirty) {
      return <Cloud />;
    }
    return <CheckCircle />;
  };

  const getStatusLabel = () => {
    if (autoSaveState.savingInProgress) {
      return 'Saving...';
    }
    if (autoSaveState.isDirty) {
      return 'Unsaved changes';
    }
    const lastSaved = new Date(autoSaveState.lastSaved);
    const now = new Date();
    const secondsAgo = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);
    
    if (secondsAgo < 60) {
      return `Saved ${secondsAgo}s ago`;
    } else {
      const minutesAgo = Math.floor(secondsAgo / 60);
      return `Saved ${minutesAgo}m ago`;
    }
  };

  const getStatusColor = () => {
    if (autoSaveState.savingInProgress) {
      return 'primary';
    }
    if (autoSaveState.isDirty) {
      return 'warning';
    }
    return 'success';
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip
        icon={getStatusIcon()}
        label={getStatusLabel()}
        color={getStatusColor()}
        size="small"
        variant="outlined"
      />
      
      <Tooltip title={autoSaveState.enabled ? 'Auto-save enabled' : 'Auto-save disabled'}>
        <IconButton
          size="small"
          onClick={() => enableAutoSave(!autoSaveState.enabled)}
          color={autoSaveState.enabled ? 'primary' : 'default'}
        >
          {autoSaveState.enabled ? <Cloud /> : <CloudOff />}
        </IconButton>
      </Tooltip>

      <Tooltip title="Save now">
        {/* Wrap in span to enable tooltip on disabled button - MUI requirement */}
        <span>
          <IconButton
            size="small"
            onClick={forceSave}
            disabled={autoSaveState.savingInProgress || !autoSaveState.isDirty}
            color="primary"
            sx={{ 
              // Ensure disabled state is visually apparent but span doesn't break layout
              '&.Mui-disabled': { pointerEvents: 'none' }
            }}
          >
            <Save />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};
