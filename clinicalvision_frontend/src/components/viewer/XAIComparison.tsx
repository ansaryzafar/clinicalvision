/**
 * XAI Comparison Component
 * 
 * Side-by-side comparison of multiple explainability methods:
 * - GradCAM++ attention heatmaps
 * - LIME superpixel explanations
 * - SHAP feature attributions
 * 
 * Enables clinicians to validate AI reasoning through
 * multiple independent explanation approaches.
 * 
 * Standards:
 * - FDA Guidance on Transparency in AI/ML (2021)
 * - Interpretable Machine Learning Best Practices
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Stack,
  Button,
  Grid,
  Chip,
  CircularProgress,
  alpha,
  useTheme,
  Tooltip,
  IconButton,
  Alert,
  AlertTitle,
  Paper,
} from '@mui/material';
import {
  Visibility,
  Compare,
  Assessment,
  Info,
  CheckCircle,
  Warning,
  Refresh,
  ZoomIn,
  HelpOutline,
} from '@mui/icons-material';
import {
  api,
  GradCAMResponse,
  LIMEResponse,
  SHAPResponse,
  XAIValidationResponse,
  XAIMethod,
} from '../../services/api';

// ============================================================================
// Types
// ============================================================================

interface XAIComparisonProps {
  imageFile: File | null;
  onMethodSelect?: (method: XAIMethod) => void;
}

interface XAIResult {
  method: XAIMethod;
  loading: boolean;
  error: string | null;
  data: GradCAMResponse | LIMEResponse | SHAPResponse | null;
  processingTime?: number;
}

// ============================================================================
// Helper Components
// ============================================================================

interface MethodCardProps {
  title: string;
  description: string;
  method: XAIMethod;
  result: XAIResult | undefined;
  onGenerate: (method: XAIMethod) => void;
  isGenerating: boolean;
}

const MethodCard: React.FC<MethodCardProps> = ({
  title,
  description,
  method,
  result,
  onGenerate,
  isGenerating,
}) => {
  const theme = useTheme();
  const hasData = result?.data;
  const isLoading = result?.loading || false;
  const error = result?.error;

  // Get visualization from result
  const getVisualization = () => {
    if (!hasData) return null;
    
    if (method === 'gradcam' || method === 'gradcam++') {
      const gradcamData = result?.data as GradCAMResponse;
      return gradcamData.attention_image || gradcamData.overlay_base64 || gradcamData.heatmap_base64;
    } else if (method === 'lime') {
      const limeData = result?.data as LIMEResponse;
      return limeData.lime_image;
    } else if (method === 'shap') {
      const shapData = result?.data as SHAPResponse;
      return shapData.shap_image;
    }
    return null;
  };

  const visualization = getVisualization();

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        borderRadius: 2,
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: alpha(theme.palette.primary.main, 0.3),
        },
      }}
    >
      <CardHeader
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle1" fontWeight={600}>
              {title}
            </Typography>
            {hasData && (
              <Chip
                size="small"
                icon={<CheckCircle fontSize="small" />}
                label="Ready"
                color="success"
                variant="outlined"
              />
            )}
          </Stack>
        }
        subheader={description}
        action={
          <Tooltip title="Learn more about this method">
            <IconButton size="small">
              <HelpOutline fontSize="small" />
            </IconButton>
          </Tooltip>
        }
      />
      <CardContent>
        <Stack spacing={2}>
          {/* Visualization Area */}
          <Box
            sx={{
              height: 200,
              bgcolor: alpha(theme.palette.background.paper, 0.5),
              borderRadius: 2,
              border: `1px dashed ${alpha(theme.palette.divider, 0.2)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {isLoading ? (
              <Stack alignItems="center" spacing={1}>
                <CircularProgress size={40} />
                <Typography variant="caption" color="text.secondary">
                  Generating explanation...
                </Typography>
              </Stack>
            ) : error ? (
              <Stack alignItems="center" spacing={1}>
                <Warning color="error" />
                <Typography variant="caption" color="error" textAlign="center">
                  {error}
                </Typography>
              </Stack>
            ) : visualization ? (
              <Box
                component="img"
                src={`data:image/png;base64,${visualization}`}
                alt={`${title} visualization`}
                sx={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <Stack alignItems="center" spacing={1}>
                <Visibility sx={{ fontSize: 40, color: alpha(theme.palette.text.secondary, 0.3) }} />
                <Typography variant="caption" color="text.secondary">
                  Click Generate to create visualization
                </Typography>
              </Stack>
            )}
          </Box>

          {/* Metrics */}
          {hasData && (
            <Stack direction="row" spacing={2} justifyContent="space-between">
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Prediction
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {(result?.data as any)?.prediction || 'N/A'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Confidence
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {(((result?.data as any)?.confidence || 0) * 100).toFixed(1)}%
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Time
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {result?.processingTime || 0}ms
                </Typography>
              </Box>
            </Stack>
          )}

          {/* Actions */}
          <Stack direction="row" spacing={1}>
            <Button
              variant={hasData ? 'outlined' : 'contained'}
              size="small"
              onClick={() => onGenerate(method)}
              disabled={isGenerating || isLoading}
              startIcon={hasData ? <Refresh /> : <Assessment />}
              fullWidth
            >
              {hasData ? 'Regenerate' : 'Generate'}
            </Button>
            {hasData && (
              <Tooltip title="Zoom in">
                <IconButton size="small">
                  <ZoomIn />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const XAIComparison: React.FC<XAIComparisonProps> = ({ imageFile, onMethodSelect }) => {
  const theme = useTheme();

  // State
  const [results, setResults] = useState<Record<XAIMethod, XAIResult>>({
    gradcam: { method: 'gradcam', loading: false, error: null, data: null },
    'gradcam++': { method: 'gradcam++', loading: false, error: null, data: null },
    lime: { method: 'lime', loading: false, error: null, data: null },
    shap: { method: 'shap', loading: false, error: null, data: null },
    integrated_gradients: { method: 'integrated_gradients', loading: false, error: null, data: null },
  });
  const [validation, setValidation] = useState<XAIValidationResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  // ============================================================================
  // Handlers
  // ============================================================================

  const generateExplanation = useCallback(async (method: XAIMethod) => {
    if (!imageFile) return;

    setResults(prev => ({
      ...prev,
      [method]: { ...prev[method], loading: true, error: null },
    }));

    try {
      const startTime = performance.now();
      let data: GradCAMResponse | LIMEResponse | SHAPResponse;

      switch (method) {
        case 'gradcam':
        case 'gradcam++':
        case 'integrated_gradients':
          data = await api.generateGradCAM(imageFile, { method });
          break;
        case 'lime':
          data = await api.generateLIME(imageFile, { n_samples: 100, top_k_features: 10 });
          break;
        case 'shap':
          data = await api.generateSHAP(imageFile, { n_samples: 50 });
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      const processingTime = Math.round(performance.now() - startTime);

      setResults(prev => ({
        ...prev,
        [method]: {
          method,
          loading: false,
          error: null,
          data,
          processingTime,
        },
      }));

      onMethodSelect?.(method);
    } catch (err: any) {
      console.error(`Failed to generate ${method}:`, err);
      setResults(prev => ({
        ...prev,
        [method]: {
          ...prev[method],
          loading: false,
          error: err.message || `Failed to generate ${method} explanation`,
        },
      }));
    }
  }, [imageFile, onMethodSelect]);

  const generateAll = useCallback(async () => {
    if (!imageFile) return;
    setIsGeneratingAll(true);

    try {
      // Generate in parallel where possible
      await Promise.all([
        generateExplanation('gradcam++'),
        generateExplanation('lime'),
        generateExplanation('shap'),
      ]);
    } finally {
      setIsGeneratingAll(false);
    }
  }, [imageFile, generateExplanation]);

  const validateXAI = useCallback(async () => {
    if (!imageFile) return;
    setIsValidating(true);

    try {
      const result = await api.validateXAI(imageFile);
      setValidation(result);
    } catch (err: any) {
      console.error('XAI validation failed:', err);
    } finally {
      setIsValidating(false);
    }
  }, [imageFile]);

  // ============================================================================
  // Render
  // ============================================================================

  if (!imageFile) {
    return (
      <Card
        elevation={0}
        sx={{
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          borderRadius: 3,
        }}
      >
        <CardContent>
          <Stack alignItems="center" spacing={2} py={4}>
            <Compare sx={{ fontSize: 60, color: alpha(theme.palette.text.secondary, 0.3) }} />
            <Typography variant="h6" color="text.secondary">
              No Image Selected
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Upload or select a mammogram image to compare XAI explanation methods
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        borderRadius: 3,
      }}
    >
      <CardHeader
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            <Compare color="primary" />
            <Typography variant="h6" fontWeight={600}>
              XAI Method Comparison
            </Typography>
          </Stack>
        }
        subheader="Compare multiple explainability approaches to validate AI reasoning"
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              onClick={validateXAI}
              disabled={isValidating}
              startIcon={isValidating ? <CircularProgress size={16} /> : <Assessment />}
            >
              Validate Quality
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={generateAll}
              disabled={isGeneratingAll}
              startIcon={isGeneratingAll ? <CircularProgress size={16} /> : <Refresh />}
            >
              Generate All
            </Button>
          </Stack>
        }
      />

      <CardContent>
        <Stack spacing={3}>
          {/* Validation Results */}
          {validation && (
            <Alert
              severity={validation.overall_score > 0.7 ? 'success' : 'warning'}
              icon={validation.overall_score > 0.7 ? <CheckCircle /> : <Warning />}
            >
              <AlertTitle>
                XAI Quality Score: {(validation.overall_score * 100).toFixed(0)}%
              </AlertTitle>
              <Typography variant="body2">
                Status: <strong>{validation.overall_status}</strong> • {validation.passed ? 'Passed' : 'Needs attention'}
              </Typography>
            </Alert>
          )}

          {/* Method Cards Grid */}
          <Grid container spacing={3}>
            {/* GradCAM++ */}
            <Grid size={{ xs: 12, md: 4 }}>
              <MethodCard
                title="GradCAM++"
                description="Gradient-weighted Class Activation Mapping with improved localization"
                method="gradcam++"
                result={results['gradcam++']}
                onGenerate={generateExplanation}
                isGenerating={isGeneratingAll}
              />
            </Grid>

            {/* LIME */}
            <Grid size={{ xs: 12, md: 4 }}>
              <MethodCard
                title="LIME"
                description="Local Interpretable Model-agnostic Explanations via superpixels"
                method="lime"
                result={results.lime}
                onGenerate={generateExplanation}
                isGenerating={isGeneratingAll}
              />
            </Grid>

            {/* SHAP */}
            <Grid size={{ xs: 12, md: 4 }}>
              <MethodCard
                title="SHAP"
                description="SHapley Additive exPlanations with game-theoretic feature attribution"
                method="shap"
                result={results.shap}
                onGenerate={generateExplanation}
                isGenerating={isGeneratingAll}
              />
            </Grid>
          </Grid>

          {/* Method Comparison Legend */}
          <Paper
            sx={{
              p: 2,
              bgcolor: alpha(theme.palette.info.main, 0.05),
              border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
              borderRadius: 2,
            }}
          >
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Info color="info" />
              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Understanding XAI Methods
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>GradCAM++:</strong> Shows which image regions the model focuses on.
                      Hot colors indicate high attention, useful for verifying the model looks
                      at clinically relevant areas.
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>LIME:</strong> Identifies which superpixel regions contribute most
                      to the prediction. Green regions support the prediction, red regions
                      oppose it.
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>SHAP:</strong> Provides mathematically grounded feature attributions
                      based on game theory. Shows each feature's contribution to the final
                      prediction score.
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Stack>
          </Paper>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default XAIComparison;
