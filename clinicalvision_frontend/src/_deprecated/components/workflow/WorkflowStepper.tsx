/**
 * Workflow Stepper Component - Simplified & Robust
 * 
 * DESIGN: Single source of truth from WorkflowContext
 * 
 * Key improvements:
 * - Removed debug logging spam
 * - Uses context's canAdvanceToStep for consistent navigation logic
 * - Uses context's isStepCompleted for consistent completion status
 */

import React from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepButton,
  Paper,
  Typography,
  LinearProgress,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload,
  Person,
  Psychology,
  Straighten,
  Assignment,
  Description,
  CheckCircle,
  Bolt,
  MedicalServices,
  Lock,
  RadioButtonUnchecked,
  Check,
} from '@mui/icons-material';
import { useLegacyWorkflow } from '../../workflow-v3';
import { WorkflowStep, getVisibleSteps, getStepConfig } from '../../types/clinical.types';

// Type for visual step state
type StepState = 'completed' | 'current' | 'available' | 'locked';

const STEP_ICONS: Record<WorkflowStep, React.ReactNode> = {
  [WorkflowStep.UPLOAD]: <CloudUpload />,
  [WorkflowStep.AI_ANALYSIS]: <Psychology />,
  [WorkflowStep.PATIENT_INFO]: <Person />,
  [WorkflowStep.MEASUREMENTS]: <Straighten />,
  [WorkflowStep.ASSESSMENT]: <Assignment />,
  [WorkflowStep.REPORT]: <Description />,
  [WorkflowStep.FINALIZE]: <CheckCircle />,
};

interface WorkflowStepperProps {
  onStepClick?: (step: WorkflowStep) => void;
  compact?: boolean;
}

