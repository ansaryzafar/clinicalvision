/**
 * Professional Image Analysis Suite
 * Inspired by Lunit INSIGHT and modern PACS workstations
 * 
 * Features:
 * - Full-screen dedicated viewer
 * - Professional toolbar with medical imaging tools
 * - Side panels for findings and controls
 * - Quad-view support for CC/MLO comparison
 * - Risk score visualization
 * - Comprehensive medical imaging tools
 */

import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  Stack,
  Paper,
  Chip,
  Tooltip,
  Divider,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  LinearProgress,
  Slider,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Close,
  ZoomIn,
  ZoomOut,
  PanTool,
  Straighten,
  Contrast,
  RotateRight,
  RestartAlt,
  Fullscreen,
  Visibility,
  VisibilityOff,
  GridOn,
  MyLocation,
  Brightness6,
  CompareArrows,
  GridView,
  Info,
  Assessment,
  Warning,
  CheckCircle,
  ViewComfy,
  Menu,
  Save,
  Download,
  Print,
  Share,
  Folder,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../routes/paths';
import { professionalColors } from '../../theme/professionalColors';
import { MedicalViewer } from '../viewer/MedicalViewer';
import { InferenceResponse } from '../../services/api';
import { 
  BIRADS_CATEGORIES, 
  mapConfidenceToBiRads, 
  getClinicalRecommendations, 
  formatBiRadsDisplay,
  getAnatomicalLocation as getAnatomicalLocationUtil,
  getClockPosition,
  getDepthCategory,
  getDistanceFromNipple,
  formatAnatomicalLocation,
  validateBreastRegion,
} from '../../utils/clinicalMapping';
import {
  saveAnalysisLocally,
  generatePatientId,
  isValidPatientId,
  formatTimestamp,
  exportAnalysisAsJson,
  SavedAnalysis,
} from '../../services/analysisStorage';

interface AnalysisSuiteProps {
  imageFile?: File | null;
  imageUrl?: string;
  analysisResults?: InferenceResponse | null;
  onClose?: () => void;
}

