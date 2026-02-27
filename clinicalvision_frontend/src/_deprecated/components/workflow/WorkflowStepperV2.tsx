/**
 * Workflow Stepper v2 - SIMPLIFIED
 * 
 * Works with the existing WorkflowContext but applies simplified logic.
 * Key differences from v1:
 * - No debug logging spam
 * - Uses completedSteps array from workflow state
 * - Clear visual states: locked, available, current, completed
 * - Single source of truth for step states
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
  Button,
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
  Check,
  ArrowForward,
} from '@mui/icons-material';
import { useLegacyWorkflow } from '../../workflow-v3';
import { WorkflowStep, getStepConfig, getVisibleSteps } from '../../types/clinical.types';

const STEP_ICONS: Record<WorkflowStep, React.ReactNode> = {
  [WorkflowStep.UPLOAD]: <CloudUpload />,
  [WorkflowStep.AI_ANALYSIS]: <Psychology />,
  [WorkflowStep.PATIENT_INFO]: <Person />,
  [WorkflowStep.MEASUREMENTS]: <Straighten />,
  [WorkflowStep.ASSESSMENT]: <Assignment />,
  [WorkflowStep.REPORT]: <Description />,
  [WorkflowStep.FINALIZE]: <CheckCircle />,
};

interface WorkflowStepperV2Props {
  onStepClick?: (step: WorkflowStep) => void;
  compact?: boolean;
  showNextButton?: boolean;
}

type StepState = 'completed' | 'current' | 'available' | 'locked';

const getStepStyles = (state: StepState) => ({
  completed: { 
    bg: '#4caf50', 
    color: 'white', 
    border: 'none', 
    labelColor: '#2e7d32', 
    labelWeight: 500,
    cursor: 'pointer',
  },
  current: { 
    bg: '#1976d2', 
    color: 'white', 
    border: '3px solid #1565c0', 
    labelColor: '#1976d2', 
    labelWeight: 700,
    cursor: 'default',
  },
  available: { 
    bg: '#e3f2fd', 
    color: '#1976d2', 
    border: '2px dashed #90caf9', 
    labelColor: '#1976d2', 
    labelWeight: 500,
    cursor: 'pointer',
  },
  locked: { 
    bg: '#f5f5f5', 
    color: '#9e9e9e', 
    border: 'none', 
    labelColor: '#9e9e9e', 
    labelWeight: 400,
    cursor: 'not-allowed',
  },
})[state];

export const WorkflowStepperV2: React.FC<WorkflowStepperV2Props> = ({ 
  onStepClick, 
  compact = false,
  showNextButton = false,
}) => {
  const { 
    currentSession, 
    workflowMode,
    advanceToStep,
    isStepCompleted,
    canAdvanceToStep,
    markStepCompleted,
    error,
  } = useLegacyWorkflow();

  // Get visible steps based on mode
  const visibleSteps = getVisibleSteps(workflowMode);
  const currentStep = currentSession?.workflow?.currentStep ?? WorkflowStep.UPLOAD;

  // Calculate progress from completedSteps in workflow state
  const completedStepsArray = currentSession?.workflow?.completedSteps || [];
  const completedCount = visibleSteps.filter(s => 
    completedStepsArray.includes(s.step)
  ).length;
  const totalSteps = visibleSteps.length;
  const progressPercentage = totalSteps > 0 
    ? Math.round((completedCount / totalSteps) * 100) 
    : 0;

  // Find current visible step index
  const currentVisibleIndex = visibleSteps.findIndex(s => s.step === currentStep);

  /**
   * SIMPLIFIED step state logic - single source of truth
   */
  const getStepState = (step: WorkflowStep): StepState => {
    // 1. If explicitly marked as completed, it's completed
    if (completedStepsArray.includes(step)) return 'completed';
    
    // 2. If this is the current step, it's current
    if (step === currentStep) return 'current';
    
    // 3. If we can advance to it, it's available
    if (canAdvanceToStep(step)) return 'available';
    
    // 4. Otherwise, it's locked
    return 'locked';
  };

  const handleStepClick = (step: WorkflowStep) => {
    const state = getStepState(step);
    if (state !== 'locked') {
      advanceToStep(step);
      onStepClick?.(step);
    }
  };

  const handleNextClick = () => {
    // Find the next visible step
    const nextIndex = currentVisibleIndex + 1;
    if (nextIndex < visibleSteps.length) {
      // Mark current step as completed and advance
      markStepCompleted(currentStep);
      advanceToStep(visibleSteps[nextIndex].step);
    }
  };

  const getStatusLabel = () => {
    const status = currentSession?.workflow?.status || 'in-progress';
    const labels: Record<string, { label: string; color: 'success' | 'primary' | 'warning' }> = {
      'completed': { label: 'COMPLETED', color: 'success' },
      'finalized': { label: 'FINALIZED', color: 'success' },
      'in-progress': { label: 'IN PROGRESS', color: 'primary' },
    };
    return labels[status] || { label: status.toUpperCase(), color: 'primary' as const };
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

  const status = getStatusLabel();

  return (
    <Paper elevation={2} sx={{ p: compact ? 2 : 3, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant={compact ? 'subtitle1' : 'h6'} fontWeight={600}>
            Clinical Workflow
          </Typography>
          <Tooltip title={workflowMode === 'quick' ? 'Quick Mode: Fast screening' : 'Clinical Mode: Complete documentation'}>
            <Chip
              icon={workflowMode === 'quick' ? <Bolt sx={{ fontSize: 16 }} /> : <MedicalServices sx={{ fontSize: 16 }} />}
              label={workflowMode === 'quick' ? 'Quick' : 'Clinical'}
              size="small"
              color={workflowMode === 'quick' ? 'warning' : 'primary'}
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip
            label={`${completedCount}/${totalSteps} Steps`}
            color={completedCount === totalSteps ? 'success' : 'primary'}
            size="small"
            variant={completedCount > 0 ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
          <Chip 
            label={`${progressPercentage}%`} 
            color={progressPercentage === 100 ? 'success' : 'default'} 
            size="small" 
            variant="outlined" 
            sx={{ fontWeight: 600, minWidth: 55 }} 
          />
          <Chip 
            label={status.label} 
            color={status.color} 
            size="small" 
            sx={{ fontWeight: 600 }} 
          />
        </Box>
      </Box>

      {/* Progress Bar */}
      <Box sx={{ mb: 3 }}>
        <LinearProgress
          variant="determinate"
          value={progressPercentage}
          sx={{
            height: compact ? 8 : 10,
            borderRadius: 5,
            backgroundColor: 'rgba(0, 0, 0, 0.08)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 5,
              background: progressPercentage === 100 
                ? 'linear-gradient(90deg, #43a047 0%, #66bb6a 100%)' 
                : 'linear-gradient(90deg, #1565c0 0%, #42a5f5 100%)',
              transition: 'transform 0.4s ease',
            },
          }}
        />
        {/* Step indicators */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, px: 0.5 }}>
          {visibleSteps.map((stepConfig) => (
            <Box 
              key={stepConfig.step} 
              sx={{ 
                width: 6, 
                height: 6, 
                borderRadius: '50%', 
                backgroundColor: isStepCompleted(stepConfig.step) ? '#4caf50' : 'rgba(0,0,0,0.2)' 
              }} 
            />
          ))}
        </Box>
      </Box>

      {/* Stepper */}
      <Stepper 
        activeStep={currentVisibleIndex >= 0 ? currentVisibleIndex : 0} 
        alternativeLabel
        sx={{
          '& .MuiStepConnector-line': { borderTopWidth: 3, borderRadius: 1 },
          '& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line': { borderColor: '#4caf50' },
          '& .MuiStepConnector-root.Mui-active .MuiStepConnector-line': { borderColor: '#1976d2' },
        }}
      >
        {visibleSteps.map((stepConfig, index) => {
          const state = getStepState(stepConfig.step);
          const styles = getStepStyles(state);
          const isClickable = state !== 'locked';

          return (
            <Step key={stepConfig.step} completed={state === 'completed'}>
              <Tooltip
                title={
                  <Box>
                    <Typography variant="subtitle2">{stepConfig.label}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      {stepConfig.helpText || stepConfig.description}
                    </Typography>
                    {state === 'locked' && (
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#ffab91' }}>
                        Complete previous steps to unlock
                      </Typography>
                    )}
                  </Box>
                }
                arrow
              >
                <StepButton 
                  onClick={() => handleStepClick(stepConfig.step)} 
                  disabled={!isClickable}
                  sx={{ 
                    cursor: styles.cursor,
                    '&:hover': isClickable ? { 
                      backgroundColor: 'rgba(25, 118, 210, 0.04)', 
                      borderRadius: 2 
                    } : {} 
                  }}
                >
                  <StepLabel
                    StepIconComponent={() => (
                      <Box sx={{ 
                        width: compact ? 36 : 44, 
                        height: compact ? 36 : 44, 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        backgroundColor: styles.bg, 
                        color: styles.color, 
                        border: styles.border, 
                        boxShadow: state === 'current' 
                          ? '0 4px 12px rgba(25, 118, 210, 0.3)' 
                          : state === 'completed' 
                            ? '0 2px 8px rgba(76, 175, 80, 0.25)' 
                            : 'none', 
                        position: 'relative' 
                      }}>
                        {state === 'completed' 
                          ? <Check sx={{ fontSize: compact ? 18 : 22 }} /> 
                          : state === 'locked' 
                            ? <Lock sx={{ fontSize: compact ? 16 : 18, opacity: 0.6 }} /> 
                            : STEP_ICONS[stepConfig.step]}
                        <Box sx={{ 
                          position: 'absolute', 
                          top: -4, 
                          right: -4, 
                          width: 18, 
                          height: 18, 
                          borderRadius: '50%', 
                          backgroundColor: state === 'completed' ? '#2e7d32' : '#fff', 
                          color: state === 'completed' ? '#fff' : '#666', 
                          fontSize: 10, 
                          fontWeight: 700, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          border: '2px solid white', 
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)' 
                        }}>
                          {index + 1}
                        </Box>
                      </Box>
                    )}
                  >
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontWeight: styles.labelWeight, 
                        color: styles.labelColor, 
                        fontSize: compact ? '0.7rem' : '0.75rem' 
                      }}
                    >
                      {stepConfig.label}
                    </Typography>
                  </StepLabel>
                </StepButton>
              </Tooltip>
            </Step>
          );
        })}
      </Stepper>

      {/* Current Step Info + Next Button */}
      {!compact && (
        <Box sx={{ 
          mt: 3, 
          p: 2.5, 
          backgroundColor: '#fafafa', 
          borderRadius: 2, 
          border: '1px solid', 
          borderColor: 'divider', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: 2 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <Box sx={{ 
              width: 48, 
              height: 48, 
              borderRadius: '50%', 
              backgroundColor: '#e3f2fd', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#1976d2', 
              flexShrink: 0 
            }}>
              {STEP_ICONS[currentStep]}
            </Box>
            <Box>
              <Typography variant="subtitle2" color="primary" fontWeight={600} gutterBottom>
                Current: {getStepConfig(currentStep)?.label || 'Upload'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {getStepConfig(currentStep)?.helpText || getStepConfig(currentStep)?.description}
              </Typography>
            </Box>
          </Box>
          
          {showNextButton && currentVisibleIndex < visibleSteps.length - 1 && (
            <Button
              variant="contained"
              color="primary"
              endIcon={<ArrowForward />}
              onClick={handleNextClick}
              sx={{ flexShrink: 0 }}
            >
              Complete & Next
            </Button>
          )}
        </Box>
      )}

      {/* Error display */}
      {error && (
        <Box sx={{ mt: 2, p: 1.5, backgroundColor: '#ffebee', borderRadius: 1 }}>
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default WorkflowStepperV2;
