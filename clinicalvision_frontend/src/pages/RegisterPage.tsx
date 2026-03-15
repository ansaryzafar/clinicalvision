/**
 * Registration Page - Split-Screen Brand-Forward Design
 * 
 * Features:
 * - Split-screen layout: brand panel (left) + form panel (right)
 * - Full lunitDesignSystem integration (ClashGrotesk, Lexend, teal palette)
 * - Multi-step form with branded stepper
 * - Password strength indicator with brand colors
 * - Professional credentials capture
 * - Error handling with user feedback
 * - Loading states, auto-login after registration
 * - Responsive: collapses to single column on mobile
 * - Accessible (WCAG compliant)
 */

import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link as RouterLink, useSearchParams } from 'react-router-dom';
import { ROUTES, DEFAULT_AUTH_REDIRECT } from '../routes/paths';
import {
  Box,
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
  MenuItem as MuiMenuItem,
  FormHelperText,
  LinearProgress,
  Checkbox,
  FormControlLabel,
  alpha,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  ArrowBack,
  ArrowForward,
  CheckCircle,
  CheckCircleOutline,
  Cancel,
  AutoAwesome,
  Security,
  Speed,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { lunitColors, publicPagesTheme } from '../styles/lunitDesignSystem';
import { ThemeProvider } from '@mui/material';

// ============================================================================
// Types
// ============================================================================

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  role: string;
  licenseNumber: string;
  specialization: string;
  organizationName: string;
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

/** Feature highlights for the brand panel */
const FEATURE_HIGHLIGHTS = [
  {
    icon: <Speed sx={{ fontSize: 22 }} />,
    title: 'Real-Time AI Analysis',
    desc: 'Receive rapid diagnostic insights powered by state-of-the-art deep learning models.',
  },
  {
    icon: <Security sx={{ fontSize: 22 }} />,
    title: 'Enterprise-Grade Security',
    desc: 'Built with end-to-end encryption and robust compliance frameworks for clinical environments.',
  },
  {
    icon: <AutoAwesome sx={{ fontSize: 22 }} />,
    title: 'Clinically Validated Accuracy',
    desc: 'Rigorously tested across diverse mammography datasets and patient populations.',
  },
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

  const passwordStrength = calculatePasswordStrength(formData.password);

  // ── Shared input styles ──
  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      fontFamily: '"Lexend", sans-serif',
      fontSize: '15px',
      transition: 'all 0.2s ease',
      '& fieldset': { borderColor: lunitColors.lightGray },
      '&:hover fieldset': { borderColor: lunitColors.grey },
      '&.Mui-focused fieldset': { borderColor: lunitColors.teal, borderWidth: '2px' },
    },
    '& .MuiInputLabel-root': {
      fontFamily: '"Lexend", sans-serif',
      fontSize: '14px',
      color: lunitColors.darkGrey,
      '&.Mui-focused': { color: lunitColors.tealDarker },
    },
    '& .MuiFormHelperText-root': { fontFamily: '"Lexend", sans-serif', fontSize: '12px' },
  };

  const selectSx = {
    borderRadius: '10px',
    fontFamily: '"Lexend", sans-serif',
    fontSize: '15px',
    '& fieldset': { borderColor: lunitColors.lightGray },
    '&:hover fieldset': { borderColor: lunitColors.grey },
    '&.Mui-focused fieldset': { borderColor: lunitColors.teal, borderWidth: '2px' },
  };

  // ============================================================================
  // Validation
  // ============================================================================

  const validateStep = (step: number): boolean => {
    const errors: ValidationErrors = {};

    switch (step) {
      case 0:
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
          errors.password = 'Must contain at least one uppercase letter';
        } else if (!/[a-z]/.test(formData.password)) {
          errors.password = 'Must contain at least one lowercase letter';
        } else if (!/[0-9]/.test(formData.password)) {
          errors.password = 'Must contain at least one number';
        } else if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(formData.password)) {
          errors.password = 'Must contain at least one special character';
        }
        if (!formData.confirmPassword) {
          errors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
          errors.confirmPassword = 'Passwords do not match';
        }
        break;

      case 1:
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

      case 2:
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
    if (!validateStep(activeStep)) return;

    setIsLoading(true);

    const registrationData = {
      email: formData.email,
      password: formData.password,
      first_name: formData.firstName,
      last_name: formData.lastName,
      role: formData.role,
      license_number: formData.licenseNumber || undefined,
      specialization: formData.specialization || undefined,
    };

    try {
      await register(registrationData);
      setRegistrationComplete(true);
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
          background: `linear-gradient(155deg, ${lunitColors.darkerGray} 0%, #0a2929 45%, ${lunitColors.tealDarker} 100%)`,
        }}
      >
        <Box
          sx={{
            maxWidth: 440,
            mx: 3,
            p: { xs: 4, sm: 5 },
            borderRadius: '20px',
            bgcolor: lunitColors.white,
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}
        >
          <CheckCircle sx={{ fontSize: 72, color: lunitColors.green, mb: 2 }} />
          <Typography sx={{
            fontFamily: '"ClashGrotesk", sans-serif',
            fontWeight: 500,
            fontSize: '26px',
            color: lunitColors.headingColor,
            mb: 1,
          }}>
            Welcome to ClinicalVision AI!
          </Typography>
          <Typography sx={{
            fontFamily: '"Lexend", sans-serif',
            fontSize: '15px',
            color: lunitColors.darkGrey,
            mb: 3,
            lineHeight: 1.6,
          }}>
            Your account has been created successfully.<br />Redirecting to dashboard…
          </Typography>
          <CircularProgress size={28} sx={{ color: lunitColors.teal }} />
        </Box>
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
              autoComplete="email"
              sx={{ ...inputSx, mb: 2.5 }}
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleFieldChange('password', e.target.value)}
              error={!!validationErrors.password}
              helperText={validationErrors.password}
              autoComplete="new-password"
              sx={{ ...inputSx, mb: 1 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      sx={{ color: lunitColors.grey }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Password strength indicator */}
            {formData.password && (
              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography sx={{ fontFamily: '"Lexend", sans-serif', fontSize: '12px', color: lunitColors.grey }}>
                    Password Strength:
                  </Typography>
                  <Typography sx={{
                    fontFamily: '"Lexend", sans-serif',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: passwordStrength.color === 'error' ? lunitColors.red
                      : passwordStrength.color === 'warning' ? lunitColors.orange
                      : lunitColors.green,
                  }}>
                    {passwordStrength.label}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={passwordStrength.score}
                  sx={{
                    height: 5,
                    borderRadius: 3,
                    bgcolor: lunitColors.lightestGray,
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3,
                      bgcolor: passwordStrength.color === 'error' ? lunitColors.red
                        : passwordStrength.color === 'warning' ? lunitColors.orange
                        : lunitColors.green,
                    },
                  }}
                />
                {/* Checklist */}
                <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                  {[
                    { test: formData.password.length >= 8, label: 'At least 8 characters', tid: 'length' },
                    { test: /[A-Z]/.test(formData.password), label: 'One uppercase letter', tid: 'uppercase' },
                    { test: /[a-z]/.test(formData.password), label: 'One lowercase letter', tid: 'lowercase' },
                    { test: /[0-9]/.test(formData.password), label: 'One digit', tid: 'digit' },
                    { test: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(formData.password), label: 'One special character', tid: 'special' },
                  ].map(({ test, label, tid }) => (
                    <Box key={tid} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      {formData.password.length === 0 ? (
                        <CheckCircle sx={{ fontSize: 14, color: lunitColors.lightGray }} />
                      ) : test ? (
                        <CheckCircle sx={{ fontSize: 14, color: lunitColors.green }} data-testid={`check-${tid}`} />
                      ) : (
                        <Cancel sx={{ fontSize: 14, color: lunitColors.red }} data-testid={`cross-${tid}`} />
                      )}
                      <Typography sx={{
                        fontFamily: '"Lexend", sans-serif',
                        fontSize: '12px',
                        color: formData.password.length === 0 ? lunitColors.lightGray
                          : test ? lunitColors.green : lunitColors.red,
                      }}>
                        {label}
                      </Typography>
                    </Box>
                  ))}
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
              autoComplete="new-password"
              sx={{ ...inputSx }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      sx={{ color: lunitColors.grey }}
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
            <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.firstName}
                onChange={(e) => handleFieldChange('firstName', e.target.value)}
                error={!!validationErrors.firstName}
                helperText={validationErrors.firstName}
                autoComplete="given-name"
                sx={inputSx}
              />
              <TextField
                fullWidth
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => handleFieldChange('lastName', e.target.value)}
                error={!!validationErrors.lastName}
                helperText={validationErrors.lastName}
                autoComplete="family-name"
                sx={inputSx}
              />
            </Box>

            <FormControl fullWidth error={!!validationErrors.role}>
              <InputLabel sx={{ fontFamily: '"Lexend", sans-serif', fontSize: '14px', color: lunitColors.darkGrey, '&.Mui-focused': { color: lunitColors.tealDarker } }}>
                Role
              </InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={(e) => handleFieldChange('role', e.target.value)}
                sx={selectSx}
              >
                {ROLES.map((role) => (
                  <MuiMenuItem key={role.value} value={role.value} sx={{ fontFamily: '"Lexend", sans-serif', fontSize: '14px' }}>
                    {role.label}
                  </MuiMenuItem>
                ))}
              </Select>
              {validationErrors.role && (
                <FormHelperText sx={{ fontFamily: '"Lexend", sans-serif' }}>{validationErrors.role}</FormHelperText>
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
              sx={{ ...inputSx, mb: 2.5 }}
            />

            <FormControl fullWidth sx={{ mb: 2.5 }}>
              <InputLabel sx={{ fontFamily: '"Lexend", sans-serif', fontSize: '14px', color: lunitColors.darkGrey, '&.Mui-focused': { color: lunitColors.tealDarker } }}>
                Specialization (Optional)
              </InputLabel>
              <Select
                value={formData.specialization}
                label="Specialization (Optional)"
                onChange={(e) => handleFieldChange('specialization', e.target.value)}
                sx={selectSx}
              >
                <MuiMenuItem value="" sx={{ fontFamily: '"Lexend", sans-serif', fontSize: '14px' }}>
                  <em>None</em>
                </MuiMenuItem>
                {SPECIALIZATIONS.map((spec) => (
                  <MuiMenuItem key={spec.value} value={spec.value} sx={{ fontFamily: '"Lexend", sans-serif', fontSize: '14px' }}>
                    {spec.label}
                  </MuiMenuItem>
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
              sx={{ ...inputSx, mb: 3 }}
            />

            {/* Divider */}
            <Box sx={{ height: '1px', bgcolor: lunitColors.lightestGray, mb: 2.5 }} />

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.agreeToTerms}
                  onChange={(e) => handleFieldChange('agreeToTerms', e.target.checked)}
                  sx={{
                    color: lunitColors.lightGray,
                    '&.Mui-checked': { color: lunitColors.teal },
                  }}
                />
              }
              label={
                <Typography sx={{ fontFamily: '"Lexend", sans-serif', fontSize: '13px', color: lunitColors.darkGrey }}>
                  I agree to the{' '}
                  <Link component={RouterLink} to={ROUTES.TERMS} sx={{ color: lunitColors.tealDarker, fontWeight: 500, '&:hover': { color: lunitColors.teal } }}>
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link component={RouterLink} to={ROUTES.PRIVACY} sx={{ color: lunitColors.tealDarker, fontWeight: 500, '&:hover': { color: lunitColors.teal } }}>
                    Privacy Policy
                  </Link>
                </Typography>
              }
            />
            {validationErrors.agreeToTerms && (
              <Typography sx={{ fontFamily: '"Lexend", sans-serif', fontSize: '12px', color: lunitColors.red, mt: 0.5 }}>
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
    <ThemeProvider theme={publicPagesTheme}>
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* ═══════════════════════════════════════════════
          LEFT — Brand Panel (hidden on mobile)
         ═══════════════════════════════════════════════ */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: '0 0 48%',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(155deg, ${lunitColors.darkerGray} 0%, #0a2929 45%, ${lunitColors.tealDarker} 100%)`,
          px: { md: 5, lg: 7 },
          py: 6,
        }}
      >
        {/* Decorative radial glows */}
        <Box sx={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `
            radial-gradient(ellipse at 20% 80%, rgba(0, 201, 234, 0.18) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 15%, rgba(86, 193, 77, 0.10) 0%, transparent 45%)
          `,
        }} />

        {/* Content */}
        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 480 }}>
          {/* Logo */}
          <Box
            component="img"
            src="/images/clinicalvision-logo.svg?v=11"
            alt="ClinicalVision AI"
            sx={{
              height: { md: 52, lg: 60 },
              width: 'auto',
              mb: 5,
              filter: 'drop-shadow(0 2px 8px rgba(0, 201, 234, 0.25))',
            }}
          />

          {/* Headline */}
          <Typography sx={{
            fontFamily: '"ClashGrotesk", sans-serif',
            fontWeight: 300,
            fontSize: { md: '30px', lg: '36px' },
            lineHeight: 1.2,
            color: lunitColors.white,
            mb: 1.5,
            letterSpacing: '-0.02em',
          }}>
            Join the Future of Medical Imaging
          </Typography>

          <Typography sx={{
            fontFamily: '"Lexend", sans-serif',
            fontWeight: 300,
            fontSize: '15px',
            lineHeight: 1.7,
            color: alpha(lunitColors.white, 0.65),
            mb: 5,
            maxWidth: 400,
          }}>
            Create your account and get access to AI-powered diagnostic tools trusted by healthcare professionals worldwide.
          </Typography>

          {/* Feature highlights */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
            {FEATURE_HIGHLIGHTS.map((feat) => (
              <Box key={feat.title} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <Box sx={{
                  flexShrink: 0,
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  bgcolor: alpha(lunitColors.teal, 0.15),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: lunitColors.teal,
                }}>
                  {feat.icon}
                </Box>
                <Box>
                  <Typography sx={{
                    fontFamily: '"Lexend", sans-serif',
                    fontWeight: 500,
                    fontSize: '15px',
                    color: lunitColors.white,
                    mb: 0.3,
                  }}>
                    {feat.title}
                  </Typography>
                  <Typography sx={{
                    fontFamily: '"Lexend", sans-serif',
                    fontWeight: 300,
                    fontSize: '13px',
                    color: alpha(lunitColors.white, 0.5),
                    lineHeight: 1.5,
                  }}>
                    {feat.desc}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {/* Social proof */}
          <Box sx={{ mt: 6, pt: 4, borderTop: `1px solid ${alpha(lunitColors.white, 0.12)}` }}>
            <Typography sx={{
              fontFamily: '"Lexend", sans-serif',
              fontWeight: 300,
              fontSize: '13px',
              color: alpha(lunitColors.white, 0.45),
              lineHeight: 1.6,
            }}>
              Built for radiologists and clinical teams advancing diagnostic excellence.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ═══════════════════════════════════════════════
          RIGHT — Form Panel
         ═══════════════════════════════════════════════ */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: lunitColors.white,
          px: { xs: 3, sm: 4, md: 5 },
          py: { xs: 4, md: 5 },
          position: 'relative',
          overflowY: 'auto',
        }}
      >
        {/* Mobile-only brand strip */}
        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center',
            gap: 1.5,
            mb: 3,
            cursor: 'pointer',
          }}
          onClick={() => navigate(ROUTES.HOME)}
        >
          <Box
            component="img"
            src="/images/clinicalvision-logo.svg?v=11"
            alt="ClinicalVision AI"
            sx={{ height: 36, width: 'auto' }}
          />
        </Box>

        {/* Desktop: small logo linking home */}
        <Box
          sx={{
            display: { xs: 'none', md: 'block' },
            position: 'absolute',
            top: 28,
            right: 36,
          }}
        >
          <Box
            component="img"
            src="/images/clinicalvision-logo.svg?v=11"
            alt="Home"
            onClick={() => navigate(ROUTES.HOME)}
            sx={{
              height: 30,
              width: 'auto',
              cursor: 'pointer',
              opacity: 0.5,
              transition: 'opacity 0.2s',
              '&:hover': { opacity: 0.8 },
            }}
          />
        </Box>

        {/* Form container */}
        <Box sx={{ width: '100%', maxWidth: 460 }}>
          <Typography
            component="h1"
            sx={{
              fontFamily: '"ClashGrotesk", sans-serif',
              fontWeight: 500,
              fontSize: { xs: '24px', sm: '28px' },
              color: lunitColors.headingColor,
              mb: 0.5,
              letterSpacing: '-0.01em',
            }}
          >
            Create your account
          </Typography>

          <Typography sx={{
            fontFamily: '"Lexend", sans-serif',
            fontWeight: 400,
            fontSize: '14px',
            color: lunitColors.darkGrey,
            mb: 3.5,
          }}>
            Join the next generation of AI-powered medical imaging
          </Typography>

          {/* Branded Stepper */}
          <Stepper
            activeStep={activeStep}
            sx={{
              mb: 4,
              '& .MuiStepLabel-label': {
                fontFamily: '"Lexend", sans-serif',
                fontSize: '13px',
                fontWeight: 500,
              },
              '& .MuiStepLabel-label.Mui-active': {
                color: lunitColors.tealDarker,
                fontWeight: 600,
              },
              '& .MuiStepLabel-label.Mui-completed': {
                color: lunitColors.green,
              },
              '& .MuiStepIcon-root': {
                fontSize: '28px',
                color: lunitColors.lightGray,
              },
              '& .MuiStepIcon-root.Mui-active': {
                color: lunitColors.teal,
              },
              '& .MuiStepIcon-root.Mui-completed': {
                color: lunitColors.green,
              },
              '& .MuiStepConnector-line': {
                borderColor: lunitColors.lightestGray,
              },
            }}
          >
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Error Display */}
          {authError && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: '10px',
                fontFamily: '"Lexend", sans-serif',
              }}
            >
              {authError}
            </Alert>
          )}

          {/* Form */}
          <Box
            component="form"
            onSubmit={activeStep === STEPS.length - 1 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}
            noValidate
          >
            {renderStepContent(activeStep)}

            {/* Navigation Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, gap: 2 }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                startIcon={<ArrowBack sx={{ fontSize: '18px !important' }} />}
                sx={{
                  textTransform: 'none',
                  fontFamily: '"Lexend", sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  color: lunitColors.darkGrey,
                  borderRadius: '100px',
                  px: 2.5,
                  '&:hover': { bgcolor: lunitColors.lightestGray },
                  '&.Mui-disabled': { color: lunitColors.lightGray },
                }}
              >
                Back
              </Button>

              {activeStep === STEPS.length - 1 ? (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading}
                  endIcon={!isLoading ? <CheckCircleOutline sx={{ fontSize: '18px !important' }} /> : undefined}
                  sx={{
                    flex: 1,
                    maxWidth: 240,
                    borderRadius: '100px',
                    textTransform: 'none',
                    fontFamily: '"Lexend", sans-serif',
                    fontWeight: 500,
                    fontSize: '15px',
                    py: 1.4,
                    bgcolor: lunitColors.black,
                    color: lunitColors.white,
                    boxShadow: 'none',
                    transition: 'all 0.4s ease-in-out',
                    '&:hover': {
                      bgcolor: lunitColors.teal,
                      color: lunitColors.black,
                      boxShadow: `0 4px 20px ${alpha(lunitColors.teal, 0.4)}`,
                    },
                    '&.Mui-disabled': { bgcolor: lunitColors.lightGray, color: lunitColors.grey },
                  }}
                >
                  {isLoading ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1, color: lunitColors.grey }} />
                      Creating…
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="contained"
                  endIcon={<ArrowForward sx={{ fontSize: '18px !important' }} />}
                  sx={{
                    flex: 1,
                    maxWidth: 180,
                    borderRadius: '100px',
                    textTransform: 'none',
                    fontFamily: '"Lexend", sans-serif',
                    fontWeight: 500,
                    fontSize: '15px',
                    py: 1.4,
                    bgcolor: lunitColors.black,
                    color: lunitColors.white,
                    boxShadow: 'none',
                    transition: 'all 0.4s ease-in-out',
                    '&:hover': {
                      bgcolor: lunitColors.teal,
                      color: lunitColors.black,
                      boxShadow: `0 4px 20px ${alpha(lunitColors.teal, 0.4)}`,
                    },
                  }}
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>

          {/* Login Link */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography sx={{
              fontFamily: '"Lexend", sans-serif',
              fontSize: '14px',
              color: lunitColors.darkGrey,
            }}>
              Already have an account?{' '}
              <Link
                component={RouterLink}
                to={ROUTES.LOGIN}
                underline="none"
                sx={{
                  fontWeight: 600,
                  color: lunitColors.tealDarker,
                  transition: 'color 0.2s',
                  '&:hover': { color: lunitColors.teal },
                }}
              >
                Sign in
              </Link>
            </Typography>
          </Box>
        </Box>

        {/* Footer */}
        <Typography sx={{
          position: { md: 'absolute' },
          bottom: { md: 20 },
          mt: { xs: 4, md: 0 },
          fontFamily: '"Lexend", sans-serif',
          fontSize: '12px',
          color: lunitColors.grey,
          textAlign: 'center',
        }}>
          © 2026 ClinicalVision AI. Healthcare professional use only.
        </Typography>
      </Box>
    </Box>
    </ThemeProvider>
  );
};

export default RegisterPage;
