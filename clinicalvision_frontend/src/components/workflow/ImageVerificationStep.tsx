/**
 * ImageVerificationStep — Phase 2 Imaging (step 3)
 *
 * Renders uploaded mammogram thumbnails with view-type / laterality labels,
 * allows the user to reassign them via dropdowns, shows completeness
 * warnings against the standard 4-view set, and has Back / Continue
 * navigation.
 *
 * @module ImageVerificationStep
 */

import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Alert,
  Card,
  CardMedia,
  CardContent,
  Grid,
  Chip,
  alpha,
  SelectChangeEvent,
  useTheme,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ImageIcon from '@mui/icons-material/Image';

import {
  ViewType,
  Laterality,
  STANDARD_VIEWS,
  LATERALITY_LABELS,
} from '../../types/case.types';

import { useClinicalCase } from '../../contexts/ClinicalCaseContext';

// ============================================================================
// DESIGN TOKENS (LUNIT)
// ============================================================================

const LUNIT = {
  teal: '#00C9EA',
  tealDark: '#0F95AB',
  lightGray: '#E5E7EB',
  lightest: '#EFF0F4',
  fontHeading: '"ClashGrotesk", sans-serif',
  fontBody: '"Lexend", sans-serif',
};

// Short labels used in selects (no long descriptions)
const VIEW_OPTIONS: { value: ViewType; label: string }[] = [
  { value: ViewType.CC,   label: 'CC' },
  { value: ViewType.MLO,  label: 'MLO' },
  { value: ViewType.ML,   label: 'ML' },
  { value: ViewType.LM,   label: 'LM' },
  { value: ViewType.XCCL, label: 'XCCL' },
  { value: ViewType.XCCM, label: 'XCCM' },
  { value: ViewType.SPOT, label: 'SPOT' },
  { value: ViewType.MAG,  label: 'MAG' },
];

const LATERALITY_OPTIONS: { value: Laterality; label: string }[] = [
  { value: Laterality.RIGHT, label: 'Right' },
  { value: Laterality.LEFT,  label: 'Left' },
];

// ============================================================================
// PROPS
// ============================================================================

