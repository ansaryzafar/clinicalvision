/**
 * AnalysisResultCard Component
 * 
 * Displays AI analysis results following HCI best practices:
 * - Nielsen Heuristic #1: Visibility of system status
 * - Nielsen Heuristic #6: Recognition rather than recall
 * - Nielsen Heuristic #8: Aesthetic and minimalist design
 * - Clear visual hierarchy with risk color coding
 * - Progressive disclosure for detailed metrics
 * 
 * Based on research from:
 * - VoxLogicA UI (Medical Image Analysis Interface)
 * - Predictive HCI Modeling for Digital Health Systems
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Divider,
  IconButton,
  Collapse,
  Chip,
  LinearProgress,
  Tooltip,
  alpha,
  styled,
  Grid,
} from '@mui/material';
import {
  ExpandMore,
  CheckCircle,
  Warning,
  Science,
  Psychology,
  Info,
  AccessTime,
  CloudDone,
  Download,
  Share,
} from '@mui/icons-material';
import { RiskIndicator, RiskLevel, confidenceToRiskLevel } from './RiskIndicator';

// Styled components
const ResultCard = styled(Card)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 12,
  overflow: 'visible',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.15)}`,
  },
}));

const ConfidenceBar = styled(LinearProgress, {
  shouldForwardProp: (prop) => prop !== 'riskLevel',
})<{ riskLevel?: RiskLevel }>(({ theme, riskLevel }) => {
  const colors: Record<RiskLevel, string> = {
    low: '#4CAF50',
    moderate: '#FFA726',
    high: '#EF5350',
    critical: '#D32F2F',
    unknown: '#9E9E9E',
  };
  const color = riskLevel ? colors[riskLevel] : theme.palette.primary.main;
  
  return {
    height: 8,
    borderRadius: 4,
    backgroundColor: alpha(color, 0.2),
    '& .MuiLinearProgress-bar': {
      backgroundColor: color,
      borderRadius: 4,
    },
  };
});

const MetricItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: theme.spacing(2),
  borderRadius: 8,
  backgroundColor: alpha(theme.palette.primary.main, 0.04),
  textAlign: 'center',
  flex: 1,
  minWidth: 80,
}));

// Props interface
interface AnalysisResultCardProps {
  /** Primary prediction (benign/malignant) */
  prediction: 'benign' | 'malignant';
  /** Confidence score (0-100) */
  confidence: number;
  /** Probability scores */
  probabilities: {
    benign: number;
    malignant: number;
  };
  /** Processing time in ms */
  processingTime?: number;
  /** Model version */
  modelVersion?: string;
  /** Timestamp of analysis */
  timestamp?: Date;
  /** Uncertainty metrics (optional) */
  uncertainty?: {
    epistemic?: number;
    aleatoric?: number;
    requiresReview?: boolean;
  };
  /** Expandable details */
  showDetails?: boolean;
  /** Card variant */
  variant?: 'compact' | 'standard' | 'detailed';
  /** Callback for download */
  onDownload?: () => void;
  /** Callback for share */
  onShare?: () => void;
}

/**
 * AnalysisResultCard Component
 * 
 * Displays AI analysis results with clear visual hierarchy
 */
