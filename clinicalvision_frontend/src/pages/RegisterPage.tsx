/**
 * Registration Page - Production Grade
 * 
 * Features:
 * - Material-UI design consistent with Login page
 * - Multi-step form validation
 * - Professional credentials capture
 * - Password strength indicator
 * - Error handling with user feedback
 * - Loading states
 * - Auto-login after registration
 * - Accessible (WCAG compliant)
 */

import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link as RouterLink, useSearchParams } from 'react-router-dom';
import { ROUTES, DEFAULT_AUTH_REDIRECT } from '../routes/paths';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  InputAdornment,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  LinearProgress,
  Divider,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  LocalHospital,
  Person,
  Email,
  Lock,
  Badge,
  Business,
  ArrowBack,
  ArrowForward,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

// ============================================================================
// Types
// ============================================================================

interface FormData {
  // Step 1: Account Info
  email: string;
  password: string;
  confirmPassword: string;
  
  // Step 2: Personal Info
  firstName: string;
  lastName: string;
  role: string;
  
  // Step 3: Professional Info
  licenseNumber: string;
  specialization: string;
  organizationName: string;
  
  // Terms
  agreeToTerms: boolean;
}

interface ValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  licenseNumber?: string;
  specialization?: string;
  organizationName?: string;
  agreeToTerms?: string;
}

// ============================================================================
// Constants
// ============================================================================

const STEPS = ['Account', 'Personal Info', 'Professional'];

const ROLES = [
  { value: 'radiologist', label: 'Radiologist' },
  { value: 'technician', label: 'Radiology Technician' },
  { value: 'viewer', label: 'Viewer / General User' },
];

const SPECIALIZATIONS = [
  { value: 'breast_imaging', label: 'Breast Imaging' },
  { value: 'diagnostic_radiology', label: 'Diagnostic Radiology' },
  { value: 'interventional_radiology', label: 'Interventional Radiology' },
  { value: 'nuclear_medicine', label: 'Nuclear Medicine' },
  { value: 'oncology', label: 'Oncology' },
  { value: 'general_practice', label: 'General Practice' },
  { value: 'other', label: 'Other' },
];

// ============================================================================
// Password Strength Calculator
// ============================================================================

const calculatePasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  
  if (score <= 2) return { score: (score / 6) * 100, label: 'Weak', color: 'error' };
  if (score <= 4) return { score: (score / 6) * 100, label: 'Fair', color: 'warning' };
  return { score: (score / 6) * 100, label: 'Strong', color: 'success' };
};

