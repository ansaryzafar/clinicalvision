/**
 * ContextualHelp Component
 * 
 * Implements Nielsen Heuristic #10: Help and Documentation
 * "Even though it is better if the system can be used without documentation,
 * it may be necessary to provide help and documentation."
 * 
 * Also implements Progressive Disclosure (VoxLogicA UI):
 * - Minimal initial complexity
 * - Details available on demand
 * - Non-intrusive help tooltips
 */

import React, { useState } from 'react';
import {
  Tooltip,
  TooltipProps,
  IconButton,
  Box,
  Typography,
  Stack,
  Divider,
  Link,
  Popover,
  alpha,
  styled,
  Chip,
} from '@mui/material';
import {
  HelpOutline,
  Info,
  Lightbulb,
  OpenInNew,
  Keyboard,
  Warning,
} from '@mui/icons-material';

// Styled tooltip content
const HelpTooltipContent = styled(Box)(({ theme }) => ({
  maxWidth: 320,
  padding: theme.spacing(1.5),
}));

const TipBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  borderRadius: 8,
  backgroundColor: alpha(theme.palette.info.main, 0.08),
  marginTop: theme.spacing(1),
}));

// Help content type
interface HelpContent {
  title: string;
  description: string;
  tip?: string;
  warning?: string;
  shortcut?: string;
  learnMoreUrl?: string;
}

// Pre-defined help content for common UI elements
export const helpContent: Record<string, HelpContent> = {
  // Analysis
  'confidence-score': {
    title: 'Confidence Score',
    description: 'The AI model\'s certainty in its prediction, expressed as a percentage. Higher scores indicate greater confidence.',
    tip: 'Scores below 70% may warrant additional review by a specialist.',
    learnMoreUrl: '/documentation',
  },
  'mc-dropout': {
    title: 'MC Dropout Uncertainty',
    description: 'Monte Carlo Dropout provides uncertainty estimates by running multiple inference passes with dropout enabled.',
    tip: 'High epistemic uncertainty suggests the model is unsure—consider this case for human review.',
  },
  'risk-level': {
    title: 'Risk Assessment',
    description: 'Categorizes findings into Low, Moderate, High, or Critical based on prediction confidence and clinical guidelines.',
    warning: 'This is an AI-assisted assessment and should not replace professional medical judgment.',
  },
  
  // Upload
  'supported-formats': {
    title: 'Supported Image Formats',
    description: 'Upload mammogram images in PNG, JPG, or DICOM format. Images should be properly oriented with clear tissue visibility.',
    tip: 'For best results, use original DICOM files from the imaging device.',
  },
  'image-preprocessing': {
    title: 'Image Preprocessing',
    description: 'Uploaded images are automatically normalized, resized, and enhanced for optimal AI analysis.',
    shortcut: 'Ctrl+U',
  },
  
  // Dashboard
  'system-status': {
    title: 'System Status',
    description: 'Shows real-time health of API services and AI model availability. Green indicates all systems operational.',
    tip: 'If status shows degraded, results may take longer but will still be accurate.',
  },
  'recent-cases': {
    title: 'Recent Cases',
    description: 'Quick access to your most recent analyses. Click any case to view full results.',
    shortcut: 'G H',
  },
  
  // Navigation
  'keyboard-shortcuts': {
    title: 'Keyboard Shortcuts',
    description: 'Use keyboard shortcuts for faster navigation. Press ? anywhere to see all available shortcuts.',
    shortcut: '?',
    tip: 'Power users can navigate entirely with keyboard using G+[key] combinations.',
  },
  'command-palette': {
    title: 'Command Palette',
    description: 'Quickly access any feature by typing its name. Search for commands, navigate pages, or trigger actions.',
    shortcut: 'Ctrl+K',
    tip: 'Start typing to filter commands. Use arrow keys to navigate, Enter to select.',
  },
};

// Simple inline help icon with tooltip
interface HelpIconProps {
  helpKey: keyof typeof helpContent | string;
  size?: 'small' | 'medium';
  color?: 'inherit' | 'primary' | 'secondary' | 'action' | 'disabled';
}

