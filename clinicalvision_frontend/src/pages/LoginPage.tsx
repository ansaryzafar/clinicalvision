/**
 * Login Page - Split-Screen Brand-Forward Design
 * 
 * Features:
 * - Split-screen layout: brand panel (left) + form panel (right)
 * - Full lunitDesignSystem integration (ClashGrotesk, Lexend, teal palette)
 * - SVG brand logo with value propositions
 * - Form validation, error handling, loading states
 * - Redirect after login
 * - Responsive: collapses to single column on mobile
 * - Accessible (WCAG compliant)
 */

import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
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
  alpha,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  CheckCircleOutline,
  ArrowForward,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { lunitColors } from '../styles/lunitDesignSystem';

/** Value propositions shown on the brand panel */
const VALUE_PROPS = [
  { text: '97.5% Detection Sensitivity', sub: 'Industry-leading accuracy for early detection' },
  { text: 'FDA 510(k) Cleared', sub: 'Regulatory-grade AI diagnostic platform' },
  { text: 'HIPAA & GDPR Compliant', sub: 'Enterprise security & privacy by design' },
  { text: '50,000+ Studies Analyzed', sub: 'Trusted by leading healthcare institutions' },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error: authError, clearError, isAuthenticated, isLoading: authLoading } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  // Get redirect location (where user was trying to go before login)
  const from = (location.state as any)?.from?.pathname || DEFAULT_AUTH_REDIRECT;

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, from]);

  /** Validate form fields */
  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Invalid email format';
    }
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /** Handle form submission */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    if (!validateForm()) return;
    if (isLoading) return;
    setIsLoading(true);

    try {
      await login({ email: email.trim().toLowerCase(), password });
      navigate(from, { replace: true });
    } catch (error: unknown) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Login failed:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /** Handle field changes and clear validation errors */
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (validationErrors.email) {
      setValidationErrors((prev) => ({ ...prev, email: undefined }));
    }
    clearError();
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (validationErrors.password) {
      setValidationErrors((prev) => ({ ...prev, password: undefined }));
    }
    clearError();
  };

  // ── Shared input styles (lunitDesignSystem) ──
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
    '& .MuiFormHelperText-root': {
      fontFamily: '"Lexend", sans-serif',
      fontSize: '12px',
    },
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* ═══════════════════════════════════════════════
          LEFT — Brand Panel (hidden on mobile)
         ═══════════════════════════════════════════════ */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: '0 0 52%',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(155deg, ${lunitColors.darkerGray} 0%, #0a2929 45%, ${lunitColors.tealDarker} 100%)`,
          px: { md: 6, lg: 8 },
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
        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 520 }}>
          {/* Logo */}
          <Box
            component="img"
            src="/images/clinicalvision-logo.svg?v=11"
            alt="ClinicalVision AI"
            sx={{
              height: { md: 56, lg: 64 },
              width: 'auto',
              mb: 5,
              filter: 'brightness(0) invert(1)',
              opacity: 0.95,
            }}
          />

          {/* Headline */}
          <Typography
            sx={{
              fontFamily: '"ClashGrotesk", sans-serif',
              fontWeight: 300,
              fontSize: { md: '32px', lg: '38px' },
              lineHeight: 1.2,
              color: lunitColors.white,
              mb: 1.5,
              letterSpacing: '-0.02em',
            }}
          >
            AI-Powered Breast Cancer Detection
          </Typography>

          <Typography
            sx={{
              fontFamily: '"Lexend", sans-serif',
              fontWeight: 300,
              fontSize: '16px',
              lineHeight: 1.7,
              color: alpha(lunitColors.white, 0.7),
              mb: 5,
              maxWidth: 440,
            }}
          >
            Advanced diagnostic intelligence that augments clinical decision-making with state-of-the-art deep learning.
          </Typography>

          {/* Value propositions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {VALUE_PROPS.map((prop) => (
              <Box key={prop.text} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <CheckCircleOutline sx={{ color: lunitColors.teal, fontSize: 22, mt: '2px', flexShrink: 0 }} />
                <Box>
                  <Typography sx={{
                    fontFamily: '"Lexend", sans-serif',
                    fontWeight: 500,
                    fontSize: '15px',
                    color: lunitColors.white,
                    mb: 0.3,
                  }}>
                    {prop.text}
                  </Typography>
                  <Typography sx={{
                    fontFamily: '"Lexend", sans-serif',
                    fontWeight: 300,
                    fontSize: '13px',
                    color: alpha(lunitColors.white, 0.55),
                  }}>
                    {prop.sub}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {/* Trust line */}
          <Box sx={{ mt: 6, pt: 4, borderTop: `1px solid ${alpha(lunitColors.white, 0.12)}` }}>
            <Typography sx={{
              fontFamily: '"Lexend", sans-serif',
              fontWeight: 300,
              fontSize: '13px',
              color: alpha(lunitColors.white, 0.45),
              lineHeight: 1.6,
            }}>
              Trusted by radiologists and oncologists at leading healthcare institutions worldwide.
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
          px: { xs: 3, sm: 5, md: 6 },
          py: { xs: 4, md: 6 },
          position: 'relative',
        }}
      >
        {/* Mobile-only brand strip */}
        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center',
            gap: 1.5,
            mb: 4,
            cursor: 'pointer',
          }}
          onClick={() => navigate(ROUTES.HOME)}
        >
          <Box
            component="img"
            src="/images/clinicalvision-logo.svg?v=11"
            alt="ClinicalVision AI"
            sx={{ height: 40, width: 'auto' }}
          />
        </Box>

        {/* Desktop: small logo linking home */}
        <Box
          sx={{
            display: { xs: 'none', md: 'block' },
            position: 'absolute',
            top: 32,
            right: 40,
          }}
        >
          <Box
            component="img"
            src="/images/clinicalvision-logo.svg?v=11"
            alt="Home"
            onClick={() => navigate(ROUTES.HOME)}
            sx={{
              height: 32,
              width: 'auto',
              cursor: 'pointer',
              opacity: 0.5,
              transition: 'opacity 0.2s',
              '&:hover': { opacity: 0.8 },
            }}
          />
        </Box>

        {/* Form container */}
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          <Typography
            component="h1"
            sx={{
              fontFamily: '"ClashGrotesk", sans-serif',
              fontWeight: 500,
              fontSize: { xs: '26px', sm: '30px' },
              color: lunitColors.headingColor,
              mb: 0.75,
              letterSpacing: '-0.01em',
            }}
          >
            Welcome back
          </Typography>

          <Typography
            sx={{
              fontFamily: '"Lexend", sans-serif',
              fontWeight: 400,
              fontSize: '15px',
              color: lunitColors.darkGrey,
              mb: 4,
            }}
          >
            Enter your credentials to continue
          </Typography>

          {/* Error Alert */}
          {authError && (
            <Alert
              severity="error"
              onClose={clearError}
              sx={{
                mb: 3,
                borderRadius: '10px',
                fontFamily: '"Lexend", sans-serif',
                '& .MuiAlertTitle-root': { fontFamily: '"Lexend", sans-serif' },
              }}
            >
              {authError}
            </Alert>
          )}

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              error={!!validationErrors.email}
              helperText={validationErrors.email}
              disabled={isLoading}
              sx={{ ...inputSx, mb: 2.5 }}
            />

            <TextField
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              error={!!validationErrors.password}
              helperText={validationErrors.password}
              disabled={isLoading}
              sx={{ ...inputSx, mb: 1 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={isLoading}
                      sx={{ color: lunitColors.grey }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Forgot password link */}
            <Box sx={{ textAlign: 'right', mb: 3 }}>
              <Link
                component={RouterLink}
                to={ROUTES.FORGOT_PASSWORD}
                underline="none"
                sx={{
                  fontFamily: '"Lexend", sans-serif',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: lunitColors.tealDarker,
                  transition: 'color 0.2s',
                  '&:hover': { color: lunitColors.teal },
                }}
              >
                Forgot password?
              </Link>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading}
              endIcon={!isLoading ? <ArrowForward sx={{ fontSize: '18px !important' }} /> : undefined}
              sx={{
                borderRadius: '100px',
                textTransform: 'none',
                fontFamily: '"Lexend", sans-serif',
                fontWeight: 500,
                fontSize: '16px',
                py: 1.5,
                bgcolor: lunitColors.black,
                color: lunitColors.white,
                boxShadow: 'none',
                transition: 'all 0.4s ease-in-out',
                '&:hover': {
                  bgcolor: lunitColors.teal,
                  color: lunitColors.black,
                  boxShadow: `0 4px 20px ${alpha(lunitColors.teal, 0.4)}`,
                },
                '&.Mui-disabled': {
                  bgcolor: lunitColors.lightGray,
                  color: lunitColors.grey,
                },
              }}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={22} sx={{ mr: 1, color: lunitColors.grey }} />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            {/* Demo Credentials */}
            <Box
              sx={{
                mt: 3,
                p: 2.5,
                borderRadius: '12px',
                bgcolor: alpha(lunitColors.teal, 0.06),
                border: `1px solid ${alpha(lunitColors.teal, 0.15)}`,
              }}
            >
              <Typography sx={{
                fontFamily: '"Lexend", sans-serif',
                fontWeight: 600,
                fontSize: '13px',
                color: lunitColors.tealDarker,
                mb: 1,
              }}>
                Demo Account
              </Typography>
              <Typography sx={{
                fontFamily: '"Lexend", sans-serif',
                fontSize: '13px',
                color: lunitColors.text,
                lineHeight: 1.8,
              }}>
                Email: <Box component="span" sx={{ fontWeight: 500 }}>demo@clinicalvision.ai</Box>
                <br />
                Password: <Box component="span" sx={{ fontWeight: 500 }}>Demo123!</Box>
              </Typography>
              <Typography sx={{
                fontFamily: '"Lexend", sans-serif',
                fontSize: '12px',
                color: lunitColors.grey,
                mt: 0.75,
              }}>
                Or use your registered account credentials
              </Typography>
            </Box>

            {/* Register link */}
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography sx={{
                fontFamily: '"Lexend", sans-serif',
                fontSize: '14px',
                color: lunitColors.darkGrey,
              }}>
                Don't have an account?{' '}
                <Link
                  component={RouterLink}
                  to={ROUTES.REGISTER}
                  underline="none"
                  sx={{
                    fontWeight: 600,
                    color: lunitColors.tealDarker,
                    transition: 'color 0.2s',
                    '&:hover': { color: lunitColors.teal },
                  }}
                >
                  Create account
                </Link>
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Footer */}
        <Typography
          sx={{
            position: { md: 'absolute' },
            bottom: { md: 24 },
            mt: { xs: 4, md: 0 },
            fontFamily: '"Lexend", sans-serif',
            fontSize: '12px',
            color: lunitColors.grey,
            textAlign: 'center',
          }}
        >
          © 2026 ClinicalVision AI. Healthcare professional use only.
        </Typography>
      </Box>
    </Box>
  );
};

export default LoginPage;
