/**
 * Login Page - Production Grade
 * 
 * Features:
 * - Material-UI design
 * - Form validation
 * - Error handling
 * - Loading states
 * - Redirect after login
 * - Accessible (WCAG compliant)
 */

import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
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
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  LocalHospital,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

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

  /**
   * Validate form fields
   */
  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    // Email validation
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Invalid email format';
    }

    // Password validation
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    // Prevent double-submit
    if (isLoading) return;
    setIsLoading(true);

    try {
      await login({ email: email.trim().toLowerCase(), password });
      // Redirect to intended destination or home
      navigate(from, { replace: true });
    } catch (error: unknown) {
      // Error is already displayed via authError from AuthContext
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Login failed:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle field changes and clear validation errors
   */
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
              mb: 3,
            }}
          >
            <LocalHospital color="primary" sx={{ fontSize: 40 }} />
            <Typography component="h1" variant="h4" fontWeight="bold">
              ClinicalVision AI
            </Typography>
          </Box>

          <Typography variant="h5" component="h2" gutterBottom>
            Sign In
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter your credentials to access the platform
          </Typography>

          {/* Error Alert */}
          {authError && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }} onClose={clearError}>
              {authError}
            </Alert>
          )}

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
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
            />

            <TextField
              margin="normal"
              required
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
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={isLoading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            {/* Demo Credentials Help */}
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Demo Account:</strong>
                <br />
                Email: demo@clinicalvision.ai
                <br />
                Password: Demo123!
                <br />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Or use your registered account credentials
                </Typography>
              </Typography>
            </Alert>

            {/* Footer Links */}
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Don't have an account?{' '}
                <Link component={RouterLink} to={ROUTES.REGISTER} underline="hover">
                  Register here
                </Link>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                <Link component={RouterLink} to={ROUTES.FORGOT_PASSWORD} underline="hover">
                  Forgot password?
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Footer */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center', mt: 2 }}
        >
          © 2026 ClinicalVision AI. Healthcare professional use only.
        </Typography>
      </Container>
    </Box>
  );
};

export default LoginPage;
