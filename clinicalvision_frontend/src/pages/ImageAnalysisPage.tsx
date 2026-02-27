/**
 * Professional Image Analysis Page
 * Full-screen medical imaging workstation interface
 * 
 * This page provides a dedicated, distraction-free environment
 * for medical image analysis with professional tools and controls.
 * 
 * When accessed directly (no image data), displays an empty-state
 * landing page with options to upload or navigate to workflow.
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes/paths';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import {
  CloudUpload,
  MedicalServices,
  Biotech,
  ArrowForward,
} from '@mui/icons-material';
import { AnalysisSuite } from '../components/viewer/AnalysisSuite';
import { InferenceResponse } from '../services/api';

/**
 * Empty state component shown when Analysis Suite is opened
 * without image data (e.g., from sidebar navigation).
 */
const AnalysisSuiteEmptyState: React.FC<{ onNavigateWorkflow: () => void }> = ({ onNavigateWorkflow }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: theme.palette.background.default,
        p: 3,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 600,
          width: '100%',
          p: 5,
          borderRadius: 3,
          textAlign: 'center',
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.background.paper,
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <Biotech sx={{ fontSize: 40, color: 'primary.main' }} />
        </Box>

        <Typography variant="h5" fontWeight={600} gutterBottom>
          No Image Loaded
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Select a case or upload an image to begin analysis. 
          The Analysis Suite requires a mammogram image and AI analysis results to display.
        </Typography>

        <Stack spacing={2} direction="column" alignItems="center">
          <Button
            variant="contained"
            size="large"
            startIcon={<MedicalServices />}
            endIcon={<ArrowForward />}
            onClick={onNavigateWorkflow}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              width: '100%',
              maxWidth: 340,
            }}
          >
            Open Workflow to Upload &amp; Analyze
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

/**
 * ImageAnalysisPage
 * Displays the professional analysis suite for medical imaging.
 * Shows empty-state UX when no image data is available.
 */
export const ImageAnalysisPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get data passed from upload/workflow
  const state = location.state as {
    imageFile?: File;
    analysisResults?: InferenceResponse;
  } | null;

  const hasData = !!(state?.imageFile || state?.analysisResults);

  const handleClose = () => {
    navigate(ROUTES.DASHBOARD);
  };

  const handleNavigateWorkflow = () => {
    navigate(ROUTES.WORKFLOW);
  };

  // F4: Show empty state when no data is available
  if (!hasData) {
    return <AnalysisSuiteEmptyState onNavigateWorkflow={handleNavigateWorkflow} />;
  }

  return (
    <Box sx={{ height: '100vh', overflow: 'hidden' }}>
      <AnalysisSuite
        imageFile={state?.imageFile}
        analysisResults={state?.analysisResults}
        onClose={handleClose}
      />
    </Box>
  );
};

export default ImageAnalysisPage;
