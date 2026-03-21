/**
 * BatchAnalysisRunner Component - Phase 5 Implementation
 * 
 * UI component for managing batch AI analysis of mammogram images
 * Features:
 * - Start/stop analysis control
 * - Real-time progress tracking
 * - Error handling with retry capability
 * - Result summary display
 * - Accessibility support
 * 
 * Styled with MUI components + LUNIT design tokens
 * @version 2.0
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Alert,
  alpha,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Paper,
  Typography,
  useTheme,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Replay as ReplayIcon,
  CheckCircleOutline as CheckIcon,
  WarningAmber as WarningIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import {
  ClinicalCase,
  BatchAnalysisResult,
  BiRadsCategory,
  BIRADS_CATEGORY_DESCRIPTIONS,
  ValidationResult,
} from '../types/case.types';
import {
  validateCaseForAnalysis,
  runBatchAnalysis,
  canRetryAnalysis,
  retryFailedAnalyses,
  BatchAnalysisError,
} from '../utils/batchAnalysisOperations';
import { isFailure } from '../types/resultHelpers';

// ============================================================================
// LUNIT DESIGN TOKENS (shared with ClinicalWorkflowPageV2)
// ============================================================================

const LUNIT = {
  fontHeading: '"ClashGrotesk", "Inter", sans-serif',
  fontBody: '"Lexend", "Inter", sans-serif',
  teal: '#00C9EA',
  lightGray: '#E5E7EB',
} as const;

// ============================================================================
// TYPES
// ============================================================================

export interface BatchAnalysisRunnerProps {
  /** The clinical case with images to analyze */
  case: ClinicalCase;
  /** Callback when analysis completes successfully */
  onAnalysisComplete: (result: BatchAnalysisResult) => void;
  /** Callback when an error occurs */
  onError: (error: Error) => void;
  /** Callback to advance to the next workflow step */
  onContinue?: () => void;
  /** Optional class name for styling */
  className?: string;
}

type AnalysisState = 
  | 'idle'
  | 'validating'
  | 'analyzing'
  | 'completed'
  | 'error'
  | 'cancelled';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Formats milliseconds to human-readable time
 */
function formatProcessingTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = (seconds % 60).toFixed(0);
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Gets display text for BI-RADS category
 */
function getBiRadsDisplayText(category: BiRadsCategory): string {
  return `BI-RADS ${category} - ${BIRADS_CATEGORY_DESCRIPTIONS[category] || 'Unknown'}`;
}

/**
 * Gets MUI-compatible color for BI-RADS category
 */
function getBiRadsColor(category: BiRadsCategory): string {
  // Categories 4A, 4B, 4C, 5, 6 are suspicious/malignant
  if (category.startsWith('4') || category === '5' || category === '6') {
    return '#DC2626'; // error.main red
  }
  // Category 3 is probably benign - amber warning
  if (category === '3') {
    return '#D97706'; // warning.main amber
  }
  // Categories 0, 1, 2 are negative/benign - green
  return '#16A34A'; // success.main green
}

// ============================================================================
// COMPONENT
// ============================================================================

