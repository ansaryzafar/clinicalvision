/**
 * BiRadsAssessmentStep Component
 * 
 * Phase 6: Reporting System
 * 
 * Provides BI-RADS assessment UI with:
 * - Per-breast composition selection
 * - Per-breast BI-RADS category selection
 * - Auto-calculated overall category
 * - Impression and recommendation editing
 * - Form validation
 * - Workflow integration
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  Alert,
  Card,
  CardContent,
  Divider,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox,
  Stack,
  Chip,
  SelectChangeEvent,
  useTheme,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  AutoAwesome,
  LocalHospital,
} from '@mui/icons-material';

import {
  BiRadsAssessment,
  BreastAssessment,
  BreastComposition,
  BiRadsCategory,
  BiRadsValues,
  ClinicalCase,
  ConsolidatedFinding,
  Laterality,
  BIRADS_CATEGORY_DESCRIPTIONS,
  BIRADS_RISK_RANGES,
} from '../../types/case.types';

import {
  createDefaultAssessment,
  updateBreastAssessment,
  generateImpression,
  generateRecommendation,
  validateBiRadsAssessment,
  requiresBiopsy,
} from '../../utils/reportOperations';

// ============================================================================
// TYPES
// ============================================================================

export interface BiRadsAssessmentStepProps {
  /** The current clinical case */
  clinicalCase: ClinicalCase;
  /** AI-suggested BI-RADS category */
  suggestedBiRads?: BiRadsCategory;
  /** Callback when assessment changes */
  onAssessmentChange: (assessment: BiRadsAssessment) => void;
  /** Callback when step is completed */
  onComplete: () => void;
  /** Callback when back button is clicked */
  onBack?: () => void;
  /** Whether the form is read-only */
  isReadOnly?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COMPOSITION_OPTIONS: Array<{ value: BreastComposition; label: string }> = [
  { value: BreastComposition.A, label: 'A - Almost entirely fatty' },
  { value: BreastComposition.B, label: 'B - Scattered areas of fibroglandular density' },
  { value: BreastComposition.C, label: 'C - Heterogeneously dense' },
  { value: BreastComposition.D, label: 'D - Extremely dense' },
];

const BIRADS_OPTIONS: Array<{ value: BiRadsCategory; label: string }> = [
  { value: BiRadsValues.INCOMPLETE, label: '0 - Incomplete - Additional imaging needed' },
  { value: BiRadsValues.NEGATIVE, label: '1 - Negative - No findings' },
  { value: BiRadsValues.BENIGN, label: '2 - Benign' },
  { value: BiRadsValues.PROBABLY_BENIGN, label: '3 - Probably Benign' },
  { value: BiRadsValues.SUSPICIOUS_LOW, label: '4A - Low Suspicion for Malignancy' },
  { value: BiRadsValues.SUSPICIOUS_MODERATE, label: '4B - Moderate Suspicion for Malignancy' },
  { value: BiRadsValues.SUSPICIOUS_HIGH, label: '4C - High Suspicion for Malignancy' },
  { value: BiRadsValues.HIGHLY_SUGGESTIVE, label: '5 - Highly Suggestive of Malignancy' },
  { value: BiRadsValues.KNOWN_MALIGNANCY, label: '6 - Known Biopsy-Proven Malignancy' },
];

const CHANGE_FROM_PRIOR_OPTIONS = [
  { value: 'stable', label: 'Stable' },
  { value: 'improved', label: 'Improved' },
  { value: 'worse', label: 'Worse' },
  { value: 'new', label: 'New finding' },
];

// ============================================================================
// LUNIT DESIGN TOKENS
// ============================================================================

const LUNIT = {
  fontHeading: '"ClashGrotesk", "Inter", sans-serif',
  fontBody: '"Lexend", "Inter", sans-serif',
  teal: '#00C9EA',
} as const;

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface BreastSectionProps {
  title: string;
  assessment?: BreastAssessment;
  onCompositionChange: (composition: BreastComposition) => void;
  onCategoryChange: (category: BiRadsCategory) => void;
  isReadOnly?: boolean;
  findings?: ConsolidatedFinding[];
}

