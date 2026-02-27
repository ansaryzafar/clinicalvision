/**
 * RiskIndicator Component
 * 
 * Medical-grade risk level indicator following HCI best practices:
 * - Nielsen Heuristic #1: Visibility of system status
 * - Color-coded risk levels (Green/Yellow/Red) for instant recognition
 * - Accessible to color-blind users with icons and text
 * - Progressive disclosure: expandable details
 * 
 * Based on research from:
 * - VoxLogicA UI (Medical Image Analysis Interface)
 * - Predictive HCI Modeling for Digital Health Systems
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tooltip,
  Collapse,
  IconButton,
  Stack,
  LinearProgress,
  alpha,
  styled,
  Chip,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  ExpandMore,
  ExpandLess,
  HelpOutline,
} from '@mui/icons-material';

// Risk level types aligned with medical standards
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical' | 'unknown';

// Configuration for each risk level
const riskConfig: Record<RiskLevel, {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactElement;
  label: string;
  description: string;
}> = {
  low: {
    color: '#4CAF50',
    bgColor: 'rgba(76, 175, 80, 0.12)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
    icon: <CheckCircle />,
    label: 'Low Risk',
    description: 'No significant findings detected. Routine follow-up recommended.',
  },
  moderate: {
    color: '#FFA726',
    bgColor: 'rgba(255, 167, 38, 0.12)',
    borderColor: 'rgba(255, 167, 38, 0.3)',
    icon: <Warning />,
    label: 'Moderate Risk',
    description: 'Some findings require attention. Additional screening may be needed.',
  },
  high: {
    color: '#EF5350',
    bgColor: 'rgba(239, 83, 80, 0.12)',
    borderColor: 'rgba(239, 83, 80, 0.3)',
    icon: <ErrorIcon />,
    label: 'High Risk',
    description: 'Significant findings detected. Immediate clinical review recommended.',
  },
  critical: {
    color: '#D32F2F',
    bgColor: 'rgba(211, 47, 47, 0.15)',
    borderColor: 'rgba(211, 47, 47, 0.4)',
    icon: <ErrorIcon />,
    label: 'Critical',
    description: 'Urgent attention required. Consult specialist immediately.',
  },
  unknown: {
    color: '#9E9E9E',
    bgColor: 'rgba(158, 158, 158, 0.12)',
    borderColor: 'rgba(158, 158, 158, 0.3)',
    icon: <HelpOutline />,
    label: 'Unknown',
    description: 'Unable to determine risk level. Manual review required.',
  },
};

// Styled components
const RiskContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'riskLevel' && prop !== 'variant',
})<{ riskLevel: RiskLevel; variant: 'compact' | 'standard' | 'detailed' }>(
  ({ theme, riskLevel, variant }) => {
    const config = riskConfig[riskLevel];
    return {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(variant === 'compact' ? 1 : 1.5),
      padding: theme.spacing(
        variant === 'compact' ? 0.75 : variant === 'standard' ? 1.5 : 2
      ),
      borderRadius: variant === 'compact' ? 6 : 12,
      backgroundColor: config.bgColor,
      border: `1px solid ${config.borderColor}`,
      transition: 'all 0.2s ease-in-out',
      cursor: variant === 'detailed' ? 'pointer' : 'default',
      '&:hover': variant === 'detailed' ? {
        transform: 'translateY(-1px)',
        boxShadow: `0 4px 12px ${alpha(config.color, 0.25)}`,
      } : {},
    };
  }
);

const RiskIcon = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'riskLevel',
})<{ riskLevel: RiskLevel }>(({ riskLevel }) => {
  const config = riskConfig[riskLevel];
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: config.color,
    '& svg': {
      fontSize: 20,
    },
  };
});

const ConfidenceBar = styled(LinearProgress, {
  shouldForwardProp: (prop) => prop !== 'riskLevel',
})<{ riskLevel: RiskLevel }>(({ theme, riskLevel }) => {
  const config = riskConfig[riskLevel];
  return {
    height: 6,
    borderRadius: 3,
    backgroundColor: alpha(config.color, 0.2),
    '& .MuiLinearProgress-bar': {
      backgroundColor: config.color,
      borderRadius: 3,
    },
  };
});

// Props interface
interface RiskIndicatorProps {
  /** The risk level to display */
  level: RiskLevel;
  /** Confidence score (0-100) */
  confidence?: number;
  /** Display variant */
  variant?: 'compact' | 'standard' | 'detailed';
  /** Show confidence bar */
  showConfidence?: boolean;
  /** Custom label override */
  label?: string;
  /** Additional details to show in expanded view */
  details?: string;
  /** Custom tooltip content */
  tooltip?: string;
  /** Callback when clicked (detailed variant only) */
  onClick?: () => void;
  /** Whether to animate the appearance */
  animate?: boolean;
}

