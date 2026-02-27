import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Stack,
  Divider,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  LocationOn,
  AccessTime,
  TrendingUp,
} from '@mui/icons-material';
import { InferenceResponse, SuspiciousRegion } from '../../services/api';
import { professionalColors } from '../../theme/professionalColors';
import { useTheme } from '@mui/material/styles';

/**
 * AnalysisResults Component
 * 
 * Clinical-grade results display with:
 * - Prediction with confidence visualization
 * - Uncertainty metrics
 * - Suspicious region findings
 * - Clinical narrative
 * - Radiologist-friendly presentation
 */

interface AnalysisResultsProps {
  results: InferenceResponse;
  onFeedbackSubmit?: () => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ results }) => {
  const theme = useTheme();
  
  /**
   * Get prediction color and icon
   */
  const getPredictionStyle = () => {
    switch (results.prediction.toUpperCase()) {
      case 'BENIGN':
        return {
          color: 'success' as const,
          bgcolor: 'success.light',
          icon: <CheckCircle />,
          label: 'Benign',
        };
      case 'MALIGNANT':
        return {
          color: 'error' as const,
          bgcolor: 'error.light',
          icon: <ErrorIcon />,
          label: 'Malignant',
        };
      case 'UNCERTAIN':
        return {
          color: 'warning' as const,
          bgcolor: 'warning.light',
          icon: <Warning />,
          label: 'Uncertain - Review Required',
        };
      default:
        return {
          color: 'info' as const,
          bgcolor: 'info.light',
          icon: <Warning />,
          label: 'Unknown',
        };
    }
  };

  const predictionStyle = getPredictionStyle();

  /**
   * Format confidence as percentage
   */
  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  /**
   * Get uncertainty level description
   */
  const getUncertaintyLevel = (uncertainty: number): { label: string; color: string } => {
    if (uncertainty < 0.2) return { label: 'Low', color: 'success.main' };
    if (uncertainty < 0.4) return { label: 'Moderate', color: 'info.main' };
    if (uncertainty < 0.6) return { label: 'High', color: 'warning.main' };
    return { label: 'Very High', color: 'error.main' };
  };

  const uncertaintyLevel = getUncertaintyLevel(results.uncertainty.epistemic_uncertainty);

  return (
    <Box>
      {/* Case ID Header */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          mb: 3, 
          borderRadius: 2, 
          bgcolor: 'background.paper',
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="overline" color="text.secondary">
              Case ID
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
              {results.case_id}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <AccessTime fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              Processed: {new Date(results.timestamp).toLocaleString()}
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      <Stack spacing={3}>
        {/* Main Prediction Card */}
        <Box>
          <Card 
            elevation={0} 
            sx={{ 
              height: '100%', 
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="overline" color="text.secondary" gutterBottom>
                AI Prediction
              </Typography>
              
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: predictionStyle.bgcolor,
                    color: `${predictionStyle.color}.dark`,
                  }}
                >
                  {predictionStyle.icon}
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: `${predictionStyle.color}.dark` }}>
                    {predictionStyle.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Model Confidence: {formatPercentage(results.confidence)}
                  </Typography>
                </Box>
              </Stack>

              <Box sx={{ mb: 3 }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    Confidence Level
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="primary">
                    {formatPercentage(results.confidence)}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={results.confidence * 100}
                  sx={{ height: 8, borderRadius: 4 }}
                  color={predictionStyle.color}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Risk Level
                  </Typography>
                  <Chip
                    label={results.risk_level.toUpperCase()}
                    size="small"
                    color={results.risk_level === 'high' ? 'error' : results.risk_level === 'moderate' ? 'warning' : 'success'}
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Uncertainty
                  </Typography>
                  <Chip
                    label={`${uncertaintyLevel.label} (${formatPercentage(results.uncertainty.epistemic_uncertainty)})`}
                    size="small"
                    sx={{ bgcolor: uncertaintyLevel.color, color: 'white', fontWeight: 600 }}
                  />
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Processing Time
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {results.inference_time_ms ? `${(results.inference_time_ms / 1000).toFixed(2)}s` : 'N/A'}
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Clinical Narrative Card */}
        <Box>
          <Card 
            elevation={0} 
            sx={{ 
              height: '100%', 
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="overline" color="text.secondary" gutterBottom>
                Clinical Interpretation
              </Typography>

              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'primary.main' }}>
                    Analysis Narrative
                  </Typography>
                  <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                    {results.explanation.narrative}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'primary.main' }}>
                    Confidence Explanation
                  </Typography>
                  <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                    {results.explanation.confidence_explanation}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'primary.main' }}>
                    Recommendation
                  </Typography>
                  <Alert
                    severity={results.prediction === 'benign' ? 'success' : results.prediction === 'malignant' ? 'error' : 'warning'}
                    icon={<TrendingUp />}
                    sx={{ borderRadius: 2 }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {results.prediction === 'malignant' 
                        ? 'Further clinical evaluation recommended.' 
                        : 'Continue routine screening as appropriate.'}
                    </Typography>
                  </Alert>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Suspicious Regions */}
        {results.explanation.suspicious_regions && results.explanation.suspicious_regions.length > 0 && (
          <Box>
            <Card 
              elevation={0} 
              sx={{ 
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="overline" color="text.secondary" gutterBottom>
                  Suspicious Regions Detected
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  {results.explanation.suspicious_regions.length} Region{results.explanation.suspicious_regions.length > 1 ? 's' : ''} of Interest
                </Typography>

                <List>
                  {results.explanation.suspicious_regions.map((region: SuspiciousRegion, index: number) => (
                    <React.Fragment key={index}>
                      <ListItem
                        sx={{
                          bgcolor: 'background.default',
                          borderRadius: 2,
                          mb: 1,
                          border: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        <ListItemIcon>
                          <LocationOn color="error" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Stack direction="row" alignItems="center" spacing={2}>
                              <Typography variant="body1" fontWeight={600}>
                                Region {region.region_id || index + 1}: {region.location}
                              </Typography>
                              <Chip
                                label={`${formatPercentage(region.attention_score)} attention`}
                                size="small"
                                color={region.attention_score > 0.7 ? 'error' : 'warning'}
                              />
                            </Stack>
                          }
                          secondary={`Bounding Box: [${region.bbox.join(', ')}]`}
                          secondaryTypographyProps={{
                            variant: 'caption',
                            sx: { fontFamily: 'monospace', mt: 1 },
                          }}
                        />
                      </ListItem>
                      {index < results.explanation.suspicious_regions.length - 1 && <Divider sx={{ my: 1 }} />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Model Metadata */}
        <Box>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2, 
              borderRadius: 2, 
              bgcolor: 'background.paper',
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Model Version
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {results.model_version}
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Analysis Date
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {new Date(results.timestamp).toLocaleDateString()}
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Analysis Time
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {new Date(results.timestamp).toLocaleTimeString()}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
};

export default AnalysisResults;
