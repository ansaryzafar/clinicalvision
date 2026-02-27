/**
 * WorkflowAnalysisSuite Component
 *
 * Inline image analysis suite for the FINDINGS_REVIEW workflow step.
 * Provides multi-image navigation with MedicalViewer integration,
 * per-image findings sidebar, and fullscreen AnalysisSuite overlay.
 *
 * Features:
 * - Multi-image tab navigator (RCC/LCC/RMLO/LMLO with prediction status dots)
 * - Inline MedicalViewer with GradCAM++ AI overlay and bounding boxes
 * - Per-image findings sidebar: prediction, confidence, risk, regions
 * - "Open Fullscreen Suite" button → AnalysisSuite overlay (z-index 1300)
 * - Data mapping: ImageAnalysisResult ↔ InferenceResponse / API SuspiciousRegion
 * - Back / Continue navigation
 *
 * @version 1.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  alpha,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Fullscreen as FullscreenIcon,
  CheckCircleOutline as CheckIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';
import {
  ClinicalCase,
  ImageAnalysisResult,
  MammogramImage,
  Laterality,
  SuspiciousRegion as DomainSuspiciousRegion,
} from '../../types/case.types';
import {
  InferenceResponse,
  SuspiciousRegion as ApiSuspiciousRegion,
  ExplanationData,
  UncertaintyMetrics,
  ImageMetadata,
} from '../../services/api';
import { MedicalViewer } from '../viewer/MedicalViewer';
import { AnalysisSuite } from '../viewer/AnalysisSuite';

// ============================================================================
// LUNIT DESIGN TOKENS
// ============================================================================

const LUNIT = {
  fontHeading: '"ClashGrotesk", "Inter", sans-serif',
  fontBody: '"Lexend", "Inter", sans-serif',
  teal: '#00C9EA',
  tealDark: '#0F95AB',
  darkGray: '#1A1A2E',
  midGray: '#6B7280',
  lightGray: '#E5E7EB',
  green: '#22C55E',
  red: '#EF5350',
  white: '#FFFFFF',
} as const;

// ============================================================================
// TYPES
// ============================================================================

export interface WorkflowAnalysisSuiteProps {
  /** The clinical case with images and analysis results */
  clinicalCase: ClinicalCase;
  /** Advance to the next workflow step (BI-RADS Assessment) */
  onContinue: () => void;
  /** Go back to the previous step */
  onBack?: () => void;
}

// ============================================================================
// DATA MAPPING FUNCTIONS (exported for unit testing)
// ============================================================================

/**
 * Maps domain-model SuspiciousRegion (camelCase, tuple bbox) to
 * API-format SuspiciousRegion (snake_case, array bbox) for MedicalViewer.
 */
export function mapToViewerRegions(
  regions: DomainSuspiciousRegion[] | undefined
): ApiSuspiciousRegion[] {
  if (!regions || regions.length === 0) return [];
  return regions.map((r) => ({
    bbox: [...r.bbox] as number[],
    attention_score: r.attentionScore,
    location: r.description ?? '',
  }));
}

/**
 * Reconstructs an API-format InferenceResponse from a stored
 * domain-model ImageAnalysisResult, so that the AnalysisSuite
 * component (which expects InferenceResponse) can render correctly.
 */
