/**
 * Reset Password Page
 * Handles password reset with token
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ROUTES } from '../routes/paths';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  LinearProgress,
} from '@mui/material';
import {
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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
  ].map(req => ({ ...req, met: req.regex.test(password) }));

  const allRequirementsMet = passwordRequirements.every(req => req.met);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const passwordStrength = passwordRequirements.filter(req => req.met).length;
  const passwordStrengthPercent = (passwordStrength / passwordRequirements.length) * 100;

  const getStrengthColor = () => {
    if (passwordStrengthPercent < 40) return 'error';
    if (passwordStrengthPercent < 80) return 'warning';
    return 'success';
  };

  useEffect(() => {
    if (!token) {
      setValidatingToken(false);
      setTokenValid(false);
      return;
    }

    validateToken(token);
  }, [token]);

  const validateToken = async (resetToken: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/account/validate-reset-token?token=${resetToken}`
      );
      const data = await response.json();

      if (data.valid) {
        setTokenValid(true);
        setMaskedEmail(data.email || '');
      } else {
        setTokenValid(false);
        setError(data.message || 'Invalid or expired reset link.');
      }
    } catch (err) {
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
      const response = await fetch(`${API_BASE_URL}/api/v1/account/reset-password`, {
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
    } catch (err) {
      setError('Unable to connect to the server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (validatingToken) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e9f2 100%)',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h6" color="text.secondary">
            Validating reset link...
          </Typography>
        </Paper>
      </Box>
    );
  }

  // Invalid token
  if (!tokenValid && !success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e9f2 100%)',
        }}
      >
        <Container maxWidth="sm">
          <Paper elevation={3} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
            <ErrorIcon sx={{ fontSize: 80, color: 'error.main', mb: 3 }} />
            <Typography variant="h5" gutterBottom fontWeight="bold" color="error.main">
              Invalid Reset Link
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              {error || 'This password reset link is invalid or has expired.'}
            </Typography>
            <Button
              variant="contained"
              component={Link}
              to={ROUTES.FORGOT_PASSWORD}
              sx={{
                background: 'linear-gradient(135deg, #0277BD 0%, #00ACC1 100%)',
                mr: 2,
              }}
            >
              Request New Link
            </Button>
            <Button variant="text" component={Link} to={ROUTES.LOGIN}>
              Back to Login
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  // Success state
  if (success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e9f2 100%)',
        }}
      >
        <Container maxWidth="sm">
          <Paper elevation={3} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 3 }} />
            <Typography variant="h5" gutterBottom fontWeight="bold" color="success.main">
              Password Reset Successful!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Your password has been updated. You can now log in with your new password.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate(ROUTES.LOGIN)}
              sx={{
                background: 'linear-gradient(135deg, #0277BD 0%, #00ACC1 100%)',
                px: 4,
              }}
            >
              Go to Login
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  // Reset form
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e9f2 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #0277BD 0%, #00ACC1 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
              }}
            >
              ClinicalVision AI
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Create New Password
            </Typography>
            {maskedEmail && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                for {maskedEmail}
              </Typography>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1 }}
              disabled={loading}
            />

            {/* Password Strength Indicator */}
            {password && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={passwordStrengthPercent}
                  color={getStrengthColor()}
                  sx={{ height: 6, borderRadius: 3, mb: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  Password strength: {
                    passwordStrengthPercent < 40 ? 'Weak' :
                    passwordStrengthPercent < 80 ? 'Medium' : 'Strong'
                  }
                </Typography>
              </Box>
            )}

            {/* Password Requirements */}
            <Box sx={{ mb: 3, pl: 1 }}>
              {passwordRequirements.map((req, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    color: req.met ? 'success.main' : 'text.secondary',
                  }}
                >
                  <CheckCircleIcon sx={{ fontSize: 16, opacity: req.met ? 1 : 0.3 }} />
                  <Typography variant="caption">{req.label}</Typography>
                </Box>
              ))}
            </Box>

            <TextField
              fullWidth
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={confirmPassword.length > 0 && !passwordsMatch}
              helperText={
                confirmPassword.length > 0 && !passwordsMatch
                  ? 'Passwords do not match'
                  : ''
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
              disabled={loading}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading || !allRequirementsMet || !passwordsMatch}
              sx={{
                background: 'linear-gradient(135deg, #0277BD 0%, #00ACC1 100%)',
                py: 1.5,
                mb: 2,
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
            </Button>

            <Button
              fullWidth
              variant="text"
              component={Link}
              to={ROUTES.LOGIN}
            >
              Back to Login
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default ResetPasswordPage;
