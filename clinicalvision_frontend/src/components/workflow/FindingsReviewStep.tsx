/**
 * FindingsReviewStep Component
 *
 * Replaces the 3 redundant PlaceholderSteps (Review Findings, Measurements, Annotations)
 * with an integrated step that displays:
 * - Per-image AI analysis result cards (prediction, confidence, risk)
 * - Consolidated findings table (finding type, laterality, size, BI-RADS, AI confidence)
 * - Clear CTA to proceed to BI-RADS Assessment
 *
 * Styled with LUNIT design tokens for consistency with the clinical workflow.
 *
 * @version 1.0
 */

import React from 'react';
import {
  alpha,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircleOutline as CheckIcon,
  WarningAmber as WarningIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import {
  ClinicalCase,
  ImageAnalysisResult,
  ConsolidatedFinding,
  MammogramImage,
  Laterality,
  ViewType,
} from '../../types/case.types';

// ============================================================================
// LUNIT DESIGN TOKENS
// ============================================================================

const LUNIT = {
  fontHeading: '"ClashGrotesk", "Inter", sans-serif',
  fontBody: '"Lexend", "Inter", sans-serif',
  teal: '#00C9EA',
  darkGray: '#1A1A2E',
  midGray: '#6B7280',
  lightGray: '#E5E7EB',
  green: '#22C55E',
  white: '#FFFFFF',
} as const;

// ============================================================================
// TYPES
// ============================================================================

export interface FindingsReviewStepProps {
  /** The clinical case with analysis results */
  clinicalCase: ClinicalCase;
  /** Advance to the next workflow step */
  onContinue: () => void;
  /** Go back to the previous step */
  onBack?: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Builds a view label (e.g. "RCC", "LMLO") from image metadata.
 */
function getViewLabel(image: MammogramImage): string {
  const lat = image.laterality === Laterality.RIGHT ? 'R' : 'L';
  return `${lat}${image.viewType}`;
}

/**
 * Returns a human-readable label for the laterality enum.
 */
function formatLaterality(lat: Laterality): string {
  return lat === Laterality.RIGHT ? 'Right' : 'Left';
}

/**
 * Capitalise first letter.
 */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Get the color for a prediction.
 */
function getPredictionColor(prediction: 'benign' | 'malignant'): string {
  return prediction === 'benign' ? LUNIT.green : '#EF5350';
}

/**
 * Format finding type from enum value (e.g. 'mass' → 'Mass', 'architectural_distortion' → 'Architectural distortion')
 */
function formatFindingType(type: string): string {
  return capitalize(type.replace(/_/g, ' '));
}

// ============================================================================
// COMPONENT
// ============================================================================

export const FindingsReviewStep: React.FC<FindingsReviewStepProps> = ({
  clinicalCase,
  onContinue,
  onBack,
}) => {
  const { images, analysisResults, consolidatedFindings } = clinicalCase;

  // Build a lookup: imageId → MammogramImage
  const imageMap = React.useMemo(() => {
    const map = new Map<string, MammogramImage>();
    images.forEach((img) => map.set(img.id, img));
    return map;
  }, [images]);

  // ── Per-Image Result Cards ───────────────────────────────────────────

  const renderImageResults = () => {
    if (!analysisResults || analysisResults.length === 0) {
      return (
        <Box
          sx={{
            py: 4,
            textAlign: 'center',
            border: '1px dashed',
            borderColor: LUNIT.lightGray,
            borderRadius: 2,
          }}
        >
          <InfoIcon sx={{ fontSize: 36, color: LUNIT.midGray, mb: 1 }} />
          <Typography
            sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray }}
          >
            No analysis results available. Please run the AI analysis first.
          </Typography>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2,
        }}
      >
        {analysisResults.map((result) => {
          const img = imageMap.get(result.imageId);
          const viewLabel = img ? getViewLabel(img) : result.imageId;
          const color = getPredictionColor(result.prediction);
          const pct = Math.round(result.confidence * 100);

          return (
            <Paper
              key={result.imageId}
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 2,
                borderColor: alpha(color, 0.3),
                backgroundColor: alpha(color, 0.03),
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1.5,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontFamily: LUNIT.fontHeading,
                    fontWeight: 500,
                    color: LUNIT.darkGray,
                  }}
                >
                  {viewLabel}
                </Typography>
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
                    fontSize: '0.75rem',
                    backgroundColor: alpha(color, 0.12),
                    color,
                    '& .MuiChip-icon': { color },
                  }}
                />
              </Box>

              {/* Confidence bar */}
              <Box sx={{ mb: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 0.5,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray }}
                  >
                    Confidence
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: LUNIT.fontBody,
                      fontWeight: 600,
                      color: LUNIT.darkGray,
                    }}
                  >
                    {pct}%
                  </Typography>
                </Box>
                <Box
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: alpha(color, 0.12),
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${pct}%`,
                      borderRadius: 3,
                      backgroundColor: color,
                    }}
                  />
                </Box>
              </Box>

              {/* Probabilities */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mt: 1,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray }}
                >
                  Benign: {Math.round(result.probabilities.benign * 100)}%
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray }}
                >
                  Malignant: {Math.round(result.probabilities.malignant * 100)}%
                </Typography>
              </Box>
            </Paper>
          );
        })}
      </Box>
    );
  };

  // ── Consolidated Findings Table ──────────────────────────────────────

  const renderConsolidatedFindings = () => {
    if (!consolidatedFindings || consolidatedFindings.length === 0) {
      return (
        <Box
          sx={{
            py: 3,
            textAlign: 'center',
            border: '1px dashed',
            borderColor: LUNIT.lightGray,
            borderRadius: 2,
          }}
        >
          <CheckIcon sx={{ fontSize: 32, color: LUNIT.green, mb: 1 }} />
          <Typography
            sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray }}
          >
            No suspicious findings detected
          </Typography>
        </Box>
      );
    }

    return (
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ borderRadius: 2, borderColor: LUNIT.lightGray }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: alpha(LUNIT.teal, 0.04) }}>
              <TableCell
                sx={{
                  fontFamily: LUNIT.fontBody,
                  fontWeight: 600,
                  color: LUNIT.darkGray,
                  fontSize: '0.8rem',
                }}
              >
                Finding
              </TableCell>
              <TableCell
                sx={{
                  fontFamily: LUNIT.fontBody,
                  fontWeight: 600,
                  color: LUNIT.darkGray,
                  fontSize: '0.8rem',
                }}
              >
                Laterality
              </TableCell>
              <TableCell
                sx={{
                  fontFamily: LUNIT.fontBody,
                  fontWeight: 600,
                  color: LUNIT.darkGray,
                  fontSize: '0.8rem',
                }}
              >
                Size (mm)
              </TableCell>
              <TableCell
                sx={{
                  fontFamily: LUNIT.fontBody,
                  fontWeight: 600,
                  color: LUNIT.darkGray,
                  fontSize: '0.8rem',
                }}
              >
                AI Confidence
              </TableCell>
              <TableCell
                sx={{
                  fontFamily: LUNIT.fontBody,
                  fontWeight: 600,
                  color: LUNIT.darkGray,
                  fontSize: '0.8rem',
                }}
              >
                BI-RADS
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {consolidatedFindings.map((finding) => (
              <TableRow key={finding.id} hover>
                <TableCell sx={{ fontFamily: LUNIT.fontBody, fontSize: '0.85rem' }}>
                  {formatFindingType(finding.findingType)}
                  {finding.shape && (
                    <Typography
                      variant="caption"
                      component="span"
                      sx={{ ml: 0.5, color: LUNIT.midGray }}
                    >
                      ({finding.shape}{finding.margin ? `, ${finding.margin}` : ''})
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ fontFamily: LUNIT.fontBody, fontSize: '0.85rem' }}>
                  {formatLaterality(finding.laterality)}
                  {finding.clockPosition && (
                    <Typography
                      variant="caption"
                      component="span"
                      sx={{ ml: 0.5, color: LUNIT.midGray }}
                    >
                      {finding.clockPosition} o&apos;clock
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ fontFamily: LUNIT.fontBody, fontSize: '0.85rem' }}>
                  {finding.size
                    ? `${finding.size.length}${finding.size.width ? ` × ${finding.size.width}` : ''}`
                    : '—'}
                </TableCell>
                <TableCell sx={{ fontFamily: LUNIT.fontBody, fontSize: '0.85rem' }}>
                  {finding.aiConfidence != null
                    ? `${Math.round(finding.aiConfidence * 100)}%`
                    : '—'}
                </TableCell>
                <TableCell>
                  {finding.individualBiRads ? (
                    <Chip
                      size="small"
                      label={finding.individualBiRads}
                      sx={{
                        fontFamily: LUNIT.fontBody,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        backgroundColor: alpha(LUNIT.teal, 0.1),
                        color: LUNIT.darkGray,
                      }}
                    />
                  ) : (
                    '—'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // ── Main Render ──────────────────────────────────────────────────────

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Section heading */}
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
        Review Findings
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray, mb: 3 }}
      >
        Review AI analysis results per image and consolidated findings before
        proceeding to the BI-RADS assessment.
      </Typography>

      {/* Per-Image Results */}
      <Typography
        variant="subtitle2"
        sx={{
          fontFamily: LUNIT.fontHeading,
          fontWeight: 500,
          color: LUNIT.darkGray,
          mb: 1.5,
        }}
      >
        Per-Image Analysis
      </Typography>
      {renderImageResults()}

      <Divider sx={{ my: 3 }} />

      {/* Consolidated Findings */}
      <Typography
        variant="subtitle2"
        sx={{
          fontFamily: LUNIT.fontHeading,
          fontWeight: 500,
          color: LUNIT.darkGray,
          mb: 1.5,
        }}
      >
        Consolidated Findings
      </Typography>
      {renderConsolidatedFindings()}

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
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
    </Paper>
  );
};

export default FindingsReviewStep;
