import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Stack,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Paper,
  Divider,
  Chip,
} from '@mui/material';
import {
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
  CropFree,
} from '@mui/icons-material';
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneTools from 'cornerstone-tools';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import cornerstoneWebImageLoader from 'cornerstone-web-image-loader';
import * as dicomParser from 'dicom-parser';
import * as cornerstoneMath from 'cornerstone-math';
import Hammer from 'hammerjs';

/**
 * Professional Medical Image Viewer using Cornerstone.js
 * 
 * Features:
 * - DICOM and standard image support (JPEG, PNG)
 * - Medical-grade zoom, pan, rotate
 * - Window/Level (brightness/contrast) adjustment
 * - Measurement tools (ruler, angle)
 * - AI attention map overlay
 * - Suspicious region bounding boxes
 * - Fullscreen mode
 * - Reset to original view
 */

// Initialize Cornerstone WADO Image Loader
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

// Initialize Cornerstone Web Image Loader for standard images (JPEG, PNG)
cornerstoneWebImageLoader.external.cornerstone = cornerstone;

// Configure WADO Image Loader
cornerstoneWADOImageLoader.configure({
  useWebWorkers: true,
  decodeConfig: {
    convertFloatPixelDataToInt: false,
  },
});

// Initialize Cornerstone Tools with proper configuration
cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
cornerstoneTools.external.Hammer = Hammer;

// Initialize with touch configuration
const initConfig = {
  touchEnabled: true,
  globalToolSyncEnabled: false,
};

// Only initialize once
let toolsInitialized = false;
if (!toolsInitialized) {
  try {
    cornerstoneTools.init(initConfig);
    
    // Add tools globally (only once)
    cornerstoneTools.addTool(cornerstoneTools.PanTool);
    cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
    cornerstoneTools.addTool(cornerstoneTools.WwwcTool);
    cornerstoneTools.addTool(cornerstoneTools.LengthTool, {
      configuration: {
        drawHandles: true,
        drawHandlesOnHover: true,
        hideHandlesIfMoving: false,
        renderDashed: false,
      }
    });
    cornerstoneTools.addTool(cornerstoneTools.AngleTool, {
      configuration: {
        drawHandles: true,
        drawHandlesOnHover: true,
        hideHandlesIfMoving: false,
      }
    });
    cornerstoneTools.addTool(cornerstoneTools.MagnifyTool);
    
    toolsInitialized = true;
  } catch (e) {
    console.warn('Cornerstone tools already initialized:', e);
  }
}

export interface SuspiciousRegion {
  region_id: number;
  bbox: [number, number, number, number];
  confidence: number;
  location: string;
}

interface MammogramViewerProps {
  imageFile?: File | null;
  imageUrl?: string | null;
  attentionMap?: number[][];
  suspiciousRegions?: SuspiciousRegion[];
  onToolChange?: (tool: string) => void;
}