const BreastSection: React.FC<BreastSectionProps> = ({
  title,
  assessment,
  onCompositionChange,
  onCategoryChange,
  isReadOnly = false,
  findings = [],
}) => {
  const handleCompositionChange = (event: SelectChangeEvent<string>) => {
    onCompositionChange(event.target.value as BreastComposition);
  };

  const handleCategoryChange = (event: SelectChangeEvent<string>) => {
    onCategoryChange(event.target.value as BiRadsCategory);
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        
        {findings.length > 0 && (
          <Box sx={{ mb: 2 }}>
            {findings.map((finding, index) => (
              <Chip
                key={finding.id || index}
                label={`${finding.findingType}${finding.clockPosition ? ` @ ${finding.clockPosition}:00` : ''}`}
                size="small"
                sx={{ mr: 0.5, mb: 0.5 }}
              />
            ))}
          </Box>
        )}
        
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Box sx={{ flex: 1 }}>
            <FormControl fullWidth disabled={isReadOnly}>
              <InputLabel id={`${title.toLowerCase().replace(' ', '-')}-composition-label`}>
                Breast Composition
              </InputLabel>
              <Select
                labelId={`${title.toLowerCase().replace(' ', '-')}-composition-label`}
                id={`${title.toLowerCase().replace(' ', '-')}-composition`}
                value={assessment?.composition || ''}
                label="Breast Composition"
                onChange={handleCompositionChange}
                inputProps={{
                  'aria-label': 'Breast Composition',
                }}
              >
                {COMPOSITION_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ flex: 1 }}>
            <FormControl fullWidth disabled={isReadOnly}>
              <InputLabel id={`${title.toLowerCase().replace(' ', '-')}-birads-label`}>
                BI-RADS Category
              </InputLabel>
              <Select
                labelId={`${title.toLowerCase().replace(' ', '-')}-birads-label`}
                id={`${title.toLowerCase().replace(' ', '-')}-birads`}
                value={assessment?.biRadsCategory || ''}
                label="BI-RADS Category"
                onChange={handleCategoryChange}
                inputProps={{
                  'aria-label': 'BI-RADS Category',
                }}
              >
                {BIRADS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Stack>
        
        {assessment?.biRadsCategory && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Risk: {BIRADS_RISK_RANGES[assessment.biRadsCategory]}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const BiRadsAssessmentStep: React.FC<BiRadsAssessmentStepProps> = ({
  clinicalCase,
  suggestedBiRads,
  onAssessmentChange,
  onComplete,
  onBack,
  isReadOnly = false,
}) => {
  const theme = useTheme();
  // Initialize assessment from case or create default
  const [assessment, setAssessment] = useState<BiRadsAssessment>(() => {
    if (clinicalCase.assessment) {
      return clinicalCase.assessment;
    }
    return createDefaultAssessment(suggestedBiRads);
  });

  const [comparedWithPrior, setComparedWithPrior] = useState(
    clinicalCase.assessment?.comparedWithPrior || false
  );
  const [changeFromPrior, setChangeFromPrior] = useState<string>('');
  const [validationAttempted, setValidationAttempted] = useState(false);

  // Sync assessment with case
  useEffect(() => {
    if (clinicalCase.assessment) {
      setAssessment(clinicalCase.assessment);
      setComparedWithPrior(clinicalCase.assessment.comparedWithPrior || false);
    }
  }, [clinicalCase.assessment]);

  // Get findings by laterality
  const rightFindings = useMemo(() => 
    clinicalCase.consolidatedFindings?.filter(f => f.laterality === Laterality.RIGHT) || [],
    [clinicalCase.consolidatedFindings]
  );
  
  const leftFindings = useMemo(() => 
    clinicalCase.consolidatedFindings?.filter(f => f.laterality === Laterality.LEFT) || [],
    [clinicalCase.consolidatedFindings]
  );

  const hasFindings = rightFindings.length > 0 || leftFindings.length > 0;
  const hasPriorAvailable = clinicalCase.clinicalHistory?.comparisonAvailable || false;

  // Validate assessment
  const validationResult = useMemo(() => 
    validateBiRadsAssessment(assessment),
    [assessment]
  );

  const isValid = validationResult.isValid;
  const validationErrors = validationResult.errors.map(e => e.message);

  // Check if biopsy is recommended
  const biopsyRecommended = useMemo(() => {
    if (!assessment.overallCategory) return false;
    return requiresBiopsy(assessment.overallCategory);
  }, [assessment.overallCategory]);

  // Check follow-up interval warning for BI-RADS 3
  const followUpWarning = useMemo(() => {
    if (assessment.overallCategory === BiRadsValues.PROBABLY_BENIGN && !assessment.followUpInterval) {
      return 'BI-RADS 3 requires a 6 month follow-up interval.';
    }
    return null;
  }, [assessment.overallCategory, assessment.followUpInterval]);

  // Update assessment and notify parent
  const updateAssessment = useCallback((updates: Partial<BiRadsAssessment>) => {
    const updated = { ...assessment, ...updates };
    setAssessment(updated);
    onAssessmentChange(updated);
  }, [assessment, onAssessmentChange]);

  // Handle breast composition change
  const handleRightCompositionChange = useCallback((composition: BreastComposition) => {
    const updated = updateBreastAssessment(assessment, 'right', { composition });
    setAssessment(updated);
    onAssessmentChange(updated);
  }, [assessment, onAssessmentChange]);

  const handleLeftCompositionChange = useCallback((composition: BreastComposition) => {
    const updated = updateBreastAssessment(assessment, 'left', { composition });
    setAssessment(updated);
    onAssessmentChange(updated);
  }, [assessment, onAssessmentChange]);

  // Handle BI-RADS category change
  const handleRightCategoryChange = useCallback((category: BiRadsCategory) => {
    const updated = updateBreastAssessment(assessment, 'right', { biRadsCategory: category });
    setAssessment(updated);
    onAssessmentChange(updated);
  }, [assessment, onAssessmentChange]);

  const handleLeftCategoryChange = useCallback((category: BiRadsCategory) => {
    const updated = updateBreastAssessment(assessment, 'left', { biRadsCategory: category });
    setAssessment(updated);
    onAssessmentChange(updated);
  }, [assessment, onAssessmentChange]);

  // Handle impression change
  const handleImpressionChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    updateAssessment({ impression: event.target.value });
  }, [updateAssessment]);

  // Handle recommendation change
  const handleRecommendationChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    updateAssessment({ recommendation: event.target.value });
  }, [updateAssessment]);

  // Handle comparison with prior toggle
  const handleComparisonToggle = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setComparedWithPrior(checked);
    updateAssessment({ comparedWithPrior: checked });
  }, [updateAssessment]);

  // Handle change from prior selection
  const handleChangeFromPriorChange = useCallback((event: SelectChangeEvent<string>) => {
    setChangeFromPrior(event.target.value);
    updateAssessment({ changeFromPrior: event.target.value as any });
  }, [updateAssessment]);

  // Generate impression
  const handleGenerateImpression = useCallback(() => {
    const impression = generateImpression(assessment);
    updateAssessment({ impression });
  }, [assessment, updateAssessment]);

  // Generate recommendation
  const handleGenerateRecommendation = useCallback(() => {
    if (!assessment.overallCategory) return;
    const recommendation = generateRecommendation(assessment.overallCategory);
    updateAssessment({ recommendation });
  }, [assessment.overallCategory, updateAssessment]);

  // Handle back button
  const handleBack = useCallback(() => {
    onBack?.();
  }, [onBack]);

  // Handle complete button
  const handleComplete = useCallback(() => {
    setValidationAttempted(true);
    
    if (isValid) {
      onComplete();
    }
  }, [isValid, onComplete]);

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Typography
        variant="h5"
        gutterBottom
        sx={{ fontFamily: LUNIT.fontHeading, fontWeight: 300, color: theme.palette.text.primary }}
      >
        BI-RADS Assessment
      </Typography>
      
      {/* AI Suggestion */}
      {suggestedBiRads && (
        <Alert severity="info" sx={{ mb: 2 }} icon={<AutoAwesome />}>
          <Typography variant="body2">
            <strong>AI Suggestion:</strong> BI-RADS {suggestedBiRads} - {BIRADS_CATEGORY_DESCRIPTIONS[suggestedBiRads]}
          </Typography>
        </Alert>
      )}

      {/* Biopsy Alert */}
      {biopsyRecommended && (
        <Alert severity="warning" sx={{ mb: 2 }} icon={<LocalHospital />}>
          <Typography variant="body2">
            <strong>Biopsy recommended</strong> for BI-RADS {assessment.overallCategory} findings.
          </Typography>
        </Alert>
      )}

      {/* Follow-up Warning */}
      {followUpWarning && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            {followUpWarning}
          </Typography>
        </Alert>
      )}

      {/* Findings Summary */}
      {!hasFindings && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No significant findings identified.
        </Alert>
      )}

      {/* Breast Sections */}
      <Box sx={{ mb: 3 }}>
        <BreastSection
          title="Right Breast"
          assessment={assessment.rightBreast}
          onCompositionChange={handleRightCompositionChange}
          onCategoryChange={handleRightCategoryChange}
          isReadOnly={isReadOnly}
          findings={rightFindings}
        />
        
        <BreastSection
          title="Left Breast"
          assessment={assessment.leftBreast}
          onCompositionChange={handleLeftCompositionChange}
          onCategoryChange={handleLeftCategoryChange}
          isReadOnly={isReadOnly}
          findings={leftFindings}
        />
      </Box>

      {/* Overall Category Display */}
      <Card variant="outlined" sx={{ mb: 3, bgcolor: 'background.default' }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary">
            Overall BI-RADS Category
          </Typography>
          <Typography 
            variant="h4" 
            data-testid="overall-birads-category"
            sx={{ 
              color: biopsyRecommended ? 'warning.main' : 'text.primary',
              fontWeight: 'bold',
            }}
          >
            {assessment.overallCategory || '—'}
          </Typography>
          {assessment.overallCategory && (
            <Typography variant="body2" color="text.secondary">
              {BIRADS_CATEGORY_DESCRIPTIONS[assessment.overallCategory]}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Divider sx={{ my: 3 }} />

      {/* Comparison with Prior */}
      {hasPriorAvailable && (
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={comparedWithPrior}
                onChange={handleComparisonToggle}
                disabled={isReadOnly}
                inputProps={{ 'aria-label': 'Compared with prior' }}
              />
            }
            label={`Compared with prior mammogram${
              clinicalCase.clinicalHistory?.priorMammogramDate 
                ? ` (${clinicalCase.clinicalHistory.priorMammogramDate})`
                : ''
            }`}
          />
          
          {comparedWithPrior && (
            <FormControl fullWidth sx={{ mt: 1 }} disabled={isReadOnly}>
              <InputLabel id="change-from-prior-label">Change from Prior</InputLabel>
              <Select
                labelId="change-from-prior-label"
                value={changeFromPrior}
                label="Change from Prior"
                onChange={handleChangeFromPriorChange}
              >
                {CHANGE_FROM_PRIOR_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      )}

      {/* Impression */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.teal }}>Impression</Typography>
          {!isReadOnly && (
            <Button
              size="small"
              startIcon={<AutoAwesome />}
              onClick={handleGenerateImpression}
              disabled={!assessment.rightBreast?.biRadsCategory && !assessment.leftBreast?.biRadsCategory}
            >
              Generate Impression
            </Button>
          )}
        </Box>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Impression"
          value={assessment.impression || ''}
          onChange={handleImpressionChange}
          disabled={isReadOnly}
          required
          error={validationAttempted && !assessment.impression}
          helperText={validationAttempted && !assessment.impression ? 'Impression is required.' : ''}
          inputProps={{
            'aria-label': 'Impression',
          }}
        />
      </Box>

      {/* Recommendation */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.teal }}>Recommendation</Typography>
          {!isReadOnly && (
            <Button
              size="small"
              startIcon={<AutoAwesome />}
              onClick={handleGenerateRecommendation}
              disabled={!assessment.overallCategory}
            >
              Generate Recommendation
            </Button>
          )}
        </Box>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Recommendation"
          value={assessment.recommendation || ''}
          onChange={handleRecommendationChange}
          disabled={isReadOnly}
          required
          error={validationAttempted && !assessment.recommendation}
          helperText={validationAttempted && !assessment.recommendation ? 'Recommendation is required.' : ''}
          inputProps={{
            'aria-label': 'Recommendation',
          }}
        />
      </Box>

      {/* Validation Errors */}
      {validationAttempted && validationErrors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Please correct the following errors:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={handleBack}
          sx={{ fontFamily: LUNIT.fontBody, textTransform: 'none' }}
        >
          Back
        </Button>
        
        {!isReadOnly && (
          <Button
            variant="contained"
            endIcon={<ArrowForward />}
            onClick={handleComplete}
            disabled={!isValid}
            sx={{
              fontFamily: LUNIT.fontBody,
              textTransform: 'none',
              backgroundColor: LUNIT.teal,
              '&:hover': { backgroundColor: '#0F95AB' },
            }}
          >
            Complete Assessment
          </Button>
        )}
      </Box>
    </Paper>
  );
};

export default BiRadsAssessmentStep;
