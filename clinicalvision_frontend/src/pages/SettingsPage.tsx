/**
 * SettingsPage - Professional Settings Interface
 * 
 * Design Principles Applied:
 * 
 * Nielsen's Usability Heuristics:
 * - #1 Visibility of System Status: Real-time feedback on changes
 * - #3 User Control & Freedom: Easy to change/revert, reset per section
 * - #4 Consistency & Standards: Familiar settings UI patterns
 * - #6 Recognition over Recall: Descriptive labels with tooltips
 * - #7 Flexibility: Both quick toggles and detailed controls
 * 
 * Paton et al. 2021 (J Med Internet Res):
 * - Settings have clear, immediate effects
 * - System predictability maintained
 * - Changes are reversible (reset buttons)
 * 
 * VoxLogicA UI Design (Strippoli 2025):
 * - Progressive disclosure: Simple view with expandable details
 * - Accessibility: High contrast, keyboard navigation
 * - MVVM pattern: Settings state separate from UI
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Switch,
  Select,
  MenuItem,
  FormControl,
  Button,
  Snackbar,
  alpha,
  Slider,
  Card,
  CardContent,
  Chip,
  Divider,
  Alert,
  IconButton,
  Tooltip,
  Collapse,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  Container,
} from '@mui/material';
import {
  Settings,
  Palette,
  RestartAlt,
  Science,
  Person,
  Lightbulb,
  ExpandMore,
  ExpandLess,
  DarkMode,
  LightMode,
  Contrast,
  Speed,
  Notifications,
  NotificationsOff,
  VolumeUp,
  VolumeOff,
  Visibility,
  CheckCircle,
  Security,
  TipsAndUpdates,
  Save,
  Analytics,
  Tune,
  Warning,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSettings, DEFAULT_SETTINGS, type AppSettings, getModifiedSettingsCount } from '../hooks/useSettings';

// ============================================
// REUSABLE COMPONENTS
// ============================================

interface SettingSectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  modifiedCount?: number;
  onReset?: () => void;
}

const SettingSection: React.FC<SettingSectionProps> = ({ 
  icon, 
  title, 
  description, 
  children, 
  defaultExpanded = true,
  modifiedCount = 0,
  onReset,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const theme = useTheme();
  
  return (
    <Card
      elevation={0}
      sx={{
        bgcolor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 3,
        mb: 2,
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: alpha(theme.palette.primary.main, 0.3),
        },
      }}
    >
      {/* Section Header - Always visible */}
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          bgcolor: expanded ? alpha(theme.palette.primary.main, 0.03) : 'transparent',
          transition: 'background-color 0.2s ease',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.05),
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1.25,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              display: 'flex',
            }}
          >
            {icon}
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {title}
              </Typography>
              {modifiedCount > 0 && (
                <Chip
                  label={`${modifiedCount} modified`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                    color: theme.palette.primary.main,
                  }}
                />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {description}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {onReset && modifiedCount > 0 && (
            <Tooltip title="Reset this section to defaults">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onReset();
                }}
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': { color: theme.palette.primary.main },
                }}
              >
                <RestartAlt fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <IconButton size="small" sx={{ color: 'text.secondary' }}>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
      </Box>

      {/* Section Content - Collapsible */}
      <Collapse in={expanded}>
        <Divider sx={{ opacity: 0.5 }} />
        <CardContent sx={{ p: 3 }}>
          {children}
        </CardContent>
      </Collapse>
    </Card>
  );
};

interface SettingToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  activeIcon?: React.ReactNode;
}

const SettingToggle: React.FC<SettingToggleProps> = ({ 
  checked, 
  onChange, 
  title, 
  description, 
  disabled,
  icon,
  activeIcon,
}) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        p: 1.5,
        borderRadius: 2,
        bgcolor: checked ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
        border: `1px solid ${checked ? alpha(theme.palette.primary.main, 0.2) : 'transparent'}`,
        transition: 'all 0.2s ease',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, flex: 1 }}>
        {(icon || activeIcon) && (
          <Box sx={{ color: checked ? theme.palette.primary.main : 'text.secondary', mt: 0.25 }}>
            {checked && activeIcon ? activeIcon : icon}
          </Box>
        )}
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
            {description}
          </Typography>
        </Box>
      </Box>
      <Switch
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        sx={{
          '& .MuiSwitch-switchBase.Mui-checked': {
            color: theme.palette.primary.main,
          },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
            bgcolor: theme.palette.primary.main,
          },
        }}
      />
    </Box>
  );
};

interface SliderSettingProps {
  value: number;
  onChange: (value: number) => void;
  title: string;
  description: string;
  min: number;
  max: number;
  step: number;
  marks?: { value: number; label: string }[];
  valueLabelFormat?: (value: number) => string;
  icon?: React.ReactNode;
}