export function buildInferenceResponse(
  result: ImageAnalysisResult
): InferenceResponse {
  // Map domain regions → API regions
  const apiRegions = mapToViewerRegions(result.suspiciousRegions);

  // Build explanation block
  const explanation: ExplanationData = {
    attention_map: result.attentionMap,
    suspicious_regions: apiRegions,
    narrative: result.attentionSummary ?? '',
    confidence_explanation: result.confidenceExplanation ?? '',
  };

  // Build uncertainty block (default fallback for required fields)
  const uncertainty: UncertaintyMetrics = result.uncertainty
    ? {
        epistemic_uncertainty: result.uncertainty.epistemicUncertainty,
        aleatoric_uncertainty: result.uncertainty.aleatoricUncertainty,
        predictive_entropy: result.uncertainty.predictiveEntropy,
        mutual_information: result.uncertainty.mutualInformation,
        mc_samples: result.uncertainty.mcSamples,
        mc_std: result.uncertainty.mcStd,
        requires_human_review: result.uncertainty.requiresHumanReview,
      }
    : {
        epistemic_uncertainty: 0,
        predictive_entropy: 0,
        requires_human_review: false,
      };

  // Build image metadata if present
  const imageMetadata: ImageMetadata | undefined = result.imageMetadata
    ? {
        original_width: result.imageMetadata.originalWidth,
        original_height: result.imageMetadata.originalHeight,
        model_width: result.imageMetadata.modelWidth,
        model_height: result.imageMetadata.modelHeight,
        scale_x: result.imageMetadata.scaleX,
        scale_y: result.imageMetadata.scaleY,
        aspect_ratio: result.imageMetadata.aspectRatio,
        coordinate_system: result.imageMetadata.coordinateSystem,
      }
    : undefined;

  return {
    prediction: result.prediction,
    confidence: result.confidence,
    probabilities: { ...result.probabilities },
    risk_level: result.riskLevel,
    uncertainty,
    explanation,
    image_metadata: imageMetadata,
    case_id: '',
    model_version: result.modelVersion,
    inference_time_ms: result.processingTimeMs,
    timestamp: result.analyzedAt,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Build a short view label from image metadata (e.g. "RCC", "LMLO").
 */
function getViewLabel(image: MammogramImage): string {
  const lat = image.laterality === Laterality.RIGHT ? 'R' : 'L';
  return `${lat}${image.viewType}`;
}

/**
 * Capitalize first letter.
 */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Get color for a risk level.
 */
function getRiskColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'high':
      return LUNIT.red;
    case 'moderate':
      return '#F59E0B';
    default:
      return LUNIT.green;
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export const WorkflowAnalysisSuite: React.FC<WorkflowAnalysisSuiteProps> = ({
  clinicalCase,
  onContinue,
  onBack,
}) => {
  const { images, analysisResults } = clinicalCase;

  // ── State ──────────────────────────────────────────────────────────
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  // ── Derived data ───────────────────────────────────────────────────

  /** Map imageId → ImageAnalysisResult for quick lookup */
  const resultMap = useMemo(() => {
    const map = new Map<string, ImageAnalysisResult>();
    analysisResults.forEach((r) => map.set(r.imageId, r));
    return map;
  }, [analysisResults]);

  /** The currently selected image (may be undefined if no images) */
  const selectedImage: MammogramImage | undefined = images[selectedIndex];

  /** The analysis result for the selected image (may be undefined) */
  const selectedResult: ImageAnalysisResult | undefined = selectedImage
    ? resultMap.get(selectedImage.id)
    : undefined;

  /** API-format suspicious regions for MedicalViewer */
  const viewerRegions = useMemo(
    () => mapToViewerRegions(selectedResult?.suspiciousRegions),
    [selectedResult?.suspiciousRegions]
  );

  /** InferenceResponse for the fullscreen AnalysisSuite */
  const inferenceResponse = useMemo(
    () => (selectedResult ? buildInferenceResponse(selectedResult) : null),
    [selectedResult]
  );

  // ── Handlers ───────────────────────────────────────────────────────

  const handleTabChange = useCallback(
    (_: React.SyntheticEvent, newValue: number) => {
      setSelectedIndex(newValue);
    },
    []
  );

  const handleOpenFullscreen = useCallback(() => {
    setFullscreenOpen(true);
  }, []);

  const handleCloseFullscreen = useCallback(() => {
    setFullscreenOpen(false);
  }, []);

  // ── Empty state ────────────────────────────────────────────────────

  if (images.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          textAlign: 'center',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontFamily: LUNIT.fontHeading,
            fontWeight: 300,
            color: LUNIT.darkGray,
            mb: 1,
          }}
        >
          Image Analysis
        </Typography>
        <Typography
          sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray }}
        >
          No images available. Please upload images first.
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
          <Button
            variant="contained"
            onClick={onContinue}
            endIcon={<ArrowForwardIcon />}
            sx={{
              fontFamily: LUNIT.fontBody,
              fontWeight: 600,
              borderRadius: '100px',
              textTransform: 'none',
              px: 4,
              py: 1.2,
              backgroundColor: LUNIT.teal,
              '&:hover': { backgroundColor: alpha(LUNIT.teal, 0.85) },
            }}
          >
            Proceed to BI-RADS Assessment
          </Button>
        </Box>
      </Paper>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <Paper
      elevation={0}
      sx={{
        p: 0,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <Box sx={{ px: 4, pt: 3, pb: 1 }}>
        <Typography
          variant="h6"
          component="h3"
          sx={{
            fontFamily: LUNIT.fontHeading,
            fontWeight: 300,
            fontSize: '1.5rem',
            color: LUNIT.darkGray,
            mb: 0.5,
          }}
        >
          Image Analysis
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray }}
        >
          Review AI analysis results with the imaging suite before proceeding
          to BI-RADS assessment.
        </Typography>
      </Box>

      {/* ── Tab Navigator ──────────────────────────────── */}
      <Box sx={{ px: 2 }}>
        <Tabs
          value={selectedIndex}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              fontFamily: LUNIT.fontBody,
              fontWeight: 600,
              fontSize: '0.85rem',
              textTransform: 'none',
              minHeight: 48,
            },
            '& .Mui-selected': {
              color: LUNIT.teal,
            },
            '& .MuiTabs-indicator': {
              backgroundColor: LUNIT.teal,
            },
          }}
        >
          {images.map((img, idx) => {
            const result = resultMap.get(img.id);
            const label = getViewLabel(img);
            const isMalignant = result?.prediction === 'malignant';

            return (
              <Tab
                key={img.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{label}</span>
                    {result ? (
                      <Box
                        data-testid={
                          isMalignant ? 'status-malignant' : 'status-benign'
                        }
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: isMalignant
                            ? LUNIT.red
                            : LUNIT.green,
                        }}
                      />
                    ) : (
                      <Box
                        data-testid="status-pending"
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: LUNIT.midGray,
                        }}
                      />
                    )}
                  </Box>
                }
              />
            );
          })}
        </Tabs>
      </Box>

      <Divider />

      {/* ── Main Content: Viewer + Sidebar ─────────────── */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          minHeight: 500,
        }}
      >
        {/* Viewer area */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            position: 'relative',
            backgroundColor: '#0a0a14',
          }}
        >
          {selectedImage && (
            <MedicalViewer
              imageUrl={selectedImage.localUrl}
              attentionMap={selectedResult?.attentionMap}
              suspiciousRegions={viewerRegions}
              imageMetadata={
                selectedResult?.imageMetadata
                  ? {
                      original_width:
                        selectedResult.imageMetadata.originalWidth,
                      original_height:
                        selectedResult.imageMetadata.originalHeight,
                      model_width: selectedResult.imageMetadata.modelWidth,
                      model_height: selectedResult.imageMetadata.modelHeight,
                      scale_x: selectedResult.imageMetadata.scaleX,
                      scale_y: selectedResult.imageMetadata.scaleY,
                    }
                  : null
              }
            />
          )}

          {/* Fullscreen button overlaid on viewer */}
          <Button
            variant="contained"
            size="small"
            startIcon={<FullscreenIcon />}
            onClick={handleOpenFullscreen}
            aria-label="Open Fullscreen Suite"
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 10,
              fontFamily: LUNIT.fontBody,
              fontWeight: 600,
              fontSize: '0.75rem',
              textTransform: 'none',
              borderRadius: '100px',
              backgroundColor: alpha(LUNIT.darkGray, 0.8),
              color: LUNIT.white,
              backdropFilter: 'blur(4px)',
              '&:hover': {
                backgroundColor: LUNIT.teal,
              },
            }}
          >
            Open Fullscreen Suite
          </Button>
        </Box>

        {/* Findings sidebar */}
        <Box
          sx={{
            width: { xs: '100%', md: 320 },
            borderLeft: { md: '1px solid' },
            borderTop: { xs: '1px solid', md: 'none' },
            borderColor: 'divider',
            p: 2.5,
            overflowY: 'auto',
            maxHeight: { md: 500 },
          }}
        >
          {selectedResult ? (
            <SidebarContent result={selectedResult} />
          ) : (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography
                sx={{
                  fontFamily: LUNIT.fontBody,
                  color: LUNIT.midGray,
                  fontSize: '0.9rem',
                }}
              >
                Not analyzed — no results available for this image.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* ── Navigation Footer ──────────────────────────── */}
      <Divider />
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          px: 4,
          py: 2,
        }}
      >
        {onBack ? (
          <Button
            variant="outlined"
            onClick={onBack}
            startIcon={<ArrowBackIcon />}
            sx={{
              fontFamily: LUNIT.fontBody,
              fontWeight: 500,
              borderRadius: '100px',
              borderColor: LUNIT.lightGray,
              color: LUNIT.darkGray,
              textTransform: 'none',
              px: 3,
              '&:hover': { borderColor: LUNIT.teal, color: LUNIT.teal },
            }}
          >
            Back
          </Button>
        ) : (
          <Box />
        )}

        <Button
          variant="contained"
          onClick={onContinue}
          endIcon={<ArrowForwardIcon />}
          sx={{
            fontFamily: LUNIT.fontBody,
            fontWeight: 600,
            borderRadius: '100px',
            textTransform: 'none',
            px: 4,
            py: 1.2,
            fontSize: '0.95rem',
            backgroundColor: LUNIT.teal,
            '&:hover': { backgroundColor: alpha(LUNIT.teal, 0.85) },
          }}
        >
          Proceed to BI-RADS Assessment
        </Button>
      </Box>

      {/* ── Fullscreen AnalysisSuite Overlay ───────────── */}
      {fullscreenOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1300,
            backgroundColor: LUNIT.darkGray,
          }}
        >
          <AnalysisSuite
            imageFile={null}
            imageUrl={selectedImage?.localUrl}
            analysisResults={inferenceResponse}
            onClose={handleCloseFullscreen}
          />
        </Box>
      )}
    </Paper>
  );
};