export const AnalysisSuite: React.FC<AnalysisSuiteProps> = ({
  imageFile,
  imageUrl,
  analysisResults,
  onClose,
}) => {
  const navigate = useNavigate();
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'quad'>('single');
  const [activeTool, setActiveTool] = useState<string>('Pan');
  const [zoomLevel, setZoomLevel] = useState(100);
  
  // Save dialog state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [patientIdError, setPatientIdError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Heatmap/GradCAM controls
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);
  const [heatmapMode, setHeatmapMode] = useState<'overlay' | 'heatmap' | 'blend'>('blend');

  // Extract data from analysis results - FIXED: attention_map is inside explanation
  const prediction = analysisResults?.prediction || 'Unknown';
  const confidence = analysisResults?.confidence || 0;
  const suspiciousRegions = analysisResults?.explanation?.suspicious_regions || [];
  const attentionMap = analysisResults?.explanation?.attention_map;
  
  // Use actual risk_level from API (properly calculated based on malignancy probability)
  const riskLevel = analysisResults?.risk_level || 'low';
  
  // Also extract uncertainty metrics for meaningful display
  const uncertaintyMetrics = analysisResults?.uncertainty;
  const malignancyProb = analysisResults?.probabilities?.malignant || 0;
  const benignProb = analysisResults?.probabilities?.benign || 1;

  // Calculate BI-RADS category using MALIGNANCY PROBABILITY (not confidence)
  // This follows ACR BI-RADS guidelines correctly
  const biRadsKey = mapConfidenceToBiRads(malignancyProb, prediction, confidence);
  const biRadsInfo = BIRADS_CATEGORIES[biRadsKey];
  const clinicalRecommendations = getClinicalRecommendations(biRadsKey);
  
  // Use API risk_level for color coding (this is the proper risk from the model)
  const riskColor = riskLevel === 'high' ? professionalColors.clinical.abnormal.main
    : riskLevel === 'moderate' ? professionalColors.clinical.uncertain.main
    : professionalColors.clinical.normal.main;

  const handleToolChange = (
    event: React.MouseEvent<HTMLElement>,
    newTool: string | null,
  ) => {
    if (newTool !== null) {
      setActiveTool(newTool);
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 400));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 25));
  };

  const handleSave = () => {
    // Auto-generate patient ID if empty
    if (!patientId.trim()) {
      setPatientId(generatePatientId());
    }
    setSaveDialogOpen(true);
  };

  const handleExport = () => {
    console.log('Export report');
    // TODO: Implement export functionality
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper function to get severity color based on attention score
  const getSeverityColor = (score: number): string => {
    if (score >= 0.75) return professionalColors.clinical.abnormal.main;
    if (score >= 0.5) return professionalColors.clinical.uncertain.main;
    return professionalColors.clinical.normal.main;
  };
  
  // Save analysis with validation
  const handleSaveAnalysis = async () => {
    // Validate patient ID
    if (!patientId.trim()) {
      setPatientIdError('Patient ID is required');
      return;
    }
    
    if (!isValidPatientId(patientId.toUpperCase())) {
      setPatientIdError('Invalid format. Use alphanumeric characters and dashes (e.g., PT-12345)');
      return;
    }
    
    if (!analysisResults || !imageFile) {
      setPatientIdError('No analysis data to save');
      return;
    }
    
    setIsSaving(true);
    setPatientIdError('');
    
    try {
      // Save locally
      const savedAnalysis = saveAnalysisLocally(
        patientId.toUpperCase(),
        imageFile.name,
        analysisResults
      );
      
      console.log('✅ Analysis saved successfully:', savedAnalysis);
      
      // Show success state
      setSaveSuccess(true);
      
      // Close dialog after 1.5 seconds and then close the suite
      setTimeout(() => {
        setSaveDialogOpen(false);
        setSaveSuccess(false);
        setIsSaving(false);
        
        // Call the onClose callback
        if (onClose) {
          onClose();
        }
      }, 1500);
      
    } catch (error) {
      console.error('Failed to save analysis:', error);
      setPatientIdError('Failed to save analysis. Please try again.');
      setIsSaving(false);
    }
  };
  
  // Handle close button - trigger save dialog
  const handleClose = () => {
    if (analysisResults) {
      // Show save dialog before closing
      if (!patientId.trim()) {
        setPatientId(generatePatientId());
      }
      setSaveDialogOpen(true);
    } else {
      // No analysis to save, close directly
      if (onClose) {
        onClose();
      }
    }
  };
  
  // Cancel and close without saving
  const handleCloseWithoutSaving = () => {
    setSaveDialogOpen(false);
    if (onClose) {
      onClose();
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1300,
        backgroundColor: professionalColors.background.primary,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Professional Top Toolbar */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          backgroundColor: professionalColors.background.toolbar,
          borderBottom: `1px solid ${professionalColors.border.medium}`,
        }}
      >
        <Toolbar sx={{ gap: 2, minHeight: 56 }}>
          {/* Left: Title & Patient Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: professionalColors.text.primary }}>
              Medical Imaging Suite
            </Typography>
            <Divider orientation="vertical" flexItem sx={{ bgcolor: professionalColors.border.medium }} />
            {imageFile && (
              <Typography variant="body2" sx={{ color: professionalColors.text.secondary }}>
                {imageFile.name}
              </Typography>
            )}
          </Box>

          {/* Center: Risk Score Badge */}
          {analysisResults && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={`${prediction.toUpperCase()}`}
                sx={{
                  backgroundColor: alpha(riskColor, 0.2),
                  color: riskColor,
                  fontWeight: 600,
                  border: `1px solid ${alpha(riskColor, 0.4)}`,
                }}
              />
              <Chip
                label={`Confidence: ${(confidence * 100).toFixed(1)}%`}
                size="small"
                sx={{
                  backgroundColor: professionalColors.background.panel,
                  color: professionalColors.text.secondary,
                }}
              />
            </Box>
          )}

          {/* Right: Actions */}
          <Stack direction="row" spacing={1}>
            <Tooltip title="View Saved Analyses">
              <IconButton size="small" onClick={() => navigate(ROUTES.ANALYSIS_ARCHIVE)}>
                <Folder fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Save Analysis">
              <IconButton size="small" onClick={handleSave}>
                <Save fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export Report">
              <IconButton size="small" onClick={handleExport}>
                <Download fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Print">
              <IconButton size="small" onClick={handlePrint}>
                <Print fontSize="small" />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ bgcolor: professionalColors.border.medium }} />
            <Tooltip title="Close Suite">
              <IconButton onClick={handleClose} size="small">
                <Close fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Main Content Area */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Left Panel - Tools & Settings */}
        <Drawer
          variant="persistent"
          anchor="left"
          open={leftPanelOpen}
          sx={{
            width: 240,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 240,
              position: 'relative',
              backgroundColor: professionalColors.background.panel,
              borderRight: `1px solid ${professionalColors.border.medium}`,
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, color: professionalColors.text.primary, fontWeight: 600 }}>
              TOOLS
            </Typography>
            {/* Tools list can be expanded */}
          </Box>
        </Drawer>

        {/* Center - Image Viewer */}
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: professionalColors.background.primary,
            overflow: 'hidden',
          }}
        >
          {/* Viewer Controls Toolbar */}
          <Paper
            elevation={0}
            sx={{
              backgroundColor: professionalColors.background.toolbar,
              borderBottom: `1px solid ${professionalColors.border.medium}`,
              p: 1,
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
              {/* Tool Selection */}
              <ToggleButtonGroup
                value={activeTool}
                exclusive
                onChange={handleToolChange}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    color: professionalColors.text.secondary,
                    borderColor: professionalColors.border.medium,
                    '&.Mui-selected': {
                      backgroundColor: professionalColors.accent.primary,
                      color: professionalColors.text.primary,
                      '&:hover': {
                        backgroundColor: professionalColors.accent.dark,
                      },
                    },
                  },
                }}
              >
                <ToggleButton value="Pan">
                  <Tooltip title="Pan">
                    <PanTool fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="WindowLevel">
                  <Tooltip title="Window/Level">
                    <Contrast fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="Measure">
                  <Tooltip title="Measure">
                    <Straighten fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="Brightness">
                  <Tooltip title="Brightness">
                    <Brightness6 fontSize="small" />
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>

              <Divider orientation="vertical" flexItem sx={{ bgcolor: professionalColors.border.medium }} />

              {/* Zoom Controls */}
              <IconButton size="small" onClick={handleZoomOut}>
                <ZoomOut fontSize="small" />
              </IconButton>
              <Typography variant="caption" sx={{ minWidth: 60, textAlign: 'center', color: professionalColors.text.secondary }}>
                {zoomLevel}%
              </Typography>
              <IconButton size="small" onClick={handleZoomIn}>
                <ZoomIn fontSize="small" />
              </IconButton>

              <Divider orientation="vertical" flexItem sx={{ bgcolor: professionalColors.border.medium }} />

              {/* View Controls */}
              <Tooltip title="Rotate">
                <IconButton size="small">
                  <RotateRight fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reset View">
                <IconButton size="small">
                  <RestartAlt fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Grid">
                <IconButton size="small">
                  <GridOn fontSize="small" />
                </IconButton>
              </Tooltip>

              <Divider orientation="vertical" flexItem sx={{ bgcolor: professionalColors.border.medium }} />

              {/* View Mode */}
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, value) => value && setViewMode(value)}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    color: professionalColors.text.secondary,
                    borderColor: professionalColors.border.medium,
                    '&.Mui-selected': {
                      backgroundColor: professionalColors.accent.primary,
                      color: professionalColors.text.primary,
                    },
                  },
                }}
              >
                <ToggleButton value="single">
                  <Tooltip title="Single View">
                    <ViewComfy fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="quad">
                  <Tooltip title="Quad View">
                    <GridView fontSize="small" />
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>

              <Divider orientation="vertical" flexItem sx={{ bgcolor: professionalColors.border.medium }} />

              {/* GradCAM/Heatmap Controls */}
              <Tooltip title={overlayVisible ? 'Hide AI Heatmap' : 'Show AI Heatmap'}>
                <IconButton 
                  size="small" 
                  onClick={() => setOverlayVisible(!overlayVisible)}
                  sx={{ 
                    color: overlayVisible ? professionalColors.accent.highlight : professionalColors.text.tertiary 
                  }}
                >
                  {overlayVisible ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                </IconButton>
              </Tooltip>
              
              {/* Heatmap Mode Toggle */}
              {overlayVisible && attentionMap && (
                <>
                  <ToggleButtonGroup
                    value={heatmapMode}
                    exclusive
                    onChange={(e, value) => value && setHeatmapMode(value)}
                    size="small"
                    sx={{
                      '& .MuiToggleButton-root': {
                        color: professionalColors.text.secondary,
                        borderColor: professionalColors.border.medium,
                        fontSize: '0.65rem',
                        px: 1,
                        py: 0.25,
                        '&.Mui-selected': {
                          backgroundColor: professionalColors.accent.primary,
                          color: professionalColors.text.primary,
                        },
                      },
                    }}
                  >
                    <ToggleButton value="overlay">
                      <Tooltip title="Transparent overlay">
                        <span>Overlay</span>
                      </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="blend">
                      <Tooltip title="Blended view">
                        <span>Blend</span>
                      </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="heatmap">
                      <Tooltip title="Heatmap only">
                        <span>Heat</span>
                      </Tooltip>
                    </ToggleButton>
                  </ToggleButtonGroup>
                  
                  {/* Intensity Slider */}
                  <Box sx={{ width: 80, mx: 1 }}>
                    <Tooltip title={`Intensity: ${(overlayOpacity * 100).toFixed(0)}%`}>
                      <Slider
                        value={overlayOpacity}
                        onChange={(e, value) => setOverlayOpacity(value as number)}
                        min={0.1}
                        max={1}
                        step={0.1}
                        size="small"
                        sx={{
                          color: professionalColors.accent.primary,
                          '& .MuiSlider-thumb': {
                            width: 12,
                            height: 12,
                          },
                        }}
                      />
                    </Tooltip>
                  </Box>
                </>
              )}
            </Stack>
          </Paper>
          
          {/* GradCAM Legend (when visible) */}
          {overlayVisible && attentionMap && (
            <Paper
              elevation={0}
              sx={{
                backgroundColor: alpha(professionalColors.background.toolbar, 0.9),
                borderBottom: `1px solid ${professionalColors.border.medium}`,
                px: 2,
                py: 0.5,
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                <Typography variant="caption" sx={{ color: professionalColors.text.secondary, fontWeight: 600 }}>
                  GradCAM++ Attention:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ color: professionalColors.text.tertiary }}>Low</Typography>
                  <Box sx={{ 
                    width: 150,
                    height: 12,
                    borderRadius: 1,
                    background: 'linear-gradient(to right, #00007f, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000, #7f0000)',
                    border: `1px solid ${professionalColors.border.subtle}`
                  }} />
                  <Typography variant="caption" sx={{ color: professionalColors.text.tertiary }}>High</Typography>
                </Box>
                <Chip 
                  label={`Mode: ${heatmapMode.charAt(0).toUpperCase() + heatmapMode.slice(1)}`} 
                  size="small"
                  sx={{ 
                    bgcolor: alpha(professionalColors.accent.primary, 0.2),
                    color: professionalColors.accent.primary,
                    fontWeight: 600,
                    fontSize: '0.65rem',
                  }}
                />
                {/* Image dimensions indicator - shows if full-size mammogram */}
                {analysisResults?.image_metadata && (
                  <Chip 
                    label={`${analysisResults.image_metadata.original_width}×${analysisResults.image_metadata.original_height}px`}
                    size="small"
                    icon={<span style={{ fontSize: '0.6rem', marginLeft: 4 }}>📐</span>}
                    sx={{ 
                      bgcolor: analysisResults.image_metadata.original_width > 500 
                        ? alpha('#4caf50', 0.2)  // Green for high-res
                        : alpha('#ff9800', 0.2), // Orange for low-res
                      color: analysisResults.image_metadata.original_width > 500 
                        ? '#4caf50' 
                        : '#ff9800',
                      fontWeight: 600,
                      fontSize: '0.65rem',
                    }}
                  />
                )}
              </Stack>
            </Paper>
          )}

          {/* Medical Viewer Component */}
          <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto', position: 'relative' }}>
            <MedicalViewer
              imageFile={imageFile}
              imageUrl={imageUrl}
              attentionMap={attentionMap}
              suspiciousRegions={suspiciousRegions}
              imageMetadata={analysisResults?.image_metadata || null}
              externalOverlayVisible={overlayVisible}
              externalOverlayOpacity={overlayOpacity}
              externalHeatmapMode={heatmapMode}
              onOverlayVisibleChange={setOverlayVisible}
              onOverlayOpacityChange={setOverlayOpacity}
              onHeatmapModeChange={setHeatmapMode}
            />
          </Box>
        </Box>

        {/* Right Panel - Findings & Analysis */}
        <Drawer
          variant="persistent"
          anchor="right"
          open={rightPanelOpen}
          sx={{
            width: 320,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 320,
              position: 'relative',
              backgroundColor: professionalColors.background.panel,
              borderLeft: `1px solid ${professionalColors.border.medium}`,
            },
          }}
        >
          <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            {/* Analysis Results Header */}
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="subtitle1" sx={{ mb: 1.5, color: professionalColors.text.primary, fontWeight: 600 }}>
                ANALYSIS RESULTS
              </Typography>

              {/* Risk Score Visualization with Gradient Spectrum */}
              {analysisResults && (
                <Paper
                  elevation={2}
                  sx={{
                    p: 2,
                    background: `linear-gradient(135deg, ${alpha(riskColor, 0.15)} 0%, ${alpha(riskColor, 0.05)} 100%)`,
                    border: `2px solid ${alpha(riskColor, 0.4)}`,
                    borderRadius: 2,
                  }}
                >
                  <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: professionalColors.text.primary, fontWeight: 600 }}>
                        Malignancy Risk
                      </Typography>
                      <Chip
                        label={riskLevel.toUpperCase()}
                        size="medium"
                        sx={{
                          backgroundColor: riskColor,
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          px: 1,
                        }}
                      />
                    </Box>
                    
                    {/* Risk Spectrum Bar - Shows MALIGNANCY PROBABILITY (not confidence) */}
                    <Box sx={{ position: 'relative' }}>
                      <Box
                        sx={{
                          height: 24,
                          borderRadius: 3,
                          background: 'linear-gradient(90deg, #4CAF50 0%, #8BC34A 15%, #CDDC39 30%, #FFC107 50%, #FF9800 65%, #FF5722 80%, #F44336 100%)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          position: 'relative',
                          overflow: 'visible',
                        }}
                      >
                        {/* Indicator Arrow - Position based on MALIGNANCY probability */}
                        <Box
                          sx={{
                            position: 'absolute',
                            left: `${malignancyProb * 100}%`,
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 0,
                            height: 0,
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderTop: `12px solid ${riskColor}`,
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                            zIndex: 2,
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: professionalColors.text.secondary, fontSize: '0.65rem', fontWeight: 500 }}>
                          0% (Benign)
                        </Typography>
                        <Typography variant="caption" sx={{ color: professionalColors.text.secondary, fontSize: '0.65rem', fontWeight: 500 }}>
                          50%
                        </Typography>
                        <Typography variant="caption" sx={{ color: professionalColors.text.secondary, fontSize: '0.65rem', fontWeight: 500 }}>
                          100% (Malignant)
                        </Typography>
                      </Box>
                    </Box>
                    
                    {/* Primary Metric: Malignancy Probability */}
                    <Box sx={{ textAlign: 'center', py: 1 }}>
                      <Typography 
                        variant="h3" 
                        sx={{ 
                          color: riskColor, 
                          fontWeight: 700,
                          fontSize: '3rem',
                          lineHeight: 1,
                          textShadow: `0 2px 4px ${alpha(riskColor, 0.2)}`,
                        }}
                      >
                        {(malignancyProb * 100).toFixed(1)}%
                      </Typography>
                      <Typography variant="caption" sx={{ color: professionalColors.text.primary, fontWeight: 600, mt: 0.5 }}>
                        Probability of Malignancy
                      </Typography>
                    </Box>
                    
                    {/* Secondary Metrics */}
                    <Divider sx={{ borderColor: alpha(riskColor, 0.2), my: 1 }} />
                    
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                      {/* Model Confidence - How sure the model is in its prediction */}
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: professionalColors.text.secondary, fontWeight: 500, display: 'block', mb: 0.5 }}>
                          Model Confidence
                        </Typography>
                        <Typography variant="h6" sx={{ 
                          color: confidence > 0.8 ? professionalColors.clinical.normal.main 
                            : confidence > 0.6 ? professionalColors.clinical.uncertain.main 
                            : professionalColors.clinical.abnormal.main,
                          fontWeight: 700,
                        }}>
                          {(confidence * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                      
                      {/* Model Uncertainty - Epistemic uncertainty from MC Dropout */}
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: professionalColors.text.secondary, fontWeight: 500, display: 'block', mb: 0.5 }}>
                          Prediction Uncertainty
                        </Typography>
                        <Typography variant="h6" sx={{ 
                          color: (uncertaintyMetrics?.epistemic_uncertainty || 0) > 0.15 
                            ? professionalColors.clinical.uncertain.main 
                            : professionalColors.clinical.normal.main,
                          fontWeight: 700,
                        }}>
                          ±{((uncertaintyMetrics?.epistemic_uncertainty || 0) * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                    </Box>
                    
                    {/* Review Flag */}
                    {uncertaintyMetrics?.requires_human_review && (
                      <Box sx={{ 
                        mt: 1,
                        p: 1, 
                        bgcolor: alpha(professionalColors.clinical.uncertain.main, 0.15),
                        borderRadius: 1,
                        borderLeft: `3px solid ${professionalColors.clinical.uncertain.main}`,
                      }}>
                        <Typography variant="caption" sx={{ 
                          color: professionalColors.clinical.uncertain.main,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                        }}>
                          ⚠️ Radiologist Review Recommended
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              )}
            </Box>

            {/* BI-RADS Classification */}
            {analysisResults && biRadsInfo && (
              <Paper
                elevation={2}
                sx={{
                  p: 2,
                  mb: 2.5,
                  background: `linear-gradient(135deg, ${alpha(biRadsInfo.color, 0.15)} 0%, ${alpha(biRadsInfo.color, 0.03)} 100%)`,
                  border: `2px solid ${alpha(biRadsInfo.color, 0.5)}`,
                  borderRadius: 2,
                }}
              >
                <Stack spacing={1.5}>
                  {/* Large BI-RADS Score Display */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: 2,
                  }}>
                    {/* Large Score */}
                    <Box sx={{ textAlign: 'center', flex: 1 }}>
                      <Typography variant="caption" sx={{ 
                        color: professionalColors.text.secondary, 
                        fontWeight: 600, 
                        display: 'block',
                        mb: 0.5,
                        fontSize: '0.75rem',
                      }}>
                        BI-RADS
                      </Typography>
                      <Typography 
                        variant="h3" 
                        sx={{ 
                          color: biRadsInfo.color, 
                          fontWeight: 800,
                          fontSize: '3rem',
                          lineHeight: 1,
                          textShadow: `0 2px 8px ${alpha(biRadsInfo.color, 0.3)}`,
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {biRadsInfo.subCategory 
                          ? `${biRadsInfo.category}${biRadsInfo.subCategory}` 
                          : biRadsInfo.category}
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        color: professionalColors.text.primary, 
                        fontWeight: 500, 
                        mt: 0.5,
                        display: 'block',
                      }}>
                        Category Score
                      </Typography>
                    </Box>
                    
                    {/* Urgency Badge */}
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      gap: 0.5,
                    }}>
                      <Chip
                        label={biRadsInfo.urgency.toUpperCase()}
                        size="medium"
                        sx={{
                          bgcolor: biRadsInfo.color,
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          px: 1,
                        }}
                      />
                      <Chip
                        label={biRadsInfo.cancerProbability}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: biRadsInfo.color,
                          color: biRadsInfo.color,
                          fontWeight: 600,
                          fontSize: '0.65rem',
                        }}
                      />
                    </Box>
                  </Box>
                  
                  <Divider sx={{ borderColor: alpha(biRadsInfo.color, 0.3) }} />
                  
                  {/* Classification Label */}
                  <Typography variant="body2" sx={{ 
                    color: professionalColors.text.primary, 
                    fontWeight: 600,
                    textAlign: 'center',
                  }}>
                    {biRadsInfo.label}
                  </Typography>
                  
                  <Typography variant="caption" sx={{ 
                    color: professionalColors.text.secondary,
                    textAlign: 'center',
                    display: 'block',
                  }}>
                    {biRadsInfo.description}
                  </Typography>
                  
                  {/* Recommended Action */}
                  <Box sx={{ 
                    bgcolor: alpha(biRadsInfo.color, 0.12),
                    p: 1.5,
                    borderRadius: 1,
                    borderLeft: `4px solid ${biRadsInfo.color}`,
                  }}>
                    <Typography variant="caption" sx={{ 
                      color: professionalColors.text.primary, 
                      fontWeight: 600, 
                      display: 'block', 
                      mb: 0.5,
                    }}>
                      Recommended Action:
                    </Typography>
                    <Typography variant="caption" sx={{ color: professionalColors.text.secondary }}>
                      {biRadsInfo.recommendedAction}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            )}

            <Divider sx={{ my: 2, bgcolor: professionalColors.border.medium }} />

            {/* Suspicious Regions List */}
            <Typography variant="subtitle2" sx={{ mb: 1, color: professionalColors.text.primary, fontWeight: 600 }}>
              FINDINGS {suspiciousRegions.length > 0 && `(${suspiciousRegions.length})`}
            </Typography>

            {suspiciousRegions.length > 0 ? (
              <List sx={{ py: 0 }}>
                {suspiciousRegions.map((region, index) => {
                  // Standard image size used by model (224x224)
                  const IMAGE_SIZE = 224;
                  
                  // Validate if region is likely within breast tissue
                  const validation = validateBreastRegion(region.bbox, IMAGE_SIZE);
                  
                  // Get comprehensive anatomical location with proper image size
                  const anatomicalLoc = getAnatomicalLocationUtil(region.bbox, 'MLO', 'left', IMAGE_SIZE);
                  
                  // Calculate center of region for distance calculation
                  const regionCenterX = region.bbox[0] + region.bbox[2] / 2;
                  const regionCenterY = region.bbox[1] + region.bbox[3] / 2;
                  
                  const locationStr = formatAnatomicalLocation(anatomicalLoc, true, getDistanceFromNipple(
                    regionCenterX,
                    regionCenterY,
                    0.1, // pixelSpacing
                    IMAGE_SIZE
                  ));
                  
                  const severityColor = getSeverityColor(region.attention_score);
                  
                  return (
                    <Paper
                      key={index}
                      elevation={1}
                      sx={{
                        mb: 1.5,
                        p: 2,
                        background: `linear-gradient(135deg, ${alpha(severityColor, 0.08)} 0%, ${alpha(severityColor, 0.02)} 100%)`,
                        border: `2px solid ${alpha(severityColor, 0.3)}`,
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        // Visual indication if region has validation warning
                        opacity: validation.isValid ? 1 : 0.7,
                        '&:hover': {
                          borderColor: severityColor,
                          boxShadow: `0 4px 12px ${alpha(severityColor, 0.2)}`,
                          transform: 'translateY(-2px)',
                        },
                      }}
                    >
                      <Stack spacing={1.5}>
                        {/* Validation Warning Banner */}
                        {validation.warning && (
                          <Box sx={{ 
                            bgcolor: alpha(professionalColors.clinical.uncertain.main, 0.15),
                            borderRadius: 1,
                            px: 1,
                            py: 0.5,
                            borderLeft: `3px solid ${professionalColors.clinical.uncertain.main}`,
                          }}>
                            <Typography variant="caption" sx={{ 
                              color: professionalColors.clinical.uncertain.main,
                              fontWeight: 600,
                              fontSize: '0.65rem',
                            }}>
                              ⚠️ {validation.warning}
                            </Typography>
                          </Box>
                        )}
                        
                        {/* Header with Finding Number and Score */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: professionalColors.text.primary, mb: 0.5 }}>
                              Finding {index + 1}
                            </Typography>
                            <Typography variant="caption" sx={{ 
                              color: severityColor, 
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}>
                              {region.attention_score >= 0.75 ? 'High Priority' : 
                               region.attention_score >= 0.5 ? 'Moderate' : 'Low Priority'}
                            </Typography>
                          </Box>
                          
                          {/* Large Score Badge */}
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center',
                            bgcolor: severityColor,
                            borderRadius: 2,
                            px: 1.5,
                            py: 1,
                            minWidth: 70,
                            boxShadow: `0 2px 8px ${alpha(severityColor, 0.3)}`,
                          }}>
                            <Typography 
                              variant="h5" 
                              sx={{ 
                                color: 'white', 
                                fontWeight: 700,
                                lineHeight: 1,
                                fontSize: '1.75rem',
                              }}
                            >
                              {(region.attention_score * 100).toFixed(0)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'white', fontSize: '0.65rem', fontWeight: 500 }}>
                              score
                            </Typography>
                          </Box>
                        </Box>

                        <Divider sx={{ borderColor: alpha(severityColor, 0.2) }} />

                        {/* Anatomical Location */}
                        <Box>
                          <Tooltip title="AI-derived from image coordinates. Verify with clinical examination." arrow>
                            <Typography variant="caption" sx={{ 
                              color: professionalColors.text.secondary, 
                              fontWeight: 600,
                              display: 'block',
                              mb: 0.5,
                              cursor: 'help',
                            }}>
                              Anatomical Location (AI-derived)
                            </Typography>
                          </Tooltip>
                          <Stack spacing={0.5}>
                            {/* Quadrant with abbreviation */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip 
                                label={anatomicalLoc.quadrantAbbr}
                                size="small"
                                sx={{
                                  bgcolor: alpha(severityColor, 0.1),
                                  color: severityColor,
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                }}
                              />
                              <Typography variant="body2" sx={{ 
                                color: professionalColors.text.primary,
                                fontWeight: 600,
                              }}>
                                {anatomicalLoc.quadrant}
                              </Typography>
                            </Box>
                            
                            {/* Clock position and depth */}
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                              <Box>
                                <Typography variant="caption" sx={{ 
                                  color: professionalColors.text.secondary, 
                                  fontSize: '0.65rem',
                                  fontWeight: 500,
                                  display: 'block',
                                }}>
                                  Clock Position
                                </Typography>
                                <Typography variant="body2" sx={{ 
                                  color: professionalColors.text.primary,
                                  fontWeight: 600,
                                  fontFamily: 'monospace',
                                }}>
                                  {anatomicalLoc.clockPosition}
                                </Typography>
                              </Box>
                              
                              <Box>
                                <Typography variant="caption" sx={{ 
                                  color: professionalColors.text.secondary, 
                                  fontSize: '0.65rem',
                                  fontWeight: 500,
                                  display: 'block',
                                }}>
                                  Depth
                                </Typography>
                                <Typography variant="body2" sx={{ 
                                  color: professionalColors.text.primary,
                                  fontWeight: 600,
                                  textTransform: 'capitalize',
                                }}>
                                  {anatomicalLoc.depth}
                                </Typography>
                              </Box>
                              
                              <Tooltip title="Estimated distance - assumes nipple at image center" arrow>
                                <Box>
                                  <Typography variant="caption" sx={{ 
                                    color: professionalColors.text.secondary, 
                                    fontSize: '0.65rem',
                                    fontWeight: 500,
                                    display: 'block',
                                  }}>
                                    From Nipple*
                                  </Typography>
                                  <Typography variant="body2" sx={{ 
                                    color: professionalColors.text.primary,
                                    fontWeight: 600,
                                    fontFamily: 'monospace',
                                  }}>
                                    ~{getDistanceFromNipple(
                                      region.bbox[0] + region.bbox[2] / 2,
                                      region.bbox[1] + region.bbox[3] / 2
                                    )}mm
                                  </Typography>
                                </Box>
                              </Tooltip>
                            </Box>
                          </Stack>
                        </Box>

                        {/* Lesion Measurements (Clinically Relevant) */}
                        <Box sx={{ 
                          bgcolor: alpha(professionalColors.background.secondary, 0.5),
                          borderRadius: 1,
                          p: 1.5,
                        }}>
                          <Typography variant="caption" sx={{ 
                            color: professionalColors.text.secondary, 
                            fontWeight: 700,
                            display: 'block',
                            mb: 0.5,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            fontSize: '0.65rem',
                          }}>
                            Lesion Measurements (Est.)
                          </Typography>
                          <Typography variant="caption" sx={{ 
                            color: professionalColors.text.secondary,
                            fontSize: '0.6rem',
                            fontStyle: 'italic',
                            display: 'block',
                            mb: 1,
                          }}>
                            Based on standard 0.1mm/px spacing
                          </Typography>
                          <Stack spacing={1}>
                            {/* Longest Diameter - Most Important Clinical Measurement */}
                            <Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <Typography variant="caption" sx={{ 
                                  color: professionalColors.text.secondary, 
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                }}>
                                  Longest Diameter:
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                  <Typography variant="body2" sx={{ 
                                    color: professionalColors.text.primary,
                                    fontWeight: 700,
                                    fontSize: '0.95rem',
                                  }}>
                                    {(() => {
                                      const pixelSpacing = 0.1; // mm per pixel (typical mammography)
                                      const diagonal = Math.sqrt(region.bbox[2]**2 + region.bbox[3]**2);
                                      const mmSize = (diagonal * pixelSpacing).toFixed(1);
                                      return mmSize;
                                    })()}
                                  </Typography>
                                  <Typography variant="caption" sx={{ 
                                    color: professionalColors.text.tertiary,
                                    fontWeight: 500,
                                  }}>
                                    mm
                                  </Typography>
                                </Box>
                              </Box>
                              {/* Size Category */}
                              <Box sx={{ mt: 0.5 }}>
                                <Chip 
                                  label={(() => {
                                    const pixelSpacing = 0.1;
                                    const diagonal = Math.sqrt(region.bbox[2]**2 + region.bbox[3]**2);
                                    const mmSize = diagonal * pixelSpacing;
                                    if (mmSize < 5) return 'Micro-lesion (< 5mm)';
                                    if (mmSize < 10) return 'Small (5-10mm)';
                                    if (mmSize < 20) return 'Moderate (10-20mm)';
                                    return 'Large (> 20mm)';
                                  })()}
                                  size="small"
                                  sx={{
                                    bgcolor: (() => {
                                      const pixelSpacing = 0.1;
                                      const diagonal = Math.sqrt(region.bbox[2]**2 + region.bbox[3]**2);
                                      const mmSize = diagonal * pixelSpacing;
                                      if (mmSize < 5) return alpha(professionalColors.clinical.normal.main, 0.15);
                                      if (mmSize < 10) return alpha(professionalColors.clinical.uncertain.main, 0.15);
                                      if (mmSize < 20) return alpha('#F57C00', 0.15);
                                      return alpha(professionalColors.clinical.abnormal.main, 0.15);
                                    })(),
                                    color: (() => {
                                      const pixelSpacing = 0.1;
                                      const diagonal = Math.sqrt(region.bbox[2]**2 + region.bbox[3]**2);
                                      const mmSize = diagonal * pixelSpacing;
                                      if (mmSize < 5) return professionalColors.clinical.normal.main;
                                      if (mmSize < 10) return professionalColors.clinical.uncertain.main;
                                      if (mmSize < 20) return '#F57C00';
                                      return professionalColors.clinical.abnormal.main;
                                    })(),
                                    fontWeight: 600,
                                    fontSize: '0.65rem',
                                    height: 20,
                                  }}
                                />
                              </Box>
                            </Box>

                            <Divider sx={{ borderColor: alpha(professionalColors.border.subtle, 0.3) }} />

                            {/* Physical Dimensions */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="caption" sx={{ 
                                color: professionalColors.text.secondary, 
                                fontWeight: 600,
                                fontSize: '0.7rem',
                              }}>
                                Dimensions (AP × ML):
                              </Typography>
                              <Typography variant="caption" sx={{ 
                                color: professionalColors.text.primary,
                                fontWeight: 600,
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                              }}>
                                {(region.bbox[2] * 0.1).toFixed(1)} × {(region.bbox[3] * 0.1).toFixed(1)} mm
                              </Typography>
                            </Box>

                            {/* Cross-sectional Area */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="caption" sx={{ 
                                color: professionalColors.text.secondary, 
                                fontWeight: 600,
                                fontSize: '0.7rem',
                              }}>
                                Cross-sectional Area:
                              </Typography>
                              <Typography variant="caption" sx={{ 
                                color: professionalColors.text.primary,
                                fontWeight: 600,
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                              }}>
                                {(() => {
                                  const areaMm2 = region.bbox[2] * region.bbox[3] * 0.01; // 0.1mm * 0.1mm = 0.01mm²
                                  return areaMm2 >= 100 
                                    ? `${(areaMm2 / 100).toFixed(2)} cm²`
                                    : `${areaMm2.toFixed(1)} mm²`;
                                })()}
                              </Typography>
                            </Box>

                            {/* Shape Descriptor */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Tooltip title="Based on bounding box aspect ratio only. True margin characteristics require radiologist assessment." arrow>
                                <Typography variant="caption" sx={{ 
                                  color: professionalColors.text.tertiary, 
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                  cursor: 'help',
                                }}>
                                  Aspect Ratio:
                                </Typography>
                              </Tooltip>
                              <Chip
                                label={(() => {
                                  const aspectRatio = region.bbox[2] / region.bbox[3];
                                  if (aspectRatio > 0.85 && aspectRatio < 1.15) return 'Round (~1:1)';
                                  if (aspectRatio > 0.6 && aspectRatio < 1.4) return 'Oval';
                                  return 'Elongated';
                                })()}
                                size="small"
                                sx={{
                                  bgcolor: 'transparent',
                                  border: `1px solid ${alpha(professionalColors.text.tertiary, 0.3)}`,
                                  color: professionalColors.text.primary,
                                  fontWeight: 600,
                                  fontSize: '0.65rem',
                                  height: 18,
                                }}
                              />
                            </Box>

                            {/* Technical Reference (Subtle) */}
                            <Box sx={{ 
                              pt: 0.5, 
                              borderTop: `1px dashed ${alpha(professionalColors.border.medium, 0.5)}`,
                            }}>
                              <Typography variant="caption" sx={{ 
                                color: professionalColors.text.tertiary,
                                fontSize: '0.6rem',
                                fontStyle: 'italic',
                                fontFamily: 'monospace',
                              }}>
                                Ref: ({region.bbox[0]}, {region.bbox[1]}) • {region.bbox[2]}×{region.bbox[3]}px
                              </Typography>
                            </Box>
                          </Stack>
                        </Box>
                        
                        {/* AI Confidence Note */}
                        <Box sx={{ 
                          mt: 1,
                          pt: 1,
                          borderTop: `1px dashed ${alpha(professionalColors.border.medium, 0.5)}`,
                        }}>
                          <Typography variant="caption" sx={{ 
                            color: professionalColors.clinical.uncertain.light,
                            fontSize: '0.65rem',
                            fontStyle: 'italic',
                            display: 'block',
                          }}>
                            ⚠️ AI-detected region of interest. Histological typing requires tissue biopsy.
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  );
                })}
              </List>
            ) : (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  backgroundColor: alpha(professionalColors.clinical.normal.main, 0.1),
                  border: `1px solid ${alpha(professionalColors.clinical.normal.main, 0.3)}`,
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <CheckCircle sx={{ color: professionalColors.clinical.normal.main, mb: 1 }} />
                <Typography variant="body2" sx={{ color: professionalColors.text.secondary }}>
                  No significant findings detected
                </Typography>
              </Paper>
            )}

            {/* Clinical Recommendations */}
            {clinicalRecommendations.length > 0 && (
              <Box sx={{ mt: 2.5 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, color: professionalColors.text.primary, fontWeight: 600 }}>
                  CLINICAL RECOMMENDATIONS
                </Typography>
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    bgcolor: alpha(professionalColors.accent.primary, 0.08),
                    border: `1px solid ${alpha(professionalColors.accent.primary, 0.3)}`,
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="caption" sx={{ 
                    color: professionalColors.text.secondary,
                    fontSize: '0.7rem',
                    fontStyle: 'italic',
                    display: 'block',
                    mb: 1,
                  }}>
                    Based on ACR BI-RADS guidelines. Final recommendations require radiologist review.
                  </Typography>
                  <List sx={{ py: 0 }}>
                    {clinicalRecommendations.map((recommendation, index) => (
                      <ListItem
                        key={index}
                        sx={{
                          px: 0,
                          py: 0.75,
                          alignItems: 'flex-start',
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                          <CheckCircle sx={{ fontSize: 16, color: professionalColors.accent.primary }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={recommendation}
                          primaryTypographyProps={{
                            variant: 'body2',
                            sx: { color: professionalColors.text.primary, fontSize: '0.875rem' },
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Box>
            )}

            {/* Quick Actions */}
            <Box sx={{ mt: 2.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, color: professionalColors.text.primary, fontWeight: 600 }}>
                ACTIONS
              </Typography>
              <Stack spacing={1.5}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Assessment />}
                  sx={{
                    justifyContent: 'flex-start',
                    borderColor: professionalColors.border.strong,
                    color: professionalColors.text.primary,
                    '&:hover': {
                      borderColor: professionalColors.accent.primary,
                      bgcolor: alpha(professionalColors.accent.primary, 0.1),
                    },
                  }}
                >
                  View Full Report
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<CompareArrows />}
                  sx={{
                    justifyContent: 'flex-start',
                    borderColor: professionalColors.border.strong,
                    color: professionalColors.text.primary,
                    '&:hover': {
                      borderColor: professionalColors.accent.primary,
                      bgcolor: alpha(professionalColors.accent.primary, 0.1),
                    },
                  }}
                >
                  Compare Views
                </Button>
              </Stack>
            </Box>
          </Box>
        </Drawer>
      </Box>

      {/* Bottom Status Bar */}
      <Paper
        elevation={0}
        sx={{
          backgroundColor: professionalColors.background.toolbar,
          borderTop: `1px solid ${professionalColors.border.medium}`,
          px: 2,
          py: 0.5,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" sx={{ color: professionalColors.text.secondary }}>
            Ready
          </Typography>
          <Stack direction="row" spacing={2}>
            <Typography variant="caption" sx={{ color: professionalColors.text.secondary }}>
              {imageFile ? `${(imageFile.size / 1024 / 1024).toFixed(2)} MB` : '-'}
            </Typography>
            <Typography variant="caption" sx={{ color: professionalColors.text.secondary }}>
              {suspiciousRegions.length} Regions
            </Typography>
          </Stack>
        </Stack>
      </Paper>
      
      {/* Save Analysis Dialog */}
      <Dialog
        open={saveDialogOpen}
        onClose={() => !isSaving && setSaveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: professionalColors.background.tertiary,
            border: `1px solid ${professionalColors.border.medium}`,
          }
        }}
      >
        <DialogTitle sx={{ color: professionalColors.text.primary }}>
          {saveSuccess ? '✓ Analysis Saved Successfully' : 'Save Analysis'}
        </DialogTitle>
        
        <DialogContent>
          {saveSuccess ? (
            <Alert 
              severity="success" 
              sx={{ 
                bgcolor: alpha(professionalColors.clinical.normal.main, 0.1),
                color: professionalColors.clinical.normal.main,
                '& .MuiAlert-icon': {
                  color: professionalColors.clinical.normal.main,
                }
              }}
            >
              Analysis has been saved successfully with Patient ID: <strong>{patientId}</strong>
              <br />
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                Timestamp: {formatTimestamp(new Date().toISOString())}
              </Typography>
            </Alert>
          ) : (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              {/* Information Alert */}
              <Alert 
                severity="info"
                sx={{ 
                  bgcolor: alpha(professionalColors.clinical.pending.main, 0.1),
                  color: professionalColors.text.primary,
                  '& .MuiAlert-icon': {
                    color: professionalColors.clinical.pending.main,
                  }
                }}
              >
                Analysis results will be saved locally for future reference.
              </Alert>
              
              {/* Patient ID Input */}
              <TextField
                autoFocus
                label="Patient ID"
                fullWidth
                value={patientId}
                onChange={(e) => {
                  setPatientId(e.target.value.toUpperCase());
                  setPatientIdError('');
                }}
                error={!!patientIdError}
                helperText={patientIdError || 'Enter patient identifier (e.g., PT-12345, ABC-123-456)'}
                disabled={isSaving}
                placeholder="PT-XXXXX"
                InputProps={{
                  sx: {
                    color: professionalColors.text.primary,
                    bgcolor: professionalColors.background.secondary,
                  }
                }}
                InputLabelProps={{
                  sx: { color: professionalColors.text.secondary }
                }}
                FormHelperTextProps={{
                  sx: { color: patientIdError ? professionalColors.clinical.abnormal.main : professionalColors.text.tertiary }
                }}
              />
              
              {/* Analysis Summary */}
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  bgcolor: professionalColors.background.secondary,
                  border: `1px solid ${professionalColors.border.subtle}`,
                }}
              >
                <Typography variant="subtitle2" sx={{ color: professionalColors.text.primary, mb: 1.5, fontWeight: 600 }}>
                  Analysis Summary
                </Typography>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: professionalColors.text.tertiary }}>
                      Image:
                    </Typography>
                    <Typography variant="body2" sx={{ color: professionalColors.text.primary, fontWeight: 500 }}>
                      {imageFile?.name || 'Unknown'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: professionalColors.text.tertiary }}>
                      Prediction:
                    </Typography>
                    <Chip 
                      label={prediction}
                      size="small"
                      sx={{
                        bgcolor: alpha(riskColor, 0.15),
                        color: riskColor,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: professionalColors.text.tertiary }}>
                      Confidence:
                    </Typography>
                    <Typography variant="body2" sx={{ color: professionalColors.text.primary, fontWeight: 600 }}>
                      {(confidence * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: professionalColors.text.tertiary }}>
                      BI-RADS:
                    </Typography>
                    <Typography variant="body2" sx={{ color: riskColor, fontWeight: 600 }}>
                      {formatBiRadsDisplay(biRadsKey)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: professionalColors.text.tertiary }}>
                      Findings:
                    </Typography>
                    <Typography variant="body2" sx={{ color: professionalColors.text.primary, fontWeight: 600 }}>
                      {suspiciousRegions.length} region(s)
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Stack>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {!saveSuccess && (
            <>
              <Button 
                onClick={handleCloseWithoutSaving}
                disabled={isSaving}
                sx={{ color: professionalColors.text.tertiary }}
              >
                Close Without Saving
              </Button>
              <Button
                onClick={handleSaveAnalysis}
                variant="contained"
                disabled={isSaving || !patientId.trim()}
                startIcon={isSaving ? <CircularProgress size={16} /> : <Save />}
                sx={{
                  bgcolor: professionalColors.accent.primary,
                  '&:hover': {
                    bgcolor: professionalColors.accent.light,
                  },
                }}
              >
                {isSaving ? 'Saving...' : 'Save & Close'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
