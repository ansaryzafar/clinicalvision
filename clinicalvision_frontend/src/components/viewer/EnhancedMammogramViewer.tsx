/**
 * Enhanced Mammogram Viewer with Lunit INSIGHT Features
 * 
 * Features:
 * 1. Multi-viewport grid layout (4-panel: RCC, LCC, RMLO, LMLO)
 * 2. Real-time WW/WL display on each viewport
 * 3. AI confidence score with visual progress bars
 * 4. Heatmap overlay system with blur effects
 * 5. Touch-friendly interactive controls
 * 6. Synchronized or independent viewport control
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Paper,
  Switch,
  LinearProgress,
  Chip,
  Divider,
  FormControlLabel,
} from '@mui/material';
import {
  PanTool,
  Contrast,
  RestartAlt,
} from '@mui/icons-material';
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneTools from 'cornerstone-tools';

// Types
interface ViewportImages {
  rcc?: File | string | null;
  lcc?: File | string | null;
  rmlo?: File | string | null;
  lmlo?: File | string | null;
}

interface ViewportHeatmaps {
  rcc?: number[][];
  lcc?: number[][];
  rmlo?: number[][];
  lmlo?: number[][];
}

interface AIResults {
  rccRmlo: {
    score: number;
    level: 'low' | 'medium' | 'high';
  };
  lccLmlo: {
    score: number;
    level: 'low' | 'medium' | 'high';
  };
}

interface ViewportState {
  zoom: number;
  wwwl: { width: number; center: number };
  isLoaded: boolean;
  error?: string;
}

interface EnhancedMammogramViewerProps {
  images: ViewportImages | null;
  heatmaps?: ViewportHeatmaps;
  aiResults?: AIResults;
  syncControls?: boolean;
  onViewportChange?: (viewport: string, state: ViewportState) => void;
}

const VIEWPORT_LABELS = {
  rcc: 'RCC',
  lcc: 'LCC',
  rmlo: 'RMLO',
  lmlo: 'LMLO',
};

const VIEWPORT_DESCRIPTIONS = {
  rcc: 'Right Cranio-Caudal',
  lcc: 'Left Cranio-Caudal',
  rmlo: 'Right Medio-Lateral Oblique',
  lmlo: 'Left Medio-Lateral Oblique',
};

export const EnhancedMammogramViewer: React.FC<EnhancedMammogramViewerProps> = ({
  images,
  heatmaps,
  aiResults,
  syncControls = false,
  onViewportChange,
}) => {
  // Refs for each viewport
  const rccRef = useRef<HTMLDivElement>(null);
  const lccRef = useRef<HTMLDivElement>(null);
  const rmloRef = useRef<HTMLDivElement>(null);
  const lmloRef = useRef<HTMLDivElement>(null);

  // Canvas refs for heatmaps
  const rccHeatmapRef = useRef<HTMLCanvasElement>(null);
  const lccHeatmapRef = useRef<HTMLCanvasElement>(null);
  const rmloHeatmapRef = useRef<HTMLCanvasElement>(null);
  const lmloHeatmapRef = useRef<HTMLCanvasElement>(null);

  // State
  const [activeTool, setActiveTool] = useState<'pan' | 'adjust'>('pan');
  const [insightEnabled, setInsightEnabled] = useState(true);
  const [viewportStates, setViewportStates] = useState<Record<string, ViewportState>>({
    rcc: { zoom: 1.0, wwwl: { width: 900, center: 2305 }, isLoaded: false },
    lcc: { zoom: 1.0, wwwl: { width: 900, center: 2281 }, isLoaded: false },
    rmlo: { zoom: 1.0, wwwl: { width: 900, center: 2455 }, isLoaded: false },
    lmlo: { zoom: 1.0, wwwl: { width: 900, center: 2491 }, isLoaded: false },
  });

  /**
   * Initialize Cornerstone on all viewports
   */
  useEffect(() => {
    const viewports = [
      { ref: rccRef, key: 'rcc', image: images?.rcc },
      { ref: lccRef, key: 'lcc', image: images?.lcc },
      { ref: rmloRef, key: 'rmlo', image: images?.rmlo },
      { ref: lmloRef, key: 'lmlo', image: images?.lmlo },
    ];

    viewports.forEach(({ ref, key, image }) => {
      if (ref.current && image) {
        initializeViewport(ref.current, key as keyof ViewportImages, image);
      }
    });

    return () => {
      viewports.forEach(({ ref }) => {
        if (ref.current) {
          try {
            cornerstone.disable(ref.current);
          } catch (e) {
            console.warn('Error disabling cornerstone:', e);
          }
        }
      });
    };
  }, [images]);

  /**
   * Render heatmaps when enabled
   */
  useEffect(() => {
    if (insightEnabled && heatmaps) {
      const heatmapRefs = [
        { canvas: rccHeatmapRef, data: heatmaps.rcc },
        { canvas: lccHeatmapRef, data: heatmaps.lcc },
        { canvas: rmloHeatmapRef, data: heatmaps.rmlo },
        { canvas: lmloHeatmapRef, data: heatmaps.lmlo },
      ];

      heatmapRefs.forEach(({ canvas, data }) => {
        if (canvas.current && data) {
          renderHeatmap(canvas.current, data);
        }
      });
    }
  }, [heatmaps, insightEnabled]);

  /**
   * Initialize a single viewport
   */
  const initializeViewport = async (
    element: HTMLDivElement,
    key: keyof ViewportImages,
    imageSource: File | string
  ) => {
    try {
      // Enable cornerstone on element
      try {
        cornerstone.getEnabledElement(element);
      } catch (e) {
        cornerstone.enable(element);
      }

      // Setup tools
      setupViewportTools(element);

      // Load image
      let imageUrl: string;
      if (imageSource instanceof File) {
        imageUrl = URL.createObjectURL(imageSource);
      } else {
        imageUrl = imageSource;
      }

      // Create and load image
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          
          // Create cornerstone image from canvas
          const cornerstoneImage = createCornerstoneImage(canvas);
          
          // Display image
          cornerstone.displayImage(element, cornerstoneImage);

          // Update state
          const viewport = cornerstone.getViewport(element);
          if (viewport) {
            updateViewportState(key, {
              zoom: viewport.scale || 1.0,
              wwwl: {
                width: viewport.voi.windowWidth || 900,
                center: viewport.voi.windowCenter || 2300,
              },
              isLoaded: true,
            });
          }
        }
      };

      img.onerror = (error) => {
        console.error(`Error loading image for ${key}:`, error);
        updateViewportState(key, {
          zoom: 1.0,
          wwwl: { width: 900, center: 2300 },
          isLoaded: false,
          error: 'Failed to load image',
        });
      };

      img.src = imageUrl;

      // Listen for viewport changes
      element.addEventListener('cornerstoneimagerendered', () => {
        const viewport = cornerstone.getViewport(element);
        if (viewport) {
          updateViewportState(key, {
            zoom: viewport.scale || 1.0,
            wwwl: {
              width: viewport.voi.windowWidth || 900,
              center: viewport.voi.windowCenter || 2300,
            },
            isLoaded: true,
          });
        }
      });
    } catch (error) {
      console.error(`Error initializing viewport ${key}:`, error);
      updateViewportState(key, {
        zoom: 1.0,
        wwwl: { width: 900, center: 2300 },
        isLoaded: false,
        error: 'Initialization failed',
      });
    }
  };

  /**
   * Create Cornerstone image from canvas
   */
  const createCornerstoneImage = (canvas: HTMLCanvasElement): any => {
    const imageId = 'custom:' + Math.random().toString(36);
    
    return {
      imageId,
      minPixelValue: 0,
      maxPixelValue: 255,
      slope: 1,
      intercept: 0,
      windowCenter: 2300,
      windowWidth: 900,
      rows: canvas.height,
      columns: canvas.width,
      height: canvas.height,
      width: canvas.width,
      color: true,
      columnPixelSpacing: 1,
      rowPixelSpacing: 1,
      sizeInBytes: canvas.width * canvas.height * 4,
      getPixelData: () => {
        const context = canvas.getContext('2d');
        return context?.getImageData(0, 0, canvas.width, canvas.height).data;
      },
      render: (enabledElement: any) => {
        const context = enabledElement.canvas.getContext('2d');
        context.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
      },
    };
  };

  /**
   * Setup tools for a viewport
   */
  const setupViewportTools = (element: HTMLDivElement) => {
    try {
      // Add Pan tool
      if (!cornerstoneTools.getToolForElement) {
        cornerstoneTools.addTool(cornerstoneTools.PanTool);
        cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
        cornerstoneTools.addTool(cornerstoneTools.WwwcTool);
      }

      // Set Pan as default
      cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 1 });
      cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 2 });
    } catch (e) {
      console.warn('Tools already configured:', e);
    }
  };

  /**
   * Update viewport state
   */
  const updateViewportState = (key: string, newState: Partial<ViewportState>) => {
    setViewportStates(prev => ({
      ...prev,
      [key]: { ...prev[key], ...newState },
    }));

    if (onViewportChange) {
      onViewportChange(key, { ...viewportStates[key], ...newState });
    }
  };

  /**
   * Render heatmap on canvas
   */
  const renderHeatmap = (canvas: HTMLCanvasElement, heatmapData: number[][]) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const height = heatmapData.length;
    const width = heatmapData[0]?.length || 0;

    // Resize canvas to match heatmap dimensions
    canvas.width = width;
    canvas.height = height;

    // Create image data
    const imageData = ctx.createImageData(width, height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const value = heatmapData[y][x];
        const idx = (y * width + x) * 4;

        // Red-yellow heatmap color scheme
        const intensity = Math.floor(value * 255);
        imageData.data[idx] = intensity; // R
        imageData.data[idx + 1] = Math.floor(intensity * 0.6); // G
        imageData.data[idx + 2] = 0; // B
        imageData.data[idx + 3] = Math.floor(0.5 * 255 * value); // A
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  /**
   * Handle tool change
   */
  const handleToolChange = (tool: 'pan' | 'adjust' | null) => {
    if (!tool) return;
    
    setActiveTool(tool);

    const viewports = [rccRef, lccRef, rmloRef, lmloRef];

    viewports.forEach(ref => {
      if (ref.current) {
        try {
          // Deactivate all tools
          cornerstoneTools.setToolPassive('Pan');
          cornerstoneTools.setToolPassive('Wwwc');

          // Activate selected tool
          if (tool === 'pan') {
            cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 1 });
          } else if (tool === 'adjust') {
            cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 });
          }
        } catch (e) {
          console.warn('Error changing tool:', e);
        }
      }
    });
  };

  /**
   * Reset all viewports
   */
  const handleReset = () => {
    const viewports = [
      { ref: rccRef, key: 'rcc' },
      { ref: lccRef, key: 'lcc' },
      { ref: rmloRef, key: 'rmlo' },
      { ref: lmloRef, key: 'lmlo' },
    ];

    viewports.forEach(({ ref, key }) => {
      if (ref.current) {
        try {
          cornerstone.reset(ref.current);
          const viewport = cornerstone.getViewport(ref.current);
          if (viewport) {
            updateViewportState(key, {
              zoom: 1.0,
              wwwl: { width: 900, center: 2300 },
              isLoaded: viewportStates[key].isLoaded,
            });
          }
        } catch (e) {
          console.warn(`Error resetting viewport ${key}:`, e);
        }
      }
    });
  };

  /**
   * Get confidence color
   */
  const getConfidenceColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low':
        return '#4caf50'; // Green
      case 'medium':
        return '#ff9800'; // Orange
      case 'high':
        return '#f44336'; // Red
      default:
        return '#757575'; // Grey
    }
  };

  /**
   * Render single viewport
   */
  const renderViewport = (
    key: keyof ViewportImages,
    ref: React.RefObject<HTMLDivElement>,
    heatmapRef: React.RefObject<HTMLCanvasElement>
  ) => {
    const state = viewportStates[key];
    const label = VIEWPORT_LABELS[key];

    return (
      <Box
        data-testid={`viewport-${key}`}
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          bgcolor: '#000',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        {/* Cornerstone Canvas Wrapper */}
        <Box
          className="cornerstone-canvas-wrapper"
          data-cy="cornerstone-canvas-wrapper"
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            userSelect: 'none',
          }}
        >
          {/* Main Cornerstone Element */}
          <div
            ref={ref}
            style={{
              width: '100%',
              height: '100%',
              position: 'relative',
            }}
          />

          {/* Heatmap Overlay Canvas - Always render when heatmaps exist, toggle visibility */}
          {heatmaps?.[key] && (
            <canvas
              ref={heatmapRef}
              data-cy-name="heatmap-canvas"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                filter: 'blur(3.5px)',
                pointerEvents: 'none',
                opacity: insightEnabled ? 1 : 0,
                transition: 'opacity 0.3s',
              }}
            />
          )}

          {/* Loading/Error State */}
          {!state.isLoaded && (
            <Box
              data-cy-loading=""
              sx={{
                position: 'absolute',
                top: '50%',
                width: '100%',
                transform: 'translateY(-50%)',
                textAlign: 'center',
                color: 'white',
              }}
            >
              {state.error ? (
                <Typography variant="body2" color="error">
                  Failed to load
                </Typography>
              ) : images?.[key] ? (
                <Typography variant="body2">Loading...</Typography>
              ) : (
                <Typography variant="body2">No image loaded</Typography>
              )}
            </Box>
          )}
        </Box>

        {/* Viewport Info Overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            right: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            pointerEvents: 'none',
          }}
        >
          {/* View Label */}
          <Typography
            variant="body2"
            sx={{
              color: 'white',
              bgcolor: 'rgba(0, 0, 0, 0.6)',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              fontWeight: 700,
            }}
          >
            {label}
          </Typography>

          {/* Viewport Stats - Always visible for UI consistency */}
          <Stack spacing={0.5} alignItems="flex-end">
            <Typography
              variant="caption"
              sx={{
                color: 'white',
                bgcolor: 'rgba(0, 0, 0, 0.6)',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.65rem',
              }}
            >
              ZOOM - {state.zoom.toFixed(4)}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'white',
                bgcolor: 'rgba(0, 0, 0, 0.6)',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.65rem',
              }}
            >
              WW/WL - {state.wwwl.width.toFixed(0)}/{state.wwwl.center.toFixed(0)}
            </Typography>
          </Stack>
        </Box>
      </Box>
    );
  };

  // Validate AI results structure
  const hasValidAIResults = aiResults && 
    aiResults.rccRmlo && 
    typeof aiResults.rccRmlo.score === 'number' &&
    aiResults.rccRmlo.level &&
    aiResults.lccLmlo && 
    typeof aiResults.lccLmlo.score === 'number' &&
    aiResults.lccLmlo.level;

  // Handle empty/null images
  if (!images || Object.keys(images).length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography>No images provided</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={3} sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Enhanced Mammogram Viewer
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Chip label={`Tool: ${activeTool.toUpperCase()}`} color="primary" size="small" />
          </Stack>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          {/* Main Viewer Grid (4-panel) */}
          <Box sx={{ flex: 1 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gridTemplateRows: '1fr 1fr',
                gap: 2,
                height: '800px',
              }}
            >
              {renderViewport('rcc', rccRef, rccHeatmapRef)}
              {renderViewport('lcc', lccRef, lccHeatmapRef)}
              {renderViewport('rmlo', rmloRef, rmloHeatmapRef)}
              {renderViewport('lmlo', lmloRef, lmloHeatmapRef)}
            </Box>
          </Box>

          {/* Right Sidebar Controls */}
          <Box sx={{ width: { xs: '100%', md: '300px' } }}>
            <Stack spacing={3}>
              {/* Control Panel */}
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                  Control
                </Typography>
                <Stack spacing={1}>
                  <ToggleButton
                    value="pan"
                    selected={activeTool === 'pan'}
                    onChange={() => handleToolChange('pan')}
                    aria-pressed={activeTool === 'pan'}
                    fullWidth
                    sx={{
                      justifyContent: 'flex-start',
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        },
                      },
                    }}
                  >
                    <PanTool fontSize="small" sx={{ mr: 1 }} />
                    Pan
                  </ToggleButton>

                  <ToggleButton
                    value="adjust"
                    selected={activeTool === 'adjust'}
                    onChange={() => handleToolChange('adjust')}
                    aria-pressed={activeTool === 'adjust'}
                    fullWidth
                    sx={{
                      justifyContent: 'flex-start',
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        },
                      },
                    }}
                  >
                    <Contrast fontSize="small" sx={{ mr: 1 }} />
                    Adjust
                  </ToggleButton>

                  <ToggleButton
                    value="reset"
                    selected={false}
                    onChange={handleReset}
                    aria-pressed={false}
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    <RestartAlt fontSize="small" sx={{ mr: 1 }} />
                    Reset
                  </ToggleButton>
                </Stack>
              </Paper>

              {/* INSIGHT Analysis Panel */}
              {hasValidAIResults && (
                <Paper elevation={2} sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      INSIGHT Analysis
                    </Typography>
                    <Switch
                      checked={insightEnabled}
                      onChange={(e) => setInsightEnabled(e.target.checked)}
                      inputProps={{ 'aria-label': 'INSIGHT Analysis' }}
                    />
                  </Stack>

                  {insightEnabled && (
                    <>
                      <Typography variant="caption" sx={{ display: 'block', mb: 2, color: 'text.secondary' }}>
                        Abnormality Score - Likelihood value indicating the potential presence of Breast Cancer
                      </Typography>

                      <Divider sx={{ my: 2 }} />

                      {/* RCC/RMLO Score */}
                      <Box sx={{ mb: 3 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            RCC/RMLO
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography
                              variant="caption"
                              className={`confidence-${aiResults!.rccRmlo.level}`}
                              sx={{ color: getConfidenceColor(aiResults!.rccRmlo.level) }}
                            >
                              {aiResults!.rccRmlo.level}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {aiResults!.rccRmlo.score}%
                            </Typography>
                          </Stack>
                        </Stack>
                        <Box sx={{ position: 'relative' }}>
                          <LinearProgress
                            variant="determinate"
                            value={aiResults!.rccRmlo.score}
                            role="progressbar"
                            sx={{
                              height: 8,
                              borderRadius: 1,
                              bgcolor: 'grey.200',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: getConfidenceColor(aiResults!.rccRmlo.level),
                              },
                            }}
                          />
                        </Box>
                        <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            0
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            100
                          </Typography>
                        </Stack>
                      </Box>

                      {/* LCC/LMLO Score */}
                      <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            LCC/LMLO
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography
                              variant="caption"
                              className={`confidence-${aiResults!.lccLmlo.level}`}
                              sx={{ color: getConfidenceColor(aiResults!.lccLmlo.level) }}
                            >
                              {aiResults!.lccLmlo.level}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {aiResults!.lccLmlo.score}%
                            </Typography>
                          </Stack>
                        </Stack>
                        <Box sx={{ position: 'relative' }}>
                          <LinearProgress
                            variant="determinate"
                            value={aiResults!.lccLmlo.score}
                            role="progressbar"
                            sx={{
                              height: 8,
                              borderRadius: 1,
                              bgcolor: 'grey.200',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: getConfidenceColor(aiResults!.lccLmlo.level),
                              },
                            }}
                          />
                        </Box>
                        <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            0
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            100
                          </Typography>
                        </Stack>
                      </Box>
                    </>
                  )}
                </Paper>
              )}

              {/* Sync Controls Option */}
              <Paper elevation={2} sx={{ p: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={syncControls}
                      disabled
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="caption">
                      Sync All Viewports
                    </Typography>
                  }
                />
              </Paper>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default EnhancedMammogramViewer;