const getStepStyles = (state: StepState) => {
  const styles = {
    completed: { bg: '#4caf50', color: 'white', border: 'none', labelColor: '#2e7d32', labelWeight: 500 },
    current: { bg: '#1976d2', color: 'white', border: '3px solid #1565c0', labelColor: '#1976d2', labelWeight: 700 },
    available: { bg: '#e3f2fd', color: '#1976d2', border: '2px dashed #90caf9', labelColor: '#1976d2', labelWeight: 500 },
    locked: { bg: '#f5f5f5', color: '#9e9e9e', border: 'none', labelColor: '#9e9e9e', labelWeight: 400 },
  };
  return styles[state];
};

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({ onStepClick, compact = false }) => {
  const { currentSession, advanceToStep, workflowMode, canAdvanceToStep, isStepCompleted, getStepState } = useLegacyWorkflow();
  const mode = currentSession?.workflow?.mode || workflowMode;
  const visibleSteps = getVisibleSteps(mode);
  const currentStep = currentSession?.workflow?.currentStep ?? WorkflowStep.UPLOAD;

  // Calculate progress from ACTUAL completion status (not counting current step as complete)
  // Only count truly completed steps (not the current step even if it has data)
  const completedCount = visibleSteps.filter(s => {
    // Current step is NOT complete from a workflow progress perspective
    if (s.step === currentStep) return false;
    return isStepCompleted(s.step);
  }).length;
  const totalSteps = visibleSteps.length;
  const progressPercentage = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const currentVisibleIndex = visibleSteps.findIndex(s => s.step === currentStep);

  /**
   * FIXED: Step state with correct priority order
   * Priority: current > completed > available > locked
   * 
   * CRITICAL: Current step MUST show as 'current' even if it has complete data.
   * This follows the principle that "where the user is" takes priority over "what's done".
   */
  const getStepStateFixed = (step: WorkflowStep): StepState => {
    // 1. CURRENT step always shows as current (even if data is complete)
    if (step === currentStep) return 'current';
    
    // 2. Completed steps (past steps with data)
    if (isStepCompleted(step)) return 'completed';
    
    // 3. Available (can navigate but not complete)
    if (canAdvanceToStep(step)) return 'available';
    
    // 4. Locked (cannot navigate yet)
    return 'locked';
  };

  const handleStepClick = (step: WorkflowStep) => {
    const state = getStepStateFixed(step);
    if (state !== 'locked') {
      advanceToStep(step);
      onStepClick?.(step);
    }
  };

  const getStatusDisplay = () => {
    const status = currentSession?.workflow?.status || 'in-progress';
    const statusMap: Record<string, { label: string; color: 'success' | 'primary' | 'warning' | 'error' }> = {
      'completed': { label: 'COMPLETED', color: 'success' },
      'finalized': { label: 'FINALIZED', color: 'success' },
      'in-progress': { label: 'IN PROGRESS', color: 'primary' },
      'reviewed': { label: 'REVIEWED', color: 'warning' },
    };
    return statusMap[status] || { label: status.toUpperCase(), color: 'primary' as const };
  };

  if (!currentSession) {
    return (
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1" color="text.secondary">
          No active session. Upload an image to begin analysis.
        </Typography>
      </Paper>
    );
  }

  const statusDisplay = getStatusDisplay();

  return (
    <Paper elevation={2} sx={{ p: compact ? 2 : 3, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant={compact ? 'subtitle1' : 'h6'} fontWeight={600}>Clinical Workflow</Typography>
          <Tooltip title={mode === 'quick' ? 'Quick Mode: Fast screening' : 'Clinical Mode: Complete documentation'}>
            <Chip
              icon={mode === 'quick' ? <Bolt sx={{ fontSize: 16 }} /> : <MedicalServices sx={{ fontSize: 16 }} />}
              label={mode === 'quick' ? 'Quick' : 'Clinical'}
              size="small"
              color={mode === 'quick' ? 'warning' : 'primary'}
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title={`Step ${currentVisibleIndex + 1} of ${totalSteps} - ${completedCount} completed`}>
            <Chip
              label={`Step ${currentVisibleIndex + 1}/${totalSteps}`}
              color="primary"
              size="small"
              variant="filled"
              sx={{ fontWeight: 600 }}
            />
          </Tooltip>
          <Tooltip title={`${completedCount} of ${totalSteps} steps fully completed`}>
            <Chip label={`${progressPercentage}%`} color={progressPercentage === 100 ? 'success' : 'default'} size="small" variant="outlined" sx={{ fontWeight: 600, minWidth: 55 }} />
          </Tooltip>
          <Chip label={statusDisplay.label} color={statusDisplay.color} size="small" sx={{ fontWeight: 600 }} />
        </Box>
      </Box>

      {/* Progress Bar */}
      <Box sx={{ mb: 3 }}>
        <LinearProgress
          variant="determinate"
          value={progressPercentage}
          sx={{
            height: compact ? 8 : 10, borderRadius: 5, backgroundColor: 'rgba(0, 0, 0, 0.08)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 5,
              background: progressPercentage === 100 ? 'linear-gradient(90deg, #43a047 0%, #66bb6a 100%)' : 'linear-gradient(90deg, #1565c0 0%, #42a5f5 100%)',
              transition: 'transform 0.4s ease',
            },
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, px: 0.5 }}>
          {visibleSteps.map((stepConfig) => {
            const state = getStepStateFixed(stepConfig.step);
            // Current step should show as blue (in-progress), not green (complete)
            const dotColor = state === 'current' ? '#1976d2' : 
                            state === 'completed' ? '#4caf50' : 
                            'rgba(0,0,0,0.2)';
            return <Box key={stepConfig.step} sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: dotColor }} />;
          })}
        </Box>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={currentVisibleIndex >= 0 ? currentVisibleIndex : 0} alternativeLabel
        sx={{
          '& .MuiStepConnector-line': { borderTopWidth: 3, borderRadius: 1 },
          '& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line': { borderColor: '#4caf50' },
          '& .MuiStepConnector-root.Mui-active .MuiStepConnector-line': { borderColor: '#1976d2' },
        }}
      >
        {visibleSteps.map((stepConfig, index) => {
          const stepState = getStepStateFixed(stepConfig.step);
          const styles = getStepStyles(stepState);
          const isClickable = stepState !== 'locked';

          return (
            <Step key={stepConfig.step} completed={stepState === 'completed'}>
              <Tooltip
                title={
                  <Box>
                    <Typography variant="subtitle2">{stepConfig.label}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>{stepConfig.helpText || stepConfig.description}</Typography>
                    {stepState === 'locked' && <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#ffab91' }}>Complete previous steps to unlock</Typography>}
                  </Box>
                }
                arrow
              >
                <StepButton onClick={() => handleStepClick(stepConfig.step)} disabled={!isClickable} sx={{ cursor: isClickable ? 'pointer' : 'not-allowed', '&:hover': isClickable ? { backgroundColor: 'rgba(25, 118, 210, 0.04)', borderRadius: 2 } : {} }}>
                  <StepLabel
                    StepIconComponent={() => (
                      <Box sx={{ width: compact ? 36 : 44, height: compact ? 36 : 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: styles.bg, color: styles.color, border: styles.border, boxShadow: stepState === 'current' ? '0 4px 12px rgba(25, 118, 210, 0.3)' : stepState === 'completed' ? '0 2px 8px rgba(76, 175, 80, 0.25)' : 'none', position: 'relative' }}>
                        {stepState === 'completed' ? <Check sx={{ fontSize: compact ? 18 : 22 }} /> : stepState === 'locked' ? <Lock sx={{ fontSize: compact ? 16 : 18, opacity: 0.6 }} /> : STEP_ICONS[stepConfig.step]}
                        <Box sx={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', backgroundColor: stepState === 'completed' ? '#2e7d32' : '#fff', color: stepState === 'completed' ? '#fff' : '#666', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                          {index + 1}
                        </Box>
                      </Box>
                    )}
                  >
                    <Typography variant="caption" sx={{ fontWeight: styles.labelWeight, color: styles.labelColor, fontSize: compact ? '0.7rem' : '0.75rem' }}>{stepConfig.label}</Typography>
                  </StepLabel>
                </StepButton>
              </Tooltip>
            </Step>
          );
        })}
      </Stepper>

      {/* Current Step Info - Clear guidance for what to do next */}
      {!compact && (
        <Box sx={{ mt: 3, p: 2.5, backgroundColor: '#e3f2fd', borderRadius: 2, border: '2px solid', borderColor: '#1976d2', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#1976d2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)' }}>
            {STEP_ICONS[currentStep] || <RadioButtonUnchecked />}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" color="primary" fontWeight={700} gutterBottom>
              Current Step: {getStepConfig(currentStep)?.label || 'Upload'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {getStepConfig(currentStep)?.helpText || getStepConfig(currentStep)?.description || 'Upload an image to begin.'}
            </Typography>
          </Box>
          {completedCount > 0 && (
            <Chip 
              icon={<Check sx={{ fontSize: 16 }} />} 
              label={`${completedCount} completed`} 
              size="small" 
              color="success" 
              variant="outlined" 
            />
          )}
        </Box>
      )}
    </Paper>
  );
};