export const HelpIcon: React.FC<HelpIconProps> = ({ 
  helpKey, 
  size = 'small',
  color = 'action',
}) => {
  const content = helpContent[helpKey];
  
  if (!content) {
    console.warn(`Help content not found for key: ${helpKey}`);
    return null;
  }

  return (
    <Tooltip
      title={
        <HelpTooltipContent>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            {content.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {content.description}
          </Typography>
          
          {content.shortcut && (
            <Box sx={{ mt: 1 }}>
              <Chip 
                label={content.shortcut} 
                size="small" 
                variant="outlined"
                icon={<Keyboard sx={{ fontSize: 14 }} />}
                sx={{ height: 24, fontSize: '0.75rem' }}
              />
            </Box>
          )}
          
          {content.tip && (
            <TipBox>
              <Lightbulb color="info" sx={{ fontSize: 18, mt: 0.25 }} />
              <Typography variant="caption">{content.tip}</Typography>
            </TipBox>
          )}
          
          {content.warning && (
            <TipBox sx={{ bgcolor: alpha('#FFA726', 0.1) }}>
              <Warning color="warning" sx={{ fontSize: 18, mt: 0.25 }} />
              <Typography variant="caption" color="warning.main">
                {content.warning}
              </Typography>
            </TipBox>
          )}
        </HelpTooltipContent>
      }
      arrow
      placement="top"
      enterDelay={300}
    >
      <IconButton size={size} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
        <HelpOutline fontSize={size} color={color} />
      </IconButton>
    </Tooltip>
  );
};

// Detailed help popover (for more complex help)
interface HelpPopoverProps {
  helpKey: keyof typeof helpContent | string;
  children: React.ReactElement<{ onClick?: (e: React.MouseEvent<HTMLElement>) => void }>;
}

export const HelpPopover: React.FC<HelpPopoverProps> = ({ helpKey, children }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const content = helpContent[helpKey];

  if (!content) {
    return children;
  }

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
    if (children.props.onClick) {
      children.props.onClick(e);
    }
  };

  return (
    <>
      <Box onClick={handleClick} sx={{ display: 'inline-flex' }}>
        {children}
      </Box>
      
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        PaperProps={{
          sx: { 
            borderRadius: 2, 
            maxWidth: 360,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }
        }}
      >
        <Box sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <Info color="primary" />
            <Typography variant="subtitle1" fontWeight={600}>
              {content.title}
            </Typography>
          </Stack>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            {content.description}
          </Typography>
          
          {content.shortcut && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary">
                Keyboard shortcut:
              </Typography>
              <Chip 
                label={content.shortcut} 
                size="small" 
                sx={{ ml: 1, height: 22, fontFamily: 'monospace' }}
              />
            </Box>
          )}
          
          {content.tip && (
            <TipBox>
              <Lightbulb color="info" sx={{ fontSize: 20 }} />
              <Box>
                <Typography variant="caption" fontWeight={600} display="block">
                  Pro Tip
                </Typography>
                <Typography variant="caption">
                  {content.tip}
                </Typography>
              </Box>
            </TipBox>
          )}
          
          {content.warning && (
            <TipBox sx={{ bgcolor: alpha('#FFA726', 0.1), mt: content.tip ? 1 : 0 }}>
              <Warning color="warning" sx={{ fontSize: 20 }} />
              <Typography variant="caption" color="warning.dark">
                {content.warning}
              </Typography>
            </TipBox>
          )}
          
          {content.learnMoreUrl && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Link 
                href={content.learnMoreUrl}
                target="_blank"
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5,
                  fontSize: '0.875rem',
                }}
              >
                Learn more <OpenInNew sx={{ fontSize: 14 }} />
              </Link>
            </>
          )}
        </Box>
      </Popover>
    </>
  );
};

// Inline help text component
interface InlineHelpProps {
  text: string;
  helpKey?: keyof typeof helpContent | string;
}

export const InlineHelp: React.FC<InlineHelpProps> = ({ text, helpKey }) => {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Typography variant="body2" color="text.secondary">
        {text}
      </Typography>
      {helpKey && <HelpIcon helpKey={helpKey} size="small" />}
    </Stack>
  );
};

// Feature tour step (for onboarding)
export interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  placement?: TooltipProps['placement'];
}

export const tourSteps: TourStep[] = [
  {
    target: '[data-tour="dashboard"]',
    title: 'Welcome to ClinicalVision',
    content: 'This is your dashboard where you can see an overview of recent analyses and system status.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="upload"]',
    title: 'Upload Images',
    content: 'Click here to upload mammogram images for AI analysis. We support PNG, JPG, and DICOM formats.',
    placement: 'right',
  },
  {
    target: '[data-tour="analysis"]',
    title: 'View Analysis Results',
    content: 'Access the Analysis Suite for detailed diagnostic workstation with AI-powered insights.',
    placement: 'right',
  },
  {
    target: '[data-tour="shortcuts"]',
    title: 'Keyboard Shortcuts',
    content: 'Press ? anytime to see all keyboard shortcuts. Use Ctrl+K for the command palette.',
    placement: 'left',
  },
];

export default HelpIcon;
