/**
 * AnalysisProgress Component
 * 
 * Loading state component for medical image analysis following HCI best practices:
 * - Nielsen Heuristic #1: Visibility of system status
 * - Reduces anxiety during long operations
 * - Shows meaningful progress stages
 * - Provides estimated completion time
 * 
 * Based on research from:
 * - VoxLogicA UI (Medical Image Analysis Interface)
 * - Predictive HCI Modeling for Digital Health Systems
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  LinearProgress,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  alpha,
  styled,
  Skeleton,
} from '@mui/material';
import {
  CloudUpload,
  Psychology,
  Analytics,
  CheckCircle,
  Science,
  Image as ImageIcon,
} from '@mui/icons-material';

// Analysis stages
export type AnalysisStage = 
  | 'uploading'
  | 'preprocessing'
  | 'analyzing'
  | 'postprocessing'
  | 'complete'
  | 'error';

interface StageConfig {
  label: string;
  description: string;
  icon: React.ReactElement;
  estimatedDuration: number; // in seconds
}

const stageConfigs: Record<AnalysisStage, StageConfig> = {
  uploading: {
    label: 'Uploading Image',
    description: 'Securely transferring your image to the analysis server...',
    icon: <CloudUpload />,
    estimatedDuration: 3,
  },
  preprocessing: {
    label: 'Preprocessing',
    description: 'Normalizing and preparing image for AI analysis...',
    icon: <ImageIcon />,
    estimatedDuration: 2,
  },
  analyzing: {
    label: 'AI Analysis',
    description: 'Running deep learning model for breast cancer detection...',
    icon: <Psychology />,
    estimatedDuration: 8,
  },
  postprocessing: {
    label: 'Generating Results',
    description: 'Computing confidence scores and risk assessment...',
    icon: <Analytics />,
    estimatedDuration: 2,
  },
  complete: {
    label: 'Complete',
    description: 'Analysis finished successfully!',
    icon: <CheckCircle />,
    estimatedDuration: 0,
  },
  error: {
    label: 'Error',
    description: 'An error occurred during analysis.',
    icon: <Science />,
    estimatedDuration: 0,
  },
};

// Styled components
const ProgressCard = styled(Card)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 12,
  overflow: 'hidden',
}));

const PulsingIcon = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 64,
  height: 64,
  borderRadius: '50%',
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  color: theme.palette.primary.main,
  animation: 'pulse 2s infinite',
  '@keyframes pulse': {
    '0%': {
      boxShadow: `0 0 0 0 ${alpha(theme.palette.primary.main, 0.4)}`,
    },
    '70%': {
      boxShadow: `0 0 0 20px ${alpha(theme.palette.primary.main, 0)}`,
    },
    '100%': {
      boxShadow: `0 0 0 0 ${alpha(theme.palette.primary.main, 0)}`,
    },
  },
}));

const GradientProgress = styled(LinearProgress)(({ theme }) => ({
  height: 8,
  borderRadius: 4,
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  '& .MuiLinearProgress-bar': {
    borderRadius: 4,
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  },
}));

// Props interface
interface AnalysisProgressProps {
  /** Current analysis stage */
  stage: AnalysisStage;
  /** Progress within current stage (0-100) */
  progress?: number;
  /** Error message if stage is 'error' */
  errorMessage?: string;
  /** Show detailed stepper view */
  showStepper?: boolean;
  /** Variant */
  variant?: 'minimal' | 'standard' | 'detailed';
  /** Custom status message */
  statusMessage?: string;
}

/**
 * AnalysisProgress Component
 * 
 * Shows analysis progress with meaningful stage information
 */
