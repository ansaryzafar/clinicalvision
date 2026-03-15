/**
 * Reset Password Page - Split-Screen Brand-Forward Design
 *
 * Features:
 * - Split-screen layout matching Login/Register/ForgotPassword pages
 * - Full lunitDesignSystem integration (ClashGrotesk, Lexend, teal palette)
 * - 4 states: validating token, invalid token, reset form, success
 * - Password strength indicator + requirements checklist
 * - Responsive: collapses to single column on mobile
 * - Accessible (WCAG compliant)
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes/paths';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  LinearProgress,
  alpha,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  CheckCircleOutline,
  ErrorOutline,
  ArrowForward,
  ArrowBack,
  LockReset,
  Shield,
  VerifiedUser,
} from '@mui/icons-material';
import { lunitColors, publicPagesTheme } from '../styles/lunitDesignSystem';
import { ThemeProvider } from '@mui/material';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

interface PasswordRequirement {
  label: string;
  regex: RegExp;
  met: boolean;
}

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState<string>('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordRequirements: PasswordRequirement[] = [
    { label: 'At least 8 characters', regex: /.{8,}/, met: false },
    { label: 'One uppercase letter', regex: /[A-Z]/, met: false },
    { label: 'One lowercase letter', regex: /[a-z]/, met: false },
    { label: 'One number', regex: /\d/, met: false },
    { label: 'One special character', regex: /[!@#$%^&*(),.?":{}|<>]/, met: false },
  ].map((req) => ({ ...req, met: req.regex.test(password) }));

  const allRequirementsMet = passwordRequirements.every((req) => req.met);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const passwordStrength = passwordRequirements.filter((req) => req.met).length;
  const passwordStrengthPercent = (passwordStrength / passwordRequirements.length) * 100;

  const getStrengthLabel = () => {
    if (passwordStrengthPercent < 40) return { text: 'Weak', color: lunitColors.red };
    if (passwordStrengthPercent < 80) return { text: 'Medium', color: lunitColors.orange };
    return { text: 'Strong', color: lunitColors.green };
  };

  useEffect(() => {
    if (!token) {
      setValidatingToken(false);
      setTokenValid(false);
      return;
    }
    validateToken(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const validateToken = async (resetToken: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/account/validate-reset-token?token=${resetToken}`
      );
      const data = await response.json();

      if (data.valid) {
        setTokenValid(true);
        setMaskedEmail(data.email || '');
      } else {
        setTokenValid(false);
        setError(data.message || 'Invalid or expired reset link.');
      }
    } catch {
      setTokenValid(false);
      setError('Unable to validate reset link. Please try again.');
    } finally {
      setValidatingToken(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allRequirementsMet) {
      setError('Please meet all password requirements.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/account/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          new_password: password,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.detail || 'Failed to reset password. Please try again.');
      }
    } catch {
      setError('Unable to connect to the server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

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
    '& .MuiFormHelperText-root': {
      fontFamily: '"Lexend", sans-serif',
      fontSize: '12px',
    },
  };

  /** Brand panel info items */
  const INFO_ITEMS = [
    { icon: <LockReset sx={{ fontSize: 20 }} />, title: 'One-Time Use', desc: 'Your reset link works only once and expires after 1 hour.' },
    { icon: <Shield sx={{ fontSize: 20 }} />, title: 'Strong Passwords', desc: 'Use 8+ characters with a mix of upper, lower, numbers, and symbols.' },
    { icon: <VerifiedUser sx={{ fontSize: 20 }} />, title: 'Immediate Access', desc: 'After resetting, sign in right away with your new credentials.' },
  ];

  /** Determine right-panel content based on state */
  const renderRightContent = () => {
    // ─── Validating Token ───
    if (validatingToken) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={52} thickness={3} sx={{ color: lunitColors.teal, mb: 3 }} />
          <Typography sx={{
            fontFamily: '"ClashGrotesk", sans-serif',
            fontWeight: 500,
            fontSize: '22px',
            color: lunitColors.headingColor,
            mb: 1,
          }}>
            Validating reset link…
          </Typography>
          <Typography sx={{
            fontFamily: '"Lexend", sans-serif',
            fontSize: '14px',
            color: lunitColors.darkGrey,
          }}>
            This will only take a moment.
          </Typography>
        </Box>
      );
    }

    // ─── Invalid Token ───
    if (!tokenValid && !success) {
      return (
        <>
          <Box sx={{
            width: 64, height: 64, borderRadius: '50%',
            bgcolor: alpha(lunitColors.red, 0.1),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mb: 3,
          }}>
            <ErrorOutline sx={{ fontSize: 36, color: lunitColors.red }} />
          </Box>

          <Typography component="h1" sx={{
            fontFamily: '"ClashGrotesk", sans-serif',
            fontWeight: 500,
            fontSize: { xs: '24px', sm: '28px' },
            color: lunitColors.headingColor,
            mb: 1,
          }}>
            Invalid or expired link
          </Typography>

          <Typography sx={{
            fontFamily: '"Lexend", sans-serif',
            fontSize: '15px',
            color: lunitColors.darkGrey,
            mb: 4,
            lineHeight: 1.6,
          }}>
            {error || 'This password reset link is invalid or has expired. Please request a new one.'}
          </Typography>

          <Button
            fullWidth
            variant="contained"
            onClick={() => navigate(ROUTES.FORGOT_PASSWORD)}
            endIcon={<ArrowForward sx={{ fontSize: '18px !important' }} />}
            sx={{
              borderRadius: '100px',
              textTransform: 'none',
              fontFamily: '"Lexend", sans-serif',
              fontWeight: 500,
              fontSize: '16px',
              py: 1.5,
              mb: 2,
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
            Request New Link
          </Button>

          <Button
            fullWidth
            variant="text"
            startIcon={<ArrowBack sx={{ fontSize: '18px !important' }} />}
            onClick={() => navigate(ROUTES.LOGIN)}
            sx={{
              textTransform: 'none',
              fontFamily: '"Lexend", sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              color: lunitColors.darkGrey,
              borderRadius: '100px',
              '&:hover': { bgcolor: lunitColors.lightestGray },
            }}
          >
            Back to Sign In
          </Button>
        </>
      );
    }

    // ─── Success ───
    if (success) {
      return (
        <>
          <Box sx={{
            width: 64, height: 64, borderRadius: '50%',
            bgcolor: alpha(lunitColors.green, 0.1),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mb: 3,
          }}>
            <CheckCircleOutline sx={{ fontSize: 36, color: lunitColors.green }} />
          </Box>

          <Typography component="h1" sx={{
            fontFamily: '"ClashGrotesk", sans-serif',
            fontWeight: 500,
            fontSize: { xs: '24px', sm: '28px' },
            color: lunitColors.headingColor,
            mb: 1,
          }}>
            Password updated
          </Typography>

          <Typography sx={{
            fontFamily: '"Lexend", sans-serif',
            fontSize: '15px',
            color: lunitColors.darkGrey,
            mb: 4,
            lineHeight: 1.6,
          }}>
            Your password has been reset successfully. You can now sign in with your new password.
          </Typography>

          <Button
            fullWidth
            variant="contained"
            onClick={() => navigate(ROUTES.LOGIN)}
            endIcon={<ArrowForward sx={{ fontSize: '18px !important' }} />}
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
            }}
          >
            Sign In
          </Button>
        </>
      );
    }

    // ─── Reset Form ───
    const strength = getStrengthLabel();

    return (
      <>
        <Typography component="h1" sx={{
          fontFamily: '"ClashGrotesk", sans-serif',
          fontWeight: 500,
          fontSize: { xs: '26px', sm: '30px' },
          color: lunitColors.headingColor,
          mb: 0.5,
          letterSpacing: '-0.01em',
        }}>
          Create new password
        </Typography>

        {maskedEmail && (
          <Typography sx={{
            fontFamily: '"Lexend", sans-serif',
            fontSize: '14px',
            color: lunitColors.darkGrey,
            mb: 0.5,
          }}>
            for <Box component="span" sx={{ fontWeight: 600, color: lunitColors.text }}>{maskedEmail}</Box>
          </Typography>
        )}

        <Typography sx={{
          fontFamily: '"Lexend", sans-serif',
          fontSize: '15px',
          color: lunitColors.grey,
          mb: 3.5,
        }}>
          Choose a strong password that you haven't used before.
        </Typography>

        {error && (
          <Alert
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 3, borderRadius: '10px', fontFamily: '"Lexend", sans-serif' }}
          >
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          {/* New Password */}
          <TextField
            fullWidth
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            disabled={loading}
            autoFocus
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    size="small"
                    sx={{ color: lunitColors.grey }}
                  >
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ ...inputSx, mb: 1.5 }}
          />

          {/* Password Strength */}
          {password && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress
                variant="determinate"
                value={passwordStrengthPercent}
                sx={{
                  height: 5,
                  borderRadius: 99,
                  bgcolor: lunitColors.lightestGray,
                  mb: 0.75,
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 99,
                    bgcolor: strength.color,
                    transition: 'width 0.3s ease, background-color 0.3s ease',
                  },
                }}
              />
              <Typography sx={{
                fontFamily: '"Lexend", sans-serif',
                fontSize: '12px',
                fontWeight: 500,
                color: strength.color,
              }}>
                {strength.text}
              </Typography>
            </Box>
          )}

          {/* Requirements */}
          <Box sx={{
            mb: 3,
            p: 2,
            borderRadius: '10px',
            bgcolor: lunitColors.lightestGray,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 0.75,
          }}>
            {passwordRequirements.map((req, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <CheckCircleOutline sx={{
                  fontSize: 15,
                  color: req.met ? lunitColors.green : lunitColors.lightGray,
                  transition: 'color 0.2s',
                }} />
                <Typography sx={{
                  fontFamily: '"Lexend", sans-serif',
                  fontSize: '12px',
                  fontWeight: req.met ? 500 : 400,
                  color: req.met ? lunitColors.text : lunitColors.grey,
                  transition: 'color 0.2s',
                }}>
                  {req.label}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Confirm Password */}
          <TextField
            fullWidth
            label="Confirm Password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
            error={confirmPassword.length > 0 && !passwordsMatch}
            helperText={
              confirmPassword.length > 0 && !passwordsMatch
                ? 'Passwords do not match'
                : ''
            }
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                    size="small"
                    sx={{ color: lunitColors.grey }}
                  >
                    {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ ...inputSx, mb: 3 }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading || !allRequirementsMet || !passwordsMatch}
            endIcon={!loading ? <ArrowForward sx={{ fontSize: '18px !important' }} /> : undefined}
            sx={{
              borderRadius: '100px',
              textTransform: 'none',
              fontFamily: '"Lexend", sans-serif',
              fontWeight: 500,
              fontSize: '16px',
              py: 1.5,
              mb: 2,
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
            {loading ? (
              <>
                <CircularProgress size={22} sx={{ mr: 1, color: lunitColors.grey }} />
                Resetting…
              </>
            ) : (
              'Reset Password'
            )}
          </Button>

          <Button
            fullWidth
            variant="text"
            startIcon={<ArrowBack sx={{ fontSize: '18px !important' }} />}
            onClick={() => navigate(ROUTES.LOGIN)}
            sx={{
              textTransform: 'none',
              fontFamily: '"Lexend", sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              color: lunitColors.darkGrey,
              borderRadius: '100px',
              '&:hover': { bgcolor: lunitColors.lightestGray },
            }}
          >
            Back to Sign In
          </Button>
        </Box>
      </>
    );
  };

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
            Secure Password Reset
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
            Create a strong, unique password to keep your clinical data safe.
          </Typography>

          {/* Info items */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
            {INFO_ITEMS.map((item) => (
              <Box key={item.title} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <Box sx={{
                  flexShrink: 0,
                  width: 40, height: 40,
                  borderRadius: '10px',
                  bgcolor: alpha(lunitColors.teal, 0.15),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: lunitColors.teal,
                }}>
                  {item.icon}
                </Box>
                <Box>
                  <Typography sx={{
                    fontFamily: '"Lexend", sans-serif',
                    fontWeight: 500,
                    fontSize: '15px',
                    color: lunitColors.white,
                    mb: 0.3,
                  }}>
                    {item.title}
                  </Typography>
                  <Typography sx={{
                    fontFamily: '"Lexend", sans-serif',
                    fontWeight: 300,
                    fontSize: '13px',
                    color: alpha(lunitColors.white, 0.5),
                    lineHeight: 1.5,
                  }}>
                    {item.desc}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ═══════════════════════════════════════════════
          RIGHT — Dynamic Content Panel
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
              height: 32, width: 'auto',
              cursor: 'pointer',
              opacity: 0.5,
              transition: 'opacity 0.2s',
              '&:hover': { opacity: 0.8 },
            }}
          />
        </Box>

        {/* Content container */}
        <Box sx={{ width: '100%', maxWidth: 440 }}>
          {renderRightContent()}
        </Box>

        {/* Footer */}
        <Typography sx={{
          position: { md: 'absolute' },
          bottom: { md: 24 },
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

export default ResetPasswordPage;
