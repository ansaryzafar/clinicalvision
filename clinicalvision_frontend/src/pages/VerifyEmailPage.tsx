/**
 * Email Verification Page
 * Handles email verification token processing
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ROUTES } from '../routes/paths';
import {
  Box,
  Container,
  Paper,
  Typography,
  CircularProgress,
  Button,
  Alert,
  TextField,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Email as EmailIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

type VerificationStatus = 'loading' | 'success' | 'error' | 'resend';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [message, setMessage] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setStatus('resend');
      setMessage('No verification token provided. Enter your email to receive a new verification link.');
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/account/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Email verified successfully!');
      } else {
        setStatus('error');
        setMessage(data.detail || 'Verification failed. The link may have expired.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Unable to verify email. Please try again later.');
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setMessage('Please enter your email address.');
      return;
    }

    setResendLoading(true);
    setResendSuccess(false);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/account/request-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setResendSuccess(true);
        setMessage(data.message || 'Verification email sent! Please check your inbox.');
      } else {
        setMessage(data.detail || 'Failed to send verification email.');
      }
    } catch (error) {
      setMessage('Unable to send verification email. Please try again later.');
    } finally {
      setResendLoading(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h6" color="text.secondary">
              Verifying your email...
            </Typography>
          </Box>
        );

      case 'success':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 3 }} />
            <Typography variant="h5" gutterBottom fontWeight="bold" color="success.main">
              Email Verified!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              {message}
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
          </Box>
        );

      case 'error':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <ErrorIcon sx={{ fontSize: 80, color: 'error.main', mb: 3 }} />
            <Typography variant="h5" gutterBottom fontWeight="bold" color="error.main">
              Verification Failed
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              {message}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => setStatus('resend')}
              sx={{ mr: 2 }}
            >
              Request New Link
            </Button>
            <Button
              variant="text"
              component={Link}
              to={ROUTES.LOGIN}
            >
              Back to Login
            </Button>
          </Box>
        );

      case 'resend':
        return (
          <Box sx={{ py: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <EmailIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom fontWeight="bold">
                Resend Verification Email
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Enter your email address to receive a new verification link.
              </Typography>
            </Box>

            {resendSuccess && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {message}
              </Alert>
            )}

            {!resendSuccess && message && status === 'resend' && (
              <Alert severity="info" sx={{ mb: 3 }}>
                {message}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 3 }}
              disabled={resendLoading}
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleResendVerification}
              disabled={resendLoading || !email}
              sx={{
                background: 'linear-gradient(135deg, #0277BD 0%, #00ACC1 100%)',
                mb: 2,
              }}
            >
              {resendLoading ? <CircularProgress size={24} color="inherit" /> : 'Send Verification Email'}
            </Button>

            <Button
              fullWidth
              variant="text"
              component={Link}
              to={ROUTES.LOGIN}
            >
              Back to Login
            </Button>
          </Box>
        );
    }
  };

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
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 3,
            background: 'white',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #0277BD 0%, #00ACC1 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              ClinicalVision AI
            </Typography>
          </Box>

          {renderContent()}
        </Paper>
      </Container>
    </Box>
  );
};

export default VerifyEmailPage;
