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
 * 
 * Features: gradient banner, capability cards, format info, workflow CTA.
 */
const AnalysisSuiteEmptyState: React.FC<{ onNavigateWorkflow: () => void }> = ({ onNavigateWorkflow }) => {
  const theme = useTheme();

  const capabilities = [
    {
      icon: <Biotech sx={{ fontSize: 32, color: 'primary.main' }} />,
      title: 'AI-Powered Detection',
      description: 'Deep learning models trained on mammographic datasets for lesion detection and classification.',
    },
    {
      icon: <CloudUpload sx={{ fontSize: 32, color: 'primary.main' }} />,
      title: 'Multi-Image Upload',
      description: 'Upload and analyze CC and MLO views simultaneously for comprehensive bilateral assessment.',
    },
    {
      icon: <MedicalServices sx={{ fontSize: 32, color: 'primary.main' }} />,
      title: 'BI-RADS Assessment',
      description: 'Automated BI-RADS category suggestion based on AI findings and clinical context.',
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: theme.palette.background.default,
        p: 3,
      }}
    >
      {/* Gradient Banner */}
      <Paper
        data-testid="analysis-suite-banner"
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.dark || theme.palette.primary.main, 0.15)} 100%)`,
          borderRadius: 3,
          p: { xs: 4, md: 6 },
          mb: 4,
          textAlign: 'center',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <Biotech sx={{ fontSize: 36, color: 'primary.main' }} />
        </Box>

        <Typography variant="h4" fontWeight={600} gutterBottom>
          Analysis Suite
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, mx: 'auto', mb: 3 }}>
          Select a case or upload an image to begin analysis.
          The Analysis Suite requires a mammogram image and AI analysis results to display.
        </Typography>

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
          }}
        >
          Open Workflow to Upload & Analyze
        </Button>
      </Paper>

      {/* Capability Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 3,
          mb: 4,
        }}
      >
        {capabilities.map((cap, idx) => (
          <Paper
            key={idx}
            data-testid="capability-card"
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: theme.palette.background.paper,
              textAlign: 'center',
            }}
          >
            <Box sx={{ mb: 2 }}>{cap.icon}</Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              {cap.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {cap.description}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Supported Formats */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.background.paper,
          textAlign: 'center',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Supported formats: DICOM (.dcm), PNG, JPEG — optimized for standard mammographic imaging protocols.
        </Typography>
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