export interface ImageVerificationStepProps {
  onBack?: () => void;
  onContinue?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ImageVerificationStep: React.FC<ImageVerificationStepProps> = ({
  onBack,
  onContinue,
}) => {
  const theme = useTheme();
  const { currentCase, updateImage } = useClinicalCase();

  const images = currentCase?.images ?? [];

  // Compute which standard views are missing
  const missingViews = useMemo(() => {
    return STANDARD_VIEWS.filter(
      (sv) =>
        !images.some(
          (img) => img.viewType === sv.viewType && img.laterality === sv.laterality,
        ),
    );
  }, [images]);

  const isComplete = missingViews.length === 0;
  const hasImages = images.length > 0;

  // ---- Handlers ----------------------------------------------------------

  const handleViewTypeChange = (imageId: string) => (e: SelectChangeEvent) => {
    updateImage(imageId, { viewType: e.target.value as ViewType });
  };

  const handleLateralityChange = (imageId: string) => (e: SelectChangeEvent) => {
    updateImage(imageId, { laterality: e.target.value as Laterality });
  };

  // ---- Render ------------------------------------------------------------

  // Null / empty-case guard
  if (!currentCase) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography sx={{ fontFamily: LUNIT.fontBody, color: theme.palette.text.secondary }}>
          No case loaded. Please go back and upload images.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 2, py: 3 }}>
      {/* Header */}
      <Typography
        variant="h5"
        sx={{
          fontFamily: LUNIT.fontHeading,
          fontWeight: 300,
          color: theme.palette.text.primary,
          mb: 1,
        }}
      >
        Verify Images
      </Typography>
      <Typography
        sx={{
          fontFamily: LUNIT.fontBody,
          color: theme.palette.text.secondary,
          fontSize: '0.95rem',
          mb: 3,
        }}
      >
        Confirm that each image has the correct view type and laterality before
        proceeding to AI analysis.
      </Typography>

      {/* Completeness banner */}
      {hasImages && (
        <Box sx={{ mb: 3 }}>
          {isComplete ? (
            <Alert
              icon={<CheckCircleOutlineIcon />}
              severity="success"
              sx={{ fontFamily: LUNIT.fontBody }}
            >
              Standard 4-view set is complete.
            </Alert>
          ) : (
            <Alert
              icon={<WarningAmberIcon />}
              severity="warning"
              sx={{ fontFamily: LUNIT.fontBody }}
            >
              <div>
                Missing standard views:{' '}
                {missingViews.map((mv) => (
                  <Chip
                    key={mv.label}
                    label={`${mv.laterality === Laterality.RIGHT ? 'R' : 'L'}-${mv.viewType}`}
                    size="small"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </div>
            </Alert>
          )}
        </Box>
      )}

      {/* Empty state */}
      {!hasImages && (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <ImageIcon sx={{ fontSize: 48, color: theme.palette.text.secondary, mb: 1 }} />
          <Typography sx={{ fontFamily: LUNIT.fontBody, color: theme.palette.text.secondary }}>
            No images uploaded yet. Go back to upload images.
          </Typography>
        </Box>
      )}

      {/* Image cards */}
      <Grid container spacing={2}>
        {images.map((img) => {
          const compositeLabel = `${img.laterality === Laterality.RIGHT ? 'R' : 'L'}-${img.viewType}`;
          return (
            <Grid item xs={12} sm={6} md={3} key={img.id}>
              <Card
                variant="outlined"
                sx={{
                  borderColor: LUNIT.lightGray,
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <CardMedia
                  component="img"
                  image={img.localUrl}
                  alt={compositeLabel}
                  sx={{
                    height: 180,
                    objectFit: 'contain',
                    background: LUNIT.lightest,
                  }}
                />
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  {/* Composite label chip */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 1,
                    }}
                  >
                    <Chip
                      label={compositeLabel}
                      size="small"
                      sx={{
                        backgroundColor: alpha(LUNIT.teal, 0.12),
                        color: LUNIT.tealDark,
                        fontFamily: LUNIT.fontBody,
                        fontWeight: 600,
                      }}
                    />
                  </Box>

                  {/* Filename */}
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: LUNIT.fontBody,
                      color: theme.palette.text.secondary,
                      display: 'block',
                      mb: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {img.filename}
                  </Typography>

                  {/* View Type selector */}
                  <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                    <InputLabel id={`view-type-label-${img.id}`}>View Type</InputLabel>
                    <Select
                      native
                      labelId={`view-type-label-${img.id}`}
                      label="View Type"
                      inputProps={{ 'aria-label': 'View Type' }}
                      value={img.viewType}
                      onChange={handleViewTypeChange(img.id)}
                    >
                      {VIEW_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Laterality selector */}
                  <FormControl fullWidth size="small">
                    <InputLabel id={`laterality-label-${img.id}`}>Laterality</InputLabel>
                    <Select
                      native
                      labelId={`laterality-label-${img.id}`}
                      label="Laterality"
                      inputProps={{ 'aria-label': 'Laterality' }}
                      value={img.laterality}
                      onChange={handleLateralityChange(img.id)}
                    >
                      {LATERALITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Navigation */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mt: 4,
          pt: 2,
          borderTop: `1px solid ${LUNIT.lightGray}`,
        }}
      >
        {onBack ? (
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            sx={{
              fontFamily: LUNIT.fontBody,
              textTransform: 'none',
              borderColor: LUNIT.lightGray,
              color: theme.palette.text.secondary,
            }}
          >
            Back
          </Button>
        ) : (
          <Box />
        )}
        <Button
          variant="contained"
          endIcon={<ArrowForwardIcon />}
          disabled={!hasImages}
          onClick={onContinue}
          sx={{
            fontFamily: LUNIT.fontBody,
            textTransform: 'none',
            backgroundColor: LUNIT.teal,
            '&:hover': { backgroundColor: LUNIT.tealDark },
          }}
        >
          Continue
        </Button>
      </Box>
    </Box>
  );
};

export default ImageVerificationStep;