export const MammogramViewer: React.FC<MammogramViewerProps> = ({
  imageFile,
  imageUrl,
  attentionMap,
  suspiciousRegions = [],
  onToolChange,
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [activeTool, setActiveTool] = useState<string>('Pan');
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [windowLevel, setWindowLevel] = useState({ width: 255, center: 128 });
  const [zoom, setZoom] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const elementRef = useRef<HTMLDivElement | null>(null);

  /**
   * Initialize Cornerstone viewport
   */
  useEffect(() => {
    if (!viewerRef.current) return;

    const element = viewerRef.current;
    elementRef.current = element;

    try {
      // Check if already enabled
      try {
        cornerstone.getEnabledElement(element);
        console.log('Element already enabled');
      } catch (e) {
        // Not enabled yet, enable it
        cornerstone.enable(element);
      }

      // Add stack state manager
      const stack = {
        currentImageIdIndex: 0,
        imageIds: [],
      };
      cornerstoneTools.addStackStateManager(element, ['stack']);
      cornerstoneTools.addToolState(element, 'stack', stack);

      // Setup tools first
      setupTools(element);

      // Load image if provided
      if (imageFile) {
        loadImageFromFile(imageFile);
      } else if (imageUrl) {
        loadImageFromUrl(imageUrl);
      }

      // Listen for image rendered events to draw overlays
      element.addEventListener('cornerstoneimagerendered', handleImageRendered);
      
      // Listen for viewport changes to ensure tools update properly
      element.addEventListener('cornerstonenewimage', () => {
        // Force tool refresh after new image
        cornerstone.updateImage(element);
      });

      return () => {
        element.removeEventListener('cornerstoneimagerendered', handleImageRendered);
        try {
          cornerstone.disable(element);
        } catch (e) {
          console.error('Error disabling cornerstone:', e);
        }
      };
    } catch (error) {
      console.error('Error initializing Cornerstone:', error);
    }
  }, []);

  /**
   * Load image from File object
   */
  const loadImageFromFile = async (file: File) => {
    if (!elementRef.current) return;

    // Check if it's a DICOM file
    const isDicom = file.name.toLowerCase().endsWith('.dcm') || file.type === 'application/dicom';

    if (isDicom) {
      try {
        const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(file);
        const image = await cornerstone.loadImage(imageId);
        
        cornerstone.displayImage(elementRef.current, image);
        setIsImageLoaded(true);

        // Set initial window/level based on image
        const viewport = cornerstone.getViewport(elementRef.current);
        if (viewport) {
          setWindowLevel({
            width: viewport.voi.windowWidth || 255,
            center: viewport.voi.windowCenter || 128,
          });
          setZoom(viewport.scale || 1.0);
        }
      } catch (error) {
        console.error('Error loading DICOM:', error);
        // Fallback to standard image loading
        loadStandardImage(file);
      }
    } else {
      // Standard image (JPEG, PNG)
      loadStandardImage(file);
    }
  };

  /**
   * Load standard images (JPEG, PNG) using web image loader
   */
  const loadStandardImage = async (file: File) => {
    if (!elementRef.current) return;

    try {
      // Create object URL for the file
      const imageUrl = URL.createObjectURL(file);
      
      // Use cornerstone web image loader with proper scheme
      const imageId = `web:${imageUrl}`;
      
      // Load and display image
      const image = await cornerstone.loadImage(imageId);
      cornerstone.displayImage(elementRef.current, image);
      setIsImageLoaded(true);

      // Set initial viewport
      const viewport = cornerstone.getViewport(elementRef.current);
      if (viewport) {
        setWindowLevel({
          width: viewport.voi.windowWidth || 255,
          center: viewport.voi.windowCenter || 128,
        });
        setZoom(viewport.scale || 1.0);
      }
      
      // Clean up object URL after loading
      URL.revokeObjectURL(imageUrl);
    } catch (error) {
      console.error('Error loading standard image:', error);
      setIsImageLoaded(false);
    }
  };

  /**
   * Load image from URL
   */
  const loadImageFromUrl = async (url: string) => {
    if (!elementRef.current) return;

    try {
      const image = await cornerstone.loadImage(url);
      cornerstone.displayImage(elementRef.current, image);
      setIsImageLoaded(true);
    } catch (error) {
      console.error('Error loading image from URL:', error);
    }
  };

  /**
   * Setup Cornerstone tools for this specific element
   */
  const setupTools = (element: HTMLDivElement) => {
    // Tools are already added globally, just activate them for this element
    // Set Pan as default active tool
    cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 1 });

    // Enable zoom with mouse wheel
    cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 2 });
    
    // Enable mouse wheel for zoom
    element.addEventListener('wheel', (event) => {
      event.preventDefault();
    }, { passive: false });
  };

  /**
   * Handle tool changes
   */
  const handleToolChange = (tool: string) => {
    if (!elementRef.current) return;

    // Deactivate all tools
    cornerstoneTools.setToolPassive('Pan');
    cornerstoneTools.setToolPassive('Wwwc');
    cornerstoneTools.setToolPassive('Length');
    cornerstoneTools.setToolPassive('Angle');
    cornerstoneTools.setToolPassive('Magnify');

    // Activate selected tool
    switch (tool) {
      case 'Pan':
        cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 1 });
        break;
      case 'WindowLevel':
        cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 });
        break;
      case 'Ruler':
        cornerstoneTools.setToolActive('Length', { mouseButtonMask: 1 });
        break;
      case 'Angle':
        cornerstoneTools.setToolActive('Angle', { mouseButtonMask: 1 });
        break;
      case 'Magnify':
        cornerstoneTools.setToolActive('Magnify', { mouseButtonMask: 1 });
        break;
    }

    setActiveTool(tool);
    onToolChange?.(tool);
  };

  /**
   * Zoom controls
   */
  const handleZoomIn = () => {
    if (!elementRef.current) return;
    const viewport = cornerstone.getViewport(elementRef.current);
    if (viewport) {
      viewport.scale += 0.25;
      cornerstone.setViewport(elementRef.current, viewport);
      cornerstone.updateImage(elementRef.current);
      setZoom(viewport.scale);
    }
  };

  const handleZoomOut = () => {
    if (!elementRef.current) return;
    const viewport = cornerstone.getViewport(elementRef.current);
    if (viewport) {
      viewport.scale = Math.max(0.25, viewport.scale - 0.25);
      cornerstone.setViewport(elementRef.current, viewport);
      cornerstone.updateImage(elementRef.current);
      setZoom(viewport.scale);
    }
  };

  /**
   * Rotate image
   */
  const handleRotate = () => {
    if (!elementRef.current) return;
    const viewport = cornerstone.getViewport(elementRef.current);
    if (viewport) {
      viewport.rotation = (viewport.rotation || 0) + 90;
      if (viewport.rotation >= 360) viewport.rotation = 0;
      cornerstone.setViewport(elementRef.current, viewport);
      cornerstone.updateImage(elementRef.current);
    }
  };

  /**
   * Reset viewport to original
   */
  const handleReset = () => {
    if (!elementRef.current) return;
    cornerstone.reset(elementRef.current);
    cornerstone.updateImage(elementRef.current);
    const viewport = cornerstone.getViewport(elementRef.current);
    if (viewport) {
      setZoom(viewport.scale || 1.0);
      setWindowLevel({
        width: viewport.voi.windowWidth || 255,
        center: viewport.voi.windowCenter || 128,
      });
    }
  };

  /**
   * Window/Level adjustment
   */
  const handleWindowLevelChange = (width: number, center: number) => {
    if (!elementRef.current) return;
    const viewport = cornerstone.getViewport(elementRef.current);
    if (viewport) {
      viewport.voi.windowWidth = width;
      viewport.voi.windowCenter = center;
      cornerstone.setViewport(elementRef.current, viewport);
      cornerstone.updateImage(elementRef.current);
      setWindowLevel({ width, center });
    }
  };

  /**
   * Draw AI overlays on canvas
   */
  const handleImageRendered = (event: any) => {
    if (!overlayVisible || !elementRef.current) return;

    const eventData = event.detail;
    const canvas = eventData.canvasContext.canvas;
    const ctx = eventData.canvasContext;

    // Draw attention map if available
    if (attentionMap && attentionMap.length > 0) {
      drawAttentionMap(ctx, canvas, attentionMap);
    }

    // Draw bounding boxes for suspicious regions
    if (suspiciousRegions && suspiciousRegions.length > 0) {
      drawBoundingBoxes(ctx, canvas, suspiciousRegions);
    }
  };

  /**
   * Draw attention heatmap overlay
   */
  const drawAttentionMap = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, heatmap: number[][]) => {
    const imageCanvas = document.createElement('canvas');
    const imageCtx = imageCanvas.getContext('2d');
    if (!imageCtx) return;

    const heatmapHeight = heatmap.length;
    const heatmapWidth = heatmap[0]?.length || 0;

    imageCanvas.width = heatmapWidth;
    imageCanvas.height = heatmapHeight;

    // Draw heatmap
    const imageData = imageCtx.createImageData(heatmapWidth, heatmapHeight);
    for (let y = 0; y < heatmapHeight; y++) {
      for (let x = 0; x < heatmapWidth; x++) {
        const value = heatmap[y][x];
        const idx = (y * heatmapWidth + x) * 4;

        // Red-yellow heatmap color scheme
        const intensity = Math.floor(value * 255);
        imageData.data[idx] = intensity; // R
        imageData.data[idx + 1] = Math.floor(intensity * 0.6); // G
        imageData.data[idx + 2] = 0; // B
        imageData.data[idx + 3] = Math.floor(overlayOpacity * 255 * value); // A
      }
    }

    imageCtx.putImageData(imageData, 0, 0);

    // Draw scaled heatmap on main canvas
    ctx.globalAlpha = overlayOpacity;
    ctx.drawImage(imageCanvas, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0;
  };

  /**
   * Draw bounding boxes for suspicious regions
   */
  const drawBoundingBoxes = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    regions: SuspiciousRegion[]
  ) => {
    regions.forEach((region, index) => {
      const [x, y, width, height] = region.bbox;

      // Scale coordinates to canvas size
      const scaleX = canvas.width / 224; // Assuming 224x224 model input
      const scaleY = canvas.height / 224;

      const boxX = x * scaleX;
      const boxY = y * scaleY;
      const boxW = width * scaleX;
      const boxH = height * scaleY;

      // Draw box
      ctx.strokeStyle = region.confidence > 0.7 ? '#f44336' : '#ff9800'; // Red or orange
      ctx.lineWidth = 3;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // Draw label
      ctx.fillStyle = region.confidence > 0.7 ? '#f44336' : '#ff9800';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`Region ${index + 1}: ${(region.confidence * 100).toFixed(0)}%`, boxX, boxY - 5);
    });
  };

  /**
   * Toggle fullscreen
   */
  const handleFullscreen = () => {
    if (!elementRef.current) return;
    if (!document.fullscreenElement) {
      elementRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <Card elevation={3} sx={{ borderRadius: 3, border: 2, borderColor: 'primary.main' }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: isImageLoaded ? 'success.main' : 'grey.400',
                animation: isImageLoaded ? 'none' : 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.3 },
                },
              }}
            />
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
              Professional Medical Viewer
            </Typography>
          </Stack>
          {isImageLoaded && (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip 
                label={`Zoom: ${(zoom * 100).toFixed(0)}%`} 
                size="small" 
                color="primary" 
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label={`Tool: ${activeTool}`}
                size="small"
                color="info"
                variant="filled"
                sx={{ fontWeight: 600 }}
              />
              {suspiciousRegions.length > 0 && (
                <Chip
                  label={`${suspiciousRegions.length} AI Region${suspiciousRegions.length > 1 ? 's' : ''}`}
                  size="small"
                  color="error"
                  variant="filled"
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Stack>
          )}
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {/* Toolbar */}
        <Paper 
          elevation={2} 
          sx={{ 
            p: 2, 
            mb: 2, 
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1, display: 'block' }}>
            Imaging Tools
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" sx={{ mb: 2 }}>
            {/* Navigation Tools */}
            <ToggleButtonGroup
              value={activeTool}
              exclusive
              onChange={(e, value) => value && handleToolChange(value)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  border: 1,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  },
                },
              }}
            >
              <ToggleButton value="Pan">
                <Tooltip title="Pan Tool - Click and drag to move image">
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <PanTool fontSize="small" />
                    <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'block' } }}>Pan</Typography>
                  </Stack>
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="WindowLevel">
                <Tooltip title="Window/Level - Adjust brightness and contrast">
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Contrast fontSize="small" />
                    <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'block' } }}>W/L</Typography>
                  </Stack>
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="Ruler">
                <Tooltip title="Measurement Tool - Click two points to measure">
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Straighten fontSize="small" />
                    <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'block' } }}>Ruler</Typography>
                  </Stack>
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="Magnify">
                <Tooltip title="Magnifying Glass - Hover to zoom locally">
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <CropFree fontSize="small" />
                    <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'block' } }}>Magnify</Typography>
                  </Stack>
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>

            <Divider orientation="vertical" flexItem />

            {/* Zoom Controls */}
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mr: 1 }}>
                Zoom:
              </Typography>
              <Tooltip title="Zoom In (+)">
                <IconButton 
                  size="small" 
                  onClick={handleZoomIn}
                  sx={{ 
                    bgcolor: 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' },
                  }}
                >
                  <ZoomIn />
                </IconButton>
              </Tooltip>
              <Tooltip title="Zoom Out (-)">
                <IconButton 
                  size="small" 
                  onClick={handleZoomOut}
                  sx={{ 
                    bgcolor: 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' },
                  }}
                >
                  <ZoomOut />
                </IconButton>
              </Tooltip>
            </Stack>

            <Divider orientation="vertical" flexItem />

            {/* Rotate & Reset */}
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mr: 1 }}>
                View:
              </Typography>
              <Tooltip title="Rotate 90° Clockwise">
                <IconButton 
                  size="small" 
                  onClick={handleRotate}
                  sx={{ 
                    bgcolor: 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' },
                  }}
                >
                  <RotateRight />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reset to Original View">
                <IconButton 
                  size="small" 
                  onClick={handleReset}
                  sx={{ 
                    bgcolor: 'warning.light',
                    color: 'warning.dark',
                    '&:hover': { bgcolor: 'warning.main', color: 'white' },
                  }}
                >
                  <RestartAlt />
                </IconButton>
              </Tooltip>
            </Stack>

            <Divider orientation="vertical" flexItem />

            {/* Overlay Controls */}
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mr: 1 }}>
                AI:
              </Typography>
              <Tooltip title={overlayVisible ? 'Hide AI Overlay' : 'Show AI Overlay'}>
                <IconButton 
                  size="small" 
                  onClick={() => setOverlayVisible(!overlayVisible)}
                  sx={{ 
                    bgcolor: overlayVisible ? 'success.light' : 'action.hover',
                    color: overlayVisible ? 'success.dark' : 'inherit',
                    '&:hover': { 
                      bgcolor: overlayVisible ? 'success.main' : 'action.selected',
                      color: overlayVisible ? 'white' : 'inherit',
                    },
                  }}
                >
                  {overlayVisible ? <Visibility /> : <VisibilityOff />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Fullscreen Mode (F)">
                <IconButton 
                  size="small" 
                  onClick={handleFullscreen}
                  sx={{ 
                    bgcolor: 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' },
                  }}
                >
                  <Fullscreen />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          {/* Overlay Opacity Slider */}
          {overlayVisible && (attentionMap || suspiciousRegions.length > 0) && (
            <Box sx={{ mt: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="caption" sx={{ minWidth: 100 }}>
                  Overlay Opacity:
                </Typography>
                <Slider
                  value={overlayOpacity}
                  onChange={(e, value) => setOverlayOpacity(value as number)}
                  min={0}
                  max={1}
                  step={0.1}
                  size="small"
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
                  sx={{ flex: 1 }}
                />
              </Stack>
            </Box>
          )}

          {/* Window/Level Sliders */}
          {isImageLoaded && activeTool === 'WindowLevel' && (
            <Box sx={{ mt: 2 }}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="caption" sx={{ minWidth: 100 }}>
                    Window Width:
                  </Typography>
                  <Slider
                    value={windowLevel.width}
                    onChange={(e, value) =>
                      handleWindowLevelChange(value as number, windowLevel.center)
                    }
                    min={1}
                    max={4096}
                    size="small"
                    valueLabelDisplay="auto"
                    sx={{ flex: 1 }}
                  />
                </Stack>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="caption" sx={{ minWidth: 100 }}>
                    Window Center:
                  </Typography>
                  <Slider
                    value={windowLevel.center}
                    onChange={(e, value) =>
                      handleWindowLevelChange(windowLevel.width, value as number)
                    }
                    min={0}
                    max={4096}
                    size="small"
                    valueLabelDisplay="auto"
                    sx={{ flex: 1 }}
                  />
                </Stack>
              </Stack>
            </Box>
          )}
        </Paper>

        {/* Viewer Canvas */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '600px',
            bgcolor: '#000',
            borderRadius: 2,
            overflow: 'hidden',
            border: 2,
            borderColor: 'divider',
          }}
        >
          <div
            ref={viewerRef}
            style={{
              width: '100%',
              height: '100%',
              cursor: activeTool === 'Pan' ? 'grab' : 'crosshair',
            }}
          />

          {!isImageLoaded && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: 'white',
                textAlign: 'center',
              }}
            >
              <Typography variant="h6">No Image Loaded</Typography>
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
                Upload a mammogram to view
              </Typography>
            </Box>
          )}
        </Box>

        {/* Instructions & Status */}
        {isImageLoaded && (
          <Stack spacing={2} sx={{ mt: 2 }}>
            {/* Active Tool Guide */}
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                bgcolor: 'primary.lighter', 
                borderRadius: 2,
                border: 1,
                borderColor: 'primary.main',
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    bgcolor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  {activeTool === 'Pan' && <PanTool />}
                  {activeTool === 'WindowLevel' && <Contrast />}
                  {activeTool === 'Ruler' && <Straighten />}
                  {activeTool === 'Magnify' && <CropFree />}
                </Box>
                <Box flex={1}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                    {activeTool === 'Pan' && '🖱️ Pan Mode Active'}
                    {activeTool === 'WindowLevel' && '🔆 Window/Level Adjustment'}
                    {activeTool === 'Ruler' && '📏 Measurement Mode'}
                    {activeTool === 'Magnify' && '🔍 Magnify Mode'}
                  </Typography>
                  <Typography variant="caption" color="primary.dark">
                    {activeTool === 'Pan' && 'Click and drag to move the image around'}
                    {activeTool === 'WindowLevel' && 'Drag horizontally to adjust width (contrast), vertically for center (brightness)'}
                    {activeTool === 'Ruler' && 'Click two points on the image to measure distance'}
                    {activeTool === 'Magnify' && 'Hover over the image to see a magnified view'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            {/* Quick Tips */}
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                bgcolor: 'info.lighter', 
                borderRadius: 2,
                border: 1,
                borderColor: 'info.main',
              }}
            >
              <Typography variant="caption" color="info.dark" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                ⚡ Quick Tips
              </Typography>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="info.dark">
                  • <strong>Left-click drag:</strong> {activeTool === 'Pan' ? 'Pan image' : activeTool === 'WindowLevel' ? 'Adjust window/level' : 'Use active tool'}
                </Typography>
                <Typography variant="caption" color="info.dark">
                  • <strong>Right-click drag:</strong> Zoom in/out
                </Typography>
                <Typography variant="caption" color="info.dark">
                  • <strong>Mouse wheel:</strong> Scroll to zoom
                </Typography>
                <Typography variant="caption" color="info.dark">
                  • <strong>Zoom buttons:</strong> Precise zoom control
                </Typography>
                <Typography variant="caption" color="info.dark">
                  • <strong>Reset button:</strong> Return to original view
                </Typography>
              </Stack>
            </Paper>

            {/* Status Bar */}
            <Paper 
              elevation={1} 
              sx={{ 
                p: 1.5, 
                bgcolor: 'background.default',
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    Status:
                  </Typography>
                  <Chip 
                    label="Ready" 
                    size="small" 
                    color="success" 
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    W:
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {windowLevel.width.toFixed(0)}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    L:
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {windowLevel.center.toFixed(0)}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    Zoom:
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {(zoom * 100).toFixed(1)}%
                  </Typography>
                </Stack>
                {overlayVisible && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      AI Overlay:
                    </Typography>
                    <Chip 
                      label="Visible" 
                      size="small" 
                      color="success" 
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Stack>
                )}
                {suspiciousRegions.length > 0 && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      Regions:
                    </Typography>
                    <Chip 
                      label={suspiciousRegions.length} 
                      size="small" 
                      color="error" 
                      sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                    />
                  </Stack>
                )}
              </Stack>
            </Paper>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default MammogramViewer;