const SliderSetting: React.FC<SliderSettingProps> = ({
  value,
  onChange,
  title,
  description,
  min,
  max,
  step,
  marks,
  valueLabelFormat = (v) => `${v}`,
  icon,
}) => {
  const theme = useTheme();
  return (
    <Box sx={{ p: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        {icon && <Box sx={{ color: theme.palette.primary.main }}>{icon}</Box>}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" fontWeight={500}>
              {title}
            </Typography>
            <Chip
              label={valueLabelFormat(value)}
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                fontWeight: 600,
                minWidth: 50,
              }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ px: 1, mt: 2 }}>
        <Slider
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(_, v) => onChange(v as number)}
          valueLabelDisplay="auto"
          valueLabelFormat={valueLabelFormat}
          marks={marks}
          sx={{
            '& .MuiSlider-thumb': { bgcolor: theme.palette.primary.main },
            '& .MuiSlider-track': { bgcolor: theme.palette.primary.main },
            '& .MuiSlider-markLabel': { fontSize: '0.7rem' },
          }}
        />
      </Box>
    </Box>
  );
};

// ============================================
// MAIN SETTINGS PAGE
// ============================================

export const SettingsPage: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { settings, updateSetting, resetSettings, resetCategory } = useSettings();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Count modified settings per category
  const modifiedCounts = useMemo(() => ({
    display: [
      settings.theme !== DEFAULT_SETTINGS.theme,
      settings.highContrastMode !== DEFAULT_SETTINGS.highContrastMode,
      settings.enableAnimations !== DEFAULT_SETTINGS.enableAnimations,
    ].filter(Boolean).length,
    analysis: [
      settings.autoAnalyzeOnUpload !== DEFAULT_SETTINGS.autoAnalyzeOnUpload,
      settings.showAttentionHeatmap !== DEFAULT_SETTINGS.showAttentionHeatmap,
      settings.defaultHeatmapOpacity !== DEFAULT_SETTINGS.defaultHeatmapOpacity,
      settings.defaultConfidenceThreshold !== DEFAULT_SETTINGS.defaultConfidenceThreshold,
      settings.showDetailedMetrics !== DEFAULT_SETTINGS.showDetailedMetrics,
    ].filter(Boolean).length,
    workflow: [
      settings.autoSaveSession !== DEFAULT_SETTINGS.autoSaveSession,
      settings.autoSaveIntervalSeconds !== DEFAULT_SETTINGS.autoSaveIntervalSeconds,
      settings.showQuickTips !== DEFAULT_SETTINGS.showQuickTips,
      settings.confirmBeforeDiscard !== DEFAULT_SETTINGS.confirmBeforeDiscard,
      settings.defaultViewMode !== DEFAULT_SETTINGS.defaultViewMode,
    ].filter(Boolean).length,
    notifications: [
      settings.notifyOnAnalysisComplete !== DEFAULT_SETTINGS.notifyOnAnalysisComplete,
      settings.playSoundOnNotification !== DEFAULT_SETTINGS.playSoundOnNotification,
    ].filter(Boolean).length,
  }), [settings]);

  const totalModified = getModifiedSettingsCount();

  const handleReset = () => {
    resetSettings();
    setSnackbarMessage('All settings reset to defaults');
    setSnackbarOpen(true);
  };

  const handleCategoryReset = (category: 'display' | 'analysis' | 'workflow' | 'notifications') => {
    resetCategory(category);
    setSnackbarMessage(`${category.charAt(0).toUpperCase() + category.slice(1)} settings reset`);
    setSnackbarOpen(true);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 1.5 }}>
      <Container maxWidth="xl">
        {/* Professional Page Header */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 1,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.light, 0.85)} 100%)`,
            color: 'white',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Settings sx={{ fontSize: 36, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} />
              <Box>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 700, 
                    mb: 0.5,
                    textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  }}
                >
                  Settings
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.95)',
                  }}
                >
                  Configure your workspace preferences and analysis behavior
                </Typography>
              </Box>
            </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {totalModified > 0 && (
              <Chip
                label={`${totalModified} customized`}
                size="small"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 500,
                }}
              />
            )}
            <Button
              variant="outlined"
              startIcon={<RestartAlt />}
              onClick={handleReset}
              disabled={totalModified === 0}
              sx={{
                color: 'white',
                borderColor: 'rgba(255,255,255,0.5)',
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                '&.Mui-disabled': { 
                  color: 'rgba(255,255,255,0.3)', 
                  borderColor: 'rgba(255,255,255,0.2)' 
                },
              }}
            >
              Reset All
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Auto-save Notice */}
      <Alert 
        severity="info" 
        icon={<Save fontSize="small" />}
        sx={{ 
          mb: 3, 
          borderRadius: 2,
          bgcolor: alpha(theme.palette.primary.main, 0.08),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          '& .MuiAlert-icon': { color: theme.palette.primary.main },
          py: 0.5,
        }}
      >
        <Typography variant="body2">
          Settings are saved automatically when changed
        </Typography>
      </Alert>

      {/* Two Column Layout for larger screens */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, 
        gap: 3 
      }}>
        {/* Left Column */}
        <Box>
          {/* Display Settings */}
          <SettingSection
            icon={<Palette />}
            title="Display"
            description="Visual appearance and accessibility"
            modifiedCount={modifiedCounts.display}
            onReset={() => handleCategoryReset('display')}
          >
            <Stack spacing={2}>
              {/* Theme Toggle */}
              <Box sx={{ p: 1.5 }}>
                <Typography variant="body2" fontWeight={500} gutterBottom>
                  Color Theme
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                  Choose your preferred color scheme
                </Typography>
                <ToggleButtonGroup
                  value={settings.theme}
                  exclusive
                  onChange={(_, value) => value && updateSetting('theme', value)}
                  size="small"
                  sx={{
                    '& .MuiToggleButton-root': {
                      px: 3,
                      py: 1,
                      textTransform: 'none',
                    },
                    '& .Mui-selected': {
                      bgcolor: `${alpha(theme.palette.primary.main, 0.15)} !important`,
                      color: `${theme.palette.primary.main} !important`,
                    },
                  }}
                >
                  <ToggleButton value="dark">
                    <DarkMode sx={{ mr: 1 }} fontSize="small" />
                    Dark
                  </ToggleButton>
                  <ToggleButton value="light">
                    <LightMode sx={{ mr: 1 }} fontSize="small" />
                    Light
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Divider sx={{ opacity: 0.3 }} />

              <SettingToggle
                checked={settings.highContrastMode}
                onChange={(v) => updateSetting('highContrastMode', v)}
                title="High Contrast Mode"
                description="Increase contrast for better visibility on medical images"
                icon={<Contrast fontSize="small" />}
              />

              <SettingToggle
                checked={settings.enableAnimations}
                onChange={(v) => updateSetting('enableAnimations', v)}
                title="Enable Animations"
                description="Smooth transitions and visual feedback (disable for motion sensitivity)"
                icon={<Speed fontSize="small" />}
              />
            </Stack>
          </SettingSection>

          {/* Analysis Settings */}
          <SettingSection
            icon={<Science />}
            title="Analysis Behavior"
            description="AI analysis and detection settings"
            modifiedCount={modifiedCounts.analysis}
            onReset={() => handleCategoryReset('analysis')}
          >
            <Stack spacing={2}>
              <SettingToggle
                checked={settings.autoAnalyzeOnUpload}
                onChange={(v) => updateSetting('autoAnalyzeOnUpload', v)}
                title="Auto-Analyze on Upload"
                description="Automatically start AI analysis when an image is uploaded"
                icon={<Speed fontSize="small" />}
              />

              <SettingToggle
                checked={settings.showAttentionHeatmap}
                onChange={(v) => updateSetting('showAttentionHeatmap', v)}
                title="Show Attention Heatmap"
                description="Display AI attention overlay highlighting areas of interest"
                icon={<Visibility fontSize="small" />}
                activeIcon={<Visibility fontSize="small" />}
              />

              <Collapse in={settings.showAttentionHeatmap}>
                <SliderSetting
                  value={settings.defaultHeatmapOpacity}
                  onChange={(v) => updateSetting('defaultHeatmapOpacity', v)}
                  title="Default Heatmap Opacity"
                  description="Initial opacity level for attention heatmap overlay"
                  min={10}
                  max={90}
                  step={10}
                  valueLabelFormat={(v) => `${v}%`}
                  marks={[
                    { value: 10, label: '10%' },
                    { value: 50, label: '50%' },
                    { value: 90, label: '90%' },
                  ]}
                />
              </Collapse>

              <Divider sx={{ opacity: 0.3 }} />

              <SliderSetting
                value={settings.defaultConfidenceThreshold}
                onChange={(v) => updateSetting('defaultConfidenceThreshold', v)}
                title="Confidence Threshold"
                description="Minimum AI confidence level to flag findings for review"
                min={50}
                max={95}
                step={5}
                valueLabelFormat={(v) => `${v}%`}
                marks={[
                  { value: 50, label: '50%' },
                  { value: 70, label: '70%' },
                  { value: 95, label: '95%' },
                ]}
                icon={<Tune fontSize="small" />}
              />

              <SettingToggle
                checked={settings.showDetailedMetrics}
                onChange={(v) => updateSetting('showDetailedMetrics', v)}
                title="Show Detailed Metrics"
                description="Display comprehensive analysis metrics and probabilities"
                icon={<Analytics fontSize="small" />}
              />
            </Stack>
          </SettingSection>
        </Box>

        {/* Right Column */}
        <Box>
          {/* Workflow Settings */}
          <SettingSection
            icon={<Lightbulb />}
            title="Workflow"
            description="Session management and user experience"
            modifiedCount={modifiedCounts.workflow}
            onReset={() => handleCategoryReset('workflow')}
          >
            <Stack spacing={2}>
              <SettingToggle
                checked={settings.autoSaveSession}
                onChange={(v) => updateSetting('autoSaveSession', v)}
                title="Auto-Save Sessions"
                description="Automatically save your work to prevent data loss"
                icon={<Save fontSize="small" />}
              />

              <Collapse in={settings.autoSaveSession}>
                <SliderSetting
                  value={settings.autoSaveIntervalSeconds}
                  onChange={(v) => updateSetting('autoSaveIntervalSeconds', v)}
                  title="Auto-Save Interval"
                  description="How often to automatically save your session"
                  min={15}
                  max={120}
                  step={15}
                  valueLabelFormat={(v) => `${v}s`}
                  marks={[
                    { value: 15, label: '15s' },
                    { value: 60, label: '60s' },
                    { value: 120, label: '2m' },
                  ]}
                />
              </Collapse>

              <Divider sx={{ opacity: 0.3 }} />

              <SettingToggle
                checked={settings.showQuickTips}
                onChange={(v) => updateSetting('showQuickTips', v)}
                title="Show Quick Tips"
                description="Display helpful tips and guidance throughout the app"
                icon={<TipsAndUpdates fontSize="small" />}
              />

              <SettingToggle
                checked={settings.confirmBeforeDiscard}
                onChange={(v) => updateSetting('confirmBeforeDiscard', v)}
                title="Confirm Before Discarding"
                description="Ask for confirmation before discarding unsaved changes"
                icon={<Warning fontSize="small" />}
              />

              <Box sx={{ p: 1.5 }}>
                <Typography variant="body2" fontWeight={500} gutterBottom>
                  Default View Mode
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                  Initial view when opening an image
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={settings.defaultViewMode}
                    onChange={(e) => updateSetting('defaultViewMode', e.target.value as AppSettings['defaultViewMode'])}
                  >
                    <MenuItem value="original">Original Image Only</MenuItem>
                    <MenuItem value="overlay">Overlay (Image + Heatmap)</MenuItem>
                    <MenuItem value="split">Split View (Side by Side)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Stack>
          </SettingSection>

          {/* Notification Settings */}
          <SettingSection
            icon={<Notifications />}
            title="Notifications"
            description="Alerts and audio feedback"
            modifiedCount={modifiedCounts.notifications}
            onReset={() => handleCategoryReset('notifications')}
          >
            <Stack spacing={2}>
              <SettingToggle
                checked={settings.notifyOnAnalysisComplete}
                onChange={(v) => updateSetting('notifyOnAnalysisComplete', v)}
                title="Analysis Complete Notification"
                description="Show notification when AI analysis is finished"
                icon={<NotificationsOff fontSize="small" />}
                activeIcon={<Notifications fontSize="small" />}
              />

              <SettingToggle
                checked={settings.playSoundOnNotification}
                onChange={(v) => updateSetting('playSoundOnNotification', v)}
                title="Sound Notifications"
                description="Play audio alert for notifications (may be distracting in clinical environments)"
                icon={<VolumeOff fontSize="small" />}
                activeIcon={<VolumeUp fontSize="small" />}
              />
            </Stack>
          </SettingSection>

          {/* Account Info */}
          <SettingSection
            icon={<Person />}
            title="Account"
            description="Your account details and access level"
            defaultExpanded={false}
          >
            <Stack spacing={2}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                p: 1.5,
                bgcolor: alpha(theme.palette.background.paper, 0.5),
                borderRadius: 2,
              }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Email Address
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {user?.email || 'demo@clinicalvision.ai'}
                  </Typography>
                </Box>
                <Chip
                  icon={<CheckCircle sx={{ fontSize: 14 }} />}
                  label="Verified"
                  size="small"
                  color="success"
                  variant="outlined"
                />
              </Box>
              
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                p: 1.5,
                bgcolor: alpha(theme.palette.background.paper, 0.5),
                borderRadius: 2,
              }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Account Role
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {user?.role === 'admin' ? 'Administrator' : 'Clinical User'}
                  </Typography>
                </Box>
                <Chip
                  icon={<Security sx={{ fontSize: 14 }} />}
                  label={user?.role === 'admin' ? 'Full Access' : 'Standard'}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </Stack>
          </SettingSection>
        </Box>
      </Box>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity="success" 
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
      </Container>
    </Box>
  );
};

export default SettingsPage;