export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  stage,
  progress,
  errorMessage,
  showStepper = false,
  variant = 'standard',
  statusMessage,
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const config = stageConfigs[stage];
  
  // Track elapsed time
  useEffect(() => {
    if (stage === 'complete' || stage === 'error') return;
    
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [stage]);
  
  // Reset timer on stage change
  useEffect(() => {
    setElapsedTime(0);
  }, [stage]);
  
  // Calculate total estimated time and current position
  const stages: AnalysisStage[] = ['uploading', 'preprocessing', 'analyzing', 'postprocessing', 'complete'];
  const currentStageIndex = stages.indexOf(stage);
  const totalEstimatedTime = Object.values(stageConfigs)
    .filter(c => c.estimatedDuration > 0)
    .reduce((sum, c) => sum + c.estimatedDuration, 0);
  
  const completedTime = stages
    .slice(0, currentStageIndex)
    .reduce((sum, s) => sum + stageConfigs[s].estimatedDuration, 0);
  
  const overallProgress = stage === 'complete' 
    ? 100 
    : Math.min(95, ((completedTime + (progress ? (progress / 100) * config.estimatedDuration : 0)) / totalEstimatedTime) * 100);

  // Minimal variant - just a progress bar
  if (variant === 'minimal') {
    return (
      <Box sx={{ width: '100%' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="caption" fontWeight={600}>
            {config.label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {Math.round(overallProgress)}%
          </Typography>
        </Stack>
        <GradientProgress variant="determinate" value={overallProgress} />
      </Box>
    );
  }

  // Stepper variant
  if (showStepper) {
    return (
      <ProgressCard elevation={0}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
            Analysis Progress
          </Typography>
          
          <Stepper activeStep={currentStageIndex} orientation="vertical">
            {stages.slice(0, -1).map((s, index) => (
              <Step key={s} completed={currentStageIndex > index}>
                <StepLabel
                  icon={
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: currentStageIndex > index 
                          ? 'success.main' 
                          : currentStageIndex === index 
                            ? 'primary.main' 
                            : 'action.disabled',
                        color: 'white',
                      }}
                    >
                      {currentStageIndex > index ? (
                        <CheckCircle sx={{ fontSize: 20 }} />
                      ) : (
                        <Box sx={{ fontSize: 18, display: 'flex' }}>{stageConfigs[s].icon}</Box>
                      )}
                    </Box>
                  }
                >
                  <Typography variant="body2" fontWeight={600}>
                    {stageConfigs[s].label}
                  </Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="caption" color="text.secondary">
                    {stageConfigs[s].description}
                  </Typography>
                  {currentStageIndex === index && (
                    <Box sx={{ mt: 1 }}>
                      <GradientProgress 
                        variant={progress ? 'determinate' : 'indeterminate'} 
                        value={progress} 
                      />
                    </Box>
                  )}
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </ProgressCard>
    );
  }

  // Standard variant
  return (
    <ProgressCard elevation={0}>
      <CardContent sx={{ textAlign: 'center', py: 4 }}>
        {/* Animated Icon */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <PulsingIcon>
            {stage === 'complete' ? (
              <CheckCircle sx={{ fontSize: 32 }} />
            ) : (
              config.icon
            )}
          </PulsingIcon>
        </Box>
        
        {/* Stage Label */}
        <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
          {statusMessage || config.label}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {config.description}
        </Typography>
        
        {/* Progress Bar */}
        {stage !== 'complete' && stage !== 'error' && (
          <Box sx={{ px: 4, mb: 2 }}>
            <GradientProgress 
              variant={progress ? 'determinate' : 'indeterminate'} 
              value={progress || overallProgress} 
            />
          </Box>
        )}
        
        {/* Time Display */}
        <Stack direction="row" justifyContent="center" spacing={4}>
          <Box>
            <Typography variant="caption" color="text.disabled">
              Elapsed
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
            </Typography>
          </Box>
          {stage !== 'complete' && stage !== 'error' && (
            <Box>
              <Typography variant="caption" color="text.disabled">
                Est. Remaining
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                ~{Math.max(0, totalEstimatedTime - completedTime - elapsedTime)}s
              </Typography>
            </Box>
          )}
        </Stack>
        
        {/* Error Message */}
        {stage === 'error' && errorMessage && (
          <Typography 
            variant="body2" 
            color="error" 
            sx={{ mt: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}
          >
            {errorMessage}
          </Typography>
        )}
      </CardContent>
    </ProgressCard>
  );
};

/**
 * Skeleton loader for analysis results
 */
export const AnalysisResultSkeleton: React.FC = () => (
  <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
    <CardContent>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Skeleton variant="circular" width={48} height={48} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={28} />
            <Skeleton variant="text" width="40%" height={20} />
          </Box>
        </Stack>
        
        <Skeleton variant="rounded" height={8} />
        
        <Stack direction="row" spacing={2}>
          <Skeleton variant="rounded" width="33%" height={60} />
          <Skeleton variant="rounded" width="33%" height={60} />
          <Skeleton variant="rounded" width="33%" height={60} />
        </Stack>
      </Stack>
    </CardContent>
  </Card>
);

/**
 * Image loading skeleton with shimmer effect
 */
export const ImageLoadingSkeleton: React.FC<{ height?: number | string }> = ({ 
  height = 300 
}) => (
  <Box
    sx={{
      width: '100%',
      height,
      borderRadius: 2,
      overflow: 'hidden',
      position: 'relative',
      bgcolor: 'action.hover',
    }}
  >
    <Skeleton 
      variant="rectangular" 
      width="100%" 
      height="100%" 
      animation="wave"
    />
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
      }}
    >
      <CircularProgress size={40} thickness={3} />
      <Typography 
        variant="caption" 
        color="text.secondary" 
        sx={{ display: 'block', mt: 1 }}
      >
        Loading image...
      </Typography>
    </Box>
  </Box>
);

export default AnalysisProgress;
