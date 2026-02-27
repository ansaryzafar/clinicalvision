/**
 * ClinicalHistoryStep — Clinical History Form
 * 
 * Step 2 of the redesigned clinical workflow (CLINICAL_HISTORY).
 * Uses useClinicalCase() context with case.types.ts ClinicalHistory type.
 * 
 * Features:
 * - Clinical indication (dropdown from standard options)
 * - Risk factors: family history, personal history, BRCA1/2, prior biopsy
 * - Symptoms (multi-select chip input)
 * - Prior mammogram information
 * - Comparison study availability
 * - Real-time validation via validateClinicalHistory()
 * - Pre-populates from currentCase.clinicalHistory
 * - Lunit-inspired dark theme styling
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
  Alert,
  Stack,
  Snackbar,
  CircularProgress,
  Chip,
  Divider,
  Switch,
  FormControlLabel,
  FormGroup,
  Autocomplete,
  alpha,
} from '@mui/material';
import {
  ArrowForward,
  ArrowBack,
  Save,
  CheckCircle,
  Error as ErrorIcon,
  MedicalServices,
  Warning as WarningIcon,
  Science,
  History,
  Assignment,
} from '@mui/icons-material';
import { useClinicalCase } from '../../contexts/ClinicalCaseContext';
import { validateClinicalHistory } from '../../utils/validators';
import { isFailure } from '../../types/resultHelpers';
import {
  CLINICAL_INDICATION_OPTIONS,
  SYMPTOM_OPTIONS,
  EMPTY_CLINICAL_HISTORY,
} from '../../types/case.types';
import type { ClinicalHistory } from '../../types/case.types';

const LUNIT = {
  fontHeading: '"ClashGrotesk", "Inter", sans-serif',
  fontBody: '"Lexend", "Inter", sans-serif',
  teal: '#00C9EA',
  darkGray: '#1A1A2E',
  midGray: '#6B7280',
  white: '#FFFFFF',
} as const;

// ============================================================================
// COMPONENT
// ============================================================================

export const ClinicalHistoryStep: React.FC = () => {
  const {
    currentCase,
    updateClinicalHistory,
    advanceWorkflow,
    goBackToStep,
    isLoading,
    error: contextError,
    clearError,
  } = useClinicalCase();

  // Form state — maps to case.types.ts ClinicalHistory
  const [formData, setFormData] = useState<ClinicalHistory>({
    ...EMPTY_CLINICAL_HISTORY,
  });

  // UI state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // ========================================================================
  // LOAD EXISTING DATA
  // ========================================================================

  useEffect(() => {
    if (currentCase?.clinicalHistory) {
      setFormData({
        ...EMPTY_CLINICAL_HISTORY,
        ...currentCase.clinicalHistory,
      });
    }
  }, [currentCase?.clinicalHistory]);

  // ========================================================================
  // COMPUTED
  // ========================================================================

  const riskFactorCount = useMemo(() => {
    let count = 0;
    if (formData.familyHistoryBreastCancer) count++;
    if (formData.personalHistoryBreastCancer) count++;
    if (formData.brca1Positive) count++;
    if (formData.brca2Positive) count++;
    if (formData.previousBiopsy) count++;
    return count;
  }, [formData]);

  const isFormComplete = useMemo(() => {
    return !!(
      formData.clinicalIndication?.trim() &&
      typeof formData.familyHistoryBreastCancer === 'boolean' &&
      typeof formData.personalHistoryBreastCancer === 'boolean' &&
      typeof formData.previousBiopsy === 'boolean' &&
      typeof formData.comparisonAvailable === 'boolean'
    );
  }, [formData]);

  // ========================================================================
  // VALIDATION
  // ========================================================================

  const validateForm = useCallback((): boolean => {
    const result = validateClinicalHistory(formData);
    const errors: Record<string, string> = {};

    if (!result.isValid) {
      result.errors.forEach((err) => {
        errors[err.field] = err.message;
      });
    }

    setFieldErrors(errors);
    setWarnings(result.warnings || []);
    return result.isValid;
  }, [formData]);

  useEffect(() => {
    if (hasAttemptedSubmit) {
      validateForm();
    }
  }, [formData, hasAttemptedSubmit, validateForm]);

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const handleBooleanChange = useCallback(
    (field: keyof ClinicalHistory) =>
      (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        setFormData((prev) => ({ ...prev, [field]: checked }));
      },
    []
  );

  const handleTextChange = useCallback(
    (field: keyof ClinicalHistory) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));
        if (fieldErrors[field]) {
          setFieldErrors((prev) => {
            const next = { ...prev };
            delete next[field];
            return next;
          });
        }
      },
    [fieldErrors]
  );

  const handleSymptomsChange = useCallback(
    (_event: React.SyntheticEvent, value: string[]) => {
      setFormData((prev) => ({ ...prev, symptoms: value }));
    },
    []
  );

  const handleSave = useCallback(async () => {
    setHasAttemptedSubmit(true);
    if (!validateForm()) {
      setErrorMessage('Please fix the validation errors before saving.');
      setShowError(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = updateClinicalHistory(formData);
      if (result.success) {
        setShowSuccess(true);
      } else if (isFailure(result)) {
        setErrorMessage(result.error?.message || 'Failed to save clinical history.');
        setShowError(true);
      }
    } catch {
      setErrorMessage('An unexpected error occurred.');
      setShowError(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, updateClinicalHistory]);

  const handleSaveAndAdvance = useCallback(async () => {
    setHasAttemptedSubmit(true);
    if (!validateForm()) {
      setErrorMessage('Please fix the validation errors before proceeding.');
      setShowError(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const saveResult = updateClinicalHistory(formData);
      if (isFailure(saveResult)) {
        setErrorMessage(saveResult.error?.message || 'Failed to save.');
        setShowError(true);
        return;
      }
      const advResult = advanceWorkflow();
      if (isFailure(advResult)) {
        setErrorMessage(advResult.error?.message || 'Cannot advance to next step.');
        setShowError(true);
      }
    } catch {
      setErrorMessage('An unexpected error occurred.');
      setShowError(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, updateClinicalHistory, advanceWorkflow]);

  const handleGoBack = useCallback(() => {
    goBackToStep('patient_registration' as any);
  }, [goBackToStep]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          background: LUNIT.white,
          border: `1px solid ${alpha(LUNIT.teal, 0.18)}`,
          borderRadius: 2,
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h5"
            sx={{
              fontFamily: LUNIT.fontHeading,
              fontWeight: 300,
              color: LUNIT.darkGray,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <MedicalServices sx={{ color: LUNIT.teal }} />
            Clinical History
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: LUNIT.fontBody, color: LUNIT.midGray, mt: 0.5 }}>
            Provide clinical history and risk factor assessment for this examination.
          </Typography>
        </Box>

        {/* Context Error */}
        {contextError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
            {contextError.message}
          </Alert>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </Alert>
        )}

        <Stack spacing={3}>
          {/* Section: Clinical Indication */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                color: LUNIT.teal,
                fontWeight: 600,
                mb: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <Assignment fontSize="small" />
              Clinical Indication *
            </Typography>

            <TextField
              fullWidth
              required
              select
              label="Indication"
              value={formData.clinicalIndication || ''}
              onChange={handleTextChange('clinicalIndication')}
              error={!!fieldErrors.clinicalIndication}
              helperText={fieldErrors.clinicalIndication || 'Reason for this examination'}
            >
              {CLINICAL_INDICATION_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>

            {/* Symptoms (only for diagnostic indications) */}
            {formData.clinicalIndication?.startsWith('Diagnostic') && (
              <Box sx={{ mt: 2 }}>
                <Autocomplete
                  multiple
                  options={[...SYMPTOM_OPTIONS]}
                  value={formData.symptoms || []}
                  onChange={handleSymptomsChange}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option}
                        size="small"
                        {...getTagProps({ index })}
                        key={option}
                        sx={{ borderColor: alpha(LUNIT.teal, 0.4) }}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Symptoms"
                      placeholder="Select relevant symptoms"
                      helperText="Select all that apply"
                    />
                  )}
                />
              </Box>
            )}
          </Box>

          <Divider sx={{ borderColor: alpha(LUNIT.teal, 0.12) }} />

          {/* Section: Risk Factors */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                color: LUNIT.teal,
                fontWeight: 600,
                mb: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <WarningIcon fontSize="small" />
              Risk Factors
              {riskFactorCount > 0 && (
                <Chip
                  label={`${riskFactorCount} factor${riskFactorCount > 1 ? 's' : ''}`}
                  size="small"
                  color={riskFactorCount >= 3 ? 'error' : riskFactorCount >= 1 ? 'warning' : 'default'}
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>

            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.familyHistoryBreastCancer}
                    onChange={handleBooleanChange('familyHistoryBreastCancer')}
                    color="warning"
                  />
                }
                label="Family history of breast cancer"
              />
              {fieldErrors.familyHistoryBreastCancer && (
                <Typography variant="caption" color="error" sx={{ ml: 6 }}>
                  {fieldErrors.familyHistoryBreastCancer}
                </Typography>
              )}

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.personalHistoryBreastCancer}
                    onChange={handleBooleanChange('personalHistoryBreastCancer')}
                    color="error"
                  />
                }
                label="Personal history of breast cancer"
              />
              {fieldErrors.personalHistoryBreastCancer && (
                <Typography variant="caption" color="error" sx={{ ml: 6 }}>
                  {fieldErrors.personalHistoryBreastCancer}
                </Typography>
              )}

              <Stack direction="row" spacing={4} sx={{ ml: 2, mt: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.brca1Positive || false}
                      onChange={handleBooleanChange('brca1Positive')}
                      color="error"
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      BRCA1 Positive
                    </Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.brca2Positive || false}
                      onChange={handleBooleanChange('brca2Positive')}
                      color="error"
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      BRCA2 Positive
                    </Typography>
                  }
                />
              </Stack>
            </FormGroup>
          </Box>

          <Divider sx={{ borderColor: alpha(LUNIT.teal, 0.12) }} />

          {/* Section: Previous Biopsy */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                color: LUNIT.teal,
                fontWeight: 600,
                mb: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <Science fontSize="small" />
              Biopsy History
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.previousBiopsy}
                  onChange={handleBooleanChange('previousBiopsy')}
                />
              }
              label="Previous breast biopsy"
            />
            {fieldErrors.previousBiopsy && (
              <Typography variant="caption" color="error" sx={{ ml: 6 }}>
                {fieldErrors.previousBiopsy}
              </Typography>
            )}

            {formData.previousBiopsy && (
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Biopsy Results"
                placeholder="Describe previous biopsy findings..."
                value={formData.biopsyResults || ''}
                onChange={handleTextChange('biopsyResults')}
                sx={{ mt: 1, ml: 6 }}
              />
            )}
          </Box>

          <Divider sx={{ borderColor: alpha(LUNIT.teal, 0.12) }} />

          {/* Section: Prior Studies */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                color: LUNIT.teal,
                fontWeight: 600,
                mb: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <History fontSize="small" />
              Prior Studies
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.comparisonAvailable}
                  onChange={handleBooleanChange('comparisonAvailable')}
                />
              }
              label="Prior study available for comparison"
            />
            {fieldErrors.comparisonAvailable && (
              <Typography variant="caption" color="error" sx={{ ml: 6 }}>
                {fieldErrors.comparisonAvailable}
              </Typography>
            )}

            {formData.comparisonAvailable && (
              <Stack spacing={2} sx={{ mt: 1, ml: 6 }}>
                <TextField
                  type="date"
                  label="Prior Mammogram Date"
                  value={formData.priorMammogramDate || ''}
                  onChange={handleTextChange('priorMammogramDate')}
                  error={!!fieldErrors.priorMammogramDate}
                  helperText={fieldErrors.priorMammogramDate}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ maxWidth: 250 }}
                />
                <TextField
                  fullWidth
                  label="Prior Mammogram Findings"
                  placeholder="Summarize prior findings..."
                  value={formData.priorMammogramFinding || ''}
                  onChange={handleTextChange('priorMammogramFinding')}
                />
              </Stack>
            )}
          </Box>

          <Divider sx={{ borderColor: alpha(LUNIT.teal, 0.12) }} />

          {/* Section: Additional Notes */}
          <Box>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Additional Clinical Notes"
              placeholder="Any additional relevant clinical information..."
              value={formData.additionalNotes || ''}
              onChange={handleTextChange('additionalNotes')}
              error={!!fieldErrors.additionalNotes}
              helperText={fieldErrors.additionalNotes || 'Optional — free-text notes'}
            />
          </Box>
        </Stack>

        {/* Action Buttons */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            mt: 4,
            pt: 3,
            borderTop: `1px solid ${alpha(LUNIT.teal, 0.12)}`,
          }}
        >
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={handleGoBack}
            sx={{
              borderColor: alpha(LUNIT.teal, 0.15),
              color: LUNIT.midGray,
              '&:hover': { borderColor: alpha(LUNIT.teal, 0.25) },
            }}
          >
            Back
          </Button>

          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={isSubmitting ? <CircularProgress size={16} /> : <Save />}
              onClick={handleSave}
              disabled={isSubmitting || isLoading || !isFormComplete}
              sx={{
                borderColor: alpha(LUNIT.teal, 0.4),
                color: LUNIT.teal,
                '&:hover': {
                  borderColor: LUNIT.teal,
                  background: alpha(LUNIT.teal, 0.06),
                },
              }}
            >
              Save
            </Button>

            <Button
              variant="contained"
              endIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <ArrowForward />}
              onClick={handleSaveAndAdvance}
              disabled={isSubmitting || isLoading || !isFormComplete}
              sx={{
                fontFamily: LUNIT.fontBody,
                textTransform: 'none',
                background: `linear-gradient(135deg, ${LUNIT.teal} 0%, ${alpha(LUNIT.teal, 0.7)} 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${alpha(LUNIT.teal, 0.85)} 0%, ${alpha(LUNIT.teal, 0.75)} 100%)`,
                },
              }}
            >
              Save & Continue
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setShowSuccess(false)} icon={<CheckCircle />}>
          Clinical history saved successfully.
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={showError}
        autoHideDuration={5000}
        onClose={() => setShowError(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity="error" onClose={() => setShowError(false)} icon={<ErrorIcon />}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ClinicalHistoryStep;
