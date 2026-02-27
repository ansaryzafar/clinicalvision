/**
 * NotFoundPage (404)
 * 
 * Catch-all page for unmatched routes.
 * Production-grade: clean design, helpful navigation, no information leakage.
 * 
 * @module pages/NotFoundPage
 */

import React from 'react';
import { Box, Typography, Button, Stack, alpha } from '@mui/material';
import { Home, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes/paths';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
        px: 3,
        textAlign: 'center',
      }}
    >
      {/* 404 Display */}
      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: '6rem', md: '8rem' },
          fontWeight: 800,
          background: 'linear-gradient(135deg, #2E7D9A 0%, #1a5276 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
          mb: 2,
        }}
      >
        404
      </Typography>

      <Typography
        variant="h5"
        color="text.primary"
        fontWeight={600}
        sx={{ mb: 1 }}
      >
        Page Not Found
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: 4, maxWidth: 420 }}
      >
        The page you're looking for doesn't exist or has been moved.
        Please check the URL or navigate back to the application.
      </Typography>

      <Stack direction="row" spacing={2}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{
            borderColor: (theme) => alpha(theme.palette.primary.main, 0.3),
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
            },
          }}
        >
          Go Back
        </Button>
        <Button
          variant="contained"
          startIcon={<Home />}
          onClick={() => navigate(ROUTES.DASHBOARD)}
          sx={{
            bgcolor: '#2E7D9A',
            '&:hover': { bgcolor: '#1a5276' },
          }}
        >
          Dashboard
        </Button>
      </Stack>
    </Box>
  );
};

export default NotFoundPage;