export const AnalysisResultCard: React.FC<AnalysisResultCardProps> = ({
  prediction,
  confidence,
  probabilities,
  processingTime,
  modelVersion,
  timestamp,
  uncertainty,
  showDetails = true,
  variant = 'standard',
  onDownload,
  onShare,
}) => {
  const [expanded, setExpanded] = useState(false);
  
  // Determine risk level from prediction and confidence
  const riskLevel = confidenceToRiskLevel(confidence, prediction);
  
  // Format values
  const formattedConfidence = confidence.toFixed(1);
  const formattedTime = processingTime ? `${(processingTime / 1000).toFixed(2)}s` : null;
  const formattedDate = timestamp?.toLocaleString() || new Date().toLocaleString();
  
  // Prediction colors and icons
  const predictionConfig = {
    benign: {
      color: '#4CAF50',
      bgColor: 'rgba(76, 175, 80, 0.1)',
      icon: <CheckCircle />,
      label: 'Benign',
      description: 'No malignant findings detected',
    },
    malignant: {
      color: '#EF5350',
      bgColor: 'rgba(239, 83, 80, 0.1)',
      icon: <Warning />,
      label: 'Malignant',
      description: 'Suspicious findings detected - clinical review recommended',
    },
  };
  
  const config = predictionConfig[prediction];

  return (
    <ResultCard elevation={0}>
      <CardContent sx={{ p: variant === 'compact' ? 2 : 3 }}>
        {/* Header with prediction result */}
        <Stack 
          direction="row" 
          justifyContent="space-between" 
          alignItems="flex-start"
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={600}>
              AI Analysis Result
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 0.5 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  backgroundColor: config.bgColor,
                  color: config.color,
                }}
              >
                {config.icon}
              </Box>
              <Box>
                <Typography 
                  variant="h5" 
                  fontWeight={700}
                  sx={{ color: config.color }}
                >
                  {config.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {config.description}
                </Typography>
              </Box>
            </Stack>
          </Box>
          
          {/* Actions */}
          <Stack direction="row" spacing={1}>
            {onDownload && (
              <Tooltip title="Download Report">
                <IconButton size="small" onClick={onDownload}>
                  <Download fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onShare && (
              <Tooltip title="Share">
                <IconButton size="small" onClick={onShare}>
                  <Share fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>

        {/* Confidence Section */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              Confidence Level
            </Typography>
            <Chip
              label={`${formattedConfidence}%`}
              size="small"
              sx={{
                backgroundColor: alpha(config.color, 0.15),
                color: config.color,
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            />
          </Stack>
          <ConfidenceBar
            variant="determinate"
            value={confidence}
            riskLevel={riskLevel}
          />
        </Box>

        {/* Risk Assessment */}
        <Box sx={{ mb: 3 }}>
          <RiskIndicator
            level={riskLevel}
            confidence={confidence}
            variant="standard"
            showConfidence={false}
          />
        </Box>

        {/* Quick Metrics */}
        {variant !== 'compact' && (
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <MetricItem>
              <Science sx={{ fontSize: 20, color: 'text.secondary', mb: 0.5 }} />
              <Typography variant="caption" color="text.secondary">
                Benign Prob.
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                {(probabilities.benign * 100).toFixed(1)}%
              </Typography>
            </MetricItem>
            <MetricItem>
              <Psychology sx={{ fontSize: 20, color: 'text.secondary', mb: 0.5 }} />
              <Typography variant="caption" color="text.secondary">
                Malignant Prob.
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                {(probabilities.malignant * 100).toFixed(1)}%
              </Typography>
            </MetricItem>
            {formattedTime && (
              <MetricItem>
                <AccessTime sx={{ fontSize: 20, color: 'text.secondary', mb: 0.5 }} />
                <Typography variant="caption" color="text.secondary">
                  Processing
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {formattedTime}
                </Typography>
              </MetricItem>
            )}
          </Stack>
        )}

        {/* Expandable Details */}
        {showDetails && variant === 'detailed' && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box
              onClick={() => setExpanded(!expanded)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                py: 1,
              }}
            >
              <Typography variant="body2" fontWeight={600}>
                Advanced Metrics
              </Typography>
              <IconButton size="small">
                <ExpandMore
                  sx={{
                    transform: expanded ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                />
              </IconButton>
            </Box>
            
            <Collapse in={expanded}>
              <Box sx={{ pt: 2 }}>
                <Grid container spacing={2}>
                  {/* Uncertainty Metrics */}
                  {uncertainty && (
                    <>
                      {uncertainty.epistemic !== undefined && (
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">
                            Epistemic Uncertainty
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {(uncertainty.epistemic * 100).toFixed(2)}%
                          </Typography>
                        </Grid>
                      )}
                      {uncertainty.aleatoric !== undefined && (
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">
                            Aleatoric Uncertainty
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {(uncertainty.aleatoric * 100).toFixed(2)}%
                          </Typography>
                        </Grid>
                      )}
                      {uncertainty.requiresReview && (
                        <Grid size={{ xs: 12 }}>
                          <Chip
                            icon={<Info />}
                            label="Human Review Recommended"
                            size="small"
                            color="warning"
                            sx={{ mt: 1 }}
                          />
                        </Grid>
                      )}
                    </>
                  )}
                  
                  {/* Model Info */}
                  {modelVersion && (
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Model Version
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {modelVersion}
                      </Typography>
                    </Grid>
                  )}
                  
                  {/* Timestamp */}
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Analysis Time
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formattedDate}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Collapse>
          </>
        )}

        {/* Footer - Minimal */}
        {variant === 'compact' && (
          <Stack 
            direction="row" 
            justifyContent="space-between" 
            alignItems="center"
            sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <CloudDone sx={{ fontSize: 16, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.disabled">
                Processed by AI
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.disabled">
              {formattedDate}
            </Typography>
          </Stack>
        )}
      </CardContent>
    </ResultCard>
  );
};

export default AnalysisResultCard;