// ============================================================================
// SIDEBAR SUB-COMPONENT
// ============================================================================

interface SidebarContentProps {
  result: ImageAnalysisResult;
}

const SidebarContent: React.FC<SidebarContentProps> = ({ result }) => {
  const riskColor = getRiskColor(result.riskLevel);
  const predictionColor =
    result.prediction === 'malignant' ? LUNIT.red : LUNIT.green;
  const confidencePct = Math.round(result.confidence * 100);

  return (
    <>
      {/* Prediction */}
      <Typography
        variant="subtitle2"
        sx={{
          fontFamily: LUNIT.fontHeading,
          fontWeight: 500,
          color: LUNIT.darkGray,
          mb: 1,
        }}
      >
        Analysis Summary
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
        <Chip
          size="small"
          label={capitalize(result.prediction)}
          icon={
            result.prediction === 'benign' ? (
              <CheckIcon sx={{ fontSize: 16 }} />
            ) : (
              <WarningIcon sx={{ fontSize: 16 }} />
            )
          }
          sx={{
            fontFamily: LUNIT.fontBody,
            fontWeight: 600,
            fontSize: '0.8rem',
            backgroundColor: alpha(predictionColor, 0.12),
            color: predictionColor,
            '& .MuiChip-icon': { color: predictionColor },
          }}
        />
        <Chip
          size="small"
          label={`${confidencePct}%`}
          sx={{
            fontFamily: LUNIT.fontBody,
            fontWeight: 600,
            fontSize: '0.8rem',
            backgroundColor: alpha(LUNIT.teal, 0.1),
            color: LUNIT.teal,
          }}
        />
      </Box>

      {/* Risk Level */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="caption"
          sx={{
            fontFamily: LUNIT.fontBody,
            color: LUNIT.midGray,
            display: 'block',
            mb: 0.25,
          }}
        >
          Risk Level
        </Typography>
        <Chip
          size="small"
          label={capitalize(result.riskLevel)}
          sx={{
            fontFamily: LUNIT.fontBody,
            fontWeight: 600,
            fontSize: '0.75rem',
            backgroundColor: alpha(riskColor, 0.12),
            color: riskColor,
          }}
        />
      </Box>

      {/* Probabilities */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="caption"
          sx={{
            fontFamily: LUNIT.fontBody,
            color: LUNIT.midGray,
            display: 'block',
            mb: 0.5,
          }}
        >
          Probabilities
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography
            variant="body2"
            sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.darkGray }}
          >
            Benign: {Math.round(result.probabilities.benign * 100)}%
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.darkGray }}
          >
            Malignant: {Math.round(result.probabilities.malignant * 100)}%
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 1.5 }} />

      {/* Suspicious Regions */}
      <Typography
        variant="subtitle2"
        sx={{
          fontFamily: LUNIT.fontHeading,
          fontWeight: 500,
          color: LUNIT.darkGray,
          mb: 1,
        }}
      >
        Suspicious Regions
      </Typography>

      {result.suspiciousRegions.length === 0 ? (
        <Typography
          variant="body2"
          sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray }}
        >
          No suspicious regions detected.
        </Typography>
      ) : (
        result.suspiciousRegions.map((region, idx) => (
          <Paper
            key={idx}
            variant="outlined"
            sx={{
              p: 1.5,
              mb: 1,
              borderRadius: 1.5,
              borderColor: alpha(getRiskColor('moderate'), 0.3),
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 0.5,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontFamily: LUNIT.fontBody,
                  fontWeight: 600,
                  color: LUNIT.darkGray,
                }}
              >
                Region {idx + 1}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: LUNIT.fontBody,
                  fontWeight: 600,
                  color: getRiskColor(
                    region.attentionScore >= 0.75
                      ? 'high'
                      : region.attentionScore >= 0.5
                      ? 'moderate'
                      : 'low'
                  ),
                }}
              >
                {Math.round(region.attentionScore * 100)}%
              </Typography>
            </Box>
            {region.description && (
              <Typography
                variant="caption"
                sx={{
                  fontFamily: LUNIT.fontBody,
                  color: LUNIT.midGray,
                  display: 'block',
                }}
              >
                {region.description}
              </Typography>
            )}
          </Paper>
        ))
      )}

      {/* Uncertainty info (if available) */}
      {result.uncertainty && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Typography
            variant="subtitle2"
            sx={{
              fontFamily: LUNIT.fontHeading,
              fontWeight: 500,
              color: LUNIT.darkGray,
              mb: 1,
            }}
          >
            Model Confidence
          </Typography>
          {result.uncertainty.requiresHumanReview && (
            <Chip
              size="small"
              icon={<WarningIcon sx={{ fontSize: 14 }} />}
              label="Requires human review"
              sx={{
                fontFamily: LUNIT.fontBody,
                fontSize: '0.7rem',
                mb: 1,
                backgroundColor: alpha('#F59E0B', 0.12),
                color: '#F59E0B',
                '& .MuiChip-icon': { color: '#F59E0B' },
              }}
            />
          )}
          <Typography
            variant="caption"
            sx={{
              fontFamily: LUNIT.fontBody,
              color: LUNIT.midGray,
              display: 'block',
            }}
          >
            Epistemic uncertainty:{' '}
            {(result.uncertainty.epistemicUncertainty * 100).toFixed(1)}%
          </Typography>
        </>
      )}

      {/* Model version */}
      <Divider sx={{ my: 1.5 }} />
      <Typography
        variant="caption"
        sx={{
          fontFamily: LUNIT.fontBody,
          color: alpha(LUNIT.midGray, 0.6),
          display: 'block',
        }}
      >
        Model: {result.modelVersion} · {result.processingTimeMs}ms
      </Typography>
    </>
  );
};

export default WorkflowAnalysisSuite;