// ============================================================================
// Component
// ============================================================================

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || DEFAULT_AUTH_REDIRECT;
  const { register, error: authError, clearError, isAuthenticated, isLoading: authLoading } = useAuth();

  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'radiologist',
    licenseNumber: '',
    specialization: '',
    organizationName: '',
    agreeToTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [registrationComplete, setRegistrationComplete] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, redirectTo]);

  // Password strength
  const passwordStrength = calculatePasswordStrength(formData.password);

  // ============================================================================
  // Validation
  // ============================================================================

  const validateStep = (step: number): boolean => {
    const errors: ValidationErrors = {};

    switch (step) {
      case 0: // Account Info
        if (!formData.email) {
          errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          errors.email = 'Invalid email format';
        }

        if (!formData.password) {
          errors.password = 'Password is required';
        } else if (formData.password.length < 8) {
          errors.password = 'Password must be at least 8 characters';
        } else if (!/[A-Z]/.test(formData.password)) {
          errors.password = 'Password must contain at least one uppercase letter';
        } else if (!/[a-z]/.test(formData.password)) {
          errors.password = 'Password must contain at least one lowercase letter';
        } else if (!/[0-9]/.test(formData.password)) {
          errors.password = 'Password must contain at least one number';
        } else if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(formData.password)) {
          errors.password = 'Password must contain at least one special character';
        }

        if (!formData.confirmPassword) {
          errors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
          errors.confirmPassword = 'Passwords do not match';
        }
        break;

      case 1: // Personal Info
        if (!formData.firstName) {
          errors.firstName = 'First name is required';
        } else if (formData.firstName.length < 2) {
          errors.firstName = 'First name must be at least 2 characters';
        }

        if (!formData.lastName) {
          errors.lastName = 'Last name is required';
        } else if (formData.lastName.length < 2) {
          errors.lastName = 'Last name must be at least 2 characters';
        }

        if (!formData.role) {
          errors.role = 'Please select a role';
        }
        break;

      case 2: // Professional Info
        // License number is optional but validate format if provided
        if (formData.licenseNumber && formData.licenseNumber.length < 4) {
          errors.licenseNumber = 'License number must be at least 4 characters';
        }

        if (!formData.agreeToTerms) {
          errors.agreeToTerms = 'You must agree to the terms and conditions';
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleFieldChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    clearError();
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateStep(activeStep)) {
      return;
    }

    setIsLoading(true);

    // DEBUG: Log the registration data being prepared
    const registrationData = {
      email: formData.email,
      password: formData.password,
      first_name: formData.firstName,
      last_name: formData.lastName,
      role: formData.role,
      license_number: formData.licenseNumber || undefined,
      specialization: formData.specialization || undefined,
    };
    console.log('DEBUG RegisterPage - Prepared data:', JSON.stringify(registrationData, null, 2));

    try {
      await register(registrationData);

      setRegistrationComplete(true);
      
      // Redirect to target page after brief delay
      setTimeout(() => {
        navigate(redirectTo, { replace: true });
      }, 2000);
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // Success Screen
  // ============================================================================

  if (registrationComplete) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          py: 4,
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={3}
            sx={{
              p: 6,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Welcome to ClinicalVision AI!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Your account has been created successfully. Redirecting to dashboard...
            </Typography>
            <CircularProgress size={24} />
          </Paper>
        </Container>
      </Box>
    );
  }

  // ============================================================================
  // Render Step Content
  // ============================================================================

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              error={!!validationErrors.email}
              helperText={validationErrors.email}
              margin="normal"
              autoComplete="email"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleFieldChange('password', e.target.value)}
              error={!!validationErrors.password}
              helperText={validationErrors.password}
              margin="normal"
              autoComplete="new-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {formData.password && (
              <Box sx={{ mt: 1, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Password Strength:
                  </Typography>
                  <Typography
                    variant="caption"
                    color={`${passwordStrength.color}.main`}
                    fontWeight="bold"
                  >
                    {passwordStrength.label}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={passwordStrength.score}
                  color={passwordStrength.color as 'error' | 'warning' | 'success'}
                  sx={{ height: 6, borderRadius: 3 }}
                />
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary" component="div">
                    Password must contain:
                  </Typography>
                  {/* 8+ characters */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {formData.password.length === 0 ? (
                      <CheckCircle sx={{ fontSize: 14, color: 'grey.400' }} />
                    ) : formData.password.length >= 8 ? (
                      <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} data-testid="check-length" />
                    ) : (
                      <Cancel sx={{ fontSize: 14, color: 'error.main' }} data-testid="cross-length" />
                    )}
                    <Typography variant="caption" color={
                      formData.password.length === 0 ? 'text.disabled' :
                      formData.password.length >= 8 ? 'success.main' : 'error.main'
                    }>
                      At least 8 characters
                    </Typography>
                  </Box>
                  {/* Uppercase */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {formData.password.length === 0 ? (
                      <CheckCircle sx={{ fontSize: 14, color: 'grey.400' }} />
                    ) : /[A-Z]/.test(formData.password) ? (
                      <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} data-testid="check-uppercase" />
                    ) : (
                      <Cancel sx={{ fontSize: 14, color: 'error.main' }} data-testid="cross-uppercase" />
                    )}
                    <Typography variant="caption" color={
                      formData.password.length === 0 ? 'text.disabled' :
                      /[A-Z]/.test(formData.password) ? 'success.main' : 'error.main'
                    }>
                      One uppercase letter
                    </Typography>
                  </Box>
                  {/* Lowercase */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {formData.password.length === 0 ? (
                      <CheckCircle sx={{ fontSize: 14, color: 'grey.400' }} />
                    ) : /[a-z]/.test(formData.password) ? (
                      <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} data-testid="check-lowercase" />
                    ) : (
                      <Cancel sx={{ fontSize: 14, color: 'error.main' }} data-testid="cross-lowercase" />
                    )}
                    <Typography variant="caption" color={
                      formData.password.length === 0 ? 'text.disabled' :
                      /[a-z]/.test(formData.password) ? 'success.main' : 'error.main'
                    }>
                      One lowercase letter
                    </Typography>
                  </Box>
                  {/* Digit */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {formData.password.length === 0 ? (
                      <CheckCircle sx={{ fontSize: 14, color: 'grey.400' }} />
                    ) : /[0-9]/.test(formData.password) ? (
                      <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} data-testid="check-digit" />
                    ) : (
                      <Cancel sx={{ fontSize: 14, color: 'error.main' }} data-testid="cross-digit" />
                    )}
                    <Typography variant="caption" color={
                      formData.password.length === 0 ? 'text.disabled' :
                      /[0-9]/.test(formData.password) ? 'success.main' : 'error.main'
                    }>
                      One digit
                    </Typography>
                  </Box>
                  {/* Special character */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {formData.password.length === 0 ? (
                      <CheckCircle sx={{ fontSize: 14, color: 'grey.400' }} />
                    ) : /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(formData.password) ? (
                      <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} data-testid="check-special" />
                    ) : (
                      <Cancel sx={{ fontSize: 14, color: 'error.main' }} data-testid="cross-special" />
                    )}
                    <Typography variant="caption" color={
                      formData.password.length === 0 ? 'text.disabled' :
                      /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(formData.password) ? 'success.main' : 'error.main'
                    }>
                      One special character (!@#$%^&*)
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}

            <TextField
              fullWidth
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
              error={!!validationErrors.confirmPassword}
              helperText={validationErrors.confirmPassword}
              margin="normal"
              autoComplete="new-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </>
        );

      case 1:
        return (
          <>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.firstName}
                onChange={(e) => handleFieldChange('firstName', e.target.value)}
                error={!!validationErrors.firstName}
                helperText={validationErrors.firstName}
                margin="normal"
                autoComplete="given-name"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => handleFieldChange('lastName', e.target.value)}
                error={!!validationErrors.lastName}
                helperText={validationErrors.lastName}
                margin="normal"
                autoComplete="family-name"
              />
            </Box>

            <FormControl fullWidth margin="normal" error={!!validationErrors.role}>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={(e) => handleFieldChange('role', e.target.value)}
              >
                {ROLES.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
              </Select>
              {validationErrors.role && (
                <FormHelperText>{validationErrors.role}</FormHelperText>
              )}
            </FormControl>
          </>
        );

      case 2:
        return (
          <>
            <TextField
              fullWidth
              label="Medical License Number (Optional)"
              value={formData.licenseNumber}
              onChange={(e) => handleFieldChange('licenseNumber', e.target.value)}
              error={!!validationErrors.licenseNumber}
              helperText={validationErrors.licenseNumber || 'Your professional medical license number'}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Badge color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Specialization (Optional)</InputLabel>
              <Select
                value={formData.specialization}
                label="Specialization (Optional)"
                onChange={(e) => handleFieldChange('specialization', e.target.value)}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {SPECIALIZATIONS.map((spec) => (
                  <MenuItem key={spec.value} value={spec.value}>
                    {spec.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Organization Name (Optional)"
              value={formData.organizationName}
              onChange={(e) => handleFieldChange('organizationName', e.target.value)}
              error={!!validationErrors.organizationName}
              helperText={validationErrors.organizationName}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Business color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <Divider sx={{ my: 3 }} />

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.agreeToTerms}
                  onChange={(e) => handleFieldChange('agreeToTerms', e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2">
                  I agree to the{' '}
                  <Link component={RouterLink} to={ROUTES.TERMS}>
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link component={RouterLink} to={ROUTES.PRIVACY}>
                    Privacy Policy
                  </Link>
                </Typography>
              }
            />
            {validationErrors.agreeToTerms && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                {validationErrors.agreeToTerms}
              </Typography>
            )}
          </>
        );

      default:
        return null;
    }
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Logo and Title */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 2,
            }}
          >
            <LocalHospital sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h5" fontWeight="bold" color="primary">
              ClinicalVision AI
            </Typography>
          </Box>

          <Typography variant="h6" color="text.secondary" gutterBottom>
            Create Your Account
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
            Join the next generation of AI-powered medical imaging
          </Typography>

          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ width: '100%', mb: 4 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Error Display */}
          {authError && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {authError}
            </Alert>
          )}

          {/* Form */}
          <Box
            component="form"
            onSubmit={activeStep === STEPS.length - 1 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}
            sx={{ width: '100%' }}
          >
            {renderStepContent(activeStep)}

            {/* Navigation Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                startIcon={<ArrowBack />}
              >
                Back
              </Button>

              {activeStep === STEPS.length - 1 ? (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading}
                  endIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="contained"
                  endIcon={<ArrowForward />}
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>

          {/* Login Link */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link component={RouterLink} to={ROUTES.LOGIN} underline="hover">
                Sign in
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default RegisterPage;