export const BatchAnalysisRunner: React.FC<BatchAnalysisRunnerProps> = ({
  case: clinicalCase,
  onAnalysisComplete,
  onError,
  onContinue,
  className = '',
}) => {
  const theme = useTheme();
  // State
  const [state, setState] = useState<AnalysisState>('idle');
  const [progress, setProgress] = useState(0);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [result, setResult] = useState<BatchAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const caseRef = useRef(clinicalCase);

  // Memoized values
  const imageCount = useMemo(() => clinicalCase.images?.length || 0, [clinicalCase.images]);
  
  const retryInfo = useMemo(() => {
    return canRetryAnalysis(clinicalCase);
  }, [clinicalCase]);

  // Validate case on mount and when case changes
  useEffect(() => {
    const validationResult = validateCaseForAnalysis(clinicalCase);
    setValidation(validationResult);
  }, [clinicalCase]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Update case ref when case changes (but don't interrupt running analysis)
  useEffect(() => {
    if (state === 'idle') {
      caseRef.current = clinicalCase;
    }
  }, [clinicalCase, state]);

  /**
   * Starts the batch analysis process
   */
  const handleStartAnalysis = useCallback(async () => {
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setState('analyzing');
    setProgress(0);
    setErrorMessage(null);
    setResult(null);

    const analysisResult = await runBatchAnalysis(caseRef.current, {
      onProgress: (p) => setProgress(p),
      abortSignal: abortControllerRef.current.signal,
    });

    if (analysisResult.success) {
      setState('completed');
      setResult(analysisResult.data);
      onAnalysisComplete(analysisResult.data);
    } else if (isFailure(analysisResult)) {
      setState('error');
      const error = analysisResult.error;
      setErrorMessage(error.message);
      onError(error);
      
      // If there are partial results, store them
      if (error instanceof BatchAnalysisError && error.partialResults.length > 0) {
        setResult({
          totalImages: imageCount,
          completedCount: error.partialResults.length,
          failedCount: imageCount - error.partialResults.length,
          results: error.partialResults,
          consolidatedFindings: [],
          totalProcessingTimeMs: 0,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        });
      }
    }
  }, [imageCount, onAnalysisComplete, onError]);

  /**
   * Cancels the running analysis
   */
  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState('idle');
    setProgress(0);
    setErrorMessage(null);
  }, []);

  /**
   * Retries the analysis (either from failure or partial results)
   */
  const handleRetry = useCallback(async () => {
    abortControllerRef.current = new AbortController();
    
    setState('analyzing');
    setProgress(0);
    setErrorMessage(null);

    // If we have partial results, use retry function
    if (retryInfo.canRetry && clinicalCase.analysisResults?.length) {
      const retryResult = await retryFailedAnalyses(caseRef.current, {
        onProgress: (p) => setProgress(p),
        abortSignal: abortControllerRef.current.signal,
      });

      if (retryResult.success) {
        setState('completed');
        setResult(retryResult.data);
        onAnalysisComplete(retryResult.data);
      } else if (isFailure(retryResult)) {
        setState('error');
        setErrorMessage(retryResult.error.message);
        onError(retryResult.error);
      }
    } else {
      // Otherwise, start fresh
      await handleStartAnalysis();
    }
  }, [retryInfo, clinicalCase.analysisResults, handleStartAnalysis, onAnalysisComplete, onError]);

  /**
   * Handles retry of failed images
   */
  const handleRetryFailed = useCallback(async () => {
    abortControllerRef.current = new AbortController();
    
    setState('analyzing');
    setProgress(0);
    setErrorMessage(null);

    const retryResult = await retryFailedAnalyses(caseRef.current, {
      onProgress: (p) => setProgress(p),
      abortSignal: abortControllerRef.current.signal,
    });

    if (retryResult.success) {
      setState('completed');
      setResult(retryResult.data);
      onAnalysisComplete(retryResult.data);
    } else if (isFailure(retryResult)) {
      setState('error');
      setErrorMessage(retryResult.error.message);
      onError(retryResult.error);
    }
  }, [onAnalysisComplete, onError]);

  // ── Render helpers ─────────────────────────────────────────────────

  const renderValidationWarnings = () => {
    if (!validation?.warnings.length) return null;

    return (
      <Alert severity="warning" sx={{ mb: 2, fontFamily: LUNIT.fontBody }}>
        <Typography variant="subtitle2" sx={{ fontFamily: LUNIT.fontBody, fontWeight: 600, mb: 0.5 }}>
          Warnings
        </Typography>
        {validation.warnings.map((warning, index) => (
          <Typography key={index} variant="body2" sx={{ fontFamily: LUNIT.fontBody }}>
            • {warning}
          </Typography>
        ))}
      </Alert>
    );
  };

  const renderValidationErrors = () => {
    if (!validation?.errors.length) return null;

    return (
      <Alert severity="error" role="alert" sx={{ mb: 2, fontFamily: LUNIT.fontBody }}>
        <Typography variant="subtitle2" sx={{ fontFamily: LUNIT.fontBody, fontWeight: 600, mb: 0.5 }}>
          Cannot start analysis
        </Typography>
        {validation.errors.map((error, index) => (
          <Typography key={index} variant="body2" sx={{ fontFamily: LUNIT.fontBody }}>
            • {error.message}
          </Typography>
        ))}
      </Alert>
    );
  };

  const renderErrorMessage = () => {
    if (!errorMessage) return null;

    return (
      <Alert severity="error" role="alert" sx={{ mb: 2, fontFamily: LUNIT.fontBody }}>
        <Typography variant="subtitle2" sx={{ fontFamily: LUNIT.fontBody, fontWeight: 600, mb: 0.5 }}>
          Analysis failed
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: LUNIT.fontBody }}>
          {errorMessage}
        </Typography>
      </Alert>
    );
  };

  const renderProgress = () => {
    if (state !== 'analyzing') return null;

    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ fontFamily: LUNIT.fontBody, color: theme.palette.text.secondary }}>
            Analyzing images…
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: LUNIT.fontBody, fontWeight: 600, color: theme.palette.text.primary }}>
            {progress}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          aria-label="Analysis progress"
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: alpha(LUNIT.teal, 0.12),
            '& .MuiLinearProgress-bar': {
              backgroundColor: LUNIT.teal,
              borderRadius: 4,
            },
          }}
        />
      </Box>
    );
  };

  const renderResult = () => {
    if (!result) return null;

    const isPartialSuccess = result.failedCount > 0;

    return (
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          mb: 2,
          borderColor: isPartialSuccess ? 'warning.main' : 'success.main',
          backgroundColor: isPartialSuccess
            ? alpha('#D97706', 0.04)
            : alpha('#16A34A', 0.04),
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {isPartialSuccess ? (
            <WarningIcon sx={{ color: 'warning.main', fontSize: 20 }} />
          ) : (
            <CheckIcon sx={{ color: 'success.main', fontSize: 20 }} />
          )}
          <Typography
            variant="subtitle1"
            sx={{ fontFamily: LUNIT.fontHeading, fontWeight: 500 }}
          >
            {state === 'completed' ? 'Analysis Complete' : 'Partial Results'}
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ fontFamily: LUNIT.fontBody, color: theme.palette.text.secondary }}>
              Images analyzed
            </Typography>
            <Typography variant="body1" sx={{ fontFamily: LUNIT.fontBody, fontWeight: 600 }}>
              {result.completedCount} of {result.totalImages}
            </Typography>
          </Box>

          {result.totalProcessingTimeMs > 0 && (
            <Box>
              <Typography variant="caption" sx={{ fontFamily: LUNIT.fontBody, color: theme.palette.text.secondary }}>
                Processing time
              </Typography>
              <Typography variant="body1" sx={{ fontFamily: LUNIT.fontBody, fontWeight: 600 }}>
                {formatProcessingTime(result.totalProcessingTimeMs)}
              </Typography>
            </Box>
          )}

          {result.suggestedBiRads !== undefined && (
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Typography variant="caption" sx={{ fontFamily: LUNIT.fontBody, color: theme.palette.text.secondary }}>
                Suggested BI-RADS
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: LUNIT.fontHeading,
                  fontWeight: 500,
                  fontSize: '1.25rem',
                  color: getBiRadsColor(result.suggestedBiRads),
                }}
              >
                {getBiRadsDisplayText(result.suggestedBiRads)}
              </Typography>
            </Box>
          )}

          {result.consolidatedFindings.length > 0 && (
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Typography variant="caption" sx={{ fontFamily: LUNIT.fontBody, color: theme.palette.text.secondary }}>
                Findings detected
              </Typography>
              <Typography variant="body1" sx={{ fontFamily: LUNIT.fontBody, fontWeight: 600 }}>
                {result.consolidatedFindings.length}
              </Typography>
            </Box>
          )}
        </Box>

        {result.warnings && result.warnings.length > 0 && (
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ fontFamily: LUNIT.fontBody, color: 'warning.dark' }}>
              {result.warnings.join('; ')}
            </Typography>
          </Box>
        )}
      </Paper>
    );
  };

  const renderButtons = () => {
    const isValid = validation?.isValid ?? false;

    // Show retry button for failed analyses in case
    if (state === 'idle' && retryInfo.canRetry && clinicalCase.analysisResults?.length) {
      return (
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleStartAnalysis}
            disabled={!isValid}
            startIcon={<PlayArrowIcon />}
            sx={{
              flex: 1,
              fontFamily: LUNIT.fontBody,
              textTransform: 'none',
              borderRadius: 2,
              py: 1.2,
              backgroundColor: LUNIT.teal,
              '&:hover': { backgroundColor: alpha(LUNIT.teal, 0.85) },
            }}
          >
            Start Analysis ({imageCount} images)
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleRetryFailed}
            startIcon={<ReplayIcon />}
            sx={{
              fontFamily: LUNIT.fontBody,
              textTransform: 'none',
              borderRadius: 2,
              py: 1.2,
            }}
          >
            Retry Failed ({retryInfo.failedImageIds.length})
          </Button>
        </Box>
      );
    }

    switch (state) {
      case 'idle':
        return (
          <Button
            variant="contained"
            fullWidth
            onClick={handleStartAnalysis}
            disabled={!isValid}
            startIcon={<PlayArrowIcon />}
            sx={{
              fontFamily: LUNIT.fontBody,
              textTransform: 'none',
              borderRadius: 2,
              py: 1.2,
              backgroundColor: LUNIT.teal,
              '&:hover': { backgroundColor: alpha(LUNIT.teal, 0.85) },
              '&.Mui-disabled': { backgroundColor: alpha(LUNIT.teal, 0.3) },
            }}
          >
            Start Analysis ({imageCount} images)
          </Button>
        );

      case 'analyzing':
        return (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              disabled
              startIcon={<CircularProgress size={18} color="inherit" />}
              sx={{
                flex: 1,
                fontFamily: LUNIT.fontBody,
                textTransform: 'none',
                borderRadius: 2,
                py: 1.2,
                backgroundColor: alpha(LUNIT.teal, 0.7),
              }}
            >
              Analyzing…
            </Button>
            <Button
              variant="outlined"
              onClick={handleCancel}
              startIcon={<StopIcon />}
              sx={{
                fontFamily: LUNIT.fontBody,
                textTransform: 'none',
                borderRadius: 2,
                py: 1.2,
              }}
            >
              Cancel
            </Button>
          </Box>
        );

      case 'error':
        return (
          <Button
            variant="contained"
            color="warning"
            fullWidth
            onClick={handleRetry}
            startIcon={<ReplayIcon />}
            sx={{
              fontFamily: LUNIT.fontBody,
              textTransform: 'none',
              borderRadius: 2,
              py: 1.2,
            }}
          >
            Retry Analysis
          </Button>
        );

      case 'completed':
        if (result && result.failedCount > 0) {
          return (
            <Button
              variant="contained"
              color="warning"
              fullWidth
              onClick={handleRetryFailed}
              startIcon={<ReplayIcon />}
              sx={{
                fontFamily: LUNIT.fontBody,
                textTransform: 'none',
                borderRadius: 2,
                py: 1.2,
              }}
            >
              Retry Failed ({result.failedCount})
            </Button>
          );
        }
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {onContinue && (
              <Button
                variant="contained"
                fullWidth
                onClick={onContinue}
                endIcon={<ArrowForwardIcon />}
                sx={{
                  fontFamily: LUNIT.fontBody,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 2,
                  py: 1.5,
                  fontSize: '1rem',
                  backgroundColor: LUNIT.teal,
                  '&:hover': { backgroundColor: alpha(LUNIT.teal, 0.85) },
                }}
              >
                Proceed to Review Findings
              </Button>
            )}
            <Button
              variant="outlined"
              fullWidth
              onClick={handleStartAnalysis}
              startIcon={<ReplayIcon />}
              sx={{
                fontFamily: LUNIT.fontBody,
                textTransform: 'none',
                borderRadius: 2,
                py: 1.2,
                borderColor: LUNIT.lightGray,
                color: theme.palette.text.secondary,
                '&:hover': { borderColor: LUNIT.teal, color: LUNIT.teal },
              }}
            >
              Re-run Analysis
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  // ── Main render ────────────────────────────────────────────────────

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
      }}
      className={className}
    >
      <Typography
        variant="h6"
        component="h3"
        sx={{
          fontFamily: LUNIT.fontHeading,
          fontWeight: 300,
          fontSize: '1.25rem',
          color: theme.palette.text.primary,
          mb: 1,
        }}
      >
        AI Analysis
      </Typography>

      {/* Image count summary */}
      <Typography
        variant="body2"
        sx={{ fontFamily: LUNIT.fontBody, color: theme.palette.text.secondary, mb: 3 }}
      >
        {imageCount} images ready for analysis
      </Typography>

      {/* Validation warnings */}
      {renderValidationWarnings()}

      {/* Validation errors */}
      {renderValidationErrors()}

      {/* Error message */}
      {renderErrorMessage()}

      {/* Progress bar */}
      {renderProgress()}

      {/* Results */}
      {renderResult()}

      {/* Action buttons */}
      {renderButtons()}
    </Paper>
  );
};

export default BatchAnalysisRunner;
