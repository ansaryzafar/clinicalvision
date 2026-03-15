/**
 * Forgot Password Page - Split-Screen Brand-Forward Design
 * 
 * Features:
 * - Split-screen layout matching Login/Register pages
 * - Full lunitDesignSystem integration (ClashGrotesk, Lexend, teal palette)
 * - SVG brand logo with teal drop-shadow
 * - Form validation, loading states, success confirmation
 * - Responsive: collapses to single column on mobile
 * - Accessible (WCAG compliant)
 */

import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes/paths';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Link,
  alpha,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  CheckCircleOutline,
  LockReset,
  MailOutline,
  Shield,
} from '@mui/icons-material';
import { lunitColors, publicPagesTheme } from '../styles/lunitDesignSystem';
import { ThemeProvider } from '@mui/material';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/account/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.detail || 'Failed to send reset email. Please try again.');
      }
    } catch (err) {
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
    { icon: <LockReset sx={{ fontSize: 20 }} />, title: 'Secure Reset Process', desc: 'A time-limited link is sent to your verified email for one-time use.' },
    { icon: <MailOutline sx={{ fontSize: 20 }} />, title: 'Check Your Inbox', desc: 'The reset email typically arrives within a few minutes.' },
    { icon: <Shield sx={{ fontSize: 20 }} />, title: 'Account Protection', desc: 'For security, reset links expire automatically and cannot be reused.' },
  ];

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
            Account Recovery
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
            We'll help you regain access to your account quickly and securely.
          </Typography>

          {/* Info items */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
            {INFO_ITEMS.map((item) => (
              <Box key={item.title} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
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
          RIGHT — Form / Success Panel
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
          {success ? (
            /* ─── Success state ─── */
            <>
              <Box sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: alpha(lunitColors.green, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
                letterSpacing: '-0.01em',
              }}>
                Check your email
              </Typography>

              <Typography sx={{
                fontFamily: '"Lexend", sans-serif',
                fontWeight: 400,
                fontSize: '15px',
                color: lunitColors.darkGrey,
                mb: 1,
                lineHeight: 1.6,
              }}>
                If an account exists for <Box component="span" sx={{ fontWeight: 600, color: lunitColors.text }}>{email}</Box>, you'll receive a password reset link shortly.
              </Typography>

              <Typography sx={{
                fontFamily: '"Lexend", sans-serif',
                fontWeight: 400,
                fontSize: '13px',
                color: lunitColors.grey,
                mb: 4,
              }}>
                The link will expire in 1 hour for security.
              </Typography>

              {/* Tips */}
              <Box sx={{
                p: 2.5,
                borderRadius: '12px',
                bgcolor: alpha(lunitColors.teal, 0.06),
                border: `1px solid ${alpha(lunitColors.teal, 0.15)}`,
                mb: 4,
              }}>
                <Typography sx={{
                  fontFamily: '"Lexend", sans-serif',
                  fontWeight: 600,
                  fontSize: '13px',
                  color: lunitColors.tealDarker,
                  mb: 1,
                }}>
                  Didn't receive the email?
                </Typography>
                <Box component="ul" sx={{
                  m: 0, pl: 2.5,
                  fontFamily: '"Lexend", sans-serif',
                  fontSize: '13px',
                  color: lunitColors.darkGrey,
                  lineHeight: 2,
                  '& li': { pl: 0.5 },
                }}>
                  <li>Check your spam or junk folder</li>
                  <li>Verify you entered the correct email</li>
                  <li>Wait a few minutes and try again</li>
                </Box>
              </Box>

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
                Back to Sign In
              </Button>
            </>
          ) : (
            /* ─── Form state ─── */
            <>
              <Typography component="h1" sx={{
                fontFamily: '"ClashGrotesk", sans-serif',
                fontWeight: 500,
                fontSize: { xs: '26px', sm: '30px' },
                color: lunitColors.headingColor,
                mb: 0.75,
                letterSpacing: '-0.01em',
              }}>
                Reset your password
              </Typography>

              <Typography sx={{
                fontFamily: '"Lexend", sans-serif',
                fontWeight: 400,
                fontSize: '15px',
                color: lunitColors.darkGrey,
                mb: 4,
                lineHeight: 1.6,
              }}>
                Enter the email address associated with your account and we'll send you a link to create a new password.
              </Typography>

              {/* Error Alert */}
              {error && (
                <Alert
                  severity="error"
                  onClose={() => setError(null)}
                  sx={{
                    mb: 3,
                    borderRadius: '10px',
                    fontFamily: '"Lexend", sans-serif',
                  }}
                >
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit} noValidate>
                <TextField
                  fullWidth
                  id="email"
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="you@example.com"
                  disabled={loading}
                  autoFocus
                  sx={{ ...inputSx, mb: 3 }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading || !email}
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
                      Sending…
                    </>
                  ) : (
                    'Send Reset Link'
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
            </>
          )}
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

export default ForgotPasswordPage;