/**
 * RiskIndicator Component
 * 
 * Displays a medical risk level with visual indicators optimized for
 * clinical workflows and accessibility.
 */
export const RiskIndicator: React.FC<RiskIndicatorProps> = ({
  level,
  confidence,
  variant = 'standard',
  showConfidence = false,
  label,
  details,
  tooltip,
  onClick,
  animate = true,
}) => {
  const [expanded, setExpanded] = useState(false);
  const config = riskConfig[level];

  const handleClick = () => {
    if (variant === 'detailed') {
      setExpanded(!expanded);
    }
    if (onClick) {
      onClick();
    }
  };

  const content = (
    <RiskContainer
      riskLevel={level}
      variant={variant}
      onClick={handleClick}
      sx={{
        animation: animate ? 'fadeIn 0.3s ease-out' : 'none',
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'translateY(-4px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <RiskIcon riskLevel={level}>
        {config.icon}
      </RiskIcon>
      
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography
            variant={variant === 'compact' ? 'caption' : 'body2'}
            fontWeight={600}
            sx={{ color: config.color }}
          >
            {label || config.label}
          </Typography>
          
          {confidence !== undefined && variant !== 'compact' && (
            <Chip
              label={`${confidence.toFixed(1)}%`}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.7rem',
                fontWeight: 700,
                backgroundColor: alpha(config.color, 0.15),
                color: config.color,
                '& .MuiChip-label': { px: 1 },
              }}
            />
          )}
        </Stack>
        
        {showConfidence && confidence !== undefined && (
          <Box sx={{ mt: 1, width: '100%' }}>
            <ConfidenceBar
              variant="determinate"
              value={confidence}
              riskLevel={level}
            />
          </Box>
        )}
        
        {variant === 'detailed' && (
          <>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: 'block',
                mt: 0.5,
              }}
            >
              {config.description}
            </Typography>
            
            <Collapse in={expanded}>
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${config.borderColor}` }}>
                {details && (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {details}
                  </Typography>
                )}
              </Box>
            </Collapse>
          </>
        )}
      </Box>
      
      {variant === 'detailed' && (
        <IconButton size="small" sx={{ color: config.color }}>
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      )}
    </RiskContainer>
  );

  if (tooltip || (variant === 'compact' && !label)) {
    return (
      <Tooltip 
        title={tooltip || config.description}
        arrow
        placement="top"
      >
        {content}
      </Tooltip>
    );
  }

  return content;
};

/**
 * Utility function to convert confidence score to risk level
 */
export const confidenceToRiskLevel = (
  confidence: number,
  prediction: 'benign' | 'malignant'
): RiskLevel => {
  if (prediction === 'benign') {
    if (confidence >= 90) return 'low';
    if (confidence >= 70) return 'moderate';
    return 'unknown';
  } else {
    if (confidence >= 90) return 'critical';
    if (confidence >= 70) return 'high';
    if (confidence >= 50) return 'moderate';
    return 'unknown';
  }
};

/**
 * Quick risk badge for tables and lists
 */
export const RiskBadge: React.FC<{
  level: RiskLevel;
  size?: 'small' | 'medium';
}> = ({ level, size = 'small' }) => {
  const config = riskConfig[level];
  
  // Create a styled version of the icon with proper sizing
  const IconComponent = () => {
    const iconSize = size === 'small' ? 14 : 18;
    
    // Render appropriate icon based on level
    switch (level) {
      case 'low':
        return <CheckCircle sx={{ fontSize: iconSize, color: config.color }} />;
      case 'moderate':
        return <Warning sx={{ fontSize: iconSize, color: config.color }} />;
      case 'high':
        return <ErrorIcon sx={{ fontSize: iconSize, color: config.color }} />;
      case 'critical':
        return <ErrorIcon sx={{ fontSize: iconSize, color: config.color }} />;
      default:
        return <HelpOutline sx={{ fontSize: iconSize, color: config.color }} />;
    }
  };
  
  return (
    <Chip
      icon={<IconComponent />}
      label={config.label}
      size={size}
      sx={{
        backgroundColor: config.bgColor,
        color: config.color,
        border: `1px solid ${config.borderColor}`,
        fontWeight: 600,
        fontSize: size === 'small' ? '0.7rem' : '0.8rem',
        '& .MuiChip-icon': {
          color: config.color,
        },
      }}
    />
  );
};

export default RiskIndicator;
