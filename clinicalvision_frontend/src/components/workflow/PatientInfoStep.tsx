/**
 * PatientInfoStep — Redesigned Patient Information Form
 * 
 * Step 1 of the redesigned clinical workflow (PATIENT_REGISTRATION).
 * Uses useClinicalCase() context with case.types.ts PatientInfo type.
 * 
 * Features:
 * - MRN, First/Last Name, DOB, Sex, Phone, Email, Insurance
 * - Real-time validation via validatePatientInfo() from validators.ts
 * - Inline per-field error messages
 * - Pre-populates from currentCase.patient if editing
 * - Auto-calculates age from DOB
 * - Keyboard shortcut: Ctrl+S to save
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
  Tooltip,
  IconButton,
  Divider,
  Chip,
  alpha,
} from '@mui/material';
import {
  ArrowForward,
  Save,
  CheckCircle,
  Error as ErrorIcon,
  Info,
  Person,
  Badge,
  CalendarMonth,
  Phone,
  Email,
  Shield,
} from '@mui/icons-material';
import { useClinicalCase } from '../../contexts/ClinicalCaseContext';
import { validatePatientInfo } from '../../utils/validators';
import { isFailure } from '../../types/resultHelpers';
import type { PatientInfo } from '../../types/case.types';

const LUNIT = {
  fontHeading: '"ClashGrotesk", "Inter", sans-serif',
  fontBody: '"Lexend", "Inter", sans-serif',
  teal: '#00C9EA',
  darkGray: '#1A1A2E',
  midGray: '#6B7280',
  white: '#FFFFFF',
} as const;

// ============================================================================
// CONSTANTS
// ============================================================================

const SEX_OPTIONS = [
  { value: 'F', label: 'Female' },
  { value: 'M', label: 'Male' },
  { value: 'O', label: 'Other' },
] as const;

// ============================================================================
// COMPONENT
// ============================================================================

export const PatientInfoStep: React.FC = () => {
  const {
    currentCase,
    updatePatientInfo,
    advanceWorkflow,
    isLoading,
    error: contextError,
    clearError,
  } = useClinicalCase();

  // Form state — maps to case.types.ts PatientInfo
  const [formData, setFormData] = useState<Partial<PatientInfo>>({
    mrn: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'F',
    phone: '',
    email: '',
    insuranceProvider: '',
    insuranceId: '',
  });

  // UI state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // ========================================================================
  // LOAD EXISTING DATA
  // ========================================================================

  useEffect(() => {
    if (currentCase?.patient) {
      setFormData({
        mrn: currentCase.patient.mrn || '',
        firstName: currentCase.patient.firstName || '',
        lastName: currentCase.patient.lastName || '',
        dateOfBirth: currentCase.patient.dateOfBirth || '',
        gender: currentCase.patient.gender || 'F',
        phone: currentCase.patient.phone || '',
        email: currentCase.patient.email || '',
        insuranceProvider: currentCase.patient.insuranceProvider || '',
        insuranceId: currentCase.patient.insuranceId || '',
      });
    }
  }, [currentCase?.patient]);

  // ========================================================================
  // COMPUTED VALUES
  // ========================================================================

  const calculatedAge = useMemo(() => {
    if (!formData.dateOfBirth) return null;
    const dob = new Date(formData.dateOfBirth);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 && age < 150 ? age : null;
  }, [formData.dateOfBirth]);

  const isFormComplete = useMemo(() => {
    return !!(
      formData.mrn?.trim() &&
      formData.firstName?.trim() &&
      formData.lastName?.trim() &&
      formData.dateOfBirth &&
      formData.gender
    );
  }, [formData]);

  // ========================================================================
  // VALIDATION
  // ========================================================================

  const validateForm = useCallback((): boolean => {
    const result = validatePatientInfo(formData as PatientInfo);
    const errors: Record<string, string> = {};

    if (!result.isValid) {
      result.errors.forEach((err) => {
        errors[err.field] = err.message;
      });
    }

    setFieldErrors(errors);
    return result.isValid;
  }, [formData]);

  // Re-validate on changes after first submit attempt
  useEffect(() => {
    if (hasAttemptedSubmit) {
      validateForm();
    }
  }, [formData, hasAttemptedSubmit, validateForm]);

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const handleFieldChange = useCallback(
    (field: keyof PatientInfo) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = e.target.value;
        setFormData((prev) => ({ ...prev, [field]: value }));
        setTouched((prev) => ({ ...prev, [field]: true }));

        // Clear field error on edit
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

  const handleBlur = useCallback(
    (field: string) => () => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      // Validate single field on blur
      if (hasAttemptedSubmit) {
        validateForm();
      }
    },
    [hasAttemptedSubmit, validateForm]
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
      const result = updatePatientInfo(formData as PatientInfo);

      if (result.success) {
        setShowSuccess(true);
      } else if (isFailure(result)) {
        setErrorMessage(result.error?.message || 'Failed to save patient information.');
        setShowError(true);
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred.');
      setShowError(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, updatePatientInfo]);

  const handleSaveAndAdvance = useCallback(async () => {
    setHasAttemptedSubmit(true);

    if (!validateForm()) {
      setErrorMessage('Please fix the validation errors before proceeding.');
      setShowError(true);
      return;
    }

    setIsSubmitting(true);
    try {
      // Save first
      const saveResult = updatePatientInfo(formData as PatientInfo);
      if (isFailure(saveResult)) {
        setErrorMessage(saveResult.error?.message || 'Failed to save patient info.');
        setShowError(true);
        return;
      }

      // Then advance workflow
      const advanceResult = advanceWorkflow();
      if (isFailure(advanceResult)) {
        setErrorMessage(advanceResult.error?.message || 'Cannot advance to next step.');
        setShowError(true);
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred.');
      setShowError(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, updatePatientInfo, advanceWorkflow]);

  // Keyboard shortcut: Ctrl+S to save
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
  // FIELD HELPER
  // ========================================================================

  const getFieldError = (field: string): string | undefined => {
    if (touched[field] || hasAttemptedSubmit) {
      return fieldErrors[field];
    }
    return undefined;
  };

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
            <Person sx={{ color: LUNIT.teal }} />
            Patient Registration
          </Typography>
          <Typography variant="body2" sx={{ color: LUNIT.midGray, mt: 0.5 }}>
            Enter patient demographics and identification. Required fields are marked with *.
          </Typography>
        </Box>

        {/* Context Error Alert */}
        {contextError && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            onClose={clearError}
          >
            {contextError.message}
          </Alert>
        )}

        {/* Form Fields */}
        <Stack spacing={3}>
          {/* Section: Identification */}
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
              <Badge fontSize="small" />
              Identification
            </Typography>

            <TextField
              fullWidth
              required
              label="Medical Record Number (MRN)"
              placeholder="e.g. MRN12345"
              value={formData.mrn || ''}
              onChange={handleFieldChange('mrn')}
              onBlur={handleBlur('mrn')}
              error={!!getFieldError('mrn')}
              helperText={getFieldError('mrn') || 'Alphanumeric, 5-20 characters'}
              slotProps={{
                input: {
                  sx: { fontFamily: 'monospace' },
                },
              }}
              sx={{ mb: 2 }}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                required
                label="First Name"
                placeholder="Enter first name"
                value={formData.firstName || ''}
                onChange={handleFieldChange('firstName')}
                onBlur={handleBlur('firstName')}
                error={!!getFieldError('firstName')}
                helperText={getFieldError('firstName')}
              />
              <TextField
                fullWidth
                required
                label="Last Name"
                placeholder="Enter last name"
                value={formData.lastName || ''}
                onChange={handleFieldChange('lastName')}
                onBlur={handleBlur('lastName')}
                error={!!getFieldError('lastName')}
                helperText={getFieldError('lastName')}
              />
            </Stack>
          </Box>

          <Divider sx={{ borderColor: alpha(LUNIT.teal, 0.12) }} />

          {/* Section: Demographics */}
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
              <CalendarMonth fontSize="small" />
              Demographics
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                required
                type="date"
                label="Date of Birth"
                value={formData.dateOfBirth || ''}
                onChange={handleFieldChange('dateOfBirth')}
                onBlur={handleBlur('dateOfBirth')}
                error={!!getFieldError('dateOfBirth')}
                helperText={
                  getFieldError('dateOfBirth') ||
                  (calculatedAge !== null ? `Age: ${calculatedAge} years` : '')
                }
                slotProps={{
                  inputLabel: { shrink: true },
                }}
              />

              <TextField
                fullWidth
                required
                select
                label="Sex"
                value={formData.gender || 'F'}
                onChange={handleFieldChange('gender')}
                onBlur={handleBlur('gender')}
                error={!!getFieldError('gender')}
                helperText={getFieldError('gender')}
              >
                {SEX_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            {/* Male patient warning */}
            {formData.gender === 'M' && (
              <Alert severity="info" sx={{ mt: 1 }} icon={<Info />}>
                Male patient — mammography is less common. Please verify clinical indication.
              </Alert>
            )}

            {/* Age chip */}
            {calculatedAge !== null && (
              <Box sx={{ mt: 1 }}>
                <Chip
                  label={`Age: ${calculatedAge} years`}
                  size="small"
                  color={calculatedAge < 40 ? 'info' : calculatedAge > 74 ? 'warning' : 'default'}
                  variant="outlined"
                />
              </Box>
            )}
          </Box>

          <Divider sx={{ borderColor: alpha(LUNIT.teal, 0.12) }} />

          {/* Section: Contact (Optional) */}
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
              <Phone fontSize="small" />
              Contact Information
              <Chip label="Optional" size="small" variant="outlined" sx={{ ml: 1 }} />
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Phone Number"
                placeholder="+1 (555) 123-4567"
                value={formData.phone || ''}
                onChange={handleFieldChange('phone')}
                onBlur={handleBlur('phone')}
                error={!!getFieldError('phone')}
                helperText={getFieldError('phone')}
              />
              <TextField
                fullWidth
                label="Email Address"
                placeholder="patient@example.com"
                value={formData.email || ''}
                onChange={handleFieldChange('email')}
                onBlur={handleBlur('email')}
                error={!!getFieldError('email')}
                helperText={getFieldError('email')}
              />
            </Stack>
          </Box>

          <Divider sx={{ borderColor: alpha(LUNIT.teal, 0.12) }} />

          {/* Section: Insurance (Optional) */}
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
              <Shield fontSize="small" />
              Insurance Information
              <Chip label="Optional" size="small" variant="outlined" sx={{ ml: 1 }} />
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Insurance Provider"
                placeholder="e.g. Blue Cross Blue Shield"
                value={formData.insuranceProvider || ''}
                onChange={handleFieldChange('insuranceProvider')}
              />
              <TextField
                fullWidth
                label="Insurance ID"
                placeholder="Policy number"
                value={formData.insuranceId || ''}
                onChange={handleFieldChange('insuranceId')}
                slotProps={{
                  input: {
                    sx: { fontFamily: 'monospace' },
                  },
                }}
              />
            </Stack>
          </Box>
        </Stack>

        {/* Action Buttons */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 2,
            mt: 4,
            pt: 3,
            borderTop: `1px solid ${alpha(LUNIT.teal, 0.12)}`,
          }}
        >
          <Tooltip title="Save without advancing (Ctrl+S)">
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
          </Tooltip>

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
        </Box>
      </Paper>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          severity="success"
          onClose={() => setShowSuccess(false)}
          icon={<CheckCircle />}
        >
          Patient information saved successfully.
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={showError}
        autoHideDuration={5000}
        onClose={() => setShowError(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          severity="error"
          onClose={() => setShowError(false)}
          icon={<ErrorIcon />}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PatientInfoStep;
